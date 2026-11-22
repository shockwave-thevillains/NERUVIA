#!/usr/bin/env node
/* Uji keamanan otomatis NERUVIA (kegiatan S5). Gerbang wajib sebelum commit yang menyentuh kode atau konten.
   Tanpa dependensi npm. Playwright (bila ada) dipakai untuk uji browser; tanpa Playwright bagian itu dilewati.

   Pakai:
     node tools/uji-keamanan.mjs            semua bagian
     node tools/uji-keamanan.mjs --cepat    tanpa uji browser (statis dan uji unit saja)
   Kode keluar: 0 lulus, 1 ada yang gagal, 2 semua lulus tetapi uji browser dilewati (Playwright tidak ada).

   Bagian:
     A. Rahasia: pola kunci/token di berkas terlacak dan riwayat git; config.js hanya boleh berisi kunci publik.
     B. Sink berbahaya: innerHTML, eval, document.write, atribut on*, javascript:, sumber luar, target=_blank tanpa rel.
     C. Header: vercel.json sesuai isi halaman dan tiap halaman mendapat header keamanan dan CSP tanpa unsafe-*.
     D. Konten kursus: JSON pelajaran tidak memuat markup atau tautan berbahaya.
     E. Uji unit: impor progres dengan muatan jahat, dan suite uji lain (impor progres, komentar, impor draf, validator).
     F. Browser: payload XSS/HTML/SQL/Unicode/sangat panjang ke form waitlist, parameter pelajaran, localStorage,
        dan impor berkas; tidak boleh ada skrip yang jalan, galat skrip, atau data lolos aturan server.
     G. Kontrol negatif: tiap pemindai harus menangkap contoh buruk (agar uji tidak lulus karena buta).
   Batas yang diketahui: pemindai sink adalah pemindai teks (bukan parser JS penuh); pola yang disusun lewat
   penggabungan string tidak tertangkap. CSP (bagian C dan F) menjadi lapis kedua. */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { bangun } from './buat-vercel-json.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CEPAT = process.argv.includes('--cepat');
let lulus = 0, gagal = 0, bagian = '';
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log(`  GAGAL [${bagian}] ${ket}`); } };
const judul = (t) => { bagian = t[0]; console.log(`\n== ${t} ==`); };
const baca = (f) => readFileSync(join(ROOT, f), 'utf8');

/* ---------- daftar berkas ---------- */
const BIN = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|mp4|webm|mp3|zip|pdf)$/i;
function semuaBerkas() {
  const g = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })   /* termasuk berkas baru yang belum di-commit */;
  if (g.status === 0 && g.stdout) return g.stdout.split('\0').filter(Boolean);
  const out = [];
  (function jalan(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = join(d, e.name);
      if (e.isDirectory()) jalan(p); else out.push(relative(ROOT, p).split(sep).join('/'));
    }
  })(ROOT);
  return out;
}
const berkas = semuaBerkas().filter((f) => existsSync(join(ROOT, f)));
const teksBerkas = berkas.filter((f) => !BIN.test(f) && statSync(join(ROOT, f)).size < 5e6);

