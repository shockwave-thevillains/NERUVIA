#!/usr/bin/env node
/* Uji halaman 404 (kegiatan H2). Tidak mengubah berkas repo.
   Pakai:
     node tools/uji-404.mjs            periksa 404.html, uji mandiri pemeriksa, lalu uji browser
     node tools/uji-404.mjs --cepat    tanpa browser (pemeriksaan statis dan uji mandiri)
     node tools/uji-404.mjs --ukur     ukur muat respons 404 (3 putaran x 390/768/1440 px, 1,6 Mbps)
     node tools/uji-404.mjs --ukur --akar=FOLDER   ukur salinan lain (mis. keadaan sebelum ada 404.html)
     FOTO=FOLDER node tools/uji-404.mjs            simpan tangkapan layar
   Kode keluar 0 lulus, 1 gagal, 2 lulus tetapi Playwright tidak ada.

   Server uji meniru hosting: alamat yang tidak ada dijawab status 404 berisi 404.html. Peniruan GitHub Pages
   situs proyek dilakukan lewat route Playwright (tidak ada permintaan jaringan keluar). */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { bangun, sisipMeta } from './buat-vercel-json.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const argAkar = process.argv.find((a) => a.startsWith('--akar='));
const AKAR = argAkar ? resolve(argAkar.slice(7)) : REPO;
const CEPAT = process.argv.includes('--cepat');
const UKUR = process.argv.includes('--ukur');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let lulus = 0, gagal = 0;
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log('  GAGAL: ' + ket); } };

