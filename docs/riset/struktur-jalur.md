# Rancangan struktur jalur di kursus.json (K3)

Status: usulan, 24 Nov 2026. Dokumen ini tidak mengubah `content/kursus.json`, validator, galeri, atau kode lain. Semua angka dan hasil uji berasal dari run K3 (prototipe di folder sementara, tidak masuk repo). Rujukan dan tanggal akses ada di bagian 9.

## 1. Ringkasan dan rekomendasi

Pertanyaannya: bagaimana jalur cybersecurity pemula (usulan K2, 15 pelajaran) masuk ke `kursus.json` dan ke galeri tanpa merusak Level 1 sampai 3?

Rekomendasi: **Opsi B, satu daftar `level` yang tetap datar, ditambah bidang `rumpun`.** Cybersecurity menjadi level dengan id `l4`, berisi tiga modul `l4-m1` sampai `l4-m3`. Level itu memakai `rumpun: "keamanan"` dan nomor 1 di dalam rumpunnya. Level AI yang sudah ada diberi `rumpun: "ai"`. Daftar rumpun ditaruh di akar berkas. Tiga alasan utama:

1. Id berbentuk `l<angka>-m<angka>-p<angka>` dijaga di empat tempat: `admin/materi.js`, `tools/impor-draf.mjs`, `supabase/admin/003-draf-video.sql` (sudah diterapkan ke `neruvia-dev`), dan placeholder `admin/index.html`. Id `l4-m1-p1` lolos keempatnya. Id berawalan lain (misalnya `k1-m1-p1`) ditolak oleh pola admin dan impor serta oleh batasan database, dan batasan database hanya boleh diubah Master.
2. Bentuk lama tetap sah. Semua pembaca data (galeri, pelajaran, `progress.js`, empat alat uji) membaca `level[].modul[].pelajaran[]`, jadi struktur bersarang tidak berubah.
3. Perubahan kodenya kecil dan bisa dibagi empat kegiatan terpisah (bagian 7), masing-masing dengan uji sendiri.

Hal yang wajib ikut: batas navigasi dan "lanjut belajar" per rumpun. Tanpa itu, pelajaran terakhir AI akan menautkan "Berikutnya" ke pelajaran keamanan (terukur di bagian 3).

Nama bidang sengaja `rumpun`, bukan `jalur`, karena `jalur` sudah dipakai dengan arti lain: kolom `waitlist.jalur` (pilihan level di form, dibatasi constraint `waitlist_jalur_ok`) dan komentar kode di beranda.

## 2. Kondisi sekarang (bukti dari repo)

Diperiksa 24 Nov 2026 pada branch `dev` (commit dasar aa67c8a, lalu b77ed58 setelah klaim).

| Bagian | Yang dilakukan sekarang | Akibat bagi jalur baru |
|---|---|---|
| `content/kursus.json` | 3 level (`l1`, `l2` berisi 3 modul x 5 pelajaran; `l3` modul kosong), 30 pelajaran, 610 XP, 39 id | Level baru cukup ditambahkan ke array `level`. |
| `tools/validasi-kursus.mjs` (92 baris) | `nomor` harus sama dengan urutan global (`i + 1`); `status` hanya `gratis` atau `segera`; id modul harus berawalan id level; kunci level yang tidak dikenal diabaikan diam-diam | Level `l4` dengan nomor 4 lolos hari ini. Salah ketik nama bidang (`rumpun` jadi `rumpon`) juga lolos. |
| `belajar/index.html` | Filter satu kelompok (Semua, Gratis, Segera) memakai `l.status`; eyebrow kartu "Level " + `nomor`; tinggi galeri dipesan per jumlah kolom (1037, 763, 512 px); statistik menghitung semua pelajaran | Perlu kelompok filter kedua dan eyebrow berawalan rumpun. Tinggi pesanan perlu diukur ulang. |
| `belajar/pelajaran.html` (baris 92 dan 184) | Daftar datar semua pelajaran lintas level; "Sebelumnya/Berikutnya" memakai elemen tetangga; breadcrumb "Level " + `nomor` | Perlu tetangga dibatasi rumpun dan breadcrumb berawalan rumpun. |
| `belajar/progress.js` | `lanjut(kursus, id, levelId)` melewati level `segera` tetapi tidak mengenal rumpun; badge `modul1` memakai id tetap `l1-m1`; `ID_RE` `^[a-z0-9][a-z0-9-]{0,39}$` | Id baru lolos. `lanjut` perlu cakupan rumpun. Badge `modul1` tidak terganggu. |
| Gerbang id pelajaran | `admin/materi.js:10`, `tools/impor-draf.mjs:34`, `supabase/admin/003-draf-video.sql:7`: `^l[0-9]{1,2}-m[0-9]{1,2}-p[0-9]{1,2}$`; `admin/index.html:86` batas 12 huruf | Hanya awalan `l` yang lolos. Panjang `l4-m1-p1` = 8, aman. |
| Gerbang id komentar | `supabase/draf/komentar.sql:51` dan `belajar/komentar-draf.js:15`: `^[a-z0-9][a-z0-9-]{0,39}$` (draf, belum diterapkan) | Longgar, tidak menghalangi. |
| Waitlist | `supabase/waitlist.sql:20`: `jalur in ('AI dari Nol','AI untuk Kerja','AI Lanjutan','Masih bingung')`; daftar sama di `index.html:795` | Opsi keamanan di form butuh migrasi database oleh Master; tidak dibuka di rancangan ini. |
| Beranda | "Tiga level, satu titik awal: nol" (`index.html:456`), tiga kartu | Tidak diubah. Keamanan hanya tampil di galeri pratinjau (noindex), bukan di landing. |

