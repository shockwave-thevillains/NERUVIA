# Audit keamanan dan model ancaman (S1)

Tanggal: Min 22 Nov 2026, cabang `dev` (commit dasar 20354f2). Acuan: OWASP ASVS (validasi input, encoding output, sesi, pencatatan) dan OWASP Top 10, dengan kerangka STRIDE. Audit ini hanya membaca dan menguji kode lokal; tidak ada kode situs, SQL, atau pengaturan layanan yang diubah.

## Cakupan dan batas

Diperiksa: `index.html` (form waitlist), `config.js`, `supabase/waitlist.sql`, `docs/waitlist-backend.md`, `belajar/progress.js`, `belajar/index.html` (impor/ekspor progres), `belajar/pelajaran.html` (penampil isi), `content/*.json`, `terima-kasih.html`, `kebijakan-privasi.html`, `tools/`, riwayat git.

Tidak diperiksa di run ini: pengaturan nyata proyek Supabase `neruvia-dev` (Auth, rate limit, log, advisor) dan konfigurasi proyek Vercel, karena konektornya dilarang untuk run otomatis dan sandbox tidak bisa menjangkau host Supabase. Hal yang bergantung pada pengaturan itu ditandai "perlu dicek Master" dan dimasukkan ke PERLU-KEPUTUSAN butir 8.

## Aset dan batas kepercayaan

| Aset | Letak | Siapa yang bisa menyentuh |
|---|---|---|
| Data waitlist (nama panggilan, email, level minat, bukti persetujuan) | Tabel `public.waitlist` di Supabase | Anon: hanya INSERT lewat REST. Pengelola: lewat dashboard. |
| Endpoint dan kunci publishable | `config.js` (branch `dev` saja; tidak ada di `main`) | Siapa pun yang bisa membaca repo atau memuat halaman dev |
| Progres belajar | `localStorage` kunci `neruvia.progress.v1`, tidak dikirim ke server | Skrip di origin yang sama, dan pengguna sendiri |
| Isi kursus | `content/kursus.json`, `content/pelajaran/*.json`, dibaca lewat `fetch` same-origin | Pengelola lewat commit |
| Halaman statis | GitHub Pages (`main`), Vercel preview (`dev`, dilindungi login Vercel) | Publik (Pages), pemegang akun Vercel (preview) |
| Login dan komentar | Belum ada | Dirancang di S4 |

Batas kepercayaan: browser pengunjung tidak dipercaya (apa pun yang dikirim bisa dipalsukan); Supabase REST dipercaya hanya sejauh RLS dan constraint di SQL; berkas di repo dipercaya karena lewat commit pengelola.

## Yang sudah baik (dibuktikan di run ini)

