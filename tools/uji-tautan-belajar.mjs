#!/usr/bin/env node
/* Uji tautan landing ke Ruang Belajar (kegiatan H3). Hanya membaca; tidak mengubah berkas.
   Pakai:  node tools/uji-tautan-belajar.mjs            (statis, kasus negatif, dan browser)
           node tools/uji-tautan-belajar.mjs --cepat    (tanpa browser)
   1. Statis: tepat satu tautan di dalam section #modul-d, href "belajar/", teks sesuai BACKLOG, atribut hanya class dan href,
      gaya tidak memakai cyan sebagai warna teks, area ketuk minimal 44 px, tujuan ada dan tetap noindex, tidak masuk sitemap.
   2. Kasus negatif: salinan teks halaman dirusak di memori; tiap kerusakan harus tertangkap dengan kode yang tepat.
   3. Browser (header dari vercel.json): lima lebar, gerak menyala dan dikurangi, ketuk, keyboard, tanpa JavaScript,
      menu HP, subfolder (meniru GitHub Pages), dan kontrol negatif agar pemeriksaan browser terbukti bisa gagal.
   Kode keluar 0 lulus, 1 gagal, 2 lulus tetapi Playwright tidak ada. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CEPAT = process.argv.includes('--cepat');
const HREF = 'belajar/';
const TEKS = 'Intip ruang belajar (pratinjau)';

let lulus = 0, gagal = 0;
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log('  GAGAL: ' + ket); } };

/* ---------- pemeriksaan statis (fungsi murni atas teks) ---------- */
const tanpaKomentar = (s) => s.replace(/<!--[\s\S]*?(-->|$)/g, '');
const markup = (s) => tanpaKomentar(s).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
const gaya = (s) => [...tanpaKomentar(s).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

function atribut(isi) {
  const a = [];
  for (const m of isi.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) a.push([m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '']);
  return a;
}
function tautan(html) {
  return [...html.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/a\s*>/gi)].map((m) => ({ pos: m.index, attr: atribut(m[1]), isi: m[2] }));
}
function rentang(html, tag, id) {
  const buka = new RegExp('<' + tag + '\\b[^>]*\\sid="' + id + '"[^>]*>', 'i').exec(html);
  if (!buka) return null;
  const ujung = html.indexOf('</' + tag + '>', buka.index);
  return ujung < 0 ? null : [buka.index, ujung];
}
function aturanGaya(css, kunci) {
  const hasil = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!kunci.test(m[1])) continue;
    const d = {};
    for (const x of m[2].split(';')) { const i = x.indexOf(':'); if (i > 0) d[x.slice(0, i).trim().toLowerCase()] = x.slice(i + 1).trim().toLowerCase(); }
    hasil.push({ sel: m[1].trim(), d });
  }
  return hasil;
}

export function periksa({ beranda, galeri, peta, adaTujuan }) {
  const k = new Set();
  const html = markup(beranda);
  const nilai = (t, n) => (t.attr.find((x) => x[0] === n) || [])[1];
  const calon = tautan(html).filter((t) => /belajar/i.test(String(nilai(t, 'href'))) || /\bpeek\b/.test(String(nilai(t, 'class'))));
  if (calon.length !== 1) k.add('T01');
  const mod = rentang(html, 'section', 'modul-d'), hero = rentang(html, 'section', 'hero');
  for (const t of calon) {
    if (nilai(t, 'href') !== HREF) k.add('T02');
    const teks = t.isi.replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/gi, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (teks !== TEKS) k.add('T03');
    if (!mod || t.pos < mod[0] || t.pos > mod[1]) k.add('T04');
    if (hero && t.pos > hero[0] && t.pos < hero[1]) k.add('T05');
    const nama = t.attr.map((x) => x[0]).sort().join(',');
    if (nama !== 'class,href') k.add('T06');
    if (nilai(t, 'class') !== 'peek') k.add('T07');
    if (/<(a|button|img|iframe|script|svg)\b|\son\w+=/i.test(t.isi)) k.add('T07');
  }
  const aturan = aturanGaya(gaya(beranda), /\.peek(?![\w-])/);
  const dasar = aturan.find((a) => a.sel === '.mod .peek');
  if (!dasar) k.add('T08');
  else {
    if (dasar.d.color !== 'var(--ink)') k.add('T08');
    if (!/\bunderline\b/.test(dasar.d['text-decoration'] || '')) k.add('T08');
    const tegak = parseFloat((dasar.d.padding || '0').split(/\s+/)[0]) || 0;
    const baris = /px$/.test(dasar.d['line-height'] || '') ? parseFloat(dasar.d['line-height']) : 0;
    if (tegak * 2 + baris < 44 || !/^(inline-block|block|inline-flex|flex)$/.test(dasar.d.display || '')) k.add('T09');
  }
  for (const { d } of aturan) {
    if (/cyan|#38e1ff/.test(d.color || '')) k.add('T08');
    if (d.display === 'none' || d.visibility === 'hidden' || /^0(\.0+)?$/.test(d.opacity || '') || d['pointer-events'] === 'none') k.add('T10');
  }
  if (!adaTujuan) k.add('T11');
  const g = markup(galeri || '');
  if (!/<meta\s+name="robots"\s+content="[^"]*\bnoindex\b[^"]*"/i.test(g)) k.add('T12');
  if (!tautan(g).some((t) => nilai(t, 'href') === '../index.html')) k.add('T13');
  if (/belajar/i.test(tanpaKomentar(peta || ''))) k.add('T14');
  return [...k].sort();
}

const baca = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '');
const asli = { beranda: baca('index.html'), galeri: baca('belajar/index.html'), peta: baca('sitemap.xml'), adaTujuan: existsSync(join(ROOT, 'belajar', 'index.html')) };

