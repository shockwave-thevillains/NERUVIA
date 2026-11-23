# NERUVIA — Landing dan Ruang Belajar (build dev)

Situs statis (HTML + CSS + JS tanpa build, tanpa dependensi npm di situs). Landing berbasis desain **Variasi 1a** dari Claude Design, dengan tipografi raksasa yang bergerak mengikuti scroll. Branch `dev` juga memuat Ruang Belajar (pratinjau), halaman admin, dan alat uji; branch `main` tayang langsung di GitHub Pages dan hanya berisi landing dan kebijakan privasi (tanpa Ruang Belajar, admin, dan `config.js`). Jangan push atau merge ke `main` tanpa keputusan pemilik proyek (lihat `docs/loop/PERLU-KEPUTUSAN.md`).

Arah produk dan desain ada di `docs/konteks/PRD.md`. Pekerjaan berkala dijalankan lewat loop terjadwal: aturan di `docs/loop/RUNBOOK.md`, antrean dan hasil per kegiatan di `docs/loop/PROGRESS.md`, rincian di `docs/loop/BACKLOG.md`.

## Struktur
- `index.html` — landing (CSS dan JS di dalam file). `terima-kasih.html` dibuka setelah form waitlist berhasil; `kebijakan-privasi.html` memuat draf Kebijakan Privasi
- `config.js` — konfigurasi publik build dev (endpoint dan kunci publishable proyek `neruvia-dev`); tinjau ulang sebelum merge ke `main` (PERLU-KEPUTUSAN butir 6)
- `belajar/` — Ruang Belajar (pratinjau, `noindex`, belum ditautkan dari landing): `index.html` galeri level, `pelajaran.html?id=...` penampil pelajaran, `progress.js` progres/XP/streak/badge/ekspor-impor, `ruang.css` gaya dasar bersama. Rincian di bagian "Ruang Belajar" di bawah
- `content/` — isi kursus: `kursus.json` (level, modul, pelajaran) dan `pelajaran/<id>.json` (satu berkas per pelajaran)
- `supabase/` — SQL: `waitlist.sql` (tabel dan RLS waitlist), `admin/` (tabel admin dan ringkasan, sudah diterapkan ke `neruvia-dev`), `draf/` (draf yang belum diterapkan: perketat waitlist S2, komentar)
- `docs/` — `konteks/PRD.md` (produk dan desain), `loop/` (runbook, backlog, progres, keputusan, materi, rujukan, audit, performa), `security/` (header CSP, uji keamanan, rancangan login dan komentar), `riset/` (riset pendukung), `admin.md`, `waitlist-backend.md`, `snapshot/`, `video/`
- `assets/neru.webp`, `assets/neru-wave.webp` — Neru versi terbaru, latar dihapus (hero pakai pose depan, bagian gelap pakai pose miring kanan). Varian responsif `neru-512/768/1024.avif` + `neru-512/768.webp` dan `neru-wave-512/768/1041.avif` + `neru-wave-512/768.webp` dipilih lewat `<picture>`/`srcset` (AVIF dulu, WebP cadangan; `neru.webp` dan `neru-wave.webp` tetap sebagai varian terbesar)
- `assets/fonts/` — Space Grotesk, Space Mono, Silkscreen (lisensi OFL, disajikan lokal)
- `admin/` — halaman admin (masuk lewat Supabase Auth, ringkasan waitlist), tahap 1 dari 3, hanya build dev; rincian dan langkah menyiapkan akun di `docs/admin.md`, SQL di `supabase/admin/`
- `belajar/komentar-draf.js`, `supabase/draf/komentar.sql` — kerangka komentar dan login, DRAF nonaktif (flag `AKTIF = false`, tidak dimuat halaman mana pun, SQL belum diterapkan); rancangan aman di `docs/security/auth-komentar.md`, uji dengan `tools/uji-komentar-draf.mjs` dan `supabase/draf/uji-komentar-lokal.sql`
- `tools/uji-keamanan.mjs` — gerbang keamanan otomatis sebelum commit (rahasia, sink berbahaya, header, konten, payload jahat di browser); rincian di `docs/security/uji-keamanan.md`
- `tools/validasi-kursus.mjs` — validator `kursus.json` dan isi pelajaran (id unik, jenis dan XP sesuai aturan, status dan berkas isi, soal cek pemahaman, bidang latihan interaktif); pemeriksaan HTML, URL, dan karakter berbahaya di konten ada di bagian D `tools/uji-keamanan.mjs`; `tools/impor-draf.mjs` dan `tools/uji-impor-draf.mjs` mengimpor draf dari `admin/` ke `content/` dan mengujinya
- `tools/uji-impor-progres.mjs`, `tools/uji-latihan-interaktif.mjs`, `tools/uji-lanjut-belajar.mjs` — uji impor progres, latihan interaktif, dan tautan Lanjut/tombol Mulai di galeri (ketiganya diuji dengan data rusak dan payload jahat); `tools/uji-komentar-draf.mjs` menguji kerangka komentar yang nonaktif
- `tools/snapshot.py` — tangkapan layar halaman penuh landing ke `docs/snapshot/<tanggal>/`
- `vercel.json` — header keamanan dan CSP per halaman untuk hosting Vercel (dibuat oleh `tools/buat-vercel-json.mjs`; jalankan ulang setiap kali blok inline `<script>`/`<style>`/`style=""` berubah, uji dengan `tools/uji-header-csp.mjs`; rincian di `docs/security/header-csp.md`)
- `tools/inventaris-aset.mjs`, `tools/uji-aset.mjs`, `tools/ukur-cls-font.mjs`, `.vercelignore` — inventaris aset (siapa merujuk apa, apa yang benar-benar diminta halaman), uji aset dengan anggaran ukuran per halaman (berkas hilang, rujukan putus, `width`/`height`, preload, format, aset berat tanpa rujukan), ukur pergeseran tata letak akibat font; `.vercelignore` mengecualikan aset berat tanpa rujukan dari deploy (berkas tetap di repo). Fallback font bermetrik hanya dipasang di beranda; alasan dan angka di `docs/loop/PERFORMA.md` bagian B2
- `tools/ukur-muat.mjs`, `tools/uji-muat-neru.mjs`, `docs/loop/PERFORMA.md` — ukur performa muat landing (LCP, CLS, bobot, jaringan dibatasi) dan uji perilaku muat frame animasi Neru (dimuat setelah event load, prioritas rendah, dilewati saat hemat data/2G/reduced-motion)
- `tools/uji-cls-pelajaran.mjs` — uji kestabilan tata letak halaman pelajaran (tombol selesai dan navigasi dipasang setelah isi pelajaran tiba supaya tidak melompat; jalur isi hilang, rusak, besar, dan masukan jahat). `tools/ukur-cls-font.mjs` menerima `--lebar` dan `--halaman`. Halaman yang memakai `scroll-behavior:smooth` mematikannya di bawah `prefers-reduced-motion`. Angka B3 di `docs/loop/PERFORMA.md`
- `tools/uji-gerak.mjs` — uji "kurangi gerak" (enam halaman x 390/768/1440 px dengan `prefers-reduced-motion: reduce`): tanpa animasi CSS atau transisi, `scroll-behavior` auto, tautan jangkar berpindah seketika, tanpa rAF/setInterval saat diam, teks tidak hilang, Neru tidak menyala; ada uji mandiri 46 pemeriksaan. Temuan dan angka di `docs/loop/PERFORMA.md` bagian B3 (tambahan)
- `tools/video/` — sumber video Prompt 101 dengan Neru pixel art + meja belajar (portrait dan landscape), lihat `tools/video/README.md`
- `docs/video/` — video jadi untuk arsip (Prompt 101 versi maskot, versi pixel portrait 1080x1920, versi pixel landscape 1920x1080)

