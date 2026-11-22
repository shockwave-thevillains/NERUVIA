#!/usr/bin/env node
/* Uji header keamanan dan CSP (kegiatan S3).
   1. vercel.json harus sesuai isi halaman (hash inline mutakhir).
   2. Server lokal menyajikan situs dengan header dari vercel.json (meniru aturan Vercel).
   3. Playwright memuat tiap halaman di 1440 dan 390 px: tidak boleh ada pelanggaran CSP atau galat skrip,
      fitur utama harus tetap jalan (form waitlist dengan Supabase tiruan, galeri, pelajaran, ekspor progres),
      dan tampilan harus identik piksel dengan versi tanpa header.
   4. Kontrol negatif: skrip inline, koneksi ke host luar, dan bingkai harus diblokir.
   Playwright tidak dipasang di repo; bila tidak ada, uji browser dilewati dengan peringatan (kode 2). */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as gabung } from 'node:path';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bangun } from './buat-vercel-json.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webm': 'video/webm', '.mp4': 'video/mp4' };
let gagal = 0, lulus = 0;
const cek = (ok, ket) => { if (ok) lulus++; else { gagal++; console.log('  GAGAL: ' + ket); } };

/* 1. berkas sesuai halaman */
const { json } = bangun();
cek(existsSync(join(ROOT, 'vercel.json')) && readFileSync(join(ROOT, 'vercel.json'), 'utf8') === json, 'vercel.json tidak sesuai isi halaman (jalankan tools/buat-vercel-json.mjs)');
const aturan = JSON.parse(json).headers;

