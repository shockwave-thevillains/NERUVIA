# Draf halaman "Harga dan akses" NERUVIA (opsi tertulis)

Disusun 24 Nov 2026 oleh Claude (kegiatan K4). Ini bahan keputusan untuk Master, bukan halaman yang tayang, bukan nasihat hukum, pajak, atau keuangan. Tidak ada angka harga final di dokumen ini; setiap angka yang muncul hanya mengutip sumber bertanggal. Tidak ada klaim tentang sertifikat atau dukungan produk AI tertentu (lihat `docs/loop/PERLU-KEPUTUSAN.md` butir 1 dan 7). Kerangka pembayaran dan biaya ada di `docs/riset/pembayaran-monetisasi.md`; dokumen ini tidak mengulanginya.

## 1. Ringkasan

NERUVIA punya tiga pola akses yang masuk akal: gratis penuh yang dibiayai di luar pembelajar, gratis sebagian lalu bayar (Level 1 terbuka, level lanjut berbayar), dan bayar per kursus atau per level. Langganan bisa ditambahkan sebagai lapisan. Pembanding yang dibaca menunjukkan satu pola yang sering muncul: bagian gratis berupa materi yang bisa dibaca atau ditonton, bagian berbayar berupa latihan bernilai, penyimpanan progres, dan bukti penyelesaian. Karena NERUVIA sudah menyimpan progres di peramban dan latihannya ringan, garis pemisah gratis dan berbayar di NERUVIA harus dipilih sendiri, dan itu keputusan Master. Rekomendasi sementara ada di bagian 6.

## 2. Syarat dari proyek

- Tahap beta tetap gratis dan dashboard penjualan tetap "Menunggu" (riset pembayaran, bagian 5).
- "Level 1 gratis" dan "modul pertama gratis" tidak boleh tampil sebagai fakta sebelum Master mengonfirmasi (PRD, butir monetisasi). Semua teks contoh di bawah bersyarat: hanya dipakai bila opsinya dipilih.
- Halaman Harga tidak boleh menyebut sertifikat atau dukungan ChatGPT, Gemini, Claude, atau praktik dengan versi gratis, sebelum dikonfirmasi.
- Penjualan butuh backend untuk pembayaran dan pemberian akses; itu di luar situs statis sekarang. Halaman Harga hanyalah halaman informasi sampai ada keputusan penerima pembayaran.
- Pelajar di bawah 18 tahun belum diputuskan (PRD butir terbuka 1); halaman Harga perlu menyesuaikan setelah itu.

## 3. Yang dipelajari dari pembanding

Semua halaman diakses 24 Nov 2026 lewat agen web-fetch. "Dibaca" berarti isi halaman benar-benar terbaca.

| Sumber | Model akses | Yang gratis | Yang berbayar | Catatan untuk NERUVIA |
|---|---|---|---|---|
| Coursera, blog peluncuran Coursera Plus (terbit 12 Feb 2020, metadata diubah 27 Jan 2026) https://blog.coursera.org/introducing-coursera-plus-a-subscription-plan-for-unlimited-learning | Audit, kursus gratis, bantuan finansial, bayar per kursus, dan langganan harga tunggal | Audit, kursus gratis, bantuan finansial | Langganan dan pembelian per kursus; ada jaminan uang kembali 14 hari | Satu platform bisa memakai beberapa pola sekaligus, tetapi itu menambah pertanyaan bagi pembelajar |
| Class Central: cara kerja langganan Coursera (diperbarui 17 Mar 2023) https://classcentral.com/help/coursera-subscriptions | Langganan bulanan, uji coba 7 hari | Audit lewat halaman kursus, bukan lewat pendaftaran Specialization | Langganan setelah uji coba | Pembelajar yang hanya butuh sebagian harus ingat membatalkan; jelaskan pembatalan sejak awal. Sumber lebih dari tiga tahun, angka tidak dipakai |
| Class Central: biaya Coursera (diperbarui 19 Mar 2023) https://classcentral.com/help/how-much-coursera-cost | Audit, per kursus, langganan | Video, forum, bacaan; kursus gratis tanpa bukti penyelesaian | Tugas bernilai, bukti penyelesaian, mentoring | Opsi audit sering tidak terlihat saat daftar; halaman harga NERUVIA harus menampilkan jalur gratis sama jelas dengan jalur berbayar. Harga baru terlihat setelah masuk akun: hindari |
| DeepLearning.AI, apa yang didapat dari Pro (tanpa tanggal, hak cipta 2025) https://info.deeplearning.ai/knowledge-base/what-do-i-get-with-the-deeplearning.ai-pro-membership-that-i-dont-get-for-free | Free dan Pro | Video kursus, forum, buletin | Kuis dan lab interaktif, penyimpanan progres, bukti penyelesaian, proyek | Garis pemisah: materi dibaca gratis, latihan dan progres berbayar. Di NERUVIA progres lokal sudah gratis, jadi garis ini tidak bisa ditiru begitu saja |
| DeepLearning.AI, jenis keanggotaan (tanpa tanggal) https://info.deeplearning.ai/knowledge-base/types-of-memberships | Empat tingkat: Free, Pro, Team, Enterprise | Akses video dan komunitas | Pro, Team, Enterprise | Tingkat tim dan perusahaan ada di tangga yang sama; harga tidak dicantumkan di halaman, hanya tautan ke platform |
| Khan Academy, pendukung (periode donasi 1 Jul 2024 sampai 30 Jun 2025; halaman terbaca sebagian, 40 ribu dari 111 ribu karakter) https://www.khanacademy.org/about/supporters | Donasi, nirlaba | Platform belajar | Tidak ada produk berbayar di halaman ini | Gratis penuh bertumpu pada donatur; model nirlaba, bukan usaha |
| Khan Academy, tentang (tanpa tanggal; statistik tahun ajaran 2025–2026) https://www.khanacademy.org/about | Gratis untuk pembelajar | Platform dan alat guru | Status tutor AI Khanmigo tidak dijelaskan di halaman | Hindari ketidakjelasan serupa: tiap fitur harus jelas gratis atau berbayar |
| freeCodeCamp, sponsor (terbit 6 Jan 2021, diubah 28 Mei 2026) https://www.freecodecamp.org/news/sponsors/ | Donasi dan sponsor, nirlaba | Seluruh kurikulum terbuka | Tidak ada | Contoh gratis penuh didukung sponsor; tidak menyebut angka |
| Claude Academy, indeks kursus lewat konektor https://academy.claude.com/courses | Tidak tersurat di indeks | Indeks hanya memuat judul, tingkat, dan jumlah pelajaran | Tidak terlihat | Model akses Academy tidak terbaca; jangan dijadikan acuan |
| Dicoding, halaman akademi https://www.dicoding.com/academies/123 | Tidak terbaca | Halaman hanya mengembalikan meta tag | Tidak terbaca | Belum ada data model akses Dicoding; halaman penjual pihak ketiga ditolak (galat) |

