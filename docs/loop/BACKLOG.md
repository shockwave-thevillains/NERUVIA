# Backlog loop NERUVIA

Keputusan yang berlaku: fase 1 tetap statis (HTML + Supabase JS), fitur daftar berupa waitlist dulu, pilot sudah lolos.

Satu run mengerjakan satu paket yang berisi TEPAT 5 kegiatan, sesuai satu jendela batas 5 jam. Satu kegiatan menghasilkan satu commit. Paket dikerjakan berurutan A, B, C, D.

Sudah selesai secara interaktif (21 Nov), tidak perlu dikerjakan ulang: form waitlist (validasi, state, anti-bot), halaman terima kasih, SQL dan dokumen backend, `content/kursus.json` dan validator, galeri `belajar/`, halaman pelajaran, XP, streak, badge, ekspor/impor progres.

## Paket A (run 1)
1. Audit desktop dan mobile terhadap PRD dan arah visual. Tulis `docs/loop/AUDIT.md` berisi temuan berperingkat.
2. Perbaiki celah teratas dari audit.
3. Perbaiki navigasi mobile dan ukuran area ketuk (minimal 44 px).
4. Perbaiki kontras warna yang gagal (target WCAG AA).
5. Aksesibilitas carousel level dan tab: aria, keyboard, fokus terlihat.

## Paket B (run 2)
1. Performa: lazy-load frame Neru dan atur prioritas muat.
2. Performa: preload font, ukuran dan format gambar.
3. Ukur dengan Playwright sebelum dan sesudah (LCP, CLS, bobot transfer) dan verifikasi `prefers-reduced-motion`. Catat angka di PROGRESS.
4. Draf isi pelajaran 1 (`l1-m1-p1`), ditandai DRAF, tanpa klaim yang belum dikonfirmasi.
5. Draf isi pelajaran 2 (`l1-m1-p2`), ditandai DRAF.

## Paket C (run 3)
1. Latihan interaktif "prompt jelek vs prompt bagus" untuk pelajaran 3, ditandai DRAF.
2. Draf isi pelajaran 3.
3. Draf isi pelajaran 4.
4. Draf isi pelajaran 5 (latihan mengecek jawaban AI).
5. Perbarui `kursus.json` (status isi) dan jalankan validator. Bila butir 4 di PERLU-KEPUTUSAN dijawab "lanjut", kerjakan kerangka akun di balik flag (hanya kode dan SQL draf, tanpa project Supabase).

## Paket D (run 4, terakhir)
1. CSP lewat meta dan pengecekan SRI untuk aset vendor.
2. Cek semua tautan internal dan eksternal.
3. Audit aksesibilitas ulang, termasuk uji keyboard dan mobile.
4. Perbarui README dan docs. Snapshot ke Notion bila konektornya tersedia.
5. Ringkasan akhir di PROGRESS.md, pastikan `dev` siap Master tinjau, lalu nonaktifkan tugas terjadwal ini.
