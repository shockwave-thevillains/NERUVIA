# Performa muat landing (Paket B)

Dokumen ini menyimpan angka sebelum dan sesudah tiap kegiatan performa. Alat ukur yang sama dipakai di semua kegiatan: `node tools/ukur-muat.mjs` (server statis lokal tanpa cache, Chromium via Playwright, jaringan dibatasi 1,6 Mbps dan RTT 150 ms lewat CDP; profil HP 390 px, DPR 3, sentuh, CPU 4x lebih lambat; profil desktop 1440 px, DPR 1). Angka di bawah adalah median dari 3 putaran, dan tiap sel diulang pada 3 gelombang terpisah (total 9 putaran per kondisi) untuk melihat sebaran.

Catatan metode: LCP dan CLS diambil dari PerformanceObserver di halaman; "sebelum LCP" menghitung sumber daya yang `responseEnd`-nya sebelum waktu LCP (ukuran = transferSize); "Neru live" ialah saat kelas `live` pada `#neru` muncul (canvas animasi menggantikan gambar diam). Ini ukuran laboratorium di mesin sandbox, bukan data pengguna sungguhan; bandingkan hanya antar baris di dokumen ini.

## B1 — Lazy-load frame Neru dan prioritas muat (22 Nov 2026)

### Masalah yang terukur
Skrip hero membuat 21 objek `Image` sekaligus saat skrip dijalankan. Akibatnya 21 frame (HP: `frames-2x` 2.511 KB; desktop: `frames` 768 KB) berebut bandwidth dengan gambar hero (`neru.webp`, elemen LCP di HP) dan font, serta menahan event `load` sampai semuanya turun.

### Perubahan (`index.html`, satu commit)
1. Frame baru diminta setelah event `load`, lewat `requestIdleCallback` (batas tunggu 2,5 dtk; cadangan `setTimeout` 300 ms), dengan `fetchPriority='low'`.
2. Dilewati sama sekali bila `navigator.connection.saveData` atau `effectiveType` berakhiran `2g`: Neru tetap gambar diam.
3. Tab yang sedang tersembunyi menunggu sampai terlihat sebelum memuat.
4. `link rel=preload` gambar hero diberi `fetchpriority="high"` (sejalan dengan `<img>`-nya); `neru-wave.webp` (sudah `loading="lazy"`) diberi `decoding="async"`.
5. Perbaikan galat laten: sebelumnya bila satu frame gagal dimuat, animasi sway tetap berjalan dan `drawImage` melempar `InvalidStateError` tiap frame animasi. Kini menggambar hanya setelah semua frame siap (`ready`), dan gerak mouse sebelum frame siap tidak lagi memanggil `drawImage` pada gambar yang belum ada.
6. `vercel.json` dibuat ulang (hash blok skrip berubah).

### Angka (median; tiga gelombang dipisah dengan " | ")
| Ukuran | Desktop 1440 sebelum | Desktop 1440 sesudah | HP 390 sebelum | HP 390 sesudah |
|---|---|---|---|---|
| LCP (ms) | 752 \| 736 \| 752 | 748 \| 744 \| 748 | 3664 \| 3700 \| 3560 | **2240 \| 2236 \| 2224** |
| Elemen LCP | teks hero | teks hero | `neru.webp` | `neru.webp` |
| CLS | 0 | 0 | 0 | 0 |
| Event load (ms) | 6315 \| 6314 \| 6315 | **2332 \| 2331 \| 2332** | 15349 \| 15311 \| 15343 | **2338 \| 2340 \| 2340** |
| Frame diminta sebelum LCP | 0 | 0 | 21 | **0** |
| Permintaan / KB sebelum LCP | 1 / 22 | 1 / 22 | 7 / 223 | 7 / 223 |
| Neru animasi siap (ms) | 6315 | 6586 \| 6602 \| 6629 | 15347 | 15514 \| 15506 \| 15449 |
| Total permintaan / KB sampai siap | 30 / 1.188 | 30 / 1.189 | 30 / 2.931 | 30 / 2.932 |

Pembacaan jujur:
- HP: LCP turun sekitar 39% (3,66 dtk menjadi 2,24 dtk) dan event load turun dari 15,3 dtk menjadi 2,3 dtk, karena gambar hero tidak lagi berebut dengan 21 frame.
- Desktop: LCP tidak berubah (elemen LCP-nya teks, bukan gambar), tetapi event load turun dari 6,3 dtk menjadi 2,3 dtk.
- Harga yang dibayar: animasi menoleh menyala sekitar 0,2 sampai 0,3 dtk lebih lambat (di jaringan lambat ini), dan tidak sama sekali di mode hemat data/2G. Total bobot tidak berubah pada jaringan normal; ia hanya digeser ke setelah halaman siap.
- Bobot HP tetap 2,5 MB untuk frame. Mengurangi bobot (ukuran dan format gambar) ada di B2; `neru.webp` 1024 px yang tampil sekitar 360 px CSS juga masuk B2.
- Tampilan: tangkapan layar reduced-motion sebelum dan sesudah identik piksel pada 1440 dan 390 px; keadaan animasi menyala dilihat langsung (kucing tampil, canvas terisi).

### Uji
`node tools/uji-muat-neru.mjs`: 48 pemeriksaan lulus (4 statis; per profil desktop dan HP: tidak ada frame sebelum load, 21 frame, folder sesuai kerapatan layar, prioritas rendah, animasi menyala, lebar canvas, canvas terisi, tanpa galat; negatif: reduced-motion, JS mati, saveData, 2g, slow-2g, satu frame 404, semua frame dibatalkan, isi frame rusak, mouse digerakkan sebelum frame siap, tab tersembunyi lalu terlihat, nilai `connection` janggal termasuk string 1 MB dan HTML). Uji mutasi: dijalankan terhadap `index.html` lama, 13 pemeriksaan gagal (termasuk `InvalidStateError`), jadi uji benar-benar menangkap kondisi lama. Uji lain: `validasi-kursus` lulus, `uji-impor-progres` lulus, `uji-header-csp` 201 lulus (nol pelanggaran CSP), `uji-keamanan` 653 pemeriksaan lulus, 0 gagal.

