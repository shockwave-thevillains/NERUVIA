# Perintah gerbang tunggal (`tools/uji-semua.mjs`)

Kegiatan L2, 24 Nov 2026. Satu perintah menjalankan alat-alat pemeriksa NERUVIA berurutan dan merangkum hasilnya, supaya penulis tidak perlu mengingat daftar perintah. Alat ini hanya menjalankan alat lain: tidak menulis, mengubah, atau menghapus berkas, tidak memakai jaringan sendiri, dan tidak memakai shell (tiap langkah dijalankan sebagai `node <skrip> <argumen>` dengan daftar argumen tetap).

## Cara pakai

```
node tools/uji-semua.mjs                  langkah inti, sekitar 3 detik
node tools/uji-semua.mjs --lengkap        inti + 5 langkah tambahan, sekitar 15 detik
node tools/uji-semua.mjs --penuh          uji keamanan tanpa --cepat (dengan browser), sekitar 45 detik lebih lama
node tools/uji-semua.mjs --hanya=validasi,aset
node tools/uji-semua.mjs --daftar         cetak langkah tanpa menjalankan
node tools/uji-semua.mjs --berhenti       berhenti di kegagalan pertama
node tools/uji-semua.mjs --tampil         tampilkan seluruh keluaran tiap langkah
node tools/uji-semua.mjs --batas=DETIK    batas waktu per langkah (1 sampai 1800, bawaan 300)
node tools/uji-semua.mjs --akar=FOLDER    akar repo lain (dipakai uji mandiri)
node tools/uji-uji-semua.mjs              uji alat ini (75 pemeriksaan, sekitar 8 detik)
```

## Langkah

| Nama | Perintah | Inti | Isi |
|---|---|---|---|
| `validasi` | `tools/validasi-kursus.mjs` | ya | validator `content/kursus.json` |
| `impor-draf` | `tools/uji-impor-draf.mjs` | ya | uji alat impor draf pada salinan sementara |
| `keamanan` | `tools/uji-keamanan.mjs --cepat` | ya | pemeriksaan statis; `--penuh` menjalankannya tanpa `--cepat` |
| `impor-progres` | `tools/uji-impor-progres.mjs` | `--lengkap` | impor progres dengan muatan jahat |
| `komentar-draf` | `tools/uji-komentar-draf.mjs` | `--lengkap` | kerangka komentar yang dinonaktifkan |
| `aset` | `tools/uji-aset.mjs` | `--lengkap` | rujukan, ukuran, preload aset dan uji mandiri |
| `vercel` | `tools/buat-vercel-json.mjs --cek` | `--lengkap` | `vercel.json` sesuai blok inline |
| `cek-materi` | `tools/uji-cek-materi.mjs` | `--lengkap` | uji alat cek materi (sekitar 11 detik) |

`--hanya` boleh menyebut nama apa pun dari tabel tanpa `--lengkap`. Urutan jalan selalu mengikuti tabel, bukan urutan di argumen, dan nama ganda dijalankan sekali.

## Kode keluar

| Kode | Arti |
|---|---|
| 0 | semua langkah lulus |
| 1 | ada langkah gagal (kode keluar bukan 0, skrip tidak ditemukan, lewat batas waktu, dimatikan sinyal, keluaran lebih dari 64 MB) atau pemakaian salah (opsi tidak dikenal, nilai tidak valid, akar tanpa folder `tools`) |
| 2 | semua lulus, tetapi uji keamanan melewati bagian browser karena Playwright tidak ada (arti yang sama dengan `uji-keamanan.mjs`) |

Kode 2 dari alat selain uji keamanan dihitung gagal. Bila ada kegagalan sekaligus langkah yang dilewati, hasilnya 1.

## Yang ditampilkan

Untuk langkah gagal, alat menampilkan 30 baris terakhir keluaran langkah itu (tiap baris dipotong 300 karakter) dan alasannya. Keluaran langkah dibersihkan sebelum ditampilkan: karakter kontrol (termasuk ESC dan NUL), kontrol C1, penanda arah bidi, dan BOM diganti dengan tanda pengganti, supaya keluaran alat lain tidak bisa menggerakkan kursor, mengubah judul terminal, atau membalik teks laporan. Pesan galat pemakaian juga dibersihkan. Ringkasan akhir memuat satu baris per langkah, jumlah lulus, dilewati, gagal, dan tidak dijalankan, serta total waktu.

## Hubungan dengan RUNBOOK

Alat ini adalah jalan pintas, bukan pengganti gerbang. Sebelum commit yang menyentuh kode atau konten, gerbang di RUNBOOK (bagian "Gerbang keamanan") tetap berlaku: `node tools/uji-keamanan.mjs` penuh, `node tools/validasi-kursus.mjs`, ditambah alat khusus sesuai yang diubah (aset, CLS, gerak, latihan interaktif, cek materi). `node tools/uji-semua.mjs --penuh` mencakup dua yang pertama. Untuk commit yang hanya mengubah dokumen cukup `node tools/uji-semua.mjs` (bawaan).

Perhatikan bahwa bagian E uji keamanan sudah menjalankan validator, uji impor draf, uji impor progres, dan uji komentar sebagai uji unit. Langkah terpisah di sini sengaja menampilkan hasil masing-masing sendiri-sendiri supaya kegagalan mudah ditunjuk, dengan biaya sekitar 1 detik tambahan.

## Batas yang diketahui

- Alat hanya mempercayai kode keluar tiap langkah dan tidak menilai isi keluarannya. Alat yang keliru keluar 0 akan dianggap lulus.
- Langkah yang melewati batas waktu dimatikan dengan SIGKILL; proses anak yang dibuat langkah itu (misalnya browser Playwright) bisa tertinggal.
- Langkah dijalankan berurutan, tidak paralel, supaya keluaran tidak bercampur dan alat yang memakai folder sementara atau port tidak bentrok.
- Lulus cepat (bawaan) tidak menggantikan gerbang penuh; uji browser, CLS, gerak, dan aset hanya jalan pada mode atau alat masing-masing.

## Bukti uji (24 Nov 2026)

- `tools/uji-uji-semua.mjs`: 75 pemeriksaan lulus, 0 gagal (akar tiruan: perilaku normal 12, kegagalan 19, masukan jahat dan pemakaian salah 30, fungsi murni 11, repo nyata 3). Kasus jahat: argumen berisi titik koma, `$(...)`, backtick, jalur `../`, nilai `--batas` negatif, nol, desimal, notasi ilmiah, dan sangat besar; folder akar bernama dengan karakter shell; keluaran langkah berisi ESC, OSC pengubah judul, bidi, C1, NUL; ringkasan palsu dari langkah; keluaran 3 MB dan 70 MB; langkah menggantung, dimatikan sinyal, melempar pengecualian.
- Uji mutasi: 12 kerusakan sengaja pada alat (gagal tidak memengaruhi kode keluar, kode 2 diterima dari semua alat, tanpa pembersihan keluaran, skrip hilang dianggap lulus, tanpa batas waktu, `--berhenti` diabaikan, memakai shell, sinyal diabaikan, validasi `--hanya` dilonggarkan, validasi `--batas` dilepas, kode keluar bukan nol dianggap lulus, kode 2 dihitung lulus biasa). Semua 12 ditangkap uji; satu (validasi `--hanya`) awalnya lolos karena lapisan daftar putih nama sudah menolaknya, lalu ditutup dengan uji pesan galat C11.
- Satu galat nyata ditemukan dan diperbaiki lewat uji keluaran besar: `process.exit` memotong keluaran 3 MB bila stdout berupa pipa; alat kini memakai `process.exitCode`.
