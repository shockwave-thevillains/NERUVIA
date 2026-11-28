#!/usr/bin/env node
/* Pembuat berkas SEO NERUVIA (kegiatan H1): robots.txt, sitemap.xml, dan blok meta beralamat di halaman beranda.
   Tanpa dependensi npm. Satu sumber pengaturan: tools/seo-situs.json.

   Pakai:
     node tools/buat-seo.mjs            tulis hasil ke repo
     node tools/buat-seo.mjs --cek      hanya periksa bahwa berkas sudah sesuai (tidak menulis)
     node tools/buat-seo.mjs --akar=F   akar repo lain (dipakai uji)
   Kode keluar: 0 berhasil atau sesuai; 1 ada galat atau berkas tidak sesuai.

   Aturan yang ditegakkan (sumber di docs/loop/RUJUKAN.md, bagian H1):
     - alamat situs tidak pernah ditebak. Selama "alamat_dasar" kosong: robots.txt tanpa baris Sitemap,
       sitemap.xml tidak dibuat, dan tidak ada canonical, og:url, atau og:image (semuanya butuh alamat mutlak);
     - halaman ber-noindex tidak masuk sitemap dan TIDAK diblokir di robots.txt (kalau diblokir, mesin pencari
       tidak bisa membaca noindex-nya);
     - daftar halaman yang boleh diindeks harus sama persis dengan "halaman_terindeks", supaya halaman yang
       kehilangan noindex tidak masuk hasil pencari tanpa disadari. */
import { readFileSync, writeFileSync, readdirSync, existsSync, lstatSync, unlinkSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BERKAS_PENGATURAN = 'tools/seo-situs.json';
export const TANDA_ROBOTS = '# Dibuat oleh tools/buat-seo.mjs; jangan diubah manual.';
export const TANDA_SITEMAP = '<!-- Dibuat oleh tools/buat-seo.mjs; jangan diubah manual. -->';
export const BLOK_MULAI = '<!-- seo:alamat mulai (dibuat tools/buat-seo.mjs; kosong selama alamat situs belum ditetapkan) -->';
export const BLOK_SELESAI = '<!-- seo:alamat selesai -->';
export const GAMBAR = { lebarMin: 600, tinggiMin: 315, rasio: 1.91, toleransiRasio: 0.02, byteMaks: 250 * 1024, altMaks: 420 };
const FOLDER_LEWAT = new Set(['.git', 'node_modules', 'tools', 'docs', 'assets', 'supabase', 'content']);
const TLD_CADANGAN = new Set(['localhost', 'local', 'invalid', 'test', 'example', 'internal', 'lan', 'home', 'arpa', 'onion']);
const DOMAIN_CONTOH = /(^|\.)example\.(com|net|org)$/;
const KUNCI = ['alamat_dasar', 'halaman_terindeks', 'halaman_meta', 'gambar_og', 'catatan'];

/* ---------- alamat dasar ---------- */
/* Mengembalikan { nilai, galat, peringatan }. nilai '' berarti belum ditetapkan. */
export function periksaAlamat(a) {
  const tolak = (g) => ({ nilai: null, galat: g, peringatan: [] });
  if (typeof a !== 'string') return tolak('alamat_dasar harus teks');
  if (a === '') return { nilai: '', galat: null, peringatan: [] };
  if (a.length > 200) return tolak('alamat_dasar terlalu panjang (maksimal 200)');
  if (!/^[\x21-\x7e]+$/.test(a)) return tolak('alamat_dasar hanya boleh karakter ASCII tampak, tanpa spasi (domain internasional ditulis dalam bentuk punycode)');
  if (/[<>"'`\\{}|^%?#]/.test(a)) return tolak('alamat_dasar tidak boleh memuat tanda < > " \' ` \\ { } | ^ % ? #');
  if (!a.startsWith('https://')) return tolak('alamat_dasar harus diawali https://');
  let u; try { u = new URL(a); } catch { return tolak('alamat_dasar bukan URL yang sah'); }
  if (u.username || u.password || a.slice(8).split('/')[0].includes('@')) return tolak('alamat_dasar tidak boleh memuat nama pengguna atau sandi');
  if (u.port || /:\d*$/.test(a.slice(8).split('/')[0])) return tolak('alamat_dasar tidak boleh memuat nomor port');
  const h = u.hostname;
  const label = h.split('.');
  if (h.startsWith('[') || /^[\d.]+$/.test(h)) return tolak('alamat_dasar harus nama domain, bukan alamat IP');
  if (label.length < 2 || label.some((x) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))) return tolak('nama domain tidak sah');
  const tld = label[label.length - 1];
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(tld)) return tolak('akhiran domain tidak sah');
  if (TLD_CADANGAN.has(tld) || DOMAIN_CONTOH.test(h)) return tolak('alamat_dasar memakai domain cadangan atau contoh, bukan alamat situs sungguhan');
  if (!a.endsWith('/')) return tolak('alamat_dasar harus diakhiri /');
  if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(u.pathname)) return tolak('jalur pada alamat_dasar tidak sah');
  if (u.href !== a) return tolak(`alamat_dasar harus ditulis dalam bentuk baku: ${u.href}`);
  const peringatan = [];
  if (u.pathname !== '/') peringatan.push('alamat berada di subfolder: robots.txt hanya dibaca mesin pencari di akar host, jadi robots.txt repo ini tidak berpengaruh di alamat itu (sitemap harus didaftarkan manual).');
  return { nilai: a, galat: null, peringatan };
}

