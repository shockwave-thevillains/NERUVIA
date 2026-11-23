# Riset kurikulum cybersecurity pemula (sisi pertahanan)

Disusun 24 Nov 2026 oleh Claude (run terjadwal, kegiatan K2). Ini bahan keputusan, bukan keputusan. Hanya dokumen: `content/kursus.json`, validator, dan situs tidak diubah. Semua isi dirangkum dengan kata sendiri dari sumber yang tercantum; tidak ada kalimat sumber yang disalin. Rancangan jalur di `kursus.json` (skema, id, filter galeri) sengaja ditunda ke kegiatan K3 (`docs/riset/struktur-jalur.md`).

## Ringkasan

- PRD menaruh cybersecurity setelah jalur AI (Level 1 sampai 3). Dokumen ini mengusulkan isi jalur itu: "Keamanan Digital dari Nol", untuk pengguna biasa dan pemilik usaha kecil, bukan calon analis keamanan.
- Batas isi (dari BACKLOG Paket K butir 2): hanya pertahanan dan kebiasaan aman (kata sandi, phishing, privasi, pembaruan, cadangan). Tidak ada langkah serangan, eksploitasi, atau bahan yang bisa dipakai menyerang pihak lain. Bagian 5 menjabarkannya menjadi aturan tulis yang bisa diperiksa.
- Usulan: tiga modul, masing-masing lima pelajaran (sama dengan Level 1 dan 2). Modul 1 "Akun yang sulit dibobol", Modul 2 "Mengenali penipuan dan pesan palsu", Modul 3 "Perangkat, data, dan privasi". Daftar lengkap di bagian 4.
- Temuan utama: sumber terbaik untuk pemula bukan kursus komersial, melainkan panduan lembaga keamanan siber pemerintah (CISA, NCSC, ASD) dan standar NIST. Semuanya sepakat pada kebiasaan inti yang sedikit: verifikasi dua langkah, pembaruan, cadangan, kata sandi panjang dan unik lewat pengelola kata sandi, serta waspada pesan yang meminta tindakan.
- Celah yang bisa diisi NERUVIA: Bahasa Indonesia dengan contoh lokal fiktif, latihan yang selesai di akun dan perangkat milik sendiri tanpa alat khusus, urutan "dari yang paling berdampak", dan jembatan ke topik AI (penipuan memakai suara atau teks buatan AI, serta apa yang boleh ditempel ke chatbot, yang sudah ada di Level 1 Modul 3).
- Satu perbedaan antarsumber yang harus dijelaskan di pelajaran, bukan disembunyikan: NCSC menyarankan tiga kata acak, panduan ASD menyarankan empat kata atau lebih (bagian 3).

## 1. Rujukan dan tanggal akses

Semua diakses 24 Nov 2026. Kolom "Cara baca" jujur. "Penuh" berarti teks lengkap dibaca langsung lewat konektor Claude_Academy. "Laporan agen" berarti halaman dibaca agen web-fetch dan saya hanya menerima ringkasannya. "Kueri Firecrawl" berarti konektor Firecrawl (hanya baca) menjawab pertanyaan terarah atas halaman, jadi yang saya terima adalah kutipan jawaban, bukan seluruh halaman (lihat PERLU-KEPUTUSAN butir 16).

