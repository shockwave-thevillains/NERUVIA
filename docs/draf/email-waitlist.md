# Draf email waitlist NERUVIA (sambutan dan pengumuman)

Disusun 24 Nov 2026 oleh Claude (kegiatan K5). Ini bahan keputusan dan teks siap tinjau untuk Master, bukan email yang dikirim, bukan nasihat hukum. Tidak ada layanan email yang disambungkan dan tidak ada alamat nyata yang dihubungi. Semua teks bertanda `[...]` adalah placeholder yang harus diisi Master sebelum dipakai. Tidak ada klaim tentang Level 1 gratis, dukungan produk AI tertentu, harga, atau sertifikat sebagai fakta; kalimat yang menyinggungnya ditandai sebagai bersyarat dan dilarang dipakai sebelum Master mengonfirmasi (`docs/loop/PERLU-KEPUTUSAN.md` butir 1, 7, dan K4). Kerangka rujukan ada di `docs/loop/RUJUKAN.md`.

## 1. Ringkasan

Waitlist NERUVIA butuh empat email: konfirmasi pendaftaran (E1), pengumuman modul pertama dibuka (E2), kabar harga (E3), dan konfirmasi setelah pembelajar berhenti atau data dihapus (E4). Rujukan yang dibaca sepakat pada tiga hal: pembelajar harus bisa berhenti semudah mendaftar, permintaan berhenti harus diproses cepat, dan email pemasaran perlu identitas pengirim yang jelas. Angka batas waktunya berbeda per sumber (3 x 24 jam menurut UU PDP, 48 jam menurut panduan Gmail, 10 hari kerja menurut FTC), jadi rekomendasi draf ini memakai yang paling ketat: proses dalam 24 jam, dan jangan pernah lebih dari 48 jam. Dua hal menentukan seluruh draf dan hanya Master yang bisa menjawabnya: apakah teks persetujuan di form (versi v4) mencakup email konfirmasi, dan identitas pengendali serta alamat di kebijakan privasi, yang masih placeholder. Rekomendasi sementara ada di bagian 7.

## 2. Syarat dari proyek

- **Cakupan persetujuan.** Teks di form (`index.html`, versi `v4 2026-11-19`) menyebut tiga tujuan: kabar peluncuran, harga, dan akses modul pertama. Kebijakan privasi (versi 2, draf) menyebut tiga tujuan yang sama. Email di luar tiga tujuan itu (promosi produk lain, survei, kabar mitra) tidak tercakup dan tidak ada di draf ini. Bila tujuan bertambah, teks persetujuan versi baru dan persetujuan baru diperlukan; versi baru juga harus didaftarkan di constraint `waitlist_consent_text_known` (lihat `docs/waitlist-backend.md`).
- **Berhenti.** Teks di form menyatakan data bisa dihapus dan persetujuan ditarik kapan saja, dan kebijakan privasi menyebut tautan berhenti berlangganan di setiap email. Jadi setiap email wajib memuatnya.
- **Usia.** Waitlist khusus 18 tahun ke atas. Email tidak boleh menyasar pelajar atau anak.
- **Kebijakan privasi masih draf.** Identitas pengendali, alamat, email kontak, prosesor, dan tanggal berlaku masih placeholder (butir 2). Email tidak boleh dikirim sebelum itu terisi, karena footer email memuat identitas dan alamat yang sama.
- **Layanan email belum dipilih.** Kebijakan privasi memuat satu placeholder untuk penyedia pengiriman email. Draf ini netral terhadap penyedia.
- **Klaim terlarang sebagai fakta.** Level 1 gratis, dukungan ChatGPT/Gemini/Claude, praktik dengan versi gratis, harga, dan sertifikat.
- **Bahasa.** Bahasa Indonesia sederhana, SPOK, kalimat pendek (MATERI.md). Gaya monokrom dan Neru hanya berlaku bila email berbentuk HTML; draf ini berupa teks polos.

