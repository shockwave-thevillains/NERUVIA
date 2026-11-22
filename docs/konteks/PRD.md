# PRD NERUVIA: Landing dan Ruang Belajar (MVP) v0.3

Diperbarui 21 Nov 2026. Menggantikan v0.2 (18 Nov). Ringkasan ini dipakai run otomatis sebagai konteks produk. Bila ada konflik dengan dokumen lain, dokumen ini yang berlaku, kecuali butir yang ditandai "belum diputuskan".

## 1. Yang berubah dari v0.2
- Fokus: AI dulu. Cybersecurity menyusul setelah jalur AI berjalan. Tidak ada sudut keamanan AI atau niche profesi (audit, risiko, kepatuhan) di pitch awal.
- Pesan jual: "Belajar AI dari nol, tanpa harus jago teknologi." Salinan landing singkat dan menjual.
- Warna: landing monokrom (#080808, #F2F2F0, putih, abu) dengan satu aksen cyan #38E1FF dari atas sampai bawah. Tidak ada warna pastel di mana pun, termasuk Ruang Belajar.
- Maskot: Neru, robot kucing, satu-satunya maskot dan wajah brand. Tanpa tikus, tanpa wajah manusia.
- Anonim: tidak ada nama, latar belakang, atau bagian "siapa di balik NERUVIA" di situs, commit, atau dokumen publik.
- Logo: monogram NV. Berkas logo terbaru dari pemilik proyek menyusul; sampai itu tiba, pakai yang ada di assets/brand.
- Materi: teks dan latihan interaktif ringan, tanpa video di situs. Video pendek dibuat terpisah untuk Instagram dan tidak memuat ajakan daftar sementara situs belum siap.

## 2. Produk
Platform belajar daring berbahasa Indonesia. Alur: halaman jual publik (landing) dan Ruang Belajar. Jalur awal: Level 1 "AI dari Nol", lalu Level 2 "AI untuk Kerja", lalu Level 3 "AI Lanjutan". Cybersecurity dirancang setelah itu.
Kurikulum: pakai AI dulu, baru pakai AI dengan aman. Level 1 Modul 1 "Kenalan dengan AI" sudah punya draf pelajaran 1, 2, 3, 4, dan 5.

## 3. Pengguna dan monetisasi
- Pengguna: pemula dewasa yang ingin memakai AI untuk tugas nyata. Pelajar 13–17 dengan persetujuan orang tua terverifikasi dan <13 ditolak; kapan dibuka belum diputuskan.
- Monetisasi (hybrid): Level 1 gratis, beli per kelas, Pro prabayar, B2B belakangan. Harga belum diputuskan. Klaim "Level 1 gratis" dan "modul pertama gratis" tidak boleh tampil sebagai fakta sebelum pemilik proyek mengonfirmasi.
- Dibangun sendiri dari nol, bukan LMS jadi. Rencana MVP sekitar 13 minggu sejak 16 Nov 2026.

## 4. Desain
- Gaya: modern minimalis hitam putih, tampilan editorial, headline raksasa, Neru menimpa headline hero. Scroll terang, gelap, terang, gelap.
- Token (sama dengan kode landing): bg #FFFFFF / #080808, surface #F2F2F0 / #0E0E0E (kartu gelap #141414), teks sekunder #666666 (terang) dan #B5B5B5 (gelap), garis #D9D9D6 / #2E2E2E, aksen #38E1FF.
- Aturan cyan: di atas #080808 boleh jadi teks, garis, glow (12,76:1). Di atas putih hanya sebagai isian dengan teks hitam, glow, atau garis bawah (1,57:1, gagal sebagai teks). Satu aksen saja.
- Hijau dan merah hanya untuk benar/salah dan status.
- Tanpa pastel. Badge, level, dan progres di Ruang Belajar memakai hitam, putih, abu, dan cyan (kontras sesuai aturan cyan di atas). Hijau dan merah tetap hanya untuk benar/salah dan status.
- Form waitlist bergaya halus: garis rambut, kolom abu, tanpa border tebal.
- Font: Space Grotesk (headline dan isi), Space Mono (label kode), Silkscreen (badge dan progres game). Tidak ada font lain.
- Neru: tetap tampilan sekarang. Ekspresi tambahan: mata bulat besar terbuka yang menyala dengan pupil, selain mata tertutup senyum. Animasi putar kepala hero dibuat ulang dari video baru dengan badan diam. Warna biru Neru tidak mengikuti palet UI.
- Gerak: CSS scroll-driven animation dengan cadangan IntersectionObserver. Tanpa scroll-jacking. `prefers-reduced-motion` mematikan animasi.
- Anggaran: Neru ≤150 KB, LCP < 2,5 dtk di 4G, CLS ≤ 0,1.
- Dilarang: statistik atau klaim sosial tanpa data (peserta, rating, jumlah kursus), wajah manusia, logo merek lain, teks yang disalin dari situs referensi.

## 5. Fitur MVP dan status
| Fitur | Status 21 Nov |
|---|---|
| Landing dengan form waitlist | Ada di branch dev, tersambung ke Supabase neruvia-dev (pratinjau terlindungi login Vercel) |
| Halaman terima kasih | Ada |
| Ruang Belajar (pratinjau): galeri level, halaman pelajaran, soal cek pemahaman, XP, streak, badge, ekspor/impor progres | Ada, noindex, belum ditautkan dari landing |
| Pelajaran tertulis Level 1 Modul 1 | Draf 1 dari 5 |
| Login, komentar, pembayaran | Belum. Dirancang aman lebih dulu sebagai draf |
| Sertifikat, mode baca tenang, mode hemat data | Setelah MVP, belum diputuskan |

## 6. Keamanan dan privasi
- Acuan: OWASP ASVS (validasi input, encoding output, sesi) dan STRIDE untuk form, impor progres, penampil isi, dan penyimpanan lokal.
- Data pengguna lewat form: nama panggilan, email, jalur pilihan, persetujuan. Dasar pemrosesan: persetujuan (UU PDP 27/2022).
- RLS Supabase: anon hanya boleh insert; select, update, delete ditolak; email unik tanpa beda huruf; CHECK pada format dan nilai.
- Output hanya lewat textContent. Tidak ada kunci rahasia di repo; hanya kunci publishable di konfigurasi build dev.
- Kebijakan privasi: identitas pengendali data belum terisi dan bentrok dengan keinginan anonim. Form tidak boleh menerima data nyata dari publik sebelum itu diputuskan dengan nasihat advokat.

## 7. Teknologi
- Fase 1 (sekarang): HTML statis satu berkas, JavaScript murni, Supabase untuk waitlist, hosting GitHub Pages (main) dan Vercel preview (dev).
- Fase platform penuh: Next.js di Vercel, Supabase (ap-southeast-1, RLS), Mux untuk video bila ada, pembayaran Midtrans atau Xendit, email Resend. Dikunci setelah gerbang G1.

## 8. Pertanyaan terbuka
1. Pelajar di bawah 18 dibuka kapan? 2. Harga dan klaim "gratis". 3. Identitas pengendali data versus anonim. 4. Domain (NERUVIA, belajarpakeai, atau lainnya). 5. Penambah landing yang masuk MVP: kredibilitas dan halaman belajar aman diutamakan, mini demo dan peta interaktif ditunda. 6. Kapan login dan komentar diaktifkan. 7. Berkas logo terbaru.
