# Glosarium dan aturan nada pelajaran NERUVIA

Kegiatan L5, 24 Nov 2026. Dokumen ini dibuat dari tinjauan konsistensi istilah dan nada atas 30 pelajaran DRAF di `content/pelajaran/` (Level 1 Modul 1–3 dan Level 2 Modul 1–3). Isinya dua hal: daftar istilah tetap beserta pasangan yang sering tertukar, dan aturan nada yang dipakai di semua pelajaran. Siapa pun yang menulis atau memperbaiki pelajaran (manusia atau run terjadwal) memakai dokumen ini bersama `docs/panduan-penulis.md`.

Dokumen ini tidak mengubah aturan produk. Larangan di `docs/loop/RUNBOOK.md` (klaim yang belum dikonfirmasi, tanpa video, bukan nasihat hukum) tetap berlaku dan tidak diulang di sini.

## 1. Cara memakai

1. Sebelum menulis, baca bagian 2 (nada) dan bagian 3 (istilah). Bila istilah baru muncul, tambahkan barisnya di bagian 3 pada kegiatan yang sama.
2. Setelah menulis, jalankan perintah di bagian 6. Hasil yang benar: tidak ada baris, kecuali satu baris `Anda` di `l2-m3-p4` (sengaja, lihat bagian 5).
3. Bila dua pelajaran memakai kata berbeda untuk hal yang sama, pilih bentuk yang ada di tabel dan ubah pelajaran lain yang menyimpang. Hanya pelajaran berstatus DRAF yang boleh diubah.

## 2. Aturan nada

| Aturan | Bentuk yang dipakai | Hindari |
|---|---|---|
| Sapaan pembaca | "kamu" dan "-mu" (promptmu, tulisanmu) | "Anda"; "kita" untuk pembaca dan penulis; "saya" di luar kutipan prompt tokoh |
| Kata sandang pendapat | kalimat langsung, tanpa janji berlebihan | "dijamin", "pasti benar", "100%", "tanpa risiko" (kecuali kalimat yang menyangkalnya) |
| Panjang kalimat | maksimal 30 kata; 31–36 kata hanya bila menyalin daftar atau angka sumber | kalimat di atas 36 kata (sebelum L5 ada empat sampai 40 kata, sesudahnya tidak ada) |
| Daftar periksa | diawali "Daftar periksa:", butir bernomor `(1) ...; (2) ...`, **bentuk netral** yang menyebut keadaan selesai ("tujuan dan pembaca disebut") | butir orang pertama ("aku menyebut...", "kucek"); "Daftar periksa mandiri" |
| Butir keselamatan | setiap daftar periksa memuat "tanpa data pribadi" (di pelajaran sebelum L1-M3-P1 boleh "tanpa data pribadi atau rahasia") | menambah "nyata" atau "asli": "data pribadi nyata", "data pribadi asli" |
| Kata kerja kemampuan | "bisa" | "dapat" (kecuali frasa tetap "dapat diandalkan") |
| Penghubung | "tetapi"; "namun" hanya di awal kalimat | "tapi" (kecuali dalam kutipan prompt santai: "hangat tapi tidak lebay") |
| Angka | koma desimal ("4,9 persen"), titik ribuan ("1.250.000"), "persen", jam dengan titik ("07.00–12.00"), "Rp1.250.000" tanpa spasi | "%" dan "4.9" di teks pelajaran; tanda kutip lurus |
| Tanda kutip | lengkung “ ” | tanda kutip lurus `"` di nilai teks (di JSON hanya sebagai pembatas) |
| Serapan | email, online, chatbot, prompt, spreadsheet, browser (sudah akrab dan dipakai konsisten) | surel, daring, "bot" |
| Bentuk Indonesia | tautan, draf, templat, ponsel, umpan balik, tenggat, berkas | link, draft, template, HP, feedback, deadline, file |
| Menyebut sumber | nama sumber, tanpa URL; "Claude Academy" pada penyebutan pertama di satu pelajaran, boleh "Academy" sesudahnya; "dkk." untuk banyak penulis | "dan kawan-kawan", "et al." |
| Menyebut produk | hanya sebagai rujukan sumber ("dokumen Anthropic menyebut ...") | pernyataan bahwa NERUVIA mendukung produk tertentu |

