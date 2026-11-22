# Backlog loop NERUVIA

Keputusan yang berlaku: fase 1 tetap statis (HTML + Supabase JS), fitur daftar berupa waitlist dulu, pilot sudah lolos. Master melimpahkan pekerjaan ke Claude selama seminggu (21–28 Nov 2026), termasuk di jam Master memakai Claude.

Satu run mengerjakan SATU kegiatan, dan lima run berselang 50 menit mengisi satu jendela batas 5 jam (lihat antrean di PROGRESS.md). Satu kegiatan menghasilkan satu commit. Paket dikerjakan berurutan: A, S, B, C, E, F, G, H, D. Paket S (keamanan) wajib selesai sebelum pelajaran baru mana pun dibuat, termasuk pelajaran 2 dan 3 di Paket B. Semua materi pelajaran berupa teks saja, tanpa video, mengikuti `docs/loop/MATERI.md`. Tiap draf pelajaran berupa berkas `content/pelajaran/<id>.json`, lalu `isi` di `kursus.json` diubah menjadi `draf` dan `node tools/validasi-kursus.mjs` harus lulus.

Sudah selesai (jangan dikerjakan ulang): form waitlist, halaman terima kasih, SQL dan dokumen backend, `kursus.json` dan validator, galeri `belajar/`, halaman pelajaran dengan penampil isi dan soal cek pemahaman, XP/streak/badge, ekspor/impor progres, draf pelajaran 1.

Catatan beta (22 Nov): pendaftaran akun Auth ditutup, jadi kegiatan login, komentar, dan akun pengguna hanya berupa rancangan atau kode di balik flag nonaktif. Pembukaan kembali menunggu keputusan Master (`docs/admin.md`).

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
2. Performa: preload font, ukuran dan format gambar.
3. Ukur dengan Playwright sebelum dan sesudah (LCP, CLS, bobot transfer) dan verifikasi `prefers-reduced-motion`. Catat angka di PROGRESS.
4. Draf pelajaran 2 (`l1-m1-p2`, Cara chatbot menyusun jawaban).
5. Draf pelajaran 3 (`l1-m1-p3`, Menulis prompt pertama yang jelas).

## Paket C
1. Draf pelajaran 4 (`l1-m1-p4`, Memperbaiki hasil yang belum sesuai).
2. Draf pelajaran 5 (`l1-m1-p5`, Mengecek jawaban AI sebelum dipakai).
3. Latihan interaktif "prompt jelek vs prompt bagus" di halaman pelajaran 3 (tanpa memanggil AI sungguhan: pilih mana yang lebih jelas, lalu lihat alasannya). Tandai DRAF.
4. Halaman galeri: tampilkan penanda "Draf" pada pelajaran yang isinya sudah ada, dan lanjutkan otomatis ke pelajaran belum selesai berikutnya.
5. Jalankan validator, perbarui README dan PROGRESS. Bila butir 4 di PERLU-KEPUTUSAN dijawab "lanjut", tambahkan kerangka akun di balik flag (hanya kode dan SQL draf, tanpa project Supabase).

## Paket E (Level 1 Modul 2: Prompt yang efektif)
Draf pelajaran nomor 1–5 sesuai MATERI.md, satu pelajaran satu kegiatan. Tambahkan modul `l1-m2` ke `kursus.json` (jenis dan XP mengikuti aturan validator).

## Paket F (Level 1 Modul 3: Memakai AI dengan aman)
Draf pelajaran nomor 1–5 sesuai MATERI.md, satu pelajaran satu kegiatan. Tambahkan modul `l1-m3`. Bagian hukum atau privasi cukup umum dan tanpa nomor pasal. Hindari nasihat hukum.

## Paket G (Level 2 Modul 1: AI untuk Kerja)
Rancang dan draf lima pelajaran sesuai MATERI.md: merangkum dokumen, menulis email, menyusun laporan singkat, mengolah data sederhana, mengecek hasil sebelum dikirim. Ubah status Level 2 menjadi `segera` tetap, tetapi tampilkan modulnya di galeri. Semua contoh memakai data fiktif.

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
