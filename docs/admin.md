# Admin NERUVIA (tahap 3 dari 3, build dev saja)

Tujuan: satu tempat untuk memantau pendaftar (dan kelak penjualan) serta memasukkan pelajaran dan video baru tanpa menyunting berkas di repo. Situs tetap statis; keamanan ada di Supabase (Auth + RLS), bukan di halaman.

## Tahap
| Tahap | Isi | Status |
|---|---|---|
| 1 | Skema admin, halaman `admin/` (masuk, keluar, total pendaftar), CSP | Halaman selesai. SQL diterapkan ke `neruvia-dev` 22 Nov 2026 (migrasi `admin_tahap1`); uji RLS lulus. Tinggal membuat akun admin (langkah 2-3 di bawah) dan login sungguhan |
| 2 | Dashboard waitlist: total, hari ini, 7 hari terakhir, grafik 14 hari (WIB), pendaftar per level, 10 pendaftar terbaru dengan email disamarkan, ekspor CSV aman rumus | Selesai. View `waitlist_per_hari` dan `waitlist_per_jalur` (security invoker) diterapkan ke `neruvia-dev` 22 Nov 2026 (`supabase/admin/002-dashboard.sql`) |
| 3 | Editor draf pelajaran (divalidasi seperti `validasi-kursus.mjs`, disimpan sebagai draf, unduh JSON) dan unggah video ke Supabase Storage | Selesai. Tabel `pelajaran_draf` dan bucket privat `video-materi` diterapkan ke `neruvia-dev` 22 Nov 2026 (`supabase/admin/003-draf-video.sql`) |

Penjualan menunggu metode pembayaran dan harga yang belum diputuskan; dashboard-nya dirancang setelah itu.

## Cara kerja akses
- Admin = baris di `public.admins` (kunci `user_id`, bukan email). Menambah admin hanya lewat SQL oleh pengelola project; tidak ada jalur API. Alasannya: bila pendaftaran Auth terbuka, orang lain tidak bisa menjadi admin dengan mendaftar memakai email yang sama.
- Fungsi `private.is_admin()` (schema `private`, tidak terekspos API) dipakai kebijakan `waitlist_admin_baca`. Peran `anon` tetap hanya bisa INSERT ke waitlist. Akun login yang bukan admin tidak melihat baris apa pun.
- Halaman `admin/` masuk dengan email + kata sandi lewat `fetch` ke Supabase Auth, tanpa pustaka luar. Hanya token akses yang disimpan di `sessionStorage` (tanpa refresh token dan tanpa kata sandi); sesi berakhir saat token kedaluwarsa atau tab ditutup. Pesan gagal masuk sama untuk semua sebab. Setelah 5 kegagalan, tombol terkunci 30 detik (kosmetik; batas laju sungguhan ada di Supabase).
- Setelah masuk, halaman hanya membuka panel bila server mengembalikan tepat satu baris dari `admins`; akun lain langsung dikeluarkan dan tokennya dicabut. Menyembunyikan panel di klien bukan pengaman; data tetap ditolak RLS.
- Semua teks lewat `textContent`; tidak ada `innerHTML`. CSP halaman ini tanpa blok inline (`admin.js` dan `admin.css` berkas terpisah), `connect-src` hanya `'self'` dan host Supabase.

## Status pendaftaran akun: DITUTUP selama beta (22 Nov 2026, keputusan Master)
Tidak ada pihak luar yang boleh membuat akun. Penutup: trigger `tolak_pendaftaran` pada `auth.users` di `neruvia-dev` (`supabase/admin/004-tutup-pendaftaran.sql`). Waitlist di landing tetap terbuka karena tidak membuat akun.
- Membuka kembali (setelah beta, atau sementara untuk membuat admin sungguhan): `drop trigger tolak_pendaftaran on auth.users;` lalu tutup lagi dengan `create trigger tolak_pendaftaran before insert on auth.users for each row execute function private.tolak_pendaftaran();`
- Sebelum dibuka untuk umum, selesaikan dulu: K3 (perlindungan spam/Turnstile), rancangan `docs/security/auth-komentar.md`, ganti atau hapus akun dummy admin, aktifkan MFA admin, dan matikan sakelar signup di dashboard hanya bila memang ingin menutup lewat pengaturan bawaan.
- Sakelar "Allow new users to sign up" di dashboard (Authentication, Sign In / Providers) sebaiknya ikut dimatikan. Konektor tidak bisa mengubahnya, jadi Master yang menekannya.
- Proyek produksi (bila dibuat nanti) belum memakai trigger ini. Terapkan 004 sebelum proyek itu menerima lalu lintas.

