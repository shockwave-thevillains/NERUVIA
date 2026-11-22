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
