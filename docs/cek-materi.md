# Alat cek materi (`tools/cek-materi.mjs`)

Kegiatan L1, 24 Nov 2026. Alat ini membaca `content/pelajaran/*.json` dan mencetak peringatan tentang gaya dan kepatuhan materi. Ia **hanya membaca**: tidak menulis, mengubah, atau menghapus berkas, tidak memakai jaringan, dan tidak menjalankan proses lain. Ia tidak menggantikan tinjauan Master, bukan pemeriksa fakta, dan bukan nasihat hukum.

## Cara pakai

```
node tools/cek-materi.mjs                                        semua pelajaran
node tools/cek-materi.mjs content/pelajaran/l1-m1-p1.json        hanya berkas itu (pelajaran lain dipakai sebagai pembanding K15)
node tools/cek-materi.mjs --ketat                                kode keluar 1 bila ada peringatan P
node tools/cek-materi.mjs --json --semua                         keluaran mesin, semua temuan
node tools/uji-cek-materi.mjs                                    uji alat pada salinan sementara (sekitar 11 detik)
```

Opsi lain: `--akar <folder>` (akar repo, dipakai uji), `--kalimat-maks`, `--kata-min`, `--kata-maks`, `--toleransi`, `--bantuan`. Kode keluar: 0 selesai (ada atau tanpa temuan), 1 hanya dengan `--ketat` dan ada P, 2 salah pakai atau berkas tak terbaca. Bawaan menampilkan paling banyak 5 temuan per kode per berkas; `--semua` menampilkan semuanya.

Tingkat **P** (peringatan) berarti perlu ditinjau manusia sebelum draf disetujui. Tingkat **C** (catatan) berarti kemungkinan wajar, tetapi layak dilihat. Alat tidak menyatakan lulus atau gagal; ia menunjuk tempat yang perlu dibaca.

## Kode pemeriksaan

| Kode | Yang diperiksa | Tingkat |
|---|---|---|
| K01 | Panjang kalimat (bawaan 30 kata; titik koma memisah butir daftar) | C di atas 30, P di atas 37 |
| K02 | Merujuk video, audio, podcast, atau rekaman (materi hanya teks) | P |
| K03 | Janji berlebihan: dijamin, pasti benar/berhasil/untung, 100%, tanpa risiko, selalu benar. Kalimat yang menyangkalnya (jangan, tidak, keliru) dilewati | P; C bila di contoh, pengecoh soal, atau dalam tanda kutip |
| K04 | Nama produk chatbot. Bersama klaim dukungan atau akses (didukung, tersedia, gratis, khusus) | C; P bila ada klaim |
| K05 | "Gratis", "tanpa biaya", "free" (Level 1 gratis dan versi gratis belum dikonfirmasi Master) | P; C hanya di contoh fiktif atau konteks ongkos kirim tanpa menyebut NERUVIA |
| K06 | Jumlah uang atau harga, langganan, diskon, pembayaran | C; P bila bersama kata NERUVIA |
| K07 | Sertifikat, bersertifikat, sertifikasi (belum dikonfirmasi Master) | P |
| K08 | Nomor pasal atau undang-undang, perintah langkah hukum; istilah hukum umum | P; C untuk istilah |
| K09 | Alamat email, nomor telepon, URL, nama pengguna @ (jangan menampilkan identitas atau kontak nyata) | P |
| K10 | Tag HTML, `javascript:`/`data:` URL, atribut `on*`, karakter kontrol, nol-lebar, pengecoh arah | P |
| K11 | Kata merendahkan pembaca; sapaan "Anda" (materi memakai "kamu") | P; C untuk "Anda" |
| K12 | Struktur: 700–1.100 kata tanpa interaktif (toleransi 50), 5–7 bagian, bagian "Kesalahan yang sering terjadi" dan "Kapan ...", label fiktif di contoh, Tahap 1–3 dan daftar periksa di latihan, 3 soal, 3 ringkasan, status, awalan tujuan | P; C untuk 1.101–1.150 kata dan awalan tujuan |
| K13 | Soal cek: opsi ganda, opsi benar paling panjang (≥15% di atas pengecoh terpanjang) di 2 dari 3 soal, ketiga jawaban benar di nomor sama, penjelasan di bawah 15 kata | P untuk opsi ganda; selain itu C |
| K14 | Kutipan 25 kata atau lebih di paragraf bagian (aturan: maksimal satu frasa pendek) | C |
| K15 | Urutan 14 kata atau lebih yang sama persis dengan pelajaran lain (teks interaktif tidak dibandingkan) | C |
| K16 | Paragraf lebih dari 120 kata; string lebih dari 20.000 huruf; struktur terlalu dalam | C; P untuk dua yang terakhir |
| K17 | Penanda belum selesai (TODO, "Materi sedang disusun"), string kosong | P |

