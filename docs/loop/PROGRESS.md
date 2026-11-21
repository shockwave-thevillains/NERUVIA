# Progres loop NERUVIA

| Run | Status | Kegiatan dan commit | Catatan |
|---|---|---|---|
| Pilot | lolos | (cek repo, branch, push, Playwright, ffmpeg) | tidak mengubah kode |
| 4 | selesai (interaktif, 21 Nov) | Form waitlist: validasi per kolom, loading/berhasil/gagal, honeypot, penjaga waktu 1,2 dtk, anti kirim ganda, timeout 12 dtk. Commit c6ff3e6 | Diuji Playwright desktop 1440 dan mobile 390 dengan endpoint tiruan. Form tetap mode pratinjau. |
| 5 | selesai (interaktif, 21 Nov) | `terima-kasih.html` (redirect setelah sukses), `supabase/waitlist.sql`, `docs/waitlist-backend.md` | SQL diuji di Postgres 16 lokal: RLS insert-only, email unik tanpa beda huruf, CHECK jalur/format/persetujuan, anon tidak bisa select/delete. Belum diterapkan ke Supabase. |
| 1–3, 6–13 | belum | lihat BACKLOG.md | Run 4 dan 5 dilewati loop. |
