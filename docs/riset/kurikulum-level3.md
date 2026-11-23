# Riset kurikulum Level 3 "AI Lanjutan"

Disusun 24 Nov 2026 oleh Claude (run terjadwal, kegiatan K1). Ini bahan keputusan, bukan keputusan. Hanya dokumen: `content/kursus.json`, validator, dan situs tidak diubah. Semua isi dirangkum dengan kata sendiri dari sumber yang tercantum. Tidak ada kalimat sumber yang disalin.

## Ringkasan

- Level 3 di `kursus.json` berjanji "mengotomasi tugas berulang dan membuat asisten AI sendiri" (tag Otomasi, Asisten AI, Workflow). Modulnya masih kosong dan statusnya `segera`.
- Usulan: tiga modul, masing-masing lima pelajaran (sama dengan Level 1 dan 2). Modul 1 "Merancang alur kerja otomatis", Modul 2 "Membuat asisten AI sendiri (tanpa kode)", Modul 3 "Otomasi yang aman dan bisa dipertanggungjawabkan". Daftar lengkap ada di bagian 4.
- Temuan utama dari sumber: materi otomasi yang ada sebagian besar berbahasa Inggris, bergantung pada alat tertentu, atau ditujukan kepada pengembang. Celah yang bisa diisi NERUVIA: Bahasa Indonesia, tidak bergantung pada produk, latihan yang bisa dikerjakan di chatbot mana pun tanpa menyambungkan akun, dan contoh usaha kecil lokal (fiktif).
- Prinsip yang konsisten di semua sumber: mulai dari alur yang sederhana dan tetap, tambahkan keleluasaan hanya bila terbukti perlu, uji dengan contoh lama yang jawabannya sudah diketahui, dan biarkan keputusan berisiko tinggi tetap di tangan manusia.
- Level 3 sebaiknya tetap dikerjakan sebagai DRAF dan tetap `segera` sampai Master menyetujui daftar modul dan tiga hal di bagian 7.

## 1. Rujukan dan tanggal akses

Semua diakses 24 Nov 2026. Kolom "Cara baca" jujur: "penuh" berarti teks lengkap halaman terbaca langsung lewat konektor Claude_Academy. "Laporan agen" berarti halaman dibaca agen web-fetch dan saya hanya menerima ringkasannya, bukan teks mentah.

| No | Sumber | URL | Jenis | Cara baca |
|---|---|---|---|---|
| 1 | Claude Academy, "Workflow augmentation" (AI Fluency for nonprofits) | https://academy.claude.com/courses/ai-fluency-for-nonprofits/workflow-augmentation | Platform belajar, level pemula | Penuh |
| 2 | Claude Academy, "Tying it all together" (AI Fluency for small businesses) | https://academy.claude.com/courses/ai-fluency-for-small-businesses/tying-it-all-together | Platform belajar, level pemula | Penuh |
| 3 | Claude Academy, "Workflows vs agents" (Building with the Claude API) | https://academy.claude.com/courses/building-with-the-claude-api/workflows-vs-agents | Platform belajar, level menengah, pengembang | Penuh |
| 4 | Claude Academy, "Chaining workflows" (Building with the Claude API) | https://academy.claude.com/courses/building-with-the-claude-api/chaining-workflows | Platform belajar, menengah, pengembang | Penuh |
| 5 | Claude Academy, "The agent loop explained" (Claude Platform 101) | https://academy.claude.com/courses/claude-platform-101/the-agent-loop-explained | Platform belajar, pemula teknis | Penuh |
| 6 | Claude Academy, "Introduction to projects" (Claude 101) | https://academy.claude.com/courses/claude-101/introduction-to-projects | Platform belajar, pemula | Penuh |
| 7 | Claude Academy, "Connect your tools to unlock a smarter, more capable AI companion" (tutorial) | https://academy.claude.com/tutorials/connect-your-tools-to-unlock-a-smarter-more-capable-ai-companion | Tutorial, pemula | Penuh |
| 8 | Claude Academy, "Teach Claude your way of working using skills" (tutorial) | https://academy.claude.com/tutorials/teach-claude-your-way-of-working-using-skills | Tutorial, pemula | Penuh |
| 9 | Anthropic, "Building effective agents" (sumber primer; terbit 19 Des 2024, halaman memuat catatan bahwa banyak alatnya sudah berubah) | https://www.anthropic.com/engineering/building-effective-agents | Artikel teknik resmi | Laporan agen (halaman utuh) |
| 10 | Microsoft Skills for Jobs, "AI Agent Fundamentals course" | https://www.microsoft.com/en-ie/skills-for-jobs/agents | Halaman kursus pihak lain, tanpa tanggal | Laporan agen |
| 11 | Coursera (LearnQuest), "No Code AI Agents: Build Workflow & Calendar Automations" | https://www.coursera.org/learn/no-code-ai-agents | Kursus komersial pihak lain | Laporan agen |
| 12 | Spring AI, "Building Effective Agents" (turunan dari sumber 9, contoh Java) | https://docs.spring.io/spring-ai/reference/2.0/api/effective-agents.html | Dokumentasi pengembang | Laporan agen |

