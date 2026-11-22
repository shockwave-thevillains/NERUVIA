#!/usr/bin/env node
/* Uji kestabilan tata letak halaman pelajaran (kegiatan B3).
   Pakai: node tools/uji-cls-pelajaran.mjs [--halaman berkas.html]
   Keluar 0 bila lulus, 1 bila ada yang gagal, 2 bila Playwright tidak ada.
   Latar: isi pelajaran tiba lewat fetch kedua. Tombol "Tandai selesai", status, dan navigasi ada di bawah isi, jadi bila
   dipasang sebelum isi siap mereka terdorong jauh ke bawah (CLS 0,06 sampai 0,115 di 390/768/1440 px).
   Kini bagian bawah dipasang setelah isi siap. Uji ini menunda atau merusak berkas isi lewat page.route dan memastikan
   (1) pergeseran tata letak <= 0,01 pada 3 lebar dan 3 tundaan, (2) bagian bawah tetap ada dan benar pada semua jalur
   (isi belum ada, 404, JSON rusak, isi besar, id jahat), (3) data dari JSON tetap menjadi teks, bukan HTML.
   --halaman memakai berkas lain sebagai pengganti belajar/pelajaran.html (dipakai untuk uji mutasi terhadap kode lama). */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const argI = process.argv.indexOf('--halaman');
let halamanUji = join(ROOT, 'belajar', 'pelajaran.html');
if (argI > 0) {
  if (!process.argv[argI + 1]) { console.error('--halaman butuh nama berkas'); process.exit(1); }
  halamanUji = resolve(process.argv[argI + 1]);
  if (!existsSync(halamanUji)) { console.error('berkas tidak ada: ' + halamanUji); process.exit(1); }
}
const HTML = readFileSync(halamanUji, 'utf8');
const BATAS_CLS = 0.01;
let gagal = 0, lulus = 0;
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log('  GAGAL: ' + ket); } };

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.log('Playwright tidak tersedia: uji dilewati'); process.exit(2); }

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
const LEBAR = [390, 768, 1440];

/* buka halaman pelajaran; o.tunda = ms tunda berkas isi, o.isi = fungsi pengganti isi (status, badan), o.simpan = pertahankan localStorage */
async function buka(id, w, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : w < 1000 ? 1024 : 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const galat = [];
  page.on('pageerror', (e) => galat.push(String(e)));
  await page.addInitScript(() => {
    window.__cls = 0; window.__xss = 0; window.__geser = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__geser.push(Math.round(e.value * 10000) / 10000); } }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.route('**/belajar/pelajaran.html*', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }));
  await page.route('**/content/pelajaran/*.json', async (r) => {
    if (o.tunda) await new Promise((x) => setTimeout(x, o.tunda));
    if (o.isi) { const { status, body } = o.isi(); return r.fulfill({ status, contentType: 'application/json', body }); }
    return r.continue();
  });
  await page.goto(base + '/belajar/pelajaran.html?id=' + id, { waitUntil: 'load', timeout: 30000 });
  return { ctx, page, galat };
}
const selesai = async (page, ms) => { await page.waitForTimeout(ms); return page.evaluate(() => ({ cls: window.__cls, geser: window.__geser })); };
const hitung = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const urutanAnak = (page) => page.evaluate(() => [...document.getElementById('isi').children].map((e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '')).join(' '));
const URUTAN = 'nav.crumb h1 div.meta div.mprog section.body div.acts p.live div.nav2';

/* 1. kestabilan: p1 (ada isi) pada 3 lebar x 3 tundaan berkas isi */
for (const w of LEBAR) for (const tunda of [0, 300, 1200]) {
  const { ctx, page, galat } = await buka('l1-m1-p1', w, { tunda });
  const r = await selesai(page, tunda + 900);
  cek(r.cls <= BATAS_CLS, `p1 ${w}px tunda ${tunda} ms: CLS ${r.cls.toFixed(4)} harus <= ${BATAS_CLS} (pergeseran ${JSON.stringify(r.geser)})`);
  cek(galat.length === 0, `p1 ${w}px tunda ${tunda} ms: tanpa galat skrip (${galat.join('; ')})`);
  await ctx.close();
}

/* 2. pelajaran tanpa berkas isi (isi: belum) pada 3 lebar: bagian bawah langsung ada, CLS kecil */
for (const w of LEBAR) {
  const { ctx, page } = await buka('l1-m1-p2', w);
  const r = await selesai(page, 700);
  cek(r.cls <= BATAS_CLS, `p2 (belum ada isi) ${w}px: CLS ${r.cls.toFixed(4)}`);
  cek(await hitung(page, '.acts') === 1 && await hitung(page, '.nav2') === 1, `p2 ${w}px: tepat satu tombol selesai dan satu navigasi`);
  await ctx.close();
}

