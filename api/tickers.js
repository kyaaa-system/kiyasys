// Daftar 100 saham Kompas100 yang dipakai di UTS.
// Dipakai frontend (lewat /api/tickers) dan allowlist server (/api/quotes).
const TICKERS = [
  "ABMM", "ACES", "ADMR", "ADRO", "AKRA", "AMMN", "AMRT", "ANTM", "ARTO", "ASII",
  "AUTO", "AVIA", "BBCA", "BBNI", "BBRI", "BBTN", "BBYB", "BFIN", "BMRI", "BMTR",
  "BNGA", "BRIS", "BRMS", "BRPT", "BSDE", "BTPS", "BUKA", "CMRY", "CPIN", "CTRA",
  "DOID", "DSNG", "ELSA", "EMTK", "ENRG", "ERAA", "ESSA", "EXCL", "GGRM", "GJTL",
  "GOTO", "HEAL", "HMSP", "HRUM", "ICBP", "INCO", "INDF", "INDY", "INKP", "INTP",
  "ISAT", "ITMG", "JPFA", "JSMR", "KIJA", "KLBF", "MAHA", "MAPA", "MAPI", "MARK",
  "MBMA", "MDKA", "MEDC", "MIKA", "MNCN", "MPMX", "MTEL", "MYOR", "NCKL", "NISP",
  "PANI", "PGAS", "PGEO", "PNLF", "PTBA", "PTMP", "PTPP", "PTRO", "PWON", "SCMA",
  "SIDO", "SILO", "SMGR", "SMIL", "SMRA", "SMSM", "SRTG", "SSIA", "SSMS", "TBIG",
  "TINS", "TKIM", "TLKM", "TOWR", "TPIA", "ULTJ", "UNTR", "UNVR", "VKTR", "WIFI",
];

module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(JSON.stringify({ ok: true, count: TICKERS.length, tickers: TICKERS }));
};

module.exports.TICKERS = TICKERS;
