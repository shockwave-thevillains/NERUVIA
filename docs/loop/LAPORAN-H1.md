# Laporan H1: meta tag, Open Graph, robots.txt, sitemap.xml

Dikerjakan Sab 28 Nov 2026. Klaim lama (Sel 24 Nov 17:55 WIB) basi tanpa commit, jadi diklaim ulang 06:47 WIB.

## 1. Ringkasan
- `robots.txt` terbit: semua boleh dirayapi, tanpa `Disallow`.
- `sitemap.xml`, `canonical`, `og:url`, dan `og:image` **belum terbit**. Keempatnya butuh alamat mutlak, dan alamat resmi situs belum diputuskan (PRD pertanyaan 4). Alat tidak menebak alamat. Isi satu baris di `tools/seo-situs.json`, jalankan `node tools/buat-seo.mjs`, lalu commit (PERLU-KEPUTUSAN butir 17).
- Beranda mendapat `og:site_name`. Dua halaman alat video, yang ikut terbit (butir 13), mendapat `noindex, nofollow`.
- Kartu pratinjau tautan 1200x630 (86,2 KB) disusun dari aset merek yang ada: logo NV, Neru pose miring, judul yang sudah tampil di beranda. Menunggu persetujuan.

## 2. Rencana dan bukti yang dikumpulkan
Ukur meta tiap halaman dan muat beranda tiga putaran sebelum dan sesudah; baca sumber resmi; satu pengaturan dan satu generator; uji negatif, uji mutasi, simulasi alamat terisi; bandingkan tangkapan layar piksel demi piksel.

## 3. Sumber (diakses 28 Nov 2026, parafrase)
| No | Sumber | Yang dipakai | Cara baca |
|---|---|---|---|
| 1 | Google, spesifikasi robots.txt (diperbarui 27 Okt 2026), https://developers.google.com/search/reference/robots_txt | Hanya berlaku di akar host; baris `Sitemap` harus URL mutlak; 404 berarti tanpa pembatasan; batas 500 KiB; empat bidang didukung | Agen web-fetch (versi zh-TW, diterjemahkan) |
| 2 | Google, blokir pengindeksan dengan noindex (10 Des 2025), https://developers.google.com/search/docs/advanced/crawling/block-indexing | Halaman yang diblokir robots.txt tidak pernah terbaca `noindex`-nya; `noindex` di robots.txt tidak didukung | Agen web-fetch |
| 3 | Google, URL kanonis (10 Jul 2026), https://developers.google.com/search/docs/advanced/guidelines/duplicate-content | Canonical sebaiknya mutlak; jangan beda antara sitemap dan canonical; robots.txt bukan alat kanonisasi | Agen web-fetch |
| 4 | sitemaps.org, protokol (21 Nov 2016), https://sitemaps.org/protocol.html | Tag wajib, namespace, `loc` berprotokol dan kurang dari 2.048 karakter, satu host, escape entitas, UTF-8, 50.000 URL | Agen web-fetch, penuh |
| 5 | Open Graph protocol, https://ogp.me/ | Empat properti wajib (`og:title`, `og:type`, `og:image`, `og:url`); `og:image:alt` dianjurkan; URL http/https | Agen web-fetch, penuh |
| 6 | Meta, gambar pada tautan, https://developers.facebook.com/docs/sharing/webmasters/images | 1200x630 dianjurkan, rasio sekitar 1,91:1, maksimal 8 MB, ukuran diumumkan agar tampil pada bagikan pertama | Agen web-fetch, penuh |
| 7 | X, Cards markup, https://developer.x.com/cards/markup | Jatuh ke `og:*`; gambar di bawah 5 MB, SVG tidak didukung; alt maksimal 420; `twitter:site` disebut wajib | Agen web-fetch, penuh (tanpa tanggal) |
| 8 | Vercel, lingkungan deploy (17 Sep 2026), https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines | Pratinjau diberi `X-Robots-Tag: noindex`; tidak berlaku untuk domain khusus yang dipasang ke branch | Agen web-fetch |

