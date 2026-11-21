# Runbook loop NERUVIA

Tujuan: menyelesaikan web NERUVIA (fitur daftar dan galeri belajar) lewat run terjadwal. Satu run berisi 3 kegiatan, maksimal 5 bila ringan (teks, CSS, dokumen).

## Mulai run
1. Buka repo `shockwave-thevillains/NERUVIA`, branch `dev`. Clone bila folder kerja belum ada, lalu `git pull origin dev`.
2. Baca `docs/loop/PROGRESS.md`, `docs/loop/BACKLOG.md`, dan `docs/loop/PERLU-KEPUTUSAN.md`.
3. Ambil run pertama di BACKLOG yang belum selesai, lalu kerjakan kegiatannya berurutan.

## Aturan tiap kegiatan
- Satu kegiatan menghasilkan satu perubahan dan satu commit. Pesan commit berbahasa Indonesia.
- Verifikasi hasil dengan screenshot Playwright (desktop 1440 px dan mobile 390 px) sebelum commit. Bandingkan dengan kondisi sebelumnya.
- Setelah mengubah angka, teks, atau perilaku, cari semua tempat lain yang menyebutnya (README, docs, FAQ) dan perbarui.
- Satu perbaikan yang gagal berarti diagnosis perlu ditinjau. Setelah dua kali gagal pada hal yang sama, berhenti, catat di PERLU-KEPUTUSAN, lalu lanjut ke kegiatan lain yang tidak bergantung padanya.
- Tulis kegiatan yang tidak sempat dikerjakan sebagai "belum" di PROGRESS. Jangan melaporkan selesai tanpa bukti dari run ini.

## Larangan
- Jangan push atau merge ke `main`. `main` tayang langsung di GitHub Pages.
- Jangan menampilkan identitas pembuat (nama, bio, kontak pribadi) di halaman, commit, atau dokumen. Penulis commit tetap "Claude".
- Jangan menulis, mengubah, atau menghapus memori.
- Jangan menyambungkan form ke endpoint nyata. `NERUVIA_WAITLIST_ENDPOINT` tetap kosong sampai Master mengisi placeholder di `kebijakan-privasi.html` dan mengizinkan.
- Jangan membuat project Supabase atau layanan berbayar. Jangan menaruh kunci atau rahasia di repo.
- Jangan menyatakan hal yang belum dikonfirmasi Master: Level 1 gratis, dukungan ChatGPT/Gemini/Claude, praktik dengan versi gratis, harga, sertifikat.
- Jangan menyalin teks dari ailene.id.
- Pertahankan gaya: monokrom #080808 / #F2F2F0 dengan aksen cyan #38E1FF, tanpa warna pastel di landing; Space Grotesk, Space Mono, Silkscreen; Neru satu-satunya maskot; `prefers-reduced-motion` mematikan gerak.

## Akhir run
1. Perbarui `PROGRESS.md`: nomor run, kegiatan selesai beserta hash commit, kegiatan yang belum, dan catatan.
2. Push ke `origin dev`. Bila push ditolak, catat pesan persisnya di PROGRESS.md lalu berhenti.
3. Tulis ringkasan 3–6 kalimat sebagai hasil run.
4. Bila kuota atau batas laju tercapai di tengah run, commit pekerjaan yang sudah utuh, catat progres, lalu berhenti.
5. Setelah run 13 selesai, nonaktifkan tugas terjadwal ini (list_triggers lalu delete_trigger) dan tulis ringkasan akhir.
