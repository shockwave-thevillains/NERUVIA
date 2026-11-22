# Rancangan aman login dan komentar (S4)

Status: DRAF. Belum ada login, belum ada komentar, dan tidak ada layanan nyata yang disambungkan. Berkas yang menyertai rancangan ini:

| Berkas | Isi | Status |
|---|---|---|
| `supabase/draf/komentar.sql` | Tabel profil, komentar, laporan, catatan moderasi, RLS, pemicu | Draf, belum diterapkan |
| `supabase/draf/uji-komentar-lokal.sql` | Uji RLS dan batas di Postgres 16 lokal (tiruan Supabase) | Lulus, 71 pemeriksaan |
| `belajar/komentar-draf.js` | Kerangka klien di balik flag `AKTIF = false` | Tidak dimuat halaman mana pun |
| `tools/uji-komentar-draf.mjs` | Uji validasi, kesamaan aturan JS dan SQL, render tanpa XSS | Lulus, 28 pemeriksaan |

Dasar: OWASP ASVS (validasi input, encoding output, sesi, pencatatan), OWASP Authentication Cheat Sheet, dan dokumentasi Supabase Auth (rujukan di `docs/loop/RUJUKAN.md`). Temuan audit yang dijawab: K2 (pendaftaran Auth terbuka), K3 (anti-spam), K4 (persetujuan tanpa verifikasi).

## 1. Prinsip

1. Server adalah sumber kebenaran. Setiap aturan klien punya padanan constraint atau RLS di SQL, dan SQL tidak boleh lebih longgar. Klien memperbaiki masukan (NFKC, buang karakter kontrol), server menolak yang masih melanggar.
2. Isi dari pengguna tidak pernah dipakai sebagai HTML. Semua keluaran lewat `textContent`. Komentar menolak `<`, `>`, dan tautan, sehingga bila nanti ada yang salah memakai `innerHTML`, tidak ada tag untuk dieksekusi (pertahanan berlapis, bukan pengganti `textContent`).
3. Hak sekecil mungkin. Anon hanya membaca kolom aman dari komentar yang sudah tampil. Pengguna masuk hanya mengisi dua kolom (`pelajaran_id`, `isi`). Status, nama, dan pemilik ditentukan server.
4. Pesan yang sama untuk hasil yang berbeda bila perbedaannya membocorkan data (akun ada atau tidak, email terdaftar atau tidak).
5. Pencatatan tanpa data pribadi pengguna biasa: tidak ada IP, email, atau isi komentar di tabel catatan buatan kita.
6. Kerangka tidak aktif sampai Master memutuskan. Tidak ada kunci, URL layanan, atau panggilan jaringan di kode draf.

## 2. Login (Supabase Auth)

Hanya rancangan. Tidak ada halaman login di situs.

### Pilihan metode (Master memutuskan, butir 12 di PERLU-KEPUTUSAN)

| | A. Tautan masuk lewat email (tanpa kata sandi) | B. Email dan kata sandi |
|---|---|---|
| Kelebihan | Tidak ada kata sandi untuk dicuri, ditebak, atau dipakai ulang. Tidak perlu aturan sandi. Balasan "jika email terdaftar, tautan dikirim" tidak membocorkan akun. | Pengguna terbiasa. Tidak bergantung pada email tiap kali masuk. |
| Kekurangan | Setiap masuk mengirim email, jadi bergantung pada pengirim email yang andal. | Perlu aturan sandi, perlindungan sandi bocor, alur lupa sandi (jalur enumerasi), dan penyimpanan hash di Supabase. |
| Rekomendasi | Dipilih sebagai awal. | Hanya bila ada alasan kuat. |

Dasar rekomendasi: perlindungan sandi bocor (cek ke daftar HaveIBeenPwned) menurut dokumentasi Supabase hanya tersedia di paket Pro ke atas, jadi di paket gratis sandi yang lemah tidak bisa dicegah selengkap itu. Dengan metode A masalah ini tidak ada.

### Batas pengirim email (penghalang nyata)

Dokumentasi Supabase (dibaca 22 Nov 2026) menyebut pengirim email bawaan dibatasi 2 email per jam per project, dan batas itu naik hanya dengan SMTP sendiri atau hook pengiriman. Jumlah itu tidak cukup untuk login lewat tautan maupun untuk konfirmasi pendaftaran. Sebelum login diaktifkan, Master memilih layanan SMTP. Pemilihan layanan, akun, dan biaya bukan wewenang run otomatis.

