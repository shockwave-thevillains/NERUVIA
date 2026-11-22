#!/usr/bin/env node
/* Uji gerak dikurangi (B3). Memeriksa bahwa saat preferensi sistem "kurangi gerak" menyala, halaman tidak bergerak sendiri.
   Hanya membaca; tidak mengubah berkas di repo. Server statis lokal, Chromium via Playwright.
   Pakai:
     node tools/uji-gerak.mjs                 periksa halaman repo (3 lebar) lalu jalankan uji mandiri pemeriksa
     node tools/uji-gerak.mjs --repo          hanya periksa repo
     node tools/uji-gerak.mjs --tes           hanya uji mandiri pemeriksa (halaman sementara)
     node tools/uji-gerak.mjs --halaman /,/belajar/   daftar halaman dipilih (diawali /, tanpa .., tanpa skema)
   Kode keluar 0 lulus, 1 ada pelanggaran atau uji mandiri gagal, 2 Playwright tidak ada.

   Kode pelanggaran (dengan reducedMotion = reduce):
     G_SCROLL   html atau elemen mana pun memakai scroll-behavior selain auto
     G_ANIMASI  elemen atau ::before/::after punya animation-name selain none dengan durasi > 0
     G_TRANSISI elemen atau ::before/::after punya transition-duration > 0 untuk properti yang bukan none
     G_BERJALAN document.getAnimations() masih punya animasi berjalan 1,5 dtk setelah muat
     G_RAF      halaman memanggil requestAnimationFrame saat diam (jendela 1 dtk)
     G_INTERVAL halaman mendaftarkan setInterval saat memuat
     G_TERSEMBUNYI teks yang seharusnya terlihat berkeburaman 0 (konten hilang karena animasi dimatikan)
     G_GALAT    galat skrip (pageerror) saat memuat
     G_JANGKAR  klik tautan jangkar (#id) tidak berpindah seketika (masih menggulir halus 60 ms kemudian)
     G_NERU     animasi Neru menyala atau frame animasi diminta (halaman beranda)
     G_KONTROL  (kontrol positif) tanpa preferensi, halaman beranda ternyata tidak bergerak: pemeriksa tak berarti */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
export const HALAMAN_REPO = ['/', '/belajar/', '/belajar/pelajaran.html?id=l1-m1-p1', '/terima-kasih.html', '/kebijakan-privasi.html', '/admin/'];
const LEBAR = [390, 768, 1440];
const MAKS_ELEMEN = 20000;

