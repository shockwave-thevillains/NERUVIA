# Rujukan materi dari platform lain

Aturan: sebelum menulis draf pelajaran, cari dulu materi setara di platform lain, bandingkan cakupannya, lalu tulis ulang dengan kata sendiri dalam Bahasa Indonesia. Rujukan dipakai untuk memeriksa celah topik dan urutan, bukan untuk disalin. Jangan menyalin kalimat, contoh, atau struktur persis. Kutipan maksimal satu frasa pendek. Catat setiap rujukan di tabel bawah (URL lengkap, tanggal diakses, dipakai untuk pelajaran apa, celah yang ditemukan). Klaim fakta tentang produk atau fitur harus dicek ulang ke sumber resmi sebelum masuk ke pelajaran.

Sumber yang dicari (urut prioritas): Claude Academy (academy.claude.com), kursus pengantar AI dari Google, Microsoft Learn, dan platform lain yang gratis dan terbuka. Konektor Claude_Academy dan WebSearch tersedia di run terjadwal.

| Pelajaran | Rujukan | URL | Yang dipelajari (parafrase) | Diakses |
|---|---|---|---|---|
| l1-m1 (umum) | Claude 101 | https://academy.claude.com/courses/claude-101 | Urutan: kenalan dengan AI, percakapan pertama, prompt jelas, memperbaiki hasil | 21 Nov 2026 |
| l1-m1-p1..p5 | AI Fluency: Framework and foundations | https://academy.claude.com/courses/ai-fluency-framework-foundations | Kerangka 4D (Delegation, Description, Discernment, Diligence) sebagai tulang punggung menilai hasil AI | 21 Nov 2026 |
| l1-m1-p3 | Effective prompting techniques | https://academy.claude.com/courses/ai-fluency-framework-foundations/effective-prompting-techniques | Prompt adalah instruksi yang jelas, memakai prinsip komunikasi biasa | 21 Nov 2026 |
| l1-m1-p4 | Refining with AI | https://academy.claude.com/courses/ai-fluency-for-small-businesses/researching-with-ai | Memperbaiki prompt berulang berdasarkan jawaban sebelumnya, pengguna tetap pengambil keputusan | 21 Nov 2026 |
| l1-m3 (aman) | Understanding privacy and data | https://academy.claude.com/courses/ai-fluency-for-nonprofits/understanding-privacy-and-data | Jangan unggah data identitas ke alat yang menyimpan masukan; samarkan dulu | 21 Nov 2026 |
| l1-m3 (aman) | Transparent AI use | https://academy.claude.com/courses/ai-fluency-for-small-businesses/using-data-with-ai | Cocokkan alat dengan tingkat sensitivitas data, buang detail yang tidak perlu | 21 Nov 2026 |

Catatan: indeks Academy hanya memberi garis besar dan potongan teks. Isi lengkap pelajaran belum dibaca. Bila perlu rincian, buka halaman lewat get_content, lalu tetap tulis ulang sendiri.

## Rujukan keamanan (bukan materi pelajaran)
| Dipakai untuk | Rujukan | URL | Yang dipelajari (parafrase) | Diakses |
|---|---|---|---|---|
| S4 auth-komentar | Supabase: Password security | https://supabase.com/docs/guides/auth/password-security | Tidak ada panjang minimal bawaan yang disebut, di bawah 8 tidak dianjurkan; perlindungan sandi bocor memakai HaveIBeenPwned dan tersedia di paket Pro ke atas | 22 Nov 2026 |
| S4 auth-komentar | Supabase: Rate limits | https://supabase.com/docs/guides/auth/rate-limits | Pendaftaran/masuk 30 per 5 menit per IP, token 150 per 5 menit per IP, email bawaan 2 per jam per project, sebagian dapat diubah di dashboard | 22 Nov 2026 |
| S4 auth-komentar | Supabase: CAPTCHA protection | https://supabase.com/docs/guides/auth/auth-captcha | hCaptcha dan Cloudflare Turnstile didukung; token dikirim klien sebagai captchaToken | 22 Nov 2026 |
| S4 auth-komentar | OWASP Authentication Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | Panjang sandi minimal 8 (dengan MFA) atau 15 (tanpa MFA), maksimal tidak di bawah 64, tanpa aturan komposisi; balasan sama untuk masuk, daftar, lupa sandi; batas percobaan, MFA. Bagian enumerasi dan MFA diringkas lewat agen pembaca halaman, cek ulang sebelum dikutip | 22 Nov 2026 |

