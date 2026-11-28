# Arsitektur dan alur data NERUVIA

Kegiatan L4, 24 Nov 2026. Dokumen ini menjelaskan bagaimana bagian-bagian repo NERUVIA tersusun, ke mana data mengalir, apa yang dijaga di tiap titik, dan bagaimana alat pemeriksanya dijalankan. Ditulis dari pembacaan kode di branch `dev` (bukan dari ingatan atau dokumen lain), lalu setiap angka dan jalur di sini dicek ulang dengan skrip (lihat bagian 12). Tanpa kunci, tanpa identitas pembuat. Untuk menulis pelajaran, baca `docs/panduan-penulis.md`; untuk aturan run terjadwal, baca `docs/loop/RUNBOOK.md`.

## 1. Ringkasan dalam satu layar

NERUVIA tahap ini adalah **situs statis tanpa build**: HTML, CSS, dan JavaScript murni yang dibuka langsung oleh browser. Tidak ada server aplikasi milik NERUVIA, tidak ada paket npm di sisi situs, dan tidak ada langkah kompilasi. Hanya ada dua titik yang berbicara dengan layanan luar, dan keduanya ke satu project Supabase (`neruvia-dev`): form waitlist di landing, dan halaman admin.

Tiga prinsip yang menentukan hampir semua keputusan di bawah:

1. **Isi belajar adalah berkas JSON di repo.** Pelajaran ditulis, ditinjau, dan dirilis lewat commit, sehingga setiap perubahan materi bisa dilacak dan dibatalkan dengan git.
2. **Keamanan ada di server, bukan di halaman.** Halaman bisa dimanipulasi siapa pun lewat konsol browser. Yang melindungi data adalah Row Level Security (RLS) di Supabase. Penyembunyian di klien hanya kenyamanan.
3. **Data dari luar tidak pernah dipercaya.** Teks dari JSON, form, berkas impor, dan `localStorage` hanya masuk ke halaman lewat `textContent`, tidak pernah lewat `innerHTML`, `eval`, atau atribut `on*`. Gerbang `tools/uji-keamanan.mjs` mengujinya.

## 2. Peta sistem

```
                           BROWSER PENGUNJUNG
 +-----------------------------------------------------------------+
 |  index.html (landing)   belajar/ (galeri + pelajaran)   admin/   |
 |        |  form waitlist         |  baca JSON statis      |  login |
 |        |                        |  progres di localStorage|       |
 +--------|------------------------|-----------------------|-------+
          | POST (kunci publishable) | GET same-origin        | GET/POST/DELETE
          v                          v                        v (token admin)
 +-------------------+     +-----------------------+   +----------------------+
 | Supabase neruvia- |     | Hosting statis        |   | Supabase neruvia-dev |
 | dev: tabel        |     | Vercel (dev) /        |   | Auth + REST + Storage|
 | waitlist (insert  |     | GitHub Pages (main)   |   | (semua dijaga RLS    |
 | saja untuk anon)  |     | content/*.json,       |   |  dan private.is_admin)|
 +-------------------+     | assets, halaman       |   +----------------------+
                           +-----------^-----------+
                                       | deploy dari git
                           +-----------+-----------+
                           | Repo GitHub           |
                           | branch dev (kerja),   |
                           | main (tayang)         |
                           +-----------^-----------+
                                       | commit setelah gerbang uji
                           +-----------+-----------+
                           | Penulis / run terjadwal|
                           | node tools/*.mjs       |
                           +-----------------------+
```

Halaman `belajar/` tidak memanggil Supabase sama sekali. Satu-satunya permintaan jaringannya adalah `fetch` ke berkas JSON di origin yang sama. Progres belajar tidak pernah meninggalkan browser pemiliknya.

## 3. Struktur repo

Jumlah berkas dihitung dari `git ls-files` pada 28 Nov 2026 (total 238 berkas terlacak).

