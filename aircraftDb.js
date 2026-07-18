// Downloads OpenSky's aircraft metadata database (icao24 -> registration,
// model/typecode) and caches it in SQLite so we can enrich flight events
// with real aircraft info instead of just a hex transponder code.
//
// NOTE: OpenSky's crowdsourced aircraft database has occasionally been
// taken offline for maintenance ("will be made available again at a
// further date" per their site). This loader fails gracefully — if the
// download doesn't work, aircraft type/registration just show as
// "Unknown" rather than breaking the rest of the app. Re-run it later
// once OpenSky's database is back, or point AIRCRAFT_DB_URL at a mirror.

const DEFAULT_URL =
  process.env.AIRCRAFT_DB_URL ||
  "https://s3.opensky-network.org/data-samples/metadata/aircraftDatabase.csv";

const REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function ensureAircraftTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS aircraft_meta (
      icao24 TEXT PRIMARY KEY,
      registration TEXT,
      model TEXT,
      operator TEXT,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS meta_sync (
      key TEXT PRIMARY KEY,
      value INTEGER
    );
  `);
}

function getLastSync(db) {
  const row = db
    .prepare("SELECT value FROM meta_sync WHERE key = 'aircraft_db_synced_at'")
    .get();
  return row ? row.value : 0;
}

function setLastSync(db, ts) {
  db.prepare(
    `INSERT INTO meta_sync (key, value) VALUES ('aircraft_db_synced_at', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(ts);
}

// Minimal CSV line parser that handles quoted fields with commas inside.
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        fields.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

export async function refreshAircraftDb(db, { force = false } = {}) {
  ensureAircraftTable(db);

  if (!force && Date.now() - getLastSync(db) < REFRESH_INTERVAL_MS) {
    console.log("[aircraft-db] cache is fresh, skipping download");
    return { skipped: true };
  }

  console.log(`[aircraft-db] downloading ${DEFAULT_URL} ...`);
  let res;
  try {
    res = await fetch(DEFAULT_URL);
  } catch (err) {
    console.error("[aircraft-db] download failed:", err.message);
    return { error: err.message };
  }
  if (!res.ok) {
    console.error(`[aircraft-db] download failed: HTTP ${res.status}`);
    return { error: `HTTP ${res.status}` };
  }

  const text = await res.text();
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) {
    console.error("[aircraft-db] downloaded file looked empty");
    return { error: "empty file" };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = {
    icao24: header.indexOf("icao24"),
    registration: header.indexOf("registration"),
    model: header.indexOf("model"),
    typecode: header.indexOf("typecode"),
    operator: header.indexOf("operator"),
  };

  const insert = db.prepare(
    `INSERT INTO aircraft_meta (icao24, registration, model, operator, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(icao24) DO UPDATE SET
       registration = excluded.registration,
       model = excluded.model,
       operator = excluded.operator,
       updated_at = excluded.updated_at`
  );

  const now = Date.now();
  let count = 0;
  const runInTransaction = db.transaction
    ? db.transaction((rows) => {
        for (const row of rows) insert.run(...row);
      })
    : null;

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const icao24 = cols[idx.icao24]?.trim();
    if (!icao24) continue;
    const registration = cols[idx.registration]?.trim() || null;
    const model = (cols[idx.model]?.trim() || cols[idx.typecode]?.trim()) || null;
    const operator = cols[idx.operator]?.trim() || null;
    rows.push([icao24, registration, model, operator, now]);
    count++;
  }

  if (runInTransaction) {
    runInTransaction(rows);
  } else {
    for (const row of rows) insert.run(...row);
  }

  setLastSync(db, now);
  console.log(`[aircraft-db] cached ${count} aircraft records`);
  return { count };
}

export function lookupAircraft(db, icao24) {
  if (!icao24) return { registration: null, model: null };
  const row = db
    .prepare("SELECT registration, model FROM aircraft_meta WHERE icao24 = ?")
    .get(icao24.toLowerCase());
  return row || { registration: null, model: null };
}