/* 2. server yang meniru Vercel: header dari tiap aturan yang cocok */
function headerUntuk(path) {
  const h = {};
  for (const a of aturan) {
    const cocok = a.source === '/(.*)' ? true : a.source === path;
    if (cocok) for (const { key, value } of a.headers) h[key] = value;
  }
  return h;
}
function mulai(denganHeader) {
  return new Promise((res) => {
    const s = createServer((req, resp) => {
      const url = new URL(req.url, 'http://x'); let p = decodeURIComponent(url.pathname);
      let f = normalize(join(ROOT, p));
      if (!f.startsWith(ROOT)) { resp.writeHead(403); return resp.end(); }
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
      if (!existsSync(f)) { resp.writeHead(404); return resp.end('tidak ada'); }
      const h = { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
      if (denganHeader) Object.assign(h, headerUntuk(p));
      resp.writeHead(200, h); resp.end(readFileSync(f));
    }).listen(0, '127.0.0.1', () => res({ s, base: 'http://127.0.0.1:' + s.address().port }));
  });
}

const halaman = ['/', '/belajar/', '/belajar/pelajaran.html?id=l1-m1-p1', '/terima-kasih.html', '/kebijakan-privasi.html', '/admin/'];
const a = await mulai(true), b = await mulai(false);

/* header respons */
{
  const wajib = ['x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security', 'x-frame-options', 'cross-origin-opener-policy'];
  for (const p of ['/', '/index.html', '/belajar', '/belajar/', '/belajar/index.html', '/belajar/pelajaran.html', '/terima-kasih.html', '/kebijakan-privasi.html', '/admin', '/admin/', '/admin/index.html']) {
    const r = await fetch(a.base + p); const csp = r.headers.get('content-security-policy') || '';
    for (const k of wajib) cek(!!r.headers.get(k), p + ' tanpa header ' + k);
    cek(/default-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /base-uri 'none'/.test(csp), p + ' CSP tidak lengkap');
    cek(!/unsafe-inline|unsafe-eval|\*/.test(csp), p + ' CSP memuat unsafe-inline/unsafe-eval/wildcard');
    cek(/script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')*;/.test(csp), p + ' script-src bukan self + hash');
  }
  const idx = (await fetch(a.base + '/')).headers.get('content-security-policy');
  cek(/connect-src 'self' https:\/\/[a-z0-9]+\.supabase\.co;/.test(idx), 'beranda: connect-src harus self + satu host Supabase');
  const bel = (await fetch(a.base + '/belajar/')).headers.get('content-security-policy');
  cek(/connect-src 'self';/.test(bel), 'galeri: connect-src hanya self');
}

/* 3 dan 4. browser */
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.log('Playwright tidak tersedia: uji browser dilewati.'); }
if (chromium) {
  const br = await chromium.launch();
  const kumpul = (page, log) => {
    page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to|violates/i.test(t)) log.csp.push(t.slice(0, 160)); else if (m.type() === 'error' && !/Failed to load resource/.test(t)) log.err.push(t.slice(0, 160)); });
    page.on('pageerror', (e) => log.err.push('pageerror: ' + e.message.slice(0, 160)));
  };
  const foto = {};
  for (const lebar of [1440, 390]) {
    for (const [nama, base] of [['csp', a.base], ['polos', b.base]]) {
      const ctx = await br.newContext({ viewport: { width: lebar, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
      for (const p of halaman) {
        const page = await ctx.newPage(); const log = { csp: [], err: [] }; kumpul(page, log);
        await page.goto(base + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
        if (nama === 'csp') { cek(log.csp.length === 0, lebar + ' ' + p + ' pelanggaran CSP: ' + log.csp.join(' | ')); cek(log.err.length === 0, lebar + ' ' + p + ' galat: ' + log.err.join(' | ')); }
        foto[nama + lebar + p] = await page.screenshot({ fullPage: true });
        await page.close();
      }
      await ctx.close();
    }
    for (const p of halaman) cek(Buffer.compare(foto['csp' + lebar + p], foto['polos' + lebar + p]) === 0, lebar + ' ' + p + ' tampilan berbeda dari versi tanpa header');
  }

  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  /* form waitlist: Supabase ditiru lewat route (CSP tetap diperiksa lebih dulu oleh browser) */
  {
    const page = await ctx.newPage(); const log = { csp: [], err: [] }; kumpul(page, log); let terkirim = 0;
    await page.route('https://*.supabase.co/**', (r) => { terkirim++; r.fulfill({ status: 201, body: '' }); });
    await page.goto(a.base + '/', { waitUntil: 'networkidle' });
    await page.fill('#f-name', 'Uji CSP'); await page.fill('#f-email', 'uji.csp@example.com'); await page.check('#f-consent');
    await page.waitForTimeout(1400); await page.click('#wl button[type=submit]');
    await page.waitForURL('**/terima-kasih.html', { timeout: 5000 }).catch(() => {});
    cek(terkirim === 1, 'form: permintaan ke Supabase tiruan tidak terkirim (CSP memblokir?)');
    cek(page.url().endsWith('/terima-kasih.html'), 'form: tidak berpindah ke halaman terima kasih');
    cek(log.csp.length === 0, 'form: pelanggaran CSP ' + log.csp.join(' | '));
    await page.close();
  }
  /* galeri, pelajaran, ekspor progres */
  {
    const page = await ctx.newPage(); const log = { csp: [], err: [] }; kumpul(page, log);
    await page.goto(a.base + '/belajar/', { waitUntil: 'networkidle' });
    cek((await page.locator('#grid > *').count()) > 0, 'galeri: kartu level tidak tampil');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 4000 }).catch(() => null), page.click('#bk-out')]);
    cek(!!dl && /^neruvia-progres-/.test(dl.suggestedFilename()), 'galeri: ekspor progres tidak mengunduh berkas');
    await page.goto(a.base + '/belajar/pelajaran.html?id=l1-m1-p1', { waitUntil: 'networkidle' });
    cek((await page.locator('main').innerText()).length > 200, 'pelajaran: isi tidak tampil');
    cek(log.csp.length === 0, 'galeri/pelajaran: pelanggaran CSP ' + log.csp.join(' | '));
    await page.close();
  }
  /* admin: Supabase Auth dan REST ditiru lewat route; kebijakan RLS asli diuji terpisah di SQL */
  {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const jwt = (email) => b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ email, sub: 'u1', exp: 9999999999 }) + '.' + 'c2lnbmF0dXJlLXRpZGFrLW5ueXRh';
    const hariIni = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    const contoh = [
      { created_at: hariIni + 'T03:04:05+00:00', name: '=HYPERLINK("http://contoh.invalid","klik")', email: 'andi@example.com', jalur: 'AI dari Nol' },
      { created_at: hariIni + 'T01:00:00+00:00', name: '<b>Tebal</b> "Siti", Ayu', email: '+x@example.com', jalur: 'AI untuk Kerja' },
      { created_at: '2026-11-01T00:00:00+00:00', name: '@sum', email: 'dewi.lestari@example.co.id', jalur: '-1+1' },
    ];
    const csvHal = [];
    const skenario = async (nama, { email, sandiBenar = 'rahasia-benar', admin = true, admins401 = false, jalur500 = false }) => {
      const page = await ctx.newPage(); const log = { csp: [], err: [] }; kumpul(page, log); let logout = 0;
      const draf = new Map(), videos = [], simpanDraf = [], kirimVideo = [];
      await page.route('https://*.supabase.co/**', (r) => {
        const u = new URL(r.request().url()), m = r.request().method();
        if (u.pathname === '/auth/v1/token') { const bd = JSON.parse(r.request().postData() || '{}'); return bd.password === sandiBenar ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: jwt(email), expires_in: 3600, user: { email } }) }) : r.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid_grant"}' }); }
        if (u.pathname === '/auth/v1/logout') { logout++; return r.fulfill({ status: 204, body: '' }); }
        if (u.pathname === '/rest/v1/admins') return admins401 ? r.fulfill({ status: 401, body: '{}' }) : r.fulfill({ status: 200, contentType: 'application/json', body: admin ? '[{"user_id":"u1"}]' : '[]' });
        const jsonOk = (x, h = {}) => r.fulfill({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(x) });
        if (u.pathname === '/rest/v1/pelajaran_draf') {
          const idq = (u.searchParams.get('id') || '').replace(/^eq\./, '');
          if (m === 'GET') return idq ? jsonOk(draf.has(idq) ? [{ isi: draf.get(idq).isi }] : []) : jsonOk([...draf.values()].map((x) => ({ id: x.id, status: x.status, updated_at: '2026-11-22T01:00:00+00:00' })));
          if (m === 'POST') { const b = JSON.parse(r.request().postData() || '{}'); simpanDraf.push(b); draf.set(b.id, b); return r.fulfill({ status: 201, body: '' }); }
          if (m === 'DELETE') { draf.delete(idq); return r.fulfill({ status: 204, body: '' }); }
        }
        if (u.pathname === '/storage/v1/object/list/video-materi') return jsonOk(videos.map((v) => ({ name: v, id: 'x', created_at: '2026-11-22T01:00:00+00:00', metadata: { size: 2048, mimetype: 'video/mp4' } })));
        if (u.pathname.startsWith('/storage/v1/object/sign/video-materi/')) {
          if (m === 'POST') return jsonOk({ signedURL: '/object/sign/video-materi/' + u.pathname.split('/').pop() + '?token=abc' });
          return r.fulfill({ status: 200, contentType: 'video/mp4', body: 'bukan-video-asli' });
        }
        if (u.pathname.startsWith('/storage/v1/object/video-materi/')) {
          const nama = decodeURIComponent(u.pathname.split('/').pop());
          if (m === 'POST') { if (videos.includes(nama)) return r.fulfill({ status: 409, body: '{}' }); kirimVideo.push({ nama, tipe: r.request().headers()['content-type'] }); videos.push(nama); return jsonOk({ Key: nama }); }
          if (m === 'DELETE') { videos.splice(videos.indexOf(nama), 1); return jsonOk({}); }
        }
        if (u.pathname === '/rest/v1/waitlist_per_hari') return jsonOk([{ hari: hariIni, jumlah: 3 }, { hari: new Date(Date.parse(hariIni) - 86400000).toISOString().slice(0, 10), jumlah: 2 }, { hari: '1999-01-01', jumlah: 7 }, { hari: 'ngawur', jumlah: 1 }]);
        if (u.pathname === '/rest/v1/waitlist_per_jalur') return jalur500 ? r.fulfill({ status: 500, body: '{}' }) : jsonOk([{ jalur: 'AI dari Nol', jumlah: 4 }, { jalur: '<img src=x onerror=window.__xss=2>', jumlah: 1 }]);
        if (u.pathname === '/rest/v1/waitlist') {
          const sel = u.searchParams.get('select') || '';
          if (sel === 'id') return jsonOk([], { 'content-range': '0-0/42', 'access-control-expose-headers': 'Content-Range' });
          if (u.searchParams.get('limit') === '1000') { csvHal.push(u.searchParams.get('offset')); return jsonOk(u.searchParams.get('offset') === '0' ? contoh : []); }
          return jsonOk(contoh);
        }
        return r.fulfill({ status: 404, body: '' });
      });
      await page.goto(a.base + '/admin/', { waitUntil: 'networkidle' });
      return { page, log, logout: () => logout, nama, draf, videos, simpanDraf, kirimVideo };
    };
    const masuk = async (page, em, pw) => { await page.fill('#a-email', em); await page.fill('#a-sandi', pw); await page.click('#a-kirim'); await page.waitForTimeout(500); };
    /* 1 sandi salah */
    let t = await skenario('salah', { email: 'admin@example.com' });
    await masuk(t.page, 'admin@example.com', 'salah');
    cek(await t.page.locator('#panel').isHidden() && /salah/.test(await t.page.locator('#a-msg').innerText()), 'admin: sandi salah harus menolak dengan pesan umum');
    cek((await t.page.inputValue('#a-sandi')) === '', 'admin: kolom sandi harus dikosongkan setelah kirim');
    /* 5 kali salah: kunci */
    for (let i = 0; i < 4; i++) { await t.page.fill('#a-sandi', 'x'); await t.page.click('#a-kirim'); await t.page.waitForTimeout(250); }
    cek(await t.page.locator('#a-kirim').isDisabled(), 'admin: tombol harus terkunci sementara setelah 5 kegagalan');
    cek(t.log.csp.length === 0, 'admin: pelanggaran CSP saat sandi salah ' + t.log.csp.join('|')); await t.page.close();
    /* admin sah, simpan sesi, muat ulang, keluar */
    t = await skenario('sah', { email: 'admin@example.com' });
    await masuk(t.page, 'admin@example.com', 'rahasia-benar');
    cek(await t.page.locator('#panel').isVisible() && (await t.page.innerText('#p-email')) === 'admin@example.com' && (await t.page.innerText('#s-total')) === '42', 'admin: panel, email, dan total 42 harus tampil');
    cek(!(await t.page.evaluate(() => JSON.stringify(sessionStorage)).then((x) => /rahasia|password|refresh/i.test(x))), 'admin: sessionStorage tidak boleh memuat kata sandi atau refresh token');
    await t.page.screenshot({ path: process.env.ADMIN_SHOTS ? process.env.ADMIN_SHOTS + '/panel-1440.png' : undefined, fullPage: true }).catch(() => {});
    await t.page.reload({ waitUntil: 'networkidle' }); await t.page.waitForTimeout(400);
    cek(await t.page.locator('#panel').isVisible(), 'admin: sesi harus pulih setelah muat ulang');
    await t.page.click('#p-keluar'); await t.page.waitForTimeout(300);
    cek(await t.page.locator('#masuk').isVisible() && await t.page.locator('#panel').isHidden() && t.logout() === 1, 'admin: keluar harus kembali ke form dan memanggil logout');
    cek((await t.page.evaluate(() => sessionStorage.length)) === 0, 'admin: sessionStorage harus kosong setelah keluar');
    cek(t.log.csp.length === 0 && t.log.err.length === 0, 'admin: CSP/galat pada alur sah ' + t.log.csp.concat(t.log.err).join('|')); await t.page.close();
    /* dashboard: angka, grafik, tabel, ekspor CSV aman rumus */
    t = await skenario('dashboard', { email: 'admin@example.com' });
    await masuk(t.page, 'admin@example.com', 'rahasia-benar');
    cek((await t.page.innerText('#s-hari')) === '3' && (await t.page.innerText('#s-pekan')) === '5', 'dashboard: hari ini harus 3 dan 7 hari terakhir 5 (data di luar jendela dan tanggal rusak diabaikan)');
    cek((await t.page.locator('#c-hari svg rect').count()) === 14 && (await t.page.locator('#c-hari svg rect.ini').count()) === 1, 'dashboard: grafik harus 14 batang dan satu batang hari ini');
    cek((await t.page.locator('#l-jalur li').count()) === 2 && (await t.page.innerText('#l-jalur li:first-child')).includes('AI dari Nol'), 'dashboard: dua baris level harus tampil');
    cek((await t.page.locator('#l-jalur img, #t-baru img, #t-baru b').count()) === 0 && !(await t.page.evaluate(() => window.__xss)), 'dashboard: HTML di data harus tampil sebagai teks');
    const baris = await t.page.locator('#t-baru tbody tr').allInnerTexts();
    cek(baris.length === 3 && baris[0].includes('a***@example.com') && !baris.join('').includes('andi@') && baris[2].includes('d***@example.co.id'), 'dashboard: tiga baris terbaru dengan email disamarkan ' + JSON.stringify(baris));
    cek(/^\d{4}-\d\d-\d\d \d\d:\d\d/.test(baris[0]) && baris[0].includes(hariIni), 'dashboard: waktu harus dalam WIB');
    cek((await t.page.locator('#p-msg').innerText()) === '', 'dashboard: tanpa pesan galat saat semua data termuat');
    const [unduh] = await Promise.all([t.page.waitForEvent('download'), t.page.click('#b-csv')]);
    const teksCsv = readFileSync(await unduh.path(), 'utf8');
    cek(/^waitlist-neruvia-\d{4}-\d\d-\d\d\.csv$/.test(unduh.suggestedFilename()), 'csv: nama berkas ' + unduh.suggestedFilename());
    cek(teksCsv.startsWith('\ufeff"waktu_utc","nama","email","level"'), 'csv: BOM dan header harus ada');
    cek(teksCsv.includes('"\'=HYPERLINK(""http://contoh.invalid"",""klik"")"') && teksCsv.includes('"\'+x@example.com"') && teksCsv.includes('"\'@sum"') && teksCsv.includes('"\'-1+1"'), 'csv: sel berawalan = + - @ harus diberi tanda petik ' + teksCsv);
    cek(teksCsv.includes('"<b>Tebal</b> ""Siti"", Ayu"'), 'csv: tanda petik dan koma harus di-escape');
    cek(teksCsv.split('\r\n').filter(Boolean).length === 4 && csvHal[0] === '0', 'csv: empat baris (header + 3) dan halaman dimulai dari offset 0');
    cek(/3 baris diunduh/.test(await t.page.innerText('#e-msg')), 'csv: pesan jumlah baris');
    cek(t.log.csp.length === 0 && t.log.err.length === 0, 'dashboard: CSP/galat ' + t.log.csp.concat(t.log.err).join('|')); await t.page.close();
    /* sebagian data gagal: tidak boleh menampilkan angka palsu */
    t = await skenario('dashboard-gagal', { email: 'admin@example.com', jalur500: true });
    await masuk(t.page, 'admin@example.com', 'rahasia-benar');
    cek(/Sebagian data gagal/.test(await t.page.innerText('#p-msg')) && (await t.page.locator('#l-jalur li').count()) === 0 && (await t.page.innerText('#s-total')) === '42', 'dashboard: kegagalan satu bagian harus dilaporkan tanpa merusak bagian lain'); await t.page.close();
    /* tahap 3: editor draf pelajaran dan video materi */
    t = await skenario('materi', { email: 'admin@example.com' });
    await masuk(t.page, 'admin@example.com', 'rahasia-benar');
    const P = t.page;
    cek((await P.locator('#d-daftar li.kosong').count()) === 1 && (await P.locator('#v-daftar li.kosong').count()) === 1, 'materi: daftar draf dan video kosong harus tampil saat masuk');
    await P.click('#d-baru');
    cek(await P.locator('#d-form').isVisible() && (await P.locator('#d-bagian > div').count()) === 1 && (await P.locator('#d-cek fieldset').count()) === 3, 'materi: form kosong harus punya 1 bagian dan 3 soal cek');
    await P.click('#d-periksa');
    cek((await P.locator('#d-galat li').count()) >= 8, 'materi: form kosong harus menampilkan banyak galat ' + (await P.locator('#d-galat li').count()));
    await P.click('#d-unduh');
    cek(/hanya bisa diunduh bila draf lengkap/.test(await P.innerText('#d-pesan')), 'materi: unduh draf tidak lengkap harus ditolak');
    /* simpan draf belum lengkap tetap boleh, status draf */
    await P.fill('#d-id', 'l1-m2-p1'); await P.fill('#d-tujuan', 'Setelah ini kamu bisa memberi peran pada prompt.');
    await P.click('#d-simpan'); await P.waitForTimeout(300);
    cek(t.simpanDraf.length === 1 && t.simpanDraf[0].status === 'draf' && t.simpanDraf[0].isi.id === 'l1-m2-p1' && t.simpanDraf[0].isi.status === 'draf', 'materi: draf belum lengkap harus tersimpan dengan status draf');
    cek((await P.locator('#d-daftar li.item').count()) === 1 && /belum lengkap/.test(await P.innerText('#d-daftar')), 'materi: daftar harus memuat draf belum lengkap');
    await P.close();
    t = await skenario('materi2', { email: 'admin@example.com' });
    await masuk(t.page, 'admin@example.com', 'rahasia-benar');
    const Q = t.page;
    await Q.click('#d-baru'); await Q.fill('#d-id', 'ngawur'); await Q.click('#d-simpan'); await Q.waitForTimeout(200);
    cek(t.simpanDraf.length === 0 && /ID harus berbentuk/.test(await Q.innerText('#d-galat')), 'materi: ID salah tidak boleh dikirim ke server');
    /* isi lengkap */
    await Q.fill('#d-id', 'l1-m2-p1'); await Q.fill('#d-tujuan', 'Setelah ini kamu bisa memberi peran dan konteks pada prompt.');
    await Q.fill('#d-bj-1', 'Peran'); await Q.fill('#d-bp-1', 'Paragraf satu.\n\nParagraf dua.');
    await Q.click('#d-tambah-bagian'); await Q.fill('#d-bj-2', 'Konteks'); await Q.fill('#d-bp-2', 'Konteks membantu hasil.');
    await Q.fill('#d-contoh-teks', 'Rani menulis prompt dengan peran editor (data fiktif).'); await Q.fill('#d-latihan', 'Tulis prompt dengan peran, lalu bandingkan hasilnya.');
    for (let i = 0; i < 3; i++) { await Q.fill('#d-c' + i + '-tanya', 'Soal ' + (i + 1) + '?'); await Q.fill('#d-c' + i + '-opsi', 'A\nB\nC'); await Q.fill('#d-c' + i + '-benar', '2'); await Q.fill('#d-c' + i + '-jelas', 'Karena B benar.'); await Q.fill('#d-ring-' + i, 'Ringkasan ' + (i + 1)); }
    await Q.click('#d-periksa');
    cek((await Q.locator('#d-galat li').count()) === 0 && /Lengkap/.test(await Q.innerText('#d-pesan')), 'materi: isian lengkap harus lolos pemeriksaan ' + await Q.innerText('#d-galat'));
    await Q.click('#d-simpan'); await Q.waitForTimeout(300);
    const dk = t.simpanDraf[0];
    cek(t.simpanDraf.length === 1 && dk.status === 'siap' && dk.isi.bagian.length === 2 && dk.isi.bagian[0].paragraf.length === 2 && dk.isi.cek.length === 3 && dk.isi.cek[0].benar === 1 && dk.isi.ringkasan.length === 3, 'materi: draf lengkap harus tersimpan dengan status siap dan struktur sesuai standar ' + JSON.stringify(dk));
    const [unduhJ] = await Promise.all([Q.waitForEvent('download'), Q.click('#d-unduh')]);
    const js = JSON.parse(readFileSync(await unduhJ.path(), 'utf8'));
    cek(unduhJ.suggestedFilename() === 'l1-m2-p1.json' && js.id === 'l1-m2-p1' && js.status === 'draf' && js.cek.length === 3 && js.ringkasan.length === 3, 'materi: JSON unduhan harus sesuai format content/pelajaran');
    /* kata "video" dilarang di materi tulisan */
    await Q.fill('#d-latihan', 'Tonton video ini dulu.'); await Q.click('#d-periksa');
    cek(/tidak boleh merujuk video/.test(await Q.innerText('#d-galat')), 'materi: kata video/tonton harus ditolak');
    await Q.fill('#d-latihan', 'Tulis prompt dengan peran.');
    /* sunting dan hapus */
    await Q.click('#d-tutup'); await Q.click('#d-daftar >> text=Sunting'); await Q.waitForTimeout(300);
    cek((await Q.inputValue('#d-id')) === 'l1-m2-p1' && (await Q.inputValue('#d-bj-2')) === 'Konteks' && (await Q.inputValue('#d-c0-benar')) === '2' && (await Q.locator('#d-id').evaluate((e) => e.readOnly)), 'materi: sunting harus memuat ulang isi draf dan mengunci ID');
    await Q.click('#d-tutup');
    await Q.click('#d-daftar >> text=Hapus'); await Q.click('#d-daftar >> text=Yakin hapus?'); await Q.waitForTimeout(300);
    cek(t.draf.size === 0 && (await Q.locator('#d-daftar li.kosong').count()) === 1, 'materi: hapus harus butuh dua klik dan mengosongkan daftar');
    /* video: tolak tipe salah dan terlalu besar, unggah sah, putar, hapus */
    await Q.setInputFiles('#v-berkas', { name: 'catatan.txt', mimeType: 'text/plain', buffer: Buffer.from('halo') }); await Q.click('#v-kirim');
    cek(/mp4 atau webm/.test(await Q.innerText('#v-pesan')) && t.kirimVideo.length === 0, 'video: tipe selain mp4/webm harus ditolak di klien');
    const dirBesar = mkdtempSync(gabung(tmpdir(), 'uji-video-')); writeFileSync(gabung(dirBesar, 'besar.mp4'), Buffer.alloc(52428801));
    await Q.setInputFiles('#v-berkas', gabung(dirBesar, 'besar.mp4')); await Q.click('#v-kirim'); rmSync(dirBesar, { recursive: true, force: true });
    cek(/di bawah 50 MB/.test(await Q.innerText('#v-pesan')) && t.kirimVideo.length === 0, 'video: berkas >50 MB harus ditolak di klien');
    await Q.setInputFiles('#v-berkas', { name: 'Materi Pertama (final)!.MP4', mimeType: 'video/mp4', buffer: Buffer.from('isi-video-uji') }); await Q.click('#v-kirim'); await Q.waitForTimeout(500);
    const tglW = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
    cek(t.kirimVideo.length === 1 && t.kirimVideo[0].nama === tglW + '-materi-pertama-final.mp4' && t.kirimVideo[0].tipe === 'video/mp4', 'video: nama harus dibersihkan dan tipe benar ' + JSON.stringify(t.kirimVideo));
    cek((await Q.locator('#v-daftar li.item').count()) === 1 && /terunggah/.test(await Q.innerText('#v-pesan')), 'video: daftar harus memuat video yang baru diunggah');
    await Q.setInputFiles('#v-berkas', { name: 'Materi Pertama (final)!.mp4', mimeType: 'video/mp4', buffer: Buffer.from('dobel') }); await Q.click('#v-kirim'); await Q.waitForTimeout(400);
    cek(/sudah ada/.test(await Q.innerText('#v-pesan')), 'video: nama ganda (409) harus dilaporkan');
    await Q.click('#v-daftar >> text=Putar'); await Q.waitForTimeout(500);
    cek(await Q.locator('#v-putar').isVisible() && (await Q.locator('#v-putar').getAttribute('src')).startsWith('https://') && (await Q.locator('#v-putar').getAttribute('src')).includes('/storage/v1/object/sign/video-materi/'), 'video: pemutar harus memakai tautan bertanda tangan bucket ini');
    cek(t.log.csp.length === 0, 'materi: pelanggaran CSP (media-src harus mengizinkan host Supabase) ' + t.log.csp.join('|'));
    const media = await Q.evaluate(() => new Promise((ok) => { const v = document.createElement('video'); v.src = 'https://example.com/x.mp4'; v.onerror = () => ok('diblokir'); v.onloadeddata = () => ok('jalan'); document.body.appendChild(v); setTimeout(() => ok('diblokir'), 1500); }));
    await Q.waitForTimeout(300);
    cek(media === 'diblokir' && t.log.csp.some((x) => /media/i.test(x)), 'video: media dari host luar harus diblokir CSP ' + t.log.csp.join('|'));
    t.log.csp.length = 0;
    await Q.click('#v-daftar >> text=Hapus'); await Q.click('#v-daftar >> text=Yakin hapus?'); await Q.waitForTimeout(400);
    cek(t.videos.length === 0 && (await Q.locator('#v-daftar li.kosong').count()) === 1 && (await Q.locator('#v-putar').isHidden()), 'video: hapus harus mengosongkan daftar dan menyembunyikan pemutar');
    cek(t.log.err.length === 0, 'materi: galat skrip ' + t.log.err.join('|')); await Q.close();
    /* akun biasa (bukan admin) */
    t = await skenario('biasa', { email: 'orang@example.com', admin: false });
    await masuk(t.page, 'orang@example.com', 'rahasia-benar');
    cek(await t.page.locator('#panel').isHidden() && /tidak terdaftar sebagai admin/.test(await t.page.locator('#a-msg').innerText()) && t.logout() === 1, 'admin: akun non-admin harus ditolak dan token dicabut');
    cek((await t.page.evaluate(() => sessionStorage.length)) === 0, 'admin: akun non-admin tidak boleh menyisakan sesi'); await t.page.close();
    /* sesi kedaluwarsa dari server */
    t = await skenario('401', { email: 'admin@example.com', admins401: true });
    await masuk(t.page, 'admin@example.com', 'rahasia-benar');
    cek(await t.page.locator('#panel').isHidden() && /Sesi berakhir/.test(await t.page.locator('#a-msg').innerText()), 'admin: 401 dari server harus mengakhiri sesi');
    await t.page.close();
    /* email berisi HTML tidak boleh menjadi elemen */
    const xss = '<img src=x onerror=window.__xss=1>@example.com';
    t = await skenario('xss', { email: xss });
    await masuk(t.page, 'admin@example.com', 'rahasia-benar');
    cek((await t.page.locator('#p-email img').count()) === 0 && !(await t.page.evaluate(() => window.__xss)), 'admin: email berisi HTML harus tampil sebagai teks');
    await t.page.close();
  }
  /* kontrol negatif */
  {
    const page = await ctx.newPage(); const log = { csp: [], err: [] }; kumpul(page, log);
    await page.goto(a.base + '/', { waitUntil: 'networkidle' });
    const r = await page.evaluate(async () => {
      const o = {};
      const s = document.createElement('script'); s.textContent = 'window.__inline = 1'; document.head.appendChild(s); o.skrip = window.__inline === 1 ? 'jalan' : 'diblokir';
      const s2 = document.createElement('script'); s2.src = 'https://example.com/x.js'; document.head.appendChild(s2);
      o.fetchLuar = await fetch('https://example.com/').then(() => 'lolos', () => 'diblokir');
      const f = document.createElement('iframe'); f.src = 'https://example.com/'; document.body.appendChild(f);
      const d = document.createElement('div'); d.setAttribute('style', 'color:red'); document.body.appendChild(d); o.attrBaru = getComputedStyle(d).color === 'rgb(255, 0, 0)' ? 'jalan' : 'diblokir';
      const i = document.createElement('img'); i.src = 'https://example.com/a.png'; document.body.appendChild(i);
      return o;
    });
    await page.waitForTimeout(500);
    cek(r.skrip === 'diblokir', 'negatif: skrip inline baru tidak diblokir');
    cek(r.fetchLuar === 'diblokir', 'negatif: fetch ke host luar tidak diblokir');
    cek(r.attrBaru === 'diblokir', 'negatif: atribut style baru (tanpa hash) tidak diblokir');
    cek(log.csp.some((t) => /frame/i.test(t)) && log.csp.some((t) => /img|image/i.test(t)) && log.csp.some((t) => /script/i.test(t)), 'negatif: iframe, gambar, dan skrip luar harus tercatat sebagai pelanggaran CSP');
    await page.close();
  }
  await br.close();
}
a.s.close(); b.s.close();
console.log((gagal ? 'GAGAL' : 'LULUS') + ': ' + lulus + ' pemeriksaan lulus, ' + gagal + ' gagal.');
process.exit(gagal ? 1 : chromium ? 0 : 2);