| Lokasi | Berkas | Isi | Tayang ke pengunjung? |
|---|---|---|---|
| akar | 9 | `index.html` (landing, CSS dan JS di dalam berkas), `terima-kasih.html`, `kebijakan-privasi.html`, `404.html`, `config.js`, `vercel.json`, `.vercelignore`, `robots.txt` (H1, 28 Nov), `README.md` | Empat halaman, `config.js`, dan `robots.txt`, ya; `vercel.json` dibaca Vercel |
| `belajar/` | 5 | Ruang Belajar: `index.html` (galeri), `pelajaran.html` (penampil), `progress.js`, `ruang.css`, `komentar-draf.js` | Ya, kecuali `komentar-draf.js` (tidak dimuat halaman mana pun) |
| `admin/` | 4 | `index.html`, `admin.js`, `materi.js`, `admin.css` | Ya di build dev; noindex; hanya admin yang bisa melihat data |
| `content/` | 31 | `kursus.json` (katalog) dan 30 berkas `content/pelajaran/<id>.json` | Ya, dibaca lewat `fetch` |
| `assets/` | 99 | Maskot Neru (AVIF, WebP, tiga tingkat frame animasi), logo, font lokal, Lenis | Sebagian; tujuh aset berat tanpa rujukan dikecualikan lewat `.vercelignore` |
| `supabase/` | 8 | SQL: `waitlist.sql`, `supabase/admin/001-admin.sql` sampai `supabase/admin/004-tutup-pendaftaran.sql`, dan `supabase/draf/` (komentar, perketat waitlist, uji lokal) | Tidak dimuat halaman; ikut diterbitkan bila hosting menyajikan seluruh repo (PERLU-KEPUTUSAN butir 13) |
| `tools/` | 48 | Validator, uji, pembuat `vercel.json` dan berkas SEO, pengukur kinerja, alat impor, dan `tools/video/` | Tidak dimuat halaman |
| `docs/` | 34 | PRD, loop (runbook, progres, audit), keamanan, riset, draf, snapshot, video arsip | Tidak dimuat halaman |

Aturan penempatan: kode situs tidak boleh memuat apa pun dari `docs/`, `tools/`, atau `supabase/`. `tools/buat-vercel-json.mjs` melewati folder itu saat mencari halaman HTML.

## 4. Halaman dan apa yang dimuatnya

| Halaman | Skrip yang dimuat | Jaringan | Penyimpanan di browser |
|---|---|---|---|
| `index.html` | `assets/vendor/lenis-1.3.27.min.js` (scroll halus, hanya untuk mouse dan trackpad), `config.js`, dua blok skrip inline (satu baris kecil yang melepas kelas `no-js`, satu skrip utama) | `POST` ke endpoint waitlist saat form dikirim; frame animasi Neru diminta setelah event `load` | Tidak ada |
| `terima-kasih.html` | satu blok skrip inline kecil (memindahkan fokus) | Tidak ada | Tidak ada. noindex |
| `kebijakan-privasi.html` | Tidak ada | Tidak ada | Tidak ada. noindex. Masih memuat placeholder identitas pengendali data |
| `404.html` | satu blok skrip inline kecil (menambah awalan `/<repo>` hanya di `*.github.io`) | Tidak ada selain aset situs | Tidak ada. noindex. Meta CSP di dalam berkas; alamat yang diminta tidak ditampilkan |
| `belajar/index.html` | `progress.js`, satu blok inline | `fetch ../content/kursus.json` | `localStorage` kunci `neruvia.progress.v1` (lewat `progress.js`). noindex |
| `belajar/pelajaran.html?id=` | `progress.js`, satu blok inline | `fetch ../content/kursus.json`, lalu `fetch ../content/pelajaran/<id>.json` | Sama seperti galeri. noindex |
| `admin/index.html` | `config.js`, `admin.js`, `materi.js` (berkas terpisah, tanpa blok inline) | Supabase Auth, REST, dan Storage dengan token admin | `sessionStorage` kunci `neruvia.admin.v1` (hanya token akses dan waktu kedaluwarsa). noindex, nofollow |

Catatan penting dari tabel ini:

- `config.js` hanya dimuat landing dan admin. Halaman belajar tidak tahu alamat Supabase.
- Hanya satu pustaka pihak ketiga yang ada di situs: Lenis, disajikan dari repo sendiri (`assets/vendor/`, lisensi di `LENIS-LICENSE.txt`). Font (Space Grotesk, Space Mono, Silkscreen) juga lokal. Tidak ada CDN, sehingga CSP tidak perlu mengizinkan host luar selain Supabase.
- `belajar/komentar-draf.js` berisi kerangka komentar dengan flag `AKTIF = false`. Tidak ada halaman yang memuatnya, dan SQL pasangannya belum diterapkan.

## 5. Alur data

Enam alur, masing-masing dengan pemicu, jalur, penjaga di tiap titik, dan perilaku saat gagal.

### 5.1 Pendaftaran waitlist (pengunjung ke Supabase)

Pemicu: pengunjung mengirim form di `index.html`.

