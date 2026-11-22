# Backend waitlist (Supabase)

Status: draf. Proyek Supabase belum dibuat dan SQL belum diterapkan.

## Syarat sebelum menyambungkan
1. Isi semua placeholder kuning di `kebijakan-privasi.html` (identitas pengendali data, alamat, kontak, prosesor, tanggal berlaku).
2. Master memutuskan identitas pengendali. Pilihannya badan usaha (misalnya Perseroan Perorangan) atau nama usaha dengan email resmi. Konfirmasikan ke advokat.
3. Buat proyek Supabase. Pilih wilayah, lalu catat dampaknya pada pernyataan transfer data di kebijakan privasi.

## Langkah penyambungan
1. Jalankan `supabase/waitlist.sql` di SQL Editor proyek itu.
2. Di `index.html`, sebelum skrip utama, tambahkan:
   ```html
   <script>
   window.NERUVIA_WAITLIST_ENDPOINT = 'https://<ref>.supabase.co/rest/v1/waitlist';
   window.NERUVIA_WAITLIST_HEADERS = {
     apikey: '<anon key>',
     Authorization: 'Bearer <anon key>',
     Prefer: 'return=minimal'
   };
   </script>
   ```
   Anon key memang publik. Keamanan data bertumpu pada RLS di SQL: anon hanya boleh insert, tidak boleh membaca.
3. Uji dari browser: kirim satu email uji, lalu cek barisnya di dashboard. Kirim email yang sama lagi dan pastikan form tetap menampilkan sukses (server membalas 409, form memperlakukannya sebagai sukses supaya orang luar tidak bisa menebak email mana yang sudah terdaftar).
4. Aktifkan pembatasan di sisi Supabase (rate limit proyek) dan pertimbangkan CAPTCHA (Cloudflare Turnstile) bila spam muncul. Honeypot dan penjaga waktu di sisi klien hanya menahan bot sederhana.

## Perilaku form
- Validasi per kolom, fokus pindah ke kolom bermasalah pertama.
- Tombol terkunci selama pengiriman dan permintaan dibatalkan setelah 12 detik.
- Status 201/2xx dan 409/422 dianggap sukses, lalu halaman pindah ke `terima-kasih.html`.
- Status lain atau gangguan jaringan menampilkan pesan gagal, isian tetap utuh.

## Hak pemilik data
Penghapusan dan penarikan persetujuan diproses manual lewat dashboard (service role):
`delete from public.waitlist where email_key = lower(btrim('alamat@email.com'));`
Catat permintaan dan waktunya sebelum menghapus.

## Status sambungan (21 Nov 2026)
- Proyek Supabase `neruvia-dev` (ap-southeast-1, gratis) sudah memuat tabel `waitlist` dengan RLS insert-only. Diuji lewat SQL dengan peran anon: insert valid berhasil; email ganda ditolak (23505); select, update, dan delete ditolak; email buruk dan jalur di luar 4 pilihan ditolak.
- Form di branch `dev` terhubung lewat `config.js` (kunci publishable saja).
- Proyek Vercel `neruvia` terhubung ke repo. Deployment dilindungi login Vercel dan bertanda noindex.
- Belum teruji: kirim form dari browser sampai baris masuk ke tabel. Sandbox Claude tidak boleh mengakses host Supabase, jadi uji ini harus dari browser Master pada URL preview.

## Aturan input (S2, 22 Nov 2026)
Klien (`index.html`) dan server (draf `supabase/draf/waitlist-s2-perketat.sql`) memakai aturan yang sama. Server tidak boleh lebih longgar daripada klien, jadi tiap perubahan aturan diubah di kedua tempat.
- Normalisasi di klien sebelum validasi dan kirim: Unicode NFKC, buang karakter kontrol, lebar nol, dan pengecoh arah teks (bidi), tab dan baris baru jadi spasi, spasi beruntun jadi satu, ujung dipangkas. Server tidak memperbaiki; nilai yang masih memuat karakter itu ditolak.
- Nama (boleh kosong, dikirim `null` bila kosong): maksimal 60 karakter (titik kode, bukan unit UTF-16), hanya huruf, tanda diakritik, angka, spasi, titik, apostrof, dan tanda hubung, dan diawali huruf atau angka. Awalan `=`, `+`, `-`, `@` ditolak sehingga ekspor ke spreadsheet tidak menjadi rumus. Baris lama atau data dari sumber lain tetap perlu dijaga: saat mengekspor ke spreadsheet, awali sel yang berawalan `=`, `+`, `-`, atau `@` dengan tanda petik.
- Email: ASCII saja, bagian lokal maksimal 64 karakter dan diawali huruf atau angka, tanpa titik ganda, domain berlabel huruf/angka/strip, TLD 2–24 huruf, total maksimal 254. Email internasional (IDN) belum didukung.
- Level: hanya satu dari empat pilihan; klien memeriksanya lagi sebelum kirim karena DOM bisa diubah dari luar.
- Teks persetujuan: server hanya menerima versi yang dikenal (saat ini `v4 2026-11-19 ...`). Bila teks di `index.html` diubah, tambahkan versi barunya di constraint `waitlist_consent_text_known` sebelum situs dirilis.
- Hak insert anon dibatasi ke kolom `name, email, jalur, consent, consent_text, client_ts`; `id` dan `created_at` tidak bisa diisi dari luar.

Uji yang dijalankan run S2 (Postgres 16 lokal, peran anon): 13 nama dan 10 email buruk ditolak dengan galat 23514, teks persetujuan asing ditolak, `id` dan `created_at` ditolak (42501), nama dan email sah diterima, termasuk "José Ñandú" dan alamat dengan tanda plus. Uji banding klien vs server atas 32 nama dan 27 email: tidak ada nilai yang ditolak klien tetapi diterima server, dan tidak ada nilai yang diterima klien tetapi ditolak server (selain email yang sudah ada di tabel uji).

## Status penerapan draf S2
`supabase/draf/waitlist-s2-perketat.sql` BELUM diterapkan ke `neruvia-dev`; Master yang menerapkannya (lihat PERLU-KEPUTUSAN butir 9). Bagian D (fungsi `join_waitlist`, perbaikan K1) hanya berguna bila klien dialihkan ke `/rest/v1/rpc/join_waitlist`; itu mengubah endpoint form dan tidak dikerjakan run otomatis.

