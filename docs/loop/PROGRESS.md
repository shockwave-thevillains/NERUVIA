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
| Interaktif | selesai (21 Nov) | Penampil isi pelajaran + soal cek pemahaman, draf pelajaran 1, validator isi | Uji desktop dan mobile |

Catatan: baris bernomor 4–9 di atas adalah penomoran lama, sudah selesai secara interaktif dan sudah dicakup ulang oleh paket di BACKLOG.

## Antrean kegiatan (satu kegiatan per run)

Status: belum, sedang (diklaim run), selesai, gagal. Kolom commit berisi hash. Run mengambil baris pertama berstatus "belum" dari atas, bukan menurut jam.

| ID | Jam rencana (WIB) | Kegiatan | Status | Commit |
|---|---|---|---|---|
| A1 | Min 22 Nov 00:45 | Audit desktop dan mobile terhadap PRD dan arah visual, hasil ke AUDIT.md | selesai | b84cf1e |
| A2 | Min 22 Nov 01:35 | Perbaiki celah teratas dari audit: F2 menu mobile (tombol 48 px, panel layar penuh, Escape, fokus kembali, konten di-inert, tutup saat melebar). Diuji Playwright 390 dan 360 px; desktop 1440 identik piksel. F4 tidak dikerjakan (kegiatan A5). Validator lulus; uji-keamanan.mjs belum ada (Paket S). | selesai | 8a073c2 |
| A3 | Min 22 Nov 02:25 | Navigasi mobile dan area ketuk minimal 44 px. Menu mobile sudah dari A2; A3 memperbesar semua area ketuk (F5): tautan header, chip jalur, footer landing, filter/brand/kembali/ringkasan/kartu pelajaran di galeri, breadcrumb, daftar isi dan footer kebijakan privasi. Diukur Playwright 1440 dan 390 px: tersisa hanya tautan inline dalam kalimat (dikecualikan). Validator lulus; uji-keamanan.mjs belum ada. | selesai | 54af905 |
| A4 | Min 22 Nov 03:15 | Hapus pastel (F3) dan perbaiki kontras (F7): variabel pastel dihapus, badge, pil, SELESAI, skor dan pesan status memakai cyan/putih/garis abu, hijau/merah hanya jawaban benar/salah dan galat; nomor bagian kebijakan privasi #888 jadi #666; pil 12 px. Pemindai kontras lima halaman dua lebar tanpa kegagalan AA (nav landing positif palsu, terendah 11,55:1). Validator lulus; uji-keamanan.mjs belum ada. | selesai | selesai | f70e330 |
| A5 | Min 22 Nov 04:05 | Aksesibilitas tahap belajar dan carousel (F4, F6, F8): rotasi bisa dijeda dan berhenti saat hover/fokus/setelah dipilih, tombol JEDA/PUTAR 44 px, peran tab diganti grup tombol dengan aria-current, carousel aria-disabled di ujung plus Home/End, fokus kolom isian 2 px. Diuji Playwright 1440 dan 390 px dan reduced-motion. Validator lulus; uji-keamanan.mjs belum ada. | selesai | 4cefe7a |
| S1 | Min 22 Nov 06:45 | Audit keamanan: model ancaman (AUDIT-KEAMANAN.md). 11 temuan (K1 enumerasi email lewat 409 tertinggi; K2–K11 sedang/rendah), STRIDE per aset, bukti uji impor progres dan pencarian sink (tanpa innerHTML/eval/on*), tanpa rahasia di repo dan riwayat. Perlu tindakan Master di PERLU-KEPUTUSAN butir 8. Validator lulus; uji-keamanan.mjs belum ada. | selesai | 96f4b86 |
| S2 | Min 22 Nov 07:35 | Validasi input dan encoding output: form waitlist (NFKC, buang karakter kontrol/bidi, daftar putih karakter, awalan rumus ditolak, cek ulang level) dan impor progres (tanggal ISO nyata 2026–besok, id ketat, baca localStorage membuang entri rusak, objek tanpa prototipe; K8, K9). Draf SQL `supabase/draf/waitlist-s2-perketat.sql` untuk K6, K7, K1 diuji di Postgres 16 lokal, belum diterapkan (PERLU-KEPUTUSAN butir 9). Uji: `tools/uji-impor-progres.mjs` 57 lulus, Playwright form 32 nama dan 27 email, landing dan galeri 1440/390 identik piksel. Validator lulus; uji-keamanan.mjs belum ada. | selesai | ad8fea2 |
| S3 | Min 22 Nov 08:25 | Header keamanan dan CSP: `vercel.json` (nosniff, Referrer-Policy, Permissions-Policy, HSTS, X-Frame-Options, COOP, CSP per halaman tanpa unsafe-inline, connect-src hanya self + host Supabase di halaman yang memuat config.js), dibuat oleh `tools/buat-vercel-json.mjs` (hash blok inline; jalankan ulang bila blok inline berubah, sudah masuk RUNBOOK). `tools/uji-header-csp.mjs`: 116 pemeriksaan lulus, nol pelanggaran CSP di 5 halaman x 1440/390 px, tampilan identik piksel, form/galeri/pelajaran/ekspor berfungsi, kontrol negatif diblokir. Header asli di Vercel belum dicek (PERLU-KEPUTUSAN butir 10). Validator dan uji impor lulus; uji-keamanan.mjs belum ada. | selesai | 820ddcb |
| S4 | Min 22 Nov 09:15 | Rancangan aman login dan komentar (draf di balik flag) | belum | |
| S5 | Min 22 Nov 10:05 | Skrip uji keamanan otomatis dan gerbang di RUNBOOK | belum | |
| B1 | Min 22 Nov 12:45 | Lazy-load frame Neru dan prioritas muat | belum | |
| B2 | Min 22 Nov 13:35 | Preload font, ukuran dan format gambar | belum | |
| B3 | Min 22 Nov 14:25 | Ukur performa sebelum dan sesudah (LCP, CLS, bobot), cek reduced-motion | belum | |
| B4 | Min 22 Nov 15:15 | Draf pelajaran 2 (l1-m1-p2) Cara chatbot menyusun jawaban | belum | |
| B5 | Min 22 Nov 16:05 | Draf pelajaran 3 (l1-m1-p3) Menulis prompt pertama yang jelas | belum | |
| C1 | Min 22 Nov 18:45 | Draf pelajaran 4 (l1-m1-p4) Memperbaiki hasil yang belum sesuai | belum | |
| C2 | Min 22 Nov 19:35 | Draf pelajaran 5 (l1-m1-p5) Mengecek jawaban AI sebelum dipakai | belum | |
| C3 | Min 22 Nov 20:25 | Latihan interaktif prompt jelek vs prompt bagus (pelajaran 3) | belum | |
| C4 | Min 22 Nov 21:15 | Penanda Draf di galeri dan lanjut otomatis ke pelajaran berikutnya | belum | |
| C5 | Min 22 Nov 22:05 | Jalankan validator, perbarui README dan PROGRESS | belum | |
| E1 | Sen 23 Nov 00:45 | L1 Modul 2 pelajaran 1: Memberi peran dan konteks | belum | |
| E2 | Sen 23 Nov 01:35 | L1 Modul 2 pelajaran 2: Menentukan format hasil | belum | |
| E3 | Sen 23 Nov 02:25 | L1 Modul 2 pelajaran 3: Memberi contoh agar hasil konsisten | belum | |
| E4 | Sen 23 Nov 03:15 | L1 Modul 2 pelajaran 4: Memecah tugas besar menjadi langkah kecil | belum | |
| E5 | Sen 23 Nov 04:05 | L1 Modul 2 pelajaran 5: Menyempurnakan prompt lewat percobaan berulang | belum | |
| F1 | Sen 23 Nov 06:45 | L1 Modul 3 pelajaran 1: Data yang tidak boleh ditempel ke chatbot | belum | |
| F2 | Sen 23 Nov 07:35 | L1 Modul 3 pelajaran 2: Kenapa AI bisa keliru dengan yakin (halusinasi) | belum | |
| F3 | Sen 23 Nov 08:25 | L1 Modul 3 pelajaran 3: Keterbatasan dan bias jawaban AI | belum | |
| F4 | Sen 23 Nov 09:15 | L1 Modul 3 pelajaran 4: Etika dasar, menyebut bantuan AI, menghormati karya orang lain | belum | |
| F5 | Sen 23 Nov 10:05 | L1 Modul 3 pelajaran 5: Kebiasaan kerja, tinjau, simpan versi, tanggung jawab tetap pada kamu | belum | |
| G1 | Sen 23 Nov 12:45 | L2 Modul 1 pelajaran 1: Merangkum dokumen panjang | belum | |
| G2 | Sen 23 Nov 13:35 | L2 Modul 1 pelajaran 2: Menulis email yang jelas dan sopan | belum | |
| G3 | Sen 23 Nov 14:25 | L2 Modul 1 pelajaran 3: Menyusun laporan singkat dari catatan | belum | |
| G4 | Sen 23 Nov 15:15 | L2 Modul 1 pelajaran 4: Mengolah data sederhana | belum | |
| G5 | Sen 23 Nov 16:05 | L2 Modul 1 pelajaran 5: Mengecek hasil sebelum dikirim | belum | |
| H1 | Sen 23 Nov 18:45 | Meta tag, Open Graph, robots.txt, sitemap.xml | belum | |
| H2 | Sen 23 Nov 19:35 | Halaman 404 bergaya situs | belum | |
| H3 | Sen 23 Nov 20:25 | Tautan kecil ke ruang belajar dari landing | belum | |
| H4 | Sen 23 Nov 21:15 | Uji lintas viewport (360, 390, 768, 1024, 1440) dan perbaiki | belum | |
| H5 | Sen 23 Nov 22:05 | Uji keyboard menyeluruh landing, form, galeri, pelajaran | belum | |
| D1 | Sel 24 Nov 00:45 | CSP lewat meta dan pengecekan SRI aset vendor | belum | |
| D2 | Sel 24 Nov 01:35 | Cek semua tautan internal dan eksternal | belum | |
| D3 | Sel 24 Nov 02:25 | Audit aksesibilitas ulang dan bandingkan dengan AUDIT.md | belum | |
| D4 | Sel 24 Nov 03:15 | Perbarui README dan docs, snapshot ke Notion bila tersedia | belum | |
| D5 | Sel 24 Nov 04:05 | Ringkasan akhir, dev siap ditinjau, nonaktifkan kelima tugas terjadwal | belum | |
