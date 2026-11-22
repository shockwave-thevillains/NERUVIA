# Riset pembayaran dan monetisasi NERUVIA

Disusun 22 Nov 2026 oleh Claude atas permintaan Master. Ini bahan keputusan, bukan nasihat hukum, pajak, atau keuangan. Semua angka berasal dari sumber di bagian akhir dan bisa berubah. Cek ulang di situs resmi penyedia sebelum memutuskan.

## Ringkasan

- Penerima pembayaran perorangan tersedia. Midtrans menerima bisnis individu dengan KTP untuk GoPay, QRIS, dan transfer bank. Kartu kredit memerlukan NPWP. Xendit tidak menerima usaha perorangan; syaratnya perseroan perorangan atau perusahaan.
- Biaya terendah ada di QRIS. Sejak 1 Okt 2026, Bank Indonesia menetapkan MDR 0% untuk transaksi sampai Rp100.000 pada semua kategori merchant. Di atas itu, tarif reguler 0,7% berlaku (merchant kategori pendidikan 0,6%).
- Pajak penghasilan orang pribadi: omzet sampai Rp500 juta setahun tidak dikenai PPh, lalu PPh final 0,5% sampai omzet Rp4,8 miliar. PP 20/2026 menghapus batas waktu pemakaian tarif ini bagi orang pribadi dan perseroan perorangan.
- Kewajiban PSE lingkup privat kemungkinan berlaku begitu NERUVIA menjual kursus atau memproses data pribadi. Perorangan boleh mendaftar lewat OSS. Pelanggaran dapat berujung pemblokiran akses.
- Identitas asli tetap diminta oleh penyedia pembayaran dan otoritas pajak. Anonimitas hanya berlaku di halaman publik dan repo, tidak di sisi pembayaran dan pajak.

## 1. Pilihan penerima pembayaran

| Pilihan | Cocok untuk | Yang dibutuhkan | Biaya (per sumber) |
|---|---|---|---|
| Platform jadi: Mayar | Jual cepat tanpa integrasi, checkout dan akses kelas dikelola platform | Akun creator | Starter: 4% platform untuk produk digital, ditambah biaya kanal (QRIS 0,7%, VA Rp4.000, e-wallet 1,5%, kartu 2,6% + Rp2.000). Business Rp349.000/bulan: 3%. |
| Platform jadi: Lynk.id | Link-in-bio dan produk digital | Akun creator | Belum terverifikasi: sumber sekunder menyebut 5% + Rp5.000 per penarikan (paket gratis), situs resmi menolak akses saat dicek. |
| Gateway: Midtrans | Checkout di situs NERUVIA sendiri | KTP untuk GoPay, QRIS, transfer bank. NPWP untuk kartu kredit. | QRIS 0,7% (BI: 0% sampai Rp100.000), VA Rp4.000, kartu 2,9% + Rp2.000, GoPay 2%. |
| Gateway: DOKU, Duitku | Alternatif Midtrans | Belum diperiksa syarat perorangannya | QRIS 0,7%. VA Rp4.000 di DOKU (BCA Rp4.500) dan Rp1.500–5.000 di Duitku menurut bank. |
| Gateway: Xendit | Hanya bila sudah berbentuk PT Perorangan atau perusahaan | Badan usaha | VA Rp9.000 ditambah biaya proses Rp4.000 per transaksi, termasuk QRIS. |

Catatan: pilihan gateway menuntut backend untuk webhook dan pemberian akses. Itu pekerjaan baru di luar situs statis sekarang. Platform jadi menghindari pekerjaan itu, tetapi memotong biaya lebih besar dan membatasi tampilan.

### Contoh biaya per transaksi (hitungan sendiri, tanpa PPN pada biaya)
Harga di bawah hanya contoh hitungan, bukan usulan harga.

