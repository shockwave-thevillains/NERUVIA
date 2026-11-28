#!/usr/bin/env node
/* Menyusun kartu pratinjau tautan (Open Graph) 1200x630 dari aset merek yang sudah ada: logo NV, Neru
   (pose miring, yang dipakai di bagian gelap), font lokal, dan judul yang sudah tampil di beranda.
   Tidak membuat gambar baru dengan AI dan tidak memuat apa pun dari jaringan.

   Pakai:  node tools/buat-og.mjs [--keluar=BERKAS.jpg]     (bawaan: assets/brand/neruvia-og-1200x630.jpg)
   Kode keluar: 0 berhasil; 1 gagal; 2 Playwright tidak ada.
   Hasil dapat sedikit berbeda byte antar versi Chromium, jadi berkas hasilnya disimpan di repo. */
import { readFileSync, writeFileSync, lstatSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
if (arg.some((a) => !/^--keluar=.+\.jpg$/.test(a)) || arg.length > 1) { console.error('Pakai: node tools/buat-og.mjs [--keluar=BERKAS.jpg]'); process.exit(1); }
const keluar = arg.length ? resolve(arg[0].slice(9)) : join(ROOT, 'assets/brand/neruvia-og-1200x630.jpg');
let tujuan = null;
try { tujuan = lstatSync(keluar); } catch { /* belum ada */ }
/* lstat, bukan existsSync: tautan simbolik yang putus pun tidak boleh diikuti saat menulis */
if (tujuan && !tujuan.isFile()) { console.error('tujuan bukan berkas biasa'); process.exit(1); }

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright tidak tersedia'); process.exit(2); }

const bacaAset = (f) => { try { return readFileSync(join(ROOT, f)); } catch { console.error('aset tidak terbaca: ' + f); process.exit(1); } };
const data = (f, mime) => `data:${mime};base64,${bacaAset(f).toString('base64')}`;
/* logo NV diambil dari beranda supaya bentuknya sama persis */
const beranda = bacaAset('index.html').toString('utf8');
const mark = /<svg class="mk" viewBox="([\d. ]+)"[^>]*><path d="([MLZmlz\d.,\s-]+)"/.exec(beranda);
if (!mark) { console.error('logo NV tidak ditemukan di index.html'); process.exit(1); }

const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><style>
@font-face{font-family:SG;font-weight:300 700;src:url(${data('assets/fonts/SpaceGrotesk-latin.woff2', 'font/woff2')}) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden;background:#080808;color:#F2F2F0;font-family:SG,sans-serif;-webkit-font-smoothing:antialiased}
.merek{position:absolute;left:80px;top:72px;display:flex;align-items:center;gap:18px;font-weight:700;font-size:34px;letter-spacing:.06em}
.merek svg{width:76px;height:40px;color:#38E1FF}
h1{position:absolute;left:80px;top:190px;width:590px;font-weight:700;font-size:68px;line-height:1.06;letter-spacing:-.028em}
.garis{position:absolute;left:80px;bottom:78px;width:132px;height:8px;background:#38E1FF}
img{position:absolute;right:40px;bottom:20px;height:574px}
</style></head><body>
<div class="merek"><svg viewBox="${mark[1]}"><path d="${mark[2]}" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round" fill-rule="evenodd"/></svg><span>NERUVIA</span></div>
<h1>Belajar AI dari nol, tanpa harus jago teknologi.</h1>
<div class="garis"></div>
<img src="${data('assets/neru-wave.webp', 'image/webp')}" alt="">
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const keluarJaringan = [];
  await page.route('**/*', (r) => { if (r.request().url().startsWith('data:')) return r.continue(); keluarJaringan.push(r.request().url()); return r.abort(); });
  await page.setContent(html, { waitUntil: 'load' });
  const siap = await page.evaluate(async () => {
    await document.fonts.load('700 68px SG'); await document.fonts.ready;
    const img = document.querySelector('img'); await img.decode();
    const h = document.querySelector('h1').getBoundingClientRect(), n = img.getBoundingClientRect(), g = document.querySelector('.garis').getBoundingClientRect();
    return { font: document.fonts.check('700 68px SG'), lebarImg: img.naturalWidth, tumpang: h.right > n.left || h.bottom > g.top, muat: h.bottom <= 630 && h.right <= 1200 };
  });
  if (!siap.font || !siap.lebarImg || siap.tumpang || !siap.muat || keluarJaringan.length) throw new Error('tata letak atau aset tidak siap: ' + JSON.stringify({ ...siap, keluarJaringan }));
  const buf = await page.screenshot({ type: 'jpeg', quality: 86 });
  writeFileSync(keluar, buf);
  console.log(`Ditulis ${keluar} (1200x630, ${(buf.length / 1024).toFixed(1)} KB)`);
} catch (e) { console.error('GALAT: ' + e.message); process.exitCode = 1; } finally { await browser.close(); }