## Menyiapkan akun admin pertama (Master)
1. Sudah selesai: `supabase/admin/001-admin.sql` diterapkan ke `neruvia-dev` (22 Nov 2026).
2. Dashboard Supabase, Authentication, Users, Add user: isi email dan kata sandi kuat (panjang, unik), centang auto confirm.
3. Jalankan di SQL Editor (ganti emailnya):
   `insert into public.admins (user_id, catatan) select id, 'pemilik' from auth.users where email = 'email-kamu@contoh.com';`
4. Buka `/admin/` di build dev dan masuk.
5. Pendaftaran akun baru sudah ditutup (22 Nov 2026) lewat trigger `tolak_pendaftaran` di `auth.users` (`supabase/admin/004-tutup-pendaftaran.sql`): setiap INSERT ke `auth.users` ditolak, termasuk pembuatan user dari dashboard. Untuk membuat akun admin baru, hapus trigger itu sebentar (perintahnya ada di berkas SQL), buat user, lalu pasang lagi. Sakelar bawaan Supabase (Authentication, Sign In / Providers, "Allow new users to sign up") setara dan sebaiknya ikut dimatikan oleh Master. Disarankan juga mengaktifkan MFA TOTP untuk akun admin; tahap berikutnya akan menuntut AAL2 bila MFA aktif.

## Memasukkan draf pelajaran ke situs
1. Di `/admin/`, buka draf, klik "Unduh JSON".
2. Pastikan id pelajarannya sudah ada di `content/kursus.json`.
3. Uji coba: `node tools/impor-draf.mjs unduhan.json` (tidak menulis apa pun).
4. Tulis: `node tools/impor-draf.mjs unduhan.json --tulis` (opsi `--status final` bila sudah disetujui, `--timpa` bila berkas isi sudah ada).
5. Alat memeriksa format id, kunci yang diizinkan, ukuran, dan menjalankan `tools/validasi-kursus.mjs`. Bila gagal, semua berkas dikembalikan.
6. Tinjau isinya oleh manusia, lalu commit ke `dev`. Uji alat: `node tools/uji-impor-draf.mjs`.

## Dashboard (tahap 2)
- Angka total, per hari, dan per level datang dari dua view `security_invoker` yang hanya memuat agregat. RLS tabel `waitlist` tetap berlaku: admin melihat angka sebenarnya, akun login lain melihat 0 baris, `anon` ditolak (tanpa hak select). Diuji di Supabase asli dalam transaksi yang dibatalkan.
- Daftar terbaru memakai tabel `waitlist` langsung (10 baris). Email hanya tampil disamarkan (`a***@domain`); nama dan semua isi sel lewat `textContent`. Grafik dibuat dari elemen SVG, tanpa `innerHTML` dan tanpa atribut `style`, jadi CSP `/admin/` tetap tanpa hash.
- Ekspor CSV mengambil 1000 baris per permintaan (batas 20.000 baris), memakai BOM UTF-8 agar Excel membaca aksara dengan benar, dan memberi tanda petik di depan sel yang diawali `=`, `+`, `-`, atau `@` (termasuk setelah spasi atau tab) supaya tidak dibaca sebagai rumus. CSV memuat nama dan email lengkap: perlakukan sebagai data pribadi.
- Tanggal "hari ini" dan batang grafik memakai tanggal WIB (UTC+7), sama dengan pengelompokan di view.