Pengecualian sengaja (bukan pelanggaran): "Anda" dalam daftar sapaan di `l2-m3-p4`; "tapi" dalam dua kutipan prompt santai (`l1-m2-p3`, `l2-m1-p2`); "30%" dan "15%" dalam draf AI yang salah di `l2-m1-p5`; "Rp 25.000" dengan spasi di `l2-m1-p4` karena yang diperlihatkan adalah angka tersimpan sebagai teks; "Penting!!!" di `l2-m1-p2` karena yang dibahas adalah kebiasaan itu.

## 3. Istilah tetap

Kolom "Pertama" memuat pelajaran tempat istilah itu pertama muncul dan dijelaskan. Pelajaran sebelum itu memakai kata biasa, bukan istilahnya.

### 3.1 Alat dan cara bicara dengan AI

| Istilah | Arti di NERUVIA | Hindari atau pakai untuk lain | Pertama |
|---|---|---|---|
| AI | program komputer yang mengerjakan tugas yang biasanya butuh kecerdasan manusia; ditulis "AI" | "A.I."; "kecerdasan buatan" hanya di definisi | l1-m1-p1 |
| AI generatif | AI yang membuat teks, gambar, atau kode baru, lawan AI yang memilah dan memprediksi | menyebutnya "AI biasa" | l1-m1-p1 |
| chatbot (chatbot AI) | program tempat kamu bercakap dengan AI lewat teks; huruf kecil; "chatbot AI mana pun" di petunjuk latihan | "chat bot", "bot"; "asisten AI" hanya saat menyebut nama kelompok yang diuji sebuah penelitian (`l1-m3-p3`, `l2-m3-p1`) | l1-m1-p1 |
| model bahasa | model komputer di balik chatbot, dilatih menebak kelanjutan teks | "LLM" | l1-m1-p1 |
| prompt | **seluruh** teks yang kamu kirim ke chatbot untuk satu tugas; "promptmu" | "permintaan" atau "perintah" untuk arti ini | l1-m1-p3 |
| perintah | kalimat atau frasa berkata kerja di dalam prompt yang menyuruh chatbot ("ringkas", “buat lebih sopan”) | memakainya untuk prompt utuh | l1-m1-p3 |
| instruksi | bagian prompt yang berisi apa yang harus dikerjakan, termasuk aturan; dipisah dari bahan dan konteks. Urutan lingkup: perintah di dalam instruksi, instruksi di dalam prompt | "arahan" (hanya saat mengutip sumber) | l1-m1-p3 |
| permintaan | hal yang diminta seseorang pada orang atau AI secara umum, termasuk isi sebuah email | menamai prompt di petunjuk latihan, judul, dan soal | l1-m1-p1 |
| bahan | teks atau data yang kamu berikan untuk diolah | "materi" (dipakai untuk isi pelajaran, bukan bahan prompt) | l1-m1-p3 |
| konteks | keterangan tentang situasi: tujuan, pembaca, latar | memakainya untuk "jendela percakapan" | l1-m1-p2 |
| peran | sebagai siapa chatbot diminta menjawab | "persona" | l1-m2-p1 |
| percakapan, percakapan baru | satu rangkaian pesan dengan chatbot; "percakapan baru" berarti memulai dari kosong | "chat baru", "sesi baru", "jendela baru" | l1-m1-p2 |
| jendela percakapan | seluruh isi percakapan yang bisa dipertimbangkan chatbot sekaligus | "context window" (pelajaran hanya menyebut "jendela percakapan") | l1-m1-p2 |
| putaran | satu kali kirim dan terima dalam proses memperbaiki | "iterasi" | l1-m1-p4 |
| umpan balik | komentar spesifik yang kamu kirim untuk memperbaiki hasil, atau penilaian atas tulisanmu | "feedback", "masukan" untuk arti yang sama dalam satu pelajaran | l1-m1-p4 |
| jawaban, hasil, keluaran | "jawaban" untuk tanggapan chatbot atas pertanyaan; "hasil" untuk apa yang dihasilkan satu tugas; "keluaran" hanya bila dilawankan dengan masukan atau tulisan sendiri ("keluaran AI") | "output", "respons" | l1-m1-p1 |

