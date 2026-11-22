# Backlog loop NERUVIA

Keputusan yang berlaku: fase 1 tetap statis (HTML + Supabase JS), fitur daftar berupa waitlist dulu, pilot sudah lolos. Master melimpahkan pekerjaan ke Claude selama seminggu (21–28 Nov 2026), termasuk di jam Master memakai Claude.

Satu run mengerjakan SATU kegiatan, dan lima run berselang 50 menit mengisi satu jendela batas 5 jam (lihat antrean di PROGRESS.md). Satu kegiatan menghasilkan satu commit. Paket dikerjakan berurutan: A, S, B, C, E, F, G, I, J, K, L, H, D (paket I–L ditambahkan Master 22 Nov untuk memakai sisa batas pemakaian). Paket S (keamanan) wajib selesai sebelum pelajaran baru mana pun dibuat, termasuk pelajaran 2 dan 3 di Paket B. Semua materi pelajaran berupa teks saja, tanpa video, mengikuti `docs/loop/MATERI.md`. Tiap draf pelajaran berupa berkas `content/pelajaran/<id>.json`, lalu `isi` di `kursus.json` diubah menjadi `draf` dan `node tools/validasi-kursus.mjs` harus lulus.

Sudah selesai (jangan dikerjakan ulang): form waitlist, halaman terima kasih, SQL dan dokumen backend, `kursus.json` dan validator, galeri `belajar/`, halaman pelajaran dengan penampil isi dan soal cek pemahaman, XP/streak/badge, ekspor/impor progres, draf pelajaran 1.

Catatan beta (22 Nov): pendaftaran akun Auth ditutup, jadi kegiatan login, komentar, dan akun pengguna hanya berupa rancangan atau kode di balik flag nonaktif. Pembukaan kembali menunggu keputusan Master (`docs/admin.md`).

Standar kedalaman kegiatan (22 Nov, permintaan Master): setiap kegiatan wajib sedalam bagian "Standar kedalaman" di RUNBOOK.md. Uraian kegiatan di bawah adalah cakupan minimum, bukan batas atas.

## Paket A
1. Audit desktop dan mobile terhadap `docs/konteks/PRD.md` (bagian Desain). Tulis `docs/loop/AUDIT.md` berisi temuan berperingkat.
2. Perbaiki celah teratas dari audit.
3. Perbaiki navigasi mobile dan ukuran area ketuk (minimal 44 px).
4. Hapus semua warna pastel (`--sky`, `--violet`, `--mint`, `--amber`, `--coral` di `index.html`, `belajar/index.html`, `belajar/pelajaran.html`). Ganti badge, level, dan progres dengan hitam, putih, abu, dan cyan. Hijau dan merah hanya untuk benar/salah dan status. Lalu perbaiki kontras warna yang gagal (target WCAG AA).
5. Aksesibilitas carousel level dan tab: aria, keyboard, fokus terlihat.