/* ---------- HTML ---------- */
/* Buang komentar dan isi elemen yang teksnya bukan markup, supaya meta di dalamnya tidak terbaca. */
export function markupSaja(html) {
  return String(html).replace(/<!--[\s\S]*?(?:-->|$)|<(script|style|template|textarea|title|noscript)\b(?:"[^"]*"|'[^']*'|[^'">])*>[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ');
}
export function atribut(tag) {
  const o = Object.create(null);
  const isi = tag.replace(/^<[A-Za-z0-9-]+/, '').replace(/\/?>$/, '');
  for (const m of isi.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const k = m[1].toLowerCase();
    if (!(k in o)) o[k] = m[2] ?? m[3] ?? m[4] ?? ''; /* seperti browser: atribut pertama yang berlaku */
  }
  return o;
}
export function tagBernama(html, nama) {
  const re = new RegExp(`<${nama}(?=[\\s/>])(?:"[^"]*"|'[^']*'|[^'">])*>`, 'gi');
  return [...markupSaja(html).matchAll(re)].map((m) => atribut(m[0]));
}
export function noindex(html) {
  return tagBernama(html, 'meta').some((a) => /^(robots|googlebot)$/i.test((a.name || '').trim())
    && (a.content || '').toLowerCase().split(/[\s,]+/).some((t) => t === 'noindex' || t === 'none'));
}

