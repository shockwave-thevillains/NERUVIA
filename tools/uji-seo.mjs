#!/usr/bin/env node
/* Uji tools/buat-seo.mjs (kegiatan H1). Tanpa dependensi npm; Playwright (bila ada) untuk uji browser.

   Pakai:
     node tools/uji-seo.mjs            semua uji (data buatan di folder sementara + keadaan repo + browser)
     node tools/uji-seo.mjs --cepat    tanpa browser
     node tools/uji-seo.mjs --ukur     hanya cetak ukuran meta tiap halaman dan status robots.txt/sitemap.xml
                                       lewat server lokal, tiga putaran (alat ukur sebelum dan sesudah)
   Kode keluar: 0 lulus; 1 gagal; 2 lulus tetapi uji browser dilewati (Playwright tidak ada). */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync, statSync, readdirSync, cpSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2);
if (arg.some((a) => a !== '--cepat' && a !== '--ukur')) { console.error('Pakai: node tools/uji-seo.mjs [--cepat | --ukur]'); process.exit(1); }
const CEPAT = arg.includes('--cepat'), UKUR = arg.includes('--ukur');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const layani = (akar) => new Promise((res) => {
  const s = createServer((req, resp) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { resp.writeHead(400); return resp.end(); }
    let f = normalize(join(akar, p));
    if (f !== normalize(akar + sep) && !f.startsWith(normalize(akar + sep))) { resp.writeHead(403); return resp.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { resp.writeHead(404); return resp.end('tidak ada'); }
    resp.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    resp.end(readFileSync(f));
  }).listen(0, '127.0.0.1', () => res(s));
});
let chromium = null;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { /* dilewati */ }

/* ---------- mode ukur: tidak bergantung pada buat-seo.mjs ---------- */
if (UKUR) {
  if (!chromium) { console.error('Playwright tidak tersedia'); process.exit(2); }
  const halaman = ['index.html', 'kebijakan-privasi.html', 'terima-kasih.html', 'belajar/index.html', 'belajar/pelajaran.html', 'admin/index.html', 'tools/video/video-px.html', 'tools/video/video-px-l.html'];
  const server = await layani(ROOT), base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const putaran = [];
  for (let i = 0; i < 3; i++) {
    const hasil = { berkas: {}, halaman: {} };
    for (const f of ['robots.txt', 'sitemap.xml']) { const r = await fetch(`${base}/${f}`); const t = await r.text(); hasil.berkas[f] = { status: r.status, byte: r.ok ? Buffer.byteLength(t) : 0 }; }
    for (const h of halaman) {
      const ctx = await browser.newContext({ javaScriptEnabled: false }); const page = await ctx.newPage();
      await page.goto(`${base}/${h}`, { waitUntil: 'domcontentloaded' });
      hasil.halaman[h] = await page.evaluate(() => {
        const m = (s) => document.querySelector(s)?.getAttribute('content') ?? null;
        return {
          judul: document.title.length, deskripsi: (m('meta[name="description"]') || '').length, robots: m('meta[name="robots"]'),
          og: [...document.querySelectorAll('meta[property^="og:"]')].map((x) => x.getAttribute('property')),
          twitter: [...document.querySelectorAll('meta[name^="twitter:"]')].map((x) => x.getAttribute('name')),
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
        };
      });
      await ctx.close();
    }
    putaran.push(hasil);
  }
  await browser.close(); server.close();
  const sama = putaran.every((p) => JSON.stringify(p) === JSON.stringify(putaran[0]));
  console.log(JSON.stringify({ putaran: 3, identik: sama, hasil: putaran[0] }, null, 1));
  process.exit(sama ? 0 : 1);
}

const S = await import('./buat-seo.mjs');
let lulus = 0, gagal = 0, bagian = '', negatif = 0;
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log(`  GAGAL [${bagian}] ${ket}`); } };
const tolak = (ok, ket) => { negatif++; cek(ok, ket); };
const judul = (t) => { bagian = t[0]; console.log(`\n== ${t} ==`); };