Celah yang ditemukan. Pertama, pembanding kerap menyembunyikan jalur gratis atau menunjukkan harga hanya setelah masuk akun; halaman Harga NERUVIA bisa jadi lebih jelas dengan daftar "gratis" dan "berbayar" berdampingan. Kedua, tidak satu pun halaman yang dibaca memuat harga dalam rupiah atau menjelaskan cara bayar lokal (QRIS, VA); itu ruang pembeda NERUVIA setelah penerima pembayaran diputuskan. Ketiga, tidak ada pembanding yang dibaca menyebut kebijakan pembelajar di bawah 18 tahun.

## 4. Tiga opsi (ditambah satu lapisan)

### Opsi A: Gratis penuh selama fase awal
Seluruh materi dan latihan terbuka. Pembiayaan dari luar pembelajar (waktu sendiri, sponsor, atau donasi). Cocok bila tujuan sekarang adalah memvalidasi minat dan mengumpulkan waitlist.
- Kelebihan: tanpa backend pembayaran, tanpa kewajiban penjualan, selaras dengan beta gratis sekarang.
- Risiko: tidak menghasilkan pendapatan; pesaing gratis sudah banyak (riset pembayaran bagian 4), jadi gratis saja tidak membedakan NERUVIA.
- Perlu diputuskan: sampai kapan, dan apakah ada jalur donasi.
- Contoh teks (hanya bila dipilih): "Semua pelajaran di NERUVIA terbuka tanpa biaya selama masa awal ini. Kami akan memberi kabar lebih dulu bila ini berubah."

### Opsi B: Gratis sebagian, lalu berbayar
Level 1 terbuka; level lanjut berbayar (atau hanya sebagian modul). Pola ini sesuai arah hybrid di PRD dan pola "materi gratis, penguatan berbayar" yang dilihat pada DeepLearning.AI.
- Kelebihan: pembelajar mencoba dulu; jalur masuk berbiaya nol.
- Risiko: klaim "Level 1 gratis" belum dikonfirmasi; garis pemisah harus jelas supaya tidak mengulang kebingungan pembanding.
- Perlu diputuskan: level mana yang gratis, apakah latihan interaktif dan penyimpanan progres ikut gratis.
- Contoh teks (hanya bila dipilih): "Level 1 gratis. Level berikutnya berbayar; harga dan caranya diumumkan sebelum dibuka." (kalimat ini dilarang tayang sebelum Master mengonfirmasi)

### Opsi C: Bayar per kursus atau per level
Tiap level atau modul dijual satu kali, akses seterusnya (pola yang tampak pada pasar Indonesia menurut riset pembayaran bagian 4).
- Kelebihan: sederhana dijelaskan; tidak ada tagihan berulang yang perlu dibatalkan.
- Risiko: butuh backend untuk webhook dan pemberian akses; pembelajar sulit menilai nilai sebelum membeli bila tidak ada pratinjau gratis.
- Perlu diputuskan: satuan jual (modul, level), masa akses, kebijakan pengembalian dana.