## 3. Pengukuran prototipe

Semua dijalankan di salinan sementara (`kursus.json` ditambah `l4`, kode asli tidak disentuh). Ulang bila perlu dengan skrip di bagian 8.

| Pengukuran | Hasil |
|---|---|
| Validator asli terhadap `l4` (3 modul, 15 pelajaran `isi: belum`, bidang `rumpun`) | `OK: 4 level, 45 pelajaran, 58 id unik`, kode keluar 0. Validator tidak menegakkan `rumpun`. |
| Id `l4-m1-p1` melawan tiga pola gerbang | lolos, lolos, lolos |
| Id `k1-m1-p1` dan `keamanan-m1-p1` | ditolak admin dan impor, ditolak SQL 003, lolos hanya pola longgar `progress.js` |
| Tetangga "Berikutnya" di `pelajaran.html` setelah `l2-m3-p5` (karena `l3` kosong), dihitung dari data dengan aturan kode saat ini | `l4-m1-p1`: lintas topik, tidak diinginkan |
| `lanjut()` setelah semua pelajaran AI selesai, `l4` berstatus `segera` | `null` (benar) |
| Sama, `l4` berstatus `gratis` | `l4-m1-p1` (melompat topik tanpa ditanya) |
| Total pelajaran dan XP di statistik global | 30 menjadi 45 pelajaran; 610 menjadi 910 XP (keamanan menyumbang 300 XP, 15 pelajaran). Sebelum pelajaran keamanan punya isi, penyebut "0/45" menyertakan 15 pelajaran yang belum bisa dibuka. |
| Badge `modul1` | Syarat tetap "semua pelajaran Modul 1" (memakai `l1-m1`), tidak berubah |
| Aturan validator usulan (bagian 5.6) | 32 pemeriksaan prototipe lulus, 0 gagal: 3 kasus sah, 23 kasus negatif, 6 kasus navigasi |

## 4. Opsi dan perbandingan

| | A. Level biasa tanpa bidang baru | **B. Level datar + `rumpun` (rekomendasi)** | C. Dua tingkat: `jalur[] > level[]` |
|---|---|---|---|
| Bentuk | `l4` ditambah ke `level`, tampil "Level 04" | `l4` dengan `rumpun: "keamanan"`, nomor 1 dalam rumpun, daftar `rumpun` di akar | Akar diganti `jalur: [{ id, level: [...] }]` |
| Id | `l4-...` | `l4-...` (tetap lolos gerbang) | Bisa `k1-...` dengan migrasi; atau tetap `l` |
| Kode yang berubah | Tidak ada | Validator, galeri, pelajaran, `progress.js`, tiga alat uji | Semua pembaca data, empat alat uji, impor draf, mungkin SQL |
| Risiko | "Level 04" mengesankan urutan setelah AI Lanjutan padahal K2 menyebut tanpa prasyarat; tidak ada filter topik; navigasi dan lanjut lintas topik | Perlu empat kegiatan dan uji; nomor per rumpun menuntut aturan id yang jelas | Terbesar: pecah data lama, ubah semua gerbang |
| Cocok bila | Hanya satu jalur tambahan dan tidak pernah ada lainnya | Satu sampai empat rumpun | Banyak rumpun dengan kurikulum dan harga sendiri |
| Keputusan | Ditolak: biaya kode nol tetapi tiga masalah di atas tetap ada | Dipilih | Ditunda sampai ada rumpun ketiga dan keempat |