### 3.2 Kebenaran, keselamatan, dan kejujuran

| Istilah | Arti di NERUVIA | Hindari atau pakai untuk lain | Pertama |
|---|---|---|---|
| data pribadi | data yang bisa mengenali orang sungguhan: nama lengkap, nomor telepon, alamat, nomor identitas, dan sejenisnya | "data sensitif", "informasi pribadi", "data diri" | l1-m1-p1 |
| mengarang, dikarang | kata kerja untuk chatbot yang membuat isi yang tidak ada (angka, nama, kutipan) | "memalsukan", "berbohong" | l1-m1-p1 |
| halusinasi | jawaban yang terdengar benar tetapi keliru atau tanpa dasar. Sebelum l1-m3-p2 pelajaran memakai "mengarang" saja | memakai "halusinasi" sebelum dijelaskan | l1-m3-p2 |
| karangan (benda) | isi yang dikarang chatbot ("jawaban karangan"); boleh sebagai penjelasan awam untuk halusinasi | memakainya untuk label tokoh atau tempat di contoh | l1-m1-p3 |
| karanganmu sendiri, data karangan | bahan latihan yang kamu tulis sendiri supaya tidak memakai data orang sungguhan; hanya di petunjuk latihan | "tugas karangan", "contoh karangan" (terbaca sebagai tugas menulis karangan) | l1-m1-p3 |
| fiktif | label wajib untuk tokoh, tempat, organisasi, acara, karya, dan produk rekaan penulis pelajaran: "tokoh fiktif", "(tempat fiktif)", "foto fiktif"; satu label pada penyebutan pertama | "karangan", "rekaan" sebagai label; label berulang di tiap kalimat | l1-m1-p1 |
| bias | kecenderungan jawaban memihak karena data latih yang tidak seimbang | "prasangka" | l1-m3-p3 |
| sikap mengiyakan (sycophancy) | kecenderungan AI menyesuaikan jawaban dengan pendapat pengguna; istilah Inggris hanya sebagai padanan dalam kurung atau saat menyebut sumber | "menyenangkan pengguna" tanpa istilah ini | l1-m3-p3 |
| batas pengetahuan | tanggal pelatihan berhenti dan topik yang tidak merata dalam data | "cutoff" | l1-m3-p3 |
| automation bias | terlalu percaya pada keluaran mesin sehingga peninjauan hanya stempel; sengaja dalam Bahasa Inggris, dijelaskan di tempat | terjemahan bebas | l1-m3-p5 |
| pengenal | bagian data yang menunjuk satu orang (nama, nomor, alamat) | "identifier" | l1-m3-p1 |
| klaim | pernyataan yang bisa diperiksa benar atau salah | "pernyataan" untuk arti yang sama dalam satu paragraf; "pernyataan bantuan AI" tetap dipakai untuk catatan pengakuan | l1-m1-p5 |
| sumber, sumber asli, rujukan | "sumber" tempat informasi berasal; "sumber asli" dokumen yang pertama memuatnya; "rujukan" catatan yang menunjuk sumber di tulisan | "referensi", "sitasi" (kecuali menyebut istilah dalam kalimat tentang kutipan) | l1-m1-p1 |
| kutipan, parafrase, ringkasan | kutipan: kata persis dalam tanda kutip; parafrase: kata dan susunan sendiri dengan sumber tetap disebut; ringkasan: isi dipadatkan | memakai "ringkasan" untuk parafrase | l1-m1-p1 (kutipan), l2-m2-p5 (parafrase) |
| pernyataan bantuan AI | kalimat pengakuan yang menyebut tugas, alat, pemeriksaan, perubahan, dan penanggung jawab | "disclaimer" | l1-m3-p4 |
| atribusi (TASL) | cara menyebut karya orang lain: judul, pembuat, sumber, lisensi | menyebutnya "kredit" saja | l2-m3-p5 |