| Harga | QRIS (Midtrans) | VA (Midtrans) | Kartu (Midtrans) | Mayar Starter + QRIS | Mayar Starter + VA |
|---|---|---|---|---|---|
| Rp99.000 | Rp0 | Rp4.000 (4,0%) | Rp4.871 (4,9%) | Rp3.960 (4,0%) | Rp7.960 (8,0%) |
| Rp149.000 | Rp1.043 (0,7%) | Rp4.000 (2,7%) | Rp6.321 (4,2%) | Rp7.003 (4,7%) | Rp9.960 (6,7%) |
| Rp299.000 | Rp2.093 (0,7%) | Rp4.000 (1,3%) | Rp10.671 (3,6%) | Rp14.053 (4,7%) | Rp15.960 (5,3%) |

Pembacaan: VA berbiaya tetap, jadi makin murah untuk harga tinggi. QRIS makin murah untuk harga rendah. Untuk harga di bawah Rp100.000, QRIS bisa gratis bila penyedia sudah menerapkan aturan BI.

## 2. Pajak (fakta, bukan saran)

- PP 20/2026 (berlaku 22 Apr 2026) mengubah PP 55/2022. Tarif PPh final 0,5% tetap, batas omzet tetap Rp4,8 miliar setahun.
- Wajib pajak orang pribadi memakai tarif ini tanpa batas waktu, selama omzet tidak melewati Rp4,8 miliar. Perseroan perorangan dan koperasi juga termasuk. CV, firma, dan PT biasa bukan lagi subjek baru. Yang sudah memakai skema ini boleh melanjutkan sampai masa berlakunya.
- Omzet orang pribadi sampai Rp500 juta setahun tidak dikenai PPh. Rp500 juta itu dihitung kumulatif dalam tahun pajak.
- Pengusaha baru wajib dikukuhkan sebagai PKP (dan memungut PPN) setelah omzet melewati Rp4,8 miliar. Pengusaha di bawah batas itu boleh memilih menjadi PKP.
- World Bank (Juli 2026) mengusulkan ambang PKP turun ke Rp500 juta. Itu usulan, bukan aturan berlaku.
- Pelaporan di Coretax, termasuk pemberitahuan NPPN, mengikuti panduan DJP.

## 3. Kewajiban PSE lingkup privat (Permenkominfo 5/2020)

- Pasal 2 mewajibkan pendaftaran bagi PSE privat yang punya situs atau aplikasi untuk: perdagangan barang atau jasa, layanan transaksi keuangan, pengiriman konten digital berbayar, atau pemrosesan data pribadi untuk kegiatan terkait transaksi elektronik (ditambah kategori lain).
- Perorangan dan badan usaha boleh menjadi PSE. Pendaftaran lewat OSS.
- Tidak mendaftar membuat Menteri memutus akses sistem (Pasal 7 ayat 2).
- Pada September 2026 Komdigi mengirim surat ke 25 PSE dan memberi peringatan tertulis ke 7 PSE, dengan ancaman pemutusan akses.
- Implikasi: waitlist sudah memproses data pribadi, dan penjualan kursus menambah kategori perdagangan dan konten berbayar. Konfirmasi dengan layanan Komdigi atau OSS apakah NERUVIA wajib mendaftar sekarang atau saat mulai menjual. Saya belum memastikannya.

## 4. Gambaran harga di pasar (observasi)

- detikcourse: satu kelas AI Rp200.000, paket tiga kelas Rp500.000.
- Build with Angga: kelas premium Laravel dan AI, akses selamanya Rp129.000.
- Banyak materi pemula gratis (misalnya kursus DeepLearning.AI yang bisa diaudit gratis dengan sertifikat berbayar, kelas Dicoding).
- Alat AI pendamping berbayar, misalnya ChatGPT Plus sekitar Rp320.000 per bulan menurut satu sumber sekunder.
- Kesimpulan awal: pesaing gratis banyak. Pembeda NERUVIA (bahasa Indonesia, tanpa harus jago teknologi, latihan di tugas nyata, Neru) perlu terlihat jelas sebelum memasang harga.

## 5. Keputusan yang diperlukan dari Master

1. Bentuk penerima: orang pribadi (KTP, NPWP pribadi) atau PT Perorangan (membuka Xendit dan kartu kredit mudah, biaya pendirian rendah menurut DDTC 2024, perlu dicek ulang).
2. Jalur: platform jadi (cepat, biaya lebih tinggi) atau Midtrans di situs sendiri (biaya lebih rendah, perlu backend).
3. Harga dan model: gratis modul 1 lalu berbayar per level, langganan, atau sekali bayar.
4. Waktu mulai jual, dan apakah PSE didaftarkan sebelum itu.