### Belum terverifikasi
- Angka dari sandbox dengan jaringan buatan; belum ada pengukuran di perangkat nyata atau di Vercel (HTTP/2/3 dan kompresi bisa mengubah selisih absolut).
- `fetchPriority` pada `Image` hanya berpengaruh di browser yang mendukungnya (Chromium; di lainnya diabaikan, sisanya tetap berlaku karena penundaan sampai setelah load).
- Safari tidak punya `requestIdleCallback`, jalur cadangan `setTimeout` tidak diuji di WebKit.

### Untuk B2 dan B3
- B2: bobot frame HP (2,5 MB), ukuran `neru.webp` (1024 px untuk tampilan sekitar 360 px CSS), preload font lain.
- B3: pakai `tools/ukur-muat.mjs` yang sama; simpan hasilnya sebagai bagian baru di dokumen ini.


## B2 — Audit aset penuh dan optimasi muat (22 Nov 2026)

### Rencana dan bukti yang dikumpulkan
Rencana: (1) ukur dasar dengan alat yang sama; (2) inventaris semua aset dan buktikan mana yang tidak dirujuk; (3) font: fallback bermetrik, preload hanya bila terbukti membantu; (4) gambar: varian responsif, AVIF dengan WebP cadangan, ukuran eksplisit; (5) tingkat frame menengah untuk HP dan tablet; (6) alat uji aset dengan anggaran; (7) regenerasi CSP dan gerbang penuh; (8) ukur ulang dan bandingkan. Bukti: tabel di bawah, 9 putaran dasar dan 3 sampai 6 putaran sesudah per sel, tangkapan layar 18 halaman-lebar sebelum dan sesudah dibandingkan per piksel, tiga alat baru.

Perubahan alat ukur: `tools/ukur-muat.mjs` kini punya profil `tablet768` (768 px, DPR 2, sentuh, CPU 2x lebih lambat) dan opsi `--profil`. Alat baru: `tools/inventaris-aset.mjs`, `tools/ukur-cls-font.mjs`, `tools/uji-aset.mjs`.

### (a) Inventaris dan aset tanpa rujukan
Sebelum perubahan (dasar), dari `node tools/inventaris-aset.mjs --dinamis`:

| Berkas | Berkas (n) | Ukuran (KB) | Dirujuk oleh (HTML/CSS/JS di luar docs) |
|---|---|---|---|
| assets/maskot-animasi/neru-menoleh-web.webp | 1 | 5391 | **tidak ada** |
| assets/maskot-animasi/neru-menoleh-sumber.mp4 | 1 | 3077 | **tidak ada** |
| assets/maskot-animasi/frames-2x/f00..f20.webp | 21 | 2505 | index.html |
| assets/brand/maskot/neru-terbaru-02-depan.png | 1 | 1424 | **tidak ada** |
| assets/brand/maskot/neru-terbaru-01-miring-kanan.png | 1 | 1377 | **tidak ada** |
| assets/brand/maskot/neru-terbaru-03-miring-kiri.png | 1 | 1329 | **tidak ada** |
| assets/maskot-animasi/frames/f00..f20.webp | 21 | 762 | index.html |
| assets/maskot-animasi/neru-menoleh.webm | 1 | 714 | **tidak ada** |
| assets/neru.webp | 1 | 140 | index.html |
| assets/neru-wave.webp | 1 | 136 | index.html |
| assets/brand/neruvia-icon-cyan-1024.png | 1 | 32 | **tidak ada** |
| assets/fonts/SpaceGrotesk-latin.woff2 | 1 | 22 | belajar/ruang.css, index.html, kebijakan-privasi.html, terima-kasih.html |
| assets/vendor/lenis-1.3.27.min.js | 1 | 18 | index.html |
| assets/fonts/SpaceMono-700-latin.woff2 | 1 | 16 | index.html |
| assets/fonts/SpaceMono-400-latin.woff2 | 1 | 16 | belajar/ruang.css, index.html, kebijakan-privasi.html, terima-kasih.html |
| assets/brand/neruvia-icon-dark-512.png | 1 | 14 | **tidak ada** |
| assets/brand/neruvia-icon-cyan-512.png | 1 | 14 | **tidak ada** |
| assets/fonts/Silkscreen-400-latin.woff2 | 1 | 8.2 | belajar/ruang.css, index.html |
| assets/fonts/Silkscreen-700-latin.woff2 | 1 | 7.3 | index.html |
| assets/brand/neruvia-logo-dark.svg | 1 | 4.6 | **tidak ada** |
| assets/brand/neruvia-logo-light.svg | 1 | 4.6 | **tidak ada** |
| assets/brand/neruvia-icon-cyan-180.png | 1 | 4.6 | index.html |
| assets/vendor/LENIS-LICENSE.txt | 1 | 1.1 | **tidak ada** |
| assets/brand/neruvia-icon-cyan.svg | 1 | 0.4 | admin/index.html, belajar/index.html, belajar/pelajaran.html, index.html, kebijakan-privasi.html, terima-kasih.html |
| assets/brand/neruvia-icon-dark.svg | 1 | 0.4 | **tidak ada** |
| assets/brand/neruvia-mark-cyan.svg | 1 | 0.4 | **tidak ada** |
| assets/brand/neruvia-mark-ink.svg | 1 | 0.4 | **tidak ada** |

Total berkas aset: 67, 17019 KB. Tanpa rujukan: 15 berkas, 13384 KB.

Aset yang benar-benar diminta per halaman (Chromium, desktop 1440, tunggu 6 dtk setelah load)

