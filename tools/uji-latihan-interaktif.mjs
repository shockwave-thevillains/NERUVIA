#!/usr/bin/env node
/* Uji latihan interaktif "prompt jelek vs prompt bagus" (kegiatan C3), pelajaran l1-m1-p3.
   Pakai: node tools/uji-latihan-interaktif.mjs [--cepat]
   Keluar 0 bila lulus, 1 bila ada yang gagal, 2 bila Playwright tidak ada (bagian browser dilewati; bagian validator tetap jalan).
   --cepat hanya menjalankan uji validator dan struktur data (tanpa browser).
   Isi: (A) data p3 dan validator (kasus negatif pada salinan sementara), (B) browser pada 390/768/1440 px:
   tampilan, keyboard (Tab, Enter, Spasi), nama aksesibel, skor, ulangi, tanpa jaringan dan tanpa tulis localStorage,
   (C) masukan jahat dan rusak lewat page.route: payload HTML/skrip tetap jadi teks, data rusak membuat latihan
   tidak dipasang tanpa merusak pelajaran, (D) reduced-motion dan CLS. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CEPAT = process.argv.includes('--cepat');
let lulus = 0, gagal = 0;
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log('  GAGAL: ' + ket); } };
const asli = JSON.parse(readFileSync(join(ROOT, 'content/pelajaran/l1-m1-p3.json'), 'utf8'));

/* ---------- A. data dan validator ---------- */
const X = asli.interaktif;
cek(!!X && Array.isArray(X.pasangan) && X.pasangan.length >= 5, 'p3 punya interaktif dengan minimal 5 pasangan');
cek(X.pasangan.every((q) => q.skenario && q.a && q.b && q.alasan && ['a', 'b'].includes(q.benar) && Array.isArray(q.unsur)), 'tiap pasangan lengkap');
cek(X.pasangan.filter((q) => q.benar === 'a').length >= 2 && X.pasangan.filter((q) => q.benar === 'b').length >= 2, 'jawaban benar tersebar di A dan B (minimal 2 masing-masing)');
cek(X.pasangan.every((q) => /fiktif/i.test(q.skenario)), 'tiap skenario berlabel fiktif');
cek(!/\b(video|tonton)\b/i.test(JSON.stringify(asli)), 'isi tanpa kata video');
cek(X.pasangan.some((q) => q.a.length > q.b.length) && X.pasangan.some((q) => q.b.length > q.a.length), 'panjang prompt bukan petunjuk jawaban (ada yang benar lebih pendek dan lebih panjang)');
cek(X.pasangan.filter((q) => (q.benar === 'a' ? q.a : q.b).length < (q.benar === 'a' ? q.b : q.a).length).length >= 2, 'minimal dua pasangan: jawaban benar justru yang lebih pendek');

