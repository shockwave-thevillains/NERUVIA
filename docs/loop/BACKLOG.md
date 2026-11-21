# Backlog loop NERUVIA (21–27 Nov 2026)

Keputusan yang berlaku: fase 1 tetap statis (HTML + Supabase JS), fitur daftar berupa waitlist dulu, akun login di run 11, pilot dilakukan sebelum run 1.

- **Run 1 (Sab 21):** audit desktop dan mobile terhadap PRD (`docs/loop/AUDIT.md`); perbaiki celah teratas; rapikan berkas loop bila perlu.
- **Run 2 (Min 22):** perbaiki celah #2–#3 (navigasi mobile, tap target, kontras); aksesibilitas carousel dan tab (aria, keyboard); fokus yang terlihat.
- **Run 3 (Min 22):** performa (lazy-load frame Neru, preload font, ukuran gambar, ukur dengan Playwright); verifikasi `prefers-reduced-motion`; screenshot desktop dan mobile.
- **Run 4 (SELESAI, lewati):** validasi form inline, status loading/sukses/gagal, anti-bot honeypot, cegah kirim ganda. Tetap mode pratinjau.
- **Run 5 (SELESAI, lewati):** halaman terima kasih; berkas SQL Supabase (tabel `waitlist`, RLS insert-only, email unik, kolom persetujuan); `docs/waitlist-backend.md`. SQL tidak diterapkan.
- **Run 6 (SELESAI, lewati):** `content/kursus.json` (level, modul, pelajaran) dan skrip validasinya; outline Level 1 untuk Master tinjau.
- **Run 7 (SELESAI, lewati):** halaman `belajar/` berisi galeri kartu kursus (Level 1 aktif, Level 2–3 "segera"), filter, progres dari localStorage.
- **Run 8 (SELESAI, lewati):** halaman pelajaran dengan navigasi sebelumnya/berikutnya, tombol tandai selesai, bar progres.
- **Run 9 (Rab 25):** XP, streak, badge piksel (Silkscreen); ekspor dan impor progres.
- **Run 10 (Kam 26):** draf isi Modul 1 pelajaran 1–2 (ditandai DRAF); latihan interaktif "prompt jelek vs bagus".
- **Run 11 (Kam 26):** alur akun (Supabase Auth magic link, gerbang 18+, tabel progres dengan RLS) di balik flag. Bila Master belum memutuskan akun, ganti dengan draf pelajaran 3–5.
- **Run 12 (Jum 27):** CSP lewat meta, SRI, cek tautan, audit aksesibilitas ulang, uji keyboard dan mobile.
- **Run 13 (Jum 27):** snapshot ke Notion bila konektornya tersedia, pembaruan README dan docs, ringkasan akhir di PROGRESS.md, dan branch `dev` siap Master tinjau.