1. Tidak ada `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `srcdoc`, atau atribut `on*=` di seluruh halaman dan skrip. Semua isi dinamis lewat `textContent` dan `createElement` (pencarian `grep` pada 5 halaman dan `progress.js`).
2. `pelajaran.html?id=` dicocokkan ke daftar id di `kursus.json` sebelum dipakai; nama berkas isi dibentuk dari id tepercaya itu dengan `encodeURIComponent`. Tidak ada URL dari JSON yang masuk ke `href`, `src`, atau `location`.
3. Impor progres: batas 100 KB, format dan versi ketat, maksimal 500 kunci, hanya id yang dikenal, nilai harus string tanggal. Diuji (tabel di bawah): kunci `__proto__` dan `constructor` ditolak oleh daftar putih id, tidak ada polusi prototipe.
4. Tidak ada permintaan ke pihak ketiga. Font dan Lenis 1.3.27 disajikan dari origin sendiri (lisensi ada di `assets/vendor/LENIS-LICENSE.txt`). Satu-satunya tujuan lintas origin adalah endpoint Supabase waitlist.
5. SQL: RLS aktif, anon hanya boleh INSERT, tidak ada kebijakan select/update/delete; email unik tanpa beda huruf; CHECK untuk format email, panjang nama, jalur yang diizinkan, persetujuan `true`, panjang bukti persetujuan. Permintaan memakai `Prefer: return=minimal`, jadi tidak ada data balasan.
6. Tidak ada rahasia: pencarian pola `service_role`, `sb_secret`, JWT, kunci pribadi, kunci cloud di pohon kerja dan riwayat git hanya menemukan komentar peringatan di `config.js`. Berkas itu hanya berisi kunci publishable. `main` tidak memuat `config.js`.
7. Form: validasi per kolom, anti kirim ganda, honeypot, penjaga waktu, batas waktu 12 detik, status 409 diperlakukan sebagai sukses di sisi klien.
8. Progres tidak meninggalkan browser; ekspor berupa berkas yang diunduh pengguna sendiri.

## Model ancaman (STRIDE)

| Aset | S Spoofing | T Tampering | R Repudiation | I Info disclosure | D Denial of service | E Elevation |
|---|---|---|---|---|---|---|
| Form dan REST waitlist | Daftarkan email orang lain (K4) | Isi kolom sistem `id`, `created_at`, `client_ts` (K6); bukti persetujuan dari klien (K4) | Tidak ada log penyalahgunaan di sisi kita (K3) | Enumerasi email lewat 409 (K1) | Banjir insert, kuota gratis habis (K3) | Signup Auth bawaan terbuka bila belum dimatikan (K2) |
| Impor progres | Tidak relevan (lokal) | Tanggal palsu memengaruhi streak dan badge milik sendiri (K8) | Tidak relevan | Tidak ada | Berkas besar dibatasi 100 KB | Tidak ada jalur ke skrip (lolos uji) |
| Penampil isi pelajaran | Tidak relevan | JSON isi memuat HTML atau URL di masa depan (K11) | Tidak relevan | Tidak ada | `fetch` gagal ditangani pesan galat | Tidak ada jalur ke skrip (lolos uji) |
| `localStorage` | Tidak relevan | Skrip lain di origin sama, atau origin `github.io` bersama (K9) | Tidak relevan | Hanya id pelajaran dan tanggal | Tidak ada | Tidak ada |
| Kunci publik dan `config.js` | Tidak relevan | Tidak ada | Tidak ada | Disengaja publik; dilindungi RLS (K10) | Spam ke tabel dev (K3) | Tidak ada kunci rahasia (lolos) |
| Header dan hosting | Tidak ada | Tidak ada | Tidak ada | Tidak ada | Tidak ada | Clickjacking, tanpa CSP (K5) |
| Login dan komentar | Belum ada | Belum ada | Belum ada | Belum ada | Belum ada | Dirancang di S4 |

## Temuan berperingkat

Peringkat: T = tinggi, S = sedang, R = rendah. "Penangan" menunjuk kegiatan antrean atau Master. Cara uji yang memerlukan jaringan ke Supabase harus dijalankan Master dari komputernya; hapus baris uji sesudahnya.

| ID | Peringkat | Temuan | Penangan |
|---|---|---|---|
| K1 | T | Email yang sudah terdaftar bisa ditebak lewat API langsung | S2 (draf SQL), Master menerapkan |
| K2 | S | Pendaftaran akun Auth bawaan Supabase mungkin masih terbuka | Master (perlu dicek) |
| K3 | S | Anti-spam hanya di klien; tidak ada batas laju atau CAPTCHA di server | Master memilih; S4 merancang |
| K4 | S | Pendaftaran satu langkah: email orang lain bisa didaftarkan, bukti persetujuan dikirim klien | Master memutuskan |
| K5 | S | Tidak ada header keamanan; GitHub Pages tidak bisa menyetel header; CSP terhalang skrip dan gaya inline | S3, D1, Master |
| K6 | R | Hak INSERT seluruh kolom, termasuk kolom sistem | S2 (draf SQL) |
| K7 | R | Nama tanpa batas karakter: rumus spreadsheet dan karakter Unicode pengecoh | S2, catatan operasional |
| K8 | R | Impor progres menerima tanggal non-ISO, masa depan, dan tahun diperluas | S2 |
| K9 | R | `localStorage` dianggap tepercaya; origin `github.io` bersama bila tanpa domain sendiri | S2 |
| K10 | R | Kunci publishable dan endpoint dev ada di repo | Dicatat; tinjau sebelum merge ke `main` |
| K11 | R | Isi pelajaran di masa depan bisa memuat HTML atau tautan berbahaya | S5 (validator isi) |

### K1 · Enumerasi email lewat 409 (T)

Klien sengaja menampilkan "berhasil" untuk status 409, supaya orang tidak bisa menebak siapa yang sudah mendaftar. Namun yang melihat jawaban adalah klien. Siapa pun yang memanggil REST langsung dengan kunci publik akan menerima 201 untuk email baru dan 409 (pelanggaran unik) untuk email yang sudah ada, sehingga daftar pendaftar bisa diuji satu per satu. Jawaban yang sama harus datang dari server.

Cara uji (Master, dari terminal): kirim POST yang sama dua kali ke endpoint di `config.js` dengan email uji milik sendiri; sekarang hasilnya 201 lalu 409. Setelah diperbaiki, keduanya harus berstatus sama dan berisi badan sama.

Arah perbaikan (draf di S2, penerapan Master): sisipkan lewat fungsi SQL `security definer` atau Edge Function yang memakai `insert ... on conflict do nothing` dan selalu membalas status yang sama. Berkas `supabase/waitlist.sql` boleh dibuatkan draf; penerapannya ke `neruvia-dev` tidak dikerjakan run otomatis.

### K2 · Signup Auth bawaan Supabase (S, perlu dicek)

Proyek Supabase baru biasanya mengizinkan pendaftaran akun lewat `/auth/v1/signup` dengan kunci publik, walau situs belum punya halaman login. Bila masih aktif, orang luar bisa membuat akun di `neruvia-dev`, dan email konfirmasi dikirim atas nama proyek.

Cara uji (Master): kirim `POST https://<ref>.supabase.co/auth/v1/signup` dengan header `apikey` dan badan `{"email":"...","password":"..."}`. Yang diharapkan sampai S4 diterapkan: ditolak (signup nonaktif). Pengaturannya ada di dashboard Supabase bagian Authentication; run otomatis tidak boleh mengubahnya.