### Pengaturan Auth yang harus dipastikan Master di dashboard (tidak terjangkau alat otomatis)

1. Selama login belum dipakai: matikan pendaftaran akun baru (K2). Tabel `auth.users` per 22 Nov berisi 0 akun.
2. Saat diaktifkan: wajibkan konfirmasi email sebelum sesi dibuat. Tanpa itu, siapa pun bisa memakai email orang lain.
3. Batas laju Auth (Authentication, Rate Limits): defaultnya menurut dokumentasi 30 permintaan per 5 menit per IP untuk pendaftaran dan masuk, dan 150 per 5 menit per IP untuk penyegaran token. Turunkan sesuai kebutuhan; batas dapat diubah di dashboard.
4. CAPTCHA di Auth (Bot and Abuse Protection): Supabase mendukung hCaptcha dan Cloudflare Turnstile; token dikirim klien sebagai `captchaToken`. Turnstile butuh akun Cloudflare milik Master (PERLU-KEPUTUSAN butir 8b).
5. Bila memakai kata sandi (B): panjang minimal 12, boleh sampai 64 karakter atau lebih, semua karakter termasuk spasi dan Unicode diizinkan, tanpa aturan komposisi paksa (sesuai OWASP: minimal 8 bila ada MFA dan 15 bila tidak, maksimal tidak di bawah 64). Aktifkan perlindungan sandi bocor bila paket mengizinkan. Dokumentasi Supabase menyarankan batas minimal besar dan menganggap di bawah 8 tidak dianjurkan.
6. MFA untuk admin (sudah dicatat di butir 11).
7. Pengalihan URL setelah login: daftar putih hanya origin situs sendiri.

### Anti-enumerasi akun

Prinsip OWASP: masuk, daftar, dan lupa sandi membalas sama apa pun hasilnya (pesan, kode status, dan waktu sedekat mungkin). Rancangan klien:

- Pesan setelah meminta tautan atau mendaftar selalu: "Jika alamat itu bisa dipakai, kami sudah mengirim email. Periksa kotak masuk dan folder spam."
- Pesan galat masuk selalu generik ("Email atau tautan tidak valid"), tanpa membedakan akun tidak ada dan sandi salah.
- Galat dari server tidak pernah ditampilkan mentah ke pengguna.
- Yang belum diverifikasi dan wajib diuji Master di `neruvia-dev` sebelum aktif: apakah balasan pendaftaran untuk email yang sudah ada benar-benar identik dengan email baru (isi dan status), dan apakah waktu responsnya mencolok berbeda. Jangan diasumsikan; ujinya dua panggilan dengan email uji milik sendiri.

### Sesi dan token

- Supabase JS menyimpan sesi di `localStorage`. Pencurian lewat XSS adalah risiko utamanya, jadi pertahanannya adalah CSP ketat (S3), nol `innerHTML`, dan pustaka diunduh sebagai berkas same-origin, bukan dari CDN.
- Pakai alur PKCE agar token tidak muncul di fragmen URL, dan bersihkan URL setelah kembali dari tautan email.
- Tautan masuk berlaku singkat dan sekali pakai (pengaturan kedaluwarsa OTP di dashboard).
- Tombol Keluar mengakhiri sesi di server (`signOut`) dan menghapus data lokal. Tidak ada fitur "ingat saya" tambahan.
- Kunci `service_role` tidak pernah ada di repo atau klien. Hanya kunci publishable yang sudah ada di `config.js`.
- Mengubah sandi atau email meminta autentikasi ulang.

## 3. Komentar

### Alur

1. Pengguna masuk, lalu membuat profil: nama tampil 2–30 karakter (aturan seperti nama waitlist, tanpa email).
2. Pengguna menulis komentar pada satu pelajaran. Komentar berstatus `menunggu` (pra-moderasi).
3. Admin menyetujui (`tampil`) atau menyembunyikan (`disembunyikan`). Hanya yang `tampil` terlihat publik.
4. Pengguna lain dapat melapor. Tiga pelapor berbeda mengembalikan komentar ke `menunggu` sampai admin meninjau.
5. Pemilik dapat menghapus komentarnya sendiri. Tidak ada penyuntingan isi (mengurangi penyalahgunaan setelah disetujui).

