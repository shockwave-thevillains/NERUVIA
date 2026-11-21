# Progres loop NERUVIA

| Paket | Status | Kegiatan dan commit | Catatan |
|---|---|---|---|
| Pilot | lolos | (cek repo, branch, push, Playwright, ffmpeg) | tidak mengubah kode |
| 4 | selesai (interaktif, 21 Nov) | Form waitlist: validasi per kolom, loading/berhasil/gagal, honeypot, penjaga waktu 1,2 dtk, anti kirim ganda, timeout 12 dtk. Commit c6ff3e6 | Diuji Playwright desktop 1440 dan mobile 390 dengan endpoint tiruan. Form tetap mode pratinjau. |
| 5 | selesai (interaktif, 21 Nov) | `terima-kasih.html` (redirect setelah sukses), `supabase/waitlist.sql`, `docs/waitlist-backend.md` | SQL diuji di Postgres 16 lokal: RLS insert-only, email unik tanpa beda huruf, CHECK jalur/format/persetujuan, anon tidak bisa select/delete. Belum diterapkan ke Supabase. |
| 6 | selesai (interaktif, 21 Nov) | `content/kursus.json` (3 level, Level 1 Modul 1 dengan 5 pelajaran) dan `tools/validasi-kursus.mjs` | Validator diuji lulus dan gagal (xp salah, id ganda). Outline Level 1 hanya Modul 1; modul lain belum dirancang. |
| 7 | selesai (interaktif, 21 Nov) | `belajar/index.html` + `belajar/progress.js`: galeri level, filter Semua/Gratis/Segera, progres dari localStorage | Diuji desktop 1440 dan mobile 390; progres dan XP dihitung benar. Halaman noindex dan belum ditautkan dari landing. |
| 8 | selesai (interaktif, 21 Nov) | `belajar/pelajaran.html?id=...`: breadcrumb, sebelumnya/berikutnya, tandai selesai, progres modul; CSS dasar dipindah ke `belajar/ruang.css` | Diuji desktop dan mobile: id kosong/salah/berisi HTML ditangani tanpa eksekusi skrip. Isi pelajaran masih placeholder "Materi sedang disusun". |
| 9 | selesai (interaktif, 21 Nov) | XP, streak (hari lokal beruntun), 5 badge piksel SVG 8x8, ekspor/impor progres JSON di `belajar/` | Impor divalidasi: format, batas 100 KB dan 500 id, hanya id dikenal, gabung tanpa menimpa. Diuji desktop dan mobile. |
| Paket A | belum | lihat BACKLOG.md | 5 kegiatan |
| Paket B | belum | lihat BACKLOG.md | 5 kegiatan |
| Paket C | belum | lihat BACKLOG.md | 5 kegiatan |
| Paket D | belum | lihat BACKLOG.md | 5 kegiatan, lalu nonaktifkan tugas terjadwal |

Catatan: baris bernomor 4–9 di atas adalah penomoran lama, sudah selesai secara interaktif dan sudah dicakup ulang oleh paket di BACKLOG.
