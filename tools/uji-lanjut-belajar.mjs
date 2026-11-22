#!/usr/bin/env node
/* Uji penanda Draf di galeri dan "lanjut ke pelajaran berikutnya yang belum selesai" (kegiatan C4).
   Pakai: node tools/uji-lanjut-belajar.mjs [--cepat]   (--cepat: hanya fungsi NVProgress.lanjut, tanpa browser)
   Keluar 0 bila lulus, 1 bila ada yang gagal, 2 bila lulus tetapi Playwright tidak ada (bagian browser dilewati).
   Bagian 1: fungsi murni NVProgress.lanjut dengan data normal, data aneh, dan id jahat (tanpa browser).
   Bagian 2: galeri dan halaman pelajaran di Chromium pada 390, 768, 1440 px: pil DRAF, tombol Mulai/Lanjutkan, tautan Lanjut
   setelah selesai, tidak berpindah halaman sendiri, teks jahat dari kursus.json tetap teks, data rusak tidak merusak halaman. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const CEPAT = process.argv.includes('--cepat');
let gagal = 0, jumlah = 0;
const cek = (nama, ok) => { jumlah++; if (!ok) gagal++; console.log((ok ? 'lulus  ' : 'GAGAL  ') + nama); };

/* ---------- Bagian 1: fungsi murni ---------- */
const kode = readFileSync(join(ROOT, 'belajar', 'progress.js'), 'utf8');
function baru(done) {
  const simpan = done ? JSON.stringify({ done }) : null;
  const store = new Map(simpan ? [['neruvia.progress.v1', simpan]] : []);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const window = {};
  vm.runInNewContext(kode, { window, localStorage, Date, JSON, Object, Array, Math, isNaN, String, Number }, { filename: 'progress.js' });
  return window.NVProgress;
}
const P = (id, isi = 'draf') => ({ id, judul: 'J ' + id, jenis: 'Konsep', xp: 10, isi });
const K = {
  level: [
    { id: 'l1', status: 'gratis', modul: [{ id: 'l1-m1', judul: 'M1', pelajaran: [P('a1'), P('a2', 'belum'), P('a3'), P('a4', 'final')] }, { id: 'l1-m2', judul: 'M2', pelajaran: [P('b1'), P('b2')] }] },
    { id: 'l2', status: 'segera', modul: [{ id: 'l2-m1', judul: 'M', pelajaran: [P('c1')] }] },
    { id: 'l3', status: 'gratis', modul: [{ id: 'l3-m1', judul: 'M', pelajaran: [P('d1')] }] }
  ]
};
const T = '2026-11-21T10:00:00.000Z';
const id = (r) => (r ? r.pelajaran.id : null);
{
  const NV = baru();
  cek('awal, tanpa id: pelajaran pertama yang ada isinya', id(NV.lanjut(K, '')) === 'a1');
  cek('kembalian memuat level dan modul', NV.lanjut(K, '').level.id === 'l1' && NV.lanjut(K, '').modul.id === 'l1-m1');
  cek('sesudah a1: a3 (a2 isi belum dilewati)', id(NV.lanjut(K, 'a1')) === 'a3');
  cek('sesudah a3: a4 (isi final ikut dihitung)', id(NV.lanjut(K, 'a3')) === 'a4');
  cek('sesudah a4: lintas modul ke b1', id(NV.lanjut(K, 'a4')) === 'b1');
  cek('sesudah b2: level segera (c1) dilewati, lanjut ke d1', id(NV.lanjut(K, 'b2')) === 'd1');
  cek('sesudah d1: kembali ke awal (a1)', id(NV.lanjut(K, 'd1')) === 'a1');
  cek('id tak dikenal diperlakukan seperti tanpa id', id(NV.lanjut(K, 'zzz')) === 'a1');
  cek('pembatasan level l1: sesudah b2 kembali ke a1', id(NV.lanjut(K, 'b2', 'l1')) === 'a1');
  cek('pembatasan level l3: hanya d1', id(NV.lanjut(K, '', 'l3')) === 'd1');
  cek('pembatasan ke level segera menghasilkan null', NV.lanjut(K, '', 'l2') === null);
  cek('pembatasan ke level yang tidak ada menghasilkan null', NV.lanjut(K, '', 'xx') === null);
}
{
  const NV = baru({ a1: T, a3: T });
  cek('yang sudah selesai dilewati: tanpa id memberi a4', id(NV.lanjut(K, '')) === 'a4');
  cek('sesudah a1 (a3 selesai) memberi a4', id(NV.lanjut(K, 'a1')) === 'a4');
}
{
  const NV = baru({ a1: T, a3: T, a4: T, b1: T, b2: T, d1: T });
  cek('semua selesai: null', NV.lanjut(K, '') === null && NV.lanjut(K, 'd1') === null);
}
{
  const NV = baru({ a1: T, a3: T, a4: T, b1: T, d1: T });
  cek('hanya satu tersisa (b2): ditemukan dari id mana pun', id(NV.lanjut(K, '')) === 'b2' && id(NV.lanjut(K, 'b2')) === null && id(NV.lanjut(K, 'a1')) === 'b2');
  cek('id sekarang tidak pernah dikembalikan walau belum selesai', id(NV.lanjut(K, 'b2')) !== 'b2');
}
{
  const NV = baru();
  [null, undefined, 1, 'x', [], {}, { level: null }, { level: 'x' }, { level: {} }, { level: [null, 1, 'x', []] },
   { level: [{ status: 'gratis', modul: null }] }, { level: [{ status: 'gratis', modul: [null, 1, { pelajaran: 'x' }] }] },
   { level: [{ status: 'gratis', modul: [{ pelajaran: [null, 1, 'x', {}, { id: 5 }, { id: null }] }] }] }]
    .forEach((d, i) => { let r, ok = true; try { r = NV.lanjut(d, ''); } catch { ok = false; } cek('data rusak #' + i + ' tidak melempar galat dan memberi null', ok && r === null); });
  const jahat = { level: [{ id: 'l1', status: 'gratis', modul: [{ id: 'm', pelajaran: [
    { id: '__proto__', judul: 'x', isi: 'draf' }, { id: 'constructor', judul: 'x', isi: 'draf' }, { id: 'prototype', judul: 'x', isi: 'draf' },
    { id: '<img src=x onerror=alert(1)>', judul: 'x', isi: 'draf' }, { id: '../../etc/passwd', judul: 'x', isi: 'draf' }, { id: 'A'.repeat(60), judul: 'x', isi: 'draf' },
    { id: 'ok-1', judul: 'x', isi: 'draf' }] }] }] };
  cek('id jahat dilewati, id sah ditemukan', id(NV.lanjut(jahat, '')) === 'ok-1');
  cek('id jahat sebagai id sekarang tidak mencemari prototipe', (NV.lanjut(jahat, '__proto__'), ({}).polluted === undefined) && id(NV.lanjut(jahat, '__proto__')) === 'ok-1');
  const getter = { level: [{ status: 'gratis', get modul() { throw new Error('jahat'); } }] };
  let ok = true, r; try { r = NV.lanjut(getter, ''); } catch { ok = false; }
  cek('getter yang melempar galat ditangani (null)', ok && r === null);
}
{
  const NV = baru({ '__proto__': T, 'a1': 'bukan-tanggal' });
  cek('progres rusak di localStorage: a1 tidak dianggap selesai', id(NV.lanjut(K, '')) === 'a1');
}