### K3 · Anti-spam hanya di klien (S)

Honeypot dan penjaga waktu 1,2 detik hanya ada di JavaScript halaman. Skrip yang memanggil REST langsung tidak melewatinya. Kunci publik ada di `config.js`; bila repo publik, siapa pun bisa membacanya, walau pratinjau Vercel dilindungi login. Akibatnya: daftar tercemar baris palsu dan kuota gratis habis, yang mematikan pendaftaran sungguhan. Tidak ada pencatatan di sisi kita untuk mendeteksinya.

Cara uji: kirim 50 POST berurutan dengan email berbeda dan hitung yang diterima (sekarang semuanya). Perbaikan yang masuk akal: batas laju di Supabase, CAPTCHA (misalnya Cloudflare Turnstile) lewat Edge Function, dan pemeriksaan jumlah baris berkala. Pilihan alat ada di tangan Master (PERLU-KEPUTUSAN 8).

### K4 · Persetujuan tanpa verifikasi email (S)

Pendaftaran satu langkah memungkinkan orang mendaftarkan alamat email orang lain; pemilik email tidak pernah mengonfirmasi. Teks bukti persetujuan (`consent_text`) dikirim klien dan server hanya memeriksa panjangnya (10–400 karakter), jadi isinya bisa apa saja. Ini melemahkan nilai bukti persetujuan dan membuka penyalahgunaan sebagai pengirim spam tidak langsung. Apakah perlu konfirmasi dua langkah (double opt-in) adalah keputusan Master dan perlu dikonfirmasi ke advokat; konfirmasi email butuh layanan pengirim email, yang belum dipilih.

### K5 · Header keamanan dan CSP (S)

Belum ada `vercel.json`, meta CSP, atau header apa pun. Dua fakta yang membentuk S3:

1. `main` tayang di GitHub Pages, yang tidak bisa menyetel header respons. `vercel.json` hanya melindungi preview Vercel. Untuk Pages, yang bisa dipasang hanya `<meta http-equiv="Content-Security-Policy">` (tanpa `frame-ancestors`, tanpa `X-Content-Type-Options`, tanpa HSTS buatan sendiri). Jadi halaman produksi tetap bisa dibingkai (clickjacking pada form). Pilihan hosting produksi masuk PERLU-KEPUTUSAN 8.
2. CSP tanpa `unsafe-inline` terhalang kode inline: `index.html` punya 2 blok `<script>`, 1 blok `<style>`, dan 18 atribut `style=""`; `belajar/index.html`, `belajar/pelajaran.html`, dan `terima-kasih.html` masing-masing punya 1 `<script>` dan 1 `<style>`; `kebijakan-privasi.html` punya 1 `<style>` dan 1 atribut `style`. Pengaturan gaya lewat CSSOM (`el.style.width=...`, `style.cssText`) tidak diblokir CSP, jadi tidak perlu diubah. Jalur terbaik: pindahkan skrip dan gaya inline ke berkas `.js` dan `.css` same-origin, ganti atribut `style=""` dengan kelas, lalu pakai `script-src 'self'` dan `style-src 'self'`. Alternatifnya hash SHA-256 per blok, tetapi hash harus dihitung ulang tiap pengeditan.

Daftar sumber yang harus diizinkan CSP: `default-src 'none'`; `script-src 'self'`; `style-src 'self'`; `img-src 'self'`; `font-src 'self'`; `connect-src 'self' https://buxnhdafaafhrlviaotw.supabase.co`; `form-action 'self'`; `base-uri 'none'`. Berkas `belajar/index.html` membuat `blob:` URL untuk ekspor lewat `<a download>`; navigasi unduhan tidak diatur `connect-src`, jadi tidak perlu `blob:` di sini, tetapi ujilah.

Cara uji: setelah S3, muat 5 halaman dengan Playwright, tangkap pesan "Refused to ..." di konsol, dan pastikan form, galeri, dan pelajaran tetap berfungsi; periksa header lewat `curl -I` pada URL Vercel.

### K6 · Hak INSERT seluruh kolom (R)

`grant insert on public.waitlist to anon` memberi hak pada semua kolom. Anon bisa mengirim nilai `id`, `created_at`, dan `client_ts` sendiri. `created_at` yang dipalsukan bisa mengacaukan urutan antrean bila kelak urutan dipakai (misalnya akses awal). Perbaikan: hak per kolom, `grant insert (name, email, jalur, consent, consent_text, client_ts) on public.waitlist to anon;`, dan `created_at` tetap dari `default now()`. Draf di S2; penerapan oleh Master.

### K7 · Nama bebas karakter (R)

Nama hanya dibatasi 60 karakter, tanpa batas jenis karakter, baik di klien maupun di SQL. Dua risiko untuk orang yang mengolah data: (a) nama berawalan `=`, `+`, `-`, atau `@` menjadi rumus saat daftar diekspor ke spreadsheet (CSV/formula injection); (b) karakter kontrol dan pengecoh bidi (misalnya U+202E) atau lebar nol membuat nama tampak lain di dashboard atau email. Tidak ada risiko XSS di situs, karena situs tidak pernah menampilkan data waitlist. Perbaikan di S2: normalisasi Unicode (NFKC), buang karakter kontrol dan pengecoh, batas jenis karakter yang sama di klien dan CHECK di SQL, serta aturan operasional: ekspor selalu menambahkan tanda petik di depan sel berawalan karakter rumus.

### K8 · Tanggal pada impor progres (R)

Diuji dengan harness Node di sandbox (tabel bawah). `importData` memakai `new Date(v)` tanpa memeriksa format, sehingga teks seperti `"1"` atau `"March 7"` diterima dan dinormalisasi ke tahun 2001 (perilaku bergantung mesin JavaScript), `9999-12-31` dan tahun diperluas `+275760-09-13T00:00:00.000Z` diterima, dan tahun `0001` diterima. Perbandingan `iso < o.done[id]` memakai urutan teks sehingga tanggal berformat tahun diperluas membandingkan secara tidak benar. Dampaknya hanya pada progres, streak, dan badge milik pengguna yang mengimpor; tidak ada dampak ke orang lain atau ke server. Perbaikan di S2: terima hanya `YYYY-MM-DDTHH:mm:ss(.sss)Z` melalui ekspresi reguler, tolak tanggal setelah waktu sekarang ditambah toleransi sehari dan sebelum 1 Jan 2026.