Pra-moderasi dipilih karena komunitas belum ada dan tiap komentar baru adalah risiko spam atau konten kasar. Bila volume tumbuh, Master dapat mengubah menjadi pasca-moderasi dengan satu perubahan di pemicu dan kebijakan.

### Validasi isi (klien dan server sama)

| Aturan | Klien (`NVKomentar.validasi`) | Server (`komentar_isi_aturan`) |
|---|---|---|
| Panjang | 1–500 setelah dirapikan | 1–500 |
| Karakter kontrol, lebar nol, pengecoh arah | Dibuang | Ditolak |
| `<` dan `>` | Ditolak | Ditolak |
| `http:`, `https:`, `ftp:`, `javascript:`, `data:`, `www.` | Ditolak | Ditolak (tanpa beda huruf) |
| Tiga baris kosong berurutan | Dirapikan jadi dua | Ditolak |
| Spasi di awal atau akhir | Dipangkas | Ditolak |
| Komentar sama persis oleh pengguna sama di pelajaran sama | — | Ditolak (indeks unik) |
| `pelajaran_id` | Huruf kecil, angka, strip, maks. 40 | Sama |

Tautan dilarang sementara karena tautan adalah bentuk spam paling umum dan karena situs belum punya daftar putih domain (K11).

### Hak akses (RLS) ringkas

| Peran | komentar | profil | laporan | catatan moderasi |
|---|---|---|---|---|
| anon | Baca baris `tampil`, kolom `id, pelajaran_id, nama_tampil, isi, created_at` saja | — | — | — |
| Pengguna masuk | Baca `tampil` dan milik sendiri; insert (`pelajaran_id`, `isi`); hapus milik sendiri | Baca, buat, ubah nama milik sendiri | Insert untuk komentar `tampil`; baca milik sendiri tanpa kolom pelapor | — |
| Admin (`private.is_admin()`) | Baca semua; ubah kolom `status` saja | — | Baca | Baca |

`user_id` dan `status` tidak pernah terlihat publik. Dibuktikan oleh uji lokal: anon yang memilih kolom `user_id` atau `status` ditolak (42501).

### Batas laju dan anti-bot

- Di database: pemicu menolak komentar ke-4 dalam semenit dan ke-31 dalam 24 jam per pengguna (galat `komentar_terlalu_sering`). Batas ini tetap berlaku walau penyerang memanggil REST langsung.
- Di klien: kolom jebakan (honeypot) dan penjaga waktu 1,5 detik. Bot yang terkena mendapat pesan sukses yang sama seperti pengguna sungguhan (tanpa petunjuk).
- Di Auth: batas laju dan CAPTCHA (bagian 2). Untuk komentar sendiri CAPTCHA tidak dipasang karena akun sudah lewat konfirmasi email dan batas laju.
- Batas ini mengurangi, bukan meniadakan, spam dari akun yang dibuat banyak-banyak. Karena itu pra-moderasi tetap ada.

### Pencatatan tanpa data pribadi

- `moderasi_log` hanya mencatat id komentar, status lama dan baru, waktu, dan id admin (kosong bila perubahan otomatis akibat laporan). Tidak ada IP, email, atau isi komentar.
- Log permintaan dari Supabase dan Vercel berada di luar kendali tabel kita; masa simpannya dan pengelolaannya dicatat di kebijakan privasi bila fitur diaktifkan.
- Laporan menyimpan id pelapor agar satu orang tidak melapor berulang; kolom itu tidak terbaca lewat API.

## 4. Dampak ke situs saat diaktifkan (bukan sekarang)