Tidak terbaca: panduan Google "build and submit a sitemap" (ditolak `robots_disallowed`; tidak dicoba lewat jalur lain). Karena itu tidak ada pernyataan tentang `lastmod` atau `priority` menurut Google; sitemap hanya memuat `loc`, yang cukup menurut sumber 4. Claude Academy tidak dipakai (kegiatan ini bukan pelajaran).

Pemeriksaan ulang lima klaim paling berisiko: (a) robots.txt hanya di akar host (sumber 1), (b) `noindex` tidak boleh diblokir (sumber 2), (c) `loc` harus mutlak (sumber 4), (d) empat properti wajib Open Graph (sumber 5), (e) canonical mutlak (sumber 3). Masing-masing dibaca satu kali langsung dari halamannya pada run ini lewat agen; tidak ada bacaan kedua yang terpisah.

## 4. Angka sebelum dan sesudah
Alat: `node tools/uji-seo.mjs --ukur` (tiga putaran, identik pada kedua keadaan).

| Ukuran | Sebelum | Sesudah | Sesudah alamat diisi (simulasi) |
|---|---|---|---|
| `/robots.txt` | 404 | 200 (181 byte) | 200, memuat `Sitemap` |
| `/sitemap.xml` | 404 | 404 (sengaja) | 1 URL (beranda) |
| Properti `og:` di beranda | 4 | 5 | 11 |
| `canonical` di beranda | tidak ada | tidak ada | ada |
| `twitter:card` | tidak ada | tidak ada | `summary_large_image` |
| Halaman HTML terbit tanpa `noindex` selain beranda | 2 | 0 | 0 |

Muat beranda (`tools/ukur-muat.mjs`, median 3 putaran, jaringan dibatasi, server lokal):

| Profil | LCP sebelum / sesudah (ms) | CLS | Bobot total (KB) | Permintaan |
|---|---|---|---|---|
| 1440 | 700 / 696 | 0 / 0 | 1016,97 / 1017,14 | 30 / 30 |
| 768 | 496 / 512 | 0 / 0 | 1764,36 / 1764,53 | 30 / 30 |
| 390 | 1448 / 1448 | 0 / 0 | 1764,36 / 1764,53 | 30 / 30 |

Selisih LCP 768 diulang selang-seling (dua putaran x lima): dasar 496 dan 500, sesudah 500 dan 512; rentang gabungan seluruh putaran itu 484 sampai 536, jadi dianggap derau. Kartu pratinjau tidak diminta saat halaman dimuat.

Tampilan: 14 tangkapan (beranda 390, 768, 1440 layar pertama dan halaman penuh; dua halaman video pada empat lebar) identik piksel demi piksel, nol galat skrip.

## 5. Gerbang dan uji
| Pemeriksaan | Sebelum | Sesudah |
|---|---|---|
| `tools/uji-keamanan.mjs` penuh | 885 lulus | 891 lulus, 0 gagal (keadaan akhir; bertambah karena berkas baru ikut dipindai) |
| `tools/uji-semua.mjs --penuh --lengkap` | 8 dari 8 | 8 dari 8 |
| `tools/uji-aset.mjs` (uji mandiri) | 66 | 72 (6 kasus kartu pratinjau) |
| `tools/uji-seo.mjs` | belum ada | 356 lulus, 163 kasus negatif |
| Uji mutasi (alat dirusak sengaja) | | 31 mutan, 0 lolos (setelah 5 celah uji ditutup) |

Simulasi pada salinan repo dengan alamat fiktif di akar dan di subfolder menjalankan semua gerbang di atas; setelah perbaikan temuan 1 semuanya lulus (uji keamanan 891), kecuali satu kegagalan `uji-header-csp` pada putaran alamat di akar yang tidak terulang (temuan 5).

