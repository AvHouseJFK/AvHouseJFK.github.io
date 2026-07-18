// server.js — JFK Arrivals/Departures logger
// Polls OpenSky for KJFK flight events, enriches each one with aircraft
// type/registration (OpenSky aircraft DB) and airline name (static ICAO
// lookup), and stores everything permanently in SQLite so history
// (weeks/months back) can be queried directly.

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";
import { airlineFromCallsign } from "./lib/airlines.js";
import { toIata } from "./lib/airports.js";
import { refreshAircraftDb, lookupAircraft, ensureAircraftTable } from "./lib/aircraftDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- CONFIG ----------
const AIRPORT = "KJFK";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // poll every 5 minutes
const WINDOW_SECONDS = 2 * 60 * 60;     // OpenSky caps windows at 2 hours
const DB_FILE = path.join(__dirname, "data", "flights.db");
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

// ---------- DATABASE ----------
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS flights (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- 'arrival' | 'departure'
    event_time INTEGER NOT NULL, -- unix seconds
    callsign TEXT,
    icao24 TEXT,
    airline_code TEXT,
    airline_name TEXT,
    aircraft_model TEXT,
    registration TEXT,
    origin_icao TEXT,
    origin_iata TEXT,
    destination_icao TEXT,
    destination_iata TEXT,
    recorded_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_event_time ON flights(event_time);
  CREATE INDEX IF NOT EXISTS idx_type ON flights(type);
`);
ensureAircraftTable(db);

// ---------- TOKEN HANDLING ----------
let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET environment variables."
    );
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

// ---------- POLLING ----------
async function fetchFlights(kind) {
  const token = await getToken();
  const end = Math.floor(Date.now() / 1000);
  const begin = end - WINDOW_SECONDS;
  const url = `https://opensky-network.org/api/flights/${kind}?airport=${AIRPORT}&begin=${begin}&end=${end}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`${kind} fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function makeId(type, flight) {
  const ts = type === "arrival" ? flight.lastSeen : flight.firstSeen;
  return `${type}-${flight.icao24}-${ts}`;
}

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO flights (
    id, type, event_time, callsign, icao24,
    airline_code, airline_name, aircraft_model, registration,
    origin_icao, origin_iata, destination_icao, destination_iata,
    recorded_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

async function pollOnce() {
  let added = 0;
  for (const kind of ["arrival", "departure"]) {
    try {
      const flights = await fetchFlights(kind);
      for (const f of flights) {
        const id = makeId(kind, f);
        const callsign = (f.callsign || "").trim() || "UNKNOWN";
        const { code: airlineCode, name: airlineName } = airlineFromCallsign(callsign);
        const { registration, model } = lookupAircraft(db, f.icao24);
        const eventTime = kind === "arrival" ? f.lastSeen : f.firstSeen;

        const result = insertStmt.run(
          id,
          kind,
          eventTime,
          callsign,
          f.icao24 || null,
          airlineCode,
          airlineName,
          model,
          registration,
          f.estDepartureAirport || null,
          toIata(f.estDepartureAirport),
          f.estArrivalAirport || null,
          toIata(f.estArrivalAirport),
          Date.now()
        );
        if (result.changes > 0) added++;
      }
    } catch (err) {
      console.error(`[poll] ${kind} error:`, err.message);
    }
  }
  console.log(added > 0 ? `[poll] added ${added} new event(s)` : "[poll] no new events");
}

// ---------- API ----------
const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/log", (req, res) => {
  const { type, q, from, to, limit = "300", offset = "0" } = req.query;

  const clauses = [];
  const params = [];

  if (type === "arrival" || type === "departure") {
    clauses.push("type = ?");
    params.push(type);
  }
  if (q) {
    clauses.push(
      "(callsign LIKE ? OR airline_name LIKE ? OR origin_iata LIKE ? OR destination_iata LIKE ? OR registration LIKE ?)"
    );
    const needle = `%${q}%`;
    params.push(needle, needle, needle, needle, needle);
  }
  if (from) {
    clauses.push("event_time >= ?");
    params.push(Math.floor(new Date(from).getTime() / 1000));
  }
  if (to) {
    clauses.push("event_time <= ?");
    params.push(Math.floor(new Date(to).getTime() / 1000));
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM flights ${where}`)
    .get(...params).c;

  const entries = db
    .prepare(
      `SELECT * FROM flights ${where} ORDER BY event_time DESC LIMIT ? OFFSET ?`
    )
    .all(...params, parseInt(limit, 10) || 300, parseInt(offset, 10) || 0);

  res.json({ total, entries });
});

app.get("/api/status", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS c FROM flights").get().c;
  const oldest = db.prepare("SELECT MIN(event_time) AS t FROM flights").get().t;
  const newest = db.prepare("SELECT MAX(event_time) AS t FROM flights").get().t;
  res.json({ totalEvents: total, oldestEvent: oldest, newestEvent: newest });
});

app.listen(PORT, async () => {
  console.log(`JFK flight log server running on http://localhost:${PORT}`);
  await refreshAircraftDb(db); // no-op if cached recently
  pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
  // Re-check the aircraft DB roughly once a day (it internally skips
  // the actual download unless the 30-day cache has expired).
  setInterval(() => refreshAircraftDb(db), 24 * 60 * 60 * 1000);
});