/* validasi jalur halaman dari argumen: hanya jalur lokal sederhana */
export function jalurAman(j) {
  if (typeof j !== 'string' || j.length === 0 || j.length > 300) return false;
  if (!j.startsWith('/') || j.startsWith('//')) return false;
  if (/[\0\\\r\n<>"'`]/.test(j)) return false;
  if (/\.\.|%2e|%00|%5c|%2f%2f/i.test(j)) return false;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(j)) return false;
  return true;
}

function bukaServer(akar) {
  return new Promise((res) => {
    const s = createServer((req, resp) => {
      let p;
      try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { resp.writeHead(400); return resp.end(); }
      if (p.includes('\0')) { resp.writeHead(400); return resp.end(); }
      let f = normalize(join(akar, p));
      if (f !== akar && !f.startsWith(akar + sep)) { resp.writeHead(403); return resp.end('dilarang'); }
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
      if (!existsSync(f)) { resp.writeHead(404); return resp.end('tidak ada'); }
      resp.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      resp.end(readFileSync(f));
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

/* dijalankan di dalam halaman */
function pindaiHalaman(maksElemen) {
  const hasil = { scroll: '', scrollEl: [], animasi: [], transisi: [], tersembunyi: [], elemen: 0, terpotong: false, berjalan: 0 };
  const bukanNol = (v) => String(v || '').split(',').some((x) => { const n = parseFloat(x); return !(n === 0 || Number.isNaN(n)); });
  const nm = (e, ps) => e.nodeName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '') + (ps || '');
  hasil.scroll = getComputedStyle(document.documentElement).scrollBehavior;
  const semua = document.querySelectorAll('*');
  hasil.elemen = semua.length;
  const batas = Math.min(semua.length, maksElemen);
  hasil.terpotong = semua.length > maksElemen;
  for (let i = 0; i < batas; i++) {
    const e = semua[i];
    for (const ps of ['', '::before', '::after']) {
      const cs = getComputedStyle(e, ps || null);
      if (ps && cs.content === 'none') continue;
      if (!ps && cs.scrollBehavior !== 'auto' && hasil.scrollEl.length < 5) hasil.scrollEl.push(nm(e) + ' ' + cs.scrollBehavior);
      if (cs.animationName !== 'none' && bukanNol(cs.animationDuration)) hasil.animasi.push(nm(e, ps) + ' ' + cs.animationName + ' ' + cs.animationDuration);
      if (cs.transitionProperty !== 'none' && bukanNol(cs.transitionDuration)) hasil.transisi.push(nm(e, ps) + ' ' + cs.transitionDuration);
    }
    if (hasil.tersembunyi.length < 10 && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].indexOf(e.nodeName) < 0) {
      let punyaTeks = false;
      for (const c of e.childNodes) if (c.nodeType === 3 && /\S/.test(c.nodeValue)) { punyaTeks = true; break; }
      if (punyaTeks) {
        const cs = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        if (cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.height > 0) {
          let op = 1;
          for (let a = e; a && a.nodeType === 1; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
          if (op === 0) hasil.tersembunyi.push(nm(e));
        }
      }
    }
  }
  hasil.berjalan = document.getAnimations().filter((a) => a.playState === 'running').length;
  return hasil;
}

export async function periksaHalaman(chromium, base, jalan, lebar, reduce) {
  const galat = [];
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: lebar < 500 ? 844 : lebar < 1000 ? 1024 : 900 }, deviceScaleFactor: 1, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const frameReq = [];
    page.on('request', (r) => { if (/maskot-animasi\/frames/.test(r.url())) frameReq.push(r.url()); });
    page.on('pageerror', (e) => galat.push('pageerror: ' + String(e).slice(0, 120)));
    await page.addInitScript(() => {
      window.__g = { raf: 0, rafMulai: -1, interval: 0 };
      const r0 = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) { if (window.__g.rafMulai >= 0) window.__g.raf++; return r0(cb); };
      const i0 = window.setInterval.bind(window);
      window.setInterval = function (f, t) { window.__g.interval++; return i0.apply(window, arguments); };
    });
    await page.goto(base + jalan, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__g.rafMulai = performance.now(); window.__g.raf = 0; });
    await page.waitForTimeout(1000);
    const g = await page.evaluate(() => window.__g);
    const p = await page.evaluate(pindaiHalaman, MAKS_ELEMEN);
    const neru = await page.evaluate(() => { const n = document.getElementById('neru'); return n ? { ada: true, live: n.classList.contains('live') } : { ada: false }; });
    /* klik jangkar pertama yang menunjuk id yang ada */
    const jangkar = await page.evaluate(() => {
      for (const a of document.querySelectorAll('a[href^="#"]')) {
        const h = a.getAttribute('href'); if (h.length < 2) continue;
        let t = null; try { t = document.getElementById(decodeURIComponent(h.slice(1))); } catch { continue; }
        if (!t) continue;
        const r = a.getBoundingClientRect(); const vis = getComputedStyle(a).visibility !== 'hidden' && r.width > 0 && r.height > 0;
        if (vis) return h;
      }
      return '';
    });
    let jang = null;
    if (jangkar) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.evaluate((h) => { const a = [...document.querySelectorAll('a[href^="#"]')].find((x) => x.getAttribute('href') === h && getComputedStyle(x).visibility !== 'hidden' && x.getBoundingClientRect().width > 0); a.click(); }, jangkar);
      await page.waitForTimeout(60);
      const y60 = await page.evaluate(() => window.scrollY);
      await page.waitForTimeout(1500);
      const yAkhir = await page.evaluate(() => window.scrollY);
      jang = { jangkar, y60, yAkhir, selisih: Math.abs(yAkhir - y60) };
    }
    await ctx.close();
    return { jalan, lebar, reduce, g, p, neru, frameReq: frameReq.length, jang, galat };
  } finally { await browser.close(); }
}