/* ---------- pemeriksa statis ---------- */
const sha = (s) => "'sha256-" + createHash('sha256').update(s.replace(/\r\n/g, '\n'), 'utf8').digest('base64') + "'";
export function periksa(akar) {
  const v = new Map();
  const lapor = (kode, pesan) => { if (!v.has(kode)) v.set(kode, pesan); };
  const berkas = join(akar, '404.html');
  if (!existsSync(berkas)) return new Map([['M_ADA', '404.html tidak ada di akar']]);
  const html = readFileSync(berkas, 'utf8');
  const tanpaK = html.replace(/<!--[\s\S]*?-->/g, '');
  const skrip = [...tanpaK.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const gaya = [...tanpaK.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const markup = tanpaK.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.replace(/>[\s\S]*</, '><')).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const js = skrip.map((m) => m[2]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

  if (!/<html\b[^>]*\blang="id"/i.test(markup)) lapor('M_LANG', 'html tanpa lang="id"');
  if (!/<title>[^<]*tidak ditemukan[^<]*<\/title>/i.test(markup)) lapor('M_JUDUL', 'judul harus menyebut halaman tidak ditemukan');
  if (!/<meta name="robots" content="[^"]*noindex[^"]*">/i.test(markup)) lapor('M_NOINDEX', 'tanpa meta robots noindex');
  if ((markup.match(/<h1\b/gi) || []).length !== 1) lapor('M_H1', 'harus tepat satu h1');
  if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(markup) || /\blocation\s*(?:=(?!=)|\.\s*(?:assign|replace|reload)\b|\.\s*href\s*=(?!=))/.test(js)) lapor('M_ALIH', 'halaman 404 tidak boleh mengalihkan sendiri');
  try {
    const { isi } = sisipMeta(html, '');
    if (!/default-src 'none'/.test(isi) || /unsafe-|\*|\bdata:|\bhttp:|https:\/\//.test(isi)) lapor('M_CSP', 'meta CSP kosong atau longgar: ' + isi.slice(0, 80));
    for (const m of skrip) if (!/\bsrc\s*=/.test(m[1]) && !isi.includes(sha(m[2]))) lapor('M_CSP_BASI', 'hash skrip tidak ada di meta CSP');
    for (const g of gaya) if (!isi.includes(sha(g))) lapor('M_CSP_BASI', 'hash gaya tidak ada di meta CSP');
  } catch (e) { lapor('M_CSP', e.message); }

  const rujukan = [];
  for (const m of markup.matchAll(/<([a-zA-Z][\w-]*)\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const [, tag, attr] = m, t = tag.toLowerCase();
    if (/(?:^|[\s"'/])on[a-z]+\s*=/i.test(attr)) lapor('M_ON', `atribut on* pada <${t}>`);
    if (t === 'base') lapor('M_RELATIF', 'elemen <base> tidak dipakai');
    for (const a of attr.matchAll(/(?:^|\s)(href|src|srcset|poster|action)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
      const nama = a[1].toLowerCase(), nilai = a[2] ?? a[3] ?? a[4] ?? '';
      const daftar = nama === 'srcset' ? nilai.split(',').map((x) => x.trim().split(/\s+/)[0]) : [nilai.trim()];
      for (const u of daftar) rujukan.push({ u, tag: t });
    }
    if (t === 'img') {
      if (!/\balt\s*=\s*"[^"]+"/.test(attr)) lapor('M_ALT', 'gambar tanpa teks alternatif');
      if (!/\bwidth="[1-9]\d*"/.test(attr) || !/\bheight="[1-9]\d*"/.test(attr)) lapor('M_UKURAN', 'gambar tanpa width/height');
    }
  }
  for (const g of gaya) for (const m of g.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) rujukan.push({ u: m[1] ?? m[2] ?? m[3] ?? '', tag: 'css' });
  for (const { u, tag } of rujukan) {
    if (u.startsWith('#') && u.length > 1) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('//')) { lapor('M_LUAR', `<${tag}> merujuk ke luar: ${u.slice(0, 60)}`); continue; }
    if (!u.startsWith('/')) { lapor('M_RELATIF', `<${tag}> rujukan relatif: ${JSON.stringify(u.slice(0, 60))}`); continue; }
    const [jalur, jangkar] = u.split('#');
    let f; try { f = normalize(join(akar, decodeURIComponent(jalur.split('?')[0]))); } catch { lapor('M_PUTUS', 'rujukan tidak terbaca: ' + u.slice(0, 60)); continue; }
    if (f !== normalize(akar + sep) && !f.startsWith(akar + sep)) { lapor('M_PUTUS', 'rujukan keluar akar: ' + u.slice(0, 60)); continue; }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { lapor('M_PUTUS', 'rujukan putus: ' + u.slice(0, 60)); continue; }
    if (jangkar !== undefined && f.endsWith('.html')) {
      const tujuan = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      if (!jangkar || !tujuan.includes(`id="${jangkar}"`)) lapor('M_JANGKAR', `jangkar #${jangkar} tidak ada di tujuan`);
    }
  }
  if (!rujukan.some((r) => r.tag === 'a' && r.u === '/')) lapor('M_BERANDA', 'tidak ada tautan ke beranda');
  /* alamat yang diminta tidak boleh dipantulkan ke halaman (pemalsuan teks lewat tautan buatan orang lain) */
  if (/\b(?:innerHTML|outerHTML|innerText|textContent|insertAdjacent\w*|createTextNode|createElement|eval)\b|document\s*\.\s*(?:write|URL|referrer|title)|location\s*\.\s*(?:search|hash|href)\b/.test(js)) lapor('M_PANTUL', 'skrip membaca alamat lengkap atau menulis teks ke halaman');
  const teks = markup.replace(/<[^>]+>/g, ' ') + ' ' + [...markup.matchAll(/(?:alt|aria-label|content)="([^"]*)"/g)].map((m) => m[1]).filter((x) => !x.startsWith('default-src')).join(' ');
  const klaim = /\b(gratis|sertifikat|harga|ChatGPT|Gemini|Claude|Copilot)\b/i.exec(teks);
  if (klaim) lapor('M_KLAIM', 'klaim yang belum dikonfirmasi: ' + klaim[1]);
  if (gaya.some((g) => /(?:^|[;{\s])(?:transition|animation)\s*:/.test(g)) && !gaya.some((g) => /prefers-reduced-motion\s*:\s*reduce/.test(g))) lapor('M_GERAK', 'ada transisi/animasi tanpa aturan kurangi gerak');
  return v;
}

/* ---------- uji mandiri pemeriksa ---------- */
function ujiMandiri() {
  const dir = mkdtempSync(join(tmpdir(), 'uji404-'));
  const asli = readFileSync(join(REPO, '404.html'), 'utf8');
  for (const f of ['index.html', 'kebijakan-privasi.html']) cpSync(join(REPO, f), join(dir, f));
  cpSync(join(REPO, 'assets'), join(dir, 'assets'), { recursive: true });
  /* Hash dihitung ulang setelah mutasi (kecuali kasus CSP) supaya tiap kasus hanya memicu kodenya sendiri. */
  const segarkan = (h) => {
    const t = h.replace(/<!--[\s\S]*?-->/g, '');
    const s = [...t.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => sha(m[1])).join(' ');
    const g = [...t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => sha(m[1])).join(' ');
    return h.replace(/(http-equiv="Content-Security-Policy" content=")[^"]*"/, `$1default-src 'none'; script-src 'self' ${s}; style-src 'self' ${g}"`);
  };
  const ganti = (a, b) => (h) => { if (!h.includes(a)) throw new Error('fixture tidak memuat: ' + a); return h.replace(a, () => b); };
  let n = 0;
  const kasus = (nama, ubah, harap, opsi = {}) => {
    let h = ubah(asli); if (!opsi.mentah) h = segarkan(h);
    writeFileSync(join(dir, '404.html'), h);
    const v = periksa(dir); n++;
    if (harap === null) cek(v.size === 0, `uji mandiri "${nama}" harus bersih, ternyata ${[...v.keys()]}`);
    else cek(v.has(harap), `uji mandiri "${nama}" harus ${harap}, ternyata ${[...v.keys()]}`);
  };
  kasus('halaman asli bersih', (h) => h, null);
  kasus('komentar berisi rujukan relatif diabaikan', ganti('<body>', '<body><!-- <a href="x.html" onclick="y">gratis</a> -->'), null);
  kasus('jangkar di halaman yang sama diizinkan', ganti('<main>', '<a href="#isi">lompat</a><main id="isi">'), null);
  kasus('tautan relatif', ganti('href="/kebijakan-privasi.html"', 'href="kebijakan-privasi.html"'), 'M_RELATIF');
  kasus('tautan ../', ganti('href="/kebijakan-privasi.html"', 'href="../kebijakan-privasi.html"'), 'M_RELATIF');
  kasus('gambar relatif', ganti('src="/assets/neru-wave-512.webp"', 'src="assets/neru-wave-512.webp"'), 'M_RELATIF');
  kasus('kandidat srcset kedua relatif', ganti(', /assets/neru-wave-768.avif 768w', ', assets/neru-wave-768.avif 768w'), 'M_RELATIF');
  kasus('font url() relatif', ganti('url(/assets/fonts/Silkscreen', 'url(assets/fonts/Silkscreen'), 'M_RELATIF');
  kasus('href kosong', ganti('href="/kebijakan-privasi.html"', 'href=""'), 'M_RELATIF');
  kasus('elemen base', ganti('<body>', '<body><base href="/">'), 'M_RELATIF');
  kasus('tautan luar', ganti('href="/kebijakan-privasi.html"', 'href="https://contoh.invalid/"'), 'M_LUAR');
  kasus('jahat: protokol relatif', ganti('href="/kebijakan-privasi.html"', 'href="//contoh.invalid/x"'), 'M_LUAR');
  kasus('jahat: javascript:', ganti('href="/kebijakan-privasi.html"', 'href="javascript:alert(1)"'), 'M_LUAR');
  kasus('jahat: data: tanpa kutip', ganti('href="/kebijakan-privasi.html"', 'href=data:text/html,x'), 'M_LUAR');
  kasus('halaman tujuan hilang', ganti('href="/kebijakan-privasi.html"', 'href="/tidak-ada.html"'), 'M_PUTUS');
  kasus('aset hilang', ganti('neru-wave-768.avif', 'neru-wave-999.avif'), 'M_PUTUS');
  kasus('jahat: keluar akar', ganti('href="/kebijakan-privasi.html"', 'href="/%2e%2e/%2e%2e/etc/passwd"'), 'M_PUTUS');
  kasus('jahat: persen rusak', ganti('href="/kebijakan-privasi.html"', 'href="/%E0%A4%A"'), 'M_PUTUS');
  kasus('jangkar tidak ada', ganti('/#waitlist-d', '/#tidak-ada'), 'M_JANGKAR');
  kasus('jangkar kosong', ganti('/#waitlist-d', '/#'), 'M_JANGKAR');
  kasus('tanpa tautan beranda', (h) => h.replaceAll('href="/"', 'href="/kebijakan-privasi.html"'), 'M_BERANDA');
  kasus('tanpa noindex', ganti('<meta name="robots" content="noindex">', ''), 'M_NOINDEX');
  kasus('noindex hanya di komentar', ganti('<meta name="robots" content="noindex">', '<!-- <meta name="robots" content="noindex"> -->'), 'M_NOINDEX');
  kasus('tanpa lang', ganti('<html lang="id">', '<html>'), 'M_LANG');
  kasus('judul tidak menjelaskan', ganti('<title>Halaman tidak ditemukan — NERUVIA</title>', '<title>NERUVIA</title>'), 'M_JUDUL');
  kasus('dua h1', ganti('<p class="eyebrow">Galat 404</p>', '<h1>Galat</h1>'), 'M_H1');
  kasus('meta refresh', ganti('<meta name="theme-color" content="#ffffff">', '<meta http-equiv="refresh" content="0;url=/">'), 'M_ALIH');
  kasus('skrip mengalihkan', ganti("var dasar='/'+seg;", "var dasar='/'+seg;location.replace('/');"), 'M_ALIH');
  kasus('atribut on*', ganti('<a class="cta" href="/">', '<a class="cta" href="/" onclick="x()">'), 'M_ON');
  kasus('jahat: alamat dipantulkan', ganti("var dasar='/'+seg;", "var dasar='/'+seg;document.querySelector('.lead').textContent=location.pathname;"), 'M_PANTUL');
  kasus('jahat: innerHTML dari query', ganti("var dasar='/'+seg;", "var dasar='/'+seg;document.body.innerHTML=location.search;"), 'M_PANTUL');
  kasus('klaim gratis', ganti('sudah dipindah.', 'sudah dipindah. Daftar gratis.'), 'M_KLAIM');
  kasus('klaim sertifikat di alt', ganti('alt="Neru, robot kucing NERUVIA, duduk sambil tersenyum"', 'alt="Sertifikat"'), 'M_KLAIM');
  kasus('gambar tanpa alt', ganti(' alt="Neru, robot kucing NERUVIA, duduk sambil tersenyum"', ''), 'M_ALT');
  kasus('gambar tanpa tinggi', ganti(' height="626"', ''), 'M_UKURAN');
  kasus('transisi tanpa kurangi gerak', ganti('@media(prefers-reduced-motion:reduce){*{transition:none!important}}', ''), 'M_GERAK');
  kasus('hash CSP basi (gaya)', ganti('min-height:56px', 'min-height:57px'), 'M_CSP_BASI', { mentah: true });
  kasus('hash CSP basi (skrip)', ganti("var dasar='/'+seg;", "var dasar='/'+seg;var z=1;"), 'M_CSP_BASI', { mentah: true });
  kasus('meta CSP hilang', (h) => h.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n/, ''), 'M_CSP', { mentah: true });
  kasus('meta CSP longgar', (h) => h.replace("default-src 'none'", "default-src 'none'; img-src *"), 'M_CSP', { mentah: true });
  kasus('meta CSP ganda', (h) => h.replace(/(<meta http-equiv="Content-Security-Policy"[^>]*>)/, '$1$1'), 'M_CSP', { mentah: true });
  kasus('meta CSP sesudah gaya', (h) => { const m = /<meta http-equiv="Content-Security-Policy"[^>]*>\n/.exec(h)[0]; return h.replace(m, '').replace('</head>', m + '</head>'); }, 'M_CSP', { mentah: true });
  rmSync(join(dir, '404.html')); n++; cek(periksa(dir).has('M_ADA'), 'uji mandiri "404.html hilang" harus M_ADA');
  rmSync(dir, { recursive: true, force: true });
  console.log(`  ${n} kasus uji mandiri dijalankan`);
}

/* ---------- server tiruan ---------- */
function berkasUntuk(akar, p) {
  let f = normalize(join(akar, p));
  if (!f.startsWith(akar) || p.includes('\0') || p.includes('/.git')) return null;
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  return f.startsWith(akar) && existsSync(f) && statSync(f).isFile() ? f : null;
}
function mulaiServer(akar, aturan) {
  return new Promise((res) => {
    const s = createServer((req, resp) => {
      let p; try { p = decodeURIComponent(new URL('http://x' + req.url).pathname); } catch { p = '/\0'; }
      const h = {};
      for (const a of aturan) if (a.source === '/(.*)' || a.source === p) for (const { key, value } of a.headers) h[key] = value;
      let f = berkasUntuk(akar, p), status = 200;
      if (!f) { status = 404; f = existsSync(join(akar, '404.html')) ? join(akar, '404.html') : null; }
      if (!f) { resp.writeHead(404, { ...h, 'Content-Type': 'text/plain' }); return resp.end('tidak ada'); }
      resp.writeHead(status, { ...h, 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      resp.end(readFileSync(f));
    }).listen(0, '127.0.0.1', () => res({ s, base: 'http://127.0.0.1:' + s.address().port }));
  });
}
function playwright() { try { return createRequire(import.meta.url)('playwright').chromium; } catch { return null; } }

/* ---------- ukur ---------- */
async function ukur(chromium) {
  const aturan = existsSync(join(AKAR, 'vercel.json')) ? JSON.parse(readFileSync(join(AKAR, 'vercel.json'), 'utf8')).headers : [];
  const srv = await mulaiServer(AKAR, aturan), br = await chromium.launch();
  const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(`akar: ${AKAR}\nlebar  status  permintaan  KB     LCP ms  CLS     tautan  (median 3 putaran, 1,6 Mbps, RTT 150 ms)`);
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const baris = [];
    for (let i = 0; i < 3; i++) {
      const ctx = await br.newContext({ viewport: { width: w, height: h } }), page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
      let byte = 0, n = 0;
      page.on('requestfinished', async (r) => { n++; try { byte += (await r.sizes()).responseBodySize; } catch { /* halaman ditutup */ } });
      await page.addInitScript(() => {
        window.__lcp = 0; window.__cls = 0;
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      });
      const r = await page.goto(srv.base + '/alamat/yang/tidak-ada', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls, tautan: document.querySelectorAll('a[href]').length }));
      baris.push({ status: r.status(), n, kb: byte / 1024, ...m });
      await ctx.close();
    }
    console.log(`${String(w).padEnd(7)}${String(baris[0].status).padEnd(8)}${String(median(baris.map((b) => b.n))).padEnd(12)}${median(baris.map((b) => b.kb)).toFixed(1).padEnd(7)}${median(baris.map((b) => b.lcp)).toFixed(0).padEnd(8)}${median(baris.map((b) => b.cls)).toFixed(4).padEnd(8)}${baris[0].tautan}`);
  }
  await br.close(); srv.s.close();
}

/* ---------- uji browser ---------- */
const JALUR = [
  '/tidak-ada', '/a/b/c/d/e', '/belajar/tidak-ada', '/admin/rahasia', '/assets/hilang.png.html', '/tidak-ada/',
  '/zzpantul-akun-anda-diblokir', '/%3Cscript%3Ewindow.__xss%3D1%3C%2Fscript%3E',
  '/x?zzpantul=%3Cimg%20src=x%20onerror=window.__xss=1%3E#%3Csvg%20onload=window.__xss=1%3E',
  '/%E2%80%AEzzpantul', '/' + 'zzpantul'.repeat(250), '/..%2f..%2f..%2fetc%2fpasswd', '/%00', '/%E0%A4%A', '//contoh.invalid/zzpantul',
];
async function ujiBrowser(chromium) {
  const aturan = JSON.parse(bangun().json).headers;
  const srv = await mulaiServer(REPO, aturan), br = await chromium.launch();
  const FOTO = process.env.FOTO; if (FOTO) mkdirSync(FOTO, { recursive: true });
  /* "luar" = permintaan ke asal selain server uji (atau, pada peniruan hosting, selain nama host halaman itu persis) */
  const pantau = (page, hostSah = null) => {
    const log = { csp: [], err: [], dialog: [], luar: [], putus: [] };
    page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to|violates/i.test(t)) log.csp.push(t.slice(0, 160)); else if (m.type() === 'error' && !/Failed to load resource/.test(t)) log.err.push(t.slice(0, 160)); });
    page.on('pageerror', (e) => log.err.push('pageerror: ' + e.message.slice(0, 160)));
    page.on('dialog', (d) => { log.dialog.push(d.message()); d.dismiss(); });
    page.on('request', (r) => { const u = new URL(r.url()); if (hostSah ? u.hostname !== hostSah : u.origin !== srv.base) log.luar.push(r.url().slice(0, 80)); });
    page.on('response', (r) => { if (r.status() >= 400 && r.request().resourceType() !== 'document') log.putus.push(new URL(r.url()).pathname); });
    return log;
  };
  const keadaan = (page) => page.evaluate(async () => {
    await document.fonts.ready;
    const img = document.querySelector('.panel img');
    if (img && !img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
    return {
      h1: document.querySelector('h1')?.innerText || '', dom: document.documentElement.outerHTML, xss: typeof window.__xss !== 'undefined',
      lebar: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      gambar: img ? { w: img.naturalWidth, src: img.currentSrc } : null,
      font: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')),
      tautan: [...document.querySelectorAll('a[href]')].map((a) => { const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), teks: (a.innerText || a.getAttribute('aria-label')).trim(), w: r.width, h: r.height, bawah: r.bottom, kiri: r.left, kanan: r.right }; }),
    };
  });
  const HREF = ['/', '/', '/#waitlist-d', '/kebijakan-privasi.html'];
  const FONT = ['Silkscreen', 'Space Grotesk', 'Space Mono'];

  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } });
    for (const j of JALUR) {
      const page = await ctx.newPage(), log = pantau(page), ket = `${w} ${j.slice(0, 50)}`;
      const r = await page.goto(srv.base + j, { waitUntil: 'networkidle' });
      const k = await keadaan(page);
      cek(r.status() === 404, `${ket}: status ${r.status()}`);
      cek(k.h1 === 'Halaman ini tidak ketemu.', `${ket}: h1 ${k.h1}`);
      cek(!k.xss && log.dialog.length === 0, `${ket}: skrip dari alamat berjalan`);
      cek(!k.dom.includes('zzpantul') && !k.dom.includes('__xss'), `${ket}: alamat dipantulkan ke halaman`);
      cek(log.csp.length === 0 && log.err.length === 0, `${ket}: ${log.csp.concat(log.err).join(' | ')}`);
      cek(log.luar.length === 0, `${ket}: permintaan ke luar ${log.luar}`);
      cek(log.putus.length === 0, `${ket}: aset putus ${log.putus}`);
      cek(k.lebar <= 0, `${ket}: gulir horizontal ${k.lebar}px`);
      cek(k.gambar && k.gambar.w > 0 && /\.avif$/.test(k.gambar.src), `${ket}: gambar Neru tidak termuat ${JSON.stringify(k.gambar)}`);
      cek(FONT.every((f) => k.font.includes(f)), `${ket}: font termuat hanya ${k.font}`);
      cek(JSON.stringify(k.tautan.map((a) => a.href)) === JSON.stringify(HREF), `${ket}: tautan ${k.tautan.map((a) => a.href)}`);
      cek(k.tautan.every((a) => a.w >= 44 && a.h >= 44 && a.kiri >= 0 && a.kanan <= w), `${ket}: area ketuk < 44 px atau di luar layar ${JSON.stringify(k.tautan)}`);
      cek(k.tautan.slice(1, 3).every((a) => a.bawah <= h), `${ket}: tombol utama di bawah layar pertama`);
      if (FOTO && j === '/tidak-ada') await page.screenshot({ path: join(FOTO, `404-${w}.png`), fullPage: true });
      await page.close();
    }
    await ctx.close();
  }

  /* tautan benar-benar menuju halaman yang ada, keyboard, fokus */
  {
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage(), log = pantau(page);
    for (const href of [...new Set(HREF)]) {
      const r = await page.goto(srv.base + href, { waitUntil: 'load' });
      cek(!r || r.status() === 200, `tujuan ${href}: status ${r && r.status()}`);
      const j = href.split('#')[1]; if (j) cek((await page.locator('#' + j).count()) === 1, `tujuan ${href}: jangkar tidak ada`);
    }
    await page.goto(srv.base + '/tidak-ada', { waitUntil: 'networkidle' });
    const urut = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      urut.push(await page.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return { href: e.getAttribute('href'), garis: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 }; }));
      if (FOTO && i === 1) await page.screenshot({ path: join(FOTO, '404-fokus.png') });
    }
    cek(JSON.stringify(urut.map((u) => u.href)) === JSON.stringify(HREF), 'keyboard: urutan Tab ' + urut.map((u) => u.href));
    cek(urut.every((u) => u.garis), 'keyboard: fokus tidak terlihat');
    await page.goto(srv.base + '/tidak-ada', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    await Promise.all([page.waitForURL(srv.base + '/'), page.keyboard.press('Enter')]);
    cek(page.url() === srv.base + '/', 'keyboard: Enter pada "Ke beranda" tidak membuka beranda');
    /* kontrol negatif CSP: skrip sisipan, koneksi luar, dan gambar luar harus diblokir */
    await page.goto(srv.base + '/tidak-ada', { waitUntil: 'networkidle' });
    const blok = await page.evaluate(async () => {
      const langgar = []; document.addEventListener('securitypolicyviolation', (e) => langgar.push(e.effectiveDirective));
      const s = document.createElement('script'); s.textContent = 'window.__sisip=1'; document.body.appendChild(s);
      let sambung = false; try { await fetch('https://contoh.invalid/x'); sambung = true; } catch { /* diharapkan */ }
      const g = new Image(); g.src = 'https://contoh.invalid/x.png'; await new Promise((r) => setTimeout(r, 300));
      return { sisip: window.__sisip === 1, sambung, langgar };
    });
    cek(!blok.sisip && !blok.sambung, 'kontrol negatif: skrip sisipan atau koneksi luar lolos');
    cek(['script-src-elem', 'connect-src', 'img-src'].every((d) => blok.langgar.includes(d)), 'kontrol negatif: pelanggaran tercatat hanya ' + blok.langgar);
    await ctx.close();
  }

  /* tanpa JavaScript dan kurangi gerak */
  for (const [nama, opsi] of [['tanpa JavaScript', { javaScriptEnabled: false }], ['kurangi gerak', { reducedMotion: 'reduce' }]]) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, ...opsi }), page = await ctx.newPage();
    const r = await page.goto(srv.base + '/a/b', { waitUntil: 'networkidle' });
    cek(r.status() === 404 && (await page.locator('h1').innerText()) === 'Halaman ini tidak ketemu.', nama + ': halaman tidak tampil');
    cek(JSON.stringify(await page.locator('a[href]').evaluateAll((a) => a.map((x) => x.getAttribute('href')))) === JSON.stringify(HREF), nama + ': tautan salah');
    if (opsi.reducedMotion) {
      const g = await page.evaluate(() => ({ anim: document.getAnimations().length, trans: [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).transitionDuration.split(',').some((d) => parseFloat(d) > 0)).length }));
      cek(g.anim === 0 && g.trans === 0, `kurangi gerak: ${g.anim} animasi, ${g.trans} elemen bertransisi`);
    }
    await ctx.close();
  }

  /* GitHub Pages situs proyek: tanpa header sama sekali, situs di /neruvia/ */
  const tiru = async (alamat, { lebar = 390 } = {}) => {
    const ctx = await br.newContext({ viewport: { width: lebar, height: 844 } }), page = await ctx.newPage(), log = pantau(page, new URL(alamat).hostname);
    await page.route('**/*', (rt) => {
      const u = new URL(rt.request().url());
      let p; try { p = decodeURIComponent(u.pathname); } catch { p = '/\0'; }
      if (u.hostname.endsWith('.invalid') || u.hostname === 'contoh.invalid') { log.luar.push(u.href); return rt.abort(); }
      const proyek = p.startsWith('/neruvia/');
      const f = proyek ? berkasUntuk(REPO, p.slice('/neruvia'.length)) : null;
      if (f) return rt.fulfill({ status: 200, contentType: MIME[extname(f)] || 'application/octet-stream', body: readFileSync(f) });
      /* di luar proyek GitHub menjawab 404 miliknya; untuk uji segmen jahat, dokumen tetap diberi 404.html */
      if (proyek || rt.request().resourceType() === 'document') return rt.fulfill({ status: 404, contentType: MIME['.html'], body: readFileSync(join(REPO, '404.html')) });
      return rt.fulfill({ status: 404, contentType: 'text/plain', body: 'bukan situs ini' });
    });
    const r = await page.goto(alamat, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    return { ctx, page, log, status: r.status() };
  };
  const DASAR = HREF.map((h) => '/neruvia' + h);
  for (const lebar of [390, 768, 1440]) {
    for (const j of ['/neruvia/tidak-ada', '/neruvia/belajar/a/b/c?q=zzpantul#x']) {
      const t = await tiru('https://contoh.github.io' + j, { lebar }), k = await keadaan(t.page), ket = `Pages ${lebar} ${j}`;
      cek(t.status === 404, ket + ': status');
      cek(JSON.stringify(k.tautan.map((a) => a.href)) === JSON.stringify(DASAR), `${ket}: tautan ${k.tautan.map((a) => a.href)}`);
      cek(k.gambar && k.gambar.w > 0 && k.gambar.src.startsWith('https://contoh.github.io/neruvia/assets/'), `${ket}: gambar ${JSON.stringify(k.gambar)}`);
      await t.page.waitForFunction(() => ['Silkscreen', 'Space Grotesk', 'Space Mono'].every((n) => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === n && f.status === 'loaded')), null, { timeout: 3000 }).then(() => cek(true), () => cek(false, ket + ': font tidak termuat dari /neruvia/'));
      cek(!k.dom.includes('zzpantul'), ket + ': alamat dipantulkan');
      cek(t.log.csp.length === 0 && t.log.err.length === 0 && t.log.luar.length === 0, `${ket}: ${t.log.csp.concat(t.log.err, t.log.luar).join(' | ')}`);
      cek(k.lebar <= 0, ket + ': gulir horizontal');
      if (FOTO && lebar === 390 && j === '/neruvia/tidak-ada') await t.page.screenshot({ path: join(FOTO, '404-pages-390.png'), fullPage: true });
      await Promise.all([t.page.waitForURL('https://contoh.github.io/neruvia/'), t.page.click('a.cta')]);
      cek((await t.page.title()).startsWith('NERUVIA'), ket + ': "Ke beranda" tidak membuka beranda proyek');
      await t.ctx.close();
    }
  }
  /* meta CSP bekerja tanpa header */
  {
    const t = await tiru('https://contoh.github.io/neruvia/x');
    const lolos = await t.page.evaluate(async () => { const s = document.createElement('script'); s.textContent = 'window.__sisip=1'; document.body.appendChild(s); await new Promise((r) => setTimeout(r, 100)); return window.__sisip === 1; });
    cek(!lolos && t.log.csp.length > 0, 'Pages: meta CSP tidak memblokir skrip sisipan');
    await t.ctx.close();
  }
  /* segmen pertama yang tidak lolos daftar putih, dan nama host yang hanya mirip: rujukan tidak diubah */
  const TETAP = [
    ...['//contoh.invalid/x', '/%2F%2Fcontoh.invalid/x', '/%3Cimg%3E/x', '/.rahasia/x', '/-x/y', '/a:b/x', '/javascript:alert(1)', '/a%20b/x', '/@x/y', '/' + 'a'.repeat(101) + '/x', '/', '/%5C%5Ccontoh.invalid'].map((p) => 'https://contoh.github.io' + p),
    'https://github.io.contoh.test/neruvia/x', 'https://contohgithub.io/neruvia/x', 'https://contoh.github.io.contoh.test/neruvia/x', 'https://neruvia.vercel.app/neruvia/x',
  ];
  for (const alamat of TETAP) {
    const t = await tiru(alamat);
    const h = await t.page.locator('a[href]').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
    const u = await t.page.evaluate(() => [...document.querySelectorAll('[href],[src],[srcset]')].flatMap((e) => ['href', 'src', 'srcset'].map((n) => e.getAttribute(n)).filter(Boolean)));
    /* "/" sebagai beranda proyek tidak mungkin dibuka dari akar GitHub Pages, jadi daftar ini memang tidak diubah */
    cek(JSON.stringify(h) === JSON.stringify(HREF), `rujukan berubah untuk ${alamat.slice(0, 70)}: ${h}`);
    cek(u.every((x) => x.startsWith('/') && !x.startsWith('//')) && t.log.luar.length === 0 && !t.log.err.some((e) => e.startsWith('pageerror')), `rujukan atau galat tak aman untuk ${alamat.slice(0, 70)}`);
    await t.ctx.close();
  }
  /* segmen sah dengan titik dan garis bawah */
  for (const seg of ['NERUVIA', 'repo_1.2-uji']) {
    const t = await tiru(`https://contoh.github.io/${seg}/x`);
    cek((await t.page.locator('a.cta').getAttribute('href')) === `/${seg}/`, 'segmen sah tidak dipakai: ' + seg);
    await t.ctx.close();
  }
  await br.close(); srv.s.close();
}

if (UKUR) {
  const c = playwright(); if (!c) { console.log('Playwright tidak ada.'); process.exit(2); }
  await ukur(c);
} else {
  console.log('== 404.html di repo ==');
  const v = periksa(REPO);
  cek(v.size === 0, [...v].map(([k, p]) => k + ' ' + p).join('; '));
  const meta = bangun().meta;
  cek(!!meta && meta.sesuai, 'meta CSP tidak sama dengan keluaran buat-vercel-json');
  console.log('== Uji mandiri pemeriksa ==');
  if (v.has('M_ADA')) console.log('  dilewati: 404.html tidak ada'); else ujiMandiri();
  let dilewati = false;
  if (!CEPAT) {
    const c = playwright();
    if (c) { console.log('== Browser =='); await ujiBrowser(c); } else { dilewati = true; console.log('Playwright tidak tersedia: uji browser dilewati.'); }
  }
  console.log(`\n${lulus} pemeriksaan lulus, ${gagal} gagal`);
  process.exit(gagal ? 1 : dilewati ? 2 : 0);
}