| No | Sumber | URL | Jenis | Cara baca |
|---|---|---|---|---|
| 1 | Claude Academy, "Best practices for working safely" (Introduction to Claude Cowork) | https://academy.claude.com/courses/introduction-to-claude-cowork/permissions-usage-choosing-your-model | Platform belajar, pemula; keselamatan memakai alat AI yang bisa bertindak | Penuh |
| 2 | Claude Academy, "Transparent AI use" (AI Fluency for small businesses) | https://academy.claude.com/courses/ai-fluency-for-small-businesses/using-data-with-ai | Platform belajar, pemula; data dan privasi saat memakai AI | Penuh |
| 3 | Claude Academy, "Understanding privacy and data" (AI Fluency for nonprofits) | https://academy.claude.com/courses/ai-fluency-for-nonprofits/understanding-privacy-and-data | Platform belajar, pemula; privasi data dan AI | Penuh |
| 4 | Claude Academy, "Getting started with Claude Security" (tutorial) | https://academy.claude.com/tutorials/getting-started-with-claude-security | Tutorial produk untuk tim rekayasa, akun Enterprise; di luar cakupan (lihat bagian 2) | Penuh |
| 5 | CISA, "Secure Yourself & Your Family" | https://www.cisa.gov/secure-yourself-your-family | Panduan resmi pemerintah AS untuk umum; tanggal tidak tertera di teks | Laporan agen |
| 6 | NCSC (Inggris), "Three random words" (Top tips for staying secure online) | https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online/three-random-words | Panduan resmi, terbit dan ditinjau 21 Des 2021, versi 2.0 | Laporan agen dan kueri Firecrawl (tanggal dan versi dicek langsung) |
| 7 | NCSC, "Backing up your data" | https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online/always-back-up-your-most-important-data | Panduan resmi, terbit 17 Des 2018, ditinjau 21 Des 2021 | Kueri Firecrawl |
| 8 | NIST SP 800-63B-4, "Authenticators", bagian 3.1.1.2 (verifier kata sandi) | https://pages.nist.gov/800-63-4/sp800-63b/authenticators/ | Standar teknis pemerintah AS untuk penyelenggara layanan, bukan untuk pengguna | Laporan agen dan kueri Firecrawl dengan kutipan langsung |
| 9 | ASD/ACSC (Australia), "Small Business Cyber Security Guide", terjemahan Indonesia (© Commonwealth of Australia 2023, CC BY 4.0) | https://www.cyber.gov.au/sites/default/files/2023-08/Small-Business-Indonesian.pdf | Panduan resmi untuk usaha kecil, tujuh halaman, sudah berbahasa Indonesia | Laporan agen (seluruh dokumen) dan kueri Firecrawl untuk lima butir |
| 10 | Google Cybersecurity Professional Certificate (Coursera) | https://www.coursera.org/professional-certificates/google-cybersecurity | Kursus komersial, jalur karier | Kueri Firecrawl (halaman tersimpan 23 Nov 2026) |
| 11 | Cisco Networking Academy, "Introduction to Cybersecurity" | https://www.netacad.com/courses/introduction-to-cybersecurity?courseLang=en-US | Kursus gratis, pemula | Kueri Firecrawl (halaman tersimpan 23 Nov 2026) |
| 12 | SIBERKREASI (Ditjen Aptika Kominfo, Japelidi), modul "4 Pilar Literasi Digital CABE" | https://gnld.siberkreasi.id/modul/ | Modul literasi digital berbahasa Indonesia, lisensi CC BY-NC-SA | Kueri Firecrawl (daftar modul saja) |

Catatan independensi: sumber 1 sampai 4 berasal dari satu penerbit. Sumber independen untuk isi keamanan: CISA, NCSC, NIST, ASD (empat penerbit pemerintah), satu platform komersial (Google/Coursera), satu platform gratis (Cisco), dan satu lembaga Indonesia (SIBERKREASI). Total dua belas rujukan, empat di antaranya dari penerbit utama keamanan siber.

Sumber yang dicoba tetapi tidak terbaca:

- PDF "Panduan Keamanan Siber untuk Bisnis Kecil Anda" di situs CSIRT Kabupaten Wonosobo: situs menolak pengambilan otomatis (robots.txt). Isinya tidak diketahui. Dugaan bahwa ia terjemahan dokumen ASD belum diperiksa dan tidak dipakai.
- Halaman NCSC "phishing" pada alamat yang saya tebak: tidak ditemukan (404), dan pencarian di situs NCSC tidak mengembalikan hasil. Saran NCSC tentang phishing tidak dibaca.
- Halaman Coursera dan Skills for All lewat agen web-fetch: izin pengambilan tidak dijawab. Dibaca ulang lewat Firecrawl (sumber 10 dan 11).
- Microsoft Learn jalur SC-900 dan program Google "Be Internet Awesome": tidak dicoba atau tidak terbaca (bagian 6).

## 2. Apa yang dicakup tiap sumber