/* ---------- daftar halaman ---------- */
export function daftarHalaman(akar) {
  const hasil = [];
  (function jalan(rel) {
    for (const e of readdirSync(join(akar, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (!(rel === '' && FOLDER_LEWAT.has(e.name)) && e.name !== '.git' && e.name !== 'node_modules') jalan(r); }
      else if ((e.isFile() || e.isSymbolicLink()) && /\.html?$/i.test(e.name)) hasil.push(r);
    }
  })('');
  return hasil.sort();
}
export function jalurUrl(rel) {
  const p = rel === 'index.html' ? '' : rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
  return p.split('/').map((x) => encodeURIComponent(x)).join('/');
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function buatRobots(dasar) {
  return [TANDA_ROBOTS,
    '# Halaman yang tidak ingin muncul di mesin pencari memakai meta noindex, jadi tidak diblokir di sini.',
    'User-agent: *', 'Allow: /',
    ...(dasar ? ['', `Sitemap: ${dasar}sitemap.xml`] : []), ''].join('\n');
}
export function buatSitemap(dasar, halaman) {
  const loc = halaman.map((h) => dasar + jalurUrl(h));
  if (loc.some((l) => l.length >= 2048)) throw new Error('URL sitemap harus kurang dari 2048 karakter');
  if (loc.length > 50000) throw new Error('sitemap melebihi 50.000 URL');
  return ['<?xml version="1.0" encoding="UTF-8"?>', TANDA_SITEMAP,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...loc.map((l) => `  <url><loc>${esc(l)}</loc></url>`),
    '</urlset>', ''].join('\n');
}

/* ---------- gambar ---------- */
export function ukuranGambar(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString('latin1', 12, 16) === 'IHDR') return { jenis: 'image/png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const m = buf[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { jenis: 'image/jpeg', w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const n = buf.readUInt16BE(i + 2); if (n < 2) return null;
      i += 2 + n;
    }
  }
  return null;
}
/* Berkas di dalam akar, berkas biasa, dan tidak lewat tautan simbolik yang keluar akar. */
function berkasAman(akar, rel) {
  const p = join(akar, rel);
  if (!existsSync(p) || !lstatSync(p).isFile()) return null;
  const asli = realpathSync(p), akarAsli = realpathSync(akar);
  return asli.startsWith(akarAsli + sep) ? p : null;
}

/* ---------- pengaturan ---------- */
export function bacaPengaturan(akar) {
  const galat = [];
  const p = berkasAman(akar, BERKAS_PENGATURAN);
  if (!p) return { galat: [`${BERKAS_PENGATURAN} tidak ada atau bukan berkas biasa`] };
  const teks = readFileSync(p, 'utf8');
  if (teks.length > 10000) return { galat: [`${BERKAS_PENGATURAN} terlalu besar`] };
  let j; try { j = JSON.parse(teks); } catch (e) { return { galat: [`${BERKAS_PENGATURAN} bukan JSON yang sah: ${e.message.slice(0, 120)}`] }; }
  const objek = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  if (!objek(j)) return { galat: [`${BERKAS_PENGATURAN} harus berisi satu objek`] };
  for (const k of Object.keys(j)) if (!KUNCI.includes(k)) galat.push(`kunci tidak dikenal: ${JSON.stringify(k.slice(0, 40))}`);
  const al = periksaAlamat(j.alamat_dasar);
  if (al.galat) galat.push(al.galat);
  const jalurHtml = (x) => typeof x === 'string' && /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.html$/.test(x) && x.length <= 120;
  const ht = j.halaman_terindeks;
  if (!Array.isArray(ht) || ht.length > 200 || !ht.every(jalurHtml) || new Set(ht).size !== ht.length) galat.push('halaman_terindeks harus daftar jalur .html relatif yang unik');
  if (!jalurHtml(j.halaman_meta)) galat.push('halaman_meta harus satu jalur .html relatif');
  else if (Array.isArray(ht) && !ht.includes(j.halaman_meta)) galat.push('halaman_meta harus termasuk dalam halaman_terindeks');
  const g = j.gambar_og;
  let gambar = null;
  if (!objek(g) || Object.keys(g).sort().join() !== 'alt,berkas') galat.push('gambar_og harus berisi tepat dua kunci: berkas dan alt');
  else {
    if (typeof g.berkas !== 'string' || !/^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.(?:png|jpg|jpeg)$/.test(g.berkas)) galat.push('gambar_og.berkas harus berkas .png atau .jpg di dalam assets/');
    else {
      const f = berkasAman(akar, g.berkas);
      if (!f) galat.push(`gambar_og.berkas tidak ada atau bukan berkas biasa: ${g.berkas}`);
      else {
        const buf = readFileSync(f), u = ukuranGambar(buf);
        const jenisEkstensi = g.berkas.endsWith('.png') ? 'image/png' : 'image/jpeg';
        if (!u) galat.push('gambar_og bukan PNG atau JPEG yang terbaca');
        else if (u.jenis !== jenisEkstensi) galat.push('isi gambar_og tidak sesuai ekstensinya');
        else if (u.w < GAMBAR.lebarMin || u.h < GAMBAR.tinggiMin) galat.push(`gambar_og terlalu kecil (${u.w}x${u.h}, minimal ${GAMBAR.lebarMin}x${GAMBAR.tinggiMin})`);
        else if (Math.abs(u.w / u.h - GAMBAR.rasio) / GAMBAR.rasio > GAMBAR.toleransiRasio) galat.push(`rasio gambar_og ${u.w}x${u.h} jauh dari ${GAMBAR.rasio}:1`);
        else if (buf.length > GAMBAR.byteMaks) galat.push(`gambar_og ${Math.ceil(buf.length / 1024)} KB melebihi ${GAMBAR.byteMaks / 1024} KB`);
        else gambar = { berkas: g.berkas, alt: g.alt, ...u };
      }
    }
    if (typeof g.alt !== 'string' || !g.alt.trim() || g.alt.length > GAMBAR.altMaks || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/.test(g.alt)) galat.push(`gambar_og.alt wajib diisi, maksimal ${GAMBAR.altMaks} karakter, tanpa karakter kontrol atau penanda arah`);
  }
  if (galat.length) return { galat };
  return { galat, peringatan: al.peringatan, dasar: al.nilai, terindeks: [...ht].sort(), halamanMeta: j.halaman_meta, gambar };
}

