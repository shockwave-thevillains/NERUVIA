# Header keamanan dan CSP (S3)

Berlaku untuk hosting Vercel lewat `vercel.json`. GitHub Pages (`main`) tidak bisa menyetel header respons, jadi berkas ini tidak berpengaruh di sana; meta CSP untuk Pages dikerjakan di kegiatan D1 (kecuali `404.html`, yang sudah punya meta CSP sejak H2).

## Isi
Satu aturan `/(.*)` memberi header umum ke semua jalur, lalu satu aturan per halaman HTML memberi CSP khusus halaman itu.

| Header | Nilai | Alasan |
|---|---|---|
| Content-Security-Policy | per halaman, lihat bawah | Batasi sumber skrip, gaya, gambar, font, dan koneksi |
| X-Content-Type-Options | nosniff | Cegah browser menebak jenis berkas |
| Referrer-Policy | strict-origin-when-cross-origin | Jalur lengkap tidak bocor ke host lain (Supabase) |
| Permissions-Policy | kamera, mikrofon, lokasi, pembayaran, USB, dan sensor dimatikan | Situs tidak memakai fitur itu |
| Strict-Transport-Security | max-age=31536000 | Paksa HTTPS satu tahun. Tanpa `includeSubDomains` dan `preload` sampai domain sendiri dipilih |
| X-Frame-Options | DENY | Cadangan `frame-ancestors` untuk browser lama |
| Cross-Origin-Opener-Policy | same-origin | Pisahkan konteks jendela dari situs lain |
| X-Permitted-Cross-Domain-Policies | none | Tolak kebijakan lintas domain Flash/PDF |

## CSP per halaman
`default-src 'none'`, lalu hanya yang dibutuhkan: `script-src 'self'` + hash, `style-src 'self'` + hash, `style-src-attr 'unsafe-hashes'` + hash (atau `'none'`), `img-src 'self'`, `font-src 'self'`, `connect-src 'self'` (+ satu host Supabase hanya di halaman yang memuat `config.js`), `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`. Tidak ada `unsafe-inline`, `unsafe-eval`, atau wildcard.

Situs statis tidak punya server untuk membuat nonce, jadi blok `<script>`, `<style>`, dan atribut `style=""` yang inline diizinkan lewat hash SHA-256 isinya. Skrip, gaya, dan gambar dari luar origin sendiri tidak diizinkan; halaman yang memuatnya akan ditolak oleh generator.

Host Supabase dibaca dari `NERUVIA_WAITLIST_ENDPOINT` di `config.js`. Bila project berganti (produksi), ubah `config.js` lalu jalankan ulang generator.

## Aturan kerja: ubah blok inline, jalankan ulang generator
Setiap perubahan pada isi `<script>`, `<style>`, atau atribut `style=""` mengubah hash. Bila `vercel.json` tidak diperbarui, browser memblokir blok itu di Vercel (halaman tampak rusak) walau lokal normal.

```
node tools/buat-vercel-json.mjs          # tulis ulang vercel.json
node tools/buat-vercel-json.mjs --cek    # gagal bila vercel.json tidak sesuai
node tools/uji-header-csp.mjs            # uji penuh dengan Playwright (butuh Playwright terpasang)
```

Generator menolak: skrip, gaya, atau gambar dari sumber luar; atribut event inline (`onclick=` dan sejenisnya); atribut `style` tanpa tanda kutip. Satu pengecualian (H1, 28 Nov): `<link>` yang nilai `rel`-nya persis `canonical` boleh beralamat mutlak, karena browser tidak memuat apa pun darinya; CSP tidak berubah dan `tools/uji-seo.mjs` memastikan tautan luar lain tetap ditolak. Halaman HTML baru di root atau `belajar/` ikut dipindai otomatis (folder `assets`, `content`, `docs`, `supabase`, `tools` dilewati).

## Hasil uji (Min 22 Nov 2026)
`node tools/uji-header-csp.mjs`: 116 pemeriksaan lulus, 0 gagal.
- Lima halaman di 1440 dan 390 px, `prefers-reduced-motion`: nol pelanggaran CSP, nol galat skrip, tangkapan layar penuh identik piksel dengan versi tanpa header.
- Form waitlist dengan Supabase tiruan: permintaan terkirim (host Supabase diizinkan) dan berpindah ke `terima-kasih.html`.
- Galeri memuat kartu level, ekspor progres mengunduh berkas, pelajaran 1 tampil.
- Kontrol negatif: skrip inline baru, `fetch` ke host luar, bingkai luar, gambar luar, dan atribut `style` tanpa hash semuanya diblokir.
- Sabotase: mengubah satu hash membuat uji gagal.

## Batas dan risiko sisa
- Uji memakai server lokal yang meniru aturan header Vercel. Header asli di URL Vercel belum diperiksa (run otomatis tidak boleh memakai konektor Vercel); setelah dev dideploy, periksa dengan `curl -I https://<alamat-preview>/` bahwa header muncul.
- `style-src-attr 'unsafe-hashes'` didukung Chrome/Edge 69+, Firefox 105+, Safari 15.4+. Di browser yang lebih lama atribut `style=""` diabaikan (animasi masuk kehilangan jeda, tata letak utama tetap).
- Toolbar komentar Vercel pada URL preview dimuat dari `vercel.live`, sehingga diperkirakan diblokir CSP ini (belum diuji, butuh deploy nyata). Itu hanya memengaruhi preview; jangan melonggarkan CSP produksi demi toolbar.
- Alat `tools/video/*.html` memakai `innerHTML`, tidak ditautkan dari situs, dan tidak punya aturan CSP; sebaiknya tidak ikut diterbitkan (catatan di S2/AUDIT-KEAMANAN).
- Halaman 404 (H2): `404.html` disajikan di jalur yang tidak ada, sehingga aturan CSP per jalur tidak mengenainya (header umum `/(.*)` tetap menurut aturan). Karena itu CSP-nya ditaruh sebagai `<meta http-equiv="Content-Security-Policy">` di berkas itu, sama dengan aturan per halaman tanpa `frame-ancestors` (diabaikan browser bila lewat meta; bingkai dicegah `X-Frame-Options`). `tools/buat-vercel-json.mjs` menulis meta itu dan `--cek` gagal bila basi. Aturan `/(.*)` berisi CSP sengaja tidak ditambahkan karena akan bertumpuk dengan CSP per halaman. Diuji `tools/uji-404.mjs`; belum diperiksa di URL Vercel.