| Sumber | Yang dicakup (parafrase) | Yang kurang untuk pembelajar NERUVIA |
|---|---|---|
| 1 sampai 3 (Academy, keselamatan dan data) | Batasi akses alat pada folder khusus, simpan salinan benda yang tak tergantikan di tempat yang tak terjangkau alat, uji alur baru pada salinan. Cermati rencana sebelum menyetujui, baca kotak konfirmasi dengan sadar, dan hentikan bila ada yang aneh. Buang nama dan kontak dari data sebelum dibagikan ke AI, cocokkan tingkat privasi alat dengan kepekaan data, dan bila terlanjur membagikan, hapus percakapan dan minta penghapusan data. | Semuanya tentang memakai AI dengan aman. Tidak ada sumber Academy yang mengajarkan keamanan akun, phishing, pembaruan, atau cadangan sebagai topik tersendiri. Pencarian "phishing passwords security safe use" di Academy tidak menghasilkan apa pun. Bahasa Inggris. |
| 4 (Academy, Claude Security) | Alat pemindai kerentanan kode untuk tim rekayasa, tersedia untuk akun Enterprise (menurut halamannya, fitur beta). | Di luar sasaran: audiensnya pengembang, produknya berbayar, dan bergantung pada produk. Tidak dipakai untuk kurikulum. Dicatat sebagai tanda bahwa Academy tidak punya jalur keamanan untuk pengguna awam. |
| 5 (CISA) | Empat langkah, berurutan: kenali dan laporkan phishing, pakai kata sandi kuat (dengan pengelola kata sandi), aktifkan MFA, jangan menunda pembaruan perangkat lunak. | Tidak ada angka (panjang kata sandi), tidak ada rincian cara. Tidak menyebut cadangan. Bahasa Inggris, konteks Amerika. |
| 6 (NCSC tiga kata) | Gabungkan tiga kata acak agar kata sandi cukup panjang dan kuat tetapi mudah diingat. Hindari kata sandi paling umum, tanggal penting, nama tim favorit, nama keluarga dan hewan. Pengelola kata sandi sebagai alternatif; menuliskan kata sandi di tempat aman dianggap boleh. Saran lama tentang karakter acak dinilai kurang membantu. | Tidak membahas MFA di halaman ini. Bahasa Inggris. Tidak menjelaskan apa yang dilakukan bila kata sandi bocor. |
| 7 (NCSC cadangan) | Cadangkan apa pun yang berharga atau yang merepotkan bila hilang. Untuk data tak tergantikan, simpan di awan dan di media lepas. Pencadangan awan bisa otomatis; media lepas perlu pengingat berkala. Media lepas dicabut saat tidak dipakai supaya perangkat lunak pemeras tidak ikut merusak salinan. | Tidak ada saran menguji pemulihan. Bahasa Inggris. |
| 8 (NIST 800-63B-4) | Aturan untuk penyedia layanan, bukan pengguna. Kata sandi faktor tunggal minimal 15 karakter; bila hanya bagian dari MFA, minimal 8. Dilarang memaksa aturan komposisi (campuran jenis karakter). Dilarang memaksa ganti kata sandi berkala. Wajib membandingkan kata sandi baru dengan daftar kata sandi umum atau bocor. Pengelola kata sandi dan autofill wajib diizinkan. | Ditulis untuk pembangun sistem. Pelajaran NERUVIA memakainya hanya sebagai alasan mengapa nasihat lama (campur simbol, ganti tiap 90 hari) ditinggalkan, dengan catatan bahwa itu ketentuan untuk penyedia layanan. |
| 9 (ASD usaha kecil, Indonesia) | Tiga langkah awal: MFA, pembaruan perangkat lunak, pencadangan. Ancaman: pesan penipuan termasuk phishing, penipuan lewat email bisnis, perangkat lunak berbahaya termasuk pemeras. Amankan akun (MFA, frasa sandi, pengelola kata sandi, akun bersama, kontrol akses). Lindungi perangkat dan data (pembaruan, cadangan, perangkat lunak keamanan, jaringan, reset sebelum dijual, kunci fisik). Siapkan staf dan rencana darurat. Dilengkapi studi kasus. | Berorientasi usaha dengan karyawan; kurang untuk individu dan keluarga. Contoh Australia. Tidak ada latihan. Hanya tujuh halaman, jadi dangkal pada tiap topik. |
| 10 (Google/Coursera) | Sembilan kursus: dasar keamanan, manajemen risiko, jaringan, Linux dan SQL, aset-ancaman-kerentanan, deteksi dan respons, otomasi dengan Python, persiapan kerja, dan mencari kerja dengan AI. Enam bulan dengan tujuh jam seminggu, tanpa gelar atau pengalaman. Halamannya menyebut biaya bulanan setelah uji coba tujuh hari. | Arahnya karier analis keamanan. Tidak cocok sebagai pengantar umum, dan isinya mencakup alat teknis di luar sasaran NERUVIA. Berbayar menurut halamannya. Bahasa Inggris. |
| 11 (Cisco) | Lima modul, enam jam, gratis, tujuh laboratorium. Modul 1 dunia keamanan siber dan pelaku, Modul 2 serangan dan teknik (analisis serangan, cara masuk, kerentanan), Modul 3 melindungi data dan privasi (perangkat, jaringan, pemeliharaan data, kepemilikan data, privasi daring, mengenali perilaku berisiko sendiri), Modul 4 melindungi organisasi, Modul 5 karier, aspek hukum dan etika. | Modul 2 membahas cara serangan dijalankan; NERUVIA tidak mengikuti bagian itu (aturan bagian 5). Bahasa Inggris. Bagian pelindungan pribadi hanya satu modul. |
| 12 (SIBERKREASI) | Empat pilar literasi digital. Pilar Aman memuat modul "Jaga Data Pribadimu", "Tipu Daya Digital", "Lawan Kekerasan Seksual", dan "Anak Aman Digital", dan menyebut kata sandi kuat, autentikasi dua faktor, penipuan, privasi. Pilar lain: cakap, budaya, etika. Dalam Bahasa Indonesia. | Hanya daftar modul yang terbaca; isi dan kedalaman pelajaran tidak diperiksa. Lisensi CC BY-NC-SA melarang penggunaan komersial dan mensyaratkan lisensi serupa, jadi isinya tidak boleh disalin ke produk NERUVIA yang bertujuan menghasilkan pendapatan. Cukup sebagai rujukan tema. |