## 3. Yang dipelajari dari rujukan

Semua diakses 24 Nov 2026. "Penuh" berarti halaman terbaca utuh oleh agen web-fetch atau konektor Claude_Academy (hanya baca). Tidak ada kalimat yang disalin; parafrase kecuali satu frasa pendek.

| Sumber | Yang dicakup | Yang kurang untuk NERUVIA | Cara draf ini melengkapi |
|---|---|---|---|
| Claude Academy, use case "Create on-brand content" https://academy.claude.com/use-cases/on-brand-content (penuh) | Menyusun seluruh rangkaian email sekaligus dari satu brief supaya pesannya konsisten; panduan suara dianggap batas, bukan inspirasi; minta AI menandai bagian yang bahannya tipis | Tidak membahas persetujuan penerima atau berhenti berlangganan | Empat email ditulis satu rangkaian dengan satu daftar kata dan nada; bagian yang butuh keputusan ditandai, bukan diisi karangan |
| Claude Academy, lesson "Workflow augmentation" (kursus AI Fluency untuk nirlaba) https://academy.claude.com/courses/ai-fluency-for-nonprofits/workflow-augmentation (penuh) | Pilah tugas yang boleh diserahkan ke AI dan yang harus tetap manusia; tinjau tiap jawaban sebelum terkirim di awal; jujur bila pesan dibantu sistem | Contoh balasan email acara, bukan email pendaftaran | Bagian 6 memutuskan draf ini ditinjau manusia sebelum kirim, dan tidak ada balasan otomatis ke keluhan atau permintaan data |
| FTC, CAN-SPAM Act: A Compliance Guide for Business https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business (penuh; tertera Agustus 2023, diubah 2025) | Delapan kewajiban untuk email komersial: tidak menyesatkan, subjek tidak menipu, tandai bila iklan, alamat pos valid, cara berhenti jelas, hormati permintaan berhenti dalam 10 hari kerja, awasi pihak ketiga; email transaksional dikecualikan dari sebagian besar aturan tetapi dibaca sempit | Hukum Amerika Serikat, bukan Indonesia; panduan, bukan teks undang-undang | Dipakai sebagai daftar periksa praktik baik, bukan dasar hukum NERUVIA |
| Google, Email subscription guidelines for senders https://support.google.com/mail/answer/15263077?hl=en (penuh; tanpa tanggal) dan Email sender guidelines FAQ https://support.google.com/a/answer/14229414 (penuh; tanpa tanggal; halaman utama https://support.google.com/a/answer/81126 tidak terbaca) | Pesan langganan perlu berhenti satu klik; proses dalam 48 jam; konfirmasi alamat sebelum mengirim; alamat From berbeda untuk langganan dan non-langganan; batas laporan spam di bawah 0,3%; pengirim massal didefinisikan sekitar 5.000 pesan per hari ke akun Gmail pribadi | Untuk pengirim besar; waitlist baru kecil | Dipakai sebagai target mutu sejak awal, supaya tidak perlu diubah saat daftar membesar |
| IETF, RFC 8058 https://www.rfc-editor.org/rfc/rfc8058 (penuh; Januari 2017) | Cara teknis berhenti satu klik: header `List-Unsubscribe` plus `List-Unsubscribe-Post` dengan nilai `List-Unsubscribe=One-Click`, keduanya tertanda tangan DKIM; pengirim tidak boleh membalas POST dengan pengalihan | Spesifikasi, bukan panduan; butuh penyedia atau server yang mendukung | Bagian 6 menjadikannya syarat saat memilih penyedia, tanpa mengimplementasikan apa pun sekarang |
| ICO (Inggris), Respect people's preferences https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences (penuh; metadata 28 Apr 2026) | Berhenti berarti berhenti untuk tujuan itu; menarik persetujuan harus semudah memberikannya; boleh menyimpan daftar penekan berisi data minimum agar orang yang sudah menolak tidak dihubungi lagi; tidak ada batas hari tertulis | Hukum Inggris | Dipakai untuk usulan daftar penekan di bagian 6 (butuh keputusan Master dan sinkron dengan kebijakan privasi) |
| UU 27/2022 tentang Pelindungan Data Pribadi, teks di JDIH Komdigi https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang+nomor+27+tahun+2022 (teks pasal terbaca; ringkasan otomatis alat keliru pada beberapa pasal sehingga hanya teks mentah dipakai) | Pasal 20 ayat (2) huruf a: persetujuan untuk tujuan tertentu yang sudah disampaikan; Pasal 21: informasi yang wajib disampaikan saat meminta persetujuan; Pasal 22: persetujuan tertulis atau terekam, jelas dibedakan, bahasa sederhana (penjelasan: Bahasa Indonesia); Pasal 9: hak menarik persetujuan; Pasal 40: berhenti memproses paling lambat 3 x 24 jam sejak permintaan | Sekitar 8.000 karakter terakhir (bagian penjelasan) tidak terbaca mentah; tidak memuat aturan khusus email pemasaran | Dasar tertinggi bagi batas waktu berhenti di draf ini; tafsir untuk NERUVIA tetap perlu advokat |
| Mailchimp, single opt-in vs double opt-in https://mailchimp.com/help/single-opt-in-vs-double-opt-in/ (penuh; tanpa tanggal artikel) | Single opt-in masuk daftar langsung; double opt-in menuntut klik tautan di email konfirmasi, mengurangi spam dan memastikan alamat valid; Mailchimp menyarankan double opt-in bila bukan mengejar pertumbuhan | Tidak merinci isi email sambutan untuk single opt-in | E1 ditulis dalam dua varian (E1-A konfirmasi satu langkah, E1-B konfirmasi dengan tautan verifikasi) |
| Kebijakan privasi NERUVIA dan form di repo (`kebijakan-privasi.html`, `index.html`, `docs/waitlist-backend.md`) | Tiga tujuan pemrosesan, hak pembelajar, tautan berhenti berlangganan di setiap email, usia 18+, data disimpan sampai peluncuran atau penghapusan | Placeholder pengendali, alamat, kontak, prosesor | Daftar hal yang harus terisi ada di bagian 8 |