1. **Klien menormalkan dan memeriksa.** Nama dan email melewati NFKC, karakter kontrol, lebar nol, dan pengecoh arah teks dibuang, spasi dirapikan. Nama maksimal 60 karakter dan hanya huruf, angka, spasi, titik, apostrof, tanda hubung. Email memakai pola ketat (tanpa `..`, maksimal 254 karakter). Persetujuan wajib dicentang. Pilihan jalur harus salah satu dari empat nilai yang dikenal.
2. **Penahan bot sederhana.** Kolom jebakan `website` yang terisi membuat pengiriman diabaikan diam-diam. Pengiriman dalam 1,2 detik sejak interaksi pertama ditolak. Tombol terkunci selama pengiriman, dan permintaan dibatalkan setelah 12 detik. Ini hanya menahan bot paling sederhana; perlindungan spam sungguhan menunggu keputusan Master (PERLU-KEPUTUSAN butir 8).
3. **Kirim.** `POST` JSON ke `NERUVIA_WAITLIST_ENDPOINT` dengan header dari `NERUVIA_WAITLIST_HEADERS` (kunci publishable). Isi: `name`, `email`, `jalur`, `consent`, `consent_text` (versi teks persetujuan, saat ini "v4 2026-11-19"), dan `client_ts`. Tanpa endpoint (misalnya tanpa `config.js`), form berjalan dalam mode pratinjau dan tidak mengirim apa pun.
4. **Server memutuskan.** Peran `anon` hanya punya hak `INSERT` pada `public.waitlist`, dan kebijakan RLS mensyaratkan `consent is true`. Constraint tabel menolak format yang salah, jalur asing, dan email ganda tanpa membedakan huruf besar kecil (kolom turunan `email_key`).
5. **Hasil.** Status 2xx, 409 (email sudah ada), dan 422 diperlakukan sama: form menampilkan sukses lalu berpindah ke `terima-kasih.html` setelah 0,9 detik. Dengan begitu orang luar tidak bisa menebak email siapa yang sudah terdaftar lewat perbedaan respons di klien. Status lain atau jaringan putus menampilkan pesan gagal dan isian tetap utuh.

Yang belum tertutup: kode 409 masih terlihat di tab jaringan browser (temuan K1 di `docs/loop/AUDIT-KEAMANAN.md`). Fungsi `join_waitlist` yang menyamakan jawaban ada di `supabase/draf/waitlist-s2-perketat.sql` bagian D, sengaja belum diaktifkan menunggu keputusan Master.

### 5.2 Katalog dan isi pelajaran (repo ke pelajar)

Pemicu: pelajar membuka `belajar/` atau `belajar/pelajaran.html?id=<id>`.

1. Galeri mengambil `content/kursus.json` dan menggambar level, modul, dan pelajaran. Level berstatus `segera` ditampilkan tanpa tombol Mulai atau Lanjutkan, dan tautan Lanjut otomatis melewatinya; tautan ke pelajaran yang sudah punya isi di dalamnya tetap ada di daftar modul.
2. Penampil membaca parameter `id`, mencarinya di katalog, lalu mengambil `content/pelajaran/<id>.json` (id dilewatkan lewat `encodeURIComponent`). Id yang kosong, tidak dikenal, atau berisi HTML berakhir pada pesan "Pelajaran tidak ditemukan." tanpa mengeksekusi apa pun; bila halaman dibuka dari berkas lokal (bukan lewat server), pesannya meminta pembuka memakai server.
3. Pelajaran dengan `isi: "belum"` di katalog tidak punya berkas isi dan tampil sebagai "materi sedang disusun". Pelajaran `draf` memakai penanda DRAF di galeri dan di halaman pelajaran sampai Master menyetujuinya.
4. Bagian bawah halaman (tombol selesai, status, navigasi) dipasang setelah isi tiba. Itu disengaja agar tata letak tidak melompat (CLS); jangan dikembalikan ke pemasangan awal. Uji: `tools/uji-cls-pelajaran.mjs`.

Dua tingkat JSON dipakai karena kebutuhannya beda. `kursus.json` kecil dan dibaca di setiap halaman belajar. Berkas pelajaran lebih besar (sekitar satu halaman teks) dan hanya diambil saat dibuka.

