# Audit desktop dan mobile (A1)

Tanggal: Min 22 Nov 2026, cabang `dev` (commit dasar 5129db9). Acuan: `docs/konteks/PRD.md` bagian 4 (Desain), `docs/loop/RUNBOOK.md`, dan WCAG 2.2 AA.

Cara audit: Playwright (Chromium) di 1440×900 dan 390×844 pada `index.html`, `belajar/index.html`, `belajar/pelajaran.html?id=l1-m1-p1`, `terima-kasih.html`, `kebijakan-privasi.html`. Yang diukur: tangkapan layar tiap posisi gulir, galat konsol dan permintaan gagal, luapan horizontal, ukuran area ketuk, ukuran huruf, kontras warna terhitung, font terpakai, urutan Tab, dan perilaku keyboard. Audit ini hanya membaca; tidak ada kode yang diubah.

## Ringkasan

Kondisi dasar baik: tidak ada galat konsol, tidak ada permintaan gagal, tidak ada luapan horizontal di kedua lebar, hanya satu `h1` per halaman, `lang="id"`, landmark lengkap di landing, tautan lompat tersedia di tiga halaman utama, semua gambar punya `alt`, dan cincin fokus terlihat di hampir semua kontrol. Landing sudah sesuai arah visual (monokrom + cyan, Neru satu-satunya maskot, tanpa wajah manusia, tanpa statistik karangan).

Celah terbesar, berurutan: (1) landing menampilkan klaim yang belum dikonfirmasi Master, (2) tidak ada navigasi di mobile, (3) Ruang Belajar masih memakai warna pastel dan warna tambahan yang dilarang PRD, (4) rotasi otomatis tahap belajar tidak bisa dijeda, (5) banyak area ketuk di bawah 44 px, (6) tablist tahap belajar belum lengkap untuk keyboard dan pembaca layar.

## Temuan berperingkat

Peringkat: T = tinggi, S = sedang, R = rendah. Kolom "Kegiatan" menunjuk tugas antrean yang menanganinya.

| ID | Peringkat | Temuan | Kegiatan |
|---|---|---|---|
| F1 | T | Klaim belum dikonfirmasi tampil sebagai fakta di landing | Keputusan Master |
| F2 | T | Tidak ada navigasi mobile | A2, A3 |
| F3 | T | Warna pastel dan warna tambahan di Ruang Belajar, serta sisa pastel di landing | A4 |
| F4 | T | Rotasi otomatis tahap belajar tanpa kontrol jeda | A5 |
| F5 | S | Area ketuk di bawah 44 px | A3 |
| F6 | S | Tablist tahap belajar belum lengkap (panah, tabpanel, tabindex) | A5 |
| F7 | S | Kontras dan ukuran huruf kecil | A4 |
| F8 | R | Fokus kolom isian bergantung pada glow cyan pucat | A5 |
| F9 | R | Halaman pendukung kurang konsisten (tautan lompat, meta, footer) | Paket H |
| F10 | R | Font cadangan Arial pada input tersembunyi | tidak perlu tindakan |

### F1 · Klaim belum dikonfirmasi (T)

Bukti: `index.html` baris 7 dan 11 (meta description dan Open Graph: "Modul pertama gratis"), baris 348 dan 363 ("Daftar gratis"), baris 369 ("Modul pertama gratis", "Untuk ChatGPT, Gemini, dan Claude"), baris 410 (lencana GRATIS pada Level 1), baris 420 ("Intip modul 1 · gratis"), FAQ baris 453–456 (versi gratis ChatGPT/Gemini/Claude, "Dapat sertifikat", rencana metode pembayaran QRIS dan e-wallet), baris 467 dan 470 ("Modul pertama tetap gratis", "Gabung waitlist, gratis"), serta lencana GRATIS dan filter "Gratis" di `belajar/index.html`. RUNBOOK melarang menyatakan Level 1 gratis, dukungan ChatGPT/Gemini/Claude, praktik dengan versi gratis, harga, dan sertifikat sebelum Master mengonfirmasi.