Catatan: sumber 12 mengakui dirinya turunan dari sumber 9, jadi tidak dihitung sebagai bukti independen. Bukti independen: delapan halaman Academy (satu penerbit), satu artikel primer Anthropic, satu halaman Microsoft, satu kursus Coursera.

Sumber yang dicoba tetapi tidak terbaca: repositori Microsoft "AI Agents for Beginners" di GitHub dan halaman Google AI Essentials. Izin pengambilan halaman tidak dijawab dalam run ini, jadi isinya tidak dipakai di dokumen ini. Lihat bagian 6.

## 2. Apa yang dicakup tiap sumber

| Sumber | Yang dicakup (parafrase) | Yang kurang untuk pembelajar NERUVIA |
|---|---|---|
| 1 dan 2 (Academy, otomasi untuk nonprofit dan usaha kecil) | Mulai dari mengamati beban kerja nyata. Pilah tugas jadi tiga: dikerjakan AI, AI membantu lalu manusia memutuskan, dan tetap manusia. Tulis rancangan otomasi yang menyebut hasil, langkah, dan aturan perilaku. Uji dengan contoh lama yang jawabannya sudah diketahui. Tinjau keluaran sebelum terkirim. Beri jalur ke manusia. Contoh usaha kecil menemukan dua kesalahan lewat uji ulang: tagihan lunas masih terhitung, dan urutan prioritas keliru. | Bahasa Inggris. Contoh bertumpu pada penyambungan ke surel dan sistem penagihan, yang tidak bisa ditiru pembelajar yang baru mulai. Tidak ada latihan yang berdiri sendiri tanpa akun. |
| 3 (Academy, workflow vs agen) | Alur kerja adalah rangkaian langkah yang urutannya sudah diketahui. Agen diberi tujuan dan alat lalu menyusun langkahnya sendiri. Alur lebih akurat, mudah diuji, dan dapat diprediksi. Agen lebih luwes tetapi lebih sulit diuji. Saran: utamakan alur, pakai agen hanya bila perlu. | Ditulis untuk pengembang yang membangun produk. Tidak menjelaskan keputusan ini kepada orang yang memakai alat jadi. |
| 4 (Academy, rantai langkah) | Memecah tugas besar menjadi langkah kecil yang berurutan. Satu prompt panjang dengan banyak aturan sering membuat sebagian aturan terlewat. Dua langkah (buat, lalu revisi terarah) sering lebih baik. Boleh ada pemrosesan non-AI di antara langkah. | Berkaitan dengan kode dan API. Belum ada cara berlatih tanpa pemrograman. |
| 5 (Academy, putaran agen) | Agen adalah AI yang mengulang: amati, putuskan, bertindak, sampai selesai. Manusia tidak di tengah putaran. Ada tanda berhenti. Pengguna memegang alat dan aturan, AI memegang penalaran. | Isinya skrip pemrograman. Sebagai konsep bagus, sebagai latihan tidak cocok untuk non-programmer. |
| 6, 7, 8 (Academy, proyek, konektor, skill) | Bahan acuan dan instruksi tetap membuat asisten konsisten. Konektor memberi akses ke data dan tindakan di alat lain. Prosedur berulang bisa dikemas agar diterapkan otomatis. Saran praktis: sebut alat dengan jelas, kerjakan bertahap, beri konteks. | Menjelaskan fitur satu produk tertentu. Fitur produk berubah (halaman proyek sendiri mencatat menu lama yang sudah dihapus), jadi tidak aman dijadikan inti pelajaran. Konsep di baliknya (instruksi tetap, bahan acuan, izin) bisa diajarkan tanpa menyebut produk. |
| 9 (Anthropic, primer) | Beda alur kerja dan agen. Lima pola alur: rantai, pemilah, paralel, orkestrator-pekerja, penilai-pengoptimal. Cari solusi paling sederhana, tambah kerumitan hanya bila terbukti membaik lewat pengukuran. Agen punya risiko kesalahan yang menumpuk dan perlu uji di lingkungan aman, titik berhenti, dan tinjauan manusia. Alat canggih punya biaya dan waktu tunggu. | Untuk pengembang. Tidak menyinggung pengguna non-teknis. |
| 10 (Microsoft Skills for Jobs) | Kursus dasar agen AI, gratis, mandiri, tanpa prasyarat teknologi, bernilai 1 kredit ECTS, membahas cara kerja agen, pemakaian di pekerjaan, dan pemakaian yang aman dan bertanggung jawab. Lencana setelah selesai. | Menurut laporan halamannya, tidak ada rincian modul yang terbaca, jadi cakupan rinci tidak diketahui. Bahasa Inggris. Isi kursus sebenarnya (di situs mitra) tidak dibaca. |
| 11 (Coursera, no-code) | Tiga jam, tiga modul: mengubah alur kerja berantakan jadi pemicu, syarat, dan tindakan; membangun agen dengan alat tanpa kode gratis, termasuk menyambungkan surel dan kalender; agen kalender, tugas, dan pengingat dengan desain yang menjaga privasi. Memakai data tiruan, manusia tetap di tengah. Menyebut beberapa platform otomasi pihak ketiga. | Bergantung pada alat pihak ketiga, bahasa Inggris, sertifikat berbayar menurut laporan halamannya. Status audit gratis tidak jelas. |
| 12 (Spring AI) | Menerjemahkan lima pola sumber 9 ke contoh Java. Menegaskan: mulai sederhana, workflow lebih dapat diprediksi untuk tugas yang jelas. | Hanya untuk pemrogram Java. |