/* ubah hasil pengukuran jadi daftar pelanggaran */
export function nilai(h) {
  const v = [];
  if (h.reduce) {
    if (h.p.scroll !== 'auto' || h.p.scrollEl.length) v.push({ kode: 'G_SCROLL', info: h.p.scroll + (h.p.scrollEl.length ? ' | ' + h.p.scrollEl.join(', ') : '') });
    if (h.p.animasi.length) v.push({ kode: 'G_ANIMASI', info: h.p.animasi.slice(0, 3).join(' | ') });
    if (h.p.transisi.length) v.push({ kode: 'G_TRANSISI', info: h.p.transisi.slice(0, 3).join(' | ') });
    if (h.p.berjalan > 0) v.push({ kode: 'G_BERJALAN', info: String(h.p.berjalan) });
    if (h.g.raf > 0) v.push({ kode: 'G_RAF', info: h.g.raf + ' panggilan' });
    if (h.g.interval > 0) v.push({ kode: 'G_INTERVAL', info: h.g.interval + ' pendaftaran' });
    if (h.p.tersembunyi.length) v.push({ kode: 'G_TERSEMBUNYI', info: h.p.tersembunyi.slice(0, 3).join(' | ') });
    if (h.jang && h.jang.selisih > 2) v.push({ kode: 'G_JANGKAR', info: `${h.jang.jangkar}: y 60 ms ${h.jang.y60}, akhir ${h.jang.yAkhir}` });
    if (h.neru.ada && (h.neru.live || h.frameReq > 0)) v.push({ kode: 'G_NERU', info: `live=${h.neru.live} frame=${h.frameReq}` });
  }
  for (const e of h.galat) v.push({ kode: 'G_GALAT', info: e });
  return v;
}

