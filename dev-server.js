// Server lokal untuk pratinjau sebelum deploy (bukan bagian dari Vercel).
// Jalankan: node dev-server.js  ->  http://127.0.0.1:8780
//
// Meniru req.query / res.status / res.send seperti runtime Vercel, lalu
// menyajikan index.html. Tidak dipakai saat production.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8780);

const routes = {
  "/api/tickers": require("./api/tickers.js"),
  "/api/quotes": require("./api/quotes.js"),
  "/api/health": require("./api/health.js"),
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const handler = routes[u.pathname];

  if (handler) {
    const query = {};
    for (const [k, v] of u.searchParams) query[k] = v;
    res.status = (code) => { res.statusCode = code; return res; };
    res.send = (body) => res.end(body);
    res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
    try {
      await handler({ query, method: req.method }, res);
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: String((e && e.stack) || e) }));
    }
    return;
  }

  const file = u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname.slice(1));
  const p = path.join(ROOT, file);
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  const ext = path.extname(p).toLowerCase();
  const type = ext === ".html" ? "text/html; charset=utf-8" : ext === ".js" ? "text/javascript; charset=utf-8" : "text/plain; charset=utf-8";
  res.setHeader("Content-Type", type);
  res.end(fs.readFileSync(p));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`demo lokal: http://127.0.0.1:${PORT}  (Ctrl+C untuk berhenti)`);
});