## 3. Celah dan apa yang ditambahkan NERUVIA

Celah yang terlihat setelah membandingkan:

1. Tidak satu pun sumber yang terbaca berbahasa Indonesia atau memakai contoh Indonesia.
2. Sumber yang ramah pemula (1, 2, 11) mengandalkan penyambungan ke akun surel, kalender, atau sistem penagihan. Pembelajar NERUVIA yang baru lulus Level 2 belum tentu punya atau mau menyambungkan itu. Sumber yang tidak butuh akun (3, 4, 5, 9, 12) ditulis untuk pemrogram.
3. Tidak ada sumber yang mengajarkan keputusan "alur tetap atau agen" kepada pengguna biasa dengan bahasa awam.
4. Tidak ada sumber yang menggabungkan: memilih tugas, merancang langkah, menguji dengan contoh lama, dan menetapkan titik tinjau manusia, dalam satu latihan kertas yang selesai dalam satu jam.
5. Pemeliharaan jarang dibahas: asisten dan alur otomatis perlu diperbarui, diberi versi, dan dipensiunkan.

Rancangan NERUVIA menutup celah itu dengan cara berikut. Semua pelajaran berupa teks dan latihan yang bisa dijalankan manual di chatbot mana pun: pembelajar menjalankan "rantai" itu langkah demi langkah sendiri dan menempelkan hasil satu langkah ke langkah berikutnya. Penyambungan alat nyata hanya dibahas sebagai konsep dan daftar periksa izin, bukan latihan wajib. Semua contoh memakai usaha kecil dan komunitas fiktif berlabel.