## Efek scroll
- Judul NERUVIA naik per huruf, lalu parallax dengan Neru saat hero digulir
- Marquee raksasa dua baris (putih/cyan dan outline) bergerak berlawanan arah mengikuti scroll. Ganti kata di `index.html`, blok `.marquee` (kelas `r1` dan `r2`)
- Lembaran section bertumpuk dengan sudut membulat, bar progres scroll, navigasi berganti warna di atas section gelap/terang
- Kartu tahap Learn / Practice / Certify bergilir otomatis, bisa dijeda dengan tombol Jeda, berhenti saat kursor atau fokus di area itu dan setelah dipilih
- Carousel jalur belajar dengan scroll-snap, tombol, dan bar progres
- Transisi: judul terbuka per kata dari balik masker, kartu masuk dari blur ke tajam, dan section lama mundur (mengecil, turun pelan, meredup) saat lembar berikutnya naik. Scroll halus memakai Lenis 1.3.27 (`assets/vendor/`, lisensi MIT) hanya untuk mouse/trackpad; layar sentuh tetap native. `prefers-reduced-motion` mematikan semua gerak

## Ruang Belajar (pratinjau)
- Galeri level (`belajar/index.html`): filter Semua/Gratis/Segera, daftar modul dan pelajaran, penanda DRAF pada pelajaran yang isinya sudah ada, tombol Mulai belajar atau Lanjutkan belajar di kartu level yang tersedia
- Pelajaran (`belajar/pelajaran.html?id=<id>`): isi teks, contoh berpasangan, latihan, tiga soal cek pemahaman, tombol Tandai selesai, tautan Lanjut ke pelajaran belum selesai berikutnya (tidak berpindah halaman sendiri). Pelajaran 3 memuat latihan interaktif "pilih prompt yang lebih sesuai"
- Progres, XP, streak, dan badge tersimpan di `localStorage` peramban; bisa diekspor dan diimpor sebagai JSON (impor divalidasi ketat)
- Isi pelajaran saat ini: Level 1 Modul 1 (lima pelajaran, semuanya berstatus DRAF sampai disetujui pemilik proyek) dan Level 1 Modul 2 "Prompt yang efektif" (kerangka lima pelajaran; pelajaran 1 "Memberi peran dan konteks", 2 "Menentukan format hasil", 3 "Memberi contoh agar hasil konsisten", 4 "Memecah tugas besar menjadi langkah kecil", dan 5 "Menyempurnakan prompt lewat percobaan berulang" sudah DRAF, jadi Modul 2 lengkap sebagai draf) dan Level 1 Modul 3 "Memakai AI dengan aman dan bertanggung jawab" (kerangka lima pelajaran; pelajaran 1 "Data yang tidak boleh ditempel ke chatbot", 2 "Kenapa AI bisa keliru dengan yakin (halusinasi)", 3 "Keterbatasan dan bias jawaban AI", 4 "Etika dasar: menyebut bantuan AI dan menghormati karya orang lain", dan 5 "Kebiasaan kerja: tinjau, simpan versi, tanggung jawab tetap pada kamu" sudah DRAF, jadi Modul 3 lengkap sebagai draf). Level 2 Modul 1 "AI untuk Kerja" ada di kursus.json (kerangka lima pelajaran; pelajaran 1 "Merangkum dokumen panjang" sudah DRAF, pelajaran 2 sampai 5 berstatus belum) dan Level 2 tetap "segera"; Level 3 masih "segera" tanpa pelajaran. Semua materi berupa teks dan latihan ringan, tanpa video
- Menambah pelajaran: tulis `content/pelajaran/<id>.json`, ubah `isi` di `content/kursus.json` menjadi `draf`, lalu jalankan `node tools/validasi-kursus.mjs`. Standar isi di `docs/loop/MATERI.md` dan `docs/loop/RUNBOOK.md`; rujukan riset dicatat di `docs/loop/RUJUKAN.md`
- Data dari JSON, pengguna, atau berkas impor tidak pernah masuk ke `innerHTML`; semua teks lewat `textContent`

