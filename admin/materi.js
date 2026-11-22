/* Admin NERUVIA, tahap 3: editor draf pelajaran dan unggah video materi.
   Draf disimpan di tabel public.pelajaran_draf dan video di bucket privat video-materi (Supabase); keduanya
   hanya bisa diakses admin lewat RLS. Halaman ini hanya antarmuka. Tidak ada innerHTML, eval, atau atribut style. */
(function () {
  'use strict';
  var A = window.NeruviaAdmin;
  if (!A) return;
  var d = document;
  var $ = function (id) { return d.getElementById(id); };
  var ID_RE = /^l[0-9]{1,2}-m[0-9]{1,2}-p[0-9]{1,2}$/;
  var NAMA_VIDEO_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/;
  var MAKS_VIDEO = 52428800;          /* 50 MB, sama dengan batas bucket */
  var MAKS_DRAF = 60000;              /* sama dengan constraint tabel */
  var MAKS_BAGIAN = 6;

  function say(el, t, c) { el.className = 'msg' + (c ? ' ' + c : ''); el.textContent = t || ''; }
  function sesiHabis(r) { if (r.status === 401) { A.sesiHabis(); return true; } return false; }
  function wib(iso) { var t = Date.parse(iso); return isNaN(t) ? '—' : new Date(t + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' '); }
  function mk(tag, kelas, teks) { var e = d.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; }
  function tombol(teks, fn, kelas) { var b = mk('button', kelas || 'f', teks); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function byteUtf8(s) { return new Blob([s]).size; }

  /* =============== Draf pelajaran =============== */
  var fDraf = $('d-form'), dDaftar = $('d-daftar'), dPesan = $('d-pesan'), dGalat = $('d-galat'), dBagian = $('d-bagian'), dCek = $('d-cek');
  var dId = $('d-id'), dTujuan = $('d-tujuan'), dContohJ = $('d-contoh-judul'), dContohT = $('d-contoh-teks'), dLatihan = $('d-latihan');
  var dSimpan = $('d-simpan'), dStatus = 'draf';

  function barisBagian(judul, paragraf) {
    var fs = mk('div', 'bagian');
    var n = dBagian.children.length + 1;
    var li = mk('label', null, 'Bagian ' + n + ': judul'); var ij = mk('input'); ij.type = 'text'; ij.maxLength = 120; ij.value = judul || ''; ij.id = 'd-bj-' + n; li.htmlFor = ij.id;
    var lp = mk('label', null, 'Bagian ' + n + ': paragraf'); var tp = mk('textarea'); tp.rows = 6; tp.maxLength = 3000; tp.value = paragraf || ''; tp.id = 'd-bp-' + n; lp.htmlFor = tp.id;
    var hapus = tombol('Hapus bagian ' + n, function () { if (dBagian.children.length > 1) { dBagian.removeChild(fs); nomori(); } });
    fs.appendChild(li); fs.appendChild(ij); fs.appendChild(lp); fs.appendChild(tp); fs.appendChild(hapus);
    return fs;
  }
  function nomori() {
    Array.prototype.forEach.call(dBagian.children, function (fs, i) {
      var n = i + 1, ls = fs.querySelectorAll('label'), ins = fs.querySelector('input'), ta = fs.querySelector('textarea'), bt = fs.querySelector('button');
      ins.id = 'd-bj-' + n; ta.id = 'd-bp-' + n; ls[0].htmlFor = ins.id; ls[1].htmlFor = ta.id;
      ls[0].textContent = 'Bagian ' + n + ': judul'; ls[1].textContent = 'Bagian ' + n + ': paragraf'; bt.textContent = 'Hapus bagian ' + n;
    });
  }
  function bangunCek() {
    dCek.textContent = '';
    for (var i = 0; i < 3; i++) {
      var fs = mk('fieldset'), lg = mk('legend', null, 'Cek pemahaman ' + (i + 1));
      fs.appendChild(lg);
      [['Pertanyaan', 'input', 'tanya', 300], ['Pilihan jawaban (satu per baris, 3 sampai 5)', 'textarea', 'opsi', 600], ['Nomor jawaban yang benar', 'input', 'benar', 2], ['Penjelasan jawaban', 'textarea', 'jelas', 500]].forEach(function (f) {
        var id = 'd-c' + i + '-' + f[2], l = mk('label', null, f[0]), el = mk(f[1]);
        l.htmlFor = id; el.id = id;
        if (f[1] === 'input') { el.type = f[2] === 'benar' ? 'number' : 'text'; if (f[2] === 'benar') { el.min = '1'; el.max = '5'; el.inputMode = 'numeric'; } else el.maxLength = f[3]; }
        else { el.rows = f[2] === 'opsi' ? 5 : 2; el.maxLength = f[3]; }
        fs.appendChild(l); fs.appendChild(el);
      });
      dCek.appendChild(fs);
    }
  }
  function nilai(id) { return $(id).value.replace(/\r\n/g, '\n').trim(); }

  function kumpul() {
    var bagian = [];
    Array.prototype.forEach.call(dBagian.children, function (fs) {
      var j = fs.querySelector('input').value.trim(), p = fs.querySelector('textarea').value.replace(/\r\n/g, '\n').split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      bagian.push({ judul: j, paragraf: p });
    });
    var cek = [];
    for (var i = 0; i < 3; i++) {
      cek.push({
        tanya: nilai('d-c' + i + '-tanya'),
        opsi: $('d-c' + i + '-opsi').value.replace(/\r\n/g, '\n').split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
        benar: parseInt($('d-c' + i + '-benar').value, 10) - 1,
        jelas: nilai('d-c' + i + '-jelas')
      });
    }
    return {
      id: dId.value.trim(), status: 'draf', tujuan: nilai('d-tujuan'), bagian: bagian,
      contoh: { judul: dContohJ.value.trim(), teks: nilai('d-contoh-teks') },
      latihan: { petunjuk: nilai('d-latihan') }, cek: cek,
      ringkasan: [nilai('d-ring-0'), nilai('d-ring-1'), nilai('d-ring-2')]
    };
  }
  /* Aturan yang sama dengan cekIsi() di tools/validasi-kursus.mjs, ditambah id dan ukuran. */
  function periksa(c) {
    var e = [];
    if (!ID_RE.test(c.id)) e.push('ID harus berbentuk l1-m1-p2 (level, modul, nomor pelajaran).');
    if (!c.tujuan) e.push('Tujuan kosong.');
    if (!c.bagian.length) e.push('Bagian kosong.');
    c.bagian.forEach(function (b, i) { if (!b.judul || !b.paragraf.length) e.push('Bagian ' + (i + 1) + ' belum lengkap (judul dan minimal satu paragraf).'); });
    if (!c.contoh.teks) e.push('Isi contoh kosong.');
    if (!c.latihan.petunjuk) e.push('Petunjuk latihan kosong.');
    c.cek.forEach(function (q, i) {
      var w = 'Cek pemahaman ' + (i + 1);
      if (!q.tanya) e.push(w + ': pertanyaan kosong.');
      if (q.opsi.length < 3 || q.opsi.length > 5) e.push(w + ': butuh 3 sampai 5 pilihan jawaban.');
      else if (!isFinite(q.benar) || q.benar < 0 || q.benar >= q.opsi.length) e.push(w + ': nomor jawaban benar di luar pilihan (1 sampai ' + q.opsi.length + ').');
      if (!q.jelas) e.push(w + ': penjelasan kosong.');
    });
    c.ringkasan.forEach(function (r, i) { if (!r) e.push('Ringkasan butir ' + (i + 1) + ' kosong.'); });
    var teks = JSON.stringify(c);
    if (/\b(video|tonton)\b/i.test(teks)) e.push('Materi tulisan tidak boleh merujuk video (kata "video" atau "tonton").');
    if (byteUtf8(teks) > MAKS_DRAF) e.push('Draf terlalu panjang (maksimal ' + MAKS_DRAF + ' byte).');
    return e;
  }
  function tampilGalat(e) {
    dGalat.textContent = '';
    e.forEach(function (t) { dGalat.appendChild(mk('li', null, t)); });
  }

  function isiForm(c) {
    c = c && typeof c === 'object' ? c : {};
    var s = function (x, m) { return typeof x === 'string' ? x.slice(0, m) : ''; };
    dId.value = s(c.id, 12); dTujuan.value = s(c.tujuan, 400);
    dBagian.textContent = '';
    var bg = Array.isArray(c.bagian) && c.bagian.length ? c.bagian.slice(0, MAKS_BAGIAN) : [{ judul: '', paragraf: [] }];
    bg.forEach(function (b) { b = b || {}; dBagian.appendChild(barisBagian(s(b.judul, 120), Array.isArray(b.paragraf) ? b.paragraf.map(function (x) { return s(x, 3000); }).join('\n\n') : '')); });
    nomori();
    var ct = c.contoh || {}; dContohJ.value = s(ct.judul, 80) || 'Contoh (data fiktif)'; dContohT.value = s(ct.teks, 1500);
    dLatihan.value = s((c.latihan || {}).petunjuk, 800);
    bangunCek();
    for (var i = 0; i < 3; i++) {
      var q = (Array.isArray(c.cek) && c.cek[i]) || {};
      $('d-c' + i + '-tanya').value = s(q.tanya, 300);
      $('d-c' + i + '-opsi').value = Array.isArray(q.opsi) ? q.opsi.slice(0, 5).map(function (x) { return s(x, 200); }).join('\n') : '';
      $('d-c' + i + '-benar').value = Number.isInteger(q.benar) ? String(q.benar + 1) : '';
      $('d-c' + i + '-jelas').value = s(q.jelas, 500);
      $('d-ring-' + i).value = s(Array.isArray(c.ringkasan) ? c.ringkasan[i] : '', 300);
    }
    tampilGalat([]);
  }
  function bukaForm(c, idTetap) {
    isiForm(c); dId.readOnly = !!idTetap; fDraf.hidden = false; dId.focus();
  }
  function tutupForm() { fDraf.hidden = true; tampilGalat([]); say(dPesan, ''); }

  function muatDaftarDraf() {
    A.api('/rest/v1/pelajaran_draf?select=id,status,updated_at&order=id.asc&limit=200').then(function (r) {
      if (sesiHabis(r)) return;
      if (!r.ok) throw 0;
      return r.json().then(function (baris) {
        if (!Array.isArray(baris)) throw 0;
        dDaftar.textContent = '';
        var ada = baris.filter(function (b) { return b && typeof b.id === 'string' && ID_RE.test(b.id); });
        if (!ada.length) { dDaftar.appendChild(mk('li', 'kosong', 'Belum ada draf.')); return; }
        ada.forEach(function (b) {
          var li = mk('li', 'item');
          li.appendChild(mk('span', null, b.id + ' · ' + (b.status === 'siap' ? 'lengkap' : 'belum lengkap') + ' · ' + wib(b.updated_at)));
          var aksi = mk('span', 'aksi-kecil');
          aksi.appendChild(tombol('Sunting', function () { sunting(b.id); }));
          aksi.appendChild(hapusDua('Hapus', 'Yakin hapus?', function () { hapusDraf(b.id); }));
          li.appendChild(aksi); dDaftar.appendChild(li);
        });
      });
    }).catch(function () { dDaftar.textContent = ''; say(dPesan, 'Daftar draf gagal dimuat. Muat ulang halaman, lalu coba lagi.', 'err'); });
  }
  function hapusDua(awal, konfirmasi, fn) {
    var t = 0, b = tombol(awal, function () {
      if (!t) { b.textContent = konfirmasi; t = setTimeout(function () { t = 0; b.textContent = awal; }, 4000); return; }
      clearTimeout(t); t = 0; b.textContent = awal; fn();
    }); return b;
  }
  function sunting(id) {
    if (!ID_RE.test(id)) return;
    say(dPesan, 'Memuat draf…');
    A.api('/rest/v1/pelajaran_draf?select=isi&id=eq.' + encodeURIComponent(id)).then(function (r) {
      if (sesiHabis(r)) return;
      if (!r.ok) throw 0;
      return r.json().then(function (baris) {
        if (!Array.isArray(baris) || baris.length !== 1) throw 0;
        say(dPesan, ''); bukaForm(baris[0].isi, true);
      });
    }).catch(function () { say(dPesan, 'Draf gagal dimuat.', 'err'); });
  }
  function hapusDraf(id) {
    if (!ID_RE.test(id)) return;
    A.api('/rest/v1/pelajaran_draf?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }).then(function (r) {
      if (sesiHabis(r)) return;
      if (!r.ok) throw 0;
      say(dPesan, 'Draf ' + id + ' dihapus.', 'ok'); if (!fDraf.hidden && dId.value.trim() === id) tutupForm(); muatDaftarDraf();
    }).catch(function () { say(dPesan, 'Draf gagal dihapus.', 'err'); });
  }

  fDraf.addEventListener('submit', function (e) {
    e.preventDefault();
    if (dSimpan.disabled) return;
    var c = kumpul(), galat = periksa(c);
    if (!ID_RE.test(c.id)) { tampilGalat(['ID harus berbentuk l1-m1-p2 (level, modul, nomor pelajaran).']); dId.focus(); return; }
    var lengkap = galat.length === 0; c.status = 'draf';
    var tubuh = JSON.stringify({ id: c.id, isi: c, status: lengkap ? 'siap' : 'draf' });
    if (byteUtf8(JSON.stringify(c)) > MAKS_DRAF) { tampilGalat(galat); return; }
    dSimpan.disabled = true; say(dPesan, 'Menyimpan…');
    A.api('/rest/v1/pelajaran_draf?on_conflict=id', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: tubuh }).then(function (r) {
      if (sesiHabis(r)) return;
      if (!r.ok) throw 0;
      tampilGalat(galat);
      say(dPesan, lengkap ? 'Draf ' + c.id + ' disimpan dan lengkap (siap diunduh).' : 'Draf ' + c.id + ' disimpan, tetapi belum lengkap: ' + galat.length + ' hal perlu dilengkapi.', lengkap ? 'ok' : '');
      dId.readOnly = true; muatDaftarDraf();
    }).catch(function () { say(dPesan, 'Draf gagal disimpan. Coba lagi.', 'err'); })
      .then(function () { dSimpan.disabled = false; });
  });
  $('d-periksa').addEventListener('click', function () {
    var g = periksa(kumpul()); tampilGalat(g);
    say(dPesan, g.length ? g.length + ' hal perlu dilengkapi.' : 'Lengkap. Semua aturan standar pelajaran terpenuhi.', g.length ? '' : 'ok');
  });
  $('d-unduh').addEventListener('click', function () {
    var c = kumpul(), g = periksa(c);
    if (g.length) { tampilGalat(g); say(dPesan, 'JSON hanya bisa diunduh bila draf lengkap.', 'err'); return; }
    var blob = new Blob([JSON.stringify(c, null, 2) + '\n'], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = d.createElement('a');
    a.href = url; a.download = c.id + '.json'; a.rel = 'noopener'; d.body.appendChild(a); a.click(); d.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    say(dPesan, 'Diunduh sebagai ' + c.id + '.json. Masukkan ke content/pelajaran/ dan daftarkan di content/kursus.json.', 'ok');
  });
  $('d-tambah-bagian').addEventListener('click', function () {
    if (dBagian.children.length >= MAKS_BAGIAN) { say(dPesan, 'Maksimal ' + MAKS_BAGIAN + ' bagian.', 'err'); return; }
    dBagian.appendChild(barisBagian('', '')); nomori();
  });
  $('d-baru').addEventListener('click', function () { say(dPesan, ''); bukaForm(null, false); });
  $('d-tutup').addEventListener('click', tutupForm);

  /* =============== Video materi =============== */
  var vForm = $('v-form'), vBerkas = $('v-berkas'), vKirim = $('v-kirim'), vBar = $('v-bar'), vPesan = $('v-pesan'), vDaftar = $('v-daftar'), vPutar = $('v-putar');

  function ukuran(b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB'; }
  function namaAman(asli) {
    var m = /^(.*?)(\.(mp4|webm))$/i.exec(asli); if (!m) return '';
    var dasar = m[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    if (!dasar) dasar = 'video';
    var tgl = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
    return tgl + '-' + dasar + m[2].toLowerCase();
  }
  function muatDaftarVideo() {
    A.api('/storage/v1/object/list/video-materi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }) }).then(function (r) {
      if (sesiHabis(r)) return;
      if (!r.ok) throw 0;
      return r.json().then(function (baris) {
        if (!Array.isArray(baris)) throw 0;
        vDaftar.textContent = '';
        var ada = baris.filter(function (b) { return b && typeof b.name === 'string' && NAMA_VIDEO_RE.test(b.name); });
        if (!ada.length) { vDaftar.appendChild(mk('li', 'kosong', 'Belum ada video.')); return; }
        ada.forEach(function (b) {
          var li = mk('li', 'item'), sz = b.metadata && typeof b.metadata.size === 'number' ? ' · ' + ukuran(b.metadata.size) : '';
          li.appendChild(mk('span', null, b.name + sz + ' · ' + wib(b.created_at)));
          var aksi = mk('span', 'aksi-kecil');
          aksi.appendChild(tombol('Putar', function () { putar(b.name); }));
          aksi.appendChild(hapusDua('Hapus', 'Yakin hapus?', function () { hapusVideo(b.name); }));
          li.appendChild(aksi); vDaftar.appendChild(li);
        });
      });
    }).catch(function () { vDaftar.textContent = ''; say(vPesan, 'Daftar video gagal dimuat. Muat ulang halaman, lalu coba lagi.', 'err'); });
  }
  function putar(nama) {
    if (!NAMA_VIDEO_RE.test(nama)) return;
    say(vPesan, 'Menyiapkan pemutar…');
    A.api('/storage/v1/object/sign/video-materi/' + encodeURIComponent(nama), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 300 }) }).then(function (r) {
      if (sesiHabis(r)) return;
      if (!r.ok) throw 0;
      return r.json().then(function (j) {
        var u = j && typeof j.signedURL === 'string' ? j.signedURL : '';
        if (u.indexOf('/object/sign/video-materi/') !== 0) throw 0;      /* hanya jalur bucket ini yang dipercaya */
        vPutar.src = A.origin + '/storage/v1' + u; vPutar.hidden = false; say(vPesan, 'Memutar ' + nama + ' (tautan berlaku 5 menit).');
      });
    }).catch(function () { say(vPesan, 'Video gagal disiapkan.', 'err'); });
  }
  function hapusVideo(nama) {
    if (!NAMA_VIDEO_RE.test(nama)) return;
    A.api('/storage/v1/object/video-materi/' + encodeURIComponent(nama), { method: 'DELETE' }).then(function (r) {
      if (sesiHabis(r)) return;
      if (!r.ok) throw 0;
      vPutar.removeAttribute('src'); vPutar.hidden = true; say(vPesan, 'Video ' + nama + ' dihapus.', 'ok'); muatDaftarVideo();
    }).catch(function () { say(vPesan, 'Video gagal dihapus.', 'err'); });
  }
  vForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (vKirim.disabled) return;
    var f = vBerkas.files && vBerkas.files[0];
    if (!f) { say(vPesan, 'Pilih berkas video dulu.', 'err'); return; }
    if (f.size <= 0 || f.size > MAKS_VIDEO) { say(vPesan, 'Ukuran berkas harus di bawah 50 MB (berkasmu ' + ukuran(f.size) + ').', 'err'); return; }
    if (f.type !== 'video/mp4' && f.type !== 'video/webm') { say(vPesan, 'Hanya berkas mp4 atau webm yang diterima.', 'err'); return; }
    var nama = namaAman(f.name);
    if (!nama || !NAMA_VIDEO_RE.test(nama)) { say(vPesan, 'Nama berkas harus berakhiran .mp4 atau .webm.', 'err'); return; }
    vKirim.disabled = true; vBar.hidden = false; vBar.value = 0; say(vPesan, 'Mengunggah ' + nama + '…');
    A.xhr('/storage/v1/object/video-materi/' + encodeURIComponent(nama), 'POST', { 'Content-Type': f.type, 'x-upsert': 'false', 'cache-control': 'max-age=3600' }, f, function (p) { vBar.value = Math.round(p * 100); }).then(function (r) {
      if (sesiHabis(r)) return;
      if (r.status === 409) { say(vPesan, 'Berkas dengan nama itu sudah ada hari ini. Ganti nama berkas, atau hapus yang lama.', 'err'); return; }
      if (r.status < 200 || r.status > 299) throw 0;
      vBerkas.value = ''; say(vPesan, 'Video ' + nama + ' terunggah.', 'ok'); muatDaftarVideo();
    }).catch(function () { say(vPesan, 'Unggahan gagal. Periksa koneksi dan ukuran berkas, lalu coba lagi.', 'err'); })
      .then(function () { vKirim.disabled = false; vBar.hidden = true; });
  });

  /* =============== kait sesi =============== */
  function bersihkan() {
    fDraf.hidden = true; dDaftar.textContent = ''; dGalat.textContent = ''; say(dPesan, '');
    vDaftar.textContent = ''; say(vPesan, ''); vPutar.removeAttribute('src'); vPutar.hidden = true; vBar.hidden = true; vBerkas.value = '';
  }
  A.pasang('masuk', function () { bersihkan(); muatDaftarDraf(); muatDaftarVideo(); });
  A.pasang('keluar', bersihkan);
})();
