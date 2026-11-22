#!/usr/bin/env node
/* Inventaris aset (B2). Hanya membaca dan mencetak tabel Markdown; tidak mengubah berkas.
   Pakai:  node tools/inventaris-aset.mjs [--dinamis]
   Kolom "dirujuk oleh": pencarian teks nama berkas (atau jalur folder untuk frame yang disusun skrip) di
   HTML, CSS, JS, JSON, dan SVG di luar docs/ dan .git. Rujukan dari docs/ tidak dihitung karena dokumen tidak dimuat halaman.
   --dinamis: buka tiap halaman di Chromium (Playwright) tanpa pembatasan jaringan dan catat berkas aset yang benar-benar diminta. */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEKS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg']);
const HALAMAN = ['index.html', 'belajar/index.html', 'belajar/pelajaran.html', 'terima-kasih.html', 'kebijakan-privasi.html', 'admin/index.html'];

function jalan(dir, keluar = []) {
  for (const n of readdirSync(dir)) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) jalan(p, keluar); else keluar.push(p);
  }
  return keluar;
}
const rel = (p) => relative(ROOT, p).split(sep).join('/');
const semua = jalan(ROOT).map(rel);
const aset = semua.filter((p) => p.startsWith('assets/'));
const sumberTeks = semua.filter((p) => TEKS.has(extname(p)) && !p.startsWith('docs/') && !p.startsWith('tools/') && !p.startsWith('supabase/') && !p.startsWith('content/pelajaran-')).map((p) => [p, readFileSync(join(ROOT, p), 'utf8')]);

/* satu baris per berkas, kecuali frame yang digabung per folder */
const grup = new Map();
for (const p of aset) {
  const m = p.match(/^(assets\/maskot-animasi\/frames(?:-2x|-m)?)\/f\d+\.webp$/);
  const kunci = m ? m[1] + '/f00..f20.webp' : p;
  const g = grup.get(kunci) || { jalur: kunci, byte: 0, n: 0, contoh: p };
  g.byte += statSync(join(ROOT, p)).size; g.n += 1;
  grup.set(kunci, g);
}

function dirujuk(g) {
  const nama = g.contoh.split('/').pop();
  const folder = g.jalur.includes('f00..f20') ? g.jalur.split('/f00')[0].split('/').pop() : null;
  const hasil = new Set();
  for (const [p, isi] of sumberTeks) {
    /* frame disusun skrip: 'assets/maskot-animasi/'+dir+'/f' dengan dir salah satu string 'frames', 'frames-m', 'frames-2x' */
    if (folder) { if (isi.includes('maskot-animasi/') && isi.includes("'" + folder + "'")) hasil.add(p); continue; }
    if (isi.includes(nama)) hasil.add(p);
  }
  return [...hasil];
}

const ignoreTeks = existsSync(join(ROOT, '.vercelignore')) ? readFileSync(join(ROOT, '.vercelignore'), 'utf8').split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('#')) : [];
const kb = (b) => (b / 1024).toFixed(b < 10240 ? 1 : 0);
const baris = [...grup.values()].sort((a, b) => b.byte - a.byte);
const keluar = [];
keluar.push('| Berkas | Berkas (n) | Ukuran (KB) | Dirujuk oleh (HTML/CSS/JS di luar docs) | Di .vercelignore |');
keluar.push('|---|---|---|---|---|');
let tidakDipakai = 0, totalTidak = 0;
for (const g of baris) {
  const r = dirujuk(g);
  const ig = ignoreTeks.includes(g.jalur);
  if (!r.length) { tidakDipakai += g.n; totalTidak += g.byte; }
  keluar.push(`| ${g.jalur} | ${g.n} | ${kb(g.byte)} | ${r.length ? r.join(', ') : '**tidak ada**'} | ${ig ? 'ya' : ''} |`);
}
keluar.push('');
keluar.push(`Total berkas aset: ${aset.length}, ${kb(aset.reduce((a, p) => a + statSync(join(ROOT, p)).size, 0))} KB. Tanpa rujukan: ${tidakDipakai} berkas, ${kb(totalTidak)} KB.`);
console.log(keluar.join('\n'));

if (process.argv.includes('--dinamis')) {
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright tidak tersedia'); process.exit(2); }
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
  console.log('\n## Aset yang benar-benar diminta per halaman (Chromium, desktop 1440, tunggu 6 dtk setelah load)\n');
  console.log('| Halaman | Aset diminta | Total (KB) | Setelah event load? |');
  console.log('|---|---|---|---|');
  for (const h of HALAMAN) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const url = base + '/' + h;
    await page.goto(url, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(6000);
    const r = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { load: nav.loadEventEnd, res: performance.getEntriesByType('resource').map((e) => ({ n: e.name.replace(location.origin, ''), b: e.transferSize || e.encodedBodySize || 0, s: e.startTime })) };
    });
    const as = r.res.filter((e) => e.n.includes('/assets/'));
    const ringkas = new Map();
    for (const e of as) {
      const k = e.n.replace(/\/f\d+\.webp.*/, '/f*.webp');
      const v = ringkas.get(k) || { n: 0, b: 0, telat: 0 };
      v.n++; v.b += e.b; if (e.s > r.load) v.telat++;
      ringkas.set(k, v);
    }
    const daftar = [...ringkas.entries()].map(([k, v]) => `${k.replace(/^\//, '')}${v.n > 1 ? ' x' + v.n : ''}`).join('<br>') || '(tidak ada)';
    const total = as.reduce((a, e) => a + e.b, 0);
    const telat = [...ringkas.values()].reduce((a, v) => a + v.telat, 0);
    console.log(`| ${h} | ${daftar} | ${kb(total)} | ${telat} dari ${as.length} |`);
    await ctx.close();
  }
  await browser.close(); server.close();
}