/* ---------- A. alamat ---------- */
judul('A. Alamat dasar');
cek(S.periksaAlamat('').nilai === '' && !S.periksaAlamat('').galat, 'kosong diterima sebagai belum ditetapkan');
for (const a of ['https://neruvia-uji.contoh/', 'https://www.neruvia-uji.contoh/', 'https://xn--nruvia-bva.contoh/', 'https://a-b.c-d.contoh/situs/']) {
  const r = S.periksaAlamat(a); cek(r.nilai === a && !r.galat, 'diterima: ' + a + ' ' + r.galat);
}
cek(S.periksaAlamat('https://a.contoh/sub/').peringatan.length === 1, 'subfolder diberi peringatan robots.txt');
cek(S.periksaAlamat('https://a.contoh/').peringatan.length === 0, 'akar host tanpa peringatan');
const BURUK = [
  undefined, null, 5, true, {}, ['https://a.contoh/'], ' https://a.contoh/', 'https://a.contoh/ ', 'http://a.contoh/', 'HTTPS://a.contoh/', '//a.contoh/', 'a.contoh/', '/', 'javascript:alert(1)', 'data:text/html,x',
  'https://a.contoh', 'https://a.contoh/x', 'https://a.contoh/?q=1', 'https://a.contoh/#x', 'https://user@a.contoh/', 'https://user:sandi@a.contoh/', 'https://a.contoh:8080/', 'https://a.contoh:443/',
  'https://127.0.0.1/', 'https://10.0.0.1/', 'https://[::1]/', 'https://2130706433/', 'https://localhost/', 'https://situs/', 'https://a.localhost/', 'https://a.local/', 'https://a.test/', 'https://a.invalid/', 'https://a.example/',
  'https://example.com/', 'https://www.example.org/', 'https://A.contoh/', 'https://a.contoh/../', 'https://a.contoh/./', 'https://a.contoh//x/', 'https://a.contoh/%2e%2e/', 'https://a.contoh/"><script>alert(1)</script>/',
  "https://a.contoh/'/", 'https://a.contoh/\n Sitemap: https://jahat.contoh/', 'https://a.contoh/\r\nUser-agent: *\r\n/', 'https://a.contoh\\@jahat.contoh/', 'https://a.contoh/\u202e/', 'https://nëruvia.contoh/', 'https://-a.contoh/', 'https://a-.contoh/', 'https://a..contoh/', 'https://a.contoh./', 'https://a.123/',
  'https://' + 'a'.repeat(300) + '.contoh/',
];
for (const a of BURUK) { const r = S.periksaAlamat(a); tolak(r.nilai === null && !!r.galat, 'harus ditolak: ' + JSON.stringify(a)?.slice(0, 80)); }

/* tiap aturan punya masukan yang hanya ditangkap aturan itu, dengan pesan yang sesuai */
for (const [a, pola] of [
  ['https://a.contoh/?x=/', /tidak boleh memuat tanda/], ['https://a.contoh/#/', /tidak boleh memuat tanda/], ['https://a.contoh/?', /tidak boleh memuat tanda/],
  ['https://127.0.0.1/', /alamat IP/], ['https://[::1]/', /alamat IP/], ['https://a.contoh', /diakhiri \//], ['https://a.contoh/x', /diakhiri \//],
]) { const r = S.periksaAlamat(a); tolak(r.nilai === null && pola.test(r.galat || ''), `ditolak dengan alasan yang tepat: ${a} (${r.galat})`); }

/* ---------- B. pembacaan meta robots ---------- */
judul('B. noindex');
const kepala = (x) => `<!doctype html><html><head>${x}</head><body></body></html>`;
for (const x of ['<meta name="robots" content="noindex">', "<meta content='noindex, nofollow' name='robots'>", '<META NAME=ROBOTS CONTENT=NOINDEX>', '<meta name="googlebot" content="noindex">', '<meta name="robots" content="none">', '<meta data-x="a>b" name="robots" content="follow,noindex" />'])
  cek(S.noindex(kepala(x)), 'terbaca noindex: ' + x);
for (const x of ['', '<meta name="robots" content="index, follow">', '<!-- <meta name="robots" content="noindex"> -->', '<script>var s = \'<meta name="robots" content="noindex">\';</script>', '<style>/* <meta name="robots" content="noindex"> */</style>', '<template><meta name="robots" content="noindex"></template>', '<title><meta name="robots" content="noindex"></title>', '<meta data-name="robots" content="noindex">', '<meta name="description" content="noindex">', '<meta name="robots" content="noindexx">', '<meta name="description" content=\'<meta name="robots" content="noindex">\'>', '<!-- belum ditutup <meta name="robots" content="noindex">', '<meta name="robots" content="index" content="noindex">'])
  tolak(!S.noindex(kepala(x)), 'bukan noindex: ' + x);
cek(S.jalurUrl('index.html') === '' && S.jalurUrl('belajar/index.html') === 'belajar/' && S.jalurUrl('a/b.html') === 'a/b.html', 'jalur URL');

/* ---------- data buatan ---------- */
const sementara = [];
const png = (w, h, isi = 0) => { const b = Buffer.alloc(33 + isi); b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(0x0d0a1a0a, 4); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
const ATUR = () => ({ alamat_dasar: '', halaman_terindeks: ['index.html'], halaman_meta: 'index.html', gambar_og: { berkas: 'assets/og.png', alt: 'Kartu uji' } });
const BERANDA = `<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n<title>Uji</title>\n<meta property="og:title" content="Uji">\n${S.BLOK_MULAI}\n${S.BLOK_SELESAI}\n</head>\n<body><h1>Uji</h1></body>\n</html>\n`;
const NOINDEX = kepala('<meta name="robots" content="noindex">');
function tulis(d, f, isi) { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), isi); }
function buat(ubah = {}) {
  const d = mkdtempSync(join(tmpdir(), 'seo-')); sementara.push(d);
  tulis(d, 'index.html', BERANDA); tulis(d, 'admin/index.html', NOINDEX); tulis(d, 'rahasia.html', NOINDEX);
  tulis(d, 'tools/alat.html', kepala('')); tulis(d, 'docs/contoh.html', kepala('')); tulis(d, 'assets/og.png', png(1200, 630));
  tulis(d, S.BERKAS_PENGATURAN, JSON.stringify({ ...ATUR(), ...ubah }));
  return d;
}
const ada = (d, f) => existsSync(join(d, f));
const baca = (d, f) => readFileSync(join(d, f), 'utf8');
const galatDari = (d) => { try { return S.jalankan(d).galat.join(' | '); } catch (e) { return 'LEMPAR ' + e.message; } };