Bentuk `kursus.json`: objek dengan `versi`, `diperbarui`, `catatan`, `xp_per_jenis` (tabel XP per jenis pelajaran), dan `level`. Tiap level punya `id`, `nomor`, `judul`, `ringkasan`, `status` (`gratis` atau `segera`), `tag`, dan `modul`. Tiap modul punya `id` dan `pelajaran`. Tiap pelajaran punya `id`, `judul`, `jenis` (`Konsep`, `Praktik`, `Latihan`), `xp`, dan `isi` (`belum`, `draf`, `final`). Id berantai: modul berawalan id level, pelajaran berawalan id modul (`l1` → `l1-m1` → `l1-m1-p1`). Berkas pelajaran punya `id`, `status`, `tujuan`, `bagian`, `contoh`, `latihan`, `cek` (tepat tiga soal), `ringkasan` (tepat tiga butir), dan opsional `interaktif`. Aturan lengkap dan templat ada di `docs/panduan-penulis.md`; yang menegakkannya adalah `tools/validasi-kursus.mjs`.

Keadaan saat ini (dari validator): 3 level, 30 pelajaran, 39 id unik. Level 1 dan Level 2 masing-masing punya tiga modul dengan lima pelajaran berstatus `draf`; Level 3 belum punya modul.

### 5.3 Progres belajar (hanya di browser)

Pemicu: pelajar menekan "Tandai selesai", atau mengimpor berkas progres.

- `progress.js` menyimpan satu objek `{ done: { <id pelajaran>: <waktu ISO UTC> } }` di `localStorage` pada kunci `neruvia.progress.v1`. Tidak ada kunci lain dan tidak ada pengiriman ke server.
- XP, streak (hari lokal beruntun), dan lima badge **dihitung ulang dari data itu** setiap halaman dibuka, bukan disimpan. Tidak ada angka turunan yang bisa tidak sinkron.
- Saat membaca, entri yang id-nya tidak berbentuk `[a-z0-9-]` (maksimal 40 karakter), atau tanggalnya bukan ISO nyata, sebelum 2026, dibuang. Hasilnya objek tanpa prototipe, sehingga id seperti `__proto__` tidak berbahaya.
- Ekspor menghasilkan JSON `{ app, versi, diekspor, done }`. Impor menolak format asing, lebih dari 500 id, id di luar daftar pelajaran yang ada, dan tanggal di masa depan lebih dari satu hari; entri yang sama diambil waktu paling awalnya (gabung, tidak menimpa).
- Konsekuensi desain: progres terikat pada satu browser pada satu perangkat. Berpindah perangkat berarti ekspor lalu impor. Akun dan sinkronisasi ke server sengaja belum ada (lihat 5.4 dan 9).

### 5.4 Admin (admin ke Supabase)

Pemicu: pengelola membuka `/admin/` dan masuk.

1. **Masuk.** Email dan kata sandi dikirim lewat `fetch` ke Supabase Auth (`/auth/v1/token?grant_type=password`), tanpa pustaka luar. Hanya token akses dan waktu kedaluwarsanya disimpan di `sessionStorage`; kata sandi dan refresh token tidak disimpan. Pesan gagal sama untuk semua sebab, dan setelah lima kegagalan tombol terkunci 30 detik (kosmetik; batas laju sungguhan ada di Supabase).
2. **Verifikasi peran.** Halaman meminta `/rest/v1/admins`. Panel hanya dibuka bila server mengembalikan tepat satu baris; akun lain dikeluarkan dan tokennya dicabut. Ini hanya kenyamanan: data tetap dijaga RLS bila seseorang melewati langkah ini.
3. **Dashboard.** Angka total, per hari, dan per jalur dibaca dari dua view `security_invoker` (`waitlist_per_hari`, `waitlist_per_jalur`) dan sepuluh pendaftar terbaru dari tabel `waitlist` dengan email disamarkan. Ekspor CSV mengambil 1000 baris per permintaan (batas 20.000), memakai BOM UTF-8, dan memberi tanda petik pada sel berawalan `=`, `+`, `-`, `@` agar tidak terbaca sebagai rumus.
4. **Editor draf pelajaran.** Draf disimpan di tabel `pelajaran_draf` (isi `jsonb` maksimal 60 KB, `isi.id` harus sama dengan kuncinya). Aturan pemeriksaan editor sama dengan `cekIsi()` di validator. Draf **bukan** materi terbit.
5. **Video.** Bucket privat `video-materi` di Supabase Storage (maksimal 50 MB per berkas, hanya `video/mp4` dan `video/webm`), diputar lewat tautan bertanda tangan yang berlaku 5 menit. Belum tertaut ke pelajaran mana pun.