Pembanding dari platform lain (bagian 9): Microsoft Learn memisahkan learning path (rangkaian modul terurut), module, dan unit, dan tiap unit hanya terkait satu modul; halaman jenis kontennya tidak menyebut prasyarat atau tingkat sebagai bidang. Claude Academy menyajikan kursus datar dengan label tingkat dan produk, bukan hierarki jalur; kursus bisa disaring per produk. Coursera memperkenalkan Specialization sebagai rangkaian multi-kursus dengan proyek akhir (artikel 2014, isinya belum tentu berlaku sekarang). Pola yang sama ada di semua: satu tingkat pengelompokan di atas kursus, penyaringan lewat label, bukan lewat pohon. Opsi B memakai pola itu (label `rumpun` + saringan), bukan pohon bertingkat tiga.

Catatan nama: schema.org memakai `coursePrerequisites` untuk syarat mengikuti kursus (nilai Course, teks, atau AlignmentObject). Bila nanti butuh bidang prasyarat, nama itu bisa dijadikan acuan. Bidang prasyarat tidak diusulkan sekarang (bagian 5.7).

## 5. Rancangan rinci (Opsi B)

### 5.1 Skema

Akar `kursus.json` mendapat bidang `rumpun`. Tiap level mendapat bidang `rumpun` wajib. Bidang lain tidak berubah.

```json
{
  "versi": 2,
  "rumpun": [
    { "id": "ai", "judul": "Belajar AI", "singkat": "AI" },
    { "id": "keamanan", "judul": "Keamanan digital", "singkat": "Keamanan" }
  ],
  "level": [
    { "id": "l1", "nomor": 1, "rumpun": "ai", "...": "tidak berubah" },
    { "id": "l4", "nomor": 1, "rumpun": "keamanan", "judul": "Keamanan Digital dari Nol",
      "ringkasan": "Akun yang sulit dibobol, mengenali penipuan, dan menjaga perangkat serta data.",
      "status": "segera", "tag": ["Akun", "Penipuan", "Privasi"], "modul": ["..."] }
  ]
}
```

Ringkasan semantik:
- `rumpun[].id`: huruf kecil a sampai z, 2 sampai 20 huruf. `judul` sampai 60 huruf, `singkat` sampai 20 huruf. Id rumpun tidak pernah dipakai ulang atau diganti.
- `level[].id`: tetap `l<angka 1 sampai 2 digit>`. Id **tidak membawa makna urutan atau topik**. Id yang sudah terbit tidak boleh diganti, karena tersimpan di progres pengguna (`neruvia.progress.v1`) dan berkas ekspor.
- `level[].nomor`: berubah arti menjadi urutan di dalam rumpun, mulai 1, berurutan menurut urutan di berkas. Level AI tetap 1, 2, 3. `l4` bernomor 1.
- `versi`: naik ke 2 saat skema berubah. Tidak ada kode yang membaca `kursus.versi` (dicari di seluruh repo), dan `progress.js` memakai kunci `neruvia.progress.v1` sendiri, jadi progres lama tetap berlaku.

### 5.2 Penomoran dan id

Satu aturan untuk semua kegiatan berikutnya: level baru memakai nomor id berikutnya yang belum terpakai (`l5`, `l6`, dan seterusnya), apa pun rumpunnya. Dengan begitu, bila Level 4 AI ditambahkan kelak, id-nya `l5` dan nomor tampilannya 4 di rumpun AI. Pengguna melihat "AI · Level 04", bukan `l5`, jadi id tidak perlu rapi. Rincian: id adalah kunci tetap, `nomor` adalah tampilan.

Alternatif yang ditolak: awalan baru per rumpun (`k1-m1-p1`). Biayanya mengubah tiga kode dan satu constraint database yang tidak boleh disentuh run otomatis. Bila Master tetap menginginkan awalan, urutannya: migrasi SQL oleh Master, ubah tiga regex, tambah kasus uji, baru kemudian data.

### 5.3 Navigasi dan "lanjut belajar"

- `pelajaran.html`: "Sebelumnya" dan "Berikutnya" hanya ke pelajaran dengan rumpun yang sama. Pada pelajaran terakhir rumpun, "Berikutnya" nonaktif seperti pelajaran pertama saat ini, disertai tautan "Kembali ke daftar level" yang sudah ada.
- `NVProgress.lanjut(kursus, id, levelId)`: bila `levelId` kosong dan `id` diberikan, cakupan otomatis rumpun milik `id`. Bila keduanya kosong (galeri global), tidak ada cakupan rumpun, perilaku sekarang dipertahankan.
- Hasil prototipe: tiga kasus navigasi dalam rumpun tetap tersambung (antar pelajaran, antar modul, antar level AI) dan dua kasus lintas rumpun terputus (bagian 3 dan 8).

