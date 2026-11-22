#!/usr/bin/env node
/* Uji perilaku muat frame Neru di hero (kegiatan B1).
   Pakai: node tools/uji-muat-neru.mjs   (keluar 0 bila lulus, 1 bila ada yang gagal, 2 bila Playwright tidak ada)
   Memastikan: frame animasi tidak diminta sebelum event load, berprioritas rendah, memakai folder sesuai kerapatan layar,
   animasi menyala setelah semua frame siap, dan jalur negatif aman: reduced-motion, hemat data, jaringan 2G, JS mati,
   frame 404, frame dibatalkan, tab tersembunyi, nilai connection yang janggal, gerak mouse sebelum frame siap. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let gagal = 0, lulus = 0;
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log('  GAGAL: ' + ket); } };

/* ---- bagian statis (tanpa browser) ---- */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const imgHero = (html.match(/<img[^>]*src="assets\/neru\.webp"[^>]*>/) || [''])[0];
const preload = (html.match(/<link[^>]*rel="preload"[^>]*href="assets\/neru\.webp"[^>]*>/) || [''])[0];
const imgWave = (html.match(/<img[^>]*src="assets\/neru-wave\.webp"[^>]*>/) || [''])[0];
cek(/fetchpriority="high"/.test(imgHero), 'gambar hero harus fetchpriority=high');
cek(!/loading="lazy"/.test(imgHero), 'gambar hero (LCP) tidak boleh loading=lazy');
cek(/fetchpriority="high"/.test(preload), 'preload gambar hero harus fetchpriority=high');
cek(/loading="lazy"/.test(imgWave) && /decoding="async"/.test(imgWave), 'gambar wave harus loading=lazy dan decoding=async');

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.log('Playwright tidak tersedia: uji browser dilewati'); console.log(`${lulus} lulus, ${gagal} gagal (statis saja)`); process.exit(gagal ? 1 : 2); }

const server = await new Promise((res) => {
  const s = createServer((req, resp) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT)) { resp.writeHead(403); return resp.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { resp.writeHead(404); return resp.end('tidak ada'); }
    resp.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    resp.end(readFileSync(f));
  }).listen(0, '127.0.0.1', () => res(s));
});
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
const PROF = { d1440: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, m390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } };

/* buka halaman dengan opsi; kembalikan ringkasan */
async function buka(profil, o = {}) {
  const ctx = await browser.newContext({ ...PROF[profil], reducedMotion: o.reduce ? 'reduce' : 'no-preference', javaScriptEnabled: o.js !== false });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const prio = [];
  cdp.on('Network.requestWillBeSent', (e) => { if (/maskot-animasi\/frames/.test(e.request.url)) prio.push(e.request.initialPriority); });
  const galat = [], frames = [];
  page.on('pageerror', (e) => galat.push(String(e)));
  page.on('request', (r) => { if (/maskot-animasi\/frames/.test(r.url())) frames.push(r.url()); });
  if (o.init) await page.addInitScript(o.init);
  if (o.route) await page.route('**/maskot-animasi/frames*/**', o.route);
  await page.goto(base + '/', { waitUntil: o.tunggu || 'load' });
  if (o.sebelum) await o.sebelum(page);
  if (o.live) await page.waitForFunction(() => document.getElementById('neru').classList.contains('live'), null, { timeout: 30000 }).catch(() => {});
  else await page.waitForTimeout(o.diam ?? 3500);
  const k = o.js === false ? { live: false, imgTampil: true } : await page.evaluate(() => {
    const n = document.getElementById('neru'), im = n.querySelector('img'), cv = n.querySelector('canvas');
    const mulaiLoad = performance.getEntriesByType('navigation')[0].loadEventStart;
    const fr = performance.getEntriesByType('resource').filter((e) => /maskot-animasi\/frames/.test(e.name));
    let piksel = 0;
    try { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) piksel++; } catch (e) { piksel = -1; }
    return {
      live: n.classList.contains('live'), imgTampil: getComputedStyle(im).display !== 'none', cvTampil: getComputedStyle(cv).display !== 'none',
      cvW: cv.width, piksel, frameSebelumLoad: fr.filter((e) => e.startTime < mulaiLoad).length,
    };
  });
  const hasil = { ...k, galat, frames, prio, adaFrame: frames.length };
  await ctx.close();
  return hasil;
}

/* 1. jalur normal: desktop dan HP */
for (const [p, dirOk, lebar] of [['d1440', '/frames/', 547], ['m390', '/frames-2x/', 1094]]) {
  const r = await buka(p, { live: true });
  cek(r.frameSebelumLoad === 0, `${p}: tidak ada frame diminta sebelum load (ada ${r.frameSebelumLoad})`);
  cek(r.frames.length === 21, `${p}: 21 frame diminta (ada ${r.frames.length})`);
  cek(r.frames.every((u) => u.includes(dirOk)), `${p}: folder frame sesuai kerapatan layar (${dirOk})`);
  cek(r.prio.length === 21 && r.prio.every((x) => x === 'Low' || x === 'VeryLow'), `${p}: semua frame berprioritas rendah (${[...new Set(r.prio)].join(',')})`);
  cek(r.live && r.cvTampil && !r.imgTampil, `${p}: animasi menyala, canvas tampil, gambar diam disembunyikan`);
  cek(r.cvW === lebar, `${p}: lebar canvas ${lebar} (ada ${r.cvW})`);
  cek(r.piksel > 50, `${p}: canvas berisi gambar (piksel tidak transparan ${r.piksel})`);
  cek(r.galat.length === 0, `${p}: tanpa galat skrip (${r.galat.join('; ')})`);
}

