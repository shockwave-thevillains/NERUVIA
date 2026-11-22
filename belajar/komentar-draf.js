/* NERUVIA · kerangka komentar pelajaran (S4). DRAF, NONAKTIF.
   Berkas ini TIDAK dimuat oleh halaman mana pun dan tidak melakukan permintaan jaringan.
   Flag AKTIF di bawah harus tetap false sampai Master memutuskan (docs/security/auth-komentar.md butir 9).
   Aturan isi komentar di validasi() harus sama ketatnya dengan constraint komentar_isi_aturan di
   supabase/draf/komentar.sql: klien memperbaiki (NFKC, buang karakter kontrol, rapikan baris kosong),
   server menolak yang masih melanggar. Semua isi dari server masuk ke halaman lewat textContent. */
(function (g) {
  'use strict';
  var AKTIF = false;           /* flag fitur komentar: JANGAN diubah tanpa keputusan Master */
  var MAKS = 500;
  /* karakter kontrol (kecuali baris baru), lebar nol, pengecoh arah, pemisah baris/paragraf Unicode */
  var KONTROL = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFC]/g;
  var TAG = /[<>]/;
  var TAUTAN = /(https?:|ftp:|javascript:|data:|www\.)/i;
  var ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

  function bersihkan(teks) {
    return String(teks).normalize('NFKC').replace(/\r\n?/g, '\n').replace(KONTROL, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* kembalikan {ok:true, nilai} atau {ok:false, galat} (galat berupa teks untuk pengguna) */
  function validasi(teks) {
    if (typeof teks !== 'string') return { ok: false, galat: 'Komentar harus berupa teks.' };
    if (teks.length > MAKS * 4) return { ok: false, galat: 'Komentar terlalu panjang (maksimal ' + MAKS + ' karakter).' };
    var n = bersihkan(teks);
    if (n.length < 1) return { ok: false, galat: 'Tulis komentar dulu.' };
    if (n.length > MAKS) return { ok: false, galat: 'Komentar terlalu panjang (maksimal ' + MAKS + ' karakter).' };
    if (TAG.test(n)) return { ok: false, galat: 'Tanda < dan > tidak boleh dipakai.' };
    if (TAUTAN.test(n)) return { ok: false, galat: 'Tautan belum boleh dipakai di komentar.' };
    return { ok: true, nilai: n };
  }

  function el(nama, kelas, teks) {
    var e = document.createElement(nama);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;      /* satu-satunya jalur isi: textContent */
    return e;
  }
  function tanggal(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* Pasif: hanya menggambar daftar dari data yang diberikan. Tidak memeriksa flag karena tidak membuka jaringan. */
  function render(wadah, daftar) {
    while (wadah.firstChild) wadah.removeChild(wadah.firstChild);
    if (!Array.isArray(daftar) || !daftar.length) { wadah.appendChild(el('p', 'komentar-kosong', 'Belum ada komentar.')); return 0; }
    var ul = el('ul', 'komentar-daftar'), n = 0;
    daftar.slice(0, 100).forEach(function (k) {
      if (!k || typeof k !== 'object') return;
      var li = el('li', 'komentar-item');
      li.appendChild(el('strong', 'komentar-nama', String(k.nama_tampil == null ? '' : k.nama_tampil).slice(0, 30)));
      li.appendChild(el('span', 'komentar-waktu', ' ' + tanggal(k.created_at)));
      li.appendChild(el('p', 'komentar-isi', String(k.isi == null ? '' : k.isi).slice(0, MAKS)));
      ul.appendChild(li); n++;
    });
    wadah.appendChild(ul);
    return n;
  }

  /* Pasang formulir dan daftar. Tidak melakukan apa pun bila flag nonaktif.
     opsi.adaptor harus disediakan pemanggil (dibuat di fase penyambungan, bukan di berkas ini):
       adaptor.daftar(pelajaranId) -> Promise<array>, adaptor.kirim(pelajaranId, isi) -> Promise<void>. */
  function pasang(wadah, pelajaranId, opsi) {
    if (!AKTIF) return false;
    if (!wadah || !ID_RE.test(pelajaranId) || !opsi || !opsi.adaptor) return false;
    var ad = opsi.adaptor;
    var form = el('form', 'komentar-form');
    var label = el('label', null, 'Komentar'); label.setAttribute('for', 'komentar-isi');
    var ta = el('textarea'); ta.id = 'komentar-isi'; ta.maxLength = MAKS; ta.rows = 4; ta.required = true;
    var madu = el('input'); madu.type = 'text'; madu.name = 'situs'; madu.tabIndex = -1; madu.autocomplete = 'off'; madu.setAttribute('aria-hidden', 'true');
    madu.className = 'komentar-madu';
    var tombol = el('button', null, 'Kirim'); tombol.type = 'submit';
    var pesan = el('p', 'komentar-pesan'); pesan.setAttribute('role', 'status');
    var mulai = Date.now(), sibuk = false;
    form.appendChild(label); form.appendChild(ta); form.appendChild(madu); form.appendChild(tombol); form.appendChild(pesan);
    var daftarEl = el('div', 'komentar-daftar-wadah');
    function muat() { return ad.daftar(pelajaranId).then(function (d) { render(daftarEl, d); }, function () { pesan.textContent = 'Komentar belum bisa dimuat.'; }); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sibuk) return;
      if (madu.value !== '' || Date.now() - mulai < 1500) { pesan.textContent = 'Terima kasih, komentarmu menunggu tinjauan.'; return; }   /* jawaban sama untuk bot */
      var v = validasi(ta.value);
      if (!v.ok) { pesan.textContent = v.galat; return; }
      sibuk = true; tombol.disabled = true;
      ad.kirim(pelajaranId, v.nilai).then(function () {
        ta.value = ''; pesan.textContent = 'Terima kasih, komentarmu menunggu tinjauan.';
      }, function () {
        pesan.textContent = 'Komentar belum terkirim. Coba lagi sebentar lagi.';   /* galat server tidak ditampilkan mentah */
      }).then(function () { sibuk = false; tombol.disabled = false; });
    });
    wadah.appendChild(form); wadah.appendChild(daftarEl);
    muat();
    return true;
  }

  g.NVKomentar = { aktif: AKTIF, validasi: validasi, bersihkan: bersihkan, render: render, pasang: pasang, MAKS: MAKS };
})(window);