## Waitlist
Di build dev, form tersambung ke tabel `waitlist` di project Supabase `neruvia-dev` lewat `config.js` (RLS: anon hanya boleh insert). Tanpa `config.js` (misalnya di `main`) form berjalan dalam **mode pratinjau** (data tidak dikirim). Alamat endpoint bisa diatur lewat variabel sebelum skrip form:

```html
<script>window.NERUVIA_WAITLIST_ENDPOINT = 'https://alamat-endpoint-anda';</script>
```

Payload POST JSON: `name`, `email`, `jalur`, `consent`, `consent_text`, `ts`. Persetujuan UU PDP No. 27/2022 terpisah dan tidak dicentang otomatis. Skema, kebijakan, dan cara menguji ada di `docs/waitlist-backend.md`. Kebijakan privasi masih memuat placeholder identitas pengendali data; form tidak boleh menerima data nyata dari publik sebelum itu diisi (PERLU-KEPUTUSAN butir 2).

## Menjalankan
Buka `index.html` di browser, atau jalankan `python3 -m http.server` lalu buka `/`, `/belajar/`, dan `/admin/`. Produksi direncanakan di Vercel (`vercel.json` memuat header keamanan dan CSP); `main` saat ini masih tayang di GitHub Pages (Settings → Pages → branch `main`, folder `/ (root)`).