Cara uji: cari kata "gratis", "ChatGPT", "sertifikat", "QRIS" di seluruh situs.

Catatan: ini bukan perbaikan otomatis karena menyentuh keputusan Master. Butir 1 di PERLU-KEPUTUSAN sudah memblokir merge ke `main`; butir 7 ditambahkan untuk sertifikat dan metode pembayaran yang belum tercakup. Run otomatis tidak mengubah teks ini.

### F2 · Tidak ada navigasi di mobile (T)

Bukti: `index.html` baris 304, `@media(max-width:900px){... .nav .links a:not(.cta){display:none}}`. Di 390 px header hanya berisi logo dan tombol "Daftar gratis"; Cara belajar, Level, Modul 1, dan FAQ tidak bisa dijangkau lewat header, dan tidak ada tautan ke Ruang Belajar. Pengguna hanya bisa menggulir.

Perbaikan: tombol menu (ikon tiga garis, `aria-expanded`, `aria-controls`) yang membuka daftar tautan layar penuh berlatar #080808, tertutup dengan Escape, fokus dikembalikan ke tombol. Tinggi tombol minimal 44 px. Hormati `prefers-reduced-motion`.

### F3 · Pastel dan warna tambahan (T)

PRD: tanpa pastel di mana pun, hanya hitam, putih, abu, cyan; hijau dan merah hanya untuk benar/salah dan status.

Ruang Belajar (`belajar/ruang.css` baris 4, `belajar/index.html`, `belajar/pelajaran.html`) mendefinisikan `--mint #5BE49B`, `--amber #FFC857`, `--violet #B9A5FF` dan memakainya untuk:
- lencana GRATIS (mint) dan SEGERA (violet) pada kartu level, `index.html` baris 26–27;
- bingkai dan tulisan SELESAI pada pelajaran yang tuntas (mint), baris 46–47;
- pil jenis pelajaran (violet), pil XP (amber), pil selesai (mint), skor (amber), label DRAF (amber), tombol "tandai selesai" saat aktif (mint), pesan status (mint), di `pelajaran.html` baris 16–18, 25, 42, 48, 52;
- pesan ekspor/impor (mint), `index.html` baris 67.

Landing: lima variabel pastel `--sky #DDF6FD`, `--violet #E9E3FF`, `--mint #DDF5E6`, `--amber #FFEFC9`, `--coral #FFE1DD` di baris 32 tidak dipakai di mana pun (kode mati), dan terminal ilustrasi memakai `#FFC857` dan `#5BE49B` di baris 258.

Perbaikan (A4): hapus variabel pastel; badge, level, dan progres memakai latar #141414 atau putih dengan teks cyan/putih dan garis cyan. Hijau/merah (nilai yang sudah ada: #5BE49B hijau, #FF8A80 merah) tetap hanya pada pilihan jawaban benar/salah dan pesan galat. Terminal memakai cyan, putih, dan abu.

Cara uji: cari `--sky|--violet|--mint|--amber|--coral|FFC857` di berkas HTML dan CSS; hasilnya harus kosong kecuali hijau/merah status yang disengaja.

Status (A4, 22 Nov): selesai. Variabel `--sky/--violet/--mint/--amber/--coral` dihapus dari landing; `ruang.css` kini hanya `--ok` (hijau, jawaban benar) dan `--bad` (merah, jawaban salah dan galat). Badge GRATIS, pil XP, SELESAI, label Draf, skor, pesan status, dan bingkai pelajaran tuntas memakai cyan, putih, atau garis abu; badge SEGERA berupa garis abu. Terminal ilustrasi memakai cyan, putih, abu. Penanda `mark` di kebijakan privasi (kuning pastel) diganti cyan.

### F4 · Rotasi otomatis tanpa jeda (T)