Cara draf menjadi materi terbit: unduh JSON dari editor, jalankan `node tools/impor-draf.mjs unduhan.json` (uji coba) lalu `--tulis`, tinjau oleh manusia, dan commit. Alat itu memeriksa id, kunci yang diizinkan, ukuran, menjalankan validator, dan mengembalikan semua berkas bila validasi gagal. Jadi **jalur terbit selalu lewat git**, bukan lewat database. Rincian: `docs/admin.md`.

### 5.5 Menulis pelajaran baru (penulis ke repo)

Alurnya berurutan dan sepenuhnya di repo: riset rujukan dan catat di `docs/loop/RUJUKAN.md` → tulis `content/pelajaran/<id>.json` → ubah `isi` di `content/kursus.json` menjadi `draf` → `node tools/validasi-kursus.mjs` → `node tools/cek-materi.mjs content/pelajaran/<id>.json` (heuristik gaya dan klaim yang belum dikonfirmasi; hanya membaca) → uji tampilan di `belajar/pelajaran.html` → `node tools/uji-keamanan.mjs` → commit di `dev`. Panduan lengkap: `docs/panduan-penulis.md`.

### 5.6 Dari commit ke deploy dan header keamanan

1. Kerja dilakukan di branch `dev`. `main` tayang di GitHub Pages dan sengaja tidak disentuh run otomatis.
2. Vercel (proyek `neruvia`) membuat pratinjau dari `dev`. Repo tidak punya `package.json` atau konfigurasi build, jadi berkas disajikan apa adanya. `vercel.json` memuat dua aturan pengalihan (`/admin` dan `/belajar` ke versi berakhiran garis miring) dan satu aturan header umum `/(.*)` ditambah aturan CSP per rute (11 rute untuk 6 halaman HTML, sehingga 12 aturan header).
3. Situs statis tidak punya server untuk membuat nonce, jadi blok `<script>`, `<style>`, dan atribut `style=""` yang inline diizinkan lewat hash SHA-256 isinya. Karena itu **setiap perubahan blok inline mengubah hash** dan `vercel.json` harus dibuat ulang dengan `node tools/buat-vercel-json.mjs`, lalu diperiksa dengan `--cek` dan `node tools/uji-header-csp.mjs`. Bila ini terlewat, halaman tampak normal di lokal tetapi diblokir CSP di Vercel.
4. Host Supabase dibaca generator dari `config.js` dan dimasukkan ke `connect-src` hanya pada halaman yang memuat `config.js` (landing dan admin). Halaman lain memakai `connect-src 'self'`.
5. GitHub Pages tidak bisa menyetel header respons, jadi `vercel.json` tidak berpengaruh di sana (rencana meta CSP ada di kegiatan D1; `404.html` sudah punya meta CSP sendiri sejak H2).

## 6. Peran Supabase

Satu project: `neruvia-dev` (wilayah ap-southeast-1, paket gratis). Menurut `docs/admin.md` dan `docs/loop/PERLU-KEPUTUSAN.md`, objek berikut sudah diterapkan; **run ini tidak memeriksa Supabase secara langsung** (konektor Supabase dilarang di run terjadwal), jadi tabel di bawah menggambarkan SQL di repo dan catatan penerapannya.

| Objek | Berkas SQL | Diterapkan? | Siapa yang boleh apa |
|---|---|---|---|
| Tabel `public.waitlist` (+ RLS) | `supabase/waitlist.sql`, diperketat oleh `supabase/draf/waitlist-s2-perketat.sql` bagian A sampai C | Ya (21 Nov; S2 bagian A–C 22 Nov). Bagian D (fungsi `join_waitlist`) belum | `anon`: hanya `INSERT` (per kolom setelah S2). `authenticated` admin: `SELECT`. Tidak ada `UPDATE`/`DELETE` untuk siapa pun lewat API |
| Schema `private`, fungsi `private.is_admin()`, tabel `public.admins` | `supabase/admin/001-admin.sql` | Ya (22 Nov) | `admins` hanya terbaca oleh baris miliknya sendiri; fungsi tidak terjangkau `anon`. Admin ditambah hanya lewat SQL |
| View `waitlist_per_hari`, `waitlist_per_jalur` | `supabase/admin/002-dashboard.sql` | Ya (22 Nov) | Hanya `authenticated`, `security_invoker`, jadi RLS tabel tetap berlaku |
| Tabel `pelajaran_draf`, trigger `pelajaran_draf_cap`, bucket `video-materi` | `supabase/admin/003-draf-video.sql` | Ya (22 Nov) | Semua kebijakan mensyaratkan `private.is_admin()` |
| Trigger `tolak_pendaftaran` pada `auth.users` | `supabase/admin/004-tutup-pendaftaran.sql` | Ya (22 Nov) | Menolak setiap pembuatan akun baru selama beta |
| Tabel `profil`, `komentar`, laporan, catatan moderasi | `supabase/draf/komentar.sql` | **Belum** (draf) | Rancangan di `docs/security/auth-komentar.md` |

