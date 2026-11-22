# Uji keamanan otomatis (`tools/uji-keamanan.mjs`)

Gerbang sebelum commit yang menyentuh kode atau konten (lihat `docs/loop/RUNBOOK.md`, bagian Gerbang keamanan). Tanpa dependensi npm. Playwright dipakai bila terpasang.

```
node tools/uji-keamanan.mjs           # semua bagian, sekitar 45 detik
node tools/uji-keamanan.mjs --cepat   # tanpa browser, sekitar 2 detik (untuk perubahan dokumen)
```

Kode keluar: 0 lulus, 1 ada yang gagal, 2 lulus tetapi uji browser dilewati karena Playwright tidak ada.

| Bagian | Yang diperiksa |
|---|---|
| A. Rahasia | Pola kunci, token, kunci pribadi, sandi tertulis, JWT `service_role` di semua berkas teks (termasuk berkas baru yang belum di-commit) dan di seluruh riwayat git (baris tambahan). `config.js` hanya boleh berisi endpoint REST waitlist Supabase dan kunci publishable. |
| B. Sink berbahaya | `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `setTimeout` berisi teks, `srcdoc`, `window.open`, navigasi dari nilai tak pasti, atribut `on*`, URL `javascript:`, `<iframe>`/`<object>`/`<base>`, sumber luar, `target=_blank` tanpa `rel`. Komentar JS dibuang dulu agar teks penjelasan tidak memicu. |
| C. Header | `vercel.json` sesuai isi halaman, tiap halaman (semua rute) mendapat header keamanan dan CSP tanpa `unsafe-*`, wildcard, `data:`, `http:`; `connect-src` hanya `self` dan host Supabase. |
| D. Konten kursus | JSON konten bebas tag HTML, URL `javascript:`/`data:`, atribut `on*`, karakter kontrol/bidi, referensi berkas media, dan kunci prototipe. |
| E. Uji unit | Impor progres dan baca localStorage dengan muatan jahat (id berbahaya, tanggal ekstrem, objek bersarang 5000 tingkat, 50.000 kunci, pencemaran prototipe), lalu menjalankan `uji-impor-progres`, `uji-komentar-draf`, `uji-impor-draf`, `validasi-kursus`, dan `buat-vercel-json --cek`. |
| F. Browser | Form waitlist dengan sekitar 70 payload (XSS, HTML, SQL, rumus CSV, templat, bidi, lebar nol, fullwidth, emoji, sangat panjang) dan memeriksa body yang terkirim sesuai aturan server; honeypot, penjaga waktu, level yang dipalsukan; 19 id jahat di halaman pelajaran; localStorage jahat; impor berkas jahat di galeri; kontrol negatif CSP (skrip inline dan koneksi luar harus diblokir). Gagal bila ada skrip berjalan, dialog, galat skrip, pelanggaran CSP tak terduga, atau data lolos yang melanggar aturan server. |
| G. Kontrol negatif | Tiap pemindai ditantang dengan contoh buruk (harus tertangkap) dan contoh aman (tidak boleh ditandai), supaya uji tidak lulus karena buta. |

## Batas
- Pemindai sink berbasis teks, bukan parser JS penuh. Pola yang dirangkai lewat penggabungan string tidak tertangkap; CSP (bagian C dan F) menjadi lapis kedua.
- Uji yang butuh Supabase nyata (K1 enumerasi email, K2 pendaftaran Auth, K3 batas laju) tetap manual oleh Master (`docs/loop/AUDIT-KEAMANAN.md`).
- Header asli di Vercel belum diperiksa dari sini (PERLU-KEPUTUSAN butir 10); uji ini memeriksa aturan di `vercel.json`, bukan respons Vercel.
- Satu-satunya pengecualian: dua alat `tools/video/*.html` (PERLU-KEPUTUSAN butir 13), hanya untuk `innerHTML` dan `insertAdjacentHTML`, dengan peringatan tiap run.
