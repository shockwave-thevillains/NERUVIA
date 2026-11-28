#!/usr/bin/env node
/* Ukur pergeseran tata letak (CLS) akibat pertukaran font (B2). Hanya mengukur dan mencetak; tidak mengubah berkas.
   Pakai:  node tools/ukur-cls-font.mjs [--runs 3] [--tunda 1500] [--json]
   Opsi --halaman /,/belajar/ membatasi halaman (default semua halaman di daftar SEMUA).
   Opsi --lebar 360,390,768 mengganti daftar lebar (default 390,768,1440; maksimal 12 nilai).
   Server statis lokal; semua permintaan .woff2 ditahan --tunda ms supaya halaman tampil dulu dengan font cadangan
   lalu bertukar ke font web (kasus terburuk jaringan lambat). Tiap halaman diukur pada 390, 768, 1440 px;
   keluaran per sel: median CLS, dan sumber pergeseran terbesar (elemen) dari putaran pertama.
   Kode keluar 2 bila Playwright tidak ada. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const RUNS = Math.max(1, Math.min(9, parseInt(arg('runs', '3'), 10) || 3));
const TUNDA = Math.max(0, Math.min(10000, parseInt(arg('tunda', '1500'), 10) || 0));
const SEMUA = ['/', '/belajar/', '/belajar/pelajaran.html?id=l1-m1-p1', '/terima-kasih.html', '/kebijakan-privasi.html', '/404.html'];
const HALAMAN = arg('halaman', '') ? arg('halaman', '').split(',').filter((x) => x.startsWith('/') && !x.includes('..')).slice(0, 12) : SEMUA;
if (!HALAMAN.length) { console.error('--halaman harus berisi jalan yang diawali / dan tanpa .., dipisah koma'); process.exit(1); }
const LEBAR = (arg('lebar', '390,768,1440').split(',').map((x) => parseInt(x, 10)).filter((x) => x >= 280 && x <= 3000)).slice(0, 12);
if (!LEBAR.length) { console.error('--lebar harus berisi angka 280 sampai 3000, dipisah koma'); process.exit(1); }

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright tidak tersedia'); process.exit(2); }

const server = await new Promise((res) => {
  const s = createServer((req, resp) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT)) { resp.writeHead(403); return resp.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { resp.writeHead(404); return resp.end('tidak ada'); }
    const kirim = () => { resp.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); resp.end(readFileSync(f)); };
    if (extname(f) === '.woff2' && TUNDA) setTimeout(kirim, TUNDA); else kirim();
  }).listen(0, '127.0.0.1', () => res(s));
});
const base = 'http://127.0.0.1:' + server.address().port;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const browser = await chromium.launch();
const hasil = [];
for (const h of HALAMAN) {
  for (const w of LEBAR) {
    const nilai = []; let sumber = '';
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : w < 1000 ? 1024 : 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.addInitScript(() => {
        window.__cls = 0; window.__src = [];
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; for (const s of e.sources || []) window.__src.push({ n: s.node ? (s.node.nodeName + (s.node.id ? '#' + s.node.id : '') + (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : '')) : '?', v: e.value }); } }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(base + h, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(TUNDA + 1200);
      const r = await page.evaluate(() => ({ cls: window.__cls, src: window.__src }));
      nilai.push(r.cls);
      if (i === 0) { const m = new Map(); for (const s of r.src) m.set(s.n, (m.get(s.n) || 0) + s.v); sumber = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n, v]) => `${n} ${v.toFixed(4)}`).join('; '); }
      await ctx.close();
    }
    hasil.push({ halaman: h, lebar: w, cls: Math.round(median(nilai) * 10000) / 10000, putaran: nilai.map((x) => Math.round(x * 10000) / 10000), sumber });
  }
}
await browser.close(); server.close();
if (process.argv.includes('--json')) console.log(JSON.stringify({ tunda: TUNDA, runs: RUNS, hasil }, null, 1));
else {
  console.log(`# CLS dengan font ditunda ${TUNDA} ms (median dari ${RUNS} putaran)`);
  for (const r of hasil) console.log(`${r.halaman} @${r.lebar}: CLS ${r.cls.toFixed(4)} ${r.sumber ? '| ' + r.sumber : ''}`);
  console.log('CLS maksimum: ' + Math.max(...hasil.map((r) => r.cls)).toFixed(4) + ' | jumlah sel > 0,1: ' + hasil.filter((r) => r.cls > 0.1).length + ' dari ' + hasil.length);
}