const tmp = mkdtempSync(join(tmpdir(), 'inter-'));
cpSync(join(ROOT, 'tools'), join(tmp, 'tools'), { recursive: true });
cpSync(join(ROOT, 'content'), join(tmp, 'content'), { recursive: true });
const f3 = join(tmp, 'content/pelajaran/l1-m1-p3.json');
function validator(ubah) {
  const o = structuredClone(asli); ubah(o);
  writeFileSync(f3, typeof o === 'string' ? o : JSON.stringify(o));
  return spawnSync(process.execPath, [join(tmp, 'tools/validasi-kursus.mjs')], { encoding: 'utf8' });
}
let r = validator(() => {});
cek(r.status === 0, 'validator: berkas asli lulus');
const negatif = [
  ['kurang dari 5 pasangan', (o) => { o.interaktif.pasangan = o.interaktif.pasangan.slice(0, 4); }, /5–12 pasangan/],
  ['lebih dari 12 pasangan', (o) => { while (o.interaktif.pasangan.length < 13) o.interaktif.pasangan.push(o.interaktif.pasangan[0]); }, /5–12 pasangan/],
  ['benar bukan a atau b', (o) => { o.interaktif.pasangan[0].benar = 'c'; }, /benar harus/],
  ['benar berupa angka', (o) => { o.interaktif.pasangan[0].benar = 1; }, /benar harus/],
  ['semua benar di sisi a', (o) => { o.interaktif.pasangan.forEach((q) => { q.benar = 'a'; }); }, /sisi yang sama/],
  ['prompt a dan b sama', (o) => { o.interaktif.pasangan[1].b = o.interaktif.pasangan[1].a; }, /a dan b sama/],
  ['alasan kosong', (o) => { o.interaktif.pasangan[2].alasan = '  '; }, /alasan kosong/],
  ['skenario tanpa label fiktif', (o) => { o.interaktif.pasangan[0].skenario = 'Rani ingin menulis pesan.'; }, /berlabel "fiktif"/],
  ['prompt lebih dari 900 huruf', (o) => { o.interaktif.pasangan[0].a = 'x'.repeat(901); }, /\.a kosong atau lebih dari 900/],
  ['unsur berupa teks, bukan daftar', (o) => { o.interaktif.pasangan[0].unsur = 'tugas'; }, /unsur harus daftar/],
  ['unsur berisi angka', (o) => { o.interaktif.pasangan[0].unsur = [1]; }, /unsur harus daftar/],
  ['interaktif berupa daftar', (o) => { o.interaktif = []; }, /harus objek/],
  ['pasangan berisi null', (o) => { o.interaktif.pasangan[3] = null; }, /harus objek/],
  ['judul kosong', (o) => { o.interaktif.judul = ''; }, /judul kosong/],
  ['kata video di pasangan', (o) => { o.interaktif.pasangan[4].alasan = 'Tonton video ini dulu.'; }, /video/],
];
for (const [nama, ubah, pola] of negatif) {
  r = validator(ubah);
  cek(r.status === 1 && pola.test(r.stderr), `validator menolak: ${nama} (kode ${r.status}; ${(r.stderr || '').split('\n')[1] || ''})`);
}
rmSync(tmp, { recursive: true, force: true });

/* ---------- B–D. browser ---------- */
let chromium;
if (CEPAT) console.log('--cepat: bagian browser dilewati');
else { try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.log('Playwright tidak tersedia: bagian browser dilewati'); } }