Celah yang ditemukan. (1) Tidak satu pun rujukan yang dibaca membahas email waitlist untuk platform belajar berbahasa Indonesia; contoh sambutan dan etika kirim berasal dari praktik umum, jadi nada Indonesia ditulis sendiri. (2) Rujukan hukum pemasaran email di atas dari luar negeri; UU PDP hanya mengatur data pribadi, bukan pemasaran email secara khusus, dan aturan Indonesia lain (misalnya untuk pesan elektronik komersial) belum dibaca. (3) Panduan Gmail menyebut konfirmasi alamat (double consent) sebagai pedoman, sedangkan form NERUVIA sekarang tidak memverifikasi kepemilikan email; itu membuka kemungkinan orang mendaftarkan alamat orang lain. Ini keputusan Master (butir 7).

## 4. Empat email dan kapan dikirim

| Kode | Kapan | Tujuan persetujuan yang menaungi | Jenis | Keputusan yang dibutuhkan |
|---|---|---|---|---|
| E1 | Segera setelah pendaftaran | Kabar peluncuran | Konfirmasi (varian A atau B) | Apakah konfirmasi dihitung tercakup teks persetujuan v4; pilih varian |
| E2 | Saat modul pertama dibuka | Akses modul pertama dan kabar peluncuran | Pengumuman | Tanggal, tautan, dan klaim gratis (hanya bila dikonfirmasi) |
| E3 | Sebelum harga diumumkan ke publik | Harga | Pengumuman | Hanya dikirim setelah Master memilih opsi di `docs/draf/harga-akses.md`; angka dari Master |
| E4 | Setelah berhenti atau data dihapus | Pemenuhan hak | Konfirmasi tanpa ajakan | Kebijakan privasi menjanjikan pemberitahuan setelah penghapusan |