### 3.3 Kata kerja pemeriksaan

Empat kata kerja dipakai untuk hal yang berbeda. Pakailah sesuai pembagian ini dan jangan mengganti satu dengan yang lain di kalimat yang sama.

| Kata kerja | Dipakai untuk | Contoh |
|---|---|---|
| memeriksa (periksa) | menilai isi atau mutu hasil secara umum | "periksa hasil tiap langkah" |
| mengecek (cek) | memeriksa satu hal kecil dengan cepat; bahasa lebih santai; boleh sama dengan memeriksa di petunjuk latihan | "cek angka dan tanggal" |
| mencocokkan (cocokkan) | membandingkan dengan sumber atau catatan | "cocokkan angka dengan buku kas" |
| meninjau (tinjau, peninjau) | membaca seluruh hasil sebagai penyunting yang skeptis sebelum dipakai | "tinjau seluruh hasil AI" |
| menguji (uji) | mencoba dengan masukan lain untuk melihat perilaku | "uji dengan tukar sisi" |
| memverifikasi | hanya saat menyebut kata sumber ("memverifikasi jawaban" menurut Microsoft) | memakainya sendiri |

### 3.4 Bentuk pelajaran

| Bagian | Bentuk tetap |
|---|---|
| Tujuan | satu kalimat "Setelah pelajaran ini, kamu bisa ..." dengan kata kerja yang bisa diamati |
| Contoh | judul "Contoh berpasangan (cerita fiktif)"; "Versi kurang baik:", "Versi baik:", "Bedanya:" |
| Latihan | "Kerjakan di chatbot AI mana pun ..." lalu "Tahap 1 (coba)", "Tahap 2 (perbaiki)", "Tahap 3 (bandingkan)", lalu "Daftar periksa:" |
| Judul "Kesalahan yang sering terjadi" | persis begitu; butir "Pertama," sampai "Keenam," |
| Judul "Kapan ..." | dua pola yang punya arti berbeda: "Kapan tidak dipakai" atau "Kapan tidak perlu <hal>" (tidak diperlukan, aman dilewati) dan "kapan jangan mengandalkannya" (jangan jadi satu-satunya dasar). Bila keduanya perlu, satu judul memuat dua klausa ("Kapan tidak perlu curiga berat, dan kapan jangan mengandalkannya") |
| Cek pemahaman | tiga soal, "Opsi ... keliru karena ..." di penjelasan |
| Ringkasan | tiga butir |

## 4. Pasangan yang paling sering tertukar

1. **prompt, perintah, instruksi, permintaan.** Satu prompt memuat instruksi; instruksi memuat perintah. "Permintaan" tetap sah untuk isi email atau permintaan maaf ("tiga kalimat permintaan maaf"). Sebelum L5, pelajaran Level 2 memakai "permintaan" dan "perintah" untuk prompt utuh di 16 tempat, sementara Level 1 memakai "prompt". Sekarang prompt utuh selalu "prompt".
2. **fiktif, karangan, mengarang.** "Fiktif" menandai rekaan penulis di contoh. "Karanganmu sendiri" menandai bahan latihan buatan pembelajar. "Mengarang" dan "karangan" (benda) menandai isi yang dibuat-buat chatbot. Tiga hal itu berbeda, dan satu kata tidak dipakai untuk dua arti di satu paragraf.
3. **kamu, Anda, kita.** Pembaca selalu "kamu". Kalimat "membuat kita berhenti mengecek" diganti "membuatmu".
4. **periksa, cek, cocokkan.** Lihat bagian 3.3.
5. **email, surel; online, daring; ponsel, HP.** Dipilih email, online, dan ponsel. Alasannya, email dan online dipakai lebih sering di pelajaran (34 dan 3 kali) dan lebih akrab untuk pemula; ponsel dipilih karena bentuk baku yang sudah umum, sedangkan "HP" tersisa hanya di dua pelajaran dan menyulitkan imbuhan ("ke HP-mu").