| Halaman | Aset diminta | Total (KB) | Setelah event load? |
|---|---|---|---|
| index.html | assets/fonts/SpaceGrotesk-latin.woff2<br>assets/neru.webp<br>assets/vendor/lenis-1.3.27.min.js<br>assets/fonts/SpaceMono-700-latin.woff2<br>assets/fonts/SpaceMono-400-latin.woff2<br>assets/fonts/Silkscreen-400-latin.woff2<br>assets/neru-wave.webp<br>assets/maskot-animasi/frames/f*.webp x21 | 1126 | 21 dari 28 |
| belajar/index.html | assets/fonts/SpaceGrotesk-latin.woff2<br>assets/fonts/SpaceMono-400-latin.woff2<br>assets/fonts/Silkscreen-400-latin.woff2 | 47 | 0 dari 3 |
| belajar/pelajaran.html | assets/fonts/SpaceGrotesk-latin.woff2<br>assets/fonts/SpaceMono-400-latin.woff2 | 38 | 0 dari 2 |
| terima-kasih.html | assets/fonts/SpaceGrotesk-latin.woff2<br>assets/fonts/SpaceMono-400-latin.woff2 | 38 | 0 dari 2 |
| kebijakan-privasi.html | assets/fonts/SpaceMono-400-latin.woff2<br>assets/fonts/SpaceGrotesk-latin.woff2 | 38 | 0 dari 2 |
| admin/index.html | assets/fonts/SpaceGrotesk-latin.woff2<br>assets/fonts/SpaceMono-400-latin.woff2 | 38 | 0 dari 2 |


Bukti tidak ada rujukan: pencarian teks nama berkas di semua HTML, CSS, JS, JSON, dan SVG di luar `docs/`, `tools/`, `supabase/` (`tools/inventaris-aset.mjs`), ditambah `grep -rln` di seluruh repo: tujuh berkas berat hanya disebut di `README.md` dan `docs/loop/BACKLOG.md`. Admin memakai satu elemen `<video>`, tetapi sumbernya dari Supabase Storage, bukan dari `assets/`. Tindakan: `.vercelignore` memuat tujuh berkas (`neru-menoleh-web.webp`, `neru-menoleh-sumber.mp4`, `neru-menoleh.webm`, tiga PNG `assets/brand/maskot/`, `neruvia-icon-cyan-1024.png`), total 13.343 KB (13,0 MB), berkas tetap ada di repo sebagai sumber. Aset tanpa rujukan yang kecil (logo, ikon SVG dan PNG ≤ 15 KB, lisensi Lenis) sengaja dibiarkan terbit: mereka bagian dari kit merek dan nyaris tanpa bobot. Keputusan soal `docs/`, `tools/`, `supabase/` tidak diambil (PERLU-KEPUTUSAN butir 13).

Catatan yang belum terbukti: dokumentasi Vercel tentang `.vercelignore` (dibaca 22 Nov 2026) tidak menyebut apakah berkas itu berlaku untuk deploy lewat integrasi Git atau hanya unggahan CLI. Efeknya pada deploy dev harus dicek Master di dashboard (daftar berkas deploy). Bila tidak berlaku, tidak ada yang rusak: aset tersebut tidak dirujuk halaman mana pun, hanya tetap terbit.

### (b) Font
- Kelima berkas woff2 dipakai oleh deklarasi `@font-face`, tetapi `Silkscreen-700` dan `SpaceMono-700` hanya diunduh bila ada teks yang memintanya: pada beranda desktop `Silkscreen-700` tidak pernah diminta (0 permintaan dalam inventaris dinamis), jadi berkasnya (7,3 KB) disimpan sebagai cadangan, tanpa biaya muat.
- Semua `@font-face` sudah `font-display:swap` (diperiksa `uji-aset.mjs`, kode FONT_DISPLAY).
- Beranda: `SpaceGrotesk-latin.woff2` sudah dipreload dengan `crossorigin`. Diukur apakah preload itu menolong (5 putaran per sel, 1,6 Mbps): dengan preload FCP desktop 492 ms dan LCP 732 ms; tanpa preload FCP 352 ms dan LCP 872 ms; HP LCP 1484 versus 1428 ms (dalam sebaran). Karena LCP desktop beranda adalah judul tebal Space Grotesk, preload dipertahankan di beranda.
- Halaman kecil (belajar, pelajaran, terima kasih, kebijakan privasi, admin): preload font DICOBA lalu DIBATALKAN. Pengukuran terpisah pada `terima-kasih.html` (7 putaran, desktop): asli FCP 204 / LCP 204 ms, font tiba 538 ms; dengan preload FCP 288 / LCP 288 ms, font tiba 509 ms. Jadi preload menggeser cat pertama 84 ms untuk menyajikan font hanya 29 ms lebih awal. Tidak dipasang.
- Fallback bermetrik (`size-adjust`, `ascent-override`, `descent-override`) dihitung dari tabel metrik font (fontTools) dan lebar teks nyata situs terhadap Arial (Liberation Sans) dan Courier New: Space Grotesk 400-599 106%, 600-700 100,3%, Space Mono 102%, Silkscreen 113,4%; judul NERUVIA (hanya huruf kapital tebal, 10% lebih sempit dari Arial Bold) diberi fallback sendiri 89,9%. Tiap fallback dibatasi `unicode-range` Latin yang sama dengan berkas font supaya glyph di luar itu (misalnya tanda panah) tetap jatuh ke font sistem seperti sebelumnya; tanpa pembatas ini tanda panah di tombol "← Beranda" berubah bentuk (terdeteksi lewat perbandingan piksel, lalu diperbaiki).
- Fallback hanya dipasang di beranda. Di halaman kecil fallback DICOBA lalu DIBATALKAN: LCP naik 16 sampai 32 ms (belajar 384 menjadi 400 ms, terima kasih 200 menjadi 224 ms) tanpa kebaikan CLS yang terukur (CLS dasarnya sudah ≤ 0,017).

CLS akibat pertukaran font dengan font ditunda 1,5 dtk (`node tools/ukur-cls-font.mjs`, 5 halaman x 3 lebar, median 3 putaran, reduced-motion):

