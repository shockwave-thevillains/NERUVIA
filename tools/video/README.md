# Video pixel NERUVIA

Video pendek bergaya pixel: Neru (sprite 56x60) dan meja belajar (72x60) digambar dengan kode, kotak dialog "NERU"
mengetik mengikuti suara, layar laptop ikut bercerita. Portrait 1080x1920, 30 fps. Isi penting jangan di bawah y≈1500
(tertutup UI TikTok/Reels); dialog di y 940–1166, Neru dan meja di 1196–1496, lantai di y=1492.

Kode ini direkonstruksi dari sesi pengerjaan episode Prompt 101 (berkas aslinya tidak pernah di-push), jadi tampilan
Neru bisa sedikit berbeda dari MP4 di `docs/video/`.

## Berkas
- `px.js` — mesin pixel, gestur (hop wave shake point ask desk nod happy), dialog. Kontraknya ada di komentar atas berkas.
- `video-ce.html` — contoh episode (Context Engineering 101, 12 adegan). Salin berkas ini untuk episode baru.
- `env.py` — amplop suara + durasi adegan -> `env.js` (dibuat ulang tiap episode, tidak di-commit).
- `render.py` — render halaman ke MP4 (JPEG q92 per frame, libx264 crf18 veryfast per adegan, concat, gabung suara).
- `shots.py` — lembar kontak satu frame per adegan, untuk cek teks tertimpa sebelum render penuh.

## Episode baru
1. Salin `video-ce.html` menjadi `video-xxx.html`. Ganti isi tiap `<section class="scene">` dan teks di `<div class="cap">`
   (teks dialog = teks suara). Atur `window.ACT` (gestur per adegan) dan `window.SCREEN` (isi layar laptop).
2. Buat suara per adegan: `tools/video/audio/a01.wav`, `a02.wav`, ... (Speko atau Azure/Google TTS).
3. `python3 tools/video/env.py` (tanpa suara: `--provisional 5,5,5,...`).
4. `python3 tools/video/shots.py video-xxx.html /tmp/sheet.jpg 0.85 0.99` lalu periksa gambar.
5. `python3 tools/video/render.py video-xxx.html hasil.mp4`, lalu periksa ulang beberapa frame dari MP4.

Syarat: Python 3 dengan playwright, numpy, pillow; ffmpeg; Google Chrome di `/usr/bin/google-chrome`.
Warna: monokrom (#080808 / #F2F2F0) + cyan #38E1FF, tanpa pastel. Jangan taruh video milik kreator lain di repo ini.