Keamanan alat sendiri: berkas lebih dari 1 MB, tautan simbolik, dan yang bukan berkas biasa ditolak; kedalaman 12 tingkat dan 20.000 simpul dibatasi; teks yang dicetak dibersihkan dari kode escape terminal, bel, karakter nol-lebar, dan pengecoh arah (jadi pelajaran berisi `ESC[31m` tidak bisa mewarnai atau menyusupkan perintah ke terminal). Kunci `__proto__` dan `constructor` di JSON tidak menjatuhkan alat dan tidak mencemari objek.

## Hasil pada 30 pelajaran yang ada (24 Nov 2026)

Kalibrasi dilakukan dua putaran pada data nyata, lalu pelajaran tidak diubah.

| | Putaran 1 (pola awal) | Putaran 2 (setelah kalibrasi) |
|---|---|---|
| Peringatan P | 29 | 5 |
| Catatan C | 150 | 144 |

Perubahan kalibrasi putaran 1 ke 2, masing-masing karena positif palsu yang ditemukan di data: (a) titik koma memisah butir daftar periksa, sehingga 10 daftar periksa "(1) ...; (2) ..." tidak lagi dihitung sebagai satu kalimat 39–52 kata; (b) pengecoh soal, contoh versi buruk, dan teks dalam tanda kutip yang memuat "pasti benar" menjadi C, bukan P (7 temuan); (c) "tanpa biaya" dalam contoh fiktif menjadi C; (d) "jerih payah" bukan kata merendahkan ("payah" saja tetap ditandai).

Temuan sesudah kalibrasi, tanpa mengubah pelajaran (perbaikan teks menjadi bahan kegiatan L5, hanya pada pelajaran berstatus DRAF):

- **Jumlah kata** (tanpa latihan interaktif): terkecil 1.040, terbesar 1.103, rata-rata 1.091. Enam pelajaran Level 2 berada di 1.101–1.103 kata, masih dalam toleransi 50. `l1-m1-p3` memuat tambahan 647 kata latihan interaktif yang tidak dihitung ke batas; dengan semuanya ia 1.710 kata.
- **Lima kalimat di atas 37 kata** (P): `l1-m3-p3` dan `l2-m2-p3` di petunjuk latihan, `l1-m3-p5` dan `l2-m1-p2` di contoh, `l2-m2-p4` di bagian[3].paragraf[0]. Total 27 kalimat di atas 30 kata di 13 pelajaran.
- **Panjang opsi bisa menjadi petunjuk (K13)**: di 20 dari 30 pelajaran opsi benar paling panjang (≥15% di atas pengecoh terpanjang) pada sedikitnya 2 dari 3 soal. Dihitung terpisah: pada 70 dari 90 soal opsi benar adalah yang terpanjang. `l1-m1-p2` dan `l1-m3-p5` memiliki ketiga jawaban benar di nomor opsi yang sama. Dua penjelasan soal di bawah 15 kata.
- **Kalimat yang sama antarpelajaran (K15)**: empat pasangan berbagi urutan 14–19 kata, semuanya kalimat penutup atau pengingat yang diulang (mis. "Jangan jadikan AI satu-satunya dasar untuk urusan hukum, kesehatan, atau uang ..." di `l1-m3-p4`/`l1-m3-p5`/`l2-m1-p2`; daftar periksa pernyataan bantuan AI di `l2-m2-p5` dan `l2-m3-p5`). Pengulangan penafian ini disengaja; alat hanya memberi tahu.
- **Tidak ada**: K02 (media), K07 (sertifikat), K08 (nomor pasal/UU), K09 (kontak), K10 (karakter berbahaya), K12 tingkat P, dan K03/K04/K05/K06 tingkat P. Artinya tidak ada klaim belum dikonfirmasi (gratis, dukungan produk, sertifikat, harga NERUVIA) di 30 pelajaran. Nama produk muncul 47 kali di 22 pelajaran, semuanya rujukan sumber ("dokumen resmi Claude ...", "Claude Academy"), tercatat sebagai C.