/* ---------- A. rahasia ---------- */
const b64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
const POLA_RAHASIA = [
  ['kunci pribadi', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY(?: BLOCK)?-----/],
  ['kunci rahasia Supabase', /\bsb_secret_[A-Za-z0-9_-]{10,}/],
  ['token GitHub', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/],
  ['kunci akses AWS', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['token Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['kunci rahasia Stripe', /\b[sr]k_live_[A-Za-z0-9]{16,}/],
  ['kunci API Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['kunci OpenAI/Anthropic', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/],
  ['sandi dalam URL koneksi', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]{3,}@/i],
  ['sandi tertulis', /\b(?:password|passwd|sandi|secret|api[_-]?key)\b["']?\s*[:=]\s*["'](?!sb_publishable_)[^"'\s]{8,}["']/i],
];
/* Kembalikan daftar temuan pada satu teks. `nama` dipakai untuk aturan khusus config.js. */
function pindaiRahasia(teks, nama) {
  const temuan = [];
  for (const [label, re] of POLA_RAHASIA) {
    const m = re.exec(teks);
    if (m) temuan.push(`${label}: ${m[0].slice(0, 12)}…`);
  }
  for (const m of teks.matchAll(/\beyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g)) {
    let role = '?'; try { role = JSON.parse(b64u(m[1])).role; } catch { /* bukan JWT */ }
    if (role === 'service_role' || role === 'supabase_admin') temuan.push('JWT service_role');
    else if (nama !== 'config.js') temuan.push(`JWT (role ${role}) di luar config.js`);
  }
  if (/\bsb_publishable_/.test(teks) && nama !== 'config.js' && !/\.(md|mjs)$/.test(nama)) temuan.push('kunci publishable di luar config.js');
  return temuan;
}
judul('A. Rahasia');
{
  const terlarang = berkas.filter((f) => /(^|\/)\.env(\.|$)|\.(pem|p12|pfx|key|jks)$|(^|\/)id_(rsa|ed25519)$|credentials\.json$|service[-_]account.*\.json$/i.test(f));
  cek(terlarang.length === 0, 'berkas rahasia terlacak: ' + terlarang.join(', '));
  let n = 0;
  for (const f of teksBerkas) {
    const t = readFileSync(join(ROOT, f), 'utf8');
    const hit = pindaiRahasia(t, f.split('/').pop());
    n++;
    cek(hit.length === 0, `${f} memuat ${hit.join('; ')}`);
  }
  console.log(`  ${n} berkas teks dipindai`);
  /* config.js: hanya kunci publik dan hanya tiga kolom */
  const cfg = baca('config.js');
  const ctx = { window: {} }; vm.runInNewContext(cfg, ctx);
  const h = ctx.window.NERUVIA_WAITLIST_HEADERS || {};
  const ep = ctx.window.NERUVIA_WAITLIST_ENDPOINT || '';
  cek(/^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\/waitlist$/.test(ep), 'config.js: endpoint bukan REST waitlist Supabase berbasis https: ' + ep);
  cek(JSON.stringify(Object.keys(h).sort()) === JSON.stringify(['Authorization', 'Prefer', 'apikey']), 'config.js: kolom header selain apikey/Authorization/Prefer: ' + Object.keys(h));
  cek(/^sb_publishable_[A-Za-z0-9_-]+$/.test(h.apikey || '') && h.Authorization === 'Bearer ' + h.apikey, 'config.js: kunci harus publishable dan sama dengan Authorization');
  cek(Object.keys(ctx.window).every((k) => k.startsWith('NERUVIA_')), 'config.js: mendefinisikan variabel global selain NERUVIA_*');
  /* riwayat git: hanya baris tambahan, tanpa memindai berkas biner */
  const g = spawnSync('git', ['log', '--all', '--no-color', '-p', '--format=commit %h', '--', '.', ':(exclude)*.mp4', ':(exclude)*.webm'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 });
  if (g.status === 0) {
    let commit = '', salah = 0, baris = 0;
    for (const l of g.stdout.split('\n')) {
      if (l.startsWith('commit ')) { commit = l.slice(7); continue; }
      if (!l.startsWith('+') || l.startsWith('+++')) continue;
      baris++;
      const hit = pindaiRahasia(l.slice(1), 'config.js');   /* nama config.js: JWT anon dan publishable diizinkan di riwayat */
      if (hit.length) { salah++; cek(false, `riwayat git, commit ${commit}: ${hit.join('; ')}`); }
    }
    cek(salah === 0, 'riwayat git bersih');
    console.log(`  riwayat git: ${baris} baris tambahan dipindai`);
  } else console.log('  riwayat git tidak bisa dibaca (dilewati)');
}

/* ---------- B. sink berbahaya ---------- */
/* Buang komentar JS dengan pemindai sederhana (aman terhadap string, templat, dan regex umum). */
function tanpaKomentarJs(src) {
  let o = '', i = 0, prev = '';
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; o += ' '; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; else if (c !== '`' && src[j] === '\n') break; j++; }
      o += src.slice(i, j + 1); i = j + 1; prev = c; continue;
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
      let j = i + 1, kelas = false;
      while (j < n && src[j] !== '\n') { const x = src[j]; if (x === '\\') j++; else if (x === '[') kelas = true; else if (x === ']') kelas = false; else if (x === '/' && !kelas) break; j++; }
      o += src.slice(i, j + 1); i = j + 1; prev = ')'; continue;
    }
    o += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return o;
}
const SINK_JS = [
  ['innerHTML/outerHTML', /\.\s*(?:inner|outer)HTML\b|\[\s*['"`](?:inner|outer)HTML['"`]\s*\]/],
  ['insertAdjacentHTML', /\binsertAdjacentHTML\b/],
  ['document.write', /\bdocument\s*\.\s*write(?:ln)?\b/],
  ['eval', /\beval\s*\(/],
  ['Function dari teks', /\bnew\s+Function\b|\bFunction\s*\(/],
  ['setTimeout/setInterval berisi teks', /\b(?:setTimeout|setInterval)\s*\(\s*['"`]/],
  ['srcdoc', /\bsrcdoc\b/],
  ['setAttribute on*', /\.setAttribute\s*\(\s*['"`]on/i],
  ['createContextualFragment', /\bcreateContextualFragment\b/],
  ['DOMParser untuk HTML', /\bDOMParser\b/],
  ['importScripts', /\bimportScripts\b/],
  ['window.open', /\bwindow\s*\.\s*open\s*\(/],
  ['postMessage ke semua asal', /postMessage\s*\([^)]*,\s*['"`]\*['"`]/],
  ['tujuan navigasi dari teks tak pasti', /\blocation(?:\s*\.\s*(?:href|assign|replace))?\s*(?:=(?!=)|\()\s*(?!['"`])[^\s)]/],
  ['javascript: pada href/src/location', /(?:\.(?:href|src|action)|\blocation)\s*=\s*['"`]\s*(?:javascript|vbscript):/i],
];
function pindaiJs(kode) {
  const bersih = tanpaKomentarJs(kode);
  return SINK_JS.filter(([, re]) => re.test(bersih)).map(([l]) => l);
}
function pindaiHtml(html) {
  const temuan = [];
  const tanpaK = html.replace(/<!--[\s\S]*?-->/g, '');
  const skrip = [];
  const sisa = tanpaK
    .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, a, isi) => { if (!/\bsrc\s*=/.test(a)) skrip.push(isi); return `<script ${a.replace(/[^\w=:/."'#-]/g, ' ')}></script>`; })
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
  for (const js of skrip) for (const l of pindaiJs(js)) temuan.push('skrip inline: ' + l);
  const tags = [...sisa.matchAll(/<([a-zA-Z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)];
  for (const [, tag, attr] of tags) {
    const t = tag.toLowerCase();
    if (/(?:^|[\s"'/])on[a-z]+\s*=/i.test(attr)) temuan.push(`atribut on* pada <${t}>`);
    if (/\b(?:href|src|action|formaction|xlink:href|data)\s*=\s*["']?\s*(?:javascript|vbscript):/i.test(attr)) temuan.push(`URL javascript: pada <${t}>`);
    if (/\b(?:href|action|formaction)\s*=\s*["']?\s*data:/i.test(attr)) temuan.push(`URL data: pada <${t}>`);
    if (/^(iframe|object|embed|applet|base|frame|frameset)$/.test(t)) temuan.push(`elemen <${t}> tidak diizinkan`);
    if (t === 'meta' && /http-equiv\s*=\s*["']?refresh/i.test(attr)) temuan.push('<meta refresh>');
    if (t === 'form' && /\baction\s*=\s*["']?\s*(?:https?:)?\/\//i.test(attr)) temuan.push('<form> mengirim ke luar');
    if (/^(script|link|img|source|video|audio|track|input)$/.test(t) && /\b(?:src|href|srcset)\s*=\s*["']?\s*(?:https?:)?\/\//i.test(attr) && !(t === 'link' && /rel\s*=\s*["']?(?:canonical|alternate|me)/i.test(attr))) temuan.push(`<${t}> memuat sumber luar`);
    if (t === 'a' && /\btarget\s*=\s*["']?_blank/i.test(attr) && !/\brel\s*=\s*["'][^"']*\bno(?:opener|referrer)\b/i.test(attr)) temuan.push('<a target=_blank> tanpa rel=noopener');
  }
  return temuan;
}
judul('B. Sink berbahaya');
{
  const html = berkas.filter((f) => f.endsWith('.html') && !f.startsWith('docs/'));
  /* Alat internal yang diketahui memakai innerHTML/insertAdjacentHTML dengan teks buatan sendiri (bukan data pengguna),
     tidak ditautkan dari situs, dan tidak punya aturan CSP (docs/security/header-csp.md). Hanya dua sink itu yang dimaafkan,
     dan hanya untuk dua berkas ini. Peringatan tetap dicetak sampai keduanya dikeluarkan dari penerbitan (PERLU-KEPUTUSAN butir 13). */
  const ALAT = new Set(['tools/video/video-px.html', 'tools/video/video-px-l.html']);
  const MAAF = new Set(['skrip inline: innerHTML/outerHTML', 'skrip inline: insertAdjacentHTML']);
  const js = berkas.filter((f) => f.endsWith('.js') && !f.startsWith('assets/vendor/') && !f.startsWith('docs/'));
  for (const f of html) {
    let t = pindaiHtml(baca(f));
    if (ALAT.has(f)) { const maaf = t.filter((x) => MAAF.has(x)); t = t.filter((x) => !MAAF.has(x)); if (maaf.length) console.log(`  PERINGATAN ${f}: ${maaf.length} sink dimaafkan (alat internal; jangan diterbitkan)`); }
    else if (f.startsWith('tools/')) { /* alat lain tetap diperiksa penuh */ }
    cek(t.length === 0, `${f}: ${t.join('; ')}`);
  }
  for (const f of js) { const t = pindaiJs(baca(f)); cek(t.length === 0, `${f}: ${t.join('; ')}`); }
  const modul = berkas.filter((f) => f.startsWith('tools/') === false && f.endsWith('.mjs'));
  for (const f of modul) { const t = pindaiJs(baca(f)); cek(t.length === 0, `${f}: ${t.join('; ')}`); }
  console.log(`  ${html.length} halaman HTML dan ${js.length} berkas JS dipindai`);
  const vend = berkas.filter((f) => f.startsWith('assets/vendor/') && f.endsWith('.js'));
  for (const f of vend) cek(existsSync(join(ROOT, 'assets/vendor/LENIS-LICENSE.txt')) && !/(?:^|[^\w])eval\s*\(/.test(baca(f)), `${f}: pustaka vendor memakai eval atau lisensi hilang`);
}

/* ---------- C. header ---------- */
const { json: jsonSeharusnya } = bangun();
const aturan = JSON.parse(jsonSeharusnya).headers;
const headerUntuk = (path) => { const h = {}; for (const a of aturan) if (a.source === '/(.*)' || a.source === path) for (const { key, value } of a.headers) h[key.toLowerCase()] = value; return h; };
judul('C. Header keamanan');
{
  cek(existsSync(join(ROOT, 'vercel.json')) && baca('vercel.json') === jsonSeharusnya, 'vercel.json tidak sesuai isi halaman (jalankan: node tools/buat-vercel-json.mjs)');
  const wajib = ['x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security', 'x-frame-options', 'cross-origin-opener-policy'];
  const halaman = berkas.filter((f) => f.endsWith('.html') && !/^(docs|tools|supabase|assets|content)\//.test(f));   /* sama dengan cakupan buat-vercel-json */
  for (const f of halaman) {
    const rute = f.endsWith('/index.html') || f === 'index.html' ? [`/${f.replace(/index\.html$/, '')}`, `/${f}`] : [`/${f}`];
    if (f.endsWith('/index.html')) rute.push(`/${f.replace(/\/index\.html$/, '')}`);
    for (const r of rute) {
      const h = headerUntuk(r), csp = h['content-security-policy'] || '';
      for (const k of wajib) cek(!!h[k], `${r}: header ${k} tidak ada`);
      cek(/default-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /base-uri 'none'/.test(csp) && /form-action/.test(csp), `${r}: CSP tidak lengkap`);
      cek(!/unsafe-inline|unsafe-eval|\*|\bdata:|\bhttp:/.test(csp), `${r}: CSP memuat unsafe-*, wildcard, data: atau http:`);
      cek(/script-src 'self'(?: 'sha256-[A-Za-z0-9+/=]+')*;/.test(csp), `${r}: script-src bukan self + hash`);
      cek(/object-src 'none'/.test(csp) || /default-src 'none'/.test(csp), `${r}: object-src tidak dikunci`);
      const koneksi = /connect-src ([^;]*)/.exec(csp);
      cek(!koneksi || koneksi[1].split(' ').every((s) => s === "'self'" || /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(s)), `${r}: connect-src memuat host selain self/Supabase: ${koneksi && koneksi[1]}`);
    }
  }
  const sama = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  cek(sama(headerUntuk('/')['strict-transport-security'].match(/max-age=(\d+)/).slice(1), ['31536000']), 'HSTS max-age harus 31536000');
}

/* ---------- D. konten kursus ---------- */
judul('D. Konten kursus');
{
  const files = berkas.filter((f) => /^content\/.*\.json$/.test(f));
  const BURUK = [['tag HTML', /<\/?[a-zA-Z!][^>]*>/], ['URL javascript:/data:/vbscript:', /(?:javascript|vbscript|data)\s*:/i], ['atribut on*', /\bon[a-z]+\s*=\s*["']/i], ['karakter kontrol atau pengecoh arah', /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u202A-\u202E\u2066-\u2069]/], ['berkas media', /\.(?:mp4|webm|mp3|wav|ogg|mov)\b/i]];
  for (const f of files) {
    let o; try { o = JSON.parse(baca(f)); } catch (e) { cek(false, `${f}: bukan JSON valid`); continue; }
    const teks = []; (function jalan(x) { if (typeof x === 'string') teks.push(x); else if (x && typeof x === 'object') { for (const [k, v] of Object.entries(x)) { teks.push(k); jalan(v); } } })(o);
    for (const [l, re] of BURUK) { const t = teks.find((s) => re.test(s)); cek(!t, `${f}: ${l}: ${t && t.slice(0, 60)}`); }
    cek(!/__proto__|"constructor"|"prototype"/.test(baca(f)), `${f}: kunci prototipe`);
  }
  console.log(`  ${files.length} berkas JSON konten`);
}

/* ---------- E. uji unit ---------- */
judul('E. Uji unit dan suite lain');
const KEY = 'neruvia.progress.v1';
function bukaProgres(simpan) {
  const store = new Map(simpan === undefined ? [] : [[KEY, simpan]]);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const window = {};
  vm.runInNewContext(baca('belajar/progress.js'), { window, localStorage, Date, JSON, Object, Array, Math, isNaN, String, Number }, { filename: 'progress.js' });
  return { NV: window.NVProgress, store };
}
{
  const IDS = ['l1-m1-p1', 'l1-m1-p2'], tgl = '2026-11-21T10:00:00.000Z';
  const berkasOk = (done) => ({ app: 'neruvia', versi: 1, done });
  const jahat = [
    '<script>window.__xss=1</script>', '"><img src=x onerror=window.__xss=1>', "l1-m1-p1'; DROP TABLE waitlist;--", '../../etc/passwd',
    '\u202El1-m1-p1', 'l1\u200B-m1-p1', 'ｌ１-ｍ１-ｐ１', '${7*7}', 'a'.repeat(100000), '\u0000', '__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty',
  ];
  for (const id of jahat) {
    const { NV, store } = bukaProgres();
    let r; try { r = NV.importData(berkasOk({ [id]: tgl }), IDS.concat([id])); } catch (e) { r = { galat: String(e) }; }
    cek(!r.galat, `impor id jahat melempar galat: ${JSON.stringify(id.slice(0, 30))}`);
    cek(Object.keys(NV.all()).every((k) => IDS.includes(k)), `impor menyimpan id jahat: ${JSON.stringify(id.slice(0, 30))}`);
    cek(({}).polluted === undefined && !('x' in {}), 'prototipe Object tercemar');
    cek(!(store.get(KEY) || '').includes('<'), 'tanda < tersimpan di localStorage');
  }
  const nilaiJahat = ['<img src=x onerror=1>', 'x'.repeat(2e6), null, [], {}, 1e308, -1, true, '2026-11-21T10:00:00.000Z\n<script>', '2026-11-21T10:00:00.000Z'.repeat(1000), { toString: 1 }];
  for (const v of nilaiJahat) {
    const { NV } = bukaProgres(); const r = NV.importData(berkasOk({ 'l1-m1-p1': v }), IDS);
    cek(r.ok === false || NV.all()['l1-m1-p1'] === undefined || /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(NV.all()['l1-m1-p1']), `nilai tanggal jahat diterima: ${JSON.stringify(v === undefined ? 'undefined' : v)?.slice(0, 30)}`);
  }
  /* bentuk berkas jahat, termasuk bersarang dalam dan banyak kunci */
  let dalam = {}; for (let i = 0; i < 5000; i++) dalam = { a: dalam };
  const banyak = {}; for (let i = 0; i < 50000; i++) banyak['l1-m1-p' + i] = tgl;
  for (const [nama, o] of [['bersarang 5000', { app: 'neruvia', versi: 1, done: dalam }], ['50000 kunci', berkasOk(banyak)], ['prototipe lewat JSON.parse', JSON.parse('{"app":"neruvia","versi":1,"done":{"__proto__":{"polluted":1},"l1-m1-p1":"' + tgl + '"}}')]]) {
    const { NV } = bukaProgres(); let r; try { r = NV.importData(o, IDS); } catch (e) { r = { galat: String(e) }; }
    cek(!r.galat, `impor ${nama} melempar galat`);
    cek(({}).polluted === undefined && Object.getPrototypeOf(NV.all()) === null, `impor ${nama}: prototipe tercemar`);
  }
  /* localStorage rusak atau jahat dibaca tanpa galat */
  for (const s of ['{"__proto__":{"polluted":1}}', '{"done":{"__proto__":"x"}}', '[', 'null', '"x"', '1', '{"done":' + '['.repeat(2000), 'x'.repeat(3e6), '{"done":{"<img src=x onerror=1>":"' + tgl + '"}}']) {
    let ok = true, k = []; try { const { NV } = bukaProgres(s); k = Object.keys(NV.all()); NV.summary([{ id: 'l1-m1-p1', xp: 10 }]); NV.streak && NV.streak(); } catch { ok = false; }
    cek(ok && k.every((x) => IDS.concat(['l1-m1-p3']).includes(x)) && ({}).polluted === undefined, `baca localStorage jahat gagal: ${s.slice(0, 40)}`);
  }
  console.log('  muatan jahat impor progres selesai');
}
{
  /* suite lain yang tidak butuh jaringan atau browser; keluar 0 berarti lulus */
  const suite = [['uji-impor-progres', []], ['uji-komentar-draf', []], ['uji-impor-draf', []], ['validasi-kursus', []], ['buat-vercel-json', ['--cek']]];
  for (const [nama, arg] of suite) {
    const p = join(ROOT, 'tools', nama + '.mjs');
    if (!existsSync(p)) { console.log(`  ${nama}: tidak ada (dilewati)`); continue; }
    const r = spawnSync(process.execPath, [p, ...arg], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    cek(r.status === 0, `${nama} gagal (kode ${r.status}): ${(r.stdout + r.stderr).trim().split('\n').slice(-3).join(' | ')}`);
    console.log(`  ${nama}: ${r.status === 0 ? 'lulus' : 'GAGAL'}`);
  }
}

/* ---------- G. kontrol negatif (dijalankan sebelum browser agar buta dideteksi cepat) ---------- */
judul('G. Kontrol negatif pemindai');
{
  const rangkai = (...p) => p.join('');
  const jwt = (muatan) => rangkai('eyJhbGciOiJIUzI1NiJ9.', Buffer.from(JSON.stringify(muatan)).toString('base64url'), '.', 'c2lnbmF0dXJlLXRpZGFr');
  const R = [
    [rangkai('-----BEGIN RSA ', 'PRIVATE KEY-----'), 'kunci pribadi'],
    [rangkai('sb_', 'secret_', 'abcdefghijklmnop'), 'sb_secret'],
    [jwt({ role: 'service_role' }), 'JWT service_role'],
    [jwt({ role: 'anon' }), 'JWT di luar config.js'],
    [rangkai('ghp', '_', 'a'.repeat(36)), 'token GitHub'],
    [rangkai('AK', 'IA', 'ABCDEFGHIJKLMNOP'), 'kunci AWS'],
    [rangkai('pass', 'word = "hunter2hunter2"'), 'sandi tertulis'],
    [rangkai('postgres', '://admin:rahasia123@host/db'), 'sandi URL'],
    [rangkai('sb_', 'publishable_abcdef'), 'publishable di luar config.js'],
  ];
  for (const [t, ket] of R) cek(pindaiRahasia(t, 'x.html').length > 0, `pemindai rahasia buta terhadap: ${ket}`);
  cek(pindaiRahasia(jwt({ role: 'service_role' }), 'config.js').length > 0, 'service_role di config.js harus tetap ditolak');
  cek(pindaiRahasia(jwt({ role: 'anon' }), 'config.js').length === 0, 'JWT anon di config.js harus lolos');
  cek(pindaiRahasia('const x = "halo dunia";', 'a.js').length === 0, 'pemindai rahasia salah menandai teks biasa');
  const J = [
    ['x.innerHTML = a', 'innerHTML'], ['x["inner"+"HTML"]', null], ['x[`innerHTML`] = a', 'innerHTML'], ['el.insertAdjacentHTML("beforeend",a)', 'insertAdjacentHTML'],
    ['document.write(a)', 'document.write'], ['eval(a)', 'eval'], ['new Function("return 1")', 'Function'], ['setTimeout("x()",5)', 'setTimeout'],
    ['f.srcdoc = a', 'srcdoc'], ['e.setAttribute("onclick","x")', 'setAttribute on'], ['window.open(u)', 'window.open'], ['location.href = u', 'navigasi'],
    ['a.href = "javascript:alert(1)"', 'javascript:'], ['w.postMessage(d,"*")', 'postMessage'], ['x.outerHTML=a', 'outerHTML'],
  ];
  for (const [k, ket] of J) if (ket) cek(pindaiJs(k).length > 0, `pemindai JS buta terhadap: ${k}`);
  const aman = ['el.textContent = a; // innerHTML tidak dipakai', '/* eval(a) */ x = 1', 'const t = /[<>"\']/g; el.textContent = a', "var s = 'ok'; location.assign('terima-kasih.html')", 'a.href = "pelajaran.html?id=" + encodeURIComponent(i)', 'const re = /\\/\\//; x.textContent = "innerHTML"'];
  cek(pindaiJs(aman[0] + '\n' + aman[1] + '\n' + aman[2] + '\n' + aman[3] + '\n' + aman[4]).length === 0, `pemindai JS salah menandai kode aman: ${pindaiJs(aman.slice(0, 5).join('\n'))}`);
  const H = [
    ['<img src=x onerror=alert(1)>', 'on*'], ['<a href="javascript:alert(1)">x</a>', 'javascript:'], ['<iframe src="/x"></iframe>', 'iframe'],
    ['<script src="https://cdn.example.com/a.js"></script>', 'sumber luar'], ['<a href="https://x.test" target="_blank">x</a>', '_blank'], ['<meta http-equiv="refresh" content="0;url=x">', 'refresh'],
    ['<form action="https://evil.test/x"></form>', 'form luar'], ['<script>document.body.innerHTML = location.hash</script>', 'skrip inline'], ['<base href="https://evil.test/">', 'base'],
    ['<button type=button\nonclick = "x()">', 'on* beda spasi'], ['<a href="data:text/html,<b>">x</a>', 'data:'],
  ];
  for (const [k, ket] of H) cek(pindaiHtml(k).length > 0, `pemindai HTML buta terhadap: ${ket}`);
  cek(pindaiHtml('<!-- <img onerror=x> --><a href="#a" target="_blank" rel="noopener noreferrer">x</a><script>var a=1</script><p>on = 5</p>').length === 0, 'pemindai HTML salah menandai halaman aman');
  console.log('  pemindai ditantang dengan contoh buruk dan aman');
}

/* ---------- F. browser ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webm': 'video/webm', '.mp4': 'video/mp4' };
function mulaiServer() {
  return new Promise((res) => {
    const s = createServer((req, resp) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = normalize(join(ROOT, p));
      if (!f.startsWith(ROOT)) { resp.writeHead(403); return resp.end(); }
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
      if (!existsSync(f) || p.includes('/.git')) { resp.writeHead(404); return resp.end('tidak ada'); }
      resp.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', ...headerUntuk(p) });
      resp.end(readFileSync(f));
    }).listen(0, '127.0.0.1', () => res({ s, base: 'http://127.0.0.1:' + s.address().port }));
  });
}
let chromium = null;
if (!CEPAT) { try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { /* dilewati */ } }
judul('F. Browser');
if (chromium) {
  const srv = await mulaiServer();
  const br = await chromium.launch();
  const JUNK = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFC]/;
  const NAME = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .'\u2019-]*$/u;
  const EMAIL = /^[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
  const KUNCI_BODY = ['name', 'email', 'jalur', 'consent', 'consent_text', 'client_ts'];
  const JALUR = ['AI dari Nol', 'AI untuk Kerja', 'AI Lanjutan', 'Masih bingung'];
  const siapkan = async (ctxOpsi = {}) => {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpsi });
    const log = { csp: [], err: [], dialog: [] };
    const page = await ctx.newPage();
    page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to|violates/i.test(t)) log.csp.push(t.slice(0, 120)); else if (m.type() === 'error' && !/Failed to load resource/.test(t)) log.err.push(t.slice(0, 120)); });
    page.on('pageerror', (e) => log.err.push('pageerror: ' + e.message.slice(0, 120)));
    page.on('dialog', (d) => { log.dialog.push(d.message()); d.dismiss(); });
    return { ctx, page, log };
  };
  const xss = (page) => page.evaluate(() => typeof window.__xss !== 'undefined');

  /* F1. form waitlist */
  {
    const { ctx, page, log } = await siapkan();
    const kirim = [];
    await page.route('https://*.supabase.co/**', (r) => { kirim.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 500, body: '{}' }); });
    await page.goto(srv.base + '/', { waitUntil: 'load' });
    await page.fill('#f-email', 'uji.keamanan@example.com'); await page.check('#f-consent');
    await page.waitForTimeout(1400);   /* lewati penjaga waktu */
    const coba = async (nama, email) => {
      kirim.length = 0;
      await page.fill('#f-name', nama); await page.fill('#f-email', email);
      await page.click('#wl button[type=submit]'); await page.waitForTimeout(260);
      return kirim[0];
    };
    const periksaBody = (b, ket) => {
      cek(Object.keys(b).every((k) => KUNCI_BODY.includes(k)), `${ket}: kunci tak dikenal di body ${Object.keys(b)}`);
      cek(b.name === null || (typeof b.name === 'string' && Array.from(b.name).length <= 60 && NAME.test(b.name) && !JUNK.test(b.name) && b.name === b.name.normalize('NFKC') && b.name === b.name.trim() && !/\s{2}/.test(b.name)), `${ket}: nama lolos tapi melanggar aturan server: ${JSON.stringify(b.name)}`);
      cek(typeof b.email === 'string' && b.email.length <= 254 && EMAIL.test(b.email) && !b.email.includes('..') && !JUNK.test(b.email) && b.email === b.email.normalize('NFKC'), `${ket}: email lolos tapi melanggar aturan server: ${JSON.stringify(b.email)}`);
      cek(b.consent === true && JALUR.includes(b.jalur) && /^v4 /.test(b.consent_text) && !isNaN(Date.parse(b.client_ts)), `${ket}: bidang tetap salah`);
    };
    const NAMA_TOLAK = ['<script>window.__xss=1</script>', '"><img src=x onerror=window.__xss=1>', '<svg/onload=window.__xss=1>', "'; DROP TABLE waitlist;--", "Robert'); DROP TABLE x;--", '" OR "1"="1',
      '=HYPERLINK("http://x.test","y")', '+1+1', '@SUM(1)', '-2+3', '\\', '${7*7}', '{{7*7}}', '%s%s%s%n', 'javascript:window.__xss=1', '../../etc/passwd', '.hidden', "'quote", '-dash',
      '😀Budi', 'Budi😀', '<b>Budi</b>', 'Budi\u0000<img>', 'Budi/*x*/', 'Budi;ls', 'Budi|id', 'Budi`id`', 'Budi$(id)'];
    for (const n of NAMA_TOLAK) { const b = await coba(n, 'ok@example.com'); cek(b === undefined, `nama jahat terkirim: ${JSON.stringify(n.slice(0, 40))}`); if (b) periksaBody(b, 'nama ' + n.slice(0, 20)); }
    /* Terlalu panjang: browser memotong di maxlength, jadi boleh terkirim asal lolos aturan server (diperiksa periksaBody). */
    const NAMA_PANJANG = ['a'.repeat(61), 'a'.repeat(100000), 'a' + '\u0301'.repeat(100), 'Budi '.repeat(40)];
    for (const n of NAMA_PANJANG) { const b = await coba(n, 'ok@example.com'); if (b) periksaBody(b, 'nama panjang'); cek(b === undefined || (b.name !== null && Array.from(b.name).length <= 60), `nama panjang lolos melebihi 60 karakter: ${JSON.stringify(n.slice(0, 20))}`); }
    const NAMA_TERIMA = [['Budi Santoso', 'Budi Santoso'], ['  Siti   Aminah  ', 'Siti Aminah'], ['ＢＵＤＩ', 'BUDI'], ['Budi\u202E', 'Budi'], ['Bu\u200Bdi', 'Budi'], ['Budi\u0000', 'Budi'], ["D'Arcy-O’Neil", "D'Arcy-O’Neil"], ['Ægir Þór', 'Ægir Þór'], ['Dewi 2', 'Dewi 2'], ['', null]];
    for (const [n, hasil] of NAMA_TERIMA) { const b = await coba(n, 'ok@example.com'); cek(b !== undefined && b.name === hasil, `nama sah ditolak atau salah dinormalkan: ${JSON.stringify(n)} → ${b && JSON.stringify(b.name)}`); if (b) periksaBody(b, 'nama sah'); }
    const EMAIL_TOLAK = ['<script>window.__xss=1</script>@x.com', 'a@b.c', 'a..b@x.com', 'a@x..com', '"a b"@x.com', 'a@x.com<img src=x onerror=window.__xss=1>', "' OR 1=1--@x.com", '=cmd|calc@x.com', '+x@example.com', '-x@example.com', '@x.com',
      'a@', 'a@@x.com', 'a b@x.com', 'a@x.com,b@y.com', 'a@x.com;b@y.com', 'a@x.com\nBcc:evil@y.com', ('a'.repeat(65)) + '@x.com', 'a@' + 'b'.repeat(64) + '.com', 'a'.repeat(300) + '@x.com', 'a@[127.0.0.1]', 'a@x.c0m'];
    for (const e of EMAIL_TOLAK) { const b = await coba('Budi', e); cek(b === undefined, `email jahat terkirim: ${JSON.stringify(e.slice(0, 40))}`); if (b) periksaBody(b, 'email ' + e.slice(0, 20)); }
    /* Karakter kontrol/bidi dibuang saat normalisasi; hasilnya harus tetap lolos aturan server. */
    for (const e of ['a@x.com\u202E', 'ａ@ｅｘａｍｐｌｅ.ｃｏｍ\u0000x', 'a@x.co\u200Bm']) { const b = await coba('Budi', e); if (b) periksaBody(b, 'email dinormalkan'); }
    const EMAIL_TERIMA = [['ok@example.com', 'ok@example.com'], ['user+tag@example.co.id', 'user+tag@example.co.id'], ['ａ@ｅｘａｍｐｌｅ.ｃｏｍ', 'a@example.com'], ['  spasi@example.com  ', 'spasi@example.com'], ['a.b-c_d%e@sub.example.org', 'a.b-c_d%e@sub.example.org']];
    for (const [e, hasil] of EMAIL_TERIMA) { const b = await coba('Budi', e); cek(b !== undefined && b.email === hasil, `email sah ditolak atau salah dinormalkan: ${JSON.stringify(e)} → ${b && JSON.stringify(b.email)}`); if (b) periksaBody(b, 'email sah'); }
    /* honeypot dan pilihan level yang dipalsukan */
    await page.fill('#f-name', 'Budi'); await page.fill('#f-email', 'ok@example.com');
    kirim.length = 0; await page.evaluate(() => { document.querySelector('#wl input[name=website]').value = 'http://spam.test'; });
    await page.click('#wl button[type=submit]'); await page.waitForTimeout(260);
    cek(kirim.length === 0, 'honeypot terisi tetap mengirim data');
    await page.evaluate(() => { document.querySelector('#wl input[name=website]').value = ''; });
    kirim.length = 0; await page.evaluate(() => { const c = document.querySelector('.chip'); c.textContent = '<img src=x onerror=window.__xss=1>'; c.click(); });
    await page.click('#wl button[type=submit]'); await page.waitForTimeout(260);
    cek(kirim.length === 0, 'level yang dipalsukan tetap terkirim');
    cek((await page.locator('#wl img, #wl script, #wl-msg *, [id^=fe-] *').count()) === 0, 'form: elemen suntikan muncul di DOM pesan galat');
    cek(!(await xss(page)), 'form: skrip suntikan berjalan');
    cek(log.dialog.length === 0, 'form: dialog (alert) muncul ' + log.dialog);
    cek(log.csp.length === 0 && log.err.length === 0, 'form: galat atau pelanggaran CSP ' + log.csp.concat(log.err).join(' | '));
    await ctx.close();
    /* penjaga waktu: kirim segera setelah mengisi */
    /* B3: Playwright kadang menahan klik >1,2 dtk (terukur 1 dari 8 putaran, juga pada kode lama), sehingga kiriman "instan" justru lolos secara sah.
       Selang fokus pertama sampai klik kirim diukur di dalam halaman; hanya percobaan dengan selang < 1 dtk yang dinilai (maks. 5 percobaan).
       Penilaian pada percobaan yang sah tidak dilonggarkan: kiriman harus tetap ditahan penjaga waktu. */
    let sah = false, k2 = [], selang = [];
    for (let coba = 0; coba < 5 && !sah; coba++) {
      const t = await siapkan(); k2 = [];
      await t.page.addInitScript(() => { window.__selang = -1; let t0 = 0; document.addEventListener('focusin', () => { if (!t0) t0 = Date.now(); }, true); document.addEventListener('click', (e) => { if (t0 && e.target && e.target.closest && e.target.closest('#wl button[type=submit]')) window.__selang = Date.now() - t0; }, true); });
      await t.page.route('https://*.supabase.co/**', (r) => { k2.push(1); r.fulfill({ status: 500, body: '{}' }); });
      await t.page.goto(srv.base + '/'); await t.page.fill('#f-email', 'cepat@example.com'); await t.page.check('#f-consent'); await t.page.click('#wl button[type=submit]'); await t.page.waitForTimeout(260);
      const sl = await t.page.evaluate(() => window.__selang); selang.push(sl);
      sah = sl >= 0 && sl < 1000;
      await t.ctx.close();
    }
    cek(sah, 'penjaga waktu: tidak ada percobaan dengan selang < 1 dtk (selang ms: ' + selang.join(', ') + ')');
    cek(!sah || k2.length === 0, 'penjaga waktu: kiriman instan (bot) lolos');
    console.log('  form waitlist: payload ' + (NAMA_TOLAK.length + NAMA_PANJANG.length + NAMA_TERIMA.length + EMAIL_TOLAK.length + EMAIL_TERIMA.length) + ' kasus');
  }

  /* F2. parameter id pelajaran */
  {
    const { ctx, page, log } = await siapkan();
    const minta = [];
    page.on('request', (r) => { if (/content\/pelajaran\//.test(r.url())) minta.push(new URL(r.url()).pathname); });
    const IDS_JAHAT = ['<img src=x onerror=window.__xss=1>', '"><svg onload=window.__xss=1>', "l1-m1-p1'\"><svg onload=window.__xss=1>", '__proto__', 'constructor', 'prototype', 'toString', '../../../etc/passwd', '..%2f..%2fconfig', 'l1-m1-p1%00', 'a'.repeat(5000),
      'javascript:window.__xss=1', '\u202El1-m1-p1', '${7*7}', "' OR '1'='1", '', ' ', 'l1-m1-p1&id=x', '%'];
    for (const id of IDS_JAHAT) {
      minta.length = 0;
      await page.goto(srv.base + '/belajar/pelajaran.html?id=' + encodeURIComponent(id), { waitUntil: 'load' }); await page.waitForTimeout(250);
      cek(!(await xss(page)), `pelajaran id jahat menjalankan skrip: ${JSON.stringify(id.slice(0, 30))}`);
      cek((await page.locator('#isi img, #isi svg[onload], #isi script, #isi iframe').count()) === 0, `pelajaran id jahat menyuntik elemen: ${JSON.stringify(id.slice(0, 30))}`);
      cek(minta.every((p) => /^\/content\/pelajaran\/l\d-m\d-p\d+\.json$/.test(p)), `pelajaran id jahat meminta berkas di luar daftar: ${minta}`);
    }
    await page.goto(srv.base + '/belajar/pelajaran.html?id=l1-m1-p1', { waitUntil: 'load' }); await page.waitForTimeout(400);
    cek((await page.locator('#isi h1').count()) > 0, 'pelajaran sah tidak tampil');
    cek(log.dialog.length === 0, 'pelajaran: dialog muncul ' + log.dialog);
    cek(log.csp.length === 0 && log.err.length === 0, 'pelajaran: galat/CSP ' + log.csp.concat(log.err).join(' | '));
    await ctx.close();
    console.log('  parameter id pelajaran: ' + IDS_JAHAT.length + ' kasus');
  }

  /* F3. localStorage jahat dan impor berkas di galeri dan pelajaran */
  {
    const tgl = '2026-11-21T10:00:00.000Z';
    const jahat = JSON.stringify({ done: { '<img src=x onerror=window.__xss=1>': tgl, '__proto__': tgl, 'constructor': tgl, 'l1-m1-p1': '<svg onload=window.__xss=1>', 'l1-m1-p2': tgl, ['a'.repeat(5000)]: tgl } });
    for (const [nama, simpan] of [['jahat', jahat], ['bukan JSON', 'bukan json {<script>'], ['larik', '[]'], ['besar', 'x'.repeat(2e6)]]) {
      const { ctx, page, log } = await siapkan();
      await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }, [KEY, simpan]);
      for (const url of ['/belajar/', '/belajar/pelajaran.html?id=l1-m1-p1', '/belajar/pelajaran.html?id=l1-m1-p2']) {
        await page.goto(srv.base + url, { waitUntil: 'load' }); await page.waitForTimeout(350);
        cek(!(await xss(page)), `localStorage ${nama}: skrip berjalan di ${url}`);
        cek((await page.locator('img[src=x], svg[onload]').count()) === 0, `localStorage ${nama}: elemen suntikan di ${url}`);
      }
      cek(log.dialog.length === 0 && log.err.length === 0 && log.csp.length === 0, `localStorage ${nama}: galat ${log.err.concat(log.csp, log.dialog).join(' | ')}`);
      await ctx.close();
    }
    const { ctx, page, log } = await siapkan();
    await page.goto(srv.base + '/belajar/', { waitUntil: 'load' }); await page.waitForTimeout(400);
    const berkasUji = [
      ['jahat.json', JSON.stringify({ app: 'neruvia', versi: 1, done: { '<img src=x onerror=window.__xss=1>': tgl, '__proto__': tgl, 'l1-m1-p1': tgl, ['a'.repeat(300)]: tgl } }), null],
      ['rusak.json', '{"app":', /bukan JSON/],
      ['besar.json', JSON.stringify({ app: 'neruvia', versi: 1, done: { 'l1-m1-p1': tgl + ' '.repeat(120000) } }), /terlalu besar/],
      ['salah.json', JSON.stringify({ app: 'lain', versi: 1, done: {} }), /tidak dikenali/],
      ['larik.json', '[1,2,3]', /tidak dikenali/],
      ['proto.json', '{"app":"neruvia","versi":1,"done":{"__proto__":{"polluted":"x"},"l1-m1-p1":"' + tgl + '"}}', null],
    ];
    for (const [nama, isi, harap] of berkasUji) {
      await page.setInputFiles('#bk-in', { name: nama, mimeType: 'application/json', buffer: Buffer.from(isi) }); await page.waitForTimeout(250);
      const pesan = await page.textContent('#bk-msg');
      if (harap) cek(harap.test(pesan), `impor ${nama}: pesan tidak sesuai: ${pesan}`);
      cek(!(await xss(page)), `impor ${nama}: skrip berjalan`);
      cek((await page.locator('#bk-msg *, img[src=x]').count()) === 0, `impor ${nama}: elemen suntikan`);
      cek(await page.evaluate(() => ({}).polluted === undefined), `impor ${nama}: prototipe tercemar`);
    }
    const sisa = JSON.parse(await page.evaluate((k) => localStorage.getItem(k) || '{"done":{}}', KEY)).done;
    cek(Object.keys(sisa).every((k) => /^l\d-m\d-p\d+$/.test(k)), 'impor: id tak sah tersimpan di localStorage: ' + Object.keys(sisa).join(','));
    cek(log.dialog.length === 0 && log.err.length === 0 && log.csp.length === 0, 'impor: galat ' + log.err.concat(log.csp, log.dialog).join(' | '));
    await ctx.close();
    console.log('  localStorage dan impor berkas di galeri diuji');
  }

  /* F4. header respons nyata dan kontrol negatif CSP */
  {
    for (const p of ['/', '/belajar/', '/belajar/pelajaran.html', '/terima-kasih.html', '/kebijakan-privasi.html', '/admin/']) {
      const r = await fetch(srv.base + p);
      cek(!!r.headers.get('content-security-policy') && r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('x-frame-options') === 'DENY', `${p}: header respons tidak lengkap`);
    }
    const { ctx, page, log } = await siapkan();
    await page.goto(srv.base + '/belajar/', { waitUntil: 'load' });
    const hasil = await page.evaluate(() => { try { const s = document.createElement('script'); s.textContent = 'window.__xss=1'; document.head.appendChild(s); } catch (e) { /* abaikan */ } return typeof window.__xss; });   /* eval tidak diuji di sini: evaluate() milik Playwright melewati larangan eval; unsafe-eval dicek di bagian C */
    cek(hasil === 'undefined', 'CSP tidak memblokir skrip inline: ' + hasil);
    const luar = await page.evaluate(() => fetch('https://example.com/', { mode: 'no-cors' }).then(() => 'lolos', () => 'diblokir'));
    cek(luar === 'diblokir', 'CSP tidak memblokir koneksi ke host luar');
    cek(log.csp.length >= 2, 'kontrol negatif CSP tidak menghasilkan pelanggaran yang dilaporkan: ' + log.csp.length);
    await ctx.close();
  }
  await br.close(); srv.s.close();
} else {
  console.log(CEPAT ? '  dilewati (--cepat)' : '  Playwright tidak tersedia: uji browser dilewati.');
}

console.log(`\n${lulus} pemeriksaan lulus, ${gagal} gagal${chromium ? '' : ' (uji browser dilewati)'}`);
process.exit(gagal ? 1 : (chromium || CEPAT ? 0 : 2));