if (CEPAT) { console.log(`\n${jumlah - gagal} dari ${jumlah} lulus`); process.exit(gagal ? 1 : 0); }

/* ---------- Bagian 2: browser ---------- */
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.log('Playwright tidak tersedia: bagian browser dilewati'); console.log(`\n${jumlah - gagal} dari ${jumlah} lulus`); process.exit(gagal ? 1 : 2); }

const server = await new Promise((res) => {
  const s = createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT) || !existsSync(f) || !statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
  }).listen(0, '127.0.0.1', () => res(s));
});
const base = 'http://127.0.0.1:' + server.address().port;
const kursus = JSON.parse(readFileSync(join(ROOT, 'content', 'kursus.json'), 'utf8'));
const semua = []; kursus.level.forEach((l) => l.modul.forEach((m) => m.pelajaran.forEach((p) => semua.push(p))));
const dapat = semua.filter((p) => p.isi !== 'belum');
const browser = await chromium.launch();

async function konteks(w, { kursusBody, done } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: 900 } });
  if (done) await c.addInitScript((d) => { localStorage.setItem('neruvia.progress.v1', JSON.stringify({ done: d })); }, done);
  const pg = await c.newPage(); const galat = [];
  pg.on('pageerror', (e) => galat.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') galat.push(m.text()); });
  if (kursusBody !== undefined) await pg.route('**/content/kursus.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: kursusBody }));
  return { c, pg, galat };
}
const geser = (pg) => pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

for (const w of [390, 768, 1440]) {
  const t = `@${w}`;
  /* galeri, belum ada progres */
  {
    const { c, pg, galat } = await konteks(w);
    await pg.goto(base + '/belajar/'); await pg.waitForSelector('.card .go');
    const l1 = pg.locator('.card').first();
    await l1.locator('summary').click();
    cek(`galeri ${t}: pil DRAF tampil di setiap pelajaran yang berisi (${dapat.length})`, (await pg.locator('.ls .dr').count()) === dapat.length);
    cek(`galeri ${t}: teks pil persis DRAF`, (await pg.locator('.ls .dr').allTextContents()).every((x) => x === 'DRAF'));
    cek(`galeri ${t}: tidak ada label "isi belum tersedia" pada pelajaran berisi`, (await pg.locator('.ls small').allTextContents()).every((x) => !/belum tersedia/.test(x)));
    const a = l1.locator('.go a');
    cek(`galeri ${t}: tombol bertuliskan Mulai belajar`, /^Mulai belajar/.test(await a.innerText()));
    cek(`galeri ${t}: tombol menuju pelajaran pertama`, (await a.getAttribute('href')) === 'pelajaran.html?id=' + dapat[0].id);
    cek(`galeri ${t}: keterangan Berikutnya memuat judul dan (draf)`, (await l1.locator('.go p').innerText()).includes(dapat[0].judul) && (await l1.locator('.go p').innerText()).includes('(draf)'));
    cek(`galeri ${t}: tinggi tombol >= 44 px`, (await a.boundingBox()).height >= 44);
    cek(`galeri ${t}: level segera tanpa tombol lanjut`, (await pg.locator('.card.soon .go').count()) === 0);
    cek(`galeri ${t}: catatan tidak lagi menyatakan semua isi belum tersedia`, !/Isi pelajaran belum tersedia/.test(await pg.locator('.note').innerText()));
    await a.focus(); cek(`galeri ${t}: tombol bisa difokus dengan keyboard`, await a.evaluate((e) => document.activeElement === e));
    cek(`galeri ${t}: tanpa scroll horizontal`, !(await geser(pg)));
    cek(`galeri ${t}: tanpa galat konsol`, galat.length === 0);
    await pg.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/galeri-${w}.png` : undefined, fullPage: true }).catch(() => {});
    await c.close();
  }
  /* galeri, sebagian selesai: tombol berubah menjadi Lanjutkan dan melompati yang selesai */
  {
    const done = { [dapat[0].id]: '2026-11-21T10:00:00.000Z', [dapat[1].id]: '2026-11-21T11:00:00.000Z' };
    const { c, pg, galat } = await konteks(w, { done });
    await pg.goto(base + '/belajar/'); await pg.waitForSelector('.card .go a');
    const a = pg.locator('.card').first().locator('.go a');
    cek(`galeri ${t}: sebagian selesai, tombol Lanjutkan belajar`, /^Lanjutkan belajar/.test(await a.innerText()));
    cek(`galeri ${t}: melompati yang selesai ke ${dapat[2].id}`, (await a.getAttribute('href')) === 'pelajaran.html?id=' + dapat[2].id);
    cek(`galeri ${t}: tanpa galat konsol (sebagian selesai)`, galat.length === 0);
    await c.close();
  }
  /* galeri, semua selesai */
  {
    const done = {}; dapat.forEach((p, i) => { done[p.id] = '2026-11-21T1' + (i % 10) + ':00:00.000Z'; });
    const { c, pg } = await konteks(w, { done });
    await pg.goto(base + '/belajar/'); await pg.waitForSelector('.card .go');
    const go = pg.locator('.card').first().locator('.go');
    cek(`galeri ${t}: semua selesai, tanpa tautan dan ada pesan`, (await go.locator('a').count()) === 0 && /sudah selesai/.test(await go.innerText()));
    await c.close();
  }
  /* pelajaran: tautan Lanjut muncul hanya sesudah selesai, tidak berpindah sendiri */
  {
    const { c, pg, galat } = await konteks(w);
    await pg.goto(base + `/belajar/pelajaran.html?id=${dapat[0].id}`); await pg.waitForSelector('.acts');
    const go = pg.locator('.acts .go');
    cek(`pelajaran ${t}: sebelum selesai tautan Lanjut tersembunyi`, !(await go.isVisible()));
    await pg.locator('.acts .btn.main').first().click();
    await pg.waitForTimeout(400);
    cek(`pelajaran ${t}: setelah selesai tautan Lanjut tampil`, await go.isVisible());
    cek(`pelajaran ${t}: tautan menuju ${dapat[1].id}`, (await go.getAttribute('href')) === 'pelajaran.html?id=' + dapat[1].id);
    cek(`pelajaran ${t}: teks tautan memuat judul dan (draf)`, (await go.innerText()).includes(dapat[1].judul) && (await go.innerText()).includes('(draf)'));
    cek(`pelajaran ${t}: halaman tidak berpindah sendiri`, pg.url().includes(`id=${dapat[0].id}`));
    cek(`pelajaran ${t}: pengumuman status menyebut pelajaran berikutnya`, (await pg.locator('.live').innerText()).includes(dapat[1].judul));
    cek(`pelajaran ${t}: tinggi tautan >= 44 px`, (await go.boundingBox()).height >= 44);
    cek(`pelajaran ${t}: tanpa scroll horizontal`, !(await geser(pg)));
    await go.click(); await pg.waitForURL(/pelajaran\.html\?id=/); await pg.waitForSelector('.acts');
    cek(`pelajaran ${t}: mengeklik tautan membuka pelajaran berikutnya`, pg.url().includes(`id=${dapat[1].id}`));
    await pg.goto(base + `/belajar/pelajaran.html?id=${dapat[0].id}`); await pg.waitForSelector('.acts');
    cek(`pelajaran ${t}: dimuat ulang saat sudah selesai, tautan langsung tampil`, await pg.locator('.acts .go').isVisible());
    await pg.locator('.acts .btn.main').first().click(); await pg.waitForTimeout(200);
    cek(`pelajaran ${t}: membatalkan penanda menyembunyikan tautan`, !(await pg.locator('.acts .go').isVisible()));
    cek(`pelajaran ${t}: tanpa galat konsol`, galat.length === 0);
    await c.close();
  }
  /* pelajaran terakhir yang tersisa: pesan, bukan tautan */
  {
    const done = {}; dapat.slice(1).forEach((p, i) => { done[p.id] = '2026-11-21T1' + (i % 10) + ':00:00.000Z'; });
    const { c, pg } = await konteks(w, { done });
    await pg.goto(base + `/belajar/pelajaran.html?id=${dapat[0].id}`); await pg.waitForSelector('.acts');
    await pg.locator('.acts .btn.main').first().click(); await pg.waitForTimeout(200);
    cek(`pelajaran ${t}: pelajaran terakhir, tanpa tautan Lanjut`, !(await pg.locator('.acts .go').isVisible()));
    cek(`pelajaran ${t}: pelajaran terakhir, pengumuman semua selesai`, /Semua pelajaran/.test(await pg.locator('.live').innerText()));
    await c.close();
  }
}

/* data jahat dan rusak (390 px) */
{
  const jahat = JSON.parse(JSON.stringify(kursus));
  jahat.level[0].modul[0].pelajaran[1].judul = '<img src=x onerror="window.__xss=1">Judul jahat';
  jahat.level[0].modul[0].pelajaran[1].jenis = '<b>Konsep</b>';
  const body = JSON.stringify(jahat);
  const { c, pg } = await konteks(390, { kursusBody: body, done: { [dapat[0].id]: '2026-11-21T10:00:00.000Z' } });
  await pg.goto(base + '/belajar/'); await pg.waitForSelector('.card .go a');
  cek('judul jahat di galeri tampil sebagai teks (tidak ada <img> di tombol/keterangan)', (await pg.locator('.go img, .go b').count()) === 0 && (await pg.locator('.go p').innerText()).includes('<img'));
  cek('judul jahat tidak menjalankan skrip', (await pg.evaluate(() => window.__xss)) === undefined);
  await pg.goto(base + `/belajar/pelajaran.html?id=${dapat[0].id}`); await pg.waitForSelector('.acts .go');
  cek('judul jahat di tautan Lanjut tampil sebagai teks', (await pg.locator('.acts .go img').count()) === 0 && (await pg.locator('.acts .go').innerText()).includes('<img'));
  cek('judul jahat di tautan Lanjut tidak menjalankan skrip', (await pg.evaluate(() => window.__xss)) === undefined);
  await c.close();
}
{
  /* level segera yang sudah punya pelajaran berisi (Paket G): tidak ada tombol lanjut dan tidak ada pesan "semua selesai" yang salah */
  const segera = JSON.parse(JSON.stringify(kursus));
  segera.level[1].modul = [{ id: 'l2-m1', judul: 'Modul uji', pelajaran: [{ id: 'l2-m1-p1', judul: 'Pelajaran uji level segera', jenis: 'Konsep', xp: 10, isi: 'draf' }] }];
  const { c, pg, galat } = await konteks(390, { kursusBody: JSON.stringify(segera) });
  await pg.goto(base + '/belajar/'); await pg.waitForSelector('.card .go');
  cek('level segera berpelajaran: kartu tampil tanpa blok lanjut', (await pg.locator('.card.soon .go').count()) === 0 && (await pg.locator('.card.soon').count()) >= 1);
  cek('level segera berpelajaran: level gratis tetap punya tombol', (await pg.locator('.card:not(.soon) .go a').count()) === 1);
  cek('level segera berpelajaran: tanpa galat konsol', galat.length === 0);
  await c.close();
}
for (const [nama, body] of [['kursus.json rusak', '{bukan json'], ['level bukan array', JSON.stringify({ level: 'x' })], ['pelajaran tanpa id', JSON.stringify({ level: [{ id: 'l1', nomor: 1, judul: 'x', ringkasan: 'y', status: 'gratis', tag: [], modul: [{ id: 'm', judul: 'm', pelajaran: [{ judul: 'p', jenis: 'Konsep', xp: 1, isi: 'draf' }] }] }] })]]) {
  const { c, pg } = await konteks(390, { kursusBody: body });
  await pg.goto(base + '/belajar/'); await pg.waitForTimeout(600);
  cek(`galeri dengan ${nama}: halaman tetap hidup (ada pesan atau kartu, tidak kosong)`, (await pg.locator('#grid').innerText()).trim().length > 0);
  await c.close();
}

await browser.close(); server.close();
console.log(`\n${jumlah - gagal} dari ${jumlah} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