## Draf pelajaran dan video (tahap 3)
- **Draf bukan materi terbit.** Situs tetap membaca `content/pelajaran/*.json` dari repo. Editor menyimpan draf di tabel `public.pelajaran_draf` (kunci `id` berbentuk `l1-m1-p2`, isi `jsonb` maksimal 60 KB, `isi.id` harus sama dengan `id`). Bila semua aturan standar terpenuhi, status draf menjadi `siap` dan tombol Unduh JSON aktif. JSON itu dimasukkan ke `content/pelajaran/` lewat commit dan didaftarkan di `content/kursus.json`; setelah itu `node tools/validasi-kursus.mjs` berlaku seperti biasa.
- **Aturan pemeriksaan di editor** sama dengan `cekIsi()` di `tools/validasi-kursus.mjs`: tujuan, bagian (judul dan paragraf), contoh, latihan, tepat 3 soal cek (3 sampai 5 pilihan, nomor jawaban benar, penjelasan), tepat 3 butir ringkasan, dan tidak ada kata "video" atau "tonton" di materi tulisan.
- **Video:** bucket privat `video-materi`, batas 50 MB per berkas (batas paket gratis) dan hanya `video/mp4` dan `video/webm`, diterapkan di klien dan di bucket. Nama berkas dibersihkan menjadi huruf kecil, angka, dan tanda hubung dengan awalan tanggal WIB. Pemutar memakai tautan bertanda tangan yang berlaku 5 menit; bucket tidak pernah publik. Video belum tertaut ke pelajaran mana pun, dan materi tulisan memang tidak boleh merujuk video.
- **Akses:** semua kebijakan tabel dan `storage.objects` untuk bucket ini mensyaratkan `private.is_admin()`; anon tidak punya hak apa pun.
- **CSP:** hanya `/admin/` mendapat `media-src 'self'` ditambah host Supabase, supaya pemutar bisa memuat tautan bertanda tangan. Halaman lain tidak berubah.
- **Batas:** video lebih dari 50 MB belum didukung. Opsinya tautan ke pemutar luar, yang menuntut CSP mengizinkan host pemutar tertentu; belum dikerjakan.

## Catatan uji RLS setelah pendaftaran ditutup
Skrip uji RLS yang membuat user palsu di `auth.users` (dalam transaksi yang dibatalkan) akan ditolak trigger `tolak_pendaftaran`. Hapus trigger sementara untuk menjalankan uji seperti itu, atau uji dengan `request.jwt.claims` yang memakai `sub` akun yang sudah ada, lalu pasang trigger lagi.

## Uji
`node tools/uji-header-csp.mjs` mencakup `/admin/` dengan Supabase tiruan (sandi salah dan kunci, admin sah, dashboard dan CSV aman rumus, editor draf pelajaran, unggah dan putar video, kegagalan sebagian data, pulih setelah muat ulang, keluar, akun non-admin ditolak dan token dicabut, 401 mengakhiri sesi, email berisi HTML tampil sebagai teks, tanpa pelanggaran CSP). Kebijakan RLS asli harus diuji di SQL setelah skema diterapkan (lihat bagian Uji RLS di PERLU-KEPUTUSAN butir 11).

## Hasil uji RLS di Supabase asli (22 Nov 2026)
Dijalankan sebagai transaksi yang dibatalkan dengan `set local role` dan `request.jwt.claims`; tidak ada baris tersisa. Advisor keamanan: tanpa temuan.
- `anon` tidak bisa `select` waitlist (ditolak); `anon` tetap bisa `insert` waitlist; `anon` tidak bisa menulis `admins`.
- Akun login non-admin melihat 0 baris waitlist dan 0 baris `admins`.
- Admin melihat semua baris waitlist dan hanya barisnya sendiri di `admins`.
- `authenticated` tidak bisa `insert`, `update`, atau `delete` pada `admins`, dan tidak bisa `update` atau `delete` waitlist (kode 42501).
- `private.is_admin()` tidak bisa dijangkau `anon` (tanpa usage schema `private`, tanpa execute) dan tidak ada salinannya di schema `public`.

## Belum terverifikasi
- Terhadap Supabase asli: alur Auth (login lewat `fetch`) dan header `Content-Range` yang terbaca lintas origin. Sandbox tidak menjangkau host Supabase; uji dari browser Master setelah akun admin dibuat.