### 5.4 Galeri

- Kelompok filter kedua, "Topik": Semua topik, lalu satu tombol per rumpun, dibangun dari `rumpun[]` di data (bukan ditulis tetap di HTML). Kelompok ini hanya tampil bila rumpun lebih dari satu.
- Filter status dan filter topik bekerja bersamaan (keduanya harus cocok). Kombinasi tanpa hasil memakai pesan yang sudah ada ("Belum ada level untuk filter ini").
- Pola tombol: seperti kelompok filter sekarang, `<button type="button" aria-pressed>` dengan label tetap. Pedoman W3C APG menyebut label tombol toggle tidak boleh berubah saat status berubah, dan tombol filter sekarang (Semua, Gratis, Segera) sudah memenuhinya.
- Eyebrow kartu: "Keamanan · Level 01" dan "AI · Level 01" (memakai `singkat`), bila rumpun lebih dari satu. Ukuran area ketuk tombol baru 44 px seperti yang lain.
- Tinggi pesanan `.grid[aria-busy]` (1037, 763, 512 px) harus diukur ulang dengan `node tools/ukur-cls-font.mjs --halaman /belajar/ --lebar 360,390,720,768,1024,1440` karena jumlah kartu naik dari 3 menjadi 4 dan bilah filter menjadi lebih tinggi. Batas CLS 0,01 dari gerbang berlaku.
- Bila rumpun lebih dari dua atau kartu lebih dari enam, pertimbangkan judul bagian per rumpun menggantikan filter. Belum perlu sekarang.

### 5.5 Statistik, XP, dan badge

- Penyebut statistik ("pelajaran selesai") sebaiknya hanya menghitung pelajaran dengan `isi` bukan `belum`. Hari ini selisihnya nol (semua 30 pelajaran berisi); setelah `l4` masuk dengan 15 pelajaran `belum`, tanpa aturan ini angkanya "0/45" dan 15 di antaranya tidak bisa dibuka. Perubahannya di fungsi `allLessons()` yang dipakai kartu statistik; kartu per level tetap menghitung semua pelajarannya. `uji-lanjut-belajar.mjs` perlu satu kasus.
- XP: aturan `xp_per_jenis` (Konsep 10, Praktik 20, Latihan 30) berlaku sama. Draf jenis pelajaran keamanan di Lampiran A memberi total 300 XP. Itu usulan; Master atau kegiatan penulisan boleh mengubahnya.
- Badge: lima badge sekarang tidak diubah. Badge khusus keamanan tidak dirancang. Bila diinginkan, jadikan syarat "semua pelajaran modul pertama dari rumpun mana pun" daripada id tetap `l1-m1`.

### 5.6 Aturan validator yang diusulkan (belum dipasang)

1. `rumpun` di akar: array tidak kosong; tiap entri objek dengan hanya kunci `id`, `judul`, `singkat`; id unik `^[a-z]{2,20}$`; panjang `judul` dan `singkat` dibatasi.
2. Tiap level: `rumpun` wajib berupa teks yang ada di daftar akar.
3. Kunci level yang tidak dikenal ditolak (daftar putih: `id`, `nomor`, `judul`, `ringkasan`, `status`, `rumpun`, `tag`, `modul`). Ini menutup celah salah ketik yang hari ini lolos.
4. `nomor` berurutan 1, 2, 3 di dalam tiap rumpun menurut urutan berkas.
5. Id level harus `^l[0-9]{1,2}$`, supaya id pelajaran turunannya selalu lolos tiga gerbang id.
6. Tiap rumpun di akar dipakai minimal satu level.

Prototipe aturan ini (di luar repo) lulus 32 pemeriksaan; daftar kasusnya ada di bagian 8.

### 5.7 Hal yang sengaja tidak diusulkan sekarang

- Bidang `prasyarat` antar level. K2 menyebut jalur keamanan tanpa prasyarat, tetapi itu klaim produk yang belum dikonfirmasi Master; menyimpannya di data berarti menyatakannya. Tambahkan nanti bersama keputusan Master.
- Harga atau akses per rumpun (lihat K4 untuk draf opsi).
- Opsi keamanan di form waitlist dan kartu di landing (butuh migrasi constraint dan persetujuan Master, bagian 11).
- Perubahan `status` kartu. Level keamanan tetap `segera` sampai Master memutuskan.