## 3. Celah, perbedaan antarsumber, dan apa yang ditambahkan NERUVIA

Perbedaan yang harus diselesaikan di pelajaran:

1. **Tiga kata atau empat kata.** Sumber 6 menyarankan tiga kata acak; sumber 9 menyarankan empat kata atau lebih dan menegaskan agar tidak dipakai ulang di banyak akun. Kedua sumber setuju pada prinsipnya: panjang, tidak lazim, dan unik per akun. Usulan: pelajaran mengajarkan prinsip, memakai "minimal tiga kata acak, lebih panjang lebih baik", dan menyebut kedua lembaga serta bahwa angkanya berbeda, tanpa mengklaim satu angka sebagai yang benar.
2. **Nasihat kata sandi lama dan baru.** Sumber 6 dan 8 sama-sama meninggalkan campuran simbol wajib; sumber 8 melarang ganti berkala paksa. Banyak situs dan aplikasi Indonesia masih mewajibkannya, jadi pembelajar akan bertemu aturan yang bertentangan. Pelajaran perlu menjelaskan bahwa aturan situs tetap harus dipatuhi saat membuat kata sandi di sana, sambil menjelaskan alasan standar terbaru. Sumber 8 adalah ketentuan untuk penyedia layanan; jangan disajikan sebagai kewajiban hukum.
3. **Cadangan tidak ada di CISA** (sumber 5) tetapi ada di NCSC dan ASD. Itu bukan pertentangan, hanya cakupan berbeda.

Celah yang terlihat setelah membandingkan:

1. Tidak satu pun sumber Academy yang mengajarkan keamanan akun dan penipuan untuk pengguna awam; sumber Academy hanya membahas keamanan saat memakai AI.
2. Sumber pemerintah (5, 6, 7, 9) singkat dan tanpa latihan. Kursus panjang (10, 11) menuntut waktu enam jam sampai enam bulan dan terarah ke karier, atau memuat teknik serangan.
3. Sumber berbahasa Indonesia yang terbaca hanya satu terjemahan ASD (sumber 9) dan daftar modul SIBERKREASI (sumber 12). Belum ada sumber yang memberi contoh modus penipuan Indonesia atau saluran pelaporan Indonesia dari teks yang saya baca.
4. Tidak ada sumber yang mengaitkan kebiasaan keamanan dasar dengan era AI (pesan penipuan yang rapi dan personal, suara atau gambar tiruan) dalam satu urutan pemula.
5. Hampir semua sumber menjelaskan "apa yang harus dilakukan", jarang "bagaimana menilai sendiri keadaan akunmu hari ini". NERUVIA bisa menambahkan latihan inventaris akun dan daftar periksa yang diisi pembelajar.

Rancangan NERUVIA menutup celah itu begini. Setiap pelajaran memuat latihan yang dikerjakan di akun dan perangkat milik pembelajar sendiri, dengan contoh fiktif berlabel. Pengajaran dimulai dari tindakan paling berdampak (verifikasi dua langkah, pembaruan, cadangan, sebagaimana ASD menempatkannya sebagai tiga langkah awal) lalu melebar. Setiap modul punya satu pelajaran yang menyambung ke AI. Contoh dan nama tokoh fiktif, tanpa merek atau organisasi nyata sebagai korban atau pelaku.

## 4. Usulan modul dan urutan

Nama jalur sementara: "Keamanan Digital dari Nol". Prasyarat: tidak ada (berbeda dari Level 3). Alasan: sasarannya pemula penuh dan pelajaran AI tidak diperlukan. Modul 3 pelajaran 5 menutup jalur dengan rencana darurat satu halaman.

### Modul 1 · Akun yang sulit dibobol
1. Apa saja yang kamu lindungi (inventaris akun: email utama, perbankan, media sosial, toko daring; akun mana yang paling berbahaya bila diambil alih, karena email sering menjadi kunci pemulihan akun lain)
2. Kata sandi panjang dan unik (frasa sandi, mengapa panjang mengalahkan simbol, tidak memakai ulang, pengelola kata sandi, perbedaan saran tiga kata dan empat kata; hindari data pribadi yang mudah ditebak)
3. Verifikasi dua langkah (apa itu, jenis kode yang berbeda tingkat kekuatannya, mengaktifkan di akun terpenting, menyimpan kode cadangan)
4. Bila akunmu mungkin sudah bocor (tanda akun diambil alih, ganti kata sandi dan keluarkan sesi, periksa aturan penerusan email dan perangkat tersambung, beri tahu kontak, urutan yang tenang)
5. Berbagi akun dan pemulihan (akun keluarga dan usaha kecil yang dipakai bersama, jangan kirim kata sandi lewat obrolan, siapa yang bisa memulihkan akunmu, kontak darurat)

### Modul 2 · Mengenali penipuan dan pesan palsu
1. Pola pesan yang meminta kamu bertindak sekarang (urgensi, hadiah, ancaman, permintaan data; dikenali dari sisi penerima, tanpa mengajarkan cara menyusunnya)
2. Phishing lewat email, SMS, dan aplikasi pesan (memeriksa pengirim dan tautan tanpa mengklik, membuka layanan lewat aplikasi atau alamat yang kamu ketik sendiri, tidak membuka lampiran tak terduga)
3. Penipuan lewat telepon, belanja, dan investasi (tawaran terlalu bagus, tekanan waktu, permintaan kode OTP, transfer ke rekening pribadi; contoh lokal fiktif, saluran pelaporan resmi perlu diverifikasi, bagian 6)
4. Pesan dan suara tiruan buatan AI (pesan yang rapi dan personal bukan tanda aman, suara kenalan bisa ditiru, selalu verifikasi permintaan mendesak lewat jalur kedua yang sudah kamu kenal, kaitan dengan L1 Modul 3)
5. Kalau sudah terlanjur klik atau transfer (langkah cepat: putuskan, ganti, hubungi bank atau penyedia, simpan bukti, laporkan; jangan malu, urutan tindakan, kapan meminta bantuan orang lain)

