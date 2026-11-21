# Perlu keputusan Master

Run otomatis menambahkan butir baru di bagian bawah. Master menghapus butir yang sudah diputuskan.

1. **Tiga klaim landing belum dikonfirmasi:** Level 1 gratis, dukungan ChatGPT/Gemini/Claude, praktik Modul 1 dengan versi gratis. Perubahan `dev` tidak boleh di-merge ke `main` sebelum ketiganya jelas.
2. **Placeholder `kebijakan-privasi.html`:** identitas pengendali, alamat, email kontak, prosesor, tanggal berlaku. Form tidak boleh tersambung ke database sebelum terisi. Pilihan identitas: badan usaha (mis. Perseroan Perorangan) atau nama usaha dengan email resmi; konfirmasi ke advokat.
3. **Project Supabase:** `neruvia-dev` sudah dibuat (ap-southeast-1, gratis). Proyek gratis dijeda bila lama tidak aktif. Master memutuskan kapan pindah ke proyek produksi.
4. **Akun login dan komentar:** dirancang aman dulu sebagai draf di Paket S (kegiatan 4), tanpa Supabase Auth nyata. Master memutuskan kapan diaktifkan.
5. **Modul 2 dan 3 Level 1, serta Level 2 Modul 1:** Claude mengerjakannya sebagai DRAF karena Master melimpahkan pekerjaan (21 Nov). Judulnya ada di `docs/loop/MATERI.md`. Master boleh mengubah atau menolaknya kapan saja.
6. **`config.js` di branch dev:** berisi endpoint dan kunci publishable proyek `neruvia-dev`, supaya form dev terhubung. Sebelum merge ke `main`, Master memutuskan apakah berkas ini dipakai apa adanya, diganti kunci produksi, atau dikosongkan. Jangan merge sebelum placeholder kebijakan privasi terisi.

7. **Klaim landing yang belum tercakup butir 1 (dari audit A1, 22 Nov):** FAQ menyatakan "Dapat sertifikat" setelah penilaian akhir, tahap "CERTIFY" di bagian Cara belajar, dan rencana metode pembayaran QRIS dan e-wallet. Sertifikat dan harga belum dikonfirmasi. Daftar lengkap lokasi ada di `docs/loop/AUDIT.md` temuan F1. Run otomatis tidak mengubah teks ini; Master memutuskan dipertahankan, diubah, atau dihapus sebelum merge ke `main`.