/* ---------- uji mandiri pemeriksa ---------- */
const KERANGKA = (css, body, js) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>uji</title><style>${css || ''}</style></head><body>${body || '<h1>Judul</h1><p>Paragraf uji.</p>'}${js ? '<script>' + js + '</script>' : ''}</body></html>`;
const REDUKSI = '@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}';
const ANGKER = '<a href="#bawah">ke bawah</a><div style="height:3000px"></div><h2 id="bawah">Bawah</h2><p>akhir</p>';
export const KASUS = [
  { n: 'baik: halaman diam tanpa gerak', html: KERANGKA(), ekspektasi: [] },
  { n: 'baik: animasi dan transisi dimatikan lewat media query', html: KERANGKA('@keyframes k{to{opacity:.5}}h1{animation:k 1s infinite;transition:color .3s}p::after{content:"x";animation:k 1s infinite}' + REDUKSI), ekspektasi: [] },
  { n: 'baik: menu tertutup (visibility hidden, opacity 0) tidak dianggap teks hilang', html: KERANGKA('.m{visibility:hidden;opacity:0}', '<h1>Judul</h1><div class="m"><p>menu</p></div>'), ekspektasi: [] },
  { n: 'baik: jangkar dengan scroll-behavior auto menggulir seketika', html: KERANGKA('html{scroll-behavior:auto}', ANGKER), ekspektasi: [] },
  { n: 'baik: elemen dekoratif tanpa teks dengan opacity 0', html: KERANGKA('.d{opacity:0;width:10px;height:10px}', '<h1>Judul</h1><div class="d"></div>'), ekspektasi: [] },
  { n: 'buruk: keyframes infinite tanpa penjaga', html: KERANGKA('@keyframes k{to{opacity:.5}}h1{animation:k 1s infinite}'), ekspektasi: ['G_ANIMASI', 'G_BERJALAN'] },
  { n: 'buruk: animasi hanya di ::after', html: KERANGKA('@keyframes k{to{opacity:.5}}p::after{content:"x";animation:k 1s infinite}'), ekspektasi: ['G_ANIMASI', 'G_BERJALAN'] },
  { n: 'buruk: animasi hanya di ::before', html: KERANGKA('@keyframes k{to{opacity:.5}}p::before{content:"x";animation:k 1s infinite}'), ekspektasi: ['G_ANIMASI', 'G_BERJALAN'] },
  { n: 'buruk: transisi tidak dimatikan', html: KERANGKA('h1{transition:color .35s}'), ekspektasi: ['G_TRANSISI'] },
  { n: 'buruk: transisi sangat kecil (1 ms) tetap tanda', html: KERANGKA('h1{transition:color .001s}'), ekspektasi: ['G_TRANSISI'] },
  { n: 'buruk: transisi di ::before', html: KERANGKA('p::before{content:"x";transition:opacity 2s}'), ekspektasi: ['G_TRANSISI'] },
  { n: 'buruk: scroll-behavior smooth tanpa penjaga, jangkar menggulir halus', html: KERANGKA('html{scroll-behavior:smooth}', ANGKER), ekspektasi: ['G_SCROLL', 'G_JANGKAR'] },
  { n: 'buruk: kontainer (bukan html) dengan scroll-behavior smooth', html: KERANGKA('.k{overflow:auto;height:50px;scroll-behavior:smooth}', '<h1>Judul</h1><div class="k"><p>isi</p></div>'), ekspektasi: ['G_SCROLL'] },
  { n: 'buruk: teks tak terlihat (opacity 0 pada induk)', html: KERANGKA('.s{opacity:0}', '<div class="s"><p>konten penting</p></div>'), ekspektasi: ['G_TERSEMBUNYI'] },
  { n: 'buruk: requestAnimationFrame berulang saat diam', html: KERANGKA('', '', '(function t(){requestAnimationFrame(t)})()'), ekspektasi: ['G_RAF'] },
  { n: 'buruk: setInterval terdaftar saat memuat', html: KERANGKA('', '', 'setInterval(function(){document.title=Date.now()},500)'), ekspektasi: ['G_INTERVAL'] },
  { n: 'buruk: Web Animations API (el.animate) tanpa penjaga', html: KERANGKA('', '', 'document.querySelector("h1").animate([{opacity:1},{opacity:.4}],{duration:800,iterations:Infinity})'), ekspektasi: ['G_BERJALAN'] },
  { n: 'buruk: durasi animasi ekstrem (1e9 detik) tetap tanda', html: KERANGKA('@keyframes k{to{opacity:.9}}h1{animation:k 1000000000s}'), ekspektasi: ['G_ANIMASI', 'G_BERJALAN'] },
  { n: 'jahat: nama kelas dan teks berisi HTML/skrip tidak merusak pemeriksa', html: KERANGKA('', '<h1 class="&lt;img src=x onerror=alert(1)&gt;" id="a&quot;b">&lt;script&gt;alert(1)&lt;/script&gt;</h1><p>ok</p>'), ekspektasi: [] },
  { n: 'jahat: 25.000 elemen, pemeriksa selesai dan melaporkan pemotongan', html: KERANGKA('', '<h1>Judul</h1>' + '<i></i>'.repeat(25000)), ekspektasi: [], terpotong: true },
  { n: 'jahat: jangkar ke id yang tidak ada diabaikan, href "#" kosong diabaikan', html: KERANGKA('html{scroll-behavior:auto}', '<a href="#tidak-ada">x</a><a href="#">y</a><a href="#%E0%A4%A">z</a><p>ok</p>'), ekspektasi: [] },
];
export const ARG_JAHAT = ['', '..', '/../etc/passwd', '//evil.example/x', '/%2e%2e/etc/passwd', '/a\0b', 'http://evil.example/', '/javascript:alert(1)', '/a\\b', '/<script>', '/' + 'a'.repeat(5000), 'index.html', '/a%00b', '/x\ny'];

async function ujiMandiri(chromium) {
  let lulus = 0, gagal = 0; const laporan = [];
  const ok = (c, m) => { if (c) lulus++; else { gagal++; laporan.push(m); } };
  /* validasi argumen jahat */
  for (const a of ARG_JAHAT) ok(!jalurAman(a), `jalurAman menerima argumen jahat: ${JSON.stringify(a).slice(0, 60)}`);
  for (const a of ['/', '/belajar/', '/belajar/pelajaran.html?id=l1-m1-p1', '/terima-kasih.html']) ok(jalurAman(a), `jalurAman menolak jalur sah: ${a}`);
  const dir = mkdtempSync(join(tmpdir(), 'uji-gerak-'));
  try {
    KASUS.forEach((k, i) => writeFileSync(join(dir, 'k' + i + '.html'), k.html));
    const s = await bukaServer(dir);
    const base = 'http://127.0.0.1:' + s.address().port;
    /* traversal lewat HTTP ke server uji */
    for (const t of ['/../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd', '/..%2f..%2fetc/passwd', '/k0.html%00.png']) {
      const r = await fetch(base + t).catch(() => ({ status: 0 }));
      ok(r.status === 403 || r.status === 404 || r.status === 400 || r.status === 0, `server uji menyajikan jalur keluar akar: ${t} -> ${r.status}`);
    }
    for (let i = 0; i < KASUS.length; i++) {
      const k = KASUS[i];
      const t0 = Date.now();
      const h = await periksaHalaman(chromium, base, '/k' + i + '.html', 1024, true);
      const kode = [...new Set(nilai(h).map((x) => x.kode))].sort();
      const harap = [...k.ekspektasi].sort();
      ok(JSON.stringify(kode) === JSON.stringify(harap), `kasus "${k.n}": diharapkan [${harap}] didapat [${kode}]`);
      if (k.terpotong !== undefined) ok(h.p.terpotong === k.terpotong && Date.now() - t0 < 60000, `kasus "${k.n}": terpotong=${h.p.terpotong} dalam ${Date.now() - t0} ms`);
    }
    /* kontrol positif: tanpa preferensi, halaman beranda bergerak dan halaman uji beranimasi terdeteksi */
    const iKontrol = KASUS.findIndex((k) => k.n.startsWith('buruk: keyframes infinite'));
    ok(iKontrol >= 0, 'kontrol positif: kasus keyframes tidak ditemukan');
    const hAnim = await periksaHalaman(chromium, base, '/k' + iKontrol + '.html', 1024, false);
    ok(hAnim.p.berjalan > 0 && hAnim.p.animasi.length > 0, 'kontrol positif: animasi tanpa preferensi tidak terdeteksi oleh pindai');
    s.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return { lulus, gagal, laporan };
}

async function periksaRepo(chromium, halaman) {
  const s = await bukaServer(AKAR);
  const base = 'http://127.0.0.1:' + s.address().port;
  let lulus = 0, gagal = 0; const baris = [];
  try {
    for (const j of halaman) {
      for (const w of LEBAR) {
        const h = await periksaHalaman(chromium, base, j, w, true);
        const v = nilai(h);
        if (v.length === 0) lulus++; else { gagal++; baris.push(`  GAGAL ${j} @${w}: ` + v.map((x) => `${x.kode} (${x.info})`).join('; ')); }
        if (h.p.terpotong) baris.push(`  catatan: ${j} @${w} dipotong pada ${MAKS_ELEMEN} elemen`);
      }
    }
    /* kontrol positif di beranda: tanpa preferensi, halaman memang bergerak */
    const hp = await periksaHalaman(chromium, base, '/', 1440, false);
    const bergerak = hp.p.animasi.length > 0 || hp.p.berjalan > 0 || hp.neru.live || hp.frameReq > 0 || hp.p.scroll === 'smooth';
    if (bergerak) lulus++; else { gagal++; baris.push('  GAGAL G_KONTROL: beranda tanpa preferensi tidak bergerak, pemeriksa tak berarti'); }
  } finally { s.close(); }
  return { lulus, gagal, baris };
}

async function utama() {
  const arg = process.argv.slice(2);
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright tidak tersedia, uji gerak dilewati'); process.exit(2); }
  const iH = arg.indexOf('--halaman');
  let halaman = HALAMAN_REPO;
  if (iH >= 0) {
    halaman = String(arg[iH + 1] || '').split(',');
    for (const j of halaman) if (!jalurAman(j)) { console.error('Argumen --halaman tidak aman atau kosong: ' + JSON.stringify(j).slice(0, 80)); process.exit(1); }
  }
  let kode = 0;
  if (!arg.includes('--tes')) {
    const r = await periksaRepo(chromium, halaman);
    console.log(`Gerak dikurangi: ${r.lulus} lulus, ${r.gagal} gagal (${halaman.length} halaman x ${LEBAR.length} lebar + kontrol positif)`);
    r.baris.forEach((l) => console.log(l));
    if (r.gagal) kode = 1;
  }
  if (!arg.includes('--repo')) {
    const m = await ujiMandiri(chromium);
    console.log(`Uji mandiri pemeriksa: ${m.lulus} lulus, ${m.gagal} gagal`);
    m.laporan.forEach((l) => console.log('  GAGAL ' + l));
    if (m.gagal) kode = 1;
  }
  process.exit(kode);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) utama();
