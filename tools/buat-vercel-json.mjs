#!/usr/bin/env node
/* Membuat vercel.json (header keamanan + CSP ketat) dari isi halaman HTML.
   Situs statis tidak bisa memakai nonce, jadi blok <script>, <style>, dan atribut style="" yang
   inline diizinkan lewat hash SHA-256 per halaman. Setiap kali blok inline diubah, hash berubah:
   jalankan ulang skrip ini.

   Pakai:
     node tools/buat-vercel-json.mjs          tulis vercel.json
     node tools/buat-vercel-json.mjs --cek    gagal (kode 1) bila vercel.json tidak sesuai isi halaman
*/
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'tools', 'docs', 'supabase', 'assets', 'content']);

const sha = (s) => "'sha256-" + createHash('sha256').update(s, 'utf8').digest('base64') + "'";
const uniq = (a) => [...new Set(a)];

function cariHtml(dir = ROOT, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) cariHtml(join(dir, e.name), out); }
    else if (e.name.endsWith('.html')) out.push(relative(ROOT, join(dir, e.name)).split(sep).join('/'));
  }
  return out.sort();
}

function dekodeAtribut(v, berkas) {
  const r = v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  if (/&#?\w+;/.test(r)) throw new Error(berkas + ': atribut style memuat entitas HTML yang belum didukung: ' + v);
  return r;
}

/* Baca satu halaman: hash blok inline, dan tolak hal yang CSP akan blokir atau yang menarik sumber luar. */
function analisis(berkas) {
  const html = readFileSync(join(ROOT, berkas), 'utf8').replace(/\r\n/g, '\n');
  const skripSrc = [], hashSkrip = [], hashGaya = [], hashAttr = [];
  let sisa = html.replace(/<!--[\s\S]*?-->/g, '');

  sisa = sisa.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attr, isi) => {
    const src = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(attr);
    if (src) {
      if (/^(https?:)?\/\//i.test(src[1])) throw new Error(berkas + ': skrip dari sumber luar: ' + src[1]);
      skripSrc.push(src[1]);
    } else {
      const tipe = /\btype\s*=\s*["']([^"']*)["']/i.exec(attr);
      const js = !tipe || /^(module|(text|application)\/(x-)?(javascript|ecmascript))$/i.test(tipe[1]);
      if (js && isi.trim() !== '') hashSkrip.push(sha(isi));
    }
    return '';
  });
  sisa = sisa.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, isi) => { if (isi.trim() !== '') hashGaya.push(sha(isi)); return ''; });

  for (const m of sisa.matchAll(/<link\b[^>]*>/gi)) {
    const h = /\bhref\s*=\s*["']([^"']*)["']/i.exec(m[0]);
    if (h && /^(https?:)?\/\//i.test(h[1])) throw new Error(berkas + ': <link> ke sumber luar: ' + h[1]);
  }
  for (const m of sisa.matchAll(/<(img|iframe|source|video|audio|embed|object|form)\b[^>]*>/gi)) {
    const s = /\b(src|data|action)\s*=\s*["']([^"']*)["']/i.exec(m[0]);
    if (s && /^(https?:)?\/\//i.test(s[2])) throw new Error(berkas + ': <' + m[1] + '> ke sumber luar: ' + s[2]);
  }
  const ev = /<[a-z][^>]*?\s(on[a-z]+)\s*=/i.exec(sisa);
  if (ev) throw new Error(berkas + ': atribut event inline ditemukan (' + ev[1] + '); CSP akan memblokirnya');
  if (/\sstyle\s*=\s*[^"'\s]/i.test(sisa)) throw new Error(berkas + ': atribut style tanpa tanda kutip tidak didukung');
  let nAttr = 0;
  for (const m of sisa.matchAll(/<[a-z][^>]*?\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    hashAttr.push(sha(dekodeAtribut(m[1] ?? m[2], berkas))); nAttr++;
  }
  const semua = (sisa.match(/\sstyle\s*=/gi) || []).length;
  if (semua !== nAttr) throw new Error(berkas + ': ' + semua + ' atribut style ditemukan tetapi hanya ' + nAttr + ' terbaca; periksa tanda > di dalam atribut');
  return { skripSrc, hashSkrip: uniq(hashSkrip), hashGaya: uniq(hashGaya), hashAttr: uniq(hashAttr) };
}

function originSupabase() {
  const p = join(ROOT, 'config.js');
  if (!existsSync(p)) return null;
  const m = /NERUVIA_WAITLIST_ENDPOINT\s*=\s*['"](https:\/\/[a-z0-9]{10,40}\.supabase\.co)(?:\/[^'"]*)?['"]/.exec(readFileSync(p, 'utf8'));
  return m ? m[1] : null;
}

function jalurHalaman(berkas) {
  if (berkas === 'index.html') return ['/', '/index.html'];
  if (berkas.endsWith('/index.html')) { const d = '/' + berkas.slice(0, -'/index.html'.length); return [d, d + '/', '/' + berkas]; }
  return ['/' + berkas];
}

export function bangun() {
  const supa = originSupabase();
  const umum = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'accelerometer=(), autoplay=(), bluetooth=(), browsing-topics=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), serial=(), usb=(), xr-spatial-tracking=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' }
  ];
  const headers = [{ source: '/(.*)', headers: umum }];
  const ringkasan = [];
  for (const berkas of cariHtml()) {
    const a = analisis(berkas);
    const pakaiConfig = a.skripSrc.some((s) => /(^|\/)config\.js$/.test(s));
    if (pakaiConfig && !supa) throw new Error(berkas + ': memuat config.js tetapi origin Supabase tidak terbaca dari config.js');
    const csp = [
      "default-src 'none'",
      "script-src 'self'" + a.hashSkrip.map((h) => ' ' + h).join(''),
      "style-src 'self'" + a.hashGaya.map((h) => ' ' + h).join(''),
      "style-src-attr " + (a.hashAttr.length ? "'unsafe-hashes'" + a.hashAttr.map((h) => ' ' + h).join('') : "'none'"),
      "img-src 'self'",
      "font-src 'self'",
      ...(pakaiConfig && berkas.startsWith('admin/') ? ["media-src 'self' " + supa] : []),   /* pemutar video privat (tautan bertanda tangan) hanya di halaman admin */
      "connect-src 'self'" + (pakaiConfig ? ' ' + supa : ''),
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests'
    ].join('; ');
    for (const source of jalurHalaman(berkas)) headers.push({ source, headers: [{ key: 'Content-Security-Policy', value: csp }] });
    ringkasan.push({ berkas, skrip: a.hashSkrip.length, gaya: a.hashGaya.length, attr: a.hashAttr.length, supabase: pakaiConfig });
  }
  /* Halaman berindeks folder (belajar/, admin/) memakai tautan relatif (ruang.css, ../content/...). Tanpa garis miring penutup, "/belajar" memuat berkas dari akar situs dan halaman tampil tanpa gaya. Karena itu "/folder" dialihkan ke "/folder/". */
  const redirects = cariHtml().filter((b) => /^[^/]+\/index\.html$/.test(b)).map((b) => ({ source: '/' + b.split('/')[0], destination: '/' + b.split('/')[0] + '/', permanent: false }));
  return { json: JSON.stringify({ redirects, headers }, null, 2) + '\n', ringkasan };
}

const langsung = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (langsung) {
  try {
    const { json, ringkasan } = bangun();
    const target = join(ROOT, 'vercel.json');
    if (process.argv.includes('--cek')) {
      const ada = existsSync(target) ? readFileSync(target, 'utf8') : '';
      if (ada !== json) { console.error('GAGAL: vercel.json tidak sesuai isi halaman. Jalankan: node tools/buat-vercel-json.mjs'); process.exit(1); }
      console.log('OK: vercel.json sesuai isi ' + ringkasan.length + ' halaman.');
    } else {
      writeFileSync(target, json);
      console.log('vercel.json ditulis.');
    }
    for (const r of ringkasan) console.log('  ' + r.berkas.padEnd(24) + ' skrip ' + r.skrip + ', gaya ' + r.gaya + ', atribut ' + r.attr + (r.supabase ? ', connect Supabase' : ''));
  } catch (e) { console.error('GAGAL: ' + e.message); process.exit(1); }
}