Tidak ada rangkaian otomatis lanjutan (misalnya tiga email berjarak hari). Selain tiga tujuan di atas, email tambahan membutuhkan teks persetujuan baru.

## 5. Teks email (draf, belum dikirim)

Aturan nada: sapaan "kamu", kalimat pendek, satu ajakan per email, tanpa tanda seru berlebihan, tanpa janji hasil, dan tanpa klaim tentang produk AI tertentu. Data contoh fiktif; "Nama" diisi dari form bila ada, bila kosong pakai "Halo,".

### E1-A. Konfirmasi pendaftaran (satu langkah)

Subjek: `Kamu sudah masuk waitlist NERUVIA`
Prapratinjau: `Kami akan mengabarimu saat modul pertama dibuka.`

```
Halo [Nama],

Terima kasih sudah mendaftar di waitlist NERUVIA. Pendaftaranmu sudah kami terima.

Yang kami simpan: nama panggilan (bila kamu isi), alamat email ini, dan level yang paling menarik bagimu: [Level yang dipilih].
Yang akan kami kirim: kabar peluncuran, kabar harga, dan akses modul pertama. Tidak ada yang lain.

Bukan kamu yang mendaftar, atau kamu berubah pikiran? Berhenti kapan saja lewat tautan ini:
[TAUTAN BERHENTI]

Kamu juga bisa meminta data dihapus atau menarik persetujuan lewat [EMAIL URUSAN DATA PRIBADI]. Rincian ada di Kebijakan Privasi: [TAUTAN KEBIJAKAN PRIVASI].

Salam,
Tim NERUVIA

[NAMA PENGELOLA ATAU BADAN USAHA] · [ALAMAT KORESPONDENSI]
```

Catatan peninjau: kalimat "Bukan kamu yang mendaftar" sengaja dekat bagian atas karena form tidak memverifikasi alamat; itu satu-satunya perlindungan bagi pemilik alamat yang didaftarkan orang lain.

### E1-B. Konfirmasi dengan tautan verifikasi (dua langkah)

Subjek: `Satu langkah lagi: konfirmasi emailmu`
Prapratinjau: `Klik tautan di bawah agar kamu resmi masuk waitlist NERUVIA.`

```
Halo [Nama],

Seseorang, semoga kamu, memakai alamat email ini untuk mendaftar di waitlist NERUVIA. Agar pendaftaran selesai, konfirmasi lewat tautan ini:
[TAUTAN KONFIRMASI]

Kalau bukan kamu, abaikan email ini. Tanpa konfirmasi, alamatmu tidak akan menerima kabar apa pun dari kami dan datanya akan kami hapus dalam [BATAS HARI, DIPUTUSKAN MASTER].

Setelah dikonfirmasi, kami hanya mengirim kabar peluncuran, kabar harga, dan akses modul pertama. Kamu bisa berhenti kapan saja. Rincian ada di Kebijakan Privasi: [TAUTAN KEBIJAKAN PRIVASI].

Salam,
Tim NERUVIA

[NAMA PENGELOLA ATAU BADAN USAHA] · [ALAMAT KORESPONDENSI]
```

Catatan peninjau: E1-B butuh perubahan di luar situs statis (token konfirmasi dan kolom status di database), jadi masuk wewenang Master atau sesi interaktif, bukan loop ini.

### E2. Modul pertama dibuka

Subjek: `Modul pertama NERUVIA sudah dibuka`
Prapratinjau: `Kamu bisa mulai belajar sekarang.`

