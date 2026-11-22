# NERUVIA — Landing page v0.2

Halaman tunggal statis (HTML + CSS + JS tanpa build), berbasis desain **Variasi 1a** dari Claude Design, dengan tipografi raksasa yang bergerak mengikuti scroll.

## Struktur
- `index.html` — seluruh halaman (CSS dan JS di dalam file)
- `assets/neru.webp`, `assets/neru-wave.webp` — Neru versi terbaru, latar dihapus (hero pakai pose depan, bagian gelap pakai pose miring kanan). Varian responsif `neru-512/768/1024.avif` + `neru-512/768.webp` dan `neru-wave-512/768/1041.avif` + `neru-wave-512/768.webp` dipilih lewat `<picture>`/`srcset` (AVIF dulu, WebP cadangan; `neru.webp` dan `neru-wave.webp` tetap sebagai varian terbesar)
- `assets/fonts/` — Space Grotesk, Space Mono, Silkscreen (lisensi OFL, disajikan lokal)
- `admin/` — halaman admin (masuk lewat Supabase Auth, ringkasan waitlist), tahap 1 dari 3, hanya build dev; rincian dan langkah menyiapkan akun di `docs/admin.md`, SQL di `supabase/admin/`
- `belajar/komentar-draf.js`, `supabase/draf/komentar.sql` — kerangka komentar dan login, DRAF nonaktif (flag `AKTIF = false`, tidak dimuat halaman mana pun, SQL belum diterapkan); rancangan aman di `docs/security/auth-komentar.md`, uji dengan `tools/uji-komentar-draf.mjs` dan `supabase/draf/uji-komentar-lokal.sql`
- `tools/uji-keamanan.mjs` — gerbang keamanan otomatis sebelum commit (rahasia, sink berbahaya, header, konten, payload jahat di browser); rincian di `docs/security/uji-keamanan.md`
- `vercel.json` — header keamanan dan CSP per halaman untuk hosting Vercel (dibuat oleh `tools/buat-vercel-json.mjs`; jalankan ulang setiap kali blok inline `<script>`/`<style>`/`style=""` berubah, uji dengan `tools/uji-header-csp.mjs`; rincian di `docs/security/header-csp.md`)
- `tools/inventaris-aset.mjs`, `tools/uji-aset.mjs`, `tools/ukur-cls-font.mjs`, `.vercelignore` — inventaris aset (siapa merujuk apa, apa yang benar-benar diminta halaman), uji aset dengan anggaran ukuran per halaman (berkas hilang, rujukan putus, `width`/`height`, preload, format, aset berat tanpa rujukan), ukur pergeseran tata letak akibat font; `.vercelignore` mengecualikan aset berat tanpa rujukan dari deploy (berkas tetap di repo). Fallback font bermetrik hanya dipasang di beranda; alasan dan angka di `docs/loop/PERFORMA.md` bagian B2
- `tools/ukur-muat.mjs`, `tools/uji-muat-neru.mjs`, `docs/loop/PERFORMA.md` — ukur performa muat landing (LCP, CLS, bobot, jaringan dibatasi) dan uji perilaku muat frame animasi Neru (dimuat setelah event load, prioritas rendah, dilewati saat hemat data/2G/reduced-motion)
- `tools/uji-cls-pelajaran.mjs` — uji kestabilan tata letak halaman pelajaran (tombol selesai dan navigasi dipasang setelah isi pelajaran tiba supaya tidak melompat; jalur isi hilang, rusak, besar, dan masukan jahat). `tools/ukur-cls-font.mjs` menerima `--lebar` dan `--halaman`. Halaman yang memakai `scroll-behavior:smooth` mematikannya di bawah `prefers-reduced-motion`. Angka B3 di `docs/loop/PERFORMA.md`
- `tools/video/` — sumber video Prompt 101 dengan Neru pixel art + meja belajar (portrait dan landscape), lihat `tools/video/README.md`
- `docs/video/` — video jadi untuk arsip (Prompt 101 versi maskot, versi pixel portrait 1080x1920, versi pixel landscape 1920x1080)

## Efek scroll
- Judul NERUVIA naik per huruf, lalu parallax dengan Neru saat hero digulir
- Marquee raksasa dua baris (putih/cyan dan outline) bergerak berlawanan arah mengikuti scroll. Ganti kata di `index.html`, blok `.marquee` (kelas `r1` dan `r2`)
- Lembaran section bertumpuk dengan sudut membulat, bar progres scroll, navigasi berganti warna di atas section gelap/terang
- Kartu tahap Learn / Practice / Certify bergilir otomatis, bisa dijeda dengan tombol Jeda, berhenti saat kursor atau fokus di area itu dan setelah dipilih
- Carousel jalur belajar dengan scroll-snap, tombol, dan bar progres
- Transisi: judul terbuka per kata dari balik masker, kartu masuk dari blur ke tajam, dan section lama mundur (mengecil, turun pelan, meredup) saat lembar berikutnya naik. Scroll halus memakai Lenis 1.3.27 (`assets/vendor/`, lisensi MIT) hanya untuk mouse/trackpad; layar sentuh tetap native. `prefers-reduced-motion` mematikan semua gerak

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
- `assets/maskot-animasi/` — animasi Neru menoleh (dibuat dari video Gemini, 18 Nov 2026), latar transparan: `neru-menoleh.webm` (0,7 MB, paling ringan), `neru-menoleh-web.webp` (5,5 MB, cadangan untuk browser tanpa WebM alpha), dan `neru-menoleh-sumber.mp4` (video asli berlatar hitam, bahan untuk membuat ulang). Folder `frames/` berisi 21 frame (f00–f20, 547 px, urut dari menoleh paling kiri ke paling kanan) dan `frames-2x/` berisi frame yang sama hasil upscale Real-ESRGAN (model anime_6B, 1094 px, 19 Nov 2026). Folder `frames-m/` (820 px, hasil perkecil dari `frames-2x/`, WebP q80, 22 Nov 2026) melayani HP dan tablet. Hero memakai `frames/` bila kotak Neru butuh sampai 700 px fisik, `frames-m/` untuk 701–900 px (HP, tablet), dan `frames-2x/` di atas 900 px (layar retina desktop); frame baru diminta setelah halaman selesai dimuat dan browser menganggur (prioritas rendah, dilewati bila hemat data atau jaringan 2G): Neru menoleh ke arah kursor lewat `<canvas>` (hanya untuk mouse; di layar sentuh ia menoleh pelan sendiri; `prefers-reduced-motion` dan tanpa JS memakai gambar diam `assets/neru.webp`). Neru di bagian Cara belajar tidak diubah.
- Bagian landing (19 Nov 2026): Intip modul 1 (tab tiga jalur, berlabel rancangan, plus ilustrasi lab) dan FAQ. `kebijakan-privasi.html` berisi draf Kebijakan Privasi waitlist mengikuti UU PDP; bagian bertanda kuning wajib diisi sebelum form dihubungkan ke backend. Pengelola NERUVIA sengaja tidak ditampilkan di landing.