### K9 · Kepercayaan pada `localStorage` (R)

`read()` memastikan `done` berupa objek, tetapi tidak memeriksa nilai di dalamnya: nilai objek `{"x":1}` untuk sebuah id dihitung "selesai" (diuji: `summary` menghitung 1 selesai), meski tidak ada galat. Skrip lain di origin yang sama bisa menulis kunci ini. Bila situs berjalan di `https://<akun>.github.io/<repo>/` tanpa domain sendiri, origin-nya dipakai bersama semua proyek Pages akun itu. Dampaknya terbatas pada progres belajar (tidak ada data pribadi), jadi rendah. Perbaikan di S2: `read()` membuang entri yang nilainya bukan string tanggal valid. Domain sendiri dibahas di PRD (pertanyaan terbuka butir 4).

### K10 · Kunci publishable di repo (R, dicatat)

`config.js` di `dev` memuat endpoint dan kunci publishable proyek `neruvia-dev`. Ini sah menurut desain Supabase karena kunci itu dibatasi RLS, tetapi berarti siapa pun yang bisa membaca repo bisa memanggil REST, yang memperkuat K1 dan K3. Riwayat git hanya memuat kunci itu (commit 67c942a). `main` tidak memuatnya. Sebelum merge, tinjau seperti yang sudah tercatat di PERLU-KEPUTUSAN 6. Jangan pernah menaruh kunci `service_role` di repo.

### K11 · Isi pelajaran masa depan (R)

Penampil hari ini aman karena semua teks masuk lewat `textContent`. Risikonya muncul bila nanti ada yang menambah fitur "tautan" atau "format tebal" yang memakai `innerHTML` atau mengisi `href` dari JSON. Perlindungan: validator isi (S5) menolak karakter `<`, `>` dan pola `javascript:`, `data:`, `http(s)://` di semua kolom teks `content/pelajaran/*.json` kecuali ada daftar putih domain yang disetujui; dan gerbang S5 tetap melarang `innerHTML`.

## Bukti uji impor progres (run ini)

Harness Node memuat `belajar/progress.js` dengan `localStorage` tiruan dan memanggil `NVProgress.importData` dengan daftar id `l1-m1-p1`, `l1-m1-p2`:

| Masukan | Hasil |
|---|---|
| Berkas normal | diterima, tersimpan apa adanya |
| Kunci `__proto__` dan `constructor` | dilewati (skipped 2), `Object.prototype` tidak tercemar |
| Tanggal `"1"` | diterima, jadi `2001-01-01T00:00:00.000Z` (K8) |
| Tanggal `"March 7"` | diterima, jadi `2001-03-07...` (K8) |
| Tanggal `9999-12-31` | diterima (K8) |
| Tahun diperluas `+275760-09-13T00:00:00.000Z` | diterima (K8) |
| Tanggal `0001-01-01` | diterima (K8) |
| Nilai objek atau angka | dilewati |
| `versi` berupa teks `"1"` | ditolak "Format berkas tidak dikenali." |
| Tanggal masa depan 2030 | diterima; streak terbaik 2 (K8) |
| `localStorage` berisi objek sebagai nilai | tanpa galat; dihitung selesai (K9) |

## Rencana uji otomatis untuk S5