```
Halo [Nama],

Modul pertama NERUVIA sudah dibuka. Kamu mendapat email ini karena kamu masuk waitlist dan menyetujui kabar peluncuran dari kami.

Mulai dari sini: [TAUTAN KE RUANG BELAJAR]
Modul pertama berjudul "Kenalan dengan AI". Isinya lima pelajaran teks dengan latihan singkat yang bisa dikerjakan di chatbot AI apa pun yang kamu pakai.

[HANYA BILA MASTER SUDAH MENGONFIRMASI "MODUL PERTAMA GRATIS": Modul pertama bisa kamu ikuti tanpa biaya.]
[HANYA BILA MASTER SUDAH MENGONFIRMASI: kalimat tentang level berikutnya.]

Progres belajarmu tersimpan di peramban ini saja. Kami belum membuat akun, jadi bila kamu ganti perangkat, ekspor progresmu lebih dulu dari halaman belajar.

Berhenti menerima kabar dari kami kapan saja:
[TAUTAN BERHENTI]

Salam,
Tim NERUVIA

[NAMA PENGELOLA ATAU BADAN USAHA] · [ALAMAT KORESPONDENSI]
```

Catatan peninjau: nama modul dan jumlah pelajaran sesuai `content/kursus.json` pada 24 Nov 2026 dan harus dicek ulang pada hari kirim. Kalimat tentang progres hanya benar selama belum ada akun.

### E3. Kabar harga

Subjek: `Kabar harga NERUVIA, sebelum diumumkan ke publik`
Prapratinjau: `Kamu mendapat kabarnya lebih dulu.`

```
Halo [Nama],

Kamu masuk waitlist NERUVIA dan menyetujui kabar harga dari kami. Ini kabarnya.

[RINGKASAN OPSI YANG DIPILIH MASTER, TANPA ANGKA SAMPAI MASTER MENETAPKAN. Tuliskan apa yang gratis dan apa yang berbayar berdampingan, dengan kata-kata yang sama seperti halaman Harga.]
[ANGKA, CARA BAYAR, DAN KEBIJAKAN PENGEMBALIAN DANA: diisi Master. Jangan menyebut metode pembayaran yang belum aktif.]

Tidak ada kewajiban membeli. Kamu bisa berhenti menerima kabar kapan saja:
[TAUTAN BERHENTI]

Salam,
Tim NERUVIA

[NAMA PENGELOLA ATAU BADAN USAHA] · [ALAMAT KORESPONDENSI]
```

Catatan peninjau: jangan kirim sebelum halaman Harga dan regulasi pembayaran selesai ditinjau (K4, bagian 7). Jangan menyebut sertifikat.

### E4. Konfirmasi berhenti atau penghapusan

Subjek: `Kamu sudah berhenti dari waitlist NERUVIA`

```
Halo,

Kami sudah menghentikan kabar dari NERUVIA ke alamat ini. [BILA PENGHAPUSAN DIMINTA: Datamu di waitlist sudah kami hapus, kecuali satu catatan minimal berisi alamat email ini agar kami tidak mengirim apa pun lagi.]

Tidak ada tindakan yang perlu kamu lakukan. Kalau ini keliru, daftar lagi kapan saja di [TAUTAN WAITLIST]; kami tidak akan mendaftarkanmu sendiri.

Salam,
Tim NERUVIA
```

Catatan peninjau: E4 tidak mengandung ajakan apa pun supaya tidak dihitung pemasaran. Kalimat tentang catatan minimal hanya benar bila Master menyetujui daftar penekan (bagian 6, butir 6) dan menuliskannya di kebijakan privasi.

## 6. Aturan yang harus dipenuhi sebelum kirim

