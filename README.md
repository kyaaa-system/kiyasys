# Demo Live Yahoo — Vercel

Halaman demo **terpisah** untuk menampilkan harga & sinyal MA 50/100/200 dari Yahoo Finance
secara near-real-time. Ini **bukan** artefak UTS yang dikumpulkan.

File UTS (`UTS_25110200025_Atikah Nurfatkiyah.html`) tetap:

- satu file, offline, tanpa `fetch`/XHR/WebSocket/API/proxy/CDN,
- angka metrik dari backtest Python (`results.json`), bukan dari Yahoo,
- bisa dibuka dengan klik dua kali tanpa server.

Demo ini sengaja dipisah karena memakai jaringan (serverless proxy ke Yahoo), sehingga
tidak boleh dicampur ke file yang dinilai.

---

## 1. Isi repo

```text
.
├── index.html          # frontend: tabel 100 saham, kartu sinyal, grafik MA
├── api/
│   ├── tickers.js      # daftar 100 saham Kompas100 + allowlist
│   ├── quotes.js       # proxy serverless ke Yahoo chart API (1..12 saham/permintaan)
│   └── health.js       # cek deploy: /api/health
├── dev-server.js       # pratinjau lokal (tidak dipakai Vercel)
├── vercel.json         # maxDuration + header keamanan
├── package.json        # pin Node >= 20 (tanpa dependensi)
└── .gitignore
```

Tanpa `node_modules`, tanpa build step, tanpa framework.

Tampilan memakai token warna, kartu, sidebar, dan tabel yang sama dengan dashboard UTS
(tema terang/gelap tersimpan di `localStorage` dengan kunci `uts_theme`), supaya demo
terasa satu keluarga dengan file yang dikumpulkan. Komponennya: kartu ringkasan sinyal,
sebaran sinyal (bar proporsi + breadth MA200 + median/rata-rata perubahan), tabel harga,
panel detail yang selalu tampil (pilih saham, rentang 60/150/250 bar, grafik, MA), dan
panduan. Di layar sempit, kolom MA dan sparkline disembunyikan dari tabel; nilainya tetap
ada di panel detail.

Pratinjau lokal sebelum upload:

```bash
npm run dev
# buka http://127.0.0.1:8780
```

## 2. Cara upload ke GitHub

1. Buat repo baru, misalnya **`uts-live-demo`** (jangan satu repo dengan file UTS).
2. Upload **isi folder ini** ke root repo (bukan foldernya):
   - `index.html`
   - folder `api/` berisi 3 file
   - `vercel.json`, `package.json`, `.gitignore`
3. Commit.

Lewat terminal:

```bash
git init
git add .
git commit -m "demo live yahoo untuk 100 saham Kompas100"
git branch -M main
git remote add origin https://github.com/<akun>/uts-live-demo.git
git push -u origin main
```

## 3. Deploy ke Vercel

1. Buka <https://vercel.com/new> → **Import Git Repository** → pilih `uts-live-demo`.
2. Framework Preset: **Other**. Build Command: kosong. Output Directory: kosong.
3. **Deploy** (tanpa environment variable).
4. Selesai: `https://<project>.vercel.app`.

Uji cepat:

| URL | Harapan |
|---|---|
| `/api/health` | `{"ok":true,...}` |
| `/api/tickers` | 100 kode saham |
| `/api/quotes?sym=BBCA,BBRI,TLKM` | 3 baris harga + `closes` |
| `/` | tabel saham termuat |

Opsional: set `YF_USER_AGENT` di Project Settings → Environment Variables bila Yahoo
menolak User-Agent default.

## 4. Cara kerja

- Browser **tidak** memanggil Yahoo langsung (Yahoo tidak mengirim header CORS).
  Frontend memanggil `/api/quotes` di domain yang sama.
- Frontend memecah 100 saham menjadi 10 blok × 10 saham, maksimal 2 blok paralel,
  supaya tidak kena rate limit dan tetap di bawah batas durasi fungsi.
- Server:
  - hanya menerima kode dari allowlist 100 saham Kompas100 (bukan proxy terbuka),
  - maksimal 12 saham per permintaan,
  - timeout 7 detik per saham, fallback `query1` → `query2`,
  - cache 45 detik per instance + `Cache-Control` di CDN.
- Sinyal dihitung di browser dari `closes` (maks. 2 tahun): MA50/100/200, lalu
  - **Beli baru**: `close > MA50 > MA100 > MA200` dan kemarin belum,
  - **Tren naik**: susunan itu sudah terjadi sebelumnya,
  - **Sinyal keluar**: `MA50 < MA100` atau `close < MA200`,
  - **Menunggu**: belum ada susunan.

## 5. Batasan (jujur)

- Yahoo chart API **tidak resmi**; bisa berubah, membatasi (HTTP 429), atau kosong.
- Harga bisa tertunda, dan untuk saham tipis bisa tidak akurat.
- `close` Yahoo bukan harga yang disesuaikan fraksi BEI; MA bisa beda tipis dari
  backtest yang memakai `kompas100_penuh.json`.
- Demo tidak memodelkan fee 0,15%/0,25%, spread 1 tick, lot 100, likuiditas 5%,
  ARA/ARB, atau antrean order.
- Bukan saran investasi dan bukan pengganti backtest.

## 6. Troubleshooting

| Gejala | Sebab / solusi |
|---|---|
| `502` + “Yahoo tidak mengembalikan data” | Rate limit / simbol tutup. Tunggu 1–2 menit, muat ulang. |
| `400` “di luar universe Kompas100” | Kode tidak ada di allowlist (atau salah ketik). |
| `400` “maksimal 12 saham” | Kirim ≤ 12 kode per panggilan. |
| Halaman kosong, `/api/health` 404 | Folder `api/` tidak ikut ter-upload atau bukan di root repo. |
| `FUNCTION_INVOCATION_TIMEOUT` | Perkecil jumlah simbol per panggilan / naikkan `maxDuration`. |
| Beberapa saham tidak muncul | Ticker delisting, ganti nama, atau sedang disuspensi. |

## 7. Kalau dosen bertanya

> “Kenapa file UTS tidak memakai Yahoo?”

Karena ketentuan UTS meminta dashboard **offline** dan angka yang bisa diaudit.
Semua angka di file UTS berasal dari backtest Python atas `kompas100_penuh.json`
(0 permintaan jaringan). Demo Vercel ini hanya pelengkap presentasi, dipisah agar
tidak mengubah artefak yang dinilai.

---

Lisensi: bebas dipakai untuk keperluan tugas. Data harga milik Yahoo Finance;
pemakaian harus mengikuti ketentuan mereka.