Bukti: `index.html` baris 665, `setInterval(... setStep((cur+1)%3) ..., 2600)` berganti tahap tiap 2,6 detik selama bagian terlihat, dan hanya berhenti 8 detik setelah klik. Tidak ada tombol jeda, tidak berhenti saat kursor atau fokus keyboard ada di dalam bagian itu. Melanggar WCAG 2.2.2 (Pause, Stop, Hide) karena berjalan lebih dari 5 detik, dan pembaca layar mendapat perubahan `aria-selected` tanpa aksi pengguna.

Perbaikan: hentikan rotasi otomatis saat `:hover`, `:focus-within`, dan setelah interaksi pertama; tambahkan tombol Jeda/Putar yang terlihat (≥44 px); rotasi tetap mati pada `prefers-reduced-motion` (sudah). Pertimbangkan ganti ke rotasi sekali per masuk layar.

### F5 · Area ketuk di bawah 44 px (S)

Terukur di 1440 dan 390 px (lebar × tinggi):
- Landing: tautan header Cara belajar, Level, Modul 1, FAQ (26 px tinggi) dan merek NERUVIA (27); chip jalur formulir (41); kotak centang persetujuan (19×19); tautan footer Level (24–28); tautan inline "Kebijakan Privasi" (17, tautan dalam kalimat sehingga boleh, tetapi tautan terpisah di footer 24 px perlu diperbesar).
- Ruang Belajar: tombol filter Semua/Gratis/Segera (42), "← Beranda" (41), Ekspor/Impor progres (42), merek (22), kartu pelajaran (42).
- Pelajaran: "← Ruang belajar" (41), breadcrumb (22), merek (22).
- Kebijakan privasi: seluruh daftar isi (22 px) dan tombol kembali (43).
- Terima kasih: merek (23), "← Beranda" (43).

Perbaikan: `min-height:44px` dan padding vertikal pada tautan navigasi dan footer, tautan merek dibungkus area 44 px, kotak centang diperluas lewat label (area ketuk label ≥44 px), chip dan filter naik ke 44 px.

### F6 · Tablist tahap belajar (S)

Bukti: `index.html` baris 385–388 memakai `role="tablist"` dan `role="tab"`, tetapi (a) tidak ada `role="tabpanel"` dan `aria-controls` (diukur: 0 tabpanel), (b) ketiga tab `tabindex=0` sehingga Tab melewati ketiganya, dan panah kanan tidak memindahkan fokus atau pilihan (diuji: `ArrowRight` tidak mengubah apa pun), (c) isi tahap berada di dalam tombol itu sendiri. Pola ARIA tab menuntut panah kiri/kanan, Home/End, dan roving `tabindex`.

Perbaikan: pilih satu — (1) lengkapi pola tab penuh (panel, `aria-controls`, `aria-labelledby`, roving `tabindex`, panah, Home, End) atau (2) lebih sederhana: buang peran tab dan jadikan tiga kartu daftar biasa dengan penanda "aktif" lewat `aria-current`. Opsi 2 lebih cocok karena isinya statis dan rotasi otomatis dihapus pada F4.

Carousel level (`#rail`): sudah wilayah yang bisa difokus (`tabindex=0`, `role=region`, label) dengan panah kiri/kanan, dan tombol ← → berlabel. Kekurangan: tombol tidak berubah status di ujung dan kartu tidak bisa difokus satu per satu. Cukup tambahkan `aria-disabled` di ujung dan perbarui label wilayah; tidak wajib.

### F7 · Kontras dan ukuran huruf (S)

Kontras terhitung (latar efektif diperhitungkan):
- Kebijakan privasi: nomor bagian 01–10 berwarna #888888 di atas putih, 3,54:1 pada 13 px, gagal AA (butuh 4,5:1). Ganti ke #666666 (5,74:1).
- Ruang Belajar dan pelajaran: tidak ada kegagalan terukur pada teks isi. Teks sekunder #B5B5B5 dan #8F8F8F di atas #0E0E0E sudah lulus.
- Landing: pengukur menandai teks navigasi (nilai tidak valid karena latar header berubah lewat kode saat menggulir, kemungkinan positif palsu) dan teks marquee dekoratif yang `aria-hidden`. Perlu verifikasi manual nav terang/gelap di A4 dengan tangkapan layar tiap bagian: teks header hitam di atas bagian gelap berisiko gagal bila latar header transparan.
- Aturan cyan PRD: cyan sebagai teks hanya di atas #080808. Periksa ulang tombol ghost dan tautan yang berwarna cyan di bagian terang.