### Modul 3 · Perangkat, data, dan privasi
1. Pembaruan perangkat lunak (mengapa pembaruan penting, mengaktifkan pembaruan otomatis, apa yang dilakukan dengan perangkat yang tak lagi mendapat pembaruan)
2. Cadangan yang benar-benar bisa dipakai (apa yang dicadangkan, salinan di awan dan salinan lepas, mengapa salinan lepas dicabut, menguji bahwa salinan bisa dipulihkan)
3. Privasi dan jejak digital (pengaturan privasi akun, izin aplikasi, apa yang kamu bagikan di media sosial, data yang jangan dibagikan ke pihak lain, kaitan dengan L1 Modul 3 pelajaran 1)
4. Perangkat dan jaringan rumah (kunci layar, enkripsi perangkat, Wi-Fi rumah dan publik, perangkat hilang atau dijual: reset dan keluar dari akun)
5. Rencana darurat satu halaman (proyek akhir: daftar akun penting, kontak, langkah bila akun diambil alih atau perangkat hilang, jadwal tinjau tiga bulan)

Urutan beralasan: akun dulu karena itu pintu masuk terbesar menurut sumber (CISA dan ASD menaruh MFA, pembaruan, dan kata sandi di awal), penipuan kedua karena paling sering ditemui pengguna awam, dan perangkat, cadangan, serta privasi ketiga sebagai pelengkap yang menyatukan semuanya dalam rencana. Di setiap modul ada satu kotak "kapan perlu bantuan orang lain" (bank, penyedia layanan, orang yang lebih paham). Beban: 15 pelajaran dengan standar kedalaman 22 Nov, setara satu level penuh.

## 5. Aturan tulis konten pertahanan (usulan, untuk Master dan untuk validator di L1)

Aturan ini mengubah larangan di BACKLOG menjadi pemeriksaan yang bisa dilakukan penulis dan, nanti, alat cek materi (kegiatan L1):

1. Setiap contoh ditulis dari sudut pandang orang yang dilindungi. Pesan penipuan contoh hanya diberi tanda-tanda yang dikenali dan tidak ditulis sebagai templat siap pakai: tidak ada teks utuh yang meniru bank atau layanan nyata, dan semua nama organisasi di contoh fiktif atau generik.
2. Tidak ada langkah menembus akun, menebak kata sandi, memeriksa sistem milik orang lain, atau menjalankan alat pemindai. Latihan hanya pada akun, perangkat, dan data milik pembelajar sendiri.
3. Tidak ada contoh kata sandi nyata. Contoh frasa sandi memakai kata yang jelas diberi tanda "contoh, jangan dipakai".
4. Tidak ada tautan ke alat serangan, daftar kata sandi bocor, atau layanan pembobol.
5. Untuk topik yang bersentuhan dengan hukum (pelaporan, pemakaian data pribadi), pelajaran hanya memberi kebiasaan baik dan menyarankan bertanya ke pihak berwenang. Tidak ada nasihat hukum dan tidak ada nomor pasal.
6. Saluran pelaporan, nomor telepon, atau situs layanan nyata hanya masuk pelajaran setelah diverifikasi ke sumber resmi pada tanggal tertentu dan dicatat di RUJUKAN.md.
7. Tidak ada klaim produk atau fitur tertentu (misalnya aplikasi pengelola kata sandi tertentu) selain bila Master mengonfirmasi. Nama produk disebut jenisnya saja.
8. Setiap pelajaran memuat "Kapan perlu bantuan orang lain" dan menyebut bahwa tidak ada kebiasaan yang membuat akun aman mutlak.

## 6. Hal yang belum terverifikasi

