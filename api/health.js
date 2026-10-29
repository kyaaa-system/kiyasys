module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(
    JSON.stringify({
      ok: true,
      service: "uts-live-demo",
      node: process.version,
      now: new Date().toISOString(),
      note: "Demo live Yahoo. Bukan file UTS yang dikumpulkan.",
    })
  );
};