1. **Berhenti di setiap email pemasaran** (E1 sampai E3): tautan terlihat jelas di badan email, dan penyedia mendukung berhenti satu klik lewat header `List-Unsubscribe` dan `List-Unsubscribe-Post: List-Unsubscribe=One-Click` yang tertanda tangan DKIM (RFC 8058, panduan Gmail). Tautan mailto saja tidak cukup untuk satu klik menurut panduan Gmail.
2. **Batas waktu internal 24 jam**, tidak pernah lebih dari 48 jam, untuk berhenti dan penarikan persetujuan. Dasarnya: UU PDP Pasal 40 ayat (2) menyebut paling lambat 3 x 24 jam sejak permintaan diterima; panduan Gmail menyebut 48 jam; FTC menyebut 10 hari kerja. Target 24 jam menjaga ketiganya.
3. **Identitas dan alamat di footer**: nama pengendali dan alamat korespondensi dari kebijakan privasi (butir 2). Tanpa itu, jangan kirim. Judul email tidak boleh menipu dan tidak boleh menyamar sebagai balasan atau email dari orang lain.
4. **Alamat pengirim**: satu alamat From untuk kabar waitlist dan alamat lain untuk balasan atau urusan data pribadi (panduan Gmail menyarankan memisahkan pesan langganan dari non-langganan). Autentikasi SPF, DKIM, dan DMARC aktif di domain pengirim sebelum email pertama.
5. **Pelacakan**: matikan pelacakan buka dan klik di penyedia sampai kebijakan privasi menyebutnya. Kebijakan sekarang menyatakan tidak ada analitik pihak ketiga; piksel pelacak di email akan bertentangan dengan itu.
6. **Daftar penekan**: simpan hanya alamat yang sudah berhenti, tanpa nama dan level, agar tidak terdaftar ulang lewat impor. ICO menyarankan ini, tetapi kebijakan privasi belum menyebutnya dan janji "hapus data" di form perlu disesuaikan. Keputusan Master dan advokat.
7. **Ditinjau manusia**: tidak ada pengiriman otomatis dari keluaran AI. Tiap email dibaca Master sebelum kirim, dan setiap balasan atas permintaan data ditangani manusia.
8. **Batas kirim awal**: tahap awal hanya ke daftar kecil dan hanya setelah tiap placeholder terisi. Alasannya praktis, bukan hukum: laporan spam di atas 0,3% menurunkan penerimaan di Gmail (panduan Gmail).
9. **Catat bukti**: simpan waktu kirim, versi teks persetujuan (`consent_text`), dan waktu berhenti per alamat. Kolom persetujuan sudah ada di tabel waitlist.
10. **Bukan hanya pemasaran**: E4 dan konfirmasi hak (akses, perbaikan, penghapusan) tidak boleh berisi ajakan.

## 7. Rekomendasi sementara dan pertanyaan untuk Master

Rekomendasi: kirim E1-A segera setelah form tersambung, jadikan E1-B target berikutnya bila Master menginginkan verifikasi alamat, dan tahan E2 sampai klaim gratis jelas. E3 tidak disusun lebih jauh sebelum harga diputuskan. Alasan: E1-A cukup sederhana untuk dijalankan tanpa perubahan backend, E1-B butuh token dan status di database, sedangkan E2 dan E3 memuat klaim yang belum boleh dinyatakan.

Pertanyaan yang perlu dijawab Master:
1. Apakah email konfirmasi E1 dianggap tercakup teks persetujuan v4 ("kabar peluncuran, harga, dan akses modul pertama"), atau teks perlu versi baru yang menyebut konfirmasi? Konfirmasi ke advokat.
2. E1-A atau E1-B? Form sekarang tidak memverifikasi alamat, jadi orang bisa mendaftarkan alamat orang lain.
3. Penyedia pengiriman email (butir 2) harus mendukung berhenti satu klik dan DKIM; sebutkan pilihannya setelah diputuskan.
4. Daftar penekan (bagian 6, butir 6): setuju atau tidak.
5. Pelacakan buka dan klik: tetap mati (rekomendasi) atau disebut di kebijakan privasi.
6. Batas hari menghapus alamat yang tidak mengonfirmasi (E1-B).

## 8. Yang belum terverifikasi

