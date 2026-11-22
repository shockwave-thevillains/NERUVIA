/* Admin NERUVIA, tahap 1-2: masuk lewat Supabase Auth (email + kata sandi) dan tampilkan dashboard waitlist.
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
  var sHari = $('s-hari'), sPekan = $('s-pekan'), cHari = $('c-hari'), lJalur = $('l-jalur'), tBaru = $('t-baru').tBodies[0], eMsg = $('e-msg'), bCsv = $('b-csv');
  var NS = 'http://www.w3.org/2000/svg';

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
    pEmail.textContent = '—'; sTotal.textContent = '—'; sHari.textContent = '—'; sPekan.textContent = '—';
    cHari.textContent = ''; lJalur.textContent = ''; tBaru.textContent = ''; say(pMsg, ''); say(eMsg, '');
    jalankan('keluar');
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

  /* ---------- dashboard waitlist (tahap 2) ----------
     Semua angka datang dari server lewat view security invoker, jadi RLS tetap berlaku.
     Isi sel selalu lewat textContent atau atribut SVG; tidak ada innerHTML. */
  function svg(nama, atr, teks) {
    var e = d.createElementNS(NS, nama);
    for (var k in atr) if (Object.prototype.hasOwnProperty.call(atr, k)) e.setAttribute(k, atr[k]);
    if (teks != null) e.textContent = teks;
    return e;
  }
  function tglWib(mundur) { return new Date(Date.now() + 7 * 3600000 - mundur * 86400000).toISOString().slice(0, 10); }
  function waktuWib(iso) {
    var t = Date.parse(iso); if (isNaN(t)) return '—';
    return new Date(t + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
  }
  function samar(em) {
    var m = /^([^@]{1,200})@([^@]{1,200})$/.exec(typeof em === 'string' ? em : '');
    return m ? m[1].charAt(0) + '***@' + m[2] : '—';
  }
  function ambil(path, opt) {
    return api(path, opt).then(function (r) {
      if (r.status === 401) { keluarLokal('Sesi berakhir. Masuk lagi untuk melanjutkan.', ''); throw { dihentikan: true }; }
      if (!r.ok) throw 0;
      return r;
    });
  }
  function ambilJson(path) { return ambil(path).then(function (r) { return r.json(); }); }
  function jumlahOk(x) { return typeof x === 'number' && isFinite(x) && x >= 0 && Math.floor(x) === x && x < 1e9; }

  function gambarHari(petaHari) {
    var n = 14, W = 560, H = 176, alas = 142, tinggi = 112, slot = W / n, lebar = 26, nilai = [], tanggal = [], maks = 1, jumlah = 0, i;
    for (i = n - 1; i >= 0; i--) { var tg = tglWib(i), v = petaHari[tg] || 0; tanggal.push(tg); nilai.push(v); jumlah += v; if (v > maks) maks = v; }
    var g = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Grafik batang pendaftar per hari, 14 hari terakhir. Total ' + jumlah + ', hari ini ' + nilai[n - 1] + '.' });
    for (i = 0; i < n; i++) {
      var x = i * slot + (slot - lebar) / 2, h = nilai[i] ? Math.max(3, nilai[i] / maks * tinggi) : 2;
      g.appendChild(svg('rect', { x: x, y: alas - h, width: lebar, height: h, rx: 3, 'class': nilai[i] ? (i === n - 1 ? 'bar ini' : 'bar') : 'nol' }));
      if (nilai[i]) g.appendChild(svg('text', { x: x + lebar / 2, y: alas - h - 6, 'text-anchor': 'middle' }, String(nilai[i])));
      g.appendChild(svg('text', { x: x + lebar / 2, y: alas + 18, 'text-anchor': 'middle', 'class': 'tgl' }, tanggal[i].slice(8)));
    }
    cHari.textContent = ''; cHari.appendChild(g);
    return nilai;
  }
  function gambarJalur(baris) {
    var total = 0; baris.forEach(function (b) { total += b.jumlah; });
    lJalur.textContent = '';
    if (!baris.length) { var k = d.createElement('li'); k.textContent = 'Belum ada pendaftar.'; lJalur.appendChild(k); return; }
    baris.forEach(function (b) {
      var li = d.createElement('li'), nm = d.createElement('span'), n = d.createElement('b');
      nm.textContent = b.jalur; n.textContent = String(b.jumlah);
      var g = svg('svg', { viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      g.appendChild(svg('rect', { 'class': 'bg', x: 0, y: 0, width: 100, height: 10 }));
      g.appendChild(svg('rect', { 'class': 'fg', x: 0, y: 0, width: Math.max(2, b.jumlah / Math.max(1, total) * 100), height: 10 }));
      li.appendChild(nm); li.appendChild(g); li.appendChild(n); lJalur.appendChild(li);
    });
  }
  function gambarBaru(baris) {
    tBaru.textContent = '';
    if (!baris.length) {
      var tr0 = d.createElement('tr'), td0 = d.createElement('td'); td0.colSpan = 4; td0.className = 'kosong'; td0.textContent = 'Belum ada pendaftar.';
      tr0.appendChild(td0); tBaru.appendChild(tr0); return;
    }
    baris.forEach(function (b) {
      var tr = d.createElement('tr');
      [waktuWib(b.created_at), typeof b.name === 'string' && b.name ? b.name.slice(0, 80) : '—', samar(b.email), typeof b.jalur === 'string' ? b.jalur.slice(0, 60) : '—'].forEach(function (t) {
        var td = d.createElement('td'); td.textContent = t; tr.appendChild(td);
      });
      tBaru.appendChild(tr);
    });
  }

  function muatDashboard() {
    var gagal = 0, tersisa = 4;
    function selesai() { if (--tersisa === 0 && !secPanel.hidden) say(pMsg, gagal ? 'Sebagian data gagal dimuat. Muat ulang halaman, lalu coba lagi.' : '', gagal ? 'err' : ''); }
    function galat(e) { if (!(e && e.dihentikan)) gagal++; }
    say(pMsg, 'Memuat dashboard…');

    ambil('/rest/v1/waitlist?select=id&limit=1', { headers: { Prefer: 'count=exact' } }).then(function (r) {
      var cr = /\/(\d{1,9})$/.exec(r.headers.get('content-range') || '');
      if (!cr) throw 0;                       /* jangan tampilkan 0 bila jumlah tidak terbaca */
      sTotal.textContent = cr[1];
    }).catch(function (e) { sTotal.textContent = '—'; galat(e); }).then(selesai);

    ambilJson('/rest/v1/waitlist_per_hari?select=hari,jumlah&order=hari.desc&limit=60').then(function (baris) {
      if (!Array.isArray(baris)) throw 0;
      var peta = {};
      baris.forEach(function (b) { if (b && typeof b.hari === 'string' && /^\d{4}-\d\d-\d\d$/.test(b.hari) && jumlahOk(b.jumlah)) peta[b.hari] = b.jumlah; });
      var nilai = gambarHari(peta), pekan = 0;
      for (var i = nilai.length - 7; i < nilai.length; i++) pekan += nilai[i];
      sHari.textContent = String(nilai[nilai.length - 1]); sPekan.textContent = String(pekan);
    }).catch(function (e) { sHari.textContent = '—'; sPekan.textContent = '—'; cHari.textContent = ''; galat(e); }).then(selesai);

    ambilJson('/rest/v1/waitlist_per_jalur?select=jalur,jumlah&order=jumlah.desc').then(function (baris) {
      if (!Array.isArray(baris)) throw 0;
      gambarJalur(baris.filter(function (b) { return b && typeof b.jalur === 'string' && jumlahOk(b.jumlah); }).map(function (b) { return { jalur: b.jalur.slice(0, 60), jumlah: b.jumlah }; }));
    }).catch(function (e) { lJalur.textContent = ''; galat(e); }).then(selesai);

    ambilJson('/rest/v1/waitlist?select=created_at,name,email,jalur&order=created_at.desc&limit=10').then(function (baris) {
      if (!Array.isArray(baris)) throw 0;
      gambarBaru(baris.filter(function (b) { return b && typeof b === 'object'; }));
    }).catch(function (e) { tBaru.textContent = ''; galat(e); }).then(selesai);
  }

  /* ---------- ekspor CSV aman rumus ---------- */
  function selCsv(v) {
    var t = v == null ? '' : String(v);
    if (/^[\t\r\n ]*[=+\-@]/.test(t) || /^[\t\r]/.test(t)) t = "'" + t;      /* cegah injeksi rumus di Excel/Sheets */
    return '"' + t.replace(/"/g, '""') + '"';
  }
  function unduhCsv() {
    var HAL = 1000, MAKS = 20, rows = ['"waktu_utc","nama","email","level"'], hal = 0;
    bCsv.disabled = true; say(eMsg, 'Menyiapkan CSV…');
    function berikut() {
      return ambilJson('/rest/v1/waitlist?select=created_at,name,email,jalur&order=created_at.asc,id.asc&limit=' + HAL + '&offset=' + (hal * HAL)).then(function (baris) {
        if (!Array.isArray(baris)) throw 0;
        baris.forEach(function (b) { rows.push([selCsv(b.created_at), selCsv(b.name), selCsv(b.email), selCsv(b.jalur)].join(',')); });
        hal++;
        if (baris.length === HAL && hal < MAKS) return berikut();
        return baris.length === HAL;       /* true bila terpotong di batas */
      });
    }
    berikut().then(function (terpotong) {
      var blob = new Blob(['﻿' + rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = d.createElement('a');
      a.href = url; a.download = 'waitlist-neruvia-' + tglWib(0) + '.csv'; a.rel = 'noopener'; d.body.appendChild(a); a.click(); d.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      say(eMsg, (rows.length - 1) + ' baris diunduh.' + (terpotong ? ' Dibatasi ' + (HAL * MAKS) + ' baris.' : ''), 'ok');
    }).catch(function (e) { if (!(e && e.dihentikan)) say(eMsg, 'CSV gagal dibuat. Coba lagi.', 'err'); })
      .then(function () { bCsv.disabled = false; });
  }
  bCsv.addEventListener('click', unduhCsv);

  /* Boleh masuk panel hanya bila server mengizinkan membaca baris sendiri di tabel admins. */
  function cekAdmin(email) {
    return api('/rest/v1/admins?select=user_id').then(function (r) {
      if (r.status === 401) { keluarLokal('Sesi berakhir. Masuk lagi untuk melanjutkan.', ''); return; }
      if (!r.ok) throw 0;
      return r.json().then(function (rows) {
        if (!Array.isArray(rows) || rows.length !== 1) { keluar('Akun ini tidak terdaftar sebagai admin.'); return; }
        secMasuk.hidden = true; secPanel.hidden = false; say(msg, '');
        pEmail.textContent = email || '—'; jadwalKedaluwarsa(); muatDashboard(); jalankan('masuk'); $('h-panel').setAttribute('tabindex', '-1'); $('h-panel').focus();
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

  /* Antarmuka sempit untuk materi.js (editor pelajaran dan video): token tidak pernah diberikan keluar. */
  var kait = { masuk: [], keluar: [] };
  function jalankan(n) { kait[n].forEach(function (f) { try { f(); } catch (x) { /* satu kait gagal tidak boleh menghentikan yang lain */ } }); }
  function xhr(path, method, headers, body, progres) {
    return new Promise(function (ok, gagalX) {
      var x = new XMLHttpRequest(); x.open(method, origin + path); x.timeout = 600000;
      var h = { apikey: apikey }; if (token) h.Authorization = 'Bearer ' + token;
      for (var k in headers) if (Object.prototype.hasOwnProperty.call(headers, k)) h[k] = headers[k];
      for (var n in h) if (Object.prototype.hasOwnProperty.call(h, n)) x.setRequestHeader(n, h[n]);
      if (progres && x.upload) x.upload.onprogress = function (e) { if (e.lengthComputable) progres(e.loaded / e.total); };
      x.onload = function () { ok({ status: x.status, teks: x.responseText }); };
      x.onerror = x.ontimeout = x.onabort = function () { gagalX(new Error('jaringan')); };
      x.send(body);
    });
  }
  window.NeruviaAdmin = Object.freeze({
    origin: origin,
    api: api,
    xhr: xhr,
    sesiHabis: function () { keluarLokal('Sesi berakhir. Masuk lagi untuk melanjutkan.', ''); },
    pasang: function (n, f) { if (kait[n] && typeof f === 'function') kait[n].push(f); },
    tersedia: function () { return !secPanel.hidden && !!token; }
  });

  if (!origin || !apikey) {
    kirim.disabled = true; say(msg, 'Admin belum terhubung ke backend: config.js tidak ditemukan di build ini.', 'err');
  } else {
    var s = bacaSimpan();
    if (s) { token = s.t; expAt = s.e; cekAdmin(emailDariToken(token)); }
  }
})();
