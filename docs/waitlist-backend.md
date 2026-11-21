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