- Halaman utama panduan pengirim Google (https://support.google.com/a/answer/81126) tidak terbaca; angka dari FAQ dan halaman langganan saja yang dipakai, dan FAQ tidak mencantumkan tanggal pembaruan.
- Panduan FTC adalah ringkasan bahasa sederhana, bukan teks undang-undang (aturan 16 CFR Part 316 tidak dibaca). Besar denda di halaman itu tidak dipakai.
- Sekitar 8.000 karakter terakhir teks UU PDP (bagian penjelasan) tidak terbaca mentah dan tidak dipakai. Peraturan turunan UU PDP dan aturan Indonesia lain tentang pesan elektronik komersial belum dibaca.
- Apakah UU PDP menganggap email konfirmasi tanpa tujuan pemasaran sebagai bagian dari tujuan yang disetujui: tidak terjawab di sumber mana pun yang dibaca. Tafsiran hukum ada pada advokat.
- Kemampuan penyedia email tertentu (satu klik, DKIM, hosting di Indonesia): belum diperiksa karena penyedia belum dipilih.
- Praktik email waitlist platform belajar di Indonesia: tidak ada sumber yang dibaca.
- Isi `kursus.json` yang disebut di E2 (judul modul, lima pelajaran) benar per 24 Nov 2026 saja.

## 9. Pemeriksaan ulang lima klaim paling berisiko

Dilakukan 24 Nov 2026 dengan pembacaan terpisah langsung ke sumber (agen berbeda dari pembacaan pertama). "Terbaca" berarti kutipan pendek ditemukan di halaman.

| No | Klaim di dokumen ini | Sumber | Hasil |
|---|---|---|---|
| 1 | Batas waktu berhenti memproses setelah persetujuan ditarik: 3 x 24 jam | UU 27/2022 Pasal 40 ayat (2), JDIH Komdigi | Terbaca ("paling lambat 3 x 24 (tiga kali dua puluh empat) jam terhitung sejak"); ringkasan otomatis alat sempat menyatakan pasal itu tidak ada dan salah, teks mentah yang dipakai |
| 2 | Panduan Gmail: proses permintaan berhenti dalam 48 jam | Email subscription guidelines for senders | Terbaca ("Process and honor unsubscribe requests within 48 hours.") |
| 3 | Panduan Gmail menyebut konfirmasi alamat sebelum mengirim, sebagai pedoman, bukan kata "wajib" | Halaman yang sama | Terbaca; halaman menyebutnya "double consent" di daftar pedoman, kata "wajib" tidak muncul, jadi dokumen ini menyebutnya pedoman |
| 4 | Header `List-Unsubscribe-Post` bernilai `List-Unsubscribe=One-Click` dan dua header itu wajib tertanda tangan DKIM | RFC 8058 | Terbaca (dua kalimat berisi MUST) |
| 5 | FTC: hormati permintaan berhenti dalam 10 hari kerja; alamat pos wajib pada email komersial | Panduan FTC | Terbaca untuk keduanya; email transaksional atau hubungan dikecualikan dari sebagian besar aturan |

Satu catatan tambahan: Pasal 22 ayat (4) UU PDP (persetujuan yang memuat tujuan lain harus jelas dibedakan, mudah dipahami, dan berbahasa sederhana serta jelas) juga terbaca, dan sesuai dengan kalimat di kebijakan privasi NERUVIA.

## 10. Catatan metode

Sembilan sumber terbaca (dua halaman Claude Academy lewat konektor hanya baca; tujuh halaman publik lewat agen web-fetch), ditambah satu halaman (panduan Google utama) yang tidak terbaca, dan pembacaan ulang untuk lima klaim. Konektor Firecrawl dan memori tidak dipakai. Tidak ada email dikirim dan tidak ada layanan email, database, atau Supabase yang disentuh. Seluruh tabel perbandingan di bagian 3 ditulis ulang dengan kata sendiri.