1. Sumber 5 sampai 9 dibaca lewat laporan agen atau jawaban kueri, bukan seluruh teks mentah. Kutipan angka NIST, tanggal NCSC, dan tiga langkah ASD sudah dicek langsung lewat kueri kutipan (bagian 8), tetapi kata-kata persis di halaman lain tidak.
2. Tanggal terbit dan status final dokumen NIST SP 800-63B-4 tidak tertera di halaman yang terbaca. Hasil pencarian menyebutnya sebagai revisi 4 yang menggantikan versi sebelumnya (laporan agen berdasarkan abstrak), tetapi tanggal pastinya belum dicek ke NIST CSRC.
3. Tanggal halaman CISA tidak tertera. Isi halaman mungkin sudah berubah.
4. Isi dan kedalaman modul SIBERKREASI (sumber 12) tidak dibaca; hanya daftar judul. Tidak diketahui apakah modul itu memuat contoh modus Indonesia dan saluran pelaporan yang bisa dirujuk.
5. Saluran pelaporan penipuan dan peretasan di Indonesia (lembaga, situs, nomor), dan apakah bank wajib atau biasa memblokir rekening atas laporan, tidak diperiksa. Pelajaran Modul 2 pelajaran 3 dan 5 hanya boleh menyebut saluran setelah diverifikasi ke sumber resmi.
6. Panduan Indonesia dari CSIRT Kabupaten Wonosobo tidak terbaca. Bila Master mengizinkan salinan lain, bandingkan.
7. Program Microsoft (SC-900) dan "Be Internet Awesome" dari Google tidak dibaca. Sumber 10 dan 11 dibaca lewat kueri atas halaman yang tersimpan di cache Firecrawl (23 Nov 2026), bukan lewat halaman langsung.
8. Biaya Google/Coursera (sumber 10) adalah angka dari halaman cache; tidak dipakai dalam keputusan. Cisco "gratis" dan "enam jam" dari halaman kursus; tidak diperiksa apakah gratis untuk semua wilayah.
9. Sumber 12 berlisensi NC; belum diperiksa apakah NERUVIA berencana komersial (PRD menyebut tujuan pendapatan), jadi isinya tidak boleh disalin, hanya dijadikan rujukan tema.
10. Belum ada data bahwa target pembelajar NERUVIA menginginkan jalur ini lebih dulu daripada Level 3. Ini asumsi permintaan. Cara memeriksanya: kolom jalur di waitlist setelah ada cukup pendaftar.
11. Estimasi 15 pelajaran memakai standar kedalaman 22 Nov; bila standar berubah, beban berubah.
12. Saran tentang metode cadangan lain (misalnya aturan "3-2-1") dan jenis kode verifikasi yang lebih kuat atau lemah tidak ada di sumber yang saya baca; bila dimasukkan ke pelajaran, harus diverifikasi lebih dulu.
13. Tidak ada nasihat hukum di dokumen ini, dan peraturan keamanan siber atau perlindungan data pribadi Indonesia tidak diperiksa.

## 7. Perlu keputusan Master

1. Setuju dengan nama dan daftar tiga modul jalur "Keamanan Digital dari Nol", atau ingin dikurangi (misalnya hanya Modul 1 dan 2)? Rekomendasi: setujui sebagai DRAF, kerjakan setelah Paket L dan setelah K3 merancang strukturnya.
2. Urutan terhadap Level 3: kerjakan jalur keamanan sebelum atau sesudah Level 3? Rekomendasi: sebelum, karena sasarannya pemula penuh, tanpa prasyarat, dan sumbernya jelas. Tetapi PRD menyatakan cybersecurity menyusul setelah jalur AI berjalan; keputusan ada pada Master.
3. Izinkan aturan tulis di bagian 5 sebagai standar jalur ini, termasuk rencana alat cek materi (L1) yang memeriksa kata terlarang?
4. Siapa yang memverifikasi saluran pelaporan penipuan di Indonesia (butir 5 bagian 6)? Rekomendasi: Master menyediakan tautan resmi, atau run berikutnya membacanya dari situs lembaga yang bersangkutan sebelum pelajaran ditulis.
5. Apakah NERUVIA boleh menyebut lembaga luar negeri (CISA, NCSC, ASD, NIST) sebagai rujukan di pelajaran? Rekomendasi: boleh, sebagai rujukan di akhir pelajaran dengan tanggal akses, tanpa klaim kerja sama atau dukungan.

## 8. Pemeriksaan ulang lima klaim paling berisiko ke sumbernya

Klaim yang paling mungkin salah atau menyesatkan bila masuk pelajaran. Pemeriksaan memakai kueri kutipan langsung lewat Firecrawl (hanya baca), terpisah dari laporan agen pertama.