## Sebelum commit
Jalankan gerbang di `docs/loop/RUNBOOK.md` (bagian "Gerbang keamanan"). Minimum untuk perubahan kode atau konten: `node tools/validasi-kursus.mjs` dan `node tools/uji-keamanan.mjs` (penuh sekitar 45 detik; `--cepat` hanya untuk perubahan dokumen). Alat lain dipakai sesuai yang diubah: `tools/buat-vercel-json.mjs` bila blok inline berubah, `tools/uji-aset.mjs` untuk aset, `tools/uji-cls-pelajaran.mjs`, `tools/uji-gerak.mjs`, `tools/uji-latihan-interaktif.mjs`, dan `tools/uji-lanjut-belajar.mjs` untuk bagian terkait. Alat berjalan dengan Node.js tanpa paket npm (diuji di Node 22); uji browser memerlukan Playwright.

## Catatan konten
Harga, nama jalur, dan teks legal masih placeholder dan perlu ditinjau sebelum rilis publik. Klaim yang belum dikonfirmasi pemilik proyek (Level 1 gratis, dukungan chatbot tertentu, praktik dengan versi gratis, sertifikat, harga) tidak boleh ditambah; daftar keputusan yang menunggu ada di `docs/loop/PERLU-KEPUTUSAN.md`.

## Brand
- Logo NV dipakai inline (SVG `currentColor`) di navbar dan footer, ikon tab dari `assets/brand/`
- `assets/brand/` — logo NV dan wordmark NERUVIA (SVG dan PNG) berwarna cyan `#38E1FF` dan hitam `#080808`
- `assets/brand/maskot/` — tiga gambar maskot Neru terbaru (18 Nov 2026): miring kanan, depan, miring kiri
- `assets/maskot-animasi/` — animasi Neru menoleh (dibuat dari video Gemini, 18 Nov 2026), latar transparan: `neru-menoleh.webm` (0,7 MB, paling ringan), `neru-menoleh-web.webp` (5,5 MB, cadangan untuk browser tanpa WebM alpha), dan `neru-menoleh-sumber.mp4` (video asli berlatar hitam, bahan untuk membuat ulang). Folder `frames/` berisi 21 frame (f00–f20, 547 px, urut dari menoleh paling kiri ke paling kanan) dan `frames-2x/` berisi frame yang sama hasil upscale Real-ESRGAN (model anime_6B, 1094 px, 19 Nov 2026). Folder `frames-m/` (820 px, hasil perkecil dari `frames-2x/`, WebP q80, 22 Nov 2026) melayani HP dan tablet. Hero memakai `frames/` bila kotak Neru butuh sampai 700 px fisik, `frames-m/` untuk 701–900 px (HP, tablet), dan `frames-2x/` di atas 900 px (layar retina desktop); frame baru diminta setelah halaman selesai dimuat dan browser menganggur (prioritas rendah, dilewati bila hemat data atau jaringan 2G): Neru menoleh ke arah kursor lewat `<canvas>` (hanya untuk mouse; di layar sentuh ia menoleh pelan sendiri; `prefers-reduced-motion` dan tanpa JS memakai gambar diam `assets/neru.webp`). Neru di bagian Cara belajar tidak diubah.
- Bagian landing (19 Nov 2026): Intip modul 1 (tab tiga jalur, berlabel rancangan, plus ilustrasi lab) dan FAQ. `kebijakan-privasi.html` berisi draf Kebijakan Privasi waitlist mengikuti UU PDP; bagian bertanda kuning wajib diisi sebelum form dihubungkan ke backend. Pengelola NERUVIA sengaja tidak ditampilkan di landing.