/* 2. jalur negatif: tidak ada frame dan Neru tetap gambar diam */
const diam = (nama, r) => {
  cek(r.adaFrame === 0, `${nama}: tidak ada permintaan frame (ada ${r.adaFrame})`);
  cek(!r.live && r.imgTampil, `${nama}: tidak live, gambar diam tetap tampil`);
  cek(r.galat.length === 0, `${nama}: tanpa galat skrip (${r.galat.join('; ')})`);
};
diam('reduced-motion', await buka('d1440', { reduce: true }));
diam('JS dimatikan', await buka('d1440', { js: false, diam: 800 }));
const konek = (v) => `Object.defineProperty(navigator,'connection',{configurable:true,get:()=>(${v})})`;
diam('saveData', await buka('d1440', { init: konek('{saveData:true,effectiveType:"4g"}') }));
diam('effectiveType 2g', await buka('d1440', { init: konek('{saveData:false,effectiveType:"2g"}') }));
diam('effectiveType slow-2g', await buka('d1440', { init: konek('{saveData:false,effectiveType:"slow-2g"}') }));

/* 3. kontrol positif: 3g dan 4g tetap memuat; nilai janggal tidak merusak */
for (const [nama, v] of [['3g', '{saveData:false,effectiveType:"3g"}'], ['4g', '{saveData:false,effectiveType:"4g"}'], ['connection tanpa field', '{}'], ['connection null', 'null'],
  ['effectiveType janggal', '{effectiveType:"<img src=x onerror=alert(1)>"}'], ['effectiveType angka', '{effectiveType:5}'], ['effectiveType 1 MB', '{effectiveType:"a".repeat(1e6)}']]) {
  const r = await buka('d1440', { init: konek(v), live: true });
  cek(r.live && r.adaFrame === 21 && r.galat.length === 0, `connection ${nama}: tetap memuat 21 frame dan menyala tanpa galat (frame ${r.adaFrame}, galat ${r.galat.length})`);
}

/* 4. frame gagal: satu 404, semua dibatalkan; tidak boleh menyala setengah jadi dan tidak boleh galat */
{
  const r = await buka('d1440', { route: (rt) => (/f07\.webp/.test(rt.request().url()) ? rt.fulfill({ status: 404, body: 'x' }) : rt.continue()) });
  cek(!r.live && r.imgTampil && r.galat.length === 0, `satu frame 404: tidak live, gambar diam tampil, tanpa galat (live ${r.live}, galat ${r.galat.length})`);
  const r2 = await buka('d1440', { route: (rt) => rt.abort() });
  cek(!r2.live && r2.imgTampil && r2.galat.length === 0, `semua frame dibatalkan: tidak live, gambar diam tampil, tanpa galat`);
  const r3 = await buka('d1440', { route: (rt) => rt.fulfill({ status: 200, contentType: 'image/webp', body: 'bukan gambar' }) });
  cek(!r3.live && r3.imgTampil && r3.galat.length === 0, `frame rusak (isi bukan gambar): tidak live, tanpa galat`);
}

/* 5. gerak mouse sebelum frame siap tidak boleh melempar galat (frame ditahan 2 dtk) */
{
  const r = await buka('d1440', {
    route: async (rt) => { await new Promise((s) => setTimeout(s, 2000)); rt.continue().catch(() => {}); },
    sebelum: async (page) => { for (let i = 0; i < 25; i++) { await page.mouse.move(100 + i * 40, 200 + i * 10); await page.waitForTimeout(30); } },
    live: true,
  });
  cek(r.live && r.galat.length === 0, `mouse digerakkan sebelum frame siap: tanpa galat, lalu menyala (galat ${r.galat.join('; ')})`);
}

/* 6. tab tersembunyi: tidak memuat sampai terlihat */
{
  const init = `(() => { let h = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); window.__tampil = () => { h = false; document.dispatchEvent(new Event('visibilitychange')); }; })()`;
  const ctx = await browser.newContext(PROF.d1440);
  const page = await ctx.newPage(); let n = 0;
  page.on('request', (r) => { if (/maskot-animasi\/frames/.test(r.url())) n++; });
  await page.addInitScript(init);
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  cek(n === 0, `tab tersembunyi: tidak ada frame diminta (ada ${n})`);
  await page.evaluate(() => window.__tampil());
  await page.waitForFunction(() => document.getElementById('neru').classList.contains('live'), null, { timeout: 30000 }).catch(() => {});
  cek(n === 21 && await page.evaluate(() => document.getElementById('neru').classList.contains('live')), `tab jadi terlihat: 21 frame dimuat dan menyala (frame ${n})`);
  await ctx.close();
}

await browser.close(); server.close();
console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
