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
import { readFileSync, existsSync, statSync } from 'node:fs';
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
    const skenario = async (nama, { email, sandiBenar = 'rahasia-benar', admin = true, admins401 = false }) => {
      const page = await ctx.newPage(); const log = { csp: [], err: [] }; kumpul(page, log); let logout = 0;
      await page.route('https://*.supabase.co/**', (r) => {
        const u = new URL(r.request().url()), m = r.request().method();
        if (u.pathname === '/auth/v1/token') { const bd = JSON.parse(r.request().postData() || '{}'); return bd.password === sandiBenar ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: jwt(email), expires_in: 3600, user: { email } }) }) : r.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid_grant"}' }); }
        if (u.pathname === '/auth/v1/logout') { logout++; return r.fulfill({ status: 204, body: '' }); }
        if (u.pathname === '/rest/v1/admins') return admins401 ? r.fulfill({ status: 401, body: '{}' }) : r.fulfill({ status: 200, contentType: 'application/json', body: admin ? '[{"user_id":"u1"}]' : '[]' });
        if (u.pathname === '/rest/v1/waitlist') return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/42', 'access-control-expose-headers': 'Content-Range' }, body: '[]' });
        return r.fulfill({ status: 404, body: '' });
      });
      await page.goto(a.base + '/admin/', { waitUntil: 'networkidle' });
      return { page, log, logout: () => logout, nama };
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