| Halaman | 390 | 768 | 1440 |
|---|---|---|---|
| / (beranda) | 0,0030 → 0,0003 | 0,0429 → 0,0331 | 0,0123 → 0,0009 |
| /belajar/ | 0,0426 → 0,0000 | **0,2397 → 0,0022** | 0,0127 → 0,0003 |
| /belajar/pelajaran.html | 0,0003 → 0,0003 | 0,0002 → 0,0002 (satu putaran 0,095 sebelum) | 0,0001 → 0,0001 (satu putaran 0,062 sebelum dan sesudah) |
| /terima-kasih.html | 0,0001 → 0,0001 | 0,0001 → 0,0001 | 0,0002 → 0,0002 |
| /kebijakan-privasi.html | 0,0002 → 0,0002 | 0,0166 → 0,0166 | 0,0007 → 0,0006 |

Nilai maksimum sel 0,2397 menjadi 0,0331; sel di atas 0,01 turun dari 6 menjadi 2. Penyebab terbesar bukan font: di `/belajar/` daftar level dan daftar badge diisi skrip setelah `kursus.json` tiba sehingga bagian di bawahnya melompat. Perbaikan: tinggi `#grid` dipesan selama `aria-busy="true"` (940/690/390 px menurut jumlah kolom) dan `#badges:empty` (350/275/205/130 px menurut lebar), nilainya tinggi terkecil hasil ukur tiap rentang. Residu: beranda 768 px 0,033 (paragraf pembuka berpindah satu baris saat font tiba), kebijakan privasi 768 px 0,017 (daftar isi), dan pelajaran.html kadang melompat 0,06 sampai 0,115 pada satu dari tiga putaran (isi pelajaran dirender setelah fetch; ada juga di dasar, tidak diperparah). Tiga residu ini diserahkan ke B3.

### (c) Gambar
- Varian responsif dibuat dari `neru.webp` dan `neru-wave.webp` (Pillow 12.3, Lanczos): 512 dan 768 px dalam AVIF (kualitas 75, speed 4) dan WebP (kualitas 85); AVIF penuh 1024/1041 px; berkas asli tetap sebagai varian WebP terbesar.
- Perbandingan piksel terhadap hasil perkecil yang sama (komposit di atas putih): `neru` 768 px WebP q85 89 KB, PSNR 39,0 dB; AVIF q75 61 KB, PSNR 39,4 dB (-31% ukuran, mutu setara, selisih alfa maksimum 9 dari 255). `neru` 512 px: WebP 54 KB, AVIF 38 KB (-30%). `neru-wave` serupa (768 px: 84 KB lawan 58 KB). Ambang tugas (turun ≥ 20% tanpa selisih terlihat) terpenuhi, jadi AVIF dipakai dengan `<picture>` dan WebP sebagai cadangan.
- Beranda: `<picture><source type=image/avif srcset sizes>` + `<img srcset sizes width height>`; `sizes` mengikuti CSS (`(max-width:900px) min(64vw,360px), min(39vw,585px)` untuk hero; `clamp` untuk wave). Satu preload hero saja, bertipe AVIF dengan `imagesrcset` dan `imagesizes`: preload WebP tambahan akan membuat browser pendukung AVIF mengunduh dua kali. Hero tetap `fetchpriority=high` dan tidak lazy; wave tetap `loading=lazy`.
- Sebelumnya `<img>` hero dan wave sudah punya `width`/`height` yang benar; `uji-aset.mjs` kini memeriksa keberadaan dan kecocokan rasio (kode IMG_UKURAN, IMG_ASPEK). Gambar lain di halaman (ikon, SVG inline) tidak berupa `<img>` dengan ukuran tak diketahui.
- Frame animasi: tingkat baru `frames-m` (820 x 972, WebP q80, hasil perkecil `frames-2x`; PSNR 40,5 sampai 41,0 dB terhadap versi perkecilannya) untuk kotak Neru 701 sampai 900 piksel fisik (HP dan tablet); `frames-2x` kini hanya di atas 900 piksel (retina desktop). Bobot frame HP 2.511 KB menjadi 1.516 KB (-40%). Hasil tangkapan layar animasi menyala di 390, 768, 1440 piksel diperiksa langsung (kanvas terisi, Neru menoleh, ukuran kanvas 820/820/547).
- Perbandingan tampilan: 18 tangkapan layar (6 halaman x 390/768/1440, reduced-motion, font sudah siap) sebelum dan sesudah: 15 identik piksel (0 piksel berbeda); tiga beranda berbeda hanya di area hero dan wave (resampling AVIF): rata-rata selisih piksel yang berbeda 5,5 sampai 8,2 dari 765, hanya 132 sampai 388 piksel melebihi 90, tidak terlihat mata pada pembesaran.

### (d) vercel.json, CSP, gerbang
`node tools/buat-vercel-json.mjs` dijalankan ulang (hash blok `<style>` beranda dan `/belajar/` berubah); perbedaan `vercel.json` hanya nilai hash (diperiksa lewat diff dengan hash dinormalisasi: tidak ada direktif yang ditambah atau dilonggarkan; `img-src 'self'` sudah mencakup AVIF). `uji-header-csp.mjs` 201 lulus, `uji-keamanan.mjs` penuh (tanpa `--cepat`) 653 lulus sebelum dan 664 sesudah, 0 gagal, `uji-muat-neru.mjs` 90 lulus (dari 48; kasus baru untuk tiga tingkat frame, DPR 1,25 dan 2, tablet, preload tunggal), `validasi-kursus`, `uji-impor-progres` lulus.

### (e) Hasil ukur
Metode sama seperti B1 (server lokal, 1,6 Mbps, RTT 150 ms, CPU 4x lebih lambat untuk HP 390 dan 2x untuk tablet 768). Median per gelombang dari 3 putaran; sebelum = 3 gelombang pada kode lama (9 putaran), sesudah beranda = 2 gelombang (6 putaran) dan sesudah halaman kecil = 1 gelombang (3 putaran; kode halaman kecil berubah setelah gelombang awal, jadi gelombang lama tidak dihitung). Rentang di kurung ialah nilai terendah dan tertinggi antar-gelombang.