console.log('== Statis ==');
{
  const k = periksa(asli);
  for (const kode of ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10', 'T11', 'T12', 'T13', 'T14']) cek(!k.includes(kode), 'pemeriksaan ' + kode + ' gagal pada berkas repo');
}

console.log('== Kasus negatif (teks dirusak di memori) ==');
let negatif = 0;
{
  const A = '<a class="peek" href="belajar/">' + TEKS + ' <span aria-hidden="true">→</span></a>';
  cek(asli.beranda.split(A).length === 2, 'markup tautan acuan tidak ditemukan tepat sekali; kasus negatif tidak sah');
  const ganti = (kunci, a, b) => (o) => { if (!o[kunci].includes(a)) throw new Error('acuan hilang: ' + a); return { ...o, [kunci]: o[kunci].replace(a, () => b) }; };
  const link = (b) => ganti('beranda', A, b);
  const href = (h) => link(A.replace('href="belajar/"', 'href="' + h + '"'));
  const tambah = (at) => link(A.replace('<a ', '<a ' + at + ' '));
  const css = (a, b) => ganti('beranda', a, b);
  const sisip = (aturan) => ganti('beranda', '.mod .peek:hover{', aturan + '\n.mod .peek:hover{');
  const kasus = [
    ['tautan dihapus', link(''), ['T01']],
    ['tautan hanya di dalam komentar', link('<!-- ' + A + ' -->'), ['T01']],
    ['tautan hanya di dalam skrip', link('<script>var s=\'' + A + '\'</script>'), ['T01']],
    ['tautan ganda', link(A + A), ['T01']],
    ['href javascript:', href('javascript:alert(document.domain)//belajar/'), ['T02']],
    ['href data:', href('data:text/html,<p>belajar</p>'), ['T02']],
    ['href protokol-relatif', href('//jahat.example/belajar/'), ['T02']],
    ['href host luar', href('https://jahat.example/belajar/'), ['T02']],
    ['href absolut dari akar (rusak di subfolder)', href('/belajar/'), ['T02']],
    ['href keluar folder', href('belajar/../admin/'), ['T02']],
    ['huruf besar (404 di server peka huruf)', href('Belajar/'), ['T02']],
    ['href dengan karakter bidi', href('belajar/‮'), ['T02']],
    ['teks diganti klaim belum dikonfirmasi', link(A.replace(TEKS, 'Coba ruang belajar gratis')), ['T03']],
    ['teks tanpa kata pratinjau', link(A.replace(' (pratinjau)', '')), ['T03']],
    ['panah dibaca pembaca layar', link(A.replace(' aria-hidden="true"', '')), ['T03']],
    ['dipindah ke hero', (o) => { const t = link('')(o); return ganti('beranda', '<a class="ghost" href="#modul-d">', A + '<a class="ghost" href="#modul-d">')(t); }, ['T04', 'T05']],
    ['dipindah ke footer', (o) => { const t = link('')(o); return ganti('beranda', '</footer>', A + '</footer>')(t); }, ['T04']],
    ['target _blank', tambah('target="_blank"'), ['T06']],
    ['atribut onclick', tambah('onclick="fetch(\'//jahat.example\')"'), ['T06']],
    ['atribut ping pelacak', tambah('ping="//jahat.example/p"'), ['T06']],
    ['atribut hidden', tambah('hidden'), ['T06']],
    ['tabindex -1', tambah('tabindex="-1"'), ['T06']],
    ['style inline menyembunyikan', tambah('style="display:none"'), ['T06']],
    ['aria-hidden pada tautan', tambah('aria-hidden="true"'), ['T06']],
    ['kelas diganti', link(A.replace('class="peek"', 'class="peek rv"')), ['T07']],
    ['gambar disisipkan di tautan', link(A.replace('</a>', '<img src="x" alt=""></a>')), ['T07']],
    ['teks cyan di atas putih', css('font-weight:600;color:var(--ink);text-decoration:underline', 'font-weight:600;color:var(--cyan);text-decoration:underline'), ['T08']],
    ['cyan lewat aturan hover', sisip('.mod .peek:focus{color:#38E1FF}'), ['T08']],
    ['garis bawah hilang', css('font-weight:600;color:var(--ink);text-decoration:underline', 'font-weight:600;color:var(--ink);text-decoration:none'), ['T08']],
    ['area ketuk 36 px', css('padding:12px 0;font-size:16px', 'padding:6px 0;font-size:16px'), ['T09']],
    ['display inline (padding tidak menambah tinggi baris)', css('.mod .peek{display:inline-block', '.mod .peek{display:inline'), ['T09']],
    ['disembunyikan di media query', sisip('@media(max-width:900px){.mod .peek{display:none}}'), ['T10']],
    ['transparan', sisip('.mod .peek{opacity:0}'), ['T10']],
    ['tidak bisa diklik', sisip('.mod .peek{pointer-events:none}'), ['T10']],
    ['halaman tujuan hilang', (o) => ({ ...o, adaTujuan: false }), ['T11']],
    ['galeri kehilangan noindex', ganti('galeri', '<meta name="robots" content="noindex">', ''), ['T12']],
    ['noindex hanya di komentar', ganti('galeri', '<meta name="robots" content="noindex">', '<!-- <meta name="robots" content="noindex"> -->'), ['T12']],
    ['galeri tanpa jalan pulang', (o) => ({ ...o, galeri: o.galeri.split('href="../index.html"').join('href="#"') }), ['T13']],
    ['galeri masuk sitemap', (o) => ({ ...o, peta: '<urlset><url><loc>https://contoh.example/belajar/</loc></url></urlset>' }), ['T14']],
  ];
  for (const [nama, rusak, harus] of kasus) {
    let k = null;
    try { k = periksa(rusak({ ...asli })); } catch (e) { cek(false, 'kasus "' + nama + '": ' + e.message); continue; }
    negatif++;
    cek(harus.every((x) => k.includes(x)), 'kasus "' + nama + '" harus memicu ' + harus.join('+') + ', didapat ' + (k.join(',') || 'tidak ada'));
  }
}

/* ---------- browser ---------- */
let chromium = null;
if (!CEPAT) { try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.log('Playwright tidak tersedia: uji browser dilewati.'); } }

