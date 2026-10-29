// Vercel serverless: ambil OHLC harian dari Yahoo Finance untuk 1..12 saham per panggilan.
//
// Kenapa perlu server: Yahoo tidak mengirim header CORS, jadi browser tidak bisa memanggilnya
// langsung. Fungsi ini bertindak sebagai proxy tipis + allowlist + cache.
//
// Contoh: /api/quotes?sym=BBCA,BBRI,TLKM
// Keluaran: { ok, asof, rows:[{s,t,name,p,pc,chg,pct,cur,time,closes,n}], errors:[...] }

const { TICKERS } = require("./tickers.js");

const SET = new Set(TICKERS);
const HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const RANGE = "2y";          // cukup untuk MA200 (200 bar bursa) + grafik
const INTERVAL = "1d";
const MAX_SYMBOLS = 12;
const TIMEOUT_MS = 7000;
const USER_AGENT =
  process.env.YF_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// cache kecil per instance (Vercel bisa reuse container)
const mem = new Map(); // key -> { at, data }
const TTL_MS = 45_000;

function parseSymbols(q) {
  const raw = String(q.sym || q.symbols || "").split(",");
  const out = [];
  for (const part of raw) {
    const t = part.trim().toUpperCase().replace(/\.JK$/, "");
    if (!t) continue;
    if (!/^[A-Z0-9]{1,6}$/.test(t)) throw new Error(`kode tidak valid: ${t}`);
    if (!SET.has(t)) throw new Error(`di luar universe Kompas100: ${t}`);
    if (!out.includes(t)) out.push(t);
  }
  if (!out.length) throw new Error("parameter sym kosong (contoh: ?sym=BBCA,BBRI)");
  if (out.length > MAX_SYMBOLS) throw new Error(`maksimal ${MAX_SYMBOLS} saham per panggilan`);
  return out;
}

async function yahooChart(symbol) {
  let lastErr = null;
  for (const host of HOSTS) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${RANGE}&interval=${INTERVAL}&includePrePost=false`;
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, {
        signal: ac.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const err = j && j.chart && j.chart.error;
      if (err) throw new Error(err.description || err.code || "chart error");
      const res = j && j.chart && j.chart.result && j.chart.result[0];
      if (!res) throw new Error("respons kosong");
      return res;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(to);
    }
  }
  throw lastErr || new Error("gagal mengambil data");
}

function toRow(symbol, res) {
  const ts = Array.isArray(res.timestamp) ? res.timestamp : [];
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const closes = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close ? q.close[i] : null;
    if (c != null && Number.isFinite(c) && c > 0) closes.push(Number(c.toFixed(4)));
  }
  if (closes.length < 2) throw new Error("riwayat harga terlalu pendek");

  const meta = res.meta || {};
  const last = closes[closes.length - 1];
  // chartPreviousClose = harga sebelum awal range (2 tahun lalu), BUKAN penutupan kemarin.
  // Karena itu perubahan harian dihitung dari dua close terakhir pada seri yang sama.
  const price = last;
  const prev = closes[closes.length - 2];
  const chg = price - prev;
  const pct = prev ? (chg / prev) * 100 : 0;
  const t = String(symbol).replace(/\.JK$/, "");

  return {
    s: symbol,
    t,
    name: meta.shortName || meta.longName || t,
    p: Number(price.toFixed(2)),
    pc: Number(prev.toFixed(2)),
    chg: Number(chg.toFixed(2)),
    pct: Number(pct.toFixed(3)),
    cur: meta.currency || "IDR",
    time: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    closes,
    n: closes.length,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  let symbols;
  try {
    symbols = parseSymbols(req.query || {});
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).send(JSON.stringify({ ok: false, error: String(e.message || e) }));
    return;
  }

  const rows = [];
  const errors = [];
  const asof = new Date().toISOString();

  await Promise.all(
    symbols.map(async (t) => {
      const symbol = `${t}.JK`;
      const hit = mem.get(symbol);
      if (hit && Date.now() - hit.at < TTL_MS) {
        rows.push(hit.data);
        return;
      }
      try {
        const chart = await yahooChart(symbol);
        const row = toRow(symbol, chart);
        mem.set(symbol, { at: Date.now(), data: row });
        rows.push(row);
      } catch (e) {
        errors.push({ s: symbol, error: String((e && e.message) || e) });
      }
    })
  );

  rows.sort((a, b) => a.t.localeCompare(b.t));

  if (!rows.length) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).send(
      JSON.stringify({
        ok: false,
        asof,
        error: "Yahoo tidak mengembalikan data untuk permintaan ini (mungkin rate limit atau simbol tutup).",
        errors,
      })
    );
    return;
  }

  res.setHeader("Cache-Control", "public, s-maxage=45, stale-while-revalidate=180");
  res.status(200).send(JSON.stringify({ ok: true, asof, range: RANGE, rows, errors }));
};