| Halaman | Lebar | LCP ms sebelum (rentang) | LCP ms sesudah (rentang) | CLS sebelum | CLS sesudah | KB total sebelum | KB total sesudah | Permintaan sebelum/sesudah | Event load ms sebelum/sesudah |
|---|---|---|---|---|---|---|---|---|---|
| / (beranda) | 1440 | 736 (720-748) | 706 (692-720) | 0.0000 | 0.0000 | 1189 | 1017 (-14%) | 30/30 | 2333/1451 |
| / (beranda) | 768 | 536 (532-556) | 532 (528-536) | 0.0000 | 0.0000 | 2932 | 1764 (-40%) | 30/30 | 2336/1454 |
| / (beranda) | 390 | 2228 (2224-2252) | 1478 (1444-1512) | 0.0000 | 0.0000 | 2932 | 1764 (-40%) | 30/30 | 2343/1457 |
| /belajar/ | 1440 | 384 (380-388) | 380 (380-380) | 0.0130 | 0.0000 | 74 | 75 (+1%) | 7/7 | 777/776 |
| /belajar/ | 768 | 408 (400-412) | 412 (412-412) | 0.0000 | 0.0000 | 74 | 75 (+1%) | 7/7 | 811/809 |
| /belajar/ | 390 | 464 (436-472) | 448 (448-448) | 0.0000 | 0.0000 | 74 | 75 (+1%) | 7/7 | 869/870 |
| /terima-kasih.html | 1440 | 200 (196-208) | 212 (212-212) | 0.0000 | 0.0000 | 43 | 43 (+0%) | 3/3 | 545/547 |
| /terima-kasih.html | 768 | 220 (216-224) | 220 (220-220) | 0.0000 | 0.0000 | 43 | 43 (+0%) | 3/3 | 562/562 |
| /terima-kasih.html | 390 | 292 (272-308) | 268 (268-268) | 0.0000 | 0.0000 | 43 | 43 (+0%) | 3/3 | 628/599 |

Pembacaan: beranda HP LCP 2.228 menjadi 1.478 ms (-34%), bobot total 2.932 menjadi 1.764 KB (-40%), event load 2,34 menjadi 1,46 dtk; Neru animasi siap 15,5 dtk menjadi 9,6 dtk di HP dan 6,6 menjadi 5,7 dtk di desktop. Desktop beranda -14% bobot (1.189 menjadi 1.017 KB), LCP tetap ±720 ms (elemen LCP teks). Halaman kecil tidak berubah dalam batas sebaran (±12 ms, tanpa perubahan bobot selain +1,3 KB CSS di belajar). Jumlah permintaan tetap 30/7/3 karena satu gambar diganti satu gambar. Galat skrip: 0 pada semua putaran. CLS pada muat normal tetap 0 kecuali `/belajar/` desktop yang sebelumnya 0,013 menjadi 0,000.

### (f) Alat uji aset
`node tools/uji-aset.mjs`: memeriksa repo (344 pemeriksaan, 0 pelanggaran) lalu menjalankan 66 kasus uji mandiri di folder sementara (positif, negatif, masukan jahat: jalur keluar akar, `%2e%2e`, byte NUL, jalur Windows, srcset 1 MB, 200.000 tanda `<`, tag tanpa penutup, symlink keluar akar, nama Unicode). Anggaran saat ini: 250 KB per berkas deploy; 380 KB halaman beranda (terukur 330 KB: HTML + CSS + font + skrip + gambar terbesar dalam satu kelompok `<source>`), 130 KB belajar, 150 KB halaman lain (terukur 43 sampai 97 KB); frame 850 KB, 1.700 KB, 2.700 KB per folder (terukur 762, 1.510, 2.505 KB). Uji mutasi pada repo nyata (hapus `width` hero, hapus `.vercelignore`, hapus `frames-m/f07.webp`): semua tertangkap (IMG_UKURAN, ASET_YATIM dan ANGGARAN_BERKAS untuk tujuh aset berat, FRAME_LENGKAP), lalu dipulihkan.

### (g) Tinjauan mandiri dua tahap dan yang tidak diperiksa
Tahap 1 (pembacaan diff sebagai peninjau skeptis): menemukan (i) tanda panah berubah bentuk akibat fallback tanpa `unicode-range` (diperbaiki, 18 tangkapan layar kembali identik); (ii) tiga halaman kecil melambat 16 sampai 32 ms akibat preload font dan fallback (keduanya dibatalkan di halaman itu, diukur ulang); (iii) judul beranda masih melompat karena fallback tebal memakai rasio rata-rata (fallback judul khusus ditambahkan, CLS 1440 px 0,0123 menjadi 0,0009); (iv) pemindai aset awal menghitung dua kali format AVIF dan WebP dalam bobot halaman (digabung per kelompok `<picture>`); (v) pemindai awal menganggap `C:\...` sebagai skema URL (diperbaiki, kasus uji ditambahkan). Tahap 2: seluruh gerbang dijalankan ulang pada kode final (aset 344/66, CSP 201, Neru 90, keamanan 664, kursus, impor), tangkapan layar dibandingkan ulang, ukur-muat dijalankan ulang untuk halaman kecil.

Tidak diperiksa: (1) deploy Vercel yang sebenarnya. RUNBOOK mewajibkan verifikasi di URL deploy READY, tetapi konektor Vercel dilarang pada run otomatis dan URL pratinjau dev tidak tercatat di repo, jadi angka di atas hanya lokal; Master atau sesi interaktif perlu menjalankan `node tools/ukur-muat.mjs` terhadap URL dev (butuh penyesuaian alamat) atau memeriksa lewat dashboard apakah `.vercelignore` berlaku dan kompresi Brotli menurunkan bobot AVIF/WebP lebih jauh; (2) perangkat nyata dan Safari/Firefox (AVIF dan `<picture>` didukung di semua browser modern, tetapi hanya Chromium yang diuji; fallback WebP diuji sebagai kode, bukan di Safari lama); (3) fallback bermetrik dihitung terhadap Arial/Courier New, di Android (Roboto) metriknya tidak diukur; (4) `local()` fallback di macOS/Windows tidak diuji (sandbox Linux memakai Liberation); (5) varian `neru-1024.avif` dan `neru-wave-1041.avif` hanya terpakai pada layar retina besar dan tidak diukur terpisah; (6) JS dimatikan: halaman `/belajar/` dengan `aria-busy` tetap menyisakan ruang kosong sampai 940 px di bawah placeholder (noscript tetap tampil); (7) aset yang dikecualikan lewat `.vercelignore` belum dipastikan benar-benar hilang dari deploy.