Selama keputusan ini belum ada, tahap beta tetap gratis dan dashboard penjualan di `/admin/` tetap kartu "Menunggu".

## 6. Yang belum terverifikasi

- Biaya resmi Lynk.id (sumber sekunder saling bertentangan).
- Apakah halaman tarif Midtrans sudah memuat batas 0% sampai Rp100.000 (sumber sekunder per 12 Okt 2026 melaporkan masih 0,7%).
- Apakah kategori merchant "pendidikan" (0,6% di atas Rp100.000) berlaku bagi NERUVIA. Penyedia yang menetapkan kategorinya.
- Tabel metode bayar Midtrans untuk individu dan badan usaha (halaman resmi menyajikannya sebagai gambar).
- Syarat perorangan di DOKU, Duitku, dan iPaymu.
- Apakah NERUVIA wajib mendaftar PSE sekarang.

## Sumber

- Bank Indonesia, siaran pers 17 Agustus 2026 (MDR QRIS 0%): https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2815926.aspx
- BI, panduan MDR QRIS: https://www.bi.go.id/id/publikasi/ruang-media/cerita-bi/Pages/mdr-QRIS.aspx
- Antara, rincian MDR per kategori: https://www.antaranews.com/berita/5697901/bi-perluas-kebijakan-mdr-qris-0-persen-untuk-pelaku-umkm
- BCA, penyesuaian MDR per 1 Oktober 2026: https://www.bca.co.id/id/informasi/news-and-features/2026/09/01/18/50/informasi-penyesuaian-merchant-discount-rate-mdr-transaksi-qris
- Midtrans, dokumen pendaftaran: https://midtrans.com/passport dan https://docs.midtrans.com/docs/what-are-the-legal-documents-required-for-midtrans-account-registration
- Perbandingan biaya gateway (sekunder): https://paymentreview.com/comparisons/midtrans-vs-xendit/ dan https://www.matthewswong.com/en/indonesia/payment-gateway-fees/
- Xendit hanya untuk perseroan perorangan atau perusahaan: https://keuangan.kontan.co.id/news/payment-gateway-topang-ekosistem-pembayaran-digital
- Biaya Mayar dan platform (sekunder, per Juli 2026): https://avora.id/blog/berapa-persen-potongan-platform-creator
- DJP, PP 20/2026: https://www.pajak.go.id/id/artikel/pp-202026-tarif-pph-05-bagi-umkm-orang-pribadi-berlaku-selamanya
- DJP, FAQ PP 20/2026: https://pajak.go.id/sites/default/files/2026-10/FAQ%20PP%20NOMOR%2020%20TAHUN%202026%20Penyesuaian%20Pengaturan%20di%20Bidang%20Pajak%20Penghasilan.pdf
- DDTC, omzet Rp500 juta bebas PPh: https://news.ddtc.co.id/berita/nasional/1819765/ada-pp-baru-omzet-hingga-rp500-juta-bebas-pajak-masih-berlaku
- DDTC, ambang PKP: https://news.ddtc.co.id/berita/nasional/1821328/world-bank-soroti-ambang-batas-pkp-dan-fasilitas-pembebasan-ppn
- JDIH Komdigi, Permenkominfo 5/2020: https://jdih.komdigi.go.id/produk_hukum/view/id/759/t/peraturan+menteri+komunikasi+dan+informatika+nomor+5+tahun+2020
- InfoPublik, teguran PSE 2026: https://infopublik.id/kategori/nasional-ekonomi-bisnis/991211/kemkomdigi-beri-peringatan-7-pse-wajib-daftar-sebelum-1-oktober-2026
- Harga kelas: https://inet.detik.com/cyberlife/d-7276233/kursus-ai-dan-chatgpt-paling-lengkap-dan-terjangkau-cuma-di-detikcourse dan https://buildwithangga.com/kelas/ai-product-engineering-untuk-pemula-dengan-laravel-13