## 4. Usulan modul dan urutan

Prasyarat: Level 1 dan Level 2 (khususnya L1 Modul 3 tentang data dan keamanan, serta L2 Modul 1 pelajaran 5 tentang mengecek hasil). Level 3 sengaja tidak mengulang isi itu; tiap pelajaran menautkannya.

### Modul 1 · Merancang alur kerja otomatis
1. Memilih tugas berulang yang layak diotomasi (inventaris tugas, tiga golongan: diserahkan, dibantu, tetap manusia; hitung waktu dan akibat kesalahan)
2. Memecah tugas menjadi rantai langkah (langkah kecil, hasil satu langkah jadi masukan langkah berikut, pengecekan di antara langkah)
3. Alur tetap atau agen? (kapan cukup alur, kapan butuh keleluasaan, risiko biaya dan kesalahan menumpuk)
4. Menulis kartu rancangan otomasi (hasil yang diinginkan, langkah dan titik keputusan, aturan perilaku termasuk "jangan menebak" dan kapan menyerahkan ke manusia)
5. Menguji dengan contoh lama sebelum dipakai (ambil kasus yang jawabannya sudah diketahui, bandingkan, temukan dua jenis galat: data salah dan prioritas salah)

### Modul 2 · Membuat asisten AI sendiri (tanpa kode)
1. Apa itu asisten kustom (instruksi tetap, bahan acuan, batas tugas; apa bedanya dengan prompt sekali pakai)
2. Menulis instruksi tetap (peran, sasaran pengguna, nada, hal yang tidak boleh dilakukan, cara menjawab "saya tidak tahu")
3. Menyiapkan bahan acuan (dokumen yang bersih, nama berkas yang jelas, apa yang jangan dimasukkan, menjaga tetap mutakhir)
4. Menguji dan memperbaiki asisten (kumpulan pertanyaan uji termasuk yang menjebak, catat gagal dan lulus, perbaiki satu hal per putaran)
5. Memelihara asisten (catatan versi, jadwal tinjau, tanda untuk menonaktifkan, siapa yang bertanggung jawab)

### Modul 3 · Otomasi yang aman dan bisa dipertanggungjawabkan
1. Izin akses dan data (prinsip izin sekecil mungkin, apa yang terjadi saat alat tersambung, data sensitif dari L1 Modul 3)
2. Titik tinjau manusia (tinjau semua dulu, kapan boleh sampel, apa yang memicu penghentian)
3. Kegagalan umum dan cara memantau (hasil keliru yang terlihat benar, putaran tanpa henti, biaya tak terduga, perubahan di sumber data)
4. Keterbukaan dan aturan pakai di tim atau usaha kecil (siapa perlu tahu, kalimat pemberitahuan, jalur ke manusia, kebijakan satu halaman)
5. Proyek akhir: rancang satu otomasi dari awal sampai pemeliharaan (kartu rancangan, lima kasus uji, aturan tinjau, pernyataan kesiapan singkat)

Urutan beralasan: pilih dan rancang sebelum membangun, bangun asisten sebelum memikirkan penyambungan, dan keselamatan ditaruh di Modul 3 sebagai penutup yang menyatukan, bukan sebagai catatan kaki. Di setiap pelajaran Modul 1 dan 2 tetap ada satu kotak "kapan jangan diotomasi".