/* 3. desain: selama isi belum tiba, bagian bawah belum ada; sesudah tiba, ada dengan urutan benar */
{
  const { ctx, page } = await buka('l1-m1-p1', 1440, { tunda: 1500 });
  await page.waitForTimeout(500);
  const sebelum = await page.evaluate(() => ({ acts: document.querySelectorAll('.acts').length, nav: document.querySelectorAll('.nav2').length, muat: /Memuat isi pelajaran/.test(document.querySelector('.body').textContent) }));
  cek(sebelum.acts === 0 && sebelum.nav === 0, `sebelum isi tiba: tombol dan navigasi belum dipasang (acts ${sebelum.acts}, nav ${sebelum.nav})`);
  cek(sebelum.muat, 'sebelum isi tiba: teks "Memuat isi pelajaran…" tampil');
  await page.waitForSelector('.acts', { timeout: 10000 });
  cek(await urutanAnak(page) === URUTAN, `sesudah isi tiba: urutan anak <main> benar (${await urutanAnak(page)})`);
  cek(await hitung(page, '.acts') === 1 && await hitung(page, '.nav2') === 1 && await hitung(page, 'p.live') === 1, 'sesudah isi tiba: satu .acts, satu .nav2, satu p.live');
  const y = await page.evaluate(() => ({ b: document.querySelector('.body').getBoundingClientRect().bottom, a: document.querySelector('.acts').getBoundingClientRect().top }));
  cek(y.a >= y.b, `tombol selesai berada di bawah isi (bawah isi ${Math.round(y.b)}, atas tombol ${Math.round(y.a)})`);
  await ctx.close();
}

/* 4. jalur gagal: 404, JSON rusak, bukan objek, kosong: pesan galat tampil dan bagian bawah tetap dipasang */
const rusak = [
  ['404', () => ({ status: 404, body: 'tidak ada' })],
  ['500', () => ({ status: 500, body: 'galat' })],
  ['JSON terpotong', () => ({ status: 200, body: '{"status":"draf","tujuan":' })],
  ['JSON bukan objek', () => ({ status: 200, body: '"teks"' })],
  ['JSON null', () => ({ status: 200, body: 'null' })],
  ['badan kosong', () => ({ status: 200, body: '' })],
  ['bagian bukan larik', () => ({ status: 200, body: JSON.stringify({ status: 'draf', tujuan: 't', bagian: 5 }) })],
];
for (const [nama, fn] of rusak) {
  const { ctx, page } = await buka('l1-m1-p1', 390, { tunda: 200, isi: fn });
  await page.waitForTimeout(900);
  const s = await page.evaluate(() => ({ teks: document.querySelector('.body').textContent, acts: document.querySelectorAll('.acts').length, nav: document.querySelectorAll('.nav2').length, cls: window.__cls }));
  cek(/gagal dimuat/.test(s.teks), `isi ${nama}: pesan "gagal dimuat" tampil (teks: ${s.teks.slice(0, 60)})`);
  cek(s.acts === 1 && s.nav === 1, `isi ${nama}: tombol dan navigasi tetap dipasang (acts ${s.acts}, nav ${s.nav})`);
  cek(s.cls <= BATAS_CLS, `isi ${nama}: CLS ${s.cls.toFixed(4)}`);
  await ctx.close();
}

/* 5. isi sangat besar: 150 bagian, CLS tetap kecil dan bagian bawah di akhir */
{
  const besar = { status: 'draf', tujuan: 'Tujuan uji.', bagian: Array.from({ length: 150 }, (_, i) => ({ judul: 'Bagian ' + (i + 1), paragraf: ['Kalimat uji yang cukup panjang supaya baris membungkus di layar sempit. '.repeat(6)] })), cek: [], ringkasan: ['a', 'b', 'c'] };
  for (const w of [390, 1440]) {
    const { ctx, page } = await buka('l1-m1-p1', w, { tunda: 300, isi: () => ({ status: 200, body: JSON.stringify(besar) }) });
    const r = await selesai(page, 1200);
    cek(r.cls <= BATAS_CLS, `isi 150 bagian ${w}px: CLS ${r.cls.toFixed(4)}`);
    cek(await urutanAnak(page) === URUTAN, `isi 150 bagian ${w}px: urutan anak benar`);
    await ctx.close();
  }
}

