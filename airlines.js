// Static lookup of ICAO 3-letter airline designators -> airline name.
// This covers the carriers most commonly seen at JFK. It's not
// exhaustive — extend it as you spot new prefixes in your log
// (unmatched prefixes just fall back to showing the raw code).

export const AIRLINES = {
  // US majors / regionals
  AAL: "American Airlines",
  DAL: "Delta Air Lines",
  UAL: "United Airlines",
  JBU: "JetBlue Airways",
  SWA: "Southwest Airlines",
  ASA: "Alaska Airlines",
  NKS: "Spirit Airlines",
  FFT: "Frontier Airlines",
  HAL: "Hawaiian Airlines",
  SKW: "SkyWest Airlines",
  RPA: "Republic Airways",
  EDV: "Endeavor Air",
  ENY: "Envoy Air",
  JIA: "PSA Airlines",
  ASH: "Mesa Airlines",
  UCA: "CommutAir",
  QXE: "Horizon Air",

  // Cargo
  FDX: "FedEx Express",
  UPS: "UPS Airlines",
  GTI: "Atlas Air",
  ABX: "ABX Air",
  CKS: "Kalitta Air",
  GEC: "Lufthansa Cargo",
  CLX: "Cargolux",

  // Canada
  ACA: "Air Canada",
  ROU: "Air Canada Rouge",
  WJA: "WestJet",
  POE: "Porter Airlines",

  // Latin America
  GLO: "GOL Linhas Aéreas",
  TAM: "LATAM Airlines Brasil",
  LAN: "LATAM Airlines",
  ARG: "Aerolíneas Argentinas",
  AVA: "Avianca",
  CMP: "Copa Airlines",
  AMX: "Aeroméxico",
  VOI: "Volaris",
  VIV: "Viva Aerobus",
  AZU: "Azul Brazilian Airlines",

  // Europe
  BAW: "British Airways",
  VIR: "Virgin Atlantic",
  AFR: "Air France",
  KLM: "KLM Royal Dutch Airlines",
  DLH: "Lufthansa",
  SWR: "Swiss International Air Lines",
  AUA: "Austrian Airlines",
  IBE: "Iberia",
  TAP: "TAP Air Portugal",
  ITY: "ITA Airways",
  AZA: "Alitalia",
  SAS: "Scandinavian Airlines",
  FIN: "Finnair",
  LOT: "LOT Polish Airlines",
  AEE: "Aegean Airlines",
  THY: "Turkish Airlines",
  PGT: "Pegasus Airlines",
  EIN: "Aer Lingus",
  ICE: "Icelandair",
  NOZ: "Norse Atlantic Airways",

  // Middle East / Africa
  UAE: "Emirates",
  QTR: "Qatar Airways",
  ETD: "Etihad Airways",
  SVA: "Saudia",
  ETH: "Ethiopian Airlines",
  MSR: "EgyptAir",
  RAM: "Royal Air Maroc",
  KAC: "Kuwait Airways",

  // Asia-Pacific
  ANA: "All Nippon Airways",
  JAL: "Japan Airlines",
  KAL: "Korean Air",
  AAR: "Asiana Airlines",
  CPA: "Cathay Pacific",
  CCA: "Air China",
  CSN: "China Southern Airlines",
  CES: "China Eastern Airlines",
  EVA: "EVA Air",
  CAL: "China Airlines",
  SIA: "Singapore Airlines",
  THA: "Thai Airways",
  MAS: "Malaysia Airlines",
  PAL: "Philippine Airlines",
  GIA: "Garuda Indonesia",
  AIC: "Air India",
  VTI: "Vistara",
  QFA: "Qantas",
  ANZ: "Air New Zealand",

  // Charter / private / misc
  EJA: "NetJets",
  XOJ: "Delta Private Jets",
};

// Returns { code, name } given a callsign like "GLO7000" or "DAL123".
// Airline callsigns are (almost) always a 3-letter ICAO prefix followed
// by digits/letters for the flight number.
export function airlineFromCallsign(callsign) {
  if (!callsign) return { code: null, name: null };
  const match = callsign.trim().match(/^([A-Z]{3})/);
  if (!match) return { code: null, name: null };
  const code = match[1];
  return { code, name: AIRLINES[code] || null };
}