if (chromium) {
  console.log('== Browser ==');
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const aturan = JSON.parse(baca('vercel.json')).headers;
  const server = createServer((req, resp) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const sub = p.startsWith('/neruvia/'); if (sub) p = p.slice('/neruvia'.length);
    let f = normalize(join(ROOT, p));
    if (f !== normalize(ROOT + sep) && !f.startsWith(normalize(ROOT + sep))) { resp.writeHead(403); return resp.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { resp.writeHead(404); return resp.end('tidak ada'); }
    const h = { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (!sub) for (const a of aturan) if (a.source === '/(.*)' || a.source === p) for (const { key, value } of a.headers) h[key] = value;
    resp.writeHead(200, h); resp.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const br = await chromium.launch();

  const buka = async (opsi, jalan = '/') => {
    const ctx = await br.newContext(opsi); const page = await ctx.newPage(); const log = [], luar = [];
    page.on('pageerror', (e) => log.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy|violates/i.test(m.text())) log.push(m.text().slice(0, 160)); });
    page.on('request', (r) => { if (!r.url().startsWith(base) && !/^(data|blob):/.test(r.url())) luar.push(r.url()); });
    await page.goto(base + jalan, { waitUntil: 'networkidle' });
    return { ctx, page, log, luar };
  };
  /* gulir sampai tautan berada pada pecahan tinggi layar tertentu, tunggu posisi diam, lalu ukur */
  const ukurDi = async (page, pecahan) => {
    for (let i = 0; i < 4; i++) {
      await page.evaluate((f) => { const a = document.querySelector('#modul-d a.peek'); const r = a.getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight * f, behavior: 'instant' }); }, pecahan);
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(1200);
    return page.evaluate(() => {
      const a = document.querySelector('#modul-d a.peek'), r = a.getBoundingClientRect(), s = getComputedStyle(a);
      const titik = [[0.5, 0.5], [0.04, 0.2], [0.96, 0.2], [0.04, 0.8], [0.96, 0.8]];
      const kena = titik.filter(([x, y]) => { const e = document.elementFromPoint(r.left + r.width * x, r.top + r.height * y); return e && (e === a || a.contains(e)); }).length;
      let opasitas = 1, latar = null;
      for (let e = a; e; e = e.parentElement) { const c = getComputedStyle(e); opasitas *= parseFloat(c.opacity); if (!latar && c.backgroundColor !== 'rgba(0, 0, 0, 0)') latar = c.backgroundColor; }
      const lum = (c) => { const [R, G, B] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
      const [t, b] = [lum(s.color), lum(latar || 'rgb(255,255,255)')];
      return { w: r.width, h: r.height, kiri: r.left, kanan: r.right, atas: r.top, bawah: r.bottom, vw: document.documentElement.clientWidth, vh: innerHeight, gulirX: document.documentElement.scrollWidth, kena, opasitas, warna: s.color, latar, kontras: (Math.max(t, b) + 0.05) / (Math.min(t, b) + 0.05), garis: s.textDecorationLine, warnaGaris: s.textDecorationColor, baris: Math.round((r.height - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)) / parseFloat(s.lineHeight)) };
    });
  };
  const galeriSiap = async (page) => {
    await page.waitForFunction(() => { const g = document.querySelector('.grid'); return g && g.getAttribute('aria-busy') !== 'true' && g.querySelectorAll('.card').length >= 3; }, null, { timeout: 8000 }).catch(() => {});
    return page.evaluate(() => ({ jalan: location.pathname, kartu: document.querySelectorAll('.grid .card').length, judul: document.title }));
  };

  for (const lebar of [360, 390, 768, 1024, 1440]) {
    const sentuh = lebar <= 768;
    for (const gerak of ['no-preference', 'reduce']) {
      const L = lebar + ' ' + (gerak === 'reduce' ? 'gerak-dikurangi' : 'gerak');
      const { ctx, page, log, luar } = await buka({ viewport: { width: lebar, height: sentuh ? 844 : 900 }, reducedMotion: gerak, hasTouch: sentuh, isMobile: sentuh });
      /* Saat gerak menyala, lembar FAQ yang naik sengaja menutupi dasar bagian ini ketika tautan sudah di separuh atas layar
         (transisi antarbagian), jadi posisi yang diperiksa adalah rentang bacanya. Gerak dikurangi: tanpa transisi, sampai 0,2. */
      for (const pecahan of gerak === 'reduce' ? [0.85, 0.6, 0.4, 0.2] : [0.85, 0.65, 0.5]) {
        const u = await ukurDi(page, pecahan);
        cek(u.opasitas > 0.99, `${L} posisi ${pecahan}: tautan belum tampak penuh (opasitas ${u.opasitas.toFixed(2)})`);
        cek(u.kena === 5, `${L} posisi ${pecahan}: tautan tertutup elemen lain (${u.kena}/5 titik)`);
        cek(u.h >= 43.5, `${L} posisi ${pecahan}: tinggi ${u.h.toFixed(1)} px < 44`);
        cek(u.kiri >= 0 && u.kanan <= u.vw && u.gulirX <= u.vw, `${L} posisi ${pecahan}: keluar layar atau halaman bergulir ke samping`);
        if (pecahan === 0.6 || pecahan === 0.65) {
          cek(u.baris === 1, `${L}: teks tautan ${u.baris} baris`);
          cek(u.kontras >= 4.5, `${L}: kontras ${u.kontras.toFixed(2)} (${u.warna} di ${u.latar})`);
          cek(u.garis === 'underline' && u.warnaGaris === 'rgb(56, 225, 255)', `${L}: garis bawah cyan tidak tampil (${u.garis} ${u.warnaGaris})`);
        }
      }
      if (gerak === 'no-preference') {
        /* lebar jendela gulir tempat tautan tampak utuh, tidak tertutup, dan tingginya cukup: minimal 35% tinggi layar */
        const jendela = await page.evaluate(async () => {
          const a = document.querySelector('#modul-d a.peek'), y0 = a.getBoundingClientRect().top + scrollY, langkah = 40;
          let urut = 0, terpanjang = 0;
          for (let y = y0 - innerHeight + 40; y < y0; y += langkah) {
            scrollTo({ top: y, behavior: 'instant' });
            await new Promise((r) => setTimeout(r, 90));
            const r = a.getBoundingClientRect(), e = [[0.04, 0.2], [0.5, 0.5], [0.96, 0.8]].every(([x, z]) => document.elementFromPoint(r.left + r.width * x, r.top + r.height * z) === a || a.contains(document.elementFromPoint(r.left + r.width * x, r.top + r.height * z)));
            urut = e && r.height >= 43.5 && r.bottom <= innerHeight ? urut + langkah : 0;
            terpanjang = Math.max(terpanjang, urut);
          }
          return terpanjang / innerHeight;
        });
        cek(jendela >= 0.35, `${L}: jendela gulir tautan tampak utuh hanya ${Math.round(jendela * 100)}% tinggi layar`);
        console.log(`  ${lebar}: tautan tampak utuh sepanjang ${Math.round(jendela * 100)}% tinggi layar`);
      }
      await ukurDi(page, 0.6);
      const sasaran = page.locator('#modul-d a.peek');
      if (sentuh) await sasaran.tap(); else await sasaran.click();
      await page.waitForURL('**/belajar/', { timeout: 8000 }).catch(() => {});
      const g = await galeriSiap(page);
      cek(g.jalan === '/belajar/' && g.kartu >= 3 && /Ruang Belajar/.test(g.judul), `${L}: setelah diketuk ${JSON.stringify(g)}`);
      await page.locator('a.back').click(); await page.waitForLoadState('networkidle');
      cek(/^\/(index\.html)?$/.test(new URL(page.url()).pathname), `${L}: tautan pulang membawa ke ${page.url()}`);
      await page.goBack({ waitUntil: 'networkidle' }); await page.goBack({ waitUntil: 'networkidle' });
      cek(new URL(page.url()).pathname === '/' && await page.locator('#modul-d a.peek').count() === 1, `${L}: tombol kembali peramban tidak mengembalikan beranda`);
      cek(log.length === 0, `${L}: galat atau pelanggaran CSP: ${log.join(' | ')}`);
      cek(luar.length === 0, `${L}: permintaan ke luar: ${luar.join(' ')}`);
      await ctx.close();
    }
    /* keyboard */
    {
      const { ctx, page, log } = await buka({ viewport: { width: lebar, height: 900 } });
      let n = 0, sebelum = '', fokus = false;
      for (; n < 60 && !fokus; n++) {
        await page.keyboard.press('Tab');
        const s = await page.evaluate(() => ({ kena: document.activeElement.matches('#modul-d a.peek'), nama: (document.activeElement.textContent || document.activeElement.getAttribute('aria-label') || '').trim().slice(0, 40) }));
        fokus = s.kena; if (!fokus) sebelum = s.nama;
      }
      cek(fokus, `${lebar} keyboard: tautan tidak terjangkau dalam 60 kali Tab`);
      if (fokus) {
        await page.waitForTimeout(1800);
        const o = await page.evaluate(() => { const a = document.activeElement, s = getComputedStyle(a), r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { gaya: s.outlineStyle, tebal: parseFloat(s.outlineWidth), warna: s.outlineColor, tampak: r.top >= 0 && r.bottom <= innerHeight && (e === a || a.contains(e)) }; });
        cek(o.gaya !== 'none' && o.tebal >= 2 && o.warna === 'rgb(8, 8, 8)', `${lebar} keyboard: cincin fokus ${JSON.stringify(o)}`);
        cek(o.tampak, `${lebar} keyboard: tautan berfokus tidak terlihat di layar`);
        await page.keyboard.press('Tab');
        const lanjut = await page.evaluate(() => !!document.activeElement.closest('#faq-d, #modul-d'));
        cek(lanjut, `${lebar} keyboard: Tab sesudah tautan tidak berlanjut ke bagian berikutnya`);
        await page.keyboard.press('Shift+Tab');
        cek(await page.evaluate(() => document.activeElement.matches('#modul-d a.peek')), `${lebar} keyboard: Shift+Tab tidak kembali ke tautan`);
        await page.keyboard.press('Enter');
        await page.waitForURL('**/belajar/', { timeout: 8000 }).catch(() => {});
        cek(new URL(page.url()).pathname === '/belajar/', `${lebar} keyboard: Enter tidak membuka ruang belajar`);
      }
      cek(log.length === 0, `${lebar} keyboard: galat ${log.join(' | ')}`);
      await ctx.close();
    }
    /* tanpa JavaScript */
    {
      const { ctx, page } = await buka({ viewport: { width: lebar, height: 900 }, javaScriptEnabled: false });
      const a = page.locator('#modul-d a.peek'); await a.scrollIntoViewIfNeeded();
      cek(await a.isVisible() && await page.evaluate(() => getComputedStyle(document.querySelector('.lessons')).opacity) === '1', `${lebar} tanpa JS: tautan tidak tampak`);
      await a.click(); await page.waitForURL('**/belajar/', { timeout: 8000 }).catch(() => {});
      cek(new URL(page.url()).pathname === '/belajar/', `${lebar} tanpa JS: klik tidak membuka ruang belajar`);
      await ctx.close();
    }
    /* subfolder, meniru GitHub Pages proyek */
    {
      const { ctx, page } = await buka({ viewport: { width: lebar, height: 900 }, reducedMotion: 'reduce' }, '/neruvia/');
      await page.locator('#modul-d a.peek').click();
      await page.waitForURL('**/neruvia/belajar/', { timeout: 8000 }).catch(() => {});
      const g = await galeriSiap(page);
      cek(g.jalan === '/neruvia/belajar/' && g.kartu >= 3, `${lebar} subfolder: ${JSON.stringify(g)}`);
      await ctx.close();
    }
  }
  /* menu HP terbuka: tautan di belakang panel tidak boleh bisa difokus */
  for (const lebar of [360, 390, 768]) {
    const { ctx, page } = await buka({ viewport: { width: lebar, height: 844 } });
    await page.click('#menu-btn');
    const s = await page.evaluate(() => { const a = document.querySelector('#modul-d a.peek'); a.focus(); return { fokus: document.activeElement === a, inert: !!a.closest('[inert]') }; });
    cek(!s.fokus && s.inert, `${lebar} menu terbuka: tautan di belakang panel masih aktif ${JSON.stringify(s)}`);
    await page.keyboard.press('Escape');
    cek(await page.evaluate(() => !document.querySelector('#modul-d a.peek').closest('[inert]')), `${lebar} menu ditutup: tautan masih inert`);
    await ctx.close();
  }
  /* kontrol negatif: pengukur browser harus bisa melihat kerusakan */
  {
    const { ctx, page } = await buka({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.evaluate(() => { const d = document.createElement('div'); d.id = 'tutup'; d.style.cssText = 'position:fixed;inset:0;z-index:999'; document.body.appendChild(d); });
    cek((await ukurDi(page, 0.6)).kena === 0, 'kontrol: lapisan penutup tidak terdeteksi');
    await page.evaluate(() => { document.getElementById('tutup').remove(); const a = document.querySelector('#modul-d a.peek'); a.style.padding = '0'; a.style.color = '#38E1FF'; a.style.whiteSpace = 'nowrap'; a.style.letterSpacing = '12px'; });
    const u = await ukurDi(page, 0.6);
    cek(u.h < 43.5, 'kontrol: tinggi kecil tidak terdeteksi');
    cek(u.kontras < 4.5, 'kontrol: kontras rendah tidak terdeteksi');
    cek(u.kanan > u.vw || u.gulirX > u.vw, 'kontrol: luapan ke samping tidak terdeteksi');
    await page.evaluate(() => { document.querySelector('.lessons').style.opacity = '0'; });
    cek((await ukurDi(page, 0.6)).opasitas < 0.99, 'kontrol: induk transparan tidak terdeteksi');
    await ctx.close();
  }
  await br.close(); server.close();
}

console.log(`\n${lulus} pemeriksaan lulus, ${gagal} gagal (${negatif} kasus negatif)`);
process.exit(gagal ? 1 : (!CEPAT && !chromium ? 2 : 0));