/* ---------- blok meta di halaman ---------- */
export function blokMeta(dasar, halaman, gambar) {
  if (!dasar) return '';
  const url = dasar + jalurUrl(halaman), img = dasar + gambar.berkas;
  return [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:image:type" content="${gambar.jenis}">`,
    `<meta property="og:image:width" content="${gambar.w}">`,
    `<meta property="og:image:height" content="${gambar.h}">`,
    `<meta property="og:image:alt" content="${esc(gambar.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ].join('\n');
}
export function terapkanBlok(html, blok) {
  const hitung = (s) => html.split(s).length - 1;
  if (hitung(BLOK_MULAI) !== 1 || hitung(BLOK_SELESAI) !== 1) throw new Error('penanda blok seo harus ada tepat satu pasang');
  const a = html.indexOf(BLOK_MULAI), b = html.indexOf(BLOK_SELESAI);
  if (b < a) throw new Error('penanda blok seo terbalik');
  const awalBadan = html.search(/<\/head\s*>/i);
  if (awalBadan < 0 || b > awalBadan) throw new Error('blok seo harus berada di dalam <head>');
  const depan = html.slice(0, a), belakang = html.slice(b + BLOK_SELESAI.length);
  /* tag beralamat yang ditulis tangan di luar blok akan bertentangan dengan blok */
  const luar = depan + belakang;
  const liar = [
    ...tagBernama(luar, 'link').filter((x) => (x.rel || '').toLowerCase().split(/\s+/).includes('canonical')).map(() => 'canonical'),
    ...tagBernama(luar, 'meta').map((x) => (x.property || x.name || '').toLowerCase()).filter((n) => /^(og:url|og:image(:.*)?|twitter:(card|image(:.*)?|url))$/.test(n)),
  ];
  if (liar.length) throw new Error('tag beralamat di luar blok seo: ' + [...new Set(liar)].join(', '));
  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const isi = blok ? nl + blok.split('\n').join(nl) : '';
  return depan + BLOK_MULAI + isi + nl + BLOK_SELESAI + belakang;
}

/* ---------- rencana ---------- */
/* Hitung isi yang seharusnya. berkas: { jalur: isi | null (harus tidak ada) } */
export function rencana(akar) {
  const p = bacaPengaturan(akar);
  if (p.galat.length) return { galat: p.galat, peringatan: [], berkas: {} };
  const galat = [], peringatan = [...p.peringatan], berkas = {};
  const halaman = daftarHalaman(akar);
  const terindeks = [];
  for (const h of halaman) {
    if (!berkasAman(akar, h)) { galat.push(`${h}: bukan berkas biasa di dalam repo`); continue; }
    if (/(^|\/)404\.html$/i.test(h)) continue; /* halaman galat tidak pernah masuk sitemap */
    if (!noindex(readFileSync(join(akar, h), 'utf8'))) terindeks.push(h);
  }
  for (const h of terindeks) if (!p.terindeks.includes(h)) galat.push(`${h}: tidak memakai noindex tetapi tidak ada di halaman_terindeks (tambahkan noindex atau daftarkan dengan sengaja)`);
  for (const h of p.terindeks) if (!terindeks.includes(h)) galat.push(`${h}: terdaftar di halaman_terindeks tetapi tidak ada atau memakai noindex`);
  if (galat.length) return { galat, peringatan, berkas, terindeks };
  try {
    berkas['robots.txt'] = buatRobots(p.dasar);
    berkas['sitemap.xml'] = p.dasar ? buatSitemap(p.dasar, terindeks) : null;
    const html = readFileSync(join(akar, p.halamanMeta), 'utf8');
    berkas[p.halamanMeta] = terapkanBlok(html, blokMeta(p.dasar, p.halamanMeta, p.gambar));
  } catch (e) { galat.push(e.message); }
  /* jangan menimpa atau menghapus berkas yang tidak dibuat alat ini */
  for (const [f, tanda] of [['robots.txt', TANDA_ROBOTS], ['sitemap.xml', TANDA_SITEMAP]]) {
    let st = null; try { st = lstatSync(join(akar, f)); } catch { /* belum ada */ }
    if (!st) continue;
    if (!st.isFile()) galat.push(`${f}: bukan berkas biasa`);
    else if (!readFileSync(join(akar, f), 'utf8').includes(tanda)) galat.push(`${f}: sudah ada tetapi bukan buatan alat ini; pindahkan atau hapus dulu`);
  }
  if (!p.dasar) peringatan.push('alamat_dasar kosong: sitemap.xml, canonical, og:url, dan og:image tidak dibuat sampai alamat situs ditetapkan.');
  return { galat, peringatan, berkas, terindeks };
}

export function jalankan(akar, { cek = false } = {}) {
  const r = rencana(akar);
  const beda = [];
  if (!r.galat.length) {
    for (const [f, isi] of Object.entries(r.berkas)) {
      const p = join(akar, f);
      const lama = existsSync(p) ? readFileSync(p, 'utf8') : null;
      if (lama === isi) continue;
      beda.push(f);
      if (cek) continue;
      if (isi === null) unlinkSync(p); else writeFileSync(p, isi);
    }
  }
  return { ...r, beda, kode: r.galat.length || (cek && beda.length) ? 1 : 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2);
  const asing = arg.filter((a) => a !== '--cek' && !/^--akar=.+/.test(a));
  if (asing.length) { console.error('Argumen tidak dikenal. Pakai: node tools/buat-seo.mjs [--cek] [--akar=FOLDER]'); process.exit(1); }
  const akarArg = arg.find((a) => a.startsWith('--akar='));
  const akar = akarArg ? resolve(akarArg.slice(7)) : join(dirname(fileURLToPath(import.meta.url)), '..');
  const cek = arg.includes('--cek');
  let r; try { r = jalankan(akar, { cek }); } catch (e) { console.error('GALAT: ' + e.message); process.exit(1); }
  for (const g of r.galat) console.log('GALAT: ' + g);
  for (const w of r.peringatan) console.log('PERINGATAN: ' + w);
  if (!r.galat.length) {
    if (cek) console.log(r.beda.length ? `TIDAK SESUAI: ${r.beda.join(', ')} (jalankan node tools/buat-seo.mjs)` : 'OK: robots.txt, sitemap.xml, dan blok meta sesuai pengaturan.');
    else console.log(r.beda.length ? `Ditulis: ${r.beda.join(', ')}` : 'Tidak ada perubahan.');
    console.log(`Halaman yang boleh diindeks: ${r.terindeks.join(', ') || '(tidak ada)'}`);
  }
  process.exit(r.kode);
}