/* ---------- C. hasil ---------- */
judul('C. Hasil tanpa dan dengan alamat');
{
  const d = buat(); let r = S.jalankan(d, { cek: true });
  cek(r.kode === 1 && r.beda.includes('robots.txt') && !ada(d, 'robots.txt'), '--cek melaporkan beda tanpa menulis');
  r = S.jalankan(d); cek(r.kode === 0, 'tulis berhasil: ' + r.galat);
  const rb = baca(d, 'robots.txt');
  cek(/^User-agent: \*$/m.test(rb) && /^Allow: \/$/m.test(rb), 'robots dasar');
  cek(!/sitemap:/i.test(rb.replace(/^#.*$/gm, '')) && !/disallow/i.test(rb.replace(/^#.*$/gm, '')), 'tanpa alamat: tanpa Sitemap dan tanpa Disallow');
  cek(!ada(d, 'sitemap.xml'), 'tanpa alamat: sitemap.xml tidak dibuat');
  cek(baca(d, 'index.html') === BERANDA, 'tanpa alamat: beranda tidak berubah');
  cek(r.peringatan.some((w) => w.includes('alamat_dasar kosong')), 'peringatan alamat kosong');
  cek(S.jalankan(d, { cek: true }).kode === 0, '--cek lulus sesudah menulis');

  tulis(d, S.BERKAS_PENGATURAN, JSON.stringify({ ...ATUR(), alamat_dasar: 'https://neruvia-uji.contoh/', gambar_og: { berkas: 'assets/og.png', alt: 'Kartu "uji" <b>& \'x\'' } }));
  r = S.jalankan(d); cek(r.kode === 0 && r.beda.sort().join() === 'index.html,robots.txt,sitemap.xml', 'alamat diisi menulis tiga berkas: ' + r.galat + r.beda);
  cek(/^Sitemap: https:\/\/neruvia-uji\.contoh\/sitemap\.xml$/m.test(baca(d, 'robots.txt')), 'baris Sitemap mutlak');
  const sm = baca(d, 'sitemap.xml');
  cek(sm.startsWith('<?xml version="1.0" encoding="UTF-8"?>') && sm.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'deklarasi dan namespace sitemap');
  cek([...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).join() === 'https://neruvia-uji.contoh/', 'hanya halaman terindeks, tanpa admin, tools, docs');
  cek(!/lastmod|priority|changefreq/.test(sm), 'tanpa lastmod/priority/changefreq');
  const h = baca(d, 'index.html');
  cek(h.includes('<link rel="canonical" href="https://neruvia-uji.contoh/">') && h.includes('content="https://neruvia-uji.contoh/assets/og.png"'), 'canonical dan og:image mutlak');
  cek(h.includes('content="Kartu &quot;uji&quot; &lt;b&gt;&amp; &apos;x&apos;"') && !h.includes('<b>'), 'alt di-escape');
  cek(h.includes('og:image:width" content="1200"') && h.includes('og:image:height" content="630"') && h.includes('og:image:type" content="image/png"'), 'ukuran dan jenis gambar');
  const sebelum = [h, sm, baca(d, 'robots.txt')].join('\0');
  r = S.jalankan(d); cek(r.beda.length === 0 && [baca(d, 'index.html'), baca(d, 'sitemap.xml'), baca(d, 'robots.txt')].join('\0') === sebelum, 'idempoten');
  tulis(d, 'index.html', h.replace('content="1200"', 'content="1"'));
  r = S.jalankan(d, { cek: true }); tolak(r.kode === 1 && r.beda.join() === 'index.html', '--cek menangkap blok yang diubah tangan');
  tulis(d, S.BERKAS_PENGATURAN, JSON.stringify(ATUR())); r = S.jalankan(d);
  cek(r.kode === 0 && !ada(d, 'sitemap.xml') && baca(d, 'index.html') === BERANDA, 'alamat dikosongkan: kembali seperti semula');
  const sub = buat({ alamat_dasar: 'https://pemilik.contoh/Situs/', halaman_terindeks: ['index.html', 'galeri/index.html', 'a/b_c.html'] });
  tulis(sub, 'galeri/index.html', kepala('')); tulis(sub, 'a/b_c.html', kepala('')); tulis(sub, '404.html', kepala(''));
  r = S.jalankan(sub); cek(r.kode === 0, 'subfolder dan beberapa halaman: ' + r.galat);
  cek([...baca(sub, 'sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).join(' ') === 'https://pemilik.contoh/Situs/a/b_c.html https://pemilik.contoh/Situs/galeri/ https://pemilik.contoh/Situs/', '404.html tidak masuk; urutan tetap');
}

/* ---------- D. penolakan ---------- */
judul('D. Penolakan');
const harapGalat = (ket, siap, pola, ubah) => {
  const d = buat(ubah); if (siap) siap(d);
  const awal = ada(d, 'index.html') ? baca(d, 'index.html') : null;
  const g = galatDari(d);
  tolak(pola.test(g) && !g.startsWith('LEMPAR'), `${ket}: ${g.slice(0, 160) || '(tanpa galat)'}`);
  cek(!ada(d, 'sitemap.xml') || /bukan buatan|bukan berkas/.test(g), `${ket}: tidak membuat sitemap saat gagal`);
  if (awal !== null) cek(baca(d, 'index.html') === awal, `${ket}: beranda tidak diubah`);
};
const A = 'https://neruvia-uji.contoh/';
harapGalat('halaman baru tanpa noindex', (d) => tulis(d, 'baru.html', kepala('')), /baru\.html: tidak memakai noindex/, { alamat_dasar: A });
harapGalat('admin kehilangan noindex', (d) => tulis(d, 'admin/index.html', kepala('')), /admin\/index\.html: tidak memakai noindex/);
harapGalat('noindex hanya di komentar', (d) => tulis(d, 'rahasia.html', kepala('<!--<meta name="robots" content="noindex">-->')), /rahasia\.html: tidak memakai noindex/);
harapGalat('beranda ber-noindex', (d) => tulis(d, 'index.html', BERANDA.replace('<title>', '<meta name="robots" content="noindex"><title>')), /index\.html: terdaftar/);
harapGalat('halaman terdaftar tidak ada', null, /hilang\.html: terdaftar/, { halaman_terindeks: ['index.html', 'hilang.html'] });
harapGalat('halaman tautan simbolik', (d) => symlinkSync('/etc/hostname', join(d, 'tautan.html')), /tautan\.html: bukan berkas biasa/);
harapGalat('halaman tautan simbolik di dalam repo', (d) => symlinkSync('rahasia.html', join(d, 'tautan.html')), /tautan\.html: bukan berkas biasa/);
harapGalat('gambar tautan simbolik di dalam repo', (d) => symlinkSync('og.png', join(d, 'assets/t.png')), /bukan berkas biasa/, { gambar_og: { berkas: 'assets/t.png', alt: 'x' } });
harapGalat('pengaturan tautan simbolik', (d) => { tulis(d, 'tools/asli.json', JSON.stringify(ATUR())); rmSync(join(d, S.BERKAS_PENGATURAN)); symlinkSync('asli.json', join(d, S.BERKAS_PENGATURAN)); }, /bukan berkas biasa/);
harapGalat('alamat jahat', null, /alamat_dasar/, { alamat_dasar: 'https://a.contoh/\nDisallow: /' });
harapGalat('kunci tidak dikenal', null, /kunci tidak dikenal/, { alamat: A });
harapGalat('kunci __proto__', (d) => tulis(d, S.BERKAS_PENGATURAN, '{"__proto__":{"x":1},' + JSON.stringify(ATUR()).slice(1)), /kunci tidak dikenal/);
harapGalat('JSON rusak', (d) => tulis(d, S.BERKAS_PENGATURAN, '{"alamat_dasar":'), /bukan JSON/);
harapGalat('JSON larik', (d) => tulis(d, S.BERKAS_PENGATURAN, '[]'), /satu objek/);
harapGalat('JSON null', (d) => tulis(d, S.BERKAS_PENGATURAN, 'null'), /satu objek/);
harapGalat('pengaturan raksasa', (d) => tulis(d, S.BERKAS_PENGATURAN, JSON.stringify({ ...ATUR(), catatan: 'x'.repeat(20000) })), /terlalu besar/);
harapGalat('pengaturan hilang', (d) => rmSync(join(d, S.BERKAS_PENGATURAN)), /tidak ada/);
harapGalat('daftar keluar repo', null, /halaman_terindeks/, { halaman_terindeks: ['../x.html'] });
harapGalat('daftar ganda', null, /halaman_terindeks/, { halaman_terindeks: ['index.html', 'index.html'] });
harapGalat('daftar bukan larik', null, /halaman_terindeks/, { halaman_terindeks: 'index.html' });
harapGalat('halaman_meta di luar daftar', null, /halaman_meta harus termasuk/, { halaman_meta: 'admin/index.html' });
harapGalat('halaman_meta jalur mutlak', null, /halaman_meta/, { halaman_meta: '/etc/x.html' });
const og = (berkas, alt = 'x') => ({ gambar_og: { berkas, alt } });
harapGalat('gambar traversal', null, /di dalam assets/, og('assets/../tools/x.png'));
harapGalat('gambar URL luar', null, /di dalam assets/, og('https://jahat.contoh/x.png'));
harapGalat('gambar SVG', null, /di dalam assets/, og('assets/x.svg'));
harapGalat('gambar hilang', null, /tidak ada/, og('assets/hilang.png'));
harapGalat('gambar tautan simbolik', (d) => symlinkSync('/etc/hostname', join(d, 'assets/t.png')), /bukan berkas biasa/, og('assets/t.png'));
harapGalat('folder gambar tautan keluar', (d) => { const luar = mkdtempSync(join(tmpdir(), 'seo-luar-')); sementara.push(luar); writeFileSync(join(luar, 'x.png'), png(1200, 630)); symlinkSync(luar, join(d, 'assets/luar')); }, /bukan berkas biasa/, og('assets/luar/x.png'));
harapGalat('gambar teks', (d) => tulis(d, 'assets/og.png', 'bukan gambar'), /bukan PNG atau JPEG/);
harapGalat('isi tidak sesuai ekstensi', (d) => tulis(d, 'assets/og.jpg', png(1200, 630)), /ekstensinya/, og('assets/og.jpg'));
harapGalat('JPEG terpotong', (d) => tulis(d, 'assets/og.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0, 0, 0, 0, 0, 0])), /bukan PNG atau JPEG/, og('assets/og.jpg'));
harapGalat('gambar kecil', (d) => tulis(d, 'assets/og.png', png(400, 210)), /terlalu kecil/);
harapGalat('gambar persegi', (d) => tulis(d, 'assets/og.png', png(1024, 1024)), /rasio/);
harapGalat('gambar berat', (d) => tulis(d, 'assets/og.png', png(1200, 630, 260 * 1024)), /melebihi/);
harapGalat('alt kosong', null, /alt/, og('assets/og.png', '  '));
harapGalat('alt panjang', null, /alt/, og('assets/og.png', 'a'.repeat(421)));
harapGalat('alt penanda bidi', null, /alt/, og('assets/og.png', 'a\u202eb'));
harapGalat('alt baris baru', null, /alt/, og('assets/og.png', 'a\nb'));
harapGalat('gambar_og kunci lebih', null, /tepat dua kunci/, { gambar_og: { berkas: 'assets/og.png', alt: 'x', lain: 1 } });
harapGalat('penanda hilang', (d) => tulis(d, 'index.html', kepala('')), /tepat satu pasang/);
harapGalat('penanda ganda', (d) => tulis(d, 'index.html', BERANDA.replace('</head>', S.BLOK_MULAI + '\n' + S.BLOK_SELESAI + '</head>')), /tepat satu pasang/);
harapGalat('penanda terbalik', (d) => tulis(d, 'index.html', kepala(S.BLOK_SELESAI + S.BLOK_MULAI)), /terbalik/);
harapGalat('penanda di body', (d) => tulis(d, 'index.html', `<html><head></head><body>${S.BLOK_MULAI}${S.BLOK_SELESAI}</body></html>`), /dalam <head>/);
for (const [n, t] of [['canonical', '<link rel="canonical" href="https://lain.contoh/">'], ['og:image', '<meta property="og:image" content="x.png">'], ['og:url', '<meta property="og:url" content="/">'], ['twitter:card', '<meta name="twitter:card" content="summary">']])
  harapGalat('tag liar ' + n, (d) => tulis(d, 'index.html', BERANDA.replace('<title>', t + '<title>')), new RegExp('di luar blok seo: ' + n));
harapGalat('robots.txt buatan tangan', (d) => tulis(d, 'robots.txt', 'User-agent: *\nDisallow: /\n'), /robots\.txt: sudah ada/);
harapGalat('sitemap buatan tangan tidak dihapus', (d) => tulis(d, 'sitemap.xml', '<urlset/>'), /sitemap\.xml: sudah ada/);
harapGalat('robots.txt tautan simbolik', (d) => symlinkSync('/etc/hostname', join(d, 'robots.txt')), /robots\.txt: bukan berkas biasa/);
harapGalat('sitemap tautan putus', (d) => symlinkSync(join(d, 'tidak-ada'), join(d, 'sitemap.xml')), /sitemap\.xml: bukan berkas biasa/, { alamat_dasar: A });
{
  const d = buat(); tulis(d, 'robots.txt', 'tangan'); S.jalankan(d); cek(baca(d, 'robots.txt') === 'tangan', 'berkas tangan tetap utuh');
  const cli = (...a) => spawnSync(process.execPath, [join(ROOT, 'tools/buat-seo.mjs'), ...a], { encoding: 'utf8' });
  const e = buat();
  tolak(cli('--akar=' + e, '--cek').status === 1 && !ada(e, 'robots.txt'), 'CLI --cek keluar 1 saat beda');
  cek(cli('--akar=' + e).status === 0 && cli('--akar=' + e, '--cek').status === 0, 'CLI tulis lalu --cek keluar 0');
  tolak(cli('--hapus').status === 1, 'CLI argumen asing');
  tolak(cli('--akar=').status === 1, 'CLI --akar kosong');
  tolak(cli('--akar=' + join(e, 'tidak-ada')).status === 1, 'CLI akar tidak ada');
}

/* ---------- E. keadaan repo ---------- */
judul('E. Keadaan repo');
{
  const r = S.jalankan(ROOT, { cek: true });
  cek(r.kode === 0, 'repo sesuai pengaturan: ' + [...r.galat, ...r.beda].join('; '));
  const atur = S.bacaPengaturan(ROOT);
  cek(atur.galat.length === 0 && atur.terindeks.join() === 'index.html', 'hanya beranda yang boleh diindeks');
  for (const h of S.daftarHalaman(ROOT)) if (h !== 'index.html') cek(S.noindex(readFileSync(join(ROOT, h), 'utf8')), h + ' memakai noindex');
  for (const f of readdirSync(join(ROOT, 'tools/video')).filter((x) => x.endsWith('.html'))) cek(S.noindex(readFileSync(join(ROOT, 'tools/video', f), 'utf8')), 'tools/video/' + f + ' memakai noindex (ikut terbit)');
  const rb = readFileSync(join(ROOT, 'robots.txt'), 'utf8').replace(/^#.*$/gm, '');
  cek(!/disallow/i.test(rb), 'robots.txt tidak memblokir halaman ber-noindex');
  const buf = readFileSync(join(ROOT, atur.gambar?.berkas || 'tidak-ada'));
  const u = S.ukuranGambar(buf);
  cek(u && u.w === 1200 && u.h === 630 && u.jenis === 'image/jpeg' && buf.length < 150 * 1024, `kartu 1200x630 JPEG di bawah 150 KB (${buf.length} byte)`);
  const beranda = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const meta = S.tagBernama(beranda, 'meta');
  const nilai = (k) => meta.filter((a) => (a.property || a.name) === k).map((a) => a.content);
  for (const k of ['description', 'og:type', 'og:title', 'og:description', 'og:locale', 'og:site_name']) cek(nilai(k).length === 1 && nilai(k)[0].trim().length > 0, `beranda: satu ${k}`);
  cek(nilai('og:site_name')[0] === 'NERUVIA', 'og:site_name');
  if (!atur.dasar) cek(!existsSync(join(ROOT, 'sitemap.xml')) && nilai('og:image').length === 0 && nilai('og:url').length === 0, 'alamat belum ditetapkan: tanpa sitemap, og:image, og:url');
}

/* ---------- F. browser ---------- */
let lewati = false;
if (!CEPAT) {
  judul('F. Browser (salinan repo, alamat uji)');
  if (!chromium) { lewati = true; console.log('  Playwright tidak ada: dilewati'); }
  else {
    /* salin repo ke folder sementara, isi alamat uji, jalankan alat, lalu baca hasilnya dengan parser browser */
    const d = mkdtempSync(join(tmpdir(), 'seo-repo-')); sementara.push(d);
    cpSync(ROOT, d, { recursive: true, filter: (s) => !/(^|[\\/])(\.git|node_modules|docs)([\\/]|$)/.test(s.slice(ROOT.length)) });
    const j = JSON.parse(readFileSync(join(d, S.BERKAS_PENGATURAN), 'utf8'));
    const uji = 'https://neruvia-uji.contoh/';
    writeFileSync(join(d, S.BERKAS_PENGATURAN), JSON.stringify({ ...j, alamat_dasar: uji }));
    const r = S.jalankan(d); cek(r.kode === 0, 'salinan repo dengan alamat uji: ' + r.galat);
    const server = await layani(d), base = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch();
    for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
      const galat = [], luar = [];
      page.on('pageerror', (e) => galat.push(String(e)));
      page.on('request', (q) => { if (q.url().startsWith(uji)) luar.push(q.url()); });
      await page.goto(base + '/', { waitUntil: 'load' });
      const m = await page.evaluate(() => ({
        diKepala: [...document.querySelectorAll('link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]')].every((x) => x.parentElement === document.head),
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((x) => x.href),
        meta: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')].map((x) => [x.getAttribute('property') || x.getAttribute('name'), x.content])),
        jumlah: document.querySelectorAll('meta[property^="og:"]').length,
        lebar: document.documentElement.scrollWidth,
      }));
      cek(m.diKepala && m.canonical.join() === uji, `${w}px: satu canonical di head`);
      for (const k of ['og:title', 'og:type', 'og:image', 'og:url']) cek(!!m.meta[k], `${w}px: properti wajib ${k}`);
      cek(m.jumlah === Object.keys(m.meta).filter((k) => k.startsWith('og:')).length, `${w}px: tidak ada properti og ganda`);
      cek(m.meta['twitter:card'] === 'summary_large_image' && m.meta['og:image:alt'] === j.gambar_og.alt, `${w}px: twitter:card dan alt`);
      cek(m.lebar <= w && galat.length === 0 && luar.length === 0, `${w}px: tanpa gulir samping, galat, atau permintaan ke alamat uji (${m.lebar}, ${galat}, ${luar})`);
      const gambar = await page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, base + new URL(m.meta['og:image']).pathname);
      cek(gambar.join('x') === `${m.meta['og:image:width']}x${m.meta['og:image:height']}`, `${w}px: gambar terbuka dengan ukuran yang diumumkan (${gambar})`);
      await ctx.close();
    }
    const page = await browser.newPage(); await page.goto(base + '/');
    const x = await page.evaluate(async () => {
      const r = await fetch('/sitemap.xml'); const d = new DOMParser().parseFromString(await r.text(), 'application/xml');
      return { status: r.status, rusak: d.getElementsByTagName('parsererror').length, akar: d.documentElement.localName, ns: d.documentElement.namespaceURI, loc: [...d.getElementsByTagName('loc')].map((n) => n.textContent) };
    });
    cek(x.status === 200 && x.rusak === 0 && x.akar === 'urlset' && x.ns === 'http://www.sitemaps.org/schemas/sitemap/0.9' && x.loc.join() === uji, 'sitemap terbaca parser XML: ' + JSON.stringify(x));
    for (const l of x.loc) cek(S.noindex(readFileSync(join(d, new URL(l).pathname.replace(/\/$/, '/index.html')), 'utf8')) === false, 'tiap URL sitemap menunjuk halaman ada tanpa noindex: ' + l);
    await browser.close(); server.close();
  }
}

/* ---------- H. generator header dengan alamat terisi ---------- */
judul('H. buat-vercel-json.mjs dan canonical');
{
  const d = mkdtempSync(join(tmpdir(), 'seo-vercel-')); sementara.push(d);
  mkdirSync(join(d, 'tools'));
  for (const f of ['tools/buat-vercel-json.mjs', 'tools/buat-seo.mjs']) cpSync(join(ROOT, f), join(d, f));
  const coba = (tag) => { writeFileSync(join(d, 'index.html'), kepala(tag)); return spawnSync(process.execPath, [join(d, 'tools/buat-vercel-json.mjs')], { encoding: 'utf8' }); };
  const L = 'href="https://jahat.contoh/x.css"';
  for (const t of ['<link rel="canonical" href="https://neruvia-uji.contoh/">', '<link href="https://neruvia-uji.contoh/" rel=CANONICAL>']) {
    const r = coba(t); cek(r.status === 0, 'canonical mutlak diterima: ' + t + ' ' + r.stderr.slice(0, 120));
    const j = ada(d, 'vercel.json') ? baca(d, 'vercel.json') : ''; cek(j.includes("default-src 'none'") && !j.includes('neruvia-uji'), 'canonical tidak melonggarkan CSP');
  }
  for (const t of [`<link rel="stylesheet" ${L}>`, `<link rel="preload" as="style" ${L}>`, `<link rel="alternate stylesheet" ${L}>`, `<link rel="canonical stylesheet" ${L}>`, `<link rel="stylesheet canonical" ${L}>`,
    `<link title=' rel="canonical"' rel="stylesheet" ${L}>`, `<link data-rel="canonical" ${L}>`, `<link rel="stylesheet" rel="canonical" ${L}>`, `<link ${L}>`, '<link rel="icon" href="//jahat.contoh/i.png">',
    `<link rel="canonical" href="https://neruvia-uji.contoh/"><link rel="stylesheet" ${L}>`]) {
    const r = coba(t); tolak(r.status !== 0 && /sumber luar/.test(r.stderr + r.stdout), 'tetap ditolak: ' + t);
  }
}

/* ---------- G. pembuat kartu pratinjau ---------- */
judul('G. buat-og.mjs');
{
  /* salinan kecil: hanya alat dan aset yang dipakainya */
  const salin = () => {
    const d = mkdtempSync(join(tmpdir(), 'og-')); sementara.push(d);
    for (const f of ['tools/buat-og.mjs', 'index.html', 'assets/neru-wave.webp', 'assets/fonts/SpaceGrotesk-latin.woff2']) { mkdirSync(dirname(join(d, f)), { recursive: true }); cpSync(join(ROOT, f), join(d, f)); }
    mkdirSync(join(d, 'assets/brand'));
    return d;
  };
  const og = (d, ...a) => spawnSync(process.execPath, [join(d, 'tools/buat-og.mjs'), ...a], { cwd: d, encoding: 'utf8', timeout: 90000, env: { ...process.env, NODE_PATH: process.env.NODE_PATH || '' } });
  const bawaan = (d) => join(d, 'assets/brand/neruvia-og-1200x630.jpg');
  const d = salin();
  for (const a of [['--keluar='], ['--keluar=.jpg'], ['--keluar=x.png'], ['--keluar=x'], ['--keluar=x.jpg.sh'], ['--keluar', 'x.jpg'], ['--hapus'], ['-h'], ['x.jpg'], ['--keluar=a.jpg', '--keluar=b.jpg'], ['--keluar=a.jpg\n--x']]) {
    const r = og(d, ...a); tolak(r.status === 1 && /Pakai:/.test(r.stderr) && !existsSync(bawaan(d)) && !existsSync(join(d, 'a.jpg')), 'argumen ditolak: ' + JSON.stringify(a));
  }
  mkdirSync(join(d, 'folder.jpg'));
  let r = og(d, '--keluar=folder.jpg'); tolak(r.status === 1 && /bukan berkas biasa/.test(r.stderr), 'tujuan folder');
  writeFileSync(join(d, 'korban.txt'), 'utuh'); symlinkSync('korban.txt', join(d, 'taut.jpg'));
  r = og(d, '--keluar=taut.jpg'); tolak(r.status === 1 && readFileSync(join(d, 'korban.txt'), 'utf8') === 'utuh', 'tujuan tautan simbolik');
  symlinkSync('belum-ada.txt', join(d, 'putus.jpg'));
  r = og(d, '--keluar=putus.jpg'); tolak(r.status === 1 && !existsSync(join(d, 'belum-ada.txt')), 'tujuan tautan simbolik putus');
  for (const [ket, rusak] of [
    ['beranda hilang', (x) => rmSync(join(x, 'index.html'))], ['logo hilang', (x) => writeFileSync(join(x, 'index.html'), '<html></html>')],
    ['logo disisipi markup', (x) => writeFileSync(join(x, 'index.html'), '<svg class="mk" viewBox="0 0 1 1"><path d="M0 0<script>alert(1)</script>"/></svg>')],
    ['gambar Neru hilang', (x) => rmSync(join(x, 'assets/neru-wave.webp'))], ['font hilang', (x) => rmSync(join(x, 'assets/fonts/SpaceGrotesk-latin.woff2'))],
  ]) { const x = salin(); rusak(x); const h = og(x); tolak(h.status === 1 && !existsSync(bawaan(x)), `${ket} (kode ${h.status} ${h.stderr.slice(0, 80)})`); }
  if (!CEPAT && chromium) {
    for (const [ket, rusak] of [['gambar Neru rusak', (x) => writeFileSync(join(x, 'assets/neru-wave.webp'), 'bukan gambar')], ['font rusak', (x) => writeFileSync(join(x, 'assets/fonts/SpaceGrotesk-latin.woff2'), 'bukan font')], ['folder tujuan tidak ada', (x) => rmSync(join(x, 'assets/brand'), { recursive: true })]]) {
      const x = salin(); rusak(x); const h = og(x); tolak(h.status === 1 && !existsSync(bawaan(x)), `${ket} (kode ${h.status} ${h.stderr.slice(0, 80)})`);
    }
    const x = salin(); const h = og(x, '--keluar=nama aneh;$(touch PWNED).jpg');
    const f = join(x, 'nama aneh;$(touch PWNED).jpg');
    cek(h.status === 0 && existsSync(f) && !existsSync(join(x, 'PWNED')), 'nama berkas bertanda shell ditulis apa adanya: ' + h.stderr.slice(0, 80));
    if (existsSync(f)) { const b = readFileSync(f), u = S.ukuranGambar(b); cek(u && u.jenis === 'image/jpeg' && u.w === 1200 && u.h === 630 && b.length < 150 * 1024, 'hasil 1200x630 JPEG di bawah 150 KB'); }
  }
}

for (const d of sementara) rmSync(d, { recursive: true, force: true });
console.log(`\n${lulus} pemeriksaan lulus, ${gagal} gagal (${negatif} kasus negatif)${lewati ? '; uji browser dilewati' : ''}`);
process.exit(gagal ? 1 : lewati ? 2 : 0);
