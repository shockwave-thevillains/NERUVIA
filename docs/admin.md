# Admin NERUVIA (tahap 1 dari 3, build dev saja)

Tujuan: satu tempat untuk memantau pendaftar (dan kelak penjualan) serta memasukkan pelajaran dan video baru tanpa menyunting berkas di repo. Situs tetap statis; keamanan ada di Supabase (Auth + RLS), bukan di halaman.

## Tahap
| Tahap | Isi | Status |
|---|---|---|
| 1 | Skema admin, halaman `admin/` (masuk, keluar, total pendaftar), CSP | Halaman selesai. **SQL belum diterapkan ke `neruvia-dev`** (butir 11 PERLU-KEPUTUSAN) |
| 2 | Dashboard waitlist: pendaftar per hari, per level, daftar terbaru dengan email disamarkan, ekspor CSV aman rumus | belum |
| 3 | Editor pelajaran (teks + soal, divalidasi seperti `validasi-kursus.mjs`, simpan sebagai draf) dan unggah video ke Supabase Storage | belum |

Penjualan menunggu metode pembayaran dan harga yang belum diputuskan; dashboard-nya dirancang setelah itu.

## Cara kerja akses
- Admin = baris di `public.admins` (kunci `user_id`, bukan email). Menambah admin hanya lewat SQL oleh pengelola project; tidak ada jalur API. Alasannya: bila pendaftaran Auth terbuka, orang lain tidak bisa menjadi admin dengan mendaftar memakai email yang sama.
- Fungsi `private.is_admin()` (schema `private`, tidak terekspos API) dipakai kebijakan `waitlist_admin_baca`. Peran `anon` tetap hanya bisa INSERT ke waitlist. Akun login yang bukan admin tidak melihat baris apa pun.
- Halaman `admin/` masuk dengan email + kata sandi lewat `fetch` ke Supabase Auth, tanpa pustaka luar. Hanya token akses yang disimpan di `sessionStorage` (tanpa refresh token dan tanpa kata sandi); sesi berakhir saat token kedaluwarsa atau tab ditutup. Pesan gagal masuk sama untuk semua sebab. Setelah 5 kegagalan, tombol terkunci 30 detik (kosmetik; batas laju sungguhan ada di Supabase).
- Setelah masuk, halaman hanya membuka panel bila server mengembalikan tepat satu baris dari `admins`; akun lain langsung dikeluarkan dan tokennya dicabut. Menyembunyikan panel di klien bukan pengaman; data tetap ditolak RLS.
- Semua teks lewat `textContent`; tidak ada `innerHTML`. CSP halaman ini tanpa blok inline (`admin.js` dan `admin.css` berkas terpisah), `connect-src` hanya `'self'` dan host Supabase.

## Menyiapkan akun admin pertama (Master)
1. Terapkan `supabase/admin/001-admin.sql` di SQL Editor `neruvia-dev` (atau minta Claude menerapkannya dan setujui permintaan Supabase di aplikasi).
2. Dashboard Supabase, Authentication, Users, Add user: isi email dan kata sandi kuat (panjang, unik), centang auto confirm.
3. Jalankan di SQL Editor (ganti emailnya):
   `insert into public.admins (user_id, catatan) select id, 'pemilik' from auth.users where email = 'email-kamu@contoh.com';`
4. Buka `/admin/` di build dev dan masuk.
5. Disarankan: matikan pendaftaran akun baru (Authentication, sakelar signup) dan aktifkan MFA TOTP untuk akun admin; tahap berikutnya akan menuntut AAL2 bila MFA aktif.

## Uji
`node tools/uji-header-csp.mjs` mencakup `/admin/` dengan Supabase tiruan (sandi salah dan kunci, admin sah, pulih setelah muat ulang, keluar, akun non-admin ditolak dan token dicabut, 401 mengakhiri sesi, email berisi HTML tampil sebagai teks, tanpa pelanggaran CSP). Kebijakan RLS asli harus diuji di SQL setelah skema diterapkan (lihat bagian Uji RLS di PERLU-KEPUTUSAN butir 11).

## Belum terverifikasi
- Terhadap Supabase asli: alur Auth, header `Content-Range` yang terbaca lintas origin, dan kebijakan RLS. Sandbox tidak menjangkau host Supabase dan skemanya belum terpasang.