`tools/uji-keamanan.mjs` sebaiknya memuat, tanpa jaringan: (1) pemindai pola `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `on*=` di semua `.html` dan `.js` situs; (2) pemindai rahasia (`service_role`, `sb_secret`, JWT, kunci pribadi) di pohon kerja; (3) harness impor seperti di atas dengan payload `__proto__`, `constructor`, tanggal non-ISO, tanggal ekstrem, berkas besar; (4) pemeriksaan `vercel.json` dan meta CSP memuat direktif wajib setelah S3; (5) pemeriksaan kesesuaian batas klien dan SQL (panjang nama 60, regex email, daftar jalur); (6) pemeriksaan isi pelajaran terhadap pola K11. Uji yang perlu jaringan ke Supabase (K1, K2, K3) tetap manual oleh Master.

## Peta ke antrean

| Kegiatan | Temuan yang ditangani |
|---|---|
| S2 Validasi input dan encoding output | K6 (draf SQL), K7, K8, K9; K1 dalam bentuk draf SQL |
| S3 Header keamanan dan CSP | K5 |
| S4 Rancangan aman login dan komentar | K2, K3, K4 (sebagai pertimbangan rancangan, bukan penerapan) |
| S5 Skrip uji otomatis | K11 dan seluruh pemindai di atas |
| Master | K1 (terapkan), K2 (cek), K3 dan K4 (putuskan), pilihan hosting produksi |

## Tindak lanjut S2 (Min 22 Nov 2026): validasi input dan encoding output

| Temuan | Status setelah S2 | Bukti |
|---|---|---|
| K1 Enumerasi email lewat 409 | Draf SQL ada (fungsi `join_waitlist`, bagian D di `supabase/draf/waitlist-s2-perketat.sql`), diuji di Postgres lokal: email baru dan lama sama-sama sukses tanpa galat. Belum aktif: klien masih POST langsung dan Master yang menerapkan SQL dan mengalihkan endpoint. | uji SQL lokal |
| K6 Hak insert semua kolom | Draf SQL: `grant insert (name, email, jalur, consent, consent_text, client_ts)`. Diuji: insert dengan `id` atau `created_at` ditolak "permission denied". Belum diterapkan. | uji SQL lokal |
| K7 Karakter nama dan email | Selesai di klien (normalisasi NFKC, buang karakter kontrol/lebar nol/bidi, daftar putih karakter, awalan rumus ditolak). Draf SQL menyamakan di server. Aturan operasional ekspor (awali sel dengan tanda petik) tetap perlu dicatat di `docs/waitlist-backend.md`. | uji Playwright 32 nama dan 27 email, uji banding dengan SQL |
| K8 Tanggal impor progres | Selesai: hanya `YYYY-MM-DDTHH:mm:ss(.sss)Z`, tanggal harus nyata (31 Feb ditolak), tidak sebelum 1 Jan 2026, tidak lebih dari sehari ke depan; perbandingan waktu pakai angka, bukan teks. | `tools/uji-impor-progres.mjs`, 57 pemeriksaan lulus |
| K9 Kepercayaan pada localStorage | Selesai: `read()` hanya menyalin entri dengan id sah dan tanggal sah ke objek tanpa prototipe; nilai objek dan id `constructor`/`prototype`/`__proto__` dibuang; `mark()` menolak id aneh dan jam perangkat sebelum 2026. | idem |

Encoding output: pencarian ulang `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `srcdoc`, dan atribut `on*=` di seluruh `index.html`, `belajar/`, `terima-kasih.html`, `kebijakan-privasi.html`, `config.js`: tidak ada. Satu-satunya kemunculan ada di `tools/video/video-px*.html` (alat pembuat video offline, isinya teks tetap dari berkas itu sendiri, tidak memuat data pengguna dan tidak ditautkan dari situs). Pemindai di S5 perlu mengecualikan `tools/video/` atau menandainya khusus, dan folder itu sebaiknya tidak ikut diterbitkan ke produksi.

Catatan ketat: pesan galat form tetap lewat `textContent`; pesan impor progres sekarang menyebut "id atau tanggalnya tidak valid". Aturan klien dan server sengaja identik; bila salah satu diubah, ubah yang lain.

Sisa pekerjaan S2 yang bukan kode: Master menerapkan draf SQL (PERLU-KEPUTUSAN butir 9). Kolom `name` yang sudah berisi baris uji lama ditangani oleh `NOT VALID` pada constraint baru; setelah baris lama dirapikan, jalankan bagian E di berkas SQL.