Peran yang dipakai: `anon` (pengunjung, kunci publishable), `authenticated` (akun masuk; saat ini hanya admin yang ada), dan service role (hanya pengelola lewat dashboard, tidak pernah ada di repo). Kunci publishable di `config.js` memang publik; yang melindungi data adalah RLS, bukan kerahasiaan kunci. Gerbang `tools/uji-keamanan.mjs` bagian A menegakkan bahwa `config.js` tidak berisi kunci rahasia.

Hal yang sengaja **tidak** dilakukan Supabase di tahap ini: menyimpan progres belajar, melayani isi pelajaran, atau menerima pembayaran.

## 7. Hosting dan branch

| Branch | Fungsi | Keadaan pada 24 Nov 2026 |
|---|---|---|
| `main` | Tayang di GitHub Pages | 75 berkas; hanya landing lama (tanpa `belajar/`, `admin/`, `content/`, `vercel.json`); tertinggal 220 commit dari `dev`. Jangan di-merge sebelum PERLU-KEPUTUSAN butir 1, 2, 6, dan 7 selesai |
| `dev` | Kerja harian dan sumber pratinjau Vercel | Seluruh isi yang dibahas dokumen ini |
| `pixel-art`, `video-pixel`, `ai-scratch` | Cabang sampingan (aset dan video, percobaan) | Bukan bagian situs; tidak disentuh loop |

Pratinjau Vercel untuk `dev` dilindungi login Vercel, jadi bukan alamat publik. Aturan `.vercelignore` mengecualikan tujuh aset berat yang tidak dirujuk halaman mana pun; apakah Vercel menghormatinya pada deploy lewat integrasi Git belum dipastikan (PERLU-KEPUTUSAN butir 14).

## 8. Alat dan cara menjalankannya

Alat gerbang adalah skrip Node tanpa `package.json` dan tanpa paket yang dipasang di repo (`node tools/<nama>.mjs`). Uji berbasis browser memakai Playwright yang harus ada di mesin penguji; bila tidak ada, bagian browser dilewati dan kode keluar menjadi 2. Dua pengecualian: `tools/snapshot.py` butuh Python, Playwright, dan Pillow, dan `tools/video/` punya kebutuhan sendiri (lihat `tools/video/README.md`).

Kode keluar seragam di alat gerbang: 0 lulus, 1 gagal, 2 lulus tetapi uji browser dilewati.