Ukuran huruf: lencana dan pil Silkscreen di Ruang Belajar 11 px (GRATIS, SEGERA, KONSEP, 10 XP, SELESAI). Naikkan ke minimal 12 px.

Status (A4, 22 Nov): selesai. Nomor bagian kebijakan privasi #888 diganti #666 (5,74:1). Lencana dan pil naik ke 12 px. Teks navigasi landing diukur ulang dengan sampel piksel di setiap posisi gulir (1440 dan 390 px, tiap 100 px): rasio terendah 11,55:1, jadi temuan awal adalah positif palsu dan tidak ada perubahan header. Pemindai kontras terhitung pada lima halaman, juga pada keadaan jawaban benar/salah dan pelajaran tuntas: tidak ada kegagalan AA tersisa.

### F8 · Fokus kolom isian (R)

Bukti: `index.html` baris 179, `input:focus{outline:none;box-shadow:0 0 0 4px rgba(56,225,255,.35)}` ditambah `border-color` hitam. Batas hitam 1 px di atas putih sudah memberi kontras, tetapi cincin cyan 35% tidak memenuhi 3:1 pada putih. Perbaikan: tebalkan border fokus menjadi 2 px #080808 atau pakai `outline:2px solid #080808`.

### F9 · Halaman pendukung (R)

- `terima-kasih.html` dan `kebijakan-privasi.html` tidak punya tautan lompat.
- `belajar/pelajaran.html` dan `terima-kasih.html` tidak punya meta description (halaman noindex, dampak kecil).
- `belajar/index.html` dan pelajaran tidak punya `theme-color` dan footer; tidak wajib.
- Landing belum punya `og:image`, `canonical`, dan `robots.txt`/`sitemap.xml` (Paket H1).

### F10 · Font cadangan (R)

Font terpakai sesuai PRD: Space Grotesk, Space Mono, Silkscreen. Arial hanya muncul pada input honeypot tersembunyi dan input berkas `.sr` yang disembunyikan; tidak terlihat pengguna. Tidak perlu tindakan.

## Yang sudah baik (jangan dirusak)

- Nol galat konsol, nol permintaan gagal, nol luapan horizontal (1440 dan 390 px) pada kelima halaman.
- Satu `h1` per halaman, urutan heading logis, `lang="id"`, semua `img` ber-`alt`, tidak ada `id` ganda.
- Cincin fokus terlihat (outline 2–3 px) pada tautan, tombol, ringkasan FAQ, chip, dan tombol kirim; tautan lompat berfungsi.
- `prefers-reduced-motion` mematikan animasi di landing; galeri dan pelajaran hanya memakai transisi dan sudah dimatikan.
- Anonimitas terjaga: tidak ada nama atau bio pembuat di halaman yang diaudit. Neru satu-satunya maskot. Tidak ada statistik karangan.
- Galeri dan pelajaran terbaca baik di 390 px; teks tidak terpotong dan tombol tidak tumpang tindih.

## Urutan penanganan yang disarankan

1. A2: perbaiki celah teratas, yaitu F2 (menu mobile) bersama bagian tampilan F4 (jeda rotasi) bila muat; atau F2 saja bila terlalu besar.
2. A3: ukuran area ketuk (F5) dan penyelesaian menu mobile.
3. A4: hapus pastel (F3) dan kontras (F7).
4. A5: tablist, carousel, dan fokus (F6, F8).
5. F1 menunggu keputusan Master sebelum merge ke `main`.
