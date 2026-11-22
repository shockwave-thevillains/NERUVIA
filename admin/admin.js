/* Admin NERUVIA, tahap 1: masuk lewat Supabase Auth (email + kata sandi) dan tampilkan ringkasan waitlist.
   Keamanan sebenarnya ada di server (RLS: hanya user_id di tabel admins yang boleh membaca waitlist).
   Halaman ini tidak memakai pustaka luar, tidak memakai innerHTML, dan hanya menyimpan token akses
   (tanpa refresh token dan tanpa kata sandi) di sessionStorage sampai tab ditutup atau token kedaluwarsa. */
(function () {
  'use strict';
  var d = document;
  var $ = function (id) { return d.getElementById(id); };
  var KEY = 'neruvia.admin.v1';
  var TOKEN_RE = /^[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}$/;
  var ORIGIN_RE = /^https:\/\/[a-z0-9]{10,40}\.supabase\.co$/;

  var form = $('f-masuk'), emailEl = $('a-email'), sandiEl = $('a-sandi'), kirim = $('a-kirim'), msg = $('a-msg');
  var secMasuk = $('masuk'), secPanel = $('panel'), pEmail = $('p-email'), pMsg = $('p-msg'), sTotal = $('s-total');

  var origin = '', apikey = '';
  var ep = window.NERUVIA_WAITLIST_ENDPOINT, hdr = window.NERUVIA_WAITLIST_HEADERS;
  if (typeof ep === 'string') { var m = /^(https:\/\/[^/]+)\/rest\/v1\//.exec(ep); if (m && ORIGIN_RE.test(m[1])) origin = m[1]; }
  if (hdr && typeof hdr.apikey === 'string' && hdr.apikey.length < 300) apikey = hdr.apikey;

  var token = '', expAt = 0, timer = 0, gagal = 0, kunci = 0;

  function say(el, t, c) { el.className = 'msg' + (c ? ' ' + c : ''); el.textContent = t || ''; }
  function simpan() { try { sessionStorage.setItem(KEY, JSON.stringify({ t: token, e: expAt })); } catch (x) { /* abaikan */ } }
  function hapus() { try { sessionStorage.removeItem(KEY); } catch (x) { /* abaikan */ } }
  function bacaSimpan() {
    try {
      var o = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (o && typeof o.t === 'string' && TOKEN_RE.test(o.t) && typeof o.e === 'number' && o.e > Date.now() + 30000 && o.e < Date.now() + 86400000) return o;
    } catch (x) { /* abaikan */ }
    hapus(); return null;
  }
  function emailDariToken(t) {
    try {
      var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while (p.length % 4) p += '=';
      var j = JSON.parse(atob(p)); return typeof j.email === 'string' ? j.email.slice(0, 254) : '';
    } catch (x) { return ''; }
  }
  function api(path, opt) {
    opt = opt || {};
    var h = { apikey: apikey }; if (token) h.Authorization = 'Bearer ' + token;
    for (var k in (opt.headers || {})) if (Object.prototype.hasOwnProperty.call(opt.headers, k)) h[k] = opt.headers[k];
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    return fetch(origin + path, { method: opt.method || 'GET', headers: h, body: opt.body, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(to); return r; }, function (e) { clearTimeout(to); throw e; });
  }

  function tampilMasuk(pesan, kelas) {
    secPanel.hidden = true; secMasuk.hidden = false;
    pEmail.textContent = '—'; sTotal.textContent = '—'; say(pMsg, '');
    say(msg, pesan || '', kelas);
  }
  function keluarLokal(pesan, kelas) {
    token = ''; expAt = 0; clearTimeout(timer); hapus(); form.reset(); tampilMasuk(pesan, kelas);
  }
  function keluar(pesan) {
    var t = token;
    if (t && origin) api('/auth/v1/logout?scope=local', { method: 'POST' }).catch(function () { /* token tetap kedaluwarsa sendiri */ });
    keluarLokal(pesan, '');
    emailEl.focus();
  }
  function jadwalKedaluwarsa() {
    clearTimeout(timer);
    timer = setTimeout(function () { keluarLokal('Sesi berakhir. Masuk lagi untuk melanjutkan.', ''); }, Math.max(1000, expAt - Date.now()));
  }

  function muatRingkasan() {
    say(pMsg, 'Memuat ringkasan…');
    api('/rest/v1/waitlist?select=id&limit=1', { headers: { Prefer: 'count=exact' } }).then(function (r) {
      if (r.status === 401) return keluarLokal('Sesi berakhir. Masuk lagi untuk melanjutkan.', '');
      if (!r.ok) throw 0;
      var cr = /\/(\d{1,9})$/.exec(r.headers.get('content-range') || '');
      if (!cr) throw 0;                       /* jangan tampilkan 0 bila jumlah tidak terbaca */
      sTotal.textContent = cr[1]; say(pMsg, '');
    }).catch(function () { sTotal.textContent = '—'; say(pMsg, 'Ringkasan gagal dimuat. Muat ulang halaman, lalu coba lagi.', 'err'); });
  }

  /* Boleh masuk panel hanya bila server mengizinkan membaca baris sendiri di tabel admins. */
  function cekAdmin(email) {
    return api('/rest/v1/admins?select=user_id').then(function (r) {
      if (r.status === 401) { keluarLokal('Sesi berakhir. Masuk lagi untuk melanjutkan.', ''); return; }
      if (!r.ok) throw 0;
      return r.json().then(function (rows) {
        if (!Array.isArray(rows) || rows.length !== 1) { keluar('Akun ini tidak terdaftar sebagai admin.'); return; }
        secMasuk.hidden = true; secPanel.hidden = false; say(msg, '');
        pEmail.textContent = email || '—'; jadwalKedaluwarsa(); muatRingkasan(); $('h-panel').setAttribute('tabindex', '-1'); $('h-panel').focus();
      });
    }).catch(function () { keluarLokal('Gagal memeriksa akses. Coba lagi.', 'err'); });
  }

  function kunciSementara() {
    kunci = 30; kirim.disabled = true;
    var iv = setInterval(function () {
      kunci--; if (kunci <= 0) { clearInterval(iv); gagal = 0; kirim.disabled = false; say(msg, ''); }
      else say(msg, 'Terlalu banyak percobaan. Tunggu ' + kunci + ' detik.', 'err');
    }, 1000);
    say(msg, 'Terlalu banyak percobaan. Tunggu 30 detik.', 'err');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (kirim.disabled) return;
    var em = emailEl.value.trim(), pw = sandiEl.value;
    if (!em || em.length > 254 || em.indexOf('@') < 1) { say(msg, 'Isi alamat email yang valid.', 'err'); emailEl.focus(); return; }
    if (!pw || pw.length > 200) { say(msg, 'Isi kata sandi.', 'err'); sandiEl.focus(); return; }
    kirim.disabled = true; say(msg, 'Memeriksa…');
    api('/auth/v1/token?grant_type=password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em, password: pw }) })
      .then(function (r) {
        sandiEl.value = '';
        if (r.status === 429) { say(msg, 'Terlalu banyak percobaan. Tunggu beberapa menit.', 'err'); return; }
        if (r.status === 400 || r.status === 401 || r.status === 422) {
          gagal++; if (gagal >= 5) { kunciSementara(); return; }
          say(msg, 'Email atau kata sandi salah.', 'err'); return;
        }
        if (!r.ok) throw 0;
        return r.json().then(function (j) {
          if (!j || typeof j.access_token !== 'string' || !TOKEN_RE.test(j.access_token) || typeof j.expires_in !== 'number') throw 0;
          gagal = 0; token = j.access_token; expAt = Date.now() + Math.min(Math.max(j.expires_in, 60), 86400) * 1000; simpan();
          return cekAdmin(emailDariToken(token) || em);
        });
      })
      .catch(function () { say(msg, 'Gagal masuk. Periksa koneksi, lalu coba lagi.', 'err'); })
      .then(function () { if (kunci <= 0) kirim.disabled = false; });
  });
  $('p-keluar').addEventListener('click', function () { keluar('Kamu sudah keluar.'); });

  if (!origin || !apikey) {
    kirim.disabled = true; say(msg, 'Admin belum terhubung ke backend: config.js tidak ditemukan di build ini.', 'err');
  } else {
    var s = bacaSimpan();
    if (s) { token = s.t; expAt = s.e; cekAdmin(emailDariToken(token)); }
  }
})();