## 6. Dampak per berkas

| Berkas | Perubahan | Jenis |
|---|---|---|
| `content/kursus.json` | `versi: 2`, `rumpun` di akar, `rumpun` di tiap level, level `l4` (Lampiran A) | data |
| `tools/validasi-kursus.mjs` | enam aturan 5.6 | alat |
| `belajar/index.html` | filter topik, eyebrow, penyebut statistik, ukur ulang tinggi pesanan | tampilan |
| `belajar/pelajaran.html` | tetangga dibatasi rumpun, breadcrumb berawalan rumpun | tampilan |
| `belajar/progress.js` | cakupan rumpun pada `lanjut` | logika |
| `tools/uji-lanjut-belajar.mjs`, `uji-cls-pelajaran.mjs`, `uji-impor-draf.mjs`, `uji-keamanan.mjs` | kasus baru untuk rumpun; uji yang memakai `kursus.level[0]` dan `[1]` tidak terpengaruh karena urutan level AI tidak berubah | uji |
| `docs/loop/MATERI.md`, `README.md`, `docs/arsitektur.md` (L4) | deskripsi struktur baru | dokumen |
| `index.html`, `supabase/waitlist.sql` | **tidak berubah** | tetap |

Gerbang RUNBOOK yang berlaku saat kegiatan itu dikerjakan: `uji-keamanan.mjs` penuh, `validasi-kursus.mjs`, `uji-lanjut-belajar.mjs` (galeri dan `lanjut`), `uji-cls-pelajaran.mjs` (halaman pelajaran), `ukur-cls-font.mjs`, `uji-gerak.mjs` (bila ada gerak baru), dan `buat-vercel-json.mjs` bila blok inline berubah.

## 7. Rencana kerja bertahap (usulan antrean)

Bukan bagian antrean saat ini. Master memutuskan apakah dan kapan dimasukkan.

| Tahap | Isi | Syarat selesai |
|---|---|---|
| M1 | Data dan validator: `versi 2`, `rumpun`, `l4` (15 pelajaran `belum`), enam aturan validator, uji 23 kasus negatif | `validasi-kursus.mjs` lulus; kasus negatif ditolak; gerbang penuh dua kali |
| M2 | Galeri: filter topik, eyebrow, penyebut statistik, ukur ulang CLS | `uji-lanjut-belajar.mjs`, CLS ≤ 0,01 pada enam lebar, tangkapan layar 390, 768, 1440 |
| M3 | `pelajaran.html` dan `progress.js`: batas rumpun pada tetangga dan `lanjut` | `uji-cls-pelajaran.mjs`, `uji-lanjut-belajar.mjs`, kasus lintas rumpun |
| M4 | Dokumen: MATERI, README, arsitektur; periksa hash dan angka | semua penyebutan jumlah level dan pelajaran dicari ulang |

M1 harus lebih dulu karena data barunya diperlukan uji M2 dan M3; M2 dan M3 tidak saling bergantung dan boleh dikerjakan dalam urutan apa pun. Pelajaran keamanan baru ditulis setelah M1 dan setelah Master menyetujui K2 dan aturan tulisnya.

## 8. Kasus uji

Prototipe dijalankan di folder sementara: `usulan.mjs` (aturan validator dan navigasi), `ukur.mjs` (pengukuran bagian 3), `l4.mjs` (data Lampiran A). Hasil terakhir: `prototipe: 32 lulus, 0 gagal`; validator asli terhadap `l4`: `OK: 4 level, 45 pelajaran, 58 id unik`. Skrip tidak dimasukkan ke repo (bukan alat tetap). Kegiatan M1 menuliskannya ulang sebagai uji tetap.

Kasus sah (3): berkas hasil migrasi; hanya rumpun AI tanpa `l4`; rumpun ketiga fiktif dengan level `l5` (membuktikan rumpun baru bisa ditambah tanpa kode).

Kasus negatif (23):
1. `rumpun` akar hilang.
2. `rumpun` akar bukan array.
3. `rumpun` akar kosong.
4. id rumpun ganda.
5. id rumpun huruf besar.
6. id rumpun berisi angka.
7. id rumpun `__proto__`.
8. judul rumpun kosong.
9. `singkat` 21 huruf.
10. kunci asing di rumpun.
11. level tanpa `rumpun`.
12. `rumpun` level bukan teks (angka).
13. `rumpun` level bukan teks (array).
14. `rumpun` level salah ketik (`keamannan`).
15. kunci level salah ketik (`rumpon`).
16. `nomor` `l4` masih 4 (gaya lama).
17. `nomor` ganda dalam rumpun.
18. `nomor` melompat dalam rumpun.
19. id level `k1`.
20. id level `l100`.
21. id level berspasi.
22. rumpun tidak dipakai level mana pun.
23. level dengan kunci prototipe (`constructor`).

