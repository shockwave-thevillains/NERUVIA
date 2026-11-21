# Backlog loop NERUVIA

Keputusan yang berlaku: fase 1 tetap statis (HTML + Supabase JS), fitur daftar berupa waitlist dulu, pilot sudah lolos. Master melimpahkan pekerjaan ke Claude selama seminggu (21–28 Nov 2026), termasuk di jam Master memakai Claude.

Satu run mengerjakan satu paket berisi TEPAT 5 kegiatan, sesuai satu jendela batas 5 jam. Satu kegiatan menghasilkan satu commit. Paket dikerjakan berurutan sesuai daftar. Semua materi pelajaran berupa teks saja, tanpa video, mengikuti `docs/loop/MATERI.md`. Tiap draf pelajaran berupa berkas `content/pelajaran/<id>.json`, lalu `isi` di `kursus.json` diubah menjadi `draf` dan `node tools/validasi-kursus.mjs` harus lulus.

Sudah selesai (jangan dikerjakan ulang): form waitlist, halaman terima kasih, SQL dan dokumen backend, `kursus.json` dan validator, galeri `belajar/`, halaman pelajaran dengan penampil isi dan soal cek pemahaman, XP/streak/badge, ekspor/impor progres, draf pelajaran 1.

## Paket A
1. Audit desktop dan mobile terhadap PRD dan arah visual. Tulis `docs/loop/AUDIT.md` berisi temuan berperingkat.
2. Perbaiki celah teratas dari audit.
3. Perbaiki navigasi mobile dan ukuran area ketuk (minimal 44 px).
4. Perbaiki kontras warna yang gagal (target WCAG AA).
5. Aksesibilitas carousel level dan tab: aria, keyboard, fokus terlihat.

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