## B3 — Pergeseran tata letak sisa dan reduced-motion (22 Nov 2026)

### Rencana dan bukti
Rencana: (1) ukur dasar dengan alat yang sama (CLS dengan font ditunda 3 gelombang x 3 putaran, ditambah sapuan 8 lebar; muat 2 gelombang x 3 putaran untuk 5 halaman x 3 profil; gerbang penuh); (2) selidiki tiga sisa CLS yang diserahkan B2 lewat daftar elemen yang bergeser; (3) perbaiki penyebabnya, bukan gejalanya; (4) uji baru dengan kasus negatif dan uji mutasi terhadap kode lama; (5) ukur ulang dengan alat dan jumlah putaran yang sama; (6) bandingkan 36 tangkapan layar (6 halaman x 6 lebar, reduced-motion, font siap) sebelum dan sesudah; (7) periksa `prefers-reduced-motion` pada 4 halaman x 3 lebar x 2 mode; (8) gerbang penuh sesudah.

### Temuan dan perbaikan
| # | Temuan (terukur) | Penyebab | Perbaikan |
|---|---|---|---|
| 1 | `/belajar/pelajaran.html`: satu dari tiga putaran melompat 0,115 (390 px), 0,095 (768 px), 0,062 (1440 px). Tombol "Tandai selesai" dan navigasi bergeser dari y=627 ke luar layar. | Isi pelajaran diambil lewat fetch kedua; kotak isi bertinggi awal 220 px lalu memanjang ribuan piksel, mendorong tombol dan navigasi yang sudah dicat. Muncul bila cat pertama terjadi sebelum isi tiba (acak antarputaran). | Tombol, status, dan navigasi ditampung di `DocumentFragment` dan dipasang setelah isi tiba (atau setelah gagal). Elemen baru di bawah isi tidak menggeser apa pun. |
| 2 | Beranda 720 sampai 820 px: CLS 0,0339 / 0,0331 / 0,0323. | Kalimat lead (28 px, `max-width:22em` = 616 px) muat satu baris dengan fallback (605 px) tetapi dua baris dengan font asli, jadi tombol dan daftar fakta turun 35 px. | `max-width:21em` (588 px): kedua font pasti dua baris. Tampilan akhir identik piksel. |
| 3 | Beranda 1000 sampai 1200 px (hanya tampak pada layar setinggi 900 px): CLS 0,0295 sampai 0,0328, tidak terlihat di tabel B2 karena lebar itu tidak diukur. | Baris marquee huruf kapital tebal (`/LEARN /PRACTICE ...`) memakai fallback umum 100,3% padahal teksnya kapital semua; judul beranda sudah memakai fallback khusus kapital (89,9%) sejak B2. | `.marquee .row` ikut memakai `Space Grotesk Title Fallback`. 0,0295 menjadi 0,0019 (1024 px). |
| 4 | Kebijakan privasi 768 px: 0,0162 (baris "Versi 2 · ... Berlaku sejak [tanggal]" muat satu baris dengan fallback sistem, dua baris dengan font asli, +25 px). | Lebar teks hampir sama dengan lebar kolom (683 px), jendela viewport sempit sekitar 760 sampai 775 px. | `.meta{max-width:640px}`: dua baris di kedua font. Tampilan akhir identik piksel. |
| 5 | `prefers-reduced-motion` tidak mematikan `scroll-behavior:smooth` di `kebijakan-privasi.html` (klik daftar isi menggulir mulus ke 2.434 px) dan `terima-kasih.html`. Ditemukan saat memeriksa reduced-motion, bukan dari CLS. | Dua halaman itu menyetel `html{scroll-behavior:smooth}` tanpa aturan reduced-motion. | Aturan `@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}` ditambahkan di keduanya. Diuji: reduce gulir instan, tanpa preferensi tetap mulus. |