Kasus navigasi (6): setelah `l2-m3-p5` tidak lanjut ke `l4`; `l4-m1-p1` tidak punya "Sebelumnya" dari AI; pelajaran pertama punya "Berikutnya" dan tanpa "Sebelumnya"; antar modul dalam rumpun tersambung; antar level dalam rumpun tersambung; id tidak dikenal menghasilkan null.

Kasus tambahan untuk M2 dan M3 (belum dijalankan, daftar saja): filter topik bersama filter status; kombinasi tanpa hasil; satu rumpun saja menyembunyikan kelompok filter; judul rumpun berisi HTML tampil sebagai teks; `kursus.json` tanpa `rumpun` (data lama) tetap memuat galeri tanpa kelompok topik; `lanjut` dengan `id` dari rumpun lain; ekspor dan impor progres lama tetap dikenali.

## 9. Rujukan

Semua diakses 24 Nov 2026. "Penuh" berarti halaman dibaca utuh lewat konektor atau agen web-fetch (laporan agen, bukan teks mentah, kecuali disebut).

| No | Rujukan | URL | Yang dipelajari | Cara baca |
|---|---|---|---|---|
| 1 | Claude Academy, daftar semua kursus | https://academy.claude.com/courses (lewat `list_content`) | 29 kursus ditampilkan datar dengan label tingkat (beginner, intermediate, advanced), produk, dan jumlah pelajaran; tidak ada hierarki jalur | Penuh (konektor, hanya baca) |
| 2 | Claude Academy, Claude 101 | https://academy.claude.com/courses/claude-101 | Kursus berisi 14 pelajaran terurut; bagian "Prerequisites" hanya muncul sebagai judul di outline | Penuh (konektor) |
| 3 | Microsoft Learn, content and resource types (pembaruan tertera 29 Jul 2026) | https://learn.microsoft.com/en-us/training/support/learn-content-types | Learning path = modul terurut; module mandiri dan bisa dipakai di beberapa path; unit hanya terkait satu modul; prasyarat dan tingkat tidak disebut sebagai bidang | Laporan agen, halaman dibaca penuh |
| 4 | schema.org, `coursePrerequisites` | https://schema.org/coursePrerequisites | Syarat mengikuti Course: Course lain, teks, atau AlignmentObject | Laporan agen, dibaca penuh |
| 5 | Google Search Central, changelog dokumentasi | https://developers.google.com/search/updates | URL course-info mengembalikan halaman changelog, bukan dokumen course-info; entri 9 Sep 2025 menyatakan dokumentasi "course info" dihapus karena tidak lagi tampil di hasil pencarian | Laporan agen; sekitar 60 ribu karakter terakhir halaman tidak terbaca |
| 6 | W3C WAI-ARIA APG, Button Pattern | https://w3.org/WAI/ARIA/apg/patterns/button | Tombol toggle memakai `aria-pressed` true atau false; label tidak boleh berubah saat status berubah; Space dan Enter mengaktifkan | Laporan agen, dibaca penuh |
| 7 | Coursera blog, peluncuran Specializations (20 Jan 2014) | https://blog.coursera.org/coursera-specializations-focused-programs-in | "Multi-course series" dengan proyek capstone atau ujian; tidak menyebut prasyarat antar kursus; artikel lama, tidak mewakili aturan sekarang | Laporan agen |
| 8 | Dokumen K2 (rujukan internal) | `docs/riset/kurikulum-cybersecurity.md` bagian 4, 5, 7 | Tiga modul, 15 pelajaran, aturan tulis, keputusan terbuka | Penuh |
| 9 | Dokumen K1 (rujukan internal) | `docs/riset/kurikulum-level3.md` | Usulan Level 3 yang juga akan masuk `kursus.json` | Penuh |
| 10 | Kode repo | `tools/validasi-kursus.mjs`, `belajar/index.html`, `belajar/pelajaran.html`, `belajar/progress.js`, `admin/materi.js`, `tools/impor-draf.mjs`, `supabase/admin/003-draf-video.sql`, `supabase/waitlist.sql`, `index.html` | Bukti bagian 2 dan 3 | Dibaca langsung dan dijalankan |