| Alat | Kapan dijalankan | Memeriksa |
|---|---|---|
| `tools/uji-semua.mjs` | Pintasan: `node tools/uji-semua.mjs` (inti, sekitar 3 detik), `--lengkap` (sekitar 15 detik), `--penuh` (uji keamanan dengan browser) | Menjalankan alat lain berurutan dan merangkum; tidak menulis berkas. Penjelasan: `docs/uji-semua.md` |
| `tools/validasi-kursus.mjs` | Setiap perubahan `content/` | Skema katalog dan isi pelajaran, id berantai, XP sesuai jenis, berkas isi ada atau tidak sesuai status |
| `tools/uji-keamanan.mjs` | Sebelum commit kode atau konten; `--cepat` untuk perubahan dokumen saja | Tujuh bagian: A rahasia (berkas dan riwayat git), B sink berbahaya, C header, D konten kursus, E uji unit, G kontrol negatif pemindai, F payload jahat di browser. Penjelasan: `docs/security/uji-keamanan.md` |
| `tools/cek-materi.mjs` | Setelah menulis pelajaran | Heuristik gaya dan klaim yang belum dikonfirmasi; hanya membaca. `docs/cek-materi.md` |
| `tools/buat-vercel-json.mjs` | Setiap blok inline berubah | Membuat atau (`--cek`) memverifikasi `vercel.json` |
| `tools/buat-seo.mjs`, `tools/uji-seo.mjs` | Halaman, `noindex`, atau meta di `<head>` berubah | Membuat atau (`--cek`) memverifikasi `robots.txt`, `sitemap.xml`, dan blok meta beralamat dari `tools/seo-situs.json`. Laporan: `docs/loop/LAPORAN-H1.md` |
| `tools/buat-og.mjs` | Kartu pratinjau tautan perlu disusun ulang | Merender kartu 1200x630 dari aset merek yang ada |
| `tools/uji-header-csp.mjs` | Bersama generator di atas | Header dan CSP di browser, termasuk `/admin/` dengan Supabase tiruan |
| `tools/uji-aset.mjs`, `tools/inventaris-aset.mjs` | Saat aset atau `<img>`, preload, `@font-face` berubah | Rujukan putus, ukuran, format, anggaran per halaman |
| `tools/uji-cls-pelajaran.mjs` | Saat `belajar/pelajaran.html` berubah | Kestabilan tata letak dan jalur isi rusak |
| `tools/uji-gerak.mjs` | Saat animasi atau transisi berubah | Perilaku "kurangi gerak" di tujuh halaman |
| `tools/uji-404.mjs` | Saat `404.html` atau jangkar `#waitlist-d` berubah | Halaman 404: rujukan, meta CSP, alamat tidak dipantulkan, peniruan Vercel dan GitHub Pages |
| `tools/uji-latihan-interaktif.mjs`, `tools/uji-lanjut-belajar.mjs`, `tools/uji-impor-progres.mjs` | Saat bagian terkait berubah | Latihan interaktif, tombol Lanjut, impor progres (data rusak dan payload jahat) |
| `tools/impor-draf.mjs` dan `tools/uji-impor-draf.mjs` | Memasukkan draf dari admin | Alat impor dan ujinya |
| `tools/ukur-muat.mjs`, `tools/uji-muat-neru.mjs`, `tools/ukur-cls-font.mjs` | Pengukuran kinerja | LCP, CLS, perilaku muat frame Neru. Angka di `docs/loop/PERFORMA.md` |
| `tools/snapshot.py` | Tangkapan landing 1440 px | Menulis ke `docs/snapshot/<tanggal>/` |
| `tools/video/` | Membuat video pixel Neru | Terpisah dari situs; rincian di `tools/video/README.md` |

Urutan yang disarankan sebelum commit: perubahan **dokumen saja** cukup `node tools/uji-keamanan.mjs --cepat` dan `node tools/validasi-kursus.mjs`; perubahan **konten atau kode** memakai `node tools/uji-keamanan.mjs` penuh (sekitar 45 detik), validator, dan alat khusus sesuai tabel di atas. Aturan resminya ada di bagian "Gerbang keamanan" `docs/loop/RUNBOOK.md`; dokumen ini tidak menggantikannya.

Cara membuka situs secara lokal: `python3 -m http.server` di akar repo, lalu buka `/`, `/belajar/`, dan `/admin/`. Membuka `index.html` langsung dari berkas juga jalan untuk landing, tetapi halaman belajar butuh server HTTP agar `fetch` JSON bekerja.

## 9. Batas kepercayaan dan inventaris data

| Data | Tempat | Siapa yang bisa membaca | Data pribadi? |
|---|---|---|---|
| Nama panggilan, email, level minat, persetujuan, waktu | `public.waitlist` di Supabase | Admin (lewat RLS); pengelola lewat dashboard | Ya (UU PDP 27/2022). Dasar: persetujuan |
| Token akses admin | `sessionStorage` browser admin | Hanya tab itu, sampai kedaluwarsa atau ditutup | Kredensial sementara |
| Daftar pelajaran selesai | `localStorage` browser pelajar | Hanya browser itu | Tidak dikirim ke server; tetap perlakukan sebagai data perilaku |
| Draf pelajaran dan video | `pelajaran_draf`, bucket `video-materi` | Admin | Tidak |
| Isi kursus | `content/*.json` di repo | Siapa pun yang membuka situs | Tidak |
| Kunci publishable | `config.js` di repo | Publik (disengaja) | Tidak; dibatasi RLS |
| Kunci rahasia (service role dan sejenisnya) | Tidak ada di repo | Pengelola saja | Tidak boleh pernah masuk repo; diuji gerbang A |

Batas yang dijaga kode: semua data dari JSON, form, impor, dan penyimpanan lokal berakhir di `textContent`. Batas yang dijaga server: RLS dan hak per kolom. Dua jaga ini saling menutup; tidak ada yang boleh mengandalkan salah satunya saja.

## 10. Keputusan arsitektur dan alasannya