### Angka CLS (font ditunda 1,5 dtk, reduced-motion, median 3 putaran per sel; `node tools/ukur-cls-font.mjs --lebar 360,390,600,720,768,820,1024,1440`)
| Halaman | Lebar | CLS sebelum | CLS sesudah | Putaran terburuk sebelum | sesudah |
| / | 360 | 0.0002 | 0.0002 | 0.0002 | 0.0002 |
| / | 390 | 0.0003 | 0.0003 | 0.0003 | 0.0003 |
| / | 600 | 0.0002 | 0.0002 | 0.0002 | 0.0002 |
| / | 720 | 0.0339 | 0.0004 | 0.0339 | 0.0004 |
| / | 768 | 0.0331 | 0.0005 | 0.0331 | 0.0005 |
| / | 820 | 0.0323 | 0.0005 | 0.0323 | 0.0005 |
| / | 1024 | 0.0295 | 0.0019 | 0.0295 | 0.0019 |
| / | 1440 | 0.0009 | 0.0009 | 0.0009 | 0.0009 |
| /belajar/ | 360 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| /belajar/ | 390 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| /belajar/ | 600 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /belajar/ | 720 | 0.0120 | 0.0122 | 0.0122 | 0.0122 |
| /belajar/ | 768 | 0.0016 | 0.0016 | 0.0022 | 0.0022 |
| /belajar/ | 820 | 0.0013 | 0.0013 | 0.0013 | 0.0013 |
| /belajar/ | 1024 | 0.0007 | 0.0007 | 0.0007 | 0.0007 |
| /belajar/ | 1440 | 0.0003 | 0.0003 | 0.0003 | 0.0003 |
| /belajar/pelajaran.html | 360 | 0.0003 | 0.0003 | 0.0003 | 0.0003 |
| /belajar/pelajaran.html | 390 | 0.1150 | 0.0003 | 0.1152 | 0.0003 |
| /belajar/pelajaran.html | 600 | 0.0002 | 0.0002 | 0.0951 | 0.0002 |
| /belajar/pelajaran.html | 720 | 0.0094 | 0.0094 | 0.1043 | 0.0094 |
| /belajar/pelajaran.html | 768 | 0.0951 | 0.0001 | 0.0951 | 0.0001 |
| /belajar/pelajaran.html | 820 | 0.0952 | 0.0000 | 0.0953 | 0.0002 |
| /belajar/pelajaran.html | 1024 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /belajar/pelajaran.html | 1440 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 360 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 390 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 600 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 720 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 768 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 820 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 1024 | 0.0001 | 0.0001 | 0.0001 | 0.0001 |
| /terima-kasih.html | 1440 | 0.0002 | 0.0002 | 0.0002 | 0.0002 |
| /kebijakan-privasi.html | 360 | 0.0002 | 0.0002 | 0.0002 | 0.0002 |
| /kebijakan-privasi.html | 390 | 0.0002 | 0.0002 | 0.0002 | 0.0002 |
| /kebijakan-privasi.html | 600 | 0.0006 | 0.0004 | 0.0006 | 0.0006 |
| /kebijakan-privasi.html | 720 | 0.0006 | 0.0006 | 0.0006 | 0.0006 |
| /kebijakan-privasi.html | 768 | 0.0162 | 0.0004 | 0.0166 | 0.0006 |
| /kebijakan-privasi.html | 820 | 0.0006 | 0.0005 | 0.0006 | 0.0005 |
| /kebijakan-privasi.html | 1024 | 0.0003 | 0.0005 | 0.0003 | 0.0005 |
| /kebijakan-privasi.html | 1440 | 0.0007 | 0.0007 | 0.0007 | 0.0007 |

Ringkasan: sel di atas 0,01 turun dari 9 menjadi 1 dari 40; putaran tunggal di atas 0,01 turun dari 26 menjadi 3 dari 120; nilai terburuk satu putaran 0,1152 menjadi 0,0122. Pada tiga lebar standar (390, 768, 1440) tiga gelombang x 3 putaran (135 putaran per sisi): terburuk satu putaran 0,1152 menjadi 0,0022, putaran di atas 0,01 turun dari 31 menjadi 0 dari 135, dan maksimum median per sel per gelombang 0,0952 / 0,0617 / 0,0951 menjadi 0,0016 / 0,0016 / 0,0016. Sisa terbesar: `/belajar/` 720 px 0,0122 (tidak diselidiki lebih jauh: di bawah ambang "baik" 0,1 dan bukan lebar standar) dan pelajaran 720 px 0,0094.

### Angka muat (`tools/ukur-muat.mjs`, 1,6 Mbps, RTT 150 ms; median 2 gelombang x 3 putaran; rentang di kurung)
| Halaman | Profil | LCP ms sebelum | LCP ms sesudah | CLS sebelum | CLS sesudah | KB | Permintaan | Event load ms sebelum/sesudah |
|---|---|---|---|---|---|---|---|---|
| / | desktop 1440 | 720 (712-728) | 698 (696-700) | 0 | 0 | 1017 | 30 | 1449/1449 |
| / | tablet 768 | 510 (504-516) | 508 (508-508) | 0 | 0 | 1764 | 30 | 1451/1448 |
| / | HP 390 | 1474 (1456-1492) | 1462 (1444-1480) | 0 | 0 | 1764 | 30 | 1457/1459 |
| /belajar/ | desktop 1440 | 376 (372-380) | 386 (384-388) | 0 | 0 | 75 | 7 | 769/776 |
| /belajar/ | tablet 768 | 422 (412-432) | 408 (400-416) | 0 | 0 | 75 | 7 | 826/805 |
| /belajar/ | HP 390 | 458 (448-468) | 444 (444-444) | 0 | 0 | 75 | 7 | 866/853 |
| pelajaran | desktop 1440 | 602 (596-608) | 588 (584-592) | **0,0620** | **0** | 75 | 8 | 795/790 |
| pelajaran | tablet 768 | 624 (620-628) | 608 (604-612) | 0 | 0 | 75 | 8 | 819/809 |
| pelajaran | HP 390 | 844 (836-852) | 856 (844-868) | 0 | 0 | 75 | 8 | 870/862 |
| /terima-kasih.html | desktop 1440 | 204 (200-208) | 204 (204-204) | 0 | 0 | 43 | 3 | 542/540 |
| /terima-kasih.html | tablet 768 | 228 (224-232) | 224 (208-240) | 0 | 0 | 43 | 3 | 566/569 |
| /terima-kasih.html | HP 390 | 276 (264-288) | 272 (264-280) | 0 | 0 | 43 | 3 | 615/602 |
| /kebijakan-privasi.html | desktop 1440 | 228 (228-228) | 212 (204-220) | 0,0010 | 0,0010 | 52 | 3 | 561/551 |
| /kebijakan-privasi.html | tablet 768 | 256 (256-256) | 248 (244-252) | 0 | 0 | 52 | 3 | 568/567 |
| /kebijakan-privasi.html | HP 390 | 286 (272-300) | 292 (268-316) | 0 | 0 | 52 | 3 | 641/639 |

Pembacaan jujur: LCP, bobot, dan jumlah permintaan tidak berubah di luar sebaran (selisih terbesar +10 ms di `/belajar/` desktop, setara sebaran antar-sel; LCP beranda desktop -22 ms dalam rentang). Perubahan B3 sengaja tidak menyentuh jalur muat; hasilnya ada di CLS. Pada muat normal tanpa font ditunda, CLS pelajaran desktop tadinya 0,0620 dan kini 0. Total galat skrip di 180 putaran (dasar dan sesudah): 0.

