# NERUVIA — Landing Page (v0.1)

Landing page statis (satu file `index.html`) untuk NERUVIA, platform belajar AI & cybersecurity berbahasa Indonesia. Mengikuti Arah Visual v0.2: hitam-putih modern, satu aksen cyan `#38E1FF`, Neru sebagai satu-satunya maskot.

## Efek scroll
- Progres scroll cyan di atas halaman; navigasi berganti warna di zona terang/gelap
- Hero: Neru naik dan sedikit membesar, headline turun pelan (paralaks)
- Section bertumpuk berujung membulat (terang ↔ gelap)
- `/JALUR` raksasa bergeser horizontal mengikuti scroll
- LEARN → PRACTICE → CERTIFY menyala berurutan (sticky) dengan meter progres
- Carousel jalur (scroll-snap) dengan bilah progres dan kartu tengah membesar
- `prefers-reduced-motion` menonaktifkan seluruh gerak

## Jalankan
Buka `index.html` di browser, atau aktifkan GitHub Pages (Settings → Pages → branch `main`, folder `/root`).

## Waitlist
Form belum terhubung backend (mode pratinjau, data tidak dikirim). Untuk menghubungkan, set sebelum `</body>`:
```html
<script>window.NERUVIA_WAITLIST_ENDPOINT = 'https://.../waitlist'</script>
```
Menerima POST JSON `{email, topic, consent, consent_text, ts}`.

## Catatan konten
Semua teks jalur dan harga adalah placeholder. Tidak ada statistik, testimoni, atau logo pihak lain. Aset Neru (`assets/`) dipotong dari model sheet resolusi rendah; ganti dengan PNG/WebP transparan beresolusi tinggi bila tersedia.