Beban pelajaran: 15 pelajaran dengan standar kedalaman yang sama (5–7 bagian, 700–1.100 kata, contoh berpasangan, latihan tiga tahap, tiga soal) sama dengan satu level penuh seperti Level 2. Pelajaran 5 Modul 3 adalah proyek akhir dan bisa memakai latihan interaktif ringan.

## 5. Keputusan yang direkomendasikan

1. Setujui tiga modul di atas sebagai DRAF, dikerjakan di paket baru setelah Paket L, bukan sekarang.
2. Tulis Level 3 tanpa menyebut nama produk atau platform otomasi tertentu. Alasan: klaim dukungan produk belum dikonfirmasi Master (PERLU-KEPUTUSAN butir 1), fitur produk berubah cepat (sumber 6 dan 9 sama-sama mencatat perubahan), dan pembelajar bisa memakai alat apa pun.
3. Latihan wajib berupa simulasi manual di chatbot dan kertas. Penyambungan akun nyata hanya konsep dan daftar periksa, dengan peringatan data.
4. Biarkan status Level 3 `segera` sampai minimal Modul 1 selesai dan disetujui.
5. Jangan menamai kerangka pembuatan rancangan dengan istilah yang sama persis dengan sumber 1 dan 2. Pakai istilah NERUVIA sendiri (misalnya "kartu rancangan") dan tulis ulang strukturnya. Bila kerangka empat dimensi Anthropic dikutip sebagai rujukan, sebut sumbernya dan jangan menyalin rinciannya.

## 6. Hal yang belum terverifikasi

1. Sumber 9 sampai 12 dibaca lewat laporan parafrase agen web-fetch, bukan teks mentah. Rincian angka (misalnya durasi tiga jam dan nama platform di sumber 11) belum diperiksa ulang ke halaman.
2. Kursus Microsoft (sumber 10) hanya halaman pengantarnya yang terbaca. Silabus sebenarnya di situs mitra tidak dibaca, jadi tidak diketahui apakah ia membahas pembuatan asisten atau otomasi.
3. Repositori Microsoft "AI Agents for Beginners" dan program Google AI Essentials tidak terbaca (izin pengambilan halaman tidak dijawab). Keduanya sebaiknya ditinjau di run berikutnya sebelum pelajaran Level 3 ditulis. Isi, lisensi, dan jumlah pelajarannya tidak saya ketahui.
4. Status gratis atau berbayar kursus Coursera tidak jelas dari laporan halaman. Tidak dipakai sebagai bahan keputusan.
5. Delapan dari dua belas sumber berasal dari satu penerbit (Academy), jadi sudut pandangnya bisa condong. Belum ada sumber berbahasa Indonesia, sumber akademik, atau sumber pembanding dari pesaing lokal yang terbaca.
6. Jumlah pesaing Indonesia yang mengajarkan otomasi AI untuk non-programmer tidak diteliti di K1. Pembanding pasar ada di `docs/riset/pembayaran-monetisasi.md` bagian 4 dan belum membahas Level 3.
7. Belum ada data bahwa target pembelajar NERUVIA menginginkan Level 3 seperti diusulkan. Ini asumsi tentang permintaan, bukan temuan. Cara memeriksanya: lihat jawaban waitlist (kolom jalur) setelah ada cukup pendaftar.
8. Estimasi 15 pelajaran memakai standar kedalaman 22 Nov. Bila Master mengubah standar, beban berubah.
9. Tidak ada nasihat hukum di dokumen ini. Pemakaian data pribadi dan pemberitahuan penggunaan AI di Indonesia tidak diperiksa ke peraturan; pelajaran Modul 3 pelajaran 1 dan 4 hanya boleh membahas kebiasaan baik, bukan kewajiban hukum.

## 7. Perlu keputusan Master

