#!/usr/bin/env node
/* Uji aset (B2). Memeriksa berkas statis tanpa browser; tidak mengubah berkas di repo.
   Pakai:
     node tools/uji-aset.mjs            periksa repo ini lalu jalankan uji mandiri pemeriksa (kasus positif dan negatif)
     node tools/uji-aset.mjs --repo     hanya periksa repo
     node tools/uji-aset.mjs --tes      hanya uji mandiri pemeriksa (di folder sementara)
   Kode keluar 0 lulus, 1 ada pelanggaran atau uji mandiri gagal.

   Yang diperiksa (kode pelanggaran):
     REF_HILANG        rujukan lokal (img, source, srcset, link, script, poster, url() CSS) menunjuk berkas yang tidak ada
     REF_LUAR_AKAR     rujukan lokal keluar dari akar proyek (.., jalur absolut sistem)
     IMG_UKURAN        <img> tanpa width/height bilangan bulat positif (penyebab CLS)
     IMG_ASPEK         rasio width/height <img> tidak sama dengan rasio berkas (selisih > 1%)
     IMG_ALT           <img> tanpa atribut alt
     SRCSET_SIZES      srcset berdeskriptor w tanpa sizes
     SRCSET_LEBAR      lebar yang diumumkan di srcset tidak sama dengan lebar piksel berkas
     FETCHPRIORITY     fetchpriority=high bersama loading=lazy, atau lebih dari 2 fetchpriority=high satu halaman
     PRELOAD_FONT      preload font tanpa as=font, type font/woff2, atau crossorigin
     PRELOAD_GAMBAR    preload gambar tanpa href atau imagesrcset, atau imagesrcset w tanpa imagesizes
     PRELOAD_GANDA     lebih dari satu preload gambar, atau href preload yang sama dua kali (unduhan ganda)
     PRELOAD_TAK_PAKAI preload font yang tidak dideklarasikan oleh @font-face halaman itu
     FONT_DISPLAY      @font-face tanpa font-display swap/fallback/optional
     FONT_FORMAT       @font-face yang src-nya bukan woff2
     FORMAT_BERKAS     ekstensi tidak cocok dengan isi (magic bytes)
     ANGGARAN_BERKAS   satu berkas yang ikut deploy melebihi batas ukuran
     ANGGARAN_HALAMAN  bobot statis halaman (HTML + CSS + aset terbesar per gambar + font + skrip) melebihi anggaran
     ANGGARAN_FRAME    jumlah ukuran satu folder frame melebihi anggaran
     FRAME_LENGKAP     folder frame tidak berisi f00..f20 atau lebar piksel tidak sesuai tingkatnya
     ASET_YATIM        aset berat (> 20 KB) tanpa rujukan dan tidak ada di .vercelignore
     IGNORE_HILANG     entri .vercelignore menunjuk berkas yang tidak ada
     IGNORE_DIRUJUK    entri .vercelignore menunjuk berkas yang dirujuk halaman (akan memutus halaman) */
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, lstatSync, symlinkSync } from 'node:fs';
import { join, dirname, resolve, relative, extname, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const KB = 1024;
export const ANGGARAN = {
  berkasMaks: 250 * KB, /* per berkas yang ikut deploy, di luar folder frame */
  halaman: { default: 150 * KB, 'index.html': 380 * KB, 'belajar/index.html': 130 * KB, 'belajar/pelajaran.html': 130 * KB },
  frame: { frames: 850 * KB, 'frames-m': 1700 * KB, 'frames-2x': 2700 * KB },
  frameLebar: { frames: 547, 'frames-m': 820, 'frames-2x': 1094 },
  yatimBatas: 20 * KB,
};

/* ---------- pembaca berkas biner ---------- */
function lebarGambar(buf, ext) {
  try {
    if (ext === '.png') return buf.length >= 24 && buf.readUInt32BE(12) === 0x49484452 ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null;
    if (ext === '.webp') {
      if (buf.length < 30) return null;
      const t = buf.toString('latin1', 12, 16);
      if (t === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      if (t === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) }; }
      if (t === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
      return null;
    }
    if (ext === '.avif') {
      const i = buf.indexOf('ispe');
      if (i < 0 || i + 16 > buf.length) return null;
      return { w: buf.readUInt32BE(i + 8), h: buf.readUInt32BE(i + 12) };
    }
  } catch { /* berkas rusak */ }
  return null;
}
function formatCocok(buf, ext) {
  const h = (n) => buf.toString('latin1', 0, n);
  switch (ext) {
    case '.webp': return buf.length >= 12 && h(4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP';
    case '.png': return buf.length >= 8 && buf[0] === 0x89 && h(4).slice(1) === 'PNG';
    case '.avif': return buf.length >= 12 && buf.toString('latin1', 4, 8) === 'ftyp' && /avif|avis/.test(buf.toString('latin1', 8, Math.min(buf.length, 32)));
    case '.woff2': return h(4) === 'wOF2';
    case '.svg': return /<svg[\s>]/i.test(buf.toString('utf8', 0, Math.min(buf.length, 4096)));
    case '.jpg': case '.jpeg': return buf[0] === 0xff && buf[1] === 0xd8;
    default: return true;
  }
}

/* ---------- pemindai HTML/CSS linear (tanpa regex yang bisa meledak) ---------- */
function tandai(html) {
  const tag = []; const n = html.length; let i = 0;
  while (i < n) {
    const a = html.indexOf('<', i); if (a < 0) break;
    if (html.startsWith('<!--', a)) { const e = html.indexOf('-->', a + 4); i = e < 0 ? n : e + 3; continue; }
    const m = /^[a-zA-Z][a-zA-Z0-9]*/.exec(html.slice(a + 1, a + 40));
    if (!m) { i = a + 1; continue; }
    const nama = m[0].toLowerCase(); let j = a + 1 + m[0].length, q = '';
    const attr = {};
    /* baca atribut sampai '>' yang tidak berada dalam tanda kutip */
    while (j < n) {
      const c = html[j];
      if (c === '>' ) { j++; break; }
      if (/\s|\//.test(c)) { j++; continue; }
      let k = j; while (k < n && !/[\s=>/]/.test(html[k])) k++;
      const kn = html.slice(j, k).toLowerCase(); j = k;
      while (j < n && /\s/.test(html[j])) j++;
      let v = '';
      if (html[j] === '=') {
        j++; while (j < n && /\s/.test(html[j])) j++;
        q = html[j];
        if (q === '"' || q === "'") { const e = html.indexOf(q, j + 1); const end = e < 0 ? n : e; v = html.slice(j + 1, end); j = end + 1; }
        else { k = j; while (k < n && !/[\s>]/.test(html[k])) k++; v = html.slice(j, k); j = k; }
      } else v = '';
      if (kn && !(kn in attr)) attr[kn] = v;
    }
    tag.push({ nama, attr, pos: a });
    i = j;
    if (nama === 'script' || nama === 'style') { const e = html.toLowerCase().indexOf('</' + nama, i); const isi = html.slice(i, e < 0 ? n : e); tag[tag.length - 1].isi = isi; i = e < 0 ? n : e; }
  }
  return tag;
}
function bacaSrcset(v) {
  /* "a.webp 512w, b.webp 768w" -> [{u:'a.webp', d:'512w'}] ; URL tanpa koma di dalamnya (kasus situs ini) */
  return v.split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const p = x.split(/\s+/); return { u: p[0], d: p[1] || '' }; });
}
function blokFont(css) {
  const hasil = []; let i = 0;
  const low = css.toLowerCase();
  while (true) {
    const a = low.indexOf('@font-face', i); if (a < 0) break;
    const b = css.indexOf('{', a); const c = b < 0 ? -1 : css.indexOf('}', b);
    if (b < 0 || c < 0) break;
    hasil.push(css.slice(b + 1, c)); i = c + 1;
  }
  return hasil;
}
function urlCss(css) {
  const hasil = []; const low = css.toLowerCase(); let i = 0;
  while (true) {
    const a = low.indexOf('url(', i); if (a < 0) break;
    const e = css.indexOf(')', a); if (e < 0) break;
    hasil.push(css.slice(a + 4, e).trim().replace(/^['"]|['"]$/g, '')); i = e + 1;
  }
  return hasil;
}
const dekode = (u) => { try { return decodeURIComponent(u); } catch { return u; } };
const lokal = (u) => !!u && (/^[a-z]:[\\/]/i.test(u) || !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(u));
const bersih = (u) => dekode(u.split('#')[0].split('?')[0]);

function* jalan(dir, akar) {
  let ent; try { ent = readdirSync(dir); } catch { return; }
  for (const n of ent) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = join(dir, n); let st; try { st = lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) yield* jalan(p, akar); else yield p;
  }
}

function polaIgnore(isi) {
  return isi.split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
}

/* ---------- pemeriksa utama ---------- */
export function periksa(akar, opsi = {}) {
  const angg = { ...ANGGARAN, ...(opsi.anggaran || {}), halaman: { ...ANGGARAN.halaman, ...((opsi.anggaran || {}).halaman || {}) }, frame: { ...ANGGARAN.frame, ...((opsi.anggaran || {}).frame || {}) } };
  const v = []; let cek = 0;
  const lapor = (kode, berkas, pesan) => v.push({ kode, berkas, pesan });
  const rel = (p) => relative(akar, p).split(sep).join('/');
  const adaDi = (p) => { try { return existsSync(p) && statSync(p).isFile(); } catch { return false; } };

  const semua = [...jalan(akar, akar)].map(rel);
  const halaman = semua.filter((p) => p.endsWith('.html') && !/^(docs|tools|supabase|node_modules)\//.test(p));
  const rujuk = new Set(); /* berkas yang dirujuk halaman atau CSS, jalur relatif akar */
  let frameDirDipakai = new Set();

  function selesaikan(dariBerkas, u, berkasLapor) {
    /* kembalikan jalur relatif akar atau null (dan lapor) */
    cek++;
    const b = bersih(u);
    if (/^[a-z]:[\\/]/i.test(b) || b.includes('\0')) { lapor('REF_LUAR_AKAR', berkasLapor, `rujukan ${JSON.stringify(u.slice(0, 80))} bukan jalur proyek`); return null; }
    const abs = b.startsWith('/') ? resolve(akar, '.' + b) : resolve(dirname(join(akar, dariBerkas)), b);
    const r = relative(akar, abs);
    if (r.startsWith('..') || r === '') { lapor('REF_LUAR_AKAR', berkasLapor, `rujukan ${JSON.stringify(u.slice(0, 80))} keluar dari akar proyek`); return null; }
    const rr = r.split(sep).join('/');
    if (!adaDi(abs)) { lapor('REF_HILANG', berkasLapor, `rujukan ${JSON.stringify(u.slice(0, 80))} tidak ada`); return null; }
    rujuk.add(rr);
    return rr;
  }
  const ukuran = (r) => statSync(join(akar, r)).size;

  /* rujukan frame yang disusun skrip: 'assets/maskot-animasi/'+dir+'/f' */
  for (const p of halaman) {
    const isi = readFileSync(join(akar, p), 'utf8');
    if (/maskot-animasi\//.test(isi)) {
      for (const d of Object.keys(angg.frame)) if (new RegExp("'" + d + "'").test(isi) || isi.includes(d)) frameDirDipakai.add(d);
    }
  }

  const bobotHalaman = {};
  for (const p of halaman) {
    const isi = readFileSync(join(akar, p), 'utf8');
    const tags = tandai(isi);
    const aset = new Set(); /* jalur relatif akar yang dihitung ke bobot halaman */
    const cssTeks = []; /* {teks, dari} */
    const preloadGambar = []; const preloadFont = []; const hrefPreload = new Map();
    let fpTinggi = 0, grupSource = null;
    for (const t of tags) {
      const a = t.attr;
      if (t.nama === 'style' && t.isi) cssTeks.push({ teks: t.isi, dari: p });
      if (t.nama === 'link') {
        const relv = (a.rel || '').toLowerCase().split(/\s+/);
        if (relv.includes('stylesheet') && a.href && lokal(a.href)) {
          const r = selesaikan(p, a.href, p);
          if (r) { aset.add(r); cssTeks.push({ teks: readFileSync(join(akar, r), 'utf8'), dari: r }); }
        } else if (relv.includes('preload')) {
          const as = (a.as || '').toLowerCase();
          if (as === 'font') {
            cek++;
            if (!/font\/woff2/i.test(a.type || '') || !('crossorigin' in a)) lapor('PRELOAD_FONT', p, `preload font ${a.href || ''} harus as=font, type=font/woff2, dan crossorigin`);
            if (a.href && lokal(a.href)) { const r = selesaikan(p, a.href, p); if (r) { preloadFont.push(r); aset.add(r); } }
            const k = a.href || ''; hrefPreload.set(k, (hrefPreload.get(k) || 0) + 1);
          } else if (as === 'image') {
            cek++;
            preloadGambar.push(a);
            if (!a.href && !a.imagesrcset) lapor('PRELOAD_GAMBAR', p, 'preload gambar tanpa href atau imagesrcset');
            if (a.imagesrcset && /\d+w/.test(a.imagesrcset) && !a.imagesizes) lapor('PRELOAD_GAMBAR', p, 'imagesrcset berdeskriptor w tanpa imagesizes');
            if (a.imagesrcset) for (const c of bacaSrcset(a.imagesrcset)) if (lokal(c.u)) selesaikan(p, c.u, p);
            if (a.href && lokal(a.href)) selesaikan(p, a.href, p);
            const k = a.href || a.imagesrcset || ''; hrefPreload.set(k, (hrefPreload.get(k) || 0) + 1);
          } else if (!as) { cek++; lapor('PRELOAD_GAMBAR', p, `preload ${a.href || ''} tanpa atribut as`); }
        } else if ((relv.includes('icon') || relv.includes('apple-touch-icon')) && a.href && lokal(a.href)) { const r = selesaikan(p, a.href, p); if (r) aset.add(r); }
      }
      if (t.nama === 'script' && a.src && lokal(a.src)) { const r = selesaikan(p, a.src, p); if (r) aset.add(r); }
      if (t.nama === 'source') {
        if (a.srcset) { const cands = bacaSrcset(a.srcset); let terbesar = 0, tb = null; const adaW = cands.some((c) => /w$/.test(c.d)); cek++; if (adaW && !a.sizes) lapor('SRCSET_SIZES', p, 'source srcset berdeskriptor w tanpa sizes');
          for (const c of cands) if (lokal(c.u)) { const r = selesaikan(p, c.u, p); if (r) { cekLebarSrcset(p, r, c.d); if (ukuran(r) >= terbesar) { terbesar = ukuran(r); tb = r; } } }
          grupSource = tb || grupSource; }
      }
      if (t.nama === 'img') {
        cek += 3;
        if (!('alt' in a)) lapor('IMG_ALT', p, `<img src=${JSON.stringify((a.src || '').slice(0, 60))}> tanpa alt`);
        const w = /^\d+$/.test(a.width || '') ? parseInt(a.width, 10) : 0, h = /^\d+$/.test(a.height || '') ? parseInt(a.height, 10) : 0;
        if (!(w > 0 && h > 0)) lapor('IMG_UKURAN', p, `<img src=${JSON.stringify((a.src || '').slice(0, 60))}> tanpa width dan height bilangan bulat positif`);
        const fp = (a.fetchpriority || '').toLowerCase();
        if (fp === 'high') { fpTinggi++; if ((a.loading || '').toLowerCase() === 'lazy') lapor('FETCHPRIORITY', p, 'fetchpriority=high bersama loading=lazy'); }
        let utama = null;
        if (a.src && lokal(a.src)) utama = selesaikan(p, a.src, p);
        let terbesar = utama ? ukuran(utama) : 0, tb = utama;
        if (a.srcset) {
          const cands = bacaSrcset(a.srcset); const adaW = cands.some((c) => /w$/.test(c.d));
          if (adaW && !a.sizes) lapor('SRCSET_SIZES', p, 'img srcset berdeskriptor w tanpa sizes');
          for (const c of cands) if (lokal(c.u)) { const r = selesaikan(p, c.u, p); if (r) { cekLebarSrcset(p, r, c.d); if (ukuran(r) >= terbesar) { terbesar = ukuran(r); tb = r; } } }
        }
        /* dalam <picture> browser hanya mengunduh satu format: hitung kelompok <source> (AVIF) saja; tanpa source, hitung kandidat terbesar img */
        if (grupSource) { aset.add(grupSource); grupSource = null; } else if (tb) aset.add(tb);
        if (utama && w > 0 && h > 0) {
          const d = lebarGambar(readFileSync(join(akar, utama)), extname(utama).toLowerCase());
          if (d && Math.abs(w / h - d.w / d.h) / (d.w / d.h) > 0.01) lapor('IMG_ASPEK', p, `rasio ${w}x${h} tidak sama dengan berkas ${utama} (${d.w}x${d.h})`);
        }
      }
      if (a.poster && lokal(a.poster)) { const r = selesaikan(p, a.poster, p); if (r) aset.add(r); }
    }
    if (grupSource) aset.add(grupSource);
    cek++;
    if (fpTinggi > 2) lapor('FETCHPRIORITY', p, `${fpTinggi} elemen fetchpriority=high (maksimal 2 per halaman)`);
    cek++;
    if (preloadGambar.length > 1) lapor('PRELOAD_GANDA', p, `${preloadGambar.length} preload gambar; browser yang mendukung semuanya mengunduh dua kali`);
    for (const [k, n] of hrefPreload) if (n > 1) lapor('PRELOAD_GANDA', p, `preload ${k.slice(0, 80)} muncul ${n} kali`);

    /* CSS: font-face dan url() */
    const fontDeklarasi = new Set();
    for (const { teks, dari } of cssTeks) {
      const tanpaKomentar = teks.replace(/\/\*[\s\S]*?\*\//g, '');
      for (const blok of blokFont(tanpaKomentar)) {
        cek += 3;
        const us = urlCss(blok);
        const lokalFont = us.filter(lokal);
        const fd = /font-display\s*:\s*([a-z]+)/i.exec(blok);
        /* @font-face yang hanya memakai local() (fallback bermetrik) tidak mengunduh apa pun, jadi font-display tidak berlaku */
        if (us.length && (!fd || !['swap', 'fallback', 'optional'].includes(fd[1].toLowerCase()))) lapor('FONT_DISPLAY', dari, `@font-face tanpa font-display swap/fallback/optional (${fd ? fd[1] : 'tidak ada'})`);
        if (lokalFont.length && (!/format\(\s*['"]?woff2['"]?\s*\)/i.test(blok) || lokalFont.some((u) => !/\.woff2$/i.test(bersih(u))))) lapor('FONT_FORMAT', dari, '@font-face harus memakai woff2');
        for (const u of lokalFont) { const r = selesaikan(dari, u, dari); if (r) { fontDeklarasi.add(r); aset.add(r); } }
      }
      for (const u of urlCss(tanpaKomentar)) if (lokal(u) && !/\.woff2$/i.test(bersih(u))) { const r = selesaikan(dari, u, dari); if (r) aset.add(r); }
    }
    for (const r of preloadFont) { cek++; if (!fontDeklarasi.has(r)) lapor('PRELOAD_TAK_PAKAI', p, `preload ${r} tidak dideklarasikan oleh @font-face halaman`); }
    aset.add(p);
    let bobot = 0; for (const r of aset) bobot += ukuran(r);
    bobotHalaman[p] = bobot;
    cek++;
    const batas = angg.halaman[p] ?? angg.halaman.default;
    if (bobot > batas) lapor('ANGGARAN_HALAMAN', p, `bobot statis ${(bobot / KB).toFixed(0)} KB melebihi anggaran ${(batas / KB).toFixed(0)} KB`);
  }

  function cekLebarSrcset(p, r, d) {
    cek++;
    const m = /^(\d+)w$/.exec(d); if (!m) return;
    const dim = lebarGambar(readFileSync(join(akar, r)), extname(r).toLowerCase());
    if (dim && dim.w !== parseInt(m[1], 10)) lapor('SRCSET_LEBAR', p, `${r} diumumkan ${m[1]}w tetapi lebarnya ${dim.w} px`);
  }

  /* .vercelignore */
  const ignoreBerkas = join(akar, '.vercelignore');
  const ignorePola = existsSync(ignoreBerkas) ? polaIgnore(readFileSync(ignoreBerkas, 'utf8')) : [];
  const diabaikan = new Set();
  for (const pola of ignorePola) {
    cek++;
    const bersihPola = pola.replace(/^\//, '');
    if (bersihPola.includes('*') || bersihPola.endsWith('/')) { /* pola folder atau glob: cocokkan awalan */
      const awal = bersihPola.replace(/\*.*$/, '').replace(/\/$/, '');
      const cocok = semua.filter((s) => s === awal || s.startsWith(awal + '/'));
      if (!cocok.length) lapor('IGNORE_HILANG', '.vercelignore', `pola ${pola} tidak cocok dengan berkas apa pun`);
      for (const c of cocok) diabaikan.add(c);
    } else {
      if (!semua.includes(bersihPola)) lapor('IGNORE_HILANG', '.vercelignore', `entri ${pola} tidak ada`);
      else diabaikan.add(bersihPola);
    }
  }
  for (const d of diabaikan) { cek++; if (rujuk.has(d)) lapor('IGNORE_DIRUJUK', '.vercelignore', `${d} dirujuk halaman tetapi dikecualikan dari deploy`); }

  /* tiap berkas aset: format, ukuran, yatim */
  const frameRe = /^assets\/maskot-animasi\/(frames|frames-m|frames-2x)\/(f\d\d)\.webp$/;
  const frameUkuran = {}; const frameNama = {};
  for (const s of semua) {
    if (!s.startsWith('assets/')) continue;
    const ext = extname(s).toLowerCase();
    const buf = readFileSync(join(akar, s));
    cek++;
    if (!formatCocok(buf, ext)) lapor('FORMAT_BERKAS', s, `isi berkas tidak sesuai ekstensi ${ext}`);
    const fm = frameRe.exec(s);
    if (fm) { frameUkuran[fm[1]] = (frameUkuran[fm[1]] || 0) + buf.length; (frameNama[fm[1]] ||= []).push(fm[2]); continue; }
    if (diabaikan.has(s)) continue;
    cek++;
    if (buf.length > angg.berkasMaks) lapor('ANGGARAN_BERKAS', s, `${(buf.length / KB).toFixed(0)} KB melebihi batas ${(angg.berkasMaks / KB).toFixed(0)} KB per berkas deploy`);
    cek++;
    if (!rujuk.has(s) && buf.length > angg.yatimBatas && !/LICENSE|\.txt$|\.md$/i.test(s)) lapor('ASET_YATIM', s, `${(buf.length / KB).toFixed(0)} KB tanpa rujukan dan tidak ada di .vercelignore`);
  }
  /* frame */
  for (const d of Object.keys(angg.frame)) {
    if (!frameDirDipakai.has(d) && !frameNama[d]) continue;
    cek += 3;
    const nama = (frameNama[d] || []).sort();
    const harap = Array.from({ length: 21 }, (_, i) => 'f' + String(i).padStart(2, '0'));
    if (JSON.stringify(nama) !== JSON.stringify(harap)) lapor('FRAME_LENGKAP', `assets/maskot-animasi/${d}`, `harus berisi f00..f20 (ada ${nama.length})`);
    if ((frameUkuran[d] || 0) > angg.frame[d]) lapor('ANGGARAN_FRAME', `assets/maskot-animasi/${d}`, `${((frameUkuran[d] || 0) / KB).toFixed(0)} KB melebihi anggaran ${(angg.frame[d] / KB).toFixed(0)} KB`);
    for (const n of nama.slice(0, 21)) {
      const dim = lebarGambar(readFileSync(join(akar, `assets/maskot-animasi/${d}/${n}.webp`)), '.webp');
      if (dim && dim.w !== angg.frameLebar[d]) { lapor('FRAME_LENGKAP', `assets/maskot-animasi/${d}/${n}.webp`, `lebar ${dim.w} px, seharusnya ${angg.frameLebar[d]}`); break; }
    }
  }
  return { pelanggaran: v, jumlahPemeriksaan: cek, bobotHalaman, halaman };
}

/* ---------- uji mandiri ---------- */
function bangunFixture(dir) {
  const tulis = (rel, isi) => { const p = join(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, isi); };
  const webp = (w, h, pad = 40) => { const b = Buffer.alloc(30 + pad); b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(b.length - 8, 4); b.write('WEBPVP8X', 8, 'latin1'); b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3); return b; };
  const avif = (w, h, pad = 40) => { const b = Buffer.alloc(64 + pad); b.writeUInt32BE(24, 0); b.write('ftypavif', 4, 'latin1'); b.write('ispe', 40, 'latin1'); b.writeUInt32BE(w, 48); b.writeUInt32BE(h, 52); return b; };
  const png = (w, h) => { const b = Buffer.alloc(40); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  const woff2 = (n = 100) => { const b = Buffer.alloc(n); b.write('wOF2', 0, 'latin1'); return b; };
  tulis('assets/neru.webp', webp(1024, 1272, 2000)); tulis('assets/neru-512.webp', webp(512, 636, 1000)); tulis('assets/neru-512.avif', avif(512, 636, 800)); tulis('assets/neru-1024.avif', avif(1024, 1272, 1500));
  tulis('assets/fonts/A.woff2', woff2()); tulis('assets/fonts/B.woff2', woff2()); tulis('assets/brand/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'); tulis('assets/brand/ikon-180.png', png(180, 180));
  tulis('assets/vendor/LICENSE.txt', 'MIT');
  for (const [d, w] of [['frames', 547], ['frames-m', 820], ['frames-2x', 1094]]) for (let i = 0; i < 21; i++) tulis(`assets/maskot-animasi/${d}/f${String(i).padStart(2, '0')}.webp`, webp(w, Math.round(w * 1.18), 500));
  const index = `<!doctype html><html><head><meta charset="utf-8">
<link rel="icon" href="assets/brand/icon.svg">
<link rel="preload" href="assets/fonts/A.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" type="image/avif" imagesrcset="assets/neru-512.avif 512w, assets/neru-1024.avif 1024w" imagesizes="(max-width:900px) 64vw, 39vw" fetchpriority="high">
<style>
@font-face{font-family:'A';font-weight:400;font-style:normal;font-display:swap;src:url(assets/fonts/A.woff2) format('woff2')}
@font-face{font-family:'B';font-weight:400;font-style:normal;font-display:swap;src:url(assets/fonts/B.woff2) format('woff2')}
</style></head><body>
<picture><source type="image/avif" srcset="assets/neru-512.avif 512w, assets/neru-1024.avif 1024w" sizes="(max-width:900px) 64vw, 39vw"><img src="assets/neru.webp" srcset="assets/neru-512.webp 512w, assets/neru.webp 1024w" sizes="(max-width:900px) 64vw, 39vw" width="1024" height="1272" alt="Neru" fetchpriority="high"></picture>
<script>var dir='frames'; var u='assets/maskot-animasi/'+dir+'/f00.webp'; var a='frames-m', b='frames-2x';</script>
</body></html>`;
  tulis('index.html', index);
  tulis('.vercelignore', '# contoh\nassets/brand/ikon-180.png\n');
  return { webp, avif, png, woff2, tulis, index };
}

function jalankanUjiMandiri() {
  let lulus = 0, gagal = 0;
  const hasilKasus = [];
  const kasus = (nama, ubah, harap, opsi) => {
    const dir = mkdtempSync(join(tmpdir(), 'uji-aset-'));
    try {
      const fx = bangunFixture(dir);
      ubah(fx, dir);
      const r = periksa(dir, opsi);
      const kode = new Set(r.pelanggaran.map((x) => x.kode));
      const ok = harap === null ? r.pelanggaran.length === 0 : harap.every((k) => kode.has(k)) && (harap.length > 0);
      if (ok) lulus++; else { gagal++; hasilKasus.push(`  GAGAL: ${nama} (harap ${harap === null ? 'bersih' : harap.join('+')}; dapat ${[...kode].join(',') || 'bersih'})`); }
    } catch (e) { gagal++; hasilKasus.push(`  GAGAL: ${nama} (pengecualian ${String(e).slice(0, 120)})`); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  };
  const ganti = (rel, dari, ke) => (fx, dir) => { const p = join(dir, rel); const s = readFileSync(p, 'utf8'); if (!s.includes(dari)) throw new Error('fixture tidak memuat ' + dari); writeFileSync(p, s.replace(dari, ke)); };

  /* --- positif --- */
  kasus('fixture bersih lulus', () => {}, null);
  kasus('fixture bersih dengan rujukan berawalan / dan query string', ganti('index.html', 'href="assets/brand/icon.svg"', 'href="/assets/brand/icon.svg?v=3#x"'), null);
  kasus('rujukan eksternal dan data: diabaikan', ganti('index.html', '<script>', '<link rel="stylesheet" href="https://cdn.example/x.css"><img src="data:image/png;base64,AAAA" width="1" height="1" alt=""><script>'), null);
  kasus('komentar HTML berisi rujukan putus diabaikan', ganti('index.html', '<body>', '<body><!-- <img src="hilang.png"> -->'), null);
  /* --- rujukan --- */
  kasus('img menunjuk berkas hilang', ganti('index.html', 'src="assets/neru.webp" srcset', 'src="assets/tidak-ada.webp" srcset'), ['REF_HILANG']);
  kasus('kandidat srcset hilang', ganti('index.html', 'assets/neru-512.webp 512w', 'assets/hilang-512.webp 512w'), ['REF_HILANG']);
  kasus('kandidat srcset source hilang', ganti('index.html', 'srcset="assets/neru-512.avif 512w, assets/neru-1024.avif 1024w" sizes', 'srcset="assets/x.avif 512w, assets/neru-1024.avif 1024w" sizes'), ['REF_HILANG']);
  kasus('ikon hilang', ganti('index.html', 'href="assets/brand/icon.svg"', 'href="assets/brand/ikon-baru.svg"'), ['REF_HILANG']);
  kasus('skrip lokal hilang', ganti('index.html', '<script>', '<script src="assets/vendor/hilang.js"></script><script>'), ['REF_HILANG']);
  kasus('url() CSS menunjuk berkas hilang', ganti('index.html', "url(assets/fonts/B.woff2)", "url(assets/fonts/C.woff2)"), ['REF_HILANG']);
  kasus('stylesheet lokal hilang', ganti('index.html', '<style>', '<link rel="stylesheet" href="x.css"><style>'), ['REF_HILANG']);
  kasus('masukan jahat: jalur keluar akar (../)', ganti('index.html', 'href="assets/brand/icon.svg"', 'href="../../etc/passwd"'), ['REF_LUAR_AKAR']);
  kasus('masukan jahat: jalur absolut Windows', ganti('index.html', 'href="assets/brand/icon.svg"', 'href="C:\\Windows\\win.ini"'), ['REF_LUAR_AKAR']);
  kasus('masukan jahat: ../ terkodekan %2e%2e', ganti('index.html', 'href="assets/brand/icon.svg"', 'href="%2e%2e/%2e%2e/etc/passwd"'), ['REF_LUAR_AKAR']);
  kasus('masukan jahat: byte NUL di jalur', ganti('index.html', 'href="assets/brand/icon.svg"', 'href="assets/brand/icon.svg%00.png"'), ['REF_LUAR_AKAR']);
  /* --- img --- */
  kasus('img tanpa width', ganti('index.html', ' width="1024"', ''), ['IMG_UKURAN']);
  kasus('img tanpa height', ganti('index.html', ' height="1272"', ''), ['IMG_UKURAN']);
  kasus('img width bukan angka', ganti('index.html', 'width="1024"', 'width="auto"'), ['IMG_UKURAN']);
  kasus('img width nol', ganti('index.html', 'width="1024"', 'width="0"'), ['IMG_UKURAN']);
  kasus('img rasio salah', ganti('index.html', 'height="1272"', 'height="900"'), ['IMG_ASPEK']);
  kasus('img tanpa alt', ganti('index.html', ' alt="Neru"', ''), ['IMG_ALT']);
  kasus('img alt kosong sah (dekoratif)', ganti('index.html', 'alt="Neru"', 'alt=""'), null);
  kasus('srcset w tanpa sizes pada img', ganti('index.html', ' sizes="(max-width:900px) 64vw, 39vw" width', ' width'), ['SRCSET_SIZES']);
  kasus('srcset w tanpa sizes pada source', ganti('index.html', 'sizes="(max-width:900px) 64vw, 39vw"><img', '><img'), ['SRCSET_SIZES']);
  kasus('lebar srcset tidak sama dengan berkas', ganti('index.html', 'neru-512.webp 512w', 'neru-512.webp 640w'), ['SRCSET_LEBAR']);
  kasus('lebar srcset avif tidak sama', ganti('index.html', 'assets/neru-1024.avif 1024w" sizes', 'assets/neru-1024.avif 2048w" sizes'), ['SRCSET_LEBAR']);
  kasus('fetchpriority high bersama lazy', ganti('index.html', 'fetchpriority="high"></picture>', 'fetchpriority="high" loading="lazy"></picture>'), ['FETCHPRIORITY']);
  kasus('tiga gambar fetchpriority high', ganti('index.html', '<script>', '<img src="assets/neru.webp" width="1024" height="1272" alt="" fetchpriority="high"><img src="assets/neru.webp" width="1024" height="1272" alt="" fetchpriority="high"><script>'), ['FETCHPRIORITY']);
  /* --- preload --- */
  kasus('preload font tanpa crossorigin', ganti('index.html', 'type="font/woff2" crossorigin>', 'type="font/woff2">'), ['PRELOAD_FONT']);
  kasus('preload font tanpa type', ganti('index.html', ' type="font/woff2" crossorigin>', ' crossorigin>'), ['PRELOAD_FONT']);
  kasus('preload font yang tidak dideklarasikan @font-face', (fx, d) => { fx.tulis('assets/fonts/C.woff2', fx.woff2()); ganti('index.html', 'href="assets/fonts/A.woff2" as="font"', 'href="assets/fonts/C.woff2" as="font"')(fx, d); }, ['PRELOAD_TAK_PAKAI']);
  kasus('preload font menunjuk berkas hilang', ganti('index.html', 'href="assets/fonts/A.woff2" as="font"', 'href="assets/fonts/Z.woff2" as="font"'), ['REF_HILANG']);
  kasus('@font-face hanya local() tanpa font-display sah', ganti('index.html', '<style>', "<style>@font-face{font-family:'F';src:local('Arial');size-adjust:106%}"), null);
  kasus('preload font tanpa as', ganti('index.html', 'as="font" type="font/woff2" crossorigin>', 'type="font/woff2" crossorigin>'), ['PRELOAD_GAMBAR']);
  kasus('preload gambar imagesrcset w tanpa imagesizes', ganti('index.html', ' imagesizes="(max-width:900px) 64vw, 39vw"', ''), ['PRELOAD_GAMBAR']);
  kasus('dua preload gambar (unduhan ganda)', ganti('index.html', '<style>', '<link rel="preload" href="assets/neru.webp" as="image" type="image/webp"><style>'), ['PRELOAD_GANDA']);
  kasus('preload font ganda', ganti('index.html', '<style>', '<link rel="preload" href="assets/fonts/A.woff2" as="font" type="font/woff2" crossorigin><style>'), ['PRELOAD_GANDA']);
  /* --- font --- */
  kasus('font-display hilang', ganti('index.html', 'font-display:swap;src:url(assets/fonts/A.woff2)', 'src:url(assets/fonts/A.woff2)'), ['FONT_DISPLAY']);
  kasus('font-display block', ganti('index.html', 'font-display:swap;src:url(assets/fonts/A.woff2)', 'font-display:block;src:url(assets/fonts/A.woff2)'), ['FONT_DISPLAY']);
  kasus('font-display auto', ganti('index.html', 'font-display:swap;src:url(assets/fonts/A.woff2)', 'font-display:auto;src:url(assets/fonts/A.woff2)'), ['FONT_DISPLAY']);
  kasus('font-display optional sah', ganti('index.html', 'font-display:swap;src:url(assets/fonts/A.woff2)', 'font-display:optional;src:url(assets/fonts/A.woff2)'), null);
  kasus('font tanpa format woff2', ganti('index.html', "url(assets/fonts/A.woff2) format('woff2')", 'url(assets/fonts/A.woff2)'), ['FONT_FORMAT']);
  /* --- format dan anggaran berkas --- */
  kasus('ekstensi webp isi png', (fx, d) => writeFileSync(join(d, 'assets/neru-512.webp'), fx.png(512, 636)), ['FORMAT_BERKAS']);
  kasus('ekstensi woff2 isi teks', (fx, d) => writeFileSync(join(d, 'assets/fonts/B.woff2'), 'bukan font'), ['FORMAT_BERKAS']);
  kasus('ekstensi svg isi biner', (fx, d) => writeFileSync(join(d, 'assets/brand/icon.svg'), Buffer.from([1, 2, 3, 4, 5])), ['FORMAT_BERKAS']);
  kasus('berkas kosong berekstensi avif', (fx, d) => writeFileSync(join(d, 'assets/neru-512.avif'), Buffer.alloc(0)), ['FORMAT_BERKAS']);
  kasus('berkas melebihi batas per berkas', (fx, d) => writeFileSync(join(d, 'assets/neru.webp'), fx.webp(1024, 1272, 300 * 1024)), ['ANGGARAN_BERKAS']);
  kasus('bobot halaman melebihi anggaran', () => {}, ['ANGGARAN_HALAMAN'], { anggaran: { halaman: { 'index.html': 500 } } });
  kasus('anggaran halaman longgar lulus', () => {}, null, { anggaran: { halaman: { 'index.html': 10 * 1024 * 1024 } } });
  /* --- aset yatim dan .vercelignore --- */
  kasus('aset berat tanpa rujukan', (fx, d) => writeFileSync(join(d, 'assets/besar.png'), Buffer.concat([fx.png(10, 10), Buffer.alloc(30 * 1024)])), ['ASET_YATIM']);
  kasus('aset berat tanpa rujukan tetapi di .vercelignore lulus', (fx, d) => { writeFileSync(join(d, 'assets/besar.png'), Buffer.concat([fx.png(10, 10), Buffer.alloc(30 * 1024)])); writeFileSync(join(d, '.vercelignore'), 'assets/besar.png\n'); }, null);
  kasus('aset kecil tanpa rujukan boleh', (fx, d) => writeFileSync(join(d, 'assets/kecil.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>'), null);
  kasus('entri .vercelignore tidak ada', (fx, d) => writeFileSync(join(d, '.vercelignore'), 'assets/tidak-ada.png\n'), ['IGNORE_HILANG']);
  kasus('entri .vercelignore menunjuk berkas yang dirujuk', (fx, d) => writeFileSync(join(d, '.vercelignore'), 'assets/neru.webp\n'), ['IGNORE_DIRUJUK']);
  kasus('pola folder .vercelignore tanpa kecocokan', (fx, d) => writeFileSync(join(d, '.vercelignore'), 'tidak-ada/\n'), ['IGNORE_HILANG']);
  /* --- frame --- */
  kasus('frame kurang satu', (fx, d) => rmSync(join(d, 'assets/maskot-animasi/frames-m/f20.webp')), ['FRAME_LENGKAP']);
  kasus('frame lebar salah', (fx, d) => writeFileSync(join(d, 'assets/maskot-animasi/frames-m/f03.webp'), fx.webp(547, 648, 500)), ['FRAME_LENGKAP']);
  kasus('frame melebihi anggaran folder', () => {}, ['ANGGARAN_FRAME'], { anggaran: { frame: { 'frames-m': 1000 } } });
  kasus('frame bernomor loncat', (fx, d) => { rmSync(join(d, 'assets/maskot-animasi/frames/f05.webp')); writeFileSync(join(d, 'assets/maskot-animasi/frames/f55.webp'), fx.webp(547, 645, 500)); }, ['FRAME_LENGKAP']);
  /* --- masukan jahat / ketahanan --- */
  kasus('masukan jahat: srcset 1 MB tidak meledak', ganti('index.html', '<script>', '<img src="assets/neru.webp" srcset="' + 'assets/neru.webp 1024w,'.repeat(40000) + '" sizes="1px" width="1024" height="1272" alt=""><script>'), null, { anggaran: { halaman: { 'index.html': 1e9 } } });
  kasus('masukan jahat: 200 ribu tanda < berturut', ganti('index.html', '<script>', '<'.repeat(200000) + '<script>'), null);
  kasus('masukan jahat: tag tanpa penutup', ganti('index.html', '<script>', '<img src="assets/neru.webp" width="1024" height="1272" alt="x"'), null);
  kasus('masukan jahat: atribut berisi > dalam tanda kutip', ganti('index.html', 'alt="Neru"', 'alt="a>b <script>"'), null);
  kasus('masukan jahat: HTML tanpa tag sama sekali', (fx, d) => writeFileSync(join(d, 'index.html'), '\u0000\u0001 bukan html \uFFFF'), null);
  kasus('masukan jahat: nama berkas Unicode', (fx, d) => { writeFileSync(join(d, 'assets/gambar \u00e9\u4e2d.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>'); }, null);
  kasus('masukan jahat: symlink ke luar akar tidak diikuti', (fx, d) => { symlinkSync('/etc', join(d, 'assets/tautan')); }, null);

  for (const m of hasilKasus) console.log(m);
  return { lulus, gagal };
}

/* ---------- CLI ---------- */
const ini = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === ini) {
  const akar = join(dirname(ini), '..');
  let kode = 0;
  const hanyaTes = process.argv.includes('--tes'), hanyaRepo = process.argv.includes('--repo');
  if (!hanyaTes) {
    const r = periksa(akar);
    console.log(`== Aset repo ==`);
    for (const x of r.pelanggaran) console.log(`  PELANGGARAN ${x.kode}: ${x.berkas}: ${x.pesan}`);
    console.log(`  ${r.jumlahPemeriksaan} pemeriksaan, ${r.pelanggaran.length} pelanggaran`);
    for (const p of r.halaman) console.log(`  bobot statis ${p}: ${((r.bobotHalaman[p] || 0) / KB).toFixed(0)} KB (anggaran ${((ANGGARAN.halaman[p] ?? ANGGARAN.halaman.default) / KB).toFixed(0)} KB)`);
    if (r.pelanggaran.length) kode = 1;
  }
  if (!hanyaRepo) {
    console.log(`== Uji mandiri pemeriksa ==`);
    const t = jalankanUjiMandiri();
    console.log(`  ${t.lulus} kasus lulus, ${t.gagal} gagal`);
    if (t.gagal) kode = 1;
  }
  process.exit(kode);
}