1. CSP: `connect-src` sudah mencakup host Supabase di halaman yang memuat `config.js`. Turnstile di klien akan menuntut `challenges.cloudflare.com` di `script-src`, `frame-src`, dan `connect-src`, yang melonggarkan CSP. Alternatif: CAPTCHA hanya di Auth dan halaman login terpisah dengan CSP sendiri. Perubahan CSP dibuat lewat `tools/buat-vercel-json.mjs`.
2. Pustaka `@supabase/supabase-js` harus disalin ke `assets/vendor` dengan lisensinya (tidak dari CDN), lalu diuji oleh `tools/uji-header-csp.mjs`.
3. Kebijakan privasi harus diperbarui: data akun (email, nama tampil), komentar, laporan, dan pihak ketiga (pengirim email, CAPTCHA). Placeholder kebijakan privasi masih belum terisi (butir 2), jadi login tidak boleh aktif sebelum itu.
4. Halaman baru (masuk, komentar) harus noindex, ditautkan lewat flag, dan lolos `tools/uji-header-csp.mjs`.
5. Panduan komunitas singkat (aturan komentar, cara melapor) perlu ditulis oleh Master. Run otomatis tidak menyatakan aturan hukum.

## 5. Model ancaman ringkas (STRIDE)

| Ancaman | Kontrol |
|---|---|
| S: menyamar pengguna lain | Sesi Auth; `user_id` dari `auth.uid()`, klien tidak bisa mengisi; kebijakan insert memeriksa kecocokan |
| S: menyamar admin | Admin hanya lewat tabel `admins` yang tidak bisa ditulis API; MFA (butir 11); nama tampil yang menyerupai "admin" tidak dijaga di server (risiko rendah, lihat risiko sisa di bawah) |
| T: mengubah status atau isi | Kolom insert dibatasi; update hanya `status` oleh admin; tidak ada update isi |
| T: isi berbahaya (XSS, tautan, spasi pengecoh) | Validasi sama di klien dan server; `textContent`; CSP |
| R: menyangkal tindakan moderasi | `moderasi_log` dengan id admin |
| I: membocorkan email atau id pengguna | Profil terpisah dari email; kolom publik dibatasi; pesan generik di klien |
| I: enumerasi akun | Balasan sama; uji wajib oleh Master (bagian 2) |
| D: banjir komentar atau pendaftaran | Batas laju database dan Auth; CAPTCHA; pra-moderasi; pelaporan otomatis menyembunyikan |
| E: pengguna biasa menjadi admin | `admins` tanpa jalur API; uji lokal memastikan insert ditolak |

Risiko sisa yang diakui: nama tampil tidak dicegah meniru nama orang atau "admin" (server hanya memeriksa karakter). Akun yang dibuat banyak-banyak dengan email sekali pakai tetap bisa mengirim komentar yang menunggu tinjauan, jadi beban jatuh pada moderator. Pengirim email bawaan sangat terbatas. Pengguna di bawah umur dan persetujuan orang tua tidak dibahas di sini.

## 6. Cara menguji

```
node tools/uji-komentar-draf.mjs                               # klien: validasi, kesamaan aturan, render tanpa XSS
su postgres -c "psql -v ON_ERROR_STOP=1 -q -f supabase/draf/uji-komentar-lokal.sql"   # SQL: RLS, pemicu, batas
```

Uji kedua membuat basis data sementara `uji_komentar` di Postgres lokal dan tidak menyentuh Supabase. Uji yang butuh proyek nyata dan wajib dilakukan Master setelah menerapkan SQL (hapus data uji sesudahnya): (a) anon tidak bisa membaca `user_id`/`status` lewat REST; (b) pengguna biasa tidak bisa menulis `status`; (c) balasan pendaftaran email lama dan baru sama; (d) komentar ke-4 dalam semenit ditolak; (e) advisor keamanan Supabase bersih setelah migrasi.

## 7. Urutan aktivasi (setelah Master memutuskan)

1. Isi placeholder kebijakan privasi dan tulis panduan komunitas.
2. Pilih metode login dan layanan SMTP; atur Auth (bagian 2).
3. Master menerapkan `komentar.sql` ke `neruvia-dev` dan menjalankan uji bagian 6.
4. Claude interaktif membuat adaptor dan halaman masuk di build dev, memperbarui CSP, lalu mengubah flag `AKTIF`.
5. Uji penuh (`uji-keamanan.mjs`, `uji-header-csp.mjs`, uji keyboard), baru dipertimbangkan untuk produksi.

## 8. Butir yang belum dikonfirmasi

Dokumentasi Supabase dan OWASP dibaca pada 22 Nov 2026; batas laju, paket yang menyediakan perlindungan sandi bocor, dan jumlah email bawaan dapat berubah, jadi cek ulang saat penerapan. Perilaku `signUp` untuk email yang sudah ada belum diuji di proyek ini.
