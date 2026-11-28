# H3: tautan kecil ke Ruang Belajar dari landing

Min 29 Nov 2026. Hanya branch `dev`.

## Rencana
Satu tautan "Intip ruang belajar (pratinjau)" di landing menuju `belajar/`, tanpa mengubah hero. Bukti: gerbang penuh sebelum dan sesudah, tangkapan layar lima lebar, ukur muat dan CLS, satu alat uji dengan kasus negatif.

## Yang diubah
- `index.html`: satu elemen `<a class="peek" href="belajar/">` di bawah daftar pelajaran pada bagian "Intip modul 1" (`#modul-d`), plus dua aturan CSS. Teks tinta di atas putih, garis bawah cyan 3 px (cyan tidak dipakai sebagai warna teks), tinggi 48 px. Tanpa JavaScript baru dan tanpa animasi baru; tautan muncul bersama daftar pelajaran.
- `vercel.json`: dibuat ulang (hanya hash `style-src` beranda yang berubah).
- `tools/uji-tautan-belajar.mjs`: alat uji baru.

Alasan tempat: tautan berada tepat sesudah pembaca melihat daftar isi modul 1, dan tombol hero "Lihat isi modul 1" sudah mengarah ke bagian itu. Header, menu HP, dan footer tidak diubah.

Href relatif `belajar/` dipilih supaya jalan di Vercel dan di subfolder (GitHub Pages proyek).

## Sebelum dan sesudah

### Tata letak (gerak dikurangi, tinggi dalam px)
| Lebar | Hero (piksel) | Bagian modul sebelum → sesudah | Tinggi halaman sebelum → sesudah | Gulir ke samping |
|---|---|---|---|---|
| 360 | identik | 1547,1 → 1609,1 | 7106 → 7168 | tidak ada |
| 390 | identik | 1479,5 → 1541,5 | 6787 → 6849 | tidak ada |
| 768 | identik | 1283,1 → 1345,1 | 6398 → 6460 | tidak ada |
| 1024 | identik | 829,5 → 891,5 | 4969 → 5031 | tidak ada |
| 1440 | identik | 935,6 → 997,6 | 5944 → 6006 | tidak ada |

"Identik" berarti tangkapan layar pertama halaman (sebelum digulir) tidak berbeda satu piksel pun. Jumlah tautan beranda 21 → 22. Tanpa galat konsol.

### Muat beranda (`tools/ukur-muat.mjs`, median 3 putaran, server lokal, jaringan dibatasi)
| Profil | LCP ms | CLS | Permintaan | Bobot total KB |
|---|---|---|---|---|
| desktop 1440 | 700 → 688 | 0,00018 → 0,00018 | 30 → 30 | 1017,1 → 1017,5 |
| tablet 768 | 516 → 504 | 0 → 0 | 30 → 30 | 1764,5 → 1764,9 |
| HP 390 | 1460 → 1456 | 0 → 0 | 30 → 30 | 1764,5 → 1764,9 |

Selisih LCP berada dalam ragam antar putaran, jadi dibaca sebagai "tidak berubah". `index.html` bertambah 406 byte (67.025 → 67.431). Di profil HP, permintaan yang selesai sebelum LCP berubah 8 → 7 (182,9 → 145,2 KB); ini urutan selesai yang bergantung waktu, bukan akibat tautan.

CLS dengan font ditunda 1,5 detik (`tools/ukur-cls-font.mjs`, lima lebar): sama persis sebelum dan sesudah, maksimum 0,0019.

### Gerbang
| Alat | Sebelum | Sesudah |
|---|---|---|
| `uji-keamanan.mjs` (penuh) | 906 lulus, 0 gagal | 907 lulus (908 setelah berkas laporan ikut dipindai), 0 gagal |
| `validasi-kursus.mjs` | 3 level, 30 pelajaran | sama |
| `uji-semua.mjs --lengkap` | 8 dari 8 langkah | 8 dari 8 langkah |
| `uji-aset.mjs` | 72 kasus lulus | 72 kasus lulus |
| `buat-vercel-json.mjs --cek` | sesuai | sesuai |
| `uji-seo.mjs` | 357 lulus | 357 lulus |
| `buat-seo.mjs --cek` | sesuai | sesuai |
| `uji-header-csp.mjs` | 216 lulus | 216 lulus |
| `uji-gerak.mjs` | 22 lulus, 46 uji mandiri | sama |
| `uji-404.mjs` | 727 lulus | 727 lulus |
| `uji-tautan-belajar.mjs` | belum ada | 340 lulus, 0 gagal (39 kasus negatif) |

## Isi uji baru
- Statis (14 kode, T01–T14): tepat satu tautan, href dan teks persis, hanya di `#modul-d`, atribut hanya `class` dan `href`, warna dan tinggi, tujuan ada, `noindex`, jalan pulang, tidak masuk sitemap.
- 39 kasus negatif atas salinan teks di memori, termasuk `javascript:`, `data:`, host luar, protokol-relatif, karakter bidi, `onclick`, `ping`, tautan di komentar atau skrip, dan CSS yang menyembunyikan.
- Browser dengan header `vercel.json`: 360, 390, 768, 1024, 1440 px; gerak menyala dan dikurangi; ketuk atau klik; jalan pulang dan tombol kembali; Tab, Shift+Tab, Enter, cincin fokus; tanpa JavaScript; subfolder; menu HP terbuka; lima kontrol negatif.
- Dengan gerak menyala, tautan tampak utuh, tidak tertutup, dan setinggi minimal 43,5 px sepanjang gulir 62% (1024 px) sampai 90% (768 px) tinggi layar.

## Temuan selama pengerjaan
1. Versi pertama setinggi 44 px menyusut menjadi 41,6–43,4 px saat transisi antarbagian mengecilkan bagian (skala sampai 0,94). Diperbaiki menjadi 48 px.
2. Satu kasus negatif awalnya merusak aturan CSS lain (teks acuannya tidak unik) sehingga tidak teruji. Acuannya diperbaiki.
3. **Fokus tertutup (untuk H5, belum diperbaiki):** bila bagian berikutnya sudah naik menutupi elemen yang masih berada di area layar, lalu pengguna kembali ke elemen itu dengan Shift+Tab, peramban tidak menggulir dan fokusnya tidak terlihat. Pada tautan baru ini terjadi bila posisinya di bagian atas layar: di desktop tertutup lembar FAQ (sebagian sampai seluruhnya, hingga sekitar 38% tinggi layar pada 1024×900), dan pada posisi paling atas (5%) sebagian tertutup di semua ukuran yang diuji, termasuk HP, tempat header tetap berada. Cacat yang sama sudah ada sebelum H3: pada `dev` sebelum perubahan, pertanyaan FAQ terakhir tertutup seluruhnya (0 dari 5 titik) di 1024×900 dan 1440×900. Perbaikannya sebaiknya satu aturan untuk semua elemen di H5, bukan tambalan pada satu tautan.

## Yang tidak diperiksa
- URL deploy Vercel yang sebenarnya (run otomatis tidak memakai konektor Vercel dan alamatnya tidak tercatat di repo).
- Safari, Firefox, perangkat fisik, dan pembaca layar. Semua uji memakai Chromium.
- Isi Ruang Belajar di balik tautan tidak diaudit ulang di run ini selain galeri termuat.
- Tidak ada pengukuran apakah pengunjung memakai tautan (situs tanpa analitik).

## Perlu Master
Lihat `PERLU-KEPUTUSAN.md` butir H3.