### Lapisan tambahan: langganan
Bisa ditumpuk pada B atau C (akses ke seluruh katalog). Dari pembanding: sertakan masa uji dan cara berhenti yang terlihat jelas sejak halaman harga; jangan menyembunyikan pembatalan. Untuk NERUVIA dengan katalog kecil (tiga level, sebagian masih "segera"), langganan terlalu dini; nilainya baru tampak setelah katalog bertambah.

## 5. Aturan tampilan halaman Harga (berlaku apa pun opsinya)

1. Jalur gratis dan berbayar berdampingan dalam satu tabel, dengan label teks "Gratis" dan "Berbayar", tidak hanya warna atau ikon.
2. Setiap fitur memiliki status jelas; tidak ada fitur yang statusnya dibiarkan tersirat.
3. Harga terlihat tanpa harus masuk akun. Mata uang rupiah, termasuk apakah sudah termasuk pajak, dinyatakan.
4. Cara bayar hanya disebut bila penyedia sudah dipilih dan terpasang.
5. Cara berhenti, masa akses, dan kebijakan pengembalian dana tertulis sebelum tombol bayar.
6. Tidak menyebut sertifikat, dukungan produk AI tertentu, atau praktik dengan versi gratis sebelum dikonfirmasi.
7. Tidak memakai kata "gratis" untuk bagian yang butuh akun berbayar pihak ketiga.
8. Gaya mengikuti RUNBOOK: monokrom dengan aksen cyan, tanpa warna pastel, gerak mati bila `prefers-reduced-motion`.

## 6. Rekomendasi sementara

Opsi B dengan Level 1 sebagai bagian gratis, ditunda pelaksanaannya sampai tiga hal selesai: konfirmasi klaim "Level 1 gratis" (butir 1), penerima pembayaran dan rute (riset pembayaran, bagian 5), dan placeholder kebijakan privasi terisi (butir 2). Alasan: (1) PRD sudah memilih arah hybrid; (2) pesaing gratis banyak, jadi jalur masuk gratis mengurangi hambatan; (3) opsi A tidak menjawab tujuan pendapatan, opsi C tanpa pratinjau sulit dijual. Sebelum itu, halaman Harga cukup berisi satu kalimat "Beta gratis; harga diumumkan kemudian" dan formulir waitlist yang sudah ada, bukan tabel opsi. Rekomendasi ini bukan keputusan; Master dapat memilih opsi lain.

## 7. Yang belum terverifikasi

- Model akses Claude Academy dan Dicoding: halamannya tidak memuat informasi akses sehingga tidak ada dasar perbandingan.
- Angka harga Coursera dan DeepLearning.AI: sumber tidak mencantumkan atau lebih dari tiga tahun, dan tidak dipakai.
- Khan Academy: halaman pendukung terbaca sebagian saja (sekitar 40 ribu dari 111 ribu karakter); sisanya hanya ringkasan agen.
- Seluruh klaim regulasi dan biaya Indonesia di riset pembayaran tetap belum diperiksa ulang pada run ini: halaman Bank Indonesia (MDR QRIS 0% sampai Rp100.000), DJP (PP 20/2026), JDIH Komdigi (Permenkominfo 5/2020 Pasal 2), dokumen Midtrans, dan Avora (biaya Mayar) gagal dibuka karena izin pengambilan tidak dijawab. Jangan menuliskan angka biaya atau kewajiban pajak dan PSE di halaman Harga sebelum diperiksa.
- Apakah perlindungan konsumen dan aturan transaksi elektronik menuntut isi tertentu pada halaman harga (misalnya pemberitahuan harga, pengembalian dana): belum dibaca, perlu dikonfirmasi ke advokat. Dokumen ini tidak memberi nasihat hukum.
- Kebijakan untuk pembelajar di bawah 18 tahun.

## 8. Pemeriksaan ulang lima klaim paling berisiko

| No | Klaim | Hasil |
|---|---|---|
| 1 | Coursera memakai audit, langganan, dan bayar per kursus bersamaan | Terverifikasi pada blog Coursera (diubah 27 Jan 2026) dan dua halaman Class Central (Mar 2023) |
| 2 | DeepLearning.AI memisahkan materi video gratis dari lab, progres, dan bukti penyelesaian berbayar | Terverifikasi pada dua halaman basis pengetahuan resmi (tanpa tanggal) |
| 3 | Khan Academy dan freeCodeCamp gratis penuh dengan donasi dan sponsor | Terverifikasi pada halaman pendukung dan tentang (Khan sebagian), halaman sponsor freeCodeCamp |
| 4 | QRIS 0% sampai Rp100.000 per 1 Okt 2026 | Tidak terverifikasi pada run ini (halaman BI gagal dibuka) |
| 5 | PP 20/2026: PPh final 0,5% tanpa batas waktu bagi orang pribadi | Tidak terverifikasi pada run ini (halaman DJP gagal dibuka) |