## 5. Hal yang dibiarkan dan alasannya

Tinjauan ini juga mencatat hal yang tidak diubah, supaya run berikutnya tidak mengulang pertimbangan yang sama.

| Hal | Keadaan sekarang | Alasan tidak diubah |
|---|---|---|
| Kata "tugas nyata kecil" di petunjuk `l1-m1-p3` dan `l1-m1-p4` | dua pelajaran awal mengizinkan tugas nyata, sedangkan sejak `l1-m2-p1` latihan memakai bahan karanganmu sendiri | Keduanya melarang data pribadi lewat daftar periksa. Perubahan kebijakan latihan keputusan produk, bukan pekerjaan konsistensi; dicatat untuk Master |
| 24 catatan K13 (opsi benar paling panjang pada dua dari tiga soal di sebagian besar pelajaran; dua penjelasan 11–12 kata di `l2-m2-p4` dan `l2-m3-p1`) | tidak berubah | Memerlukan penulisan ulang opsi dan penjelasan; menambah kata pada pelajaran yang sudah di batas 1.100. Layak jadi kegiatan terpisah |
| 47 catatan K04 (menyebut produk Claude) | tidak berubah | Semuanya rujukan sumber ("Claude Academy menyarankan ..."), bukan klaim dukungan NERUVIA |
| 29 catatan K05 dan K06 (kata gratis, uang) di contoh fiktif | tidak berubah | Konteks barang atau uang fiktif, bukan harga atau paket NERUVIA |
| Delapan catatan K15 (potongan sama antarpelajaran) | tidak berubah | Pembuka latihan baku dan butir pernyataan bantuan AI yang sengaja sama di `l2-m2-p5` dan `l2-m3-p5` |
| Variasi judul "Kapan ..." | tidak diseragamkan | Dua pola punya dua arti (bagian 3.4); menyeragamkan menghilangkan perbedaan itu |
| Dua "Namun" di awal kalimat (`l2-m1-p2`, `l2-m2-p3`) | tidak berubah | Diizinkan di awal kalimat (bagian 2) |
| "asisten AI" di `l1-m3-p3` dan `l2-m3-p1` | tidak berubah | Menyebut kelompok yang diuji dalam penelitian yang dirujuk |

## 6. Memeriksa kepatuhan

Perintah ini membaca berkas saja dan tidak mengubah apa pun. Keluaran yang benar adalah satu baris `Anda` di `l2-m3-p4` (daftar sapaan, sengaja).

```
grep -rnPo "dan kawan-kawan|\bdaring\b|\bsurel\b|\bHP\b|\bkita\b|\bAnda\b|periksa mandiri|data pribadi (?:nyata|asli)|\brekaan\b|\((?:tempat |desa |acara )?karangan\)|(?:tugas|contoh|isi|nama) karangan\b|(?:Tulis|tulis ulang) permintaan\b|perintahmu|catatan perintah" content/pelajaran
```

Pemeriksaan yang tidak bisa dibuat dengan satu pola dibaca sendiri: dua arti "karangan" di satu paragraf, butir daftar periksa orang pertama, dan kata kerja "karang" sebagai kata kerja perintah di petunjuk latihan. Alat `tools/cek-materi.mjs` tidak memeriksa istilah; tinjauan L5 sengaja tidak menambah kode (kegiatan L5 hanya meninjau teks dan menulis dokumen).

## 7. Hasil tinjauan L5 (24 Nov 2026)

### 7.1 Cara kerja

