# Video NERUVIA — Neru pixel

Sumber video **Prompt 101 (prompt jelek vs bagus)** dengan Neru versi pixel art sebagai presenter.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `video-px.html` | Halaman video portrait 1080x1920 (12 adegan, total 59 detik). |
| `video-px-l.html` | Halaman video landscape 1920x1080. Isi adegan di kiri, dialog + Neru + meja di kanan. |
| `px.js` | Mesin pixel: sprite Neru 56x60, meja belajar 72x60, koreografi per adegan, kotak dialog. |
| `env.js` | Amplop suara per baris (gerak mulut Neru), 30 nilai per detik. |
| `env.py` | Membuat ulang `env.js` dari `audio/aNN.opus`. |
| `render.py` | Merender video jadi ke `out/`. |
| `audio/vo.m4a` | Voice-over utuh 59 detik. |
| `audio/a01–a12.opus` | Voice-over per adegan (mulai 0,25 detik setelah adegan dimulai). |

## Cara render

```bash
# dari akar repo
python3 -m http.server 8765 &
pip install playwright numpy && playwright install chromium
python3 tools/video/render.py portrait     # atau: landscape
```

Hasil jadi tersimpan di `tools/video/out/` (diabaikan git). Salinan final ada di `docs/video/`.

## Membuat episode baru

1. Ganti isi adegan dan teks `.cap` di `video-px.html` / `video-px-l.html` (`data-d` = durasi adegan).
2. Buat voice-over per adegan sebagai `audio/aNN.opus`, gabungkan jadi `audio/vo.m4a`.
3. Jalankan `python3 tools/video/env.py` agar gerak mulut Neru ikut suara baru.
4. Sesuaikan `ACT` (gestur Neru) dan `screen()` (isi layar laptop) di `px.js`.
5. Render.

## Catatan

- Ukuran Neru: portrait skala 5x (280 px), landscape skala 4x (224 px).
- Gestur yang tersedia: `hop`, `wave`, `shake`, `point`, `ask`, `desk` (mengetik di laptop), `nod`, `happy`.
- Sprite digambar langsung dengan kode (tanpa gambar maskot), jadi bisa diubah per piksel di `drawNeru()` dan `drawDesk()`.
- Video contoh gaya dari kreator lain sengaja tidak disimpan di repo ini.