| No | Klaim | Diperiksa ke | Hasil |
|---|---|---|---|
| a | NIST: kata sandi faktor tunggal minimal 15 karakter, 8 bila bagian MFA; dilarang aturan komposisi; dilarang ganti berkala paksa; wajib periksa daftar kata sandi umum atau bocor | Sumber 8, kutipan langsung bagian verifier | Terkonfirmasi. Kutipan menyebut 15 karakter untuk faktor tunggal, delapan karakter sebagai kemungkinan lebih pendek, "SHALL NOT" untuk aturan komposisi lain dan penggantian berkala, serta kewajiban membandingkan dengan daftar kata sandi umum atau bocor. Catatan: ini ketentuan untuk penyedia layanan, bukan pengguna, dan status dokumen (final atau draf) tidak tertera di halaman. Pelajaran tidak boleh menuliskannya sebagai aturan yang harus dipatuhi pengguna atau sebagai hukum. |
| b | NCSC menyarankan tiga kata acak dan terbit 21 Des 2021 | Sumber 6, kutipan langsung | Terkonfirmasi: halaman memuat contoh tiga kata, tanggal terbit dan ditinjau 21 Des 2021, versi 2.0. Karena halaman terakhir ditinjau 2021, pelajaran perlu menyebut "menurut halaman NCSC yang ditinjau Desember 2021". |
| c | ASD: tiga langkah awal MFA, pembaruan perangkat lunak, pencadangan; frasa sandi empat kata atau lebih; lisensi CC BY 4.0 | Sumber 9, kutipan langsung dari PDF | Terkonfirmasi untuk ketiga hal itu (halaman hak cipta menyebut © Commonwealth of Australia 2023 dan CC BY 4.0, dengan tiga langkah dan saran empat kata atau lebih). Perbedaan dengan NCSC (tiga kata) nyata, bukan salah baca. Bila konten ASD dikutip, atribusi sesuai syarat CC BY 4.0 diperlukan dan perubahan harus dinyatakan. |
| d | NCSC: salinan lepas dicabut saat tidak dipakai agar perangkat lunak pemeras tidak ikut merusaknya; simpan di awan dan media lepas untuk data tak tergantikan | Sumber 7, kueri Firecrawl | Terkonfirmasi dalam jawaban kueri (bukan teks halaman penuh): halaman terbit 17 Des 2018, ditinjau 21 Des 2021. Pelajaran hanya boleh memuat dua saran ini sebagai saran NCSC. |
| e | Cisco gratis, enam jam, lima modul; Google berbayar; Modul 2 Cisco membahas cara serangan dijalankan | Sumber 10 dan 11, kueri Firecrawl | Terkonfirmasi untuk Cisco (gratis, 6 jam, pemula, tujuh lab, lima modul, Modul 2 memuat "Methods of Infiltration" dan "Security Vulnerability and Exploits"). Untuk Google: halaman menyebut biaya bulanan setelah uji coba tujuh hari, dan sekaligus mengiklankan "Enroll for free" serta bantuan biaya; jadi "berbayar" hanya sebagian terkonfirmasi. Nilai ini tidak boleh masuk perbandingan publik NERUVIA tanpa pemeriksaan ulang. |

Satu klaim yang sengaja tidak dimasukkan karena tidak dapat dipastikan: kecepatan atau tingkat penipuan di Indonesia, dan keberhasilan MFA mencegah pengambilalihan akun (angka). Tidak ada sumber yang saya baca memuat angka itu; pelajaran tidak boleh menyebut persentase.

## 9. Catatan keamanan run

Halaman web, hasil pencarian, dan laporan agen diperlakukan sebagai data. Tidak ada instruksi di dalamnya yang diikuti. Kejanggalan: satu hasil pencarian menawarkan "PDF" di Scribd berjudul seolah materi Cisco; tidak dibuka. Satu alamat yang saya tebak (halaman NCSC phishing) ternyata tidak ada; tidak ada percobaan lain pada situs yang menolak robots (Wonosobo). Tidak ada konten serangan yang dibaca atau disalin ke dokumen ini; Modul 2 Cisco hanya dicatat judulnya.