/* 6. masukan jahat di JSON isi: tetap teks, tidak ada elemen atau skrip dari data */
{
  const jahat = '<img src=x onerror="window.__xss=1"><script>window.__xss=2<\/script>"\'><svg onload="window.__xss=3">';
  const isi = { status: 'draf', tujuan: jahat, bagian: [{ judul: jahat, paragraf: [jahat] }], contoh: { judul: jahat, teks: jahat }, latihan: { petunjuk: jahat }, cek: [{ tanya: jahat, opsi: [jahat, 'b', 'c'], benar: 0, jelas: jahat }], ringkasan: [jahat] };
  const { ctx, page, galat } = await buka('l1-m1-p1', 1440, { tunda: 100, isi: () => ({ status: 200, body: JSON.stringify(isi) }) });
  await page.waitForSelector('.acts', { timeout: 10000 });
  await page.click('.opt');
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => ({ xss: window.__xss, img: document.querySelectorAll('.body img, .body script, .body svg').length, ada: document.querySelector('.body').textContent.includes('onerror=') }));
  cek(s.xss === 0 && s.img === 0, `payload di JSON isi: tidak dieksekusi (xss ${s.xss}, elemen ${s.img})`);
  cek(s.ada, 'payload di JSON isi: muncul sebagai teks apa adanya');
  cek(galat.length === 0, 'payload di JSON isi: tanpa galat skrip');
  await ctx.close();
}

/* 7. id jahat atau salah: halaman gagal, tanpa tombol, tanpa eksekusi */
for (const id of ['', 'tidak-ada', '<img src=x onerror=window.__xss=1>', '"><script>window.__xss=1<\/script>', '../../etc/passwd', 'l1-m1-p1%00', 'a'.repeat(5000)]) {
  const { ctx, page, galat } = await buka(encodeURIComponent(id), 390);
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => ({ teks: document.getElementById('isi').textContent, acts: document.querySelectorAll('.acts').length, xss: window.__xss }));
  cek(/tidak ditemukan/.test(s.teks) && s.acts === 0 && s.xss === 0 && galat.length === 0, `id ${JSON.stringify(id.slice(0, 30))}: ditolak, tanpa tombol dan tanpa eksekusi`);
  await ctx.close();
}

/* 8. fungsi setelah dipasang belakangan: tandai selesai, batalkan, navigasi, fokus papan ketik */
{
  const { ctx, page } = await buka('l1-m1-p1', 1440, { tunda: 400 });
  await page.waitForSelector('.acts button', { timeout: 10000 });
  const tombol = page.locator('.acts button');
  cek((await tombol.getAttribute('aria-pressed')) === 'false' && /Tandai selesai/.test(await tombol.textContent()), 'tombol awal: belum selesai');
  await tombol.click();
  cek((await tombol.getAttribute('aria-pressed')) === 'true' && /Tersimpan/.test(await page.locator('p.live').textContent()), 'klik tombol: selesai dan status "Tersimpan" diumumkan');
  cek(await page.evaluate(() => window.NVProgress.isDone('l1-m1-p1')), 'progres tersimpan di NVProgress');
  await tombol.click();
  cek((await tombol.getAttribute('aria-pressed')) === 'false' && /dibatalkan/.test(await page.locator('p.live').textContent()), 'klik lagi: batal dan diumumkan');
  await tombol.focus();
  await page.keyboard.press('Enter');
  cek((await tombol.getAttribute('aria-pressed')) === 'true', 'tombol bisa dioperasikan dengan papan ketik (Enter)');
  const nav = await page.evaluate(() => [...document.querySelectorAll('.nav2 a')].map((a) => ({ t: a.textContent, off: a.getAttribute('aria-disabled'), href: a.getAttribute('href') })));
  cek(nav.length === 2 && nav[0].off === 'true' && !nav[0].href && /id=l1-m1-p2/.test(nav[1].href || ''), `pelajaran pertama: "Sebelumnya" nonaktif, "Berikutnya" ke p2 (${JSON.stringify(nav)})`);
  await ctx.close();
}
{
  const { ctx, page } = await buka('l1-m1-p5', 390);
  await page.waitForSelector('.nav2', { timeout: 10000 });
  const nav = await page.evaluate(() => [...document.querySelectorAll('.nav2 a')].map((a) => ({ off: a.getAttribute('aria-disabled'), href: a.getAttribute('href') })));
  cek(nav.length === 2 && !!nav[0].href && nav[1].off === 'true' && !nav[1].href, `pelajaran terakhir modul: "Berikutnya" nonaktif (${JSON.stringify(nav)})`);
  await ctx.close();
}

await browser.close(); server.close();
console.log(`${lulus} lulus, ${gagal} gagal` + (argI > 0 ? ` (halaman uji: ${halamanUji})` : ''));
process.exit(gagal ? 1 : 0);