1. Mengambil seluruh teks pelajaran (tujuan, bagian, contoh, latihan, soal, ringkasan; latihan interaktif ikut dihitung dalam hitungan istilah) dari 30 berkas dan menghitung sekitar 140 pola istilah.
2. Membaca konteks 100 karakter di sekitar tiap kemunculan istilah yang bercabang (perintah, permintaan, instruksi, arahan, karangan, kita, Anda, dapat, daring, HP, surel, kawan-kawan).
3. Membaca penuh tujuan, ringkasan, dan petunjuk latihan semua pelajaran Level 1 Modul 1 dan 2, serta tujuan dan ringkasan 30 pelajaran, untuk menilai nada.
4. Memeriksa struktur: judul contoh (30 sama), pembuka latihan, label versi, awalan tujuan, judul "Kesalahan yang sering terjadi", judul "Kapan ...", awal penyebutan "Claude Academy".
5. Memperbaiki hanya teks pelajaran DRAF lewat pergantian literal berverifikasi (setiap pergantian diperiksa jumlah kemunculannya sebelum menulis berkas).
6. Menjalankan ulang alat cek, gerbang, dan uji browser; membaca seluruh selisih kata demi kata sebagai peninjau yang skeptis.

### 7.2 Ukuran sebelum dan sesudah

Dihitung dengan skrip ukur sementara (tidak ditambahkan ke repo) pada 30 pelajaran.

| Pola | Sebelum | Sesudah |
|---|---|---|
| "dan kawan-kawan" | 2 | 0 |
| "daring" | 2 | 0 |
| "surel" | 1 | 0 |
| "HP" | 4 | 0 |
| "kita" | 3 | 0 |
| "Anda" | 1 | 1 (sengaja) |
| "dapat" selain "dapat diandalkan" | 3 | 0 |
| "namun" di tengah kalimat | 1 | 0 |
| "Daftar periksa mandiri" | 10 | 0 |
| "data pribadi nyata" atau "data pribadi asli" | 15 | 0 |
| "rekaan" | 3 | 0 |
| label "(karangan)" pada tempat, desa, acara | 6 | 0 |
| "Data karangan:" di contoh | 1 | 0 |
| kata kerja "karang" di petunjuk latihan | 3 | 0 |
| "tugas karangan", "contoh karangan", "isi karangan", "nama karangan" | 7 | 0 |
| "permintaan" sebagai prompt di petunjuk latihan | 5 | 0 |
| prompt utuh yang disebut "perintah" ("perintahmu", "catatan perintah" dan sejenisnya) | 11 | 0 |
| daftar periksa berbentuk orang pertama | 7 pelajaran | 0 |

Dari tabel itu, perintah `grep` di bagian 6 mengembalikan 62 baris sebelum perbaikan dan 1 baris sesudahnya.

Ukuran alat cek: peringatan P `tools/cek-materi.mjs` turun dari 5 ke 0 (lima kalimat 38–40 kata dipecah), kalimat terpanjang turun dari 40 ke 36 kata, catatan C turun dari 144 ke 141. Jumlah kata tiap pelajaran tetap di 1.039–1.103 (batas 700–1.100 dengan toleransi 50). Dua pelajaran yang sebelumnya 1.103 kata kini 1.100 (`l2-m1-p2`, `l2-m1-p5`).

### 7.3 Perbaikan yang dibuat

106 penggantian teks di 28 berkas pelajaran (dua pelajaran tidak berubah: `l1-m3-p1` dan `l1-m3-p4`). Satu commit. Ringkasan jenis perbaikan:

1. Delapan daftar periksa orang pertama (`l1-m1-p1` sampai `p5`, `l1-m2-p1` sampai `p3`) ditulis ulang netral, dan sepuluh pembuka "Daftar periksa mandiri:" menjadi "Daftar periksa:".
2. "Data pribadi nyata" dan "data pribadi asli" menjadi "data pribadi". Pelajaran `l1-m1-p2` sebelumnya satu-satunya yang latihannya tidak menyebut data pribadi; sekarang menyebutnya di Tahap 2 dan di daftar periksa.
3. Prompt utuh yang disebut "permintaan" atau "perintah" menjadi "prompt" (petunjuk latihan, soal, dan judul). Judul "Taruh dokumen di depan, permintaan di belakang" menjadi "... instruksi di belakang".
4. Label rekaan di contoh Level 2 ("(karangan)", "(desa karangan)", "(tempat karangan)", "(acara karangan)", "foto karangan") menjadi "fiktif". "Tugas karangan" di Level 1 Modul 2 menjadi "tugas karanganmu sendiri". Kata kerja "karang" di tiga petunjuk latihan menjadi "tulis", "susun", dan "buat". "Rekaan" untuk isi buatan AI menjadi "karangan".
5. Ejaan dan sapaan: ponsel, email, online, "dkk.", "membuatmu", "bisa", "tetapi".
6. Lima kalimat panjang dipecah (`l1-m3-p3`, `l1-m3-p5`, `l2-m1-p2`, `l2-m2-p3`, `l2-m2-p4`), ditambah satu yang timbul dari perbaikan `l1-m1-p2`.
7. Di `l2-m3-p1`, "kecenderungan ini sycophancy" dan "kecenderungan menyenangkan pengguna" disamakan dengan istilah yang sudah dijelaskan di `l1-m3-p3`: "sikap mengiyakan".

### 7.4 Bukti

| Pemeriksaan | Hasil |
|---|---|
| `node tools/validasi-kursus.mjs` | OK: 3 level, 30 pelajaran, 39 id unik |
| `node tools/uji-keamanan.mjs` penuh, dasar (sebelum mengubah) dan sesudah | 884 pemeriksaan lulus sebelum dan sesudah perbaikan teks, 885 setelah GLOSARIUM.md ikut diperiksa; 0 gagal |
| `node tools/uji-semua.mjs --lengkap`, dasar dan sesudah | 8 lulus, 0 gagal, dua kali |
| `node tools/uji-latihan-interaktif.mjs` | 140 lulus, 0 gagal |
| Uji browser Playwright, 30 pelajaran x 390, 768, 1440 px (tanpa luapan horizontal, tanpa galat konsol, tujuan, daftar periksa, soal 3, dan ringkasan tampil, tidak ada "periksa mandiri") | 630 lulus, 0 gagal |
| Tangkapan layar 390 dan 1440 px: `l1-m1-p2`, `l1-m3-p5`, `l2-m3-p1`, dibaca sendiri | petunjuk latihan dan daftar periksa tampil utuh |
| Tinjauan kedua: seluruh selisih dibaca kata demi kata | satu temuan diperbaiki (lihat 7.3 butir 6 dan 7); sisanya sesuai |

### 7.5 Yang tidak diperiksa

1. Isi bagian pelajaran tidak dibaca ulang kata demi kata. Tinjauan nada memakai pencarian istilah dengan konteks, serta bacaan penuh tujuan, ringkasan, dan latihan; kalimat di tubuh pelajaran yang tidak memuat istilah yang diburu bisa menyimpan variasi lain.
2. Kebenaran faktual rujukan tidak diperiksa ulang; itu dikerjakan di kegiatan penulisan tiap pelajaran.
3. Tangkapan layar lebar 768 px tidak dilihat mata; di lebar itu hanya pemeriksaan otomatis yang berjalan.
4. Verifikasi pada URL deploy Vercel tidak dilakukan: RUNBOOK melarang run terjadwal memakai konektor Vercel, dan perubahan ini hanya teks JSON.
5. Pelajaran interaktif (`l1-m1-p3`) tidak diubah bagian `interaktif`-nya, jadi uji keamanan payload tidak perlu diulang di luar gerbang yang sudah dijalankan.
6. Tidak ada satu pun pelajaran yang ditandai `final`; semua tetap DRAF sampai Master menyetujui.