if (chromium) {
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };
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

  async function buka(w, o = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : w < 1000 ? 1024 : 900 }, deviceScaleFactor: 1, reducedMotion: o.gerak ? 'no-preference' : 'reduce' });
    const page = await ctx.newPage();
    const galat = [], minta = [];
    page.on('pageerror', (e) => galat.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') galat.push('konsol: ' + m.text()); });
    page.on('request', (q) => minta.push(new URL(q.url()).pathname));
    await page.addInitScript(() => {
      window.__xss = 0; window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    if (o.isi) await page.route('**/content/pelajaran/l1-m1-p3.json', (rt) => rt.fulfill({ status: 200, contentType: 'application/json', body: typeof o.isi === 'string' ? o.isi : JSON.stringify(o.isi) }));
    await page.goto(base + '/belajar/pelajaran.html?id=' + (o.id || 'l1-m1-p3'), { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('.nav2', { timeout: 10000 });
    return { ctx, page, galat, minta };
  }
  const n = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
  const teks = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel);
  const pasangan = X.pasangan;
  const BENAR_IDX = pasangan.map((q) => (q.benar === 'a' ? 0 : 1));

  /* B1. tampilan pada tiga lebar */
  for (const w of [390, 768, 1440]) {
    const { ctx, page, galat } = await buka(w);
    cek(await n(page, '.lat') === 1, `${w}px: tepat satu latihan interaktif`);
    cek(await n(page, '.lat fieldset.pq') === pasangan.length && await n(page, '.lat button.popt') === pasangan.length * 2, `${w}px: ${pasangan.length} situasi dan ${pasangan.length * 2} tombol prompt`);
    cek(/Draf/.test(await teks(page, '.lat .draft')), `${w}px: penanda Draf pada latihan`);
    const g = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.lat .pair')][0].querySelectorAll('button');
      const r0 = b[0].getBoundingClientRect(), r1 = b[1].getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, sejajar: Math.abs(r0.top - r1.top) < 4, kecil: [...document.querySelectorAll('.lat button')].filter((x) => !x.hidden).some((x) => { const r = x.getBoundingClientRect(); return r.height < 44; }), luarLayar: [...document.querySelectorAll('.lat button')].filter((x) => !x.hidden).some((x) => { const r = x.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }) };
    });
    cek(g.sw <= g.iw, `${w}px: tanpa scroll horizontal (${g.sw} > ${g.iw})`);
    cek(w >= 720 ? g.sejajar : !g.sejajar, `${w}px: dua prompt ${w >= 720 ? 'berdampingan' : 'bertumpuk'}`);
    cek(!g.kecil, `${w}px: semua tombol minimal 44 px tinggi`);
    cek(!g.luarLayar, `${w}px: tombol tidak keluar layar`);
    cek(galat.length === 0, `${w}px: tanpa galat skrip atau konsol (${galat.join('; ')})`);
    await ctx.close();
  }

  /* B2. alur penuh lewat keyboard di 1440 px: jawab benar-salah bergantian */
  {
    const { ctx, page, galat, minta } = await buka(1440);
    const sebelumMinta = minta.length;
    const ls0 = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
    await page.locator('.lat button.popt').first().focus();
    cek(await page.evaluate(() => document.activeElement.className === 'popt'), 'keyboard: tombol prompt bisa difokuskan');
    // situasi 1: jawab benar dengan Enter (Tab untuk pindah ke B bila perlu)
    let benarJumlah = 0;
    for (let i = 0; i < pasangan.length; i++) {
      const tujuan = i % 2 === 0 ? BENAR_IDX[i] : 1 - BENAR_IDX[i]; // genap benar, ganjil sengaja salah
      const btn = page.locator('.lat fieldset.pq').nth(i).locator('button.popt').nth(tujuan);
      await btn.focus();
      await page.keyboard.press(i % 2 === 0 ? 'Enter' : 'Space');
      if (tujuan === BENAR_IDX[i]) benarJumlah++;
      const s = await page.evaluate((k) => {
        const fs = document.querySelectorAll('.lat fieldset.pq')[k], b = fs.querySelectorAll('button.popt');
        return { dis: [...b].map((x) => x.getAttribute('aria-disabled')), asli: [...b].map((x) => x.disabled), cls: [...b].map((x) => x.className), pressed: [...b].map((x) => x.getAttribute('aria-pressed')), fb: fs.querySelector('.fb').textContent, aktif: document.activeElement === b[0] || document.activeElement === b[1], vd: [...b].map((x) => (x.querySelector('.vd') || {}).textContent || '') };
      }, i);
      cek(s.dis.every((x) => x === 'true') && s.asli.every((x) => x === false), `situasi ${i + 1}: kedua tombol aria-disabled (bukan disabled)`);
      cek(s.aktif, `situasi ${i + 1}: fokus tetap pada tombol setelah dijawab`);
      cek((tujuan === BENAR_IDX[i] ? /^Benar\./ : /^Belum tepat\./).test(s.fb) && s.fb.includes(pasangan[i].alasan), `situasi ${i + 1}: umpan balik ${tujuan === BENAR_IDX[i] ? 'Benar' : 'Belum tepat'} dengan alasan`);
      cek(s.cls[BENAR_IDX[i]].includes('ok') && s.vd[BENAR_IDX[i]] === 'Lebih sesuai', `situasi ${i + 1}: prompt benar ditandai (warna dan teks)`);
      if (tujuan !== BENAR_IDX[i]) cek(s.cls[tujuan].includes('no') && /kurang sesuai/.test(s.vd[tujuan]), `situasi ${i + 1}: pilihan salah ditandai (warna dan teks)`);
      cek(s.pressed[tujuan] === 'true' && s.pressed[1 - tujuan] === 'false', `situasi ${i + 1}: aria-pressed hanya pada pilihan`);
      const skor = await teks(page, '.lat .score');
      if (i < pasangan.length - 1) cek(skor === `Dijawab ${i + 1} dari ${pasangan.length}`, `situasi ${i + 1}: status "${skor}"`);
    }
    const skorAkhir = await teks(page, '.lat .score');
    cek(skorAkhir.startsWith(`Skor: ${benarJumlah} dari ${pasangan.length}.`), `skor akhir benar (${skorAkhir})`);
    cek(await page.evaluate(() => !document.querySelector('.lat .latact button').hidden), 'tombol Ulangi muncul setelah semua dijawab');
    // klik ganda pada situasi yang sudah dijawab tidak mengubah skor
    await page.locator('.lat fieldset.pq').nth(0).locator('button.popt').nth(1 - BENAR_IDX[0]).click({ force: true });
    await page.locator('.lat fieldset.pq').nth(0).locator('button.popt').nth(BENAR_IDX[0]).click({ force: true });
    cek(await teks(page, '.lat .score') === skorAkhir, 'klik ulang pada situasi yang sudah dijawab tidak mengubah skor');
    cek(await n(page, '.lat fieldset.pq:first-of-type .vd') === 1, 'klik ulang tidak menambah penanda (hanya satu "Lebih sesuai" pada situasi 1)');
    // aksesibilitas
    cek(await page.getByRole('button', { name: /^PROMPT A/ }).count() === pasangan.length && await page.getByRole('button', { name: /^PROMPT B/ }).count() === pasangan.length, 'nama aksesibel tombol dimulai PROMPT A atau PROMPT B');
    cek(await page.evaluate(() => [...document.querySelectorAll('.lat fieldset.pq')].every((f) => f.querySelector('legend') && /^\d+\. /.test(f.querySelector('legend').textContent))), 'tiap situasi punya legend bernomor');
    cek(await page.evaluate(() => [...document.querySelectorAll('.lat .fb, .lat .score')].every((e) => e.getAttribute('role') === 'status' && e.getAttribute('aria-live') === 'polite')), 'umpan balik dan skor adalah wilayah status (aria-live)');
    cek(await page.evaluate(() => document.querySelector('.lat').getAttribute('aria-labelledby') === document.querySelector('.lat h2').id), 'latihan diberi nama lewat aria-labelledby ke judulnya');
    // ulangi
    await page.locator('.lat .latact button').focus();
    await page.keyboard.press('Enter');
    const u = await page.evaluate(() => ({ ok: document.querySelectorAll('.lat .ok, .lat .no, .lat .vd').length, dis: document.querySelectorAll('.lat [aria-disabled]').length, fb: [...document.querySelectorAll('.lat .fb')].every((e) => e.textContent === ''), skor: document.querySelector('.lat .score').textContent, sembunyi: document.querySelector('.lat .latact button').hidden, fokus: document.activeElement === document.querySelector('.lat button.popt'), done: document.querySelectorAll('.lat [data-done]').length, pressed: [...document.querySelectorAll('.lat button.popt')].every((b) => b.getAttribute('aria-pressed') === 'false') }));
    cek(u.ok === 0 && u.dis === 0 && u.fb && u.skor === '' && u.sembunyi && u.fokus && u.done === 0 && u.pressed, `Ulangi mengembalikan keadaan awal dan memindahkan fokus ke prompt pertama (${JSON.stringify(u)})`);
    // putaran kedua: jawab semua benar lewat klik mouse dan cek skor penuh
    for (let i = 0; i < pasangan.length; i++) await page.locator('.lat fieldset.pq').nth(i).locator('button.popt').nth(BENAR_IDX[i]).click();
    cek((await teks(page, '.lat .score')).startsWith(`Skor: ${pasangan.length} dari ${pasangan.length}. Semua tepat`), 'putaran kedua semua benar: "Semua tepat"');
    // tidak ada jaringan baru dan tidak menulis localStorage
    cek(minta.length === sebelumMinta, `latihan tidak membuat permintaan jaringan (${minta.slice(sebelumMinta).join(',')})`);
    cek(await page.evaluate(() => JSON.stringify(Object.entries(localStorage))) === ls0, 'latihan tidak menulis localStorage (progres tidak berubah)');
    cek(galat.length === 0, `alur penuh tanpa galat (${galat.join('; ')})`);
    await page.screenshot({ path: join(tmpdir(), 'lat-1440.png'), fullPage: false });
    await ctx.close();
  }

  /* B3. skor menengah dan rendah memberi pesan berbeda; fokus tab berurutan */
  {
    const { ctx, page } = await buka(390);
    // jawab semua salah
    for (let i = 0; i < pasangan.length; i++) await page.locator('.lat fieldset.pq').nth(i).locator('button.popt').nth(1 - BENAR_IDX[i]).click();
    const rendah = await teks(page, '.lat .score');
    cek(rendah.startsWith(`Skor: 0 dari ${pasangan.length}.`) && /Baca ulang bagian pelajaran/.test(rendah), `semua salah: pesan skor rendah (${rendah})`);
    await page.locator('.lat .latact button').click();
    // 4 dari 6 benar (dua pertama salah)
    for (let i = 0; i < pasangan.length; i++) await page.locator('.lat fieldset.pq').nth(i).locator('button.popt').nth(i < 2 ? 1 - BENAR_IDX[i] : BENAR_IDX[i]).click();
    const tengah = await teks(page, '.lat .score');
    cek(tengah.startsWith(`Skor: ${pasangan.length - 2} dari ${pasangan.length}.`) && /Sudah baik/.test(tengah), `4 dari 6: pesan "Sudah baik" (${tengah})`);
    await page.screenshot({ path: join(tmpdir(), 'lat-390.png'), fullPage: false });
    await ctx.close();
  }
  {
    const { ctx, page } = await buka(1440);
    await page.locator('.lat button.popt').first().focus();
    const urut = [];
    for (let i = 0; i < 4; i++) { urut.push(await page.evaluate(() => document.activeElement.querySelector('.ptag').textContent)); await page.keyboard.press('Tab'); }
    cek(urut.join('|') === 'PROMPT A|PROMPT B|PROMPT A|PROMPT B', `urutan Tab: A, B, A, B (${urut.join('|')})`);
    await page.locator('.lat button.popt').first().focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    cek(await page.evaluate(() => document.activeElement.querySelector('.ptag').textContent === 'PROMPT A'), 'Shift+Tab kembali ke prompt sebelumnya');
    const ring = await page.evaluate(() => { const b = document.activeElement; const c = getComputedStyle(b); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2; });
    cek(ring, 'fokus keyboard terlihat (outline minimal 2 px)');
    await ctx.close();
  }

  /* C. masukan jahat dan rusak */
  const dasar = () => structuredClone(asli);
  const JAHAT = ['<img src=x onerror="window.__xss=1">', '<script>window.__xss=1</script>', '"><svg onload="window.__xss=1">', '<a href="javascript:window.__xss=1">klik</a>', '<iframe srcdoc="<script>parent.__xss=1</script>"></iframe>', '${window.__xss=1}', '{{constructor.constructor("window.__xss=1")()}}', 'javascript:window.__xss=1', '</div></section><img src=x onerror=window.__xss=1>', '&lt;b&gt;'];
  {
    const o = dasar();
    o.interaktif.judul = JAHAT[0]; o.interaktif.petunjuk = JAHAT[1];
    o.interaktif.pasangan = JAHAT.slice(0, 10).map((j, i) => ({ skenario: 'Situasi ' + j + ' (fiktif)', a: j + '\nbaris dua', b: JAHAT[(i + 3) % 10], benar: i % 2 ? 'a' : 'b', alasan: j, unsur: [j, 'tugas'] }));
    const { ctx, page, galat } = await buka(1440, { isi: o });
    cek(await n(page, '.lat') === 1 && await n(page, '.lat fieldset.pq') === 10, 'payload jahat: latihan tetap dipasang (10 situasi)');
    for (let i = 0; i < 10; i++) await page.locator('.lat fieldset.pq').nth(i).locator('button.popt').nth(i % 2 ? 0 : 1).click();
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => ({ xss: window.__xss, anak: document.querySelectorAll('.lat img, .lat script, .lat svg, .lat iframe, .lat a, .lat b b').length, teks: document.querySelector('.lat').textContent, onattr: [...document.querySelectorAll('.lat *')].some((e) => [...e.attributes].some((a) => /^on/i.test(a.name))), tebal: document.querySelectorAll('.lat .fb b').length }));
    cek(s.xss === 0, 'payload jahat: tidak ada skrip yang berjalan (window.__xss tetap 0)');
    cek(s.anak === 0 && !s.onattr, `payload jahat: tidak ada elemen img/script/svg/iframe/a atau atribut on* di latihan (${s.anak})`);
    cek(s.teks.includes('<img src=x onerror="window.__xss=1">') && s.teks.includes('<script>window.__xss=1</script>') && s.teks.includes('${window.__xss=1}'), 'payload jahat tampil apa adanya sebagai teks');
    cek(s.tebal === 10, 'payload jahat: hanya <b> buatan penampil (10) di umpan balik, bukan dari data');
    cek(galat.length === 0, `payload jahat: tanpa galat skrip (${galat.join('; ')})`);
    await ctx.close();
  }
  {
    // kunci berbahaya: __proto__ dan constructor di objek JSON mentah
    const mentah = JSON.stringify(dasar()).replace('"interaktif":{', '"interaktif":{"__proto__":{"polluted":"ya"},"constructor":{"x":1},');
    const { ctx, page, galat } = await buka(1440, { isi: mentah });
    const s = await page.evaluate(() => ({ cemar: ({}).polluted, lat: document.querySelectorAll('.lat').length }));
    cek(s.cemar === undefined, 'kunci __proto__ di JSON tidak mencemari Object.prototype');
    cek(s.lat === 1 && galat.length === 0, 'kunci __proto__ diabaikan, latihan tetap normal');
    await ctx.close();
  }
  const rusak = [
    ['interaktif berupa teks', (o) => { o.interaktif = 'x'; }],
    ['interaktif berupa daftar', (o) => { o.interaktif = [1, 2]; }],
    ['interaktif null', (o) => { o.interaktif = null; }],
    ['pasangan kosong', (o) => { o.interaktif.pasangan = []; }],
    ['pasangan bukan daftar', (o) => { o.interaktif.pasangan = { a: 1 }; }],
    ['13 pasangan', (o) => { while (o.interaktif.pasangan.length < 13) o.interaktif.pasangan.push(structuredClone(o.interaktif.pasangan[0])); }],
    ['benar = c', (o) => { o.interaktif.pasangan[1].benar = 'c'; }],
    ['benar angka', (o) => { o.interaktif.pasangan[1].benar = 0; }],
    ['benar huruf besar', (o) => { o.interaktif.pasangan[1].benar = 'A'; }],
    ['prompt a angka', (o) => { o.interaktif.pasangan[2].a = 123; }],
    ['prompt b hilang', (o) => { delete o.interaktif.pasangan[2].b; }],
    ['prompt lebih dari 900 huruf', (o) => { o.interaktif.pasangan[3].a = 'x'.repeat(901); }],
    ['unsur bukan daftar', (o) => { o.interaktif.pasangan[3].unsur = 'tugas'; }],
    ['unsur berisi objek', (o) => { o.interaktif.pasangan[3].unsur = [{}]; }],
    ['butir pasangan null', (o) => { o.interaktif.pasangan[4] = null; }],
    ['judul kosong', (o) => { o.interaktif.judul = ''; }],
    ['petunjuk lebih dari 500 huruf', (o) => { o.interaktif.petunjuk = 'p'.repeat(501); }],
  ];
  {
    const { ctx, page, galat } = await buka(1440, { isi: dasar() });
    cek(await n(page, '.lat') === 1, 'kontrol positif: data asli lewat page.route tetap memasang latihan');
    await ctx.close();
    for (const [nama, ubah] of rusak) {
      const o = dasar(); ubah(o);
      const b = await buka(1440, { isi: o });
      const ok = await b.page.evaluate(() => ({ lat: document.querySelectorAll('.lat').length, soal: document.querySelectorAll('.body fieldset.q').length, acts: document.querySelectorAll('.acts').length }));
      cek(ok.lat === 0 && ok.soal === 3 && ok.acts === 1 && b.galat.length === 0, `data rusak (${nama}): latihan tidak dipasang, pelajaran dan tiga soal tetap normal, tanpa galat (lat ${ok.lat}, soal ${ok.soal}, ${b.galat.join('; ')})`);
      await b.ctx.close();
    }
    cek(galat.length === 0, 'kontrol positif tanpa galat');
  }
  {
    // 12 pasangan (batas atas) dan 1 pasangan (batas bawah klien) diterima
    const o12 = dasar(); while (o12.interaktif.pasangan.length < 12) o12.interaktif.pasangan.push(structuredClone(o12.interaktif.pasangan[o12.interaktif.pasangan.length % 6]));
    const b12 = await buka(390, { isi: o12 });
    cek(await n(b12.page, '.lat fieldset.pq') === 12, 'batas atas: 12 pasangan diterima');
    await b12.ctx.close();
    const o1 = dasar(); o1.interaktif.pasangan = o1.interaktif.pasangan.slice(0, 1);
    const b1 = await buka(390, { isi: o1 });
    await b1.page.locator('.lat button.popt').first().click();
    cek((await teks(b1.page, '.lat .score')).startsWith('Skor: ') && /dari 1\./.test(await teks(b1.page, '.lat .score')), 'batas bawah klien: 1 pasangan langsung selesai dengan skor');
    await b1.ctx.close();
  }
  {
    // pelajaran lain tanpa interaktif tidak berubah
    const b = await buka(1440, { id: 'l1-m1-p1' });
    cek(await n(b.page, '.lat') === 0 && await n(b.page, '.body fieldset.q') === 3, 'p1 (tanpa interaktif): tidak ada latihan interaktif, tiga soal normal');
    await b.ctx.close();
    const b2 = await buka(1440, { id: 'l1-m1-p2' });
    cek(await n(b2.page, '.lat') === 0, 'p2 (tanpa interaktif): tidak ada latihan interaktif');
    await b2.ctx.close();
  }

  /* D. reduced-motion dan CLS */
  {
    const { ctx, page } = await buka(390);
    const t = await page.evaluate(() => [...document.querySelectorAll('.lat *')].filter((e) => { const c = getComputedStyle(e); return parseFloat(c.transitionDuration) > 0 || parseFloat(c.animationDuration) > 0; }).length);
    cek(t === 0, `reduced-motion: tidak ada transisi atau animasi di latihan (${t})`);
    await ctx.close();
    const g = await buka(390, { gerak: true });
    const t2 = await g.page.evaluate(() => [...document.querySelectorAll('.lat *')].filter((e) => { const c = getComputedStyle(e); return parseFloat(c.animationDuration) > 0; }).length);
    cek(t2 === 0, 'tanpa preferensi pun latihan tidak punya animasi');
    await g.ctx.close();
  }
  for (const w of [390, 768, 1440]) {
    const { ctx, page } = await buka(w);
    await page.waitForTimeout(900);
    const cls = await page.evaluate(() => window.__cls);
    cek(cls <= 0.01, `CLS p3 ${w}px: ${cls.toFixed(4)} harus <= 0,01`);
    await ctx.close();
  }
  await browser.close();
  server.close();
}

console.log(`\nuji-latihan-interaktif: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : (chromium || CEPAT ? 0 : 2));