| Keputusan | Alasan | Harga yang dibayar |
|---|---|---|
| Situs statis tanpa build | Tidak ada rantai alat yang perlu dirawat; pratinjau dan produksi sama; mudah diaudit | Tidak ada templating bersama; header, footer, dan sebagian CSS terulang di halaman |
| Isi pelajaran sebagai JSON di repo | Peninjauan lewat git, riwayat, dan pembatalan gratis; validator bisa menegakkan skema | Penulis non-teknis butuh editor admin dan alat impor; ganti isi berarti commit |
| Progres di `localStorage` | Tanpa akun, tanpa data pribadi tambahan, tanpa kebijakan privasi baru | Terikat satu browser; hilang bila data situs dihapus; bisa dipalsukan pemiliknya sendiri (tidak masalah selama tidak ada sertifikat atau hadiah) |
| XP, streak, badge dihitung ulang | Tidak ada status turunan yang bisa rusak atau tidak sinkron | Sedikit kerja di tiap muat (kecil: puluhan entri) |
| Admin tanpa pustaka luar | Tidak ada rantai pasok tambahan; CSP admin tanpa blok inline | Kode Auth dan REST ditulis sendiri, jadi uji dan peninjauan harus teliti (skenarionya diuji di `tools/uji-header-csp.mjs` dengan Supabase tiruan) |
| CSP dengan hash, bukan nonce | Situs statis tidak punya server per-permintaan | Hash harus dibuat ulang tiap blok inline berubah (diatur gerbang di RUNBOOK) |
| Terbit lewat git, bukan lewat database | Admin yang kebobolan tidak bisa mengubah isi yang dilihat pelajar | Alur terbit satu langkah lebih panjang |
| Pendaftaran akun ditutup selama beta | Tidak ada akun pihak luar sebelum perlindungan spam dan kebijakan privasi siap | Login dan komentar pelajar menunggu keputusan Master |

## 11. Batasan saat ini dan risiko yang diketahui

- **Belum dipastikan terhadap Supabase asli:** alur Auth admin dari browser Master dan pembacaan header `Content-Range` lintas origin (`docs/admin.md`, "Belum terverifikasi").
- **Enumerasi email lewat 409** (K1) selama fungsi `join_waitlist` belum diaktifkan.
- **Perlindungan spam server** (batas laju, Turnstile) menunggu keputusan dan akun milik Master.
- **Kebijakan privasi** masih memuat placeholder identitas pengendali data; form tidak boleh menerima data nyata dari publik sebelum itu selesai (PERLU-KEPUTUSAN butir 2).
- **Klaim landing yang belum dikonfirmasi** (Level 1 gratis, dukungan chatbot tertentu, praktik dengan versi gratis, sertifikat, harga) menghalangi merge ke `main`.
- **Satu project Supabase untuk dev.** Produksi belum ada; pindah project berarti mengganti `config.js`, membuat ulang `vercel.json`, dan menerapkan `004` sebelum menerima lalu lintas.
- **Tidak ada pemantauan galat atau analitik** di situs. Tidak ada cara mengetahui pelajaran mana yang macet kecuali ditanyakan langsung.

### Ketidakcocokan dokumen yang ditemukan saat menulis ini

| Temuan | Tindakan |
|---|---|
| `README.md` menyebut kolom payload `ts`, padahal kode dan tabel memakai `client_ts` | Diperbaiki di README pada commit yang sama |
| `docs/waitlist-backend.md` baris "Status: draf. Proyek Supabase belum dibuat dan SQL belum diterapkan" bertentangan dengan bagian "Status sambungan (21 Nov 2026)" di berkas yang sama | Baris status diperbarui pada commit yang sama |
| Komentar kepala `supabase/waitlist.sql` masih menulis "STATUS: DRAF. Belum diterapkan ke proyek mana pun" padahal tabelnya sudah diterapkan ke `neruvia-dev` | Tidak diubah (run terjadwal tidak boleh menyentuh `supabase/`); dicatat untuk dibersihkan oleh Claude interaktif atau Master |

## 12. Cara dokumen ini diperiksa

Setiap jalur berkas dalam tanda kutip balik, setiap perintah `node tools/...`, setiap opsi yang disebut, setiap jumlah berkas, dan setiap nama kunci penyimpanan, tabel, view, trigger, dan kunci header diperiksa dengan skrip sekali pakai terhadap isi repo pada commit yang sama dengan dokumen ini. Hasil dan jumlah pemeriksaan dicatat di kolom hasil `docs/loop/PROGRESS.md` untuk kegiatan L4. Bila struktur repo berubah (berkas atau folder baru, alat baru, objek Supabase baru, alur baru), perbarui bagian 3, 6, atau 8 di sini dan catat di commit yang sama.