### Sesudah digabung dengan H2
Run H2 (halaman 404) selesai dan mendorong ke `dev` saat H1 masih dikerjakan. Konflik di `docs/arsitektur.md`, `PERLU-KEPUTUSAN.md`, dan `RUJUKAN.md` diselesaikan dengan menyimpan isi kedua pihak, lalu gerbang diulang pada keadaan gabungan:

| Pemeriksaan | Hasil gabungan |
|---|---|
| `validasi-kursus.mjs`, `buat-seo.mjs --cek`, `buat-vercel-json.mjs --cek` | lulus (7 halaman di `vercel.json`) |
| `uji-keamanan.mjs` penuh | 906 lulus, 0 gagal |
| `uji-semua.mjs --penuh --lengkap` | 8 dari 8 |
| `uji-aset.mjs` (uji mandiri) | 72 lulus |
| `uji-seo.mjs` | 357 lulus, 0 gagal |
| `uji-404.mjs` | 727 lulus, 0 gagal |
| `uji-header-csp.mjs`, 4 putaran | 1 putaran lulus (216); 3 putaran punya 1 sampai 2 kegagalan "tampilan berbeda" di lebar 390 pada penampil pelajaran dan terima kasih, dua halaman yang tidak diubah H1 |
| `uji-header-csp.mjs` pada `dev` berisi H2 tanpa H1 (commit 0587998), 6 putaran | 3 putaran gagal dengan jenis yang sama |

Simulasi alamat terisi diulang pada keadaan gabungan: `uji-semua` 8 dari 8, `uji-404` 727 lulus, `uji-seo` 356 lulus, semuanya 0 gagal.

## 6. Temuan saat pengerjaan
1. **Bug yang akan muncul saat alamat diisi:** `tools/buat-vercel-json.mjs` menolak `<link rel="canonical">` sebagai sumber luar, sehingga generator header dan uji keamanan berhenti dengan galat. Diperbaiki: hanya `rel` yang persis `canonical` yang diterima (CSP tidak berubah); 11 kasus tolak membuktikan tautan lain tetap ditolak.
2. `tools/uji-aset.mjs` akan menganggap kartu pratinjau sebagai aset yatim; kini rujukan di pengaturan SEO dihitung.
3. `tools/buat-og.mjs` versi awal akan mengikuti tautan simbolik putus saat menulis; diperbaiki sebelum commit.
4. Satu putaran ulang uji mutasi `buat-seo` (dijalankan setelah uji `buat-og` ditambahkan) tidak sah karena satu uji dasar saat itu gagal akibat masukan uji yang keliru. Masukan diperbaiki, skrip mutasi dibuat menolak jalan bila uji dasar gagal, lalu diulang: 31 mutan, 0 lolos.
5. **`tools/uji-header-csp.mjs` tidak stabil** (sudah ada sebelum H1): pada salinan tanpa perubahan, 4 dari 10 putaran punya satu kegagalan "tampilan berbeda" di lebar 390, halamannya berganti-ganti. Tidak diubah dan tidak dilonggarkan (butir 18).

## 7. Yang tidak diperiksa
- Deploy Vercel dan URL pratinjau dev: run terjadwal tidak boleh memakai konektor Vercel dan alamatnya tidak tercatat di repo. Header `X-Robots-Tag` dan penyajian `robots.txt` di sana belum dilihat.
- Tampilan pratinjau tautan di Facebook, WhatsApp, X, atau layanan lain: butuh alamat publik.
- `twitter:site` tidak diisi karena tidak ada akun yang dikonfirmasi; sumber 7 menyebutnya wajib, jadi kartu di X belum pasti tampil.
- Search Console atau pendaftaran sitemap.
- Teks `description` dan `og:description` tidak diubah; keduanya masih memuat klaim "Modul pertama gratis" (butir 1) yang akan tampil di pratinjau tautan.
- `docs/`, `tools/` (selain dua halaman video), dan `supabase/` masih bisa dirayapi bila hosting menyajikannya (butir 13).