### Reduced-motion (`prefers-reduced-motion: reduce` lawan tanpa preferensi; 4 halaman x 3 lebar x 2 mode, tunggu 4,5 dtk, lalu gulir 600 px)
- Beranda: frame Neru diminta 0 (tanpa preferensi 21), kelas `live` tidak muncul, animasi tak hingga 0 (1), elemen bertransisi 0 (59 sampai 63), animasi CSS 0 (8), marquee tidak bergerak saat gulir (bergerak tanpa preferensi).
- `/belajar/` dan pelajaran: elemen bertransisi 0 (6 dan 16 tanpa preferensi); tidak ada animasi CSS di kedua mode.
- `/terima-kasih.html`: transisi 0 (1 tanpa preferensi), tetapi `scroll-behavior` tetap `smooth` sebelum B3 (temuan 5, kini `auto`). Kebijakan privasi sama.
- Tangkapan layar reduced-motion adalah dasar semua perbandingan piksel; tidak ada konten yang hanya muncul lewat gerak.

### Uji dan gerbang
- Baru: `node tools/uji-cls-pelajaran.mjs`, 71 pemeriksaan lulus: CLS <= 0,01 pada 3 lebar x 3 tundaan isi (0, 300, 1200 ms), 3 lebar untuk pelajaran tanpa isi, urutan elemen dan keadaan sebelum isi tiba, 7 bentuk isi rusak (404, 500, JSON terpotong, bukan objek, null, kosong, `bagian` bukan larik) dengan bagian bawah tetap dipasang, isi 150 bagian pada 390 dan 1440 px, payload XSS di setiap kolom JSON (tetap teks), 7 id jahat atau salah (kosong, HTML, `../`, NUL, 5.000 karakter), tombol selesai (klik, batal, Enter), navigasi pelajaran pertama dan terakhir. Uji mutasi: dijalankan terhadap `belajar/pelajaran.html` lama (`--halaman`), 10 pemeriksaan gagal (CLS 0,0617 sampai 0,1149 dan "tombol belum dipasang sebelum isi tiba" salah), 61 lulus.
- `tools/ukur-cls-font.mjs` menerima `--lebar` dan `--halaman`; 6 masukan jahat atau salah ditolak dengan pesan (huruf, di bawah 280, di atas 3.000, `../etc`, tanpa `/`, sisipan perintah yang tersaring `parseInt`).
- Gerbang sebelum dan sesudah (penuh): `uji-keamanan.mjs` 663 menjadi 664 lulus, 0 gagal; `uji-header-csp.mjs` 201 lulus (hash `vercel.json` diperbarui oleh `buat-vercel-json.mjs`, hanya nilai hash yang berubah, tidak ada direktif ditambah atau dilonggarkan); `uji-aset.mjs` 344 + 66 lulus; `uji-muat-neru.mjs` 90; `validasi-kursus`, `uji-impor-progres`, `uji-impor-draf` (19), `uji-komentar-draf` (28) lulus.
- Tampilan: 36 tangkapan layar (beranda, belajar, pelajaran p1 dan p2, kebijakan privasi, terima kasih x 390/720/768/820/1024/1440 px) sebelum dan sesudah, semuanya identik piksel (beranda 768 dan 820 awalnya tampak berbeda 113.000 piksel karena gambar `loading=lazy` belum termuat di satu sisi; diulang dengan menggulir halaman dan identik).

### Tinjauan mandiri dua tahap
Tahap 1 (membaca diff sebagai peninjau skeptis): (i) pada percobaan pertama "Memuat isi pelajaran…" ikut hilang bersama blok `else` yang diubah, tertangkap sebelum uji dijalankan dan dipulihkan, diuji ("sebelum isi tiba: teks Memuat tampil"); (ii) `ready()` dipanggil di `.then` dan `.catch`, kesalahan render setelah sebagian isi dipasang tetap berakhir pada pesan galat dan bagian bawah (uji "bagian bukan larik"); (iii) jenis perbaikan "tambah tinggi minimum" dipertimbangkan dan ditolak: tinggi isi bervariasi 3.000 sampai belasan ribu piksel menurut pelajaran, jadi tinggi tetap tidak bisa tepat. Tahap 2: seluruh gerbang dan semua ukuran dijalankan ulang pada kode final, 36 tangkapan layar dan sapuan 8 lebar diulang setelah perbaikan terakhir (marquee dan reduced-motion).

### Belum terverifikasi (tidak diperiksa)
1. Deploy Vercel yang sebenarnya (konektor dilarang di run otomatis, URL dev tidak tercatat di repo): semua angka lokal; PERLU-KEPUTUSAN butir 14 tetap berlaku.
2. Hanya Chromium. Safari dan Firefox punya mesin kerja baris dan metrik fallback sendiri; perbaikan lead dan meta bersifat struktural (dua baris di kedua font) sehingga seharusnya aman, tetapi tidak diuji.
3. Fallback font Android (Roboto) dan macOS/Windows tidak diukur; sandbox memakai Liberation Sans/Mono sebagai pengganti Arial/Courier New. `max-width` baru bergantung pada selisih lebar sekitar 17 px antara fallback (605 px) dan font asli (di atas 616 px) lawan batas 588 px.
4. Lebar di antara yang diukur (misalnya 540, 680) tidak disapu; `/belajar/` 720 px 0,0122 dan pelajaran 720 px 0,0094 adalah sisa yang diketahui.
5. Placeholder `[tanggal form waitlist diaktifkan]` di kebijakan privasi akan diganti Master; teks baru bisa memindahkan batas baris lagi, tetapi `max-width:640px` membuat jumlah baris tidak bergantung pada beberapa piksel selisih.
6. CLS saat pengguna mengubah ukuran font sistem atau zoom teks 200% tidak diukur.
7. Jaringan nyata: pada koneksi cepat isi pelajaran tiba sebelum cat pertama sehingga masalah 1 tidak muncul; bagian bawah yang dipasang belakangan berarti pada jaringan lambat tombol "Tandai selesai" baru muncul bersama isi (tidak ada tombol aktif tanpa isi yang bisa dibaca).