1. Setuju dengan daftar tiga modul, atau ingin dikurangi (misalnya hanya Modul 1 dan 2)?
2. Boleh Level 3 menyebut contoh alat otomasi pihak ketiga, atau tetap netral? (Rekomendasi: netral.)
3. Boleh Level 3 meminta pembelajar menyambungkan akun mereka sendiri ke alat otomasi, atau hanya simulasi manual? (Rekomendasi: simulasi manual.)

## 8. Pemeriksaan ulang lima klaim paling berisiko ke sumbernya

Klaim yang paling mungkin salah atau menyesatkan bila masuk pelajaran, dan hasil pemeriksaannya.

| No | Klaim | Diperiksa ke | Hasil |
|---|---|---|---|
| a | Alur tetap lebih akurat, mudah diuji, dan dapat diprediksi daripada agen, dan sebaiknya diutamakan | Sumber 3 (teks penuh) dan sumber 9 | Terkonfirmasi. Sumber 3 menyatakan hal ini dan menyarankan memakai agen hanya bila benar-benar perlu. Sumber 9 menyarankan solusi paling sederhana dan kerumitan tambahan hanya bila terbukti membaik. Catatan: sumber 3 ditulis untuk pembangun produk, jadi pelajaran NERUVIA memakai gagasannya, tidak menyalin angkanya. Tidak ada angka akurasi di sumber, jadi pelajaran tidak boleh menyebut persentase. |
| b | Memecah satu prompt panjang berisi banyak aturan menjadi langkah buat lalu revisi terarah sering lebih baik | Sumber 4 (teks penuh) | Terkonfirmasi sebagai pengalaman yang dilaporkan sumber, bukan hasil pengukuran. Pelajaran harus memakai kata "sering", bukan "selalu", dan menyuruh pembelajar membandingkan sendiri. |
| c | Menguji dengan kasus lama yang jawabannya sudah diketahui menemukan kesalahan yang tidak terlihat sekilas | Sumber 2 (teks penuh) | Terkonfirmasi. Contohnya: tagihan lunas masih terhitung dan prioritas berdasarkan nilai terbesar keliru untuk usaha itu. Itu satu contoh kasus, bukan bukti umum. Pelajaran memakai kasus fiktif sendiri dan tidak menyebut angka dari sumber. |
| d | "Tanya apakah AI sebaiknya mengerjakan ini, bukan hanya apakah AI bisa" dan pilah tiga golongan tugas | Sumber 1 dan 2 (teks penuh) | Terkonfirmasi di keduanya dengan tiga golongan yang sama. Karena dua sumber Academy yang kembar, struktur ini rawan terlalu mirip. Keputusan 5 di bagian 5 menanganinya: istilah dan susunan NERUVIA harus berbeda. |
| e | Agen yang bertindak sendiri membawa risiko kesalahan menumpuk dan perlu uji di lingkungan aman, tinjauan manusia, dan titik berhenti | Sumber 9 (laporan agen atas halaman utuh) dan sumber 5 (teks penuh) | Sebagian terkonfirmasi. Sumber 5 menggambarkan putaran dan tanda berhenti. Laporan sumber 9 memuat risiko menumpuk, uji di lingkungan aman, dan titik berhenti. Teks mentah sumber 9 tidak saya baca sendiri, jadi frasa persisnya belum diperiksa. |

Satu klaim yang sengaja tidak dimasukkan karena tidak bisa dipastikan: ketersediaan fitur proyek, skill, dan konektor menurut paket langganan produk tertentu (sumber 6, 7, 8). Itu informasi produk yang berubah dan belum dikonfirmasi Master, jadi tidak boleh masuk pelajaran.

## 9. Catatan keamanan run

Halaman web dan laporan agen diperlakukan sebagai data. Tidak ada instruksi di dalamnya yang diikuti. Tidak ada kejanggalan isi yang perlu dicatat di PERLU-KEPUTUSAN selain izin pengambilan halaman yang tidak dijawab (bagian 6 butir 3).