Tabel perbandingan (cakupan, kekurangan, cara dokumen ini melengkapi):

| Sumber | Dicakup | Kurang untuk NERUVIA | Dilengkapi di sini |
|---|---|---|---|
| Claude Academy (1, 2) | Katalog datar dengan label tingkat dan produk, pelajaran terurut dalam kursus | Tidak ada pengelompokan topik yang bisa disaring dan tidak membahas progres lintas kursus | Rumpun sebagai label saringan, batas navigasi per rumpun |
| Microsoft Learn (3) | Tiga tingkat (path, module, unit) dan modul yang bisa dipakai bebas | Prasyarat dan tingkat tidak tampil sebagai bidang pada halaman yang dibaca | Aturan id tetap dan nomor per rumpun; prasyarat ditunda |
| schema.org dan Google (4, 5) | Nama bidang `coursePrerequisites`; dukungan hasil kaya untuk Course tampaknya dihentikan Google | Tidak mengatur struktur data internal | Dipakai hanya sebagai rujukan nama; tidak merencanakan markup Course untuk SEO (H1) sebelum diperiksa ulang |
| W3C APG (6) | Pola tombol toggle dan aturan label | Tidak membahas kelompok filter | Memakai pola yang sama dengan filter yang ada |
| Coursera (7) | Konsep rangkaian multi-kursus | Artikel 2014, tanpa aturan prasyarat | Hanya pembanding konsep, bukan dasar keputusan |

Cakupan yang tidak ditemukan di sumber mana pun dan ditambahkan di sini: aturan id yang menjaga kecocokan dengan gerbang id admin, impor, dan database; batas navigasi dan "lanjut" per rumpun; penyebut statistik yang hanya menghitung pelajaran berisi; daftar putih kunci level untuk menangkap salah ketik; pengukuran prototipe pada kode NERUVIA sendiri.

## 10. Hal yang belum terverifikasi

1. Sumber 3 sampai 7 dibaca lewat laporan agen web-fetch, bukan teks mentah. Kata-kata persis halaman Microsoft, schema.org, APG, dan Coursera tidak diperiksa kata demi kata.
2. Status dukungan hasil kaya Course di Google: hanya entri changelog 9 Sep 2025 (dibaca langsung oleh agen) dan hasil pencarian yang menyebut pemangkasan beberapa jenis data terstruktur di 2025. Saya tidak membaca satu pun artikel berita itu sampai menyebut "course info" secara eksplisit, dan 60 ribu karakter terakhir changelog tidak terbaca. Tidak dijadikan dasar keputusan.
3. Halaman Coursera yang berlaku sekarang (jumlah kursus, urutan, prasyarat Specialization) tidak dibaca. Sumber 7 berumur sebelas tahun.
4. Pembanding Microsoft dan Academy hanya menunjukkan pola; tidak ada data bahwa pengguna NERUVIA lebih terbantu oleh filter topik dibanding judul bagian. Itu asumsi UI.
5. Tinggi pesanan galeri dan CLS setelah empat kartu dan dua kelompok filter belum diukur (hanya dirancang). Angka 1037, 763, 512 px berasal dari komentar di `belajar/index.html`, belum diukur ulang di K3.
6. Jenis dan XP di Lampiran A adalah usulan yang saya buat; tidak diverifikasi terhadap isi pelajaran karena pelajarannya belum ditulis.
7. Constraint SQL `003-draf-video.sql` dibaca dari repo dan `docs/admin.md` menyatakan sudah diterapkan ke `neruvia-dev`; saya tidak memeriksa database langsung (run otomatis tidak boleh memakai konektor Supabase).
8. Kompatibilitas dengan impor progres lama, ekspor lama, dan `localStorage` pengguna sungguhan hanya dipikirkan, tidak diuji, karena kode tidak diubah.
9. Tidak ada nasihat hukum. Aturan hukum Indonesia tentang pelatihan daring tidak diperiksa.

## 11. Perlu keputusan Master

1. Setuju dengan Opsi B (level datar + `rumpun`, id `l4`), atau ingin awalan id sendiri (butuh migrasi database oleh Master)? Rekomendasi: Opsi B.
2. Setuju kartu "Keamanan Digital dari Nol" tampil di galeri pratinjau (noindex) berstatus `segera` sebelum landing dan waitlist menyebutnya? Rekomendasi: boleh di galeri, jangan di landing sampai K2 disetujui.
3. Kapan opsi keamanan masuk form waitlist? Itu butuh perubahan `waitlist_jalur_ok` (migrasi) dan daftar di `index.html`; keduanya di luar wewenang run otomatis.
4. Boleh mengerjakan M1 sampai M4 sebagai kegiatan loop tambahan (dan urutannya terhadap Level 3 dan penulisan pelajaran keamanan)?
5. Prasyarat antar level: ingin ditampilkan? Bila ya, apa bunyinya, karena itu klaim produk.