## Uji

`tools/uji-cek-materi.mjs`: 137 pemeriksaan pada salinan sementara. Pelajaran dasar sintetis (kontrol positif, nol temuan) lalu satu kasus negatif atau lebih per kode, kasus kontrol yang tidak boleh ditandai (kalimat penyangkal, "jerih payah", kata "data:" biasa, teks berbeda), masukan jahat (kode escape, pengecoh arah, bel, tag HTML, `__proto__`, JSON rusak, bentuk JSON bukan objek, berkas 1,1 MB, tautan simbolik, folder, struktur 40 tingkat, string 25.000 huruf), 20 kasus opsi baris perintah dan kode keluar, pemeriksaan tidak menulis apa pun (isi salinan identik sebelum dan sesudah, status git repo tidak berubah, kode alat tidak memuat fungsi tulis atau jaringan), fungsi murni, dan salinan repo nyata (30 berkas tanpa galat baca). Uji mutasi: 30 perusak sengaja dipasang satu per satu pada salinan alat (mencabut pola K02/K03/K07/K08/K09/K10/K05, pengecualian negasi, kutipan, singkatan, titik koma, batas bagian, `--ketat`, kode keluar 2, batas 1 MB, tautan simbolik, hanya `.json`, pembersih terminal, id ganda, memasukkan fungsi tulis, dan sebagainya) plus satu kontrol tanpa perubahan. Kontrol lulus penuh dan **30 dari 30 perusak membuat uji gagal** setelah dua perbaikan uji: perusak "titik koma" dan "bendera g" semula lolos karena ujinya terlalu lemah (kalimat percobaan hanya 28 kata; regresi bendera `g` belum ada), lalu diperkuat. Satu perusak setara (menghapus pembersihan ganda pada kutipan K10) tidak mengubah keluaran karena `aman()` membersihkan teks lagi sebelum dicetak, jadi tidak dihitung.

## Batas yang diketahui

- Pemeriksa berbasis pola teks. Kalimat bernegasi di tempat lain (mis. sanggahan di kalimat sebelumnya) tidak dikenali; pola janji yang disangkal hanya dilewati bila penyangkal ada di kalimat yang sama sebelum frasanya.
- Pemecah kalimat mengenali singkatan umum (dkk., dst., dll., Bu, Pak, No., inisial), tetapi singkatan baru bisa memecah kalimat terlalu dini.
- K04–K06 bergantung pada daftar kata di berkas; nama produk atau istilah baru tidak ditandai sebelum ditambahkan ke daftar.
- Alat tidak memeriksa kebenaran fakta, kualitas contoh, kecocokan soal dengan isi, atau kemiripan dengan sumber di luar repo (aturan "jangan menyalin" tetap diperiksa lewat riset dan tinjauan manusia).
- Hanya `content/pelajaran/*.json`. Teks landing, FAQ, dan halaman lain tidak diperiksa.
