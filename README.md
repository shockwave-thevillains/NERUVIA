# NERUVIA — Landing page v0.2

Halaman tunggal statis (HTML + CSS + JS tanpa build), berbasis desain **Variasi 1a** dari Claude Design, dengan tipografi raksasa yang bergerak mengikuti scroll.

## Struktur
- `index.html` — seluruh halaman (CSS dan JS di dalam file)
- `assets/neru.webp`, `assets/neru-wave.webp` — Neru versi terbaru, latar dihapus (hero pakai pose depan, bagian gelap pakai pose miring kanan)
- `assets/fonts/` — Space Grotesk, Space Mono, Silkscreen (lisensi OFL, disajikan lokal)

## Efek scroll
- Judul NERUVIA naik per huruf, lalu parallax dengan Neru saat hero digulir
- Marquee raksasa dua baris (putih/cyan dan outline) bergerak berlawanan arah mengikuti scroll. Ganti kata di `index.html`, blok `.marquee` (kelas `r1` dan `r2`)
- Lembaran section bertumpuk dengan sudut membulat, bar progres scroll, navigasi berganti warna di atas section gelap/terang
- Kartu tahap Learn / Practice / Certify bergilir otomatis dan bisa diklik
- Carousel jalur belajar dengan scroll-snap, tombol, dan bar progres
- Reveal saat masuk layar. `prefers-reduced-motion` mematikan semua gerak

## Waitlist
Form berjalan dalam **mode pratinjau** (data tidak dikirim). Untuk menghubungkan ke backend, tambahkan sebelum `</body>`:

```html
<script>window.NERUVIA_WAITLIST_ENDPOINT = 'https://alamat-endpoint-anda';</script>
```

Payload POST JSON: `name`, `email`, `jalur`, `consent`, `consent_text`, `ts`. Persetujuan UU PDP No. 27/2022 terpisah dan tidak dicentang otomatis.

## Menjalankan
Buka `index.html` di browser, atau jalankan `python3 -m http.server`. Untuk GitHub Pages: Settings → Pages → branch `main`, folder `/ (root)`.

## Catatan konten
Harga, nama jalur, dan teks legal masih placeholder dan perlu ditinjau sebelum rilis publik.

## Brand
- Logo NV dipakai inline (SVG `currentColor`) di navbar dan footer, ikon tab dari `assets/brand/`
- `assets/brand/` — logo NV dan wordmark NERUVIA (SVG dan PNG) berwarna cyan `#38E1FF` dan hitam `#080808`
- `assets/brand/maskot/` — tiga gambar maskot Neru terbaru (18 Nov 2026): miring kanan, depan, miring kiri
- `assets/maskot-animasi/` — animasi Neru menoleh (dibuat dari video Gemini, 18 Nov 2026), latar transparan: `neru-menoleh.webm` (0,7 MB, paling ringan), `neru-menoleh-web.webp` (5,5 MB, cadangan untuk browser tanpa WebM alpha), dan `neru-menoleh-sumber.mp4` (video asli berlatar hitam, bahan untuk membuat ulang). Folder `frames/` berisi 21 frame (f00–f20, urut dari menoleh paling kiri ke paling kanan) yang dipakai hero: Neru menoleh ke arah kursor lewat `<canvas>` (hanya untuk mouse; di layar sentuh ia menoleh pelan sendiri; `prefers-reduced-motion` dan tanpa JS memakai gambar diam `assets/neru.webp`). Neru di bagian Cara belajar tidak diubah.