## Paket S (Keamanan, wajib sebelum pelajaran baru)
Dasar: OWASP ASVS (input validation, output encoding, session, logging) dan OWASP Top 10. Halaman login dan komentar belum ada, jadi dirancang aman dulu sebagai draf di balik flag, tanpa Supabase Auth nyata dan tanpa memasang ke produksi.
1. Audit keamanan. Tulis `docs/loop/AUDIT-KEAMANAN.md`: model ancaman ringkas (STRIDE) untuk form waitlist, impor progres (`importData`), penampil isi pelajaran, localStorage, kunci publik Supabase, dan header. Setiap temuan diberi peringkat dan cara menguji.
2. Validasi input dan encoding output. Perketat form waitlist (panjang, karakter, normalisasi Unicode, trim) dan `NVProgress.importData` (batas ukuran berkas, skema ketat, whitelist id pelajaran, format tanggal ISO, tolak kunci `__proto__`/`constructor`/`prototype`). Pastikan tidak ada `innerHTML` dengan data tak tepercaya di seluruh situs. Server selalu jadi sumber kebenaran: constraint di SQL tidak boleh lebih longgar dari validasi klien.
3. Header keamanan dan CSP. Buat `vercel.json` berisi CSP (tanpa `unsafe-inline` bila bisa, dengan nonce atau hash), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`, dan HSTS. Pastikan CSP mengizinkan hanya host Supabase proyek ini. Uji bahwa situs tetap berfungsi.
4. Rancangan aman login dan komentar. Tulis `docs/security/auth-komentar.md` dan SQL draf `supabase/draf/komentar.sql` (jangan diterapkan): validasi panjang dan karakter, output hanya lewat `textContent`, rate limit, honeypot dan opsi CAPTCHA, anti-enumerasi akun, kebijakan kata sandi lewat Supabase Auth, RLS per pengguna (insert dan select milik sendiri, moderasi terpisah), laporan penyalahgunaan, serta pencatatan tanpa data pribadi. Kerangka halaman hanya di balik flag nonaktif.
5. Uji keamanan otomatis. Buat `tools/uji-keamanan.mjs`: kirim payload XSS, HTML, SQL, Unicode aneh, dan string sangat panjang ke form dan impor; cek header; cari rahasia di repo; cari pola `innerHTML`/`eval`. Tambahkan langkah ini sebagai gerbang di RUNBOOK sebelum setiap commit konten, lalu catat hasilnya di PROGRESS.

## Paket B
1. Performa: lazy-load frame Neru dan atur prioritas muat.
2. Performa berat (B2), kerjakan semua butir berikut dalam satu run:
   a. Inventaris: daftar seluruh berkas di `assets/` dan `config`/halaman yang memuatnya (ukuran, format, dipakai oleh halaman mana, dimuat kapan). Simpan sebagai tabel di `docs/loop/PERFORMA.md`. Temuan awal: `neru-menoleh-web.webp` 5,5 MB, `neru-menoleh-sumber.mp4` 3,1 MB, tiga PNG maskot di `assets/brand/maskot/` masing-masing 1,3-1,4 MB, tidak ada rujukan di HTML/JS/CSS; buktikan dengan pencarian, lalu pindahkan ke luar deploy (`.vercelignore`) atau catat alasan menyimpannya.
   b. Font: periksa lima berkas woff2, tentukan font yang benar-benar dipakai per halaman, pasang `preload` hanya untuk font kritis (dengan `crossorigin`), `font-display: swap`, dan `size-adjust`/fallback metrik agar tidak bergeser. Uji dengan jaringan lambat (throttling) dan catat pergeseran tata letak.
   c. Gambar: buat varian responsif (`srcset` + `sizes`) untuk `neru.webp`, `neru-wave.webp`, dan gambar lain di halaman; beri `width`/`height` eksplisit; pertimbangkan AVIF bila ukuran turun minimal 20% tanpa selisih visual terlihat (bandingkan piksel dan catat). Jangan merusak mode `prefers-reduced-motion`.
   d. Regenerasi `vercel.json` dengan `tools/buat-vercel-json.mjs` bila ada perubahan inline, jalankan `tools/uji-header-csp.mjs` dan `tools/uji-keamanan.mjs` penuh (bukan `--cepat`), dan tidak boleh ada pelonggaran CSP.
   e. Ukur dengan `tools/ukur-muat.mjs`: 3 halaman (beranda, belajar, terima-kasih) x 3 viewport (390, 768, 1440) x 3 kali ulang, sebelum dan sesudah. Simpan median LCP, CLS, bobot transfer, jumlah permintaan di PERFORMA.md bersama perhitungan selisih.
   f. Tulis alat uji baru `tools/uji-aset.mjs` (minimal 30 kasus: berkas hilang, rujukan putus, ukuran melebihi anggaran, format salah, atribut `width`/`height` kosong, preload tanpa `crossorigin`, masukan jahat) dan masukkan anggaran ukuran per halaman ke dalamnya.
   g. Tinjauan mandiri dua tahap atas seluruh diff, lalu verifikasi akhir di Vercel: tunggu deploy READY, ukur ulang di URL dev yang sebenarnya, bandingkan dengan hasil lokal.
3. Ukur dengan Playwright sebelum dan sesudah (LCP, CLS, bobot transfer) dan verifikasi `prefers-reduced-motion`. Catat angka di PROGRESS.
4. Draf pelajaran 2 (`l1-m1-p2`, Cara chatbot menyusun jawaban).
5. Draf pelajaran 3 (`l1-m1-p3`, Menulis prompt pertama yang jelas).

## Paket C
1. Draf pelajaran 4 (`l1-m1-p4`, Memperbaiki hasil yang belum sesuai).
2. Draf pelajaran 5 (`l1-m1-p5`, Mengecek jawaban AI sebelum dipakai).
3. Latihan interaktif "prompt jelek vs prompt bagus" di halaman pelajaran 3 (tanpa memanggil AI sungguhan: pilih mana yang lebih jelas, lalu lihat alasannya). Tandai DRAF.
4. Halaman galeri: tampilkan penanda "Draf" pada pelajaran yang isinya sudah ada, dan lanjutkan otomatis ke pelajaran belum selesai berikutnya.
5. (C5) Sebelum mulai, periksa PROGRESS: C1 sampai C4 harus berstatus "selesai". Bila ada yang masih "sedang", tunggu (sleep 5 menit, ulangi `git pull` dan periksa lagi, sampai 60 menit); bila C4 tetap belum selesai, kerjakan hanya bagian yang bisa dan catat sisanya. Lalu jalankan validator, perbarui README dan PROGRESS. Bila butir 4 di PERLU-KEPUTUSAN dijawab "lanjut", tambahkan kerangka akun di balik flag (hanya kode dan SQL draf, tanpa project Supabase).

## Paket E (Level 1 Modul 2: Prompt yang efektif)
Draf pelajaran nomor 1–5 sesuai MATERI.md, satu pelajaran satu kegiatan. Tambahkan modul `l1-m2` ke `kursus.json` (jenis dan XP mengikuti aturan validator).

## Paket F (Level 1 Modul 3: Memakai AI dengan aman)
Draf pelajaran nomor 1–5 sesuai MATERI.md, satu pelajaran satu kegiatan. Tambahkan modul `l1-m3`. Bagian hukum atau privasi cukup umum dan tanpa nomor pasal. Hindari nasihat hukum.

## Paket G (Level 2 Modul 1: AI untuk Kerja)
Rancang dan draf lima pelajaran sesuai MATERI.md: merangkum dokumen, menulis email, menyusun laporan singkat, mengolah data sederhana, mengecek hasil sebelum dikirim. Ubah status Level 2 menjadi `segera` tetap, tetapi tampilkan modulnya di galeri. Semua contoh memakai data fiktif.

## Paket I (Level 2 Modul 2: Riset dan belajar dengan AI)
Ditambahkan 22 Nov atas permintaan Master. Lima pelajaran sesuai MATERI.md, satu pelajaran satu kegiatan. Tambahkan modul `l2-m2` ke `kursus.json` (Level 2 tetap berstatus `segera`; ikuti aturan validator). Semua contoh memakai data fiktif berlabel. Tekankan memeriksa sumber, bukan mempercayai satu jawaban AI.

## Paket J (Level 2 Modul 3: Menulis dan membuat konten dengan AI)
Ditambahkan 22 Nov. Lima pelajaran sesuai MATERI.md. Tambahkan modul `l2-m3`. Bagian hak cipta cukup umum, tanpa nomor pasal dan tanpa nasihat hukum.

## Paket K (Rancangan dan riset, hanya dokumen)
Ditambahkan 22 Nov. Hasil berupa dokumen di `docs/riset/` atau `docs/draf/`, bukan perubahan situs. Setiap dokumen memuat ringkasan, rujukan (URL) dengan tanggal akses, dan daftar hal yang belum terverifikasi. Aturan khusus:
1. Kurikulum Level 3: usulan modul dan urutan, dibandingkan dengan materi setara di platform lain (Claude Academy dan sumber gratis), ditulis ulang dengan kata sendiri.
2. Kurikulum cybersecurity pemula: hanya sisi pertahanan dan kebiasaan aman (kata sandi, phishing, privasi, pembaruan, cadangan). Dilarang memuat langkah serangan, eksploitasi, atau bahan yang bisa dipakai menyerang pihak lain.
3. Rancangan jalur cybersecurity di `kursus.json`: skema, id, filter galeri. Jangan mengubah `kursus.json` dan validator; hanya dokumen usulan.
4. Draf Harga dan akses: tulis opsi (gratis, langganan, bayar per kursus) tanpa angka final dan tanpa menyebut sertifikat atau dukungan produk tertentu. Rujuk `docs/riset/pembayaran-monetisasi.md`.
5. Draf email sambutan dan pengumuman waitlist: teks saja, tanpa mengirim dan tanpa menyambungkan layanan email. Sertakan cara berhenti berlangganan dan rujukan ke dasar persetujuan form.

## Paket L (Alat dan dokumentasi)
Ditambahkan 22 Nov. Tanpa mengubah perilaku situs.
1. `tools/cek-materi.mjs` dengan uji pada salinan sementara; keluaran hanya peringatan, bukan pengubah berkas.
2. `tools/uji-semua.mjs` menjalankan validator, uji impor draf, dan uji keamanan cepat; catat di RUNBOOK.
3. `docs/panduan-penulis.md` dengan templat JSON pelajaran.
4. `docs/arsitektur.md`: struktur repo, alur data, peran Supabase dan Vercel, cara menjalankan alat. Tanpa kunci dan tanpa identitas pembuat.
5. Tinjauan konsistensi istilah dan nada semua pelajaran, lalu `docs/loop/GLOSARIUM.md`. Perbaikan teks hanya pada pelajaran berstatus DRAF.

## Paket H (Polesan situs)
1. Meta tag, Open Graph, `robots.txt` dan `sitemap.xml` (jangan masukkan halaman noindex).
2. Halaman 404 bergaya situs.
3. Halaman `belajar/` ditautkan dari landing lewat tautan kecil "Intip ruang belajar (pratinjau)", tanpa mengubah hero.
4. Uji lintas viewport (360, 390, 768, 1024, 1440) dan perbaiki yang pecah.
5. Uji keyboard menyeluruh pada landing, form, galeri, dan pelajaran.

## Paket D (terakhir)
1. CSP lewat meta dan pengecekan SRI untuk aset vendor.
2. Cek semua tautan internal dan eksternal.
3. Audit aksesibilitas ulang dan bandingkan dengan AUDIT.md.
4. Perbarui README dan docs. Snapshot ke Notion bila konektornya tersedia.
5. Ringkasan akhir di PROGRESS.md, pastikan `dev` siap Master tinjau, lalu nonaktifkan tugas terjadwal ini.