## 12. Pemeriksaan ulang lima klaim paling berisiko ke sumbernya

Dicek ulang langsung ke berkas atau hasil jalankan pada akhir run, bukan dari ingatan:

1. **Tiga gerbang id hanya menerima awalan `l`.** Dibaca ulang: `admin/materi.js:10`, `tools/impor-draf.mjs:34`, `supabase/admin/003-draf-video.sql:7` memuat pola yang sama `^l[0-9]{1,2}-m[0-9]{1,2}-p[0-9]{1,2}$`. Dijalankan: `k1-m1-p1` ditolak dua pola itu, `l4-m1-p1` lolos. Terbukti.
2. **Validator asli menerima `l4` dan mengabaikan bidang baru.** Dijalankan di salinan: `OK: 4 level, 45 pelajaran, 58 id unik`, kode keluar 0, termasuk saat bidang `rumpun` salah ketik. Terbukti.
3. **Tetangga di `pelajaran.html` lintas level.** Baris 92 menyusun daftar datar semua level, baris 184 mengambil `flat[i+1]`. Dihitung: setelah `l2-m3-p5` adalah `l4-m1-p1` (karena `l3` kosong). Terbukti pada data, belum diuji di browser.
4. **`lanjut()` berbeda antara `segera` dan `gratis`.** Dijalankan memakai `progress.js` asli di sandbox `vm`: `null` untuk `segera`, `l4-m1-p1` untuk `gratis`. Terbukti.
5. **`aria-pressed` dengan label tetap sudah dipakai filter sekarang.** `belajar/index.html:118-120` memuat tiga tombol berlabel tetap dengan `aria-pressed`; APG (laporan agen) menyebut label tidak boleh berubah. Kesesuaian benar pada kode; kutipan APG belum dicek kata demi kata (bagian 10 butir 1).

Yang tidak diperiksa sama sekali: perilaku di browser nyata, tampilan 390 dan 1440, CLS, pembaruan Supabase, dan semua tautan eksternal selain halaman yang dibaca agen.

## Lampiran A. Level `l4` yang diusulkan (belum masuk `kursus.json`)

Judul dari `docs/riset/kurikulum-cybersecurity.md` bagian 4. Id, jenis, dan XP mengikuti aturan validator (`xp_per_jenis`); semua `isi: "belum"`. Hasil validator asli pada salinan: lulus. Total 15 pelajaran, 300 XP (3 Konsep, 9 Praktik, 3 Latihan).

| Id | Judul | Jenis | XP |
|---|---|---|---|
| l4-m1-p1 | Apa saja yang kamu lindungi | Praktik | 20 |
| l4-m1-p2 | Kata sandi panjang dan unik | Praktik | 20 |
| l4-m1-p3 | Verifikasi dua langkah | Praktik | 20 |
| l4-m1-p4 | Bila akunmu mungkin sudah bocor | Latihan | 30 |
| l4-m1-p5 | Berbagi akun dan pemulihan | Konsep | 10 |
| l4-m2-p1 | Pola pesan yang meminta kamu bertindak sekarang | Konsep | 10 |
| l4-m2-p2 | Phishing lewat email, SMS, dan aplikasi pesan | Praktik | 20 |
| l4-m2-p3 | Penipuan lewat telepon, belanja, dan investasi | Praktik | 20 |
| l4-m2-p4 | Pesan dan suara tiruan buatan AI | Konsep | 10 |
| l4-m2-p5 | Kalau sudah terlanjur klik atau transfer | Latihan | 30 |
| l4-m3-p1 | Pembaruan perangkat lunak | Praktik | 20 |
| l4-m3-p2 | Cadangan yang benar-benar bisa dipakai | Praktik | 20 |
| l4-m3-p3 | Privasi dan jejak digital | Praktik | 20 |
| l4-m3-p4 | Perangkat dan jaringan rumah | Praktik | 20 |
| l4-m3-p5 | Rencana darurat satu halaman | Latihan | 30 |

Judul modul: "Akun yang sulit dibobol", "Mengenali penipuan dan pesan palsu", "Perangkat, data, dan privasi". Judul pelajaran terpanjang 47 huruf.
