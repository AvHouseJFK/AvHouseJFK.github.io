// Small static ICAO -> IATA airport code table, covering common JFK
// routes, so the log can show familiar codes like "GIG" instead of
// "SBGL". Anything not in this table just falls back to its ICAO code.
// Extend freely as you notice unfamiliar codes in your log.

export const AIRPORTS = {
  KJFK: "JFK",
  KLAX: "LAX",
  KORD: "ORD",
  KATL: "ATL",
  KMIA: "MIA",
  KBOS: "BOS",
  KSFO: "SFO",
  KSEA: "SEA",
  KDFW: "DFW",
  KIAH: "IAH",
  KLAS: "LAS",
  KDEN: "DEN",
  KPHX: "PHX",
  KFLL: "FLL",
  KMCO: "MCO",
  KEWR: "EWR",
  KLGA: "LGA",
  KIAD: "IAD",
  KDCA: "DCA",
  KPHL: "PHL",
  KDTW: "DTW",
  KMSP: "MSP",
  KCLT: "CLT",
  KSAN: "SAN",
  KPDX: "PDX",
  KHNL: "HNL",

  CYYZ: "YYZ", // Toronto
  CYUL: "YUL", // Montreal
  CYVR: "YVR", // Vancouver

  SBGL: "GIG", // Rio de Janeiro–Galeão
  SBGR: "GRU", // São Paulo–Guarulhos
  SAEZ: "EZE", // Buenos Aires
  SKBO: "BOG", // Bogotá
  SCEL: "SCL", // Santiago
  SPJC: "LIM", // Lima
  MMMX: "MEX", // Mexico City
  MMUN: "CUN", // Cancún
  MPTO: "PTY", // Panama City
  TJSJ: "SJU", // San Juan
  MKJP: "KIN", // Kingston

  EGLL: "LHR", // London Heathrow
  EGKK: "LGW", // London Gatwick
  LFPG: "CDG", // Paris CDG
  EHAM: "AMS", // Amsterdam
  EDDF: "FRA", // Frankfurt
  EDDM: "MUC", // Munich
  LSZH: "ZRH", // Zurich
  LOWW: "VIE", // Vienna
  LEMD: "MAD", // Madrid
  LPPT: "LIS", // Lisbon
  LIRF: "FCO", // Rome Fiumicino
  ESSA: "ARN", // Stockholm
  EKCH: "CPH", // Copenhagen
  ENGM: "OSL", // Oslo
  EFHK: "HEL", // Helsinki
  EPWA: "WAW", // Warsaw
  LGAV: "ATH", // Athens
  LTFM: "IST", // Istanbul
  EIDW: "DUB", // Dublin
  BIKF: "KEF", // Reykjavík

  OMDB: "DXB", // Dubai
  OTHH: "DOH", // Doha
  OMAA: "AUH", // Abu Dhabi
  OERK: "RUH", // Riyadh
  HECA: "CAI", // Cairo
  GMMN: "CMN", // Casablanca
  HAAB: "ADD", // Addis Ababa

  RJAA: "NRT", // Tokyo Narita
  RJTT: "HND", // Tokyo Haneda
  RKSI: "ICN", // Seoul Incheon
  VHHH: "HKG", // Hong Kong
  ZBAA: "PEK", // Beijing Capital
  ZSPD: "PVG", // Shanghai Pudong
  ZGGG: "CAN", // Guangzhou
  WSSS: "SIN", // Singapore
  VTBS: "BKK", // Bangkok
  WMKK: "KUL", // Kuala Lumpur
  RPLL: "MNL", // Manila
  WIII: "CGK", // Jakarta
  VABB: "BOM", // Mumbai
  VIDP: "DEL", // Delhi
  YSSY: "SYD", // Sydney
  YMML: "MEL", // Melbourne
  NZAA: "AKL", // Auckland
};

export function toIata(icaoCode) {
  if (!icaoCode) return null;
  return AIRPORTS[icaoCode] || icaoCode;
}
