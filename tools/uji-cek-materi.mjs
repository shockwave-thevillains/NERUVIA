// Uji tools/cek-materi.mjs pada salinan sementara (repo asli tidak disentuh).
// Pakai: node tools/uji-cek-materi.mjs        (kode keluar 0 bila semua lulus, 1 bila ada yang gagal)
// Bagian: A pelajaran dasar sintetis (kontrol positif), B kasus negatif per kode (K01–K17), C masukan jahat dan keluaran aman,
// D opsi baris perintah dan kode keluar, E tidak menulis apa pun, F fungsi murni, G repo nyata.
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, mkdirSync, symlinkSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as gabung } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { aman, hitungKata, pecahKalimat, kumpulTeks, dalamKutipan, periksaPelajaran, urai, BATAS } from './cek-materi.mjs';

const asal = fileURLToPath(new URL('../', import.meta.url));
const skrip = gabung(asal, 'tools/cek-materi.mjs');
const tmp = mkdtempSync(gabung(tmpdir(), 'cekmateri-'));
cpSync(gabung(asal, 'content'), gabung(tmp, 'content'), { recursive: true });
mkdirSync(gabung(tmp, 'uji'));
let nomor = 0, lulus = 0, gagal = 0;
const uji = (nama, kondisi) => { nomor++; if (kondisi) lulus++; else { gagal++; console.error('GAGAL: ' + nama); } };
const bagianJudul = (s) => console.log(`\n== ${s}`);

/* ---------- pelajaran dasar sintetis: semua unsur wajib ada, tanpa pemicu ---------- */
const kal = (a, b) => `Langkah ${a} pada bagian ${b} membahas satu gagasan tunggal dengan kata nomor ${a * 7 + b}.`;
const paragraf = (b, k) => Array.from({ length: 5 }, (_, i) => kal(k * 10 + i + 1, b)).join(' ');
const dasar = () => ({
  id: 'l9-m9-p1', status: 'draf',
  tujuan: 'Setelah pelajaran ini, kamu bisa menjelaskan satu hal sederhana dengan kata sendiri.',
  bagian: ['Gagasan pertama', 'Gagasan kedua', 'Gagasan ketiga', 'Gagasan keempat', 'Kesalahan yang sering terjadi', 'Kapan tidak dipakai'].map((judul, b) => ({ judul, paragraf: [paragraf(b + 1, 1), paragraf(b + 1, 2)] })),
  contoh: { judul: 'Contoh berpasangan (cerita fiktif)', teks: 'Dina, tokoh fiktif, menulis dua versi catatan. Versi kurang baik terlalu panjang. Versi baik singkat dan jelas, dengan tiga butir.' },
  latihan: { petunjuk: 'Tahap 1 (coba): tulis catatan pendek. Tahap 2 (perbaiki): rapikan satu kalimat. Tahap 3 (bandingkan): bacalah kedua versi. Daftar periksa mandiri: (1) pendek; (2) jelas; (3) tanpa data pribadi.' },
  cek: [
    { tanya: 'Apa yang pertama kali dilakukan Dina sebelum menulis catatan?', opsi: ['Membaca tujuan catatan', 'Menyalin catatan temannya langsung', 'Menambah banyak kata sulit'], benar: 0, jelas: 'Tujuan catatan menentukan isi yang perlu ditulis. Menyalin langsung melewati tahap berpikir, dan kata sulit tidak membuat catatan lebih jelas bagi pembaca.' },
    { tanya: 'Mengapa versi baik lebih mudah dipakai orang lain?', opsi: ['Karena memakai banyak kata', 'Karena isinya singkat dan jelas', 'Karena ditulis dengan huruf besar'], benar: 1, jelas: 'Versi baik singkat dan jelas sehingga pembaca cepat menangkap maksudnya. Jumlah kata dan huruf besar tidak menambah kejelasan, malah bisa mengaburkan inti catatan.' },
    { tanya: 'Dina ingin mengirim catatan ke kelompoknya. Apa langkah paling tepat?', opsi: ['Mengirim tanpa membaca ulang', 'Menghapus semua butir penting', 'Membaca ulang lalu merapikan satu kalimat'], benar: 2, jelas: 'Membaca ulang dan merapikan menangkap kekeliruan sebelum catatan sampai ke orang lain. Mengirim tanpa membaca ulang atau menghapus butir penting membuat catatan kurang berguna.' },
  ],
  ringkasan: ['Tulis tujuan lebih dulu.', 'Pilih versi yang singkat dan jelas.', 'Baca ulang sebelum mengirim.'],
});
const tulis = (nama, obj) => { const f = gabung(tmp, 'uji', nama + '.json'); writeFileSync(f, typeof obj === 'string' ? obj : JSON.stringify(obj)); return f; };
const jalan = (args, opsi = {}) => spawnSync(process.execPath, [skrip, '--akar', tmp, ...args], { encoding: 'utf8', ...opsi });
let n = 0;
/** Menjalankan alat pada satu pelajaran hasil ubah(dasar) dan mengembalikan {kode, ada(kode, tingkat), semua}. */
const periksa = (ubah, args = []) => {
  const o = dasar(); const hasil = ubah(o); const berkas = tulis('k' + ++n, hasil === undefined ? o : hasil);
  const r = jalan(['--json', '--semua', ...args, berkas]);
  let j = null; try { j = JSON.parse(r.stdout); } catch { /* biarkan null */ }
  const t = j ? j.berkas.flatMap((b) => b.temuan) : [];
  return { r, j, t, ada: (kode, tk) => t.some((x) => x.kode === kode && (!tk || x.tingkat === tk)), jumlah: (kode, tk) => t.filter((x) => x.kode === kode && (!tk || x.tingkat === tk)).length, berkas };
};
const tambahParagraf = (o, teks, b = 0) => { o.bagian[b].paragraf.push(teks); };

/* ---------- A. kontrol positif ---------- */
bagianJudul('A. Pelajaran dasar sintetis');
{
  const o = dasar(); const k = kumpulTeks(o).teks.reduce((a, x) => a + hitungKata(x.teks), 0);
  uji(`dasar berjumlah kata 700–1100 (${k})`, k >= 700 && k <= 1100);
  const r = periksa(() => {});
  uji('dasar: keluaran JSON dapat diurai dan kode keluar 0', r.j !== null && r.r.status === 0);
  uji('dasar: tanpa satu pun temuan', r.t.length === 0);
  if (r.t.length) console.error('  temuan tak terduga:', JSON.stringify(r.t.slice(0, 4)));
}

/* ---------- B. kasus negatif per kode ---------- */
bagianJudul('B. Kasus negatif per kode');
const kalimatPanjang = (w) => Array.from({ length: w }, (_, i) => 'kata' + i).join(' ') + '.';
let r = periksa((o) => tambahParagraf(o, kalimatPanjang(33)));
uji('K01 kalimat 33 kata menjadi catatan C', r.ada('K01', 'C') && !r.ada('K01', 'P'));
r = periksa((o) => tambahParagraf(o, kalimatPanjang(60)));
uji('K01 kalimat 60 kata menjadi peringatan P', r.ada('K01', 'P'));
r = periksa((o) => tambahParagraf(o, 'Tahap pertama aku menulis tujuan dengan satu kalimat jelas; tahap kedua aku menambahkan bahan yang diperlukan untuk tugas; tahap ketiga aku memilih bentuk hasil yang paling mudah dipakai; tahap keempat aku membaca ulang semuanya dengan teliti; tahap kelima aku menyimpan versi terakhir.'));
uji('K01 daftar dipisah titik koma tidak dihitung sebagai satu kalimat panjang', !r.ada('K01'));
r = periksa((o) => tambahParagraf(o, kalimatPanjang(33)), ['--kalimat-maks', '40']);
uji('K01 --kalimat-maks 40 meloloskan kalimat 33 kata', !r.ada('K01'));
r = periksa((o) => tambahParagraf(o, 'Aku menonton video pendek tentang topik ini.'));
uji('K02 kata "menonton" dan "video" menjadi P', r.ada('K02', 'P'));
r = periksa((o) => tambahParagraf(o, 'Dengarkan rekaman suara atau podcast ini dulu.'));
uji('K02 "podcast" dan "rekaman suara" menjadi P', r.jumlah('K02', 'P') >= 1);
r = periksa((o) => tambahParagraf(o, 'Hasil AI dijamin akurat untuk semua pertanyaan.'));
uji('K03 "dijamin" di bagian menjadi P', r.ada('K03', 'P'));
r = periksa((o) => tambahParagraf(o, 'Jawaban chatbot pasti benar kalau kamu bertanya dengan sopan.'));
uji('K03 "pasti benar" di bagian menjadi P', r.ada('K03', 'P'));
r = periksa((o) => tambahParagraf(o, 'Jangan menganggap jawaban yang lancar pasti benar.'));
uji('K03 kalimat yang menyangkal tidak ditandai (kontrol negatif)', !r.ada('K03'));
r = periksa((o) => { o.cek[0].opsi[1] = 'Karena hasilnya pasti benar'; });
uji('K03 pengecoh di opsi soal hanya C', r.ada('K03', 'C') && !r.ada('K03', 'P'));
r = periksa((o) => tambahParagraf(o, 'Dina menulis “hasilnya pasti benar” di catatannya.'));
uji('K03 di dalam tanda kutip hanya C', r.ada('K03', 'C') && !r.ada('K03', 'P'));
r = periksa((o) => tambahParagraf(o, 'Kamu bisa memakai ChatGPT di versi gratis untuk latihan ini.'));
uji('K04 produk bersama klaim akses menjadi P', r.ada('K04', 'P'));
r = periksa((o) => tambahParagraf(o, 'Dokumen Gemini menyarankan contoh yang beragam.'));
uji('K04 rujukan biasa ke produk hanya C', r.ada('K04', 'C') && !r.ada('K04', 'P'));
r = periksa((o) => tambahParagraf(o, 'Kamu bisa belajar gratis di NERUVIA.'));
uji('K05 gratis di bagian menjadi P', r.ada('K05', 'P'));
r = periksa((o) => { o.contoh.teks += ' Toko itu menawarkan gratis ongkir.'; });
uji('K05 gratis ongkir di contoh fiktif hanya C', r.ada('K05', 'C') && !r.ada('K05', 'P'));
r = periksa((o) => { o.contoh.teks += ' NERUVIA gratis untuk semua orang.'; });
uji('K05 gratis bersama NERUVIA di contoh tetap P', r.ada('K05', 'P'));
r = periksa((o) => tambahParagraf(o, 'Paket NERUVIA berharga Rp50.000 per bulan.'));
uji('K06 uang bersama NERUVIA menjadi P', r.ada('K06', 'P'));
r = periksa((o) => { o.contoh.teks += ' Dina membayar Rp25.000 untuk bahan.'; });
uji('K06 uang dalam contoh fiktif hanya C', r.ada('K06', 'C') && !r.ada('K06', 'P'));
r = periksa((o) => tambahParagraf(o, 'Kamu akan mendapat sertifikat setelah selesai.'));
uji('K07 sertifikat menjadi P', r.ada('K07', 'P'));
r = periksa((o) => tambahParagraf(o, 'Peserta bersertifikat boleh lanjut.'));
uji('K07 "bersertifikat" menjadi P', r.ada('K07', 'P'));
r = periksa((o) => tambahParagraf(o, 'Aturan itu ada di Pasal 28 undang-undang.'));
uji('K08 nomor pasal menjadi P', r.ada('K08', 'P'));
r = periksa((o) => tambahParagraf(o, 'Itu diatur dalam UU No. 27 Tahun 2022.'));
uji('K08 nomor UU menjadi P', r.ada('K08', 'P'));
r = periksa((o) => tambahParagraf(o, 'Kamu wajib menuntut penerbit itu.'));
uji('K08 perintah langkah hukum menjadi P', r.ada('K08', 'P'));
r = periksa((o) => tambahParagraf(o, 'Orang bisa menggugat bila haknya dilanggar.'));
uji('K08 istilah hukum hanya C', r.ada('K08', 'C') && !r.ada('K08', 'P'));
r = periksa((o) => tambahParagraf(o, 'Tulis ke nama.belakang@contoh.test untuk bertanya.'));
uji('K09 alamat email menjadi P', r.ada('K09', 'P'));
r = periksa((o) => tambahParagraf(o, 'Hubungi 081234567890 setelah selesai.'));
uji('K09 nomor telepon menjadi P', r.ada('K09', 'P'));
r = periksa((o) => tambahParagraf(o, 'Baca di https://contoh.test/halaman untuk lanjut.'));
uji('K09 URL menjadi P', r.ada('K09', 'P'));
r = periksa((o) => tambahParagraf(o, 'Ikuti akun @pembuat_materi untuk kabar terbaru.'));
uji('K09 nama pengguna @ menjadi P', r.ada('K09', 'P'));
r = periksa((o) => tambahParagraf(o, 'Tulis <script>alert(1)</script> di sini.'));
uji('K10 tag HTML menjadi P', r.ada('K10', 'P'));
r = periksa((o) => tambahParagraf(o, 'Klik javascript:alert(1) untuk mencoba.'));
uji('K10 URL javascript: menjadi P', r.ada('K10', 'P'));
r = periksa((o) => tambahParagraf(o, 'Muat data:text/html;base64,AAAA di sini.'));
uji('K10 URL data: menjadi P', r.ada('K10', 'P'));
r = periksa((o) => tambahParagraf(o, 'Salin onerror="x()" ke atribut.'));
uji('K10 atribut on* menjadi P', r.ada('K10', 'P'));
r = periksa((o) => tambahParagraf(o, 'Teks ini memuat \u202E pembalik arah dan \u200B nol-lebar.'));
uji('K10 pengecoh arah dan nol-lebar menjadi P', r.ada('K10', 'P'));
r = periksa((o) => tambahParagraf(o, 'Teks memuat data: ringkasan data: tabel kecil.'));
uji('K10 kata biasa "data:" tidak ditandai (kontrol negatif)', !r.ada('K10'));
r = periksa((o) => tambahParagraf(o, 'TODO isi bagian ini nanti.'));
uji('K17 penanda TODO menjadi P', r.ada('K17', 'P'));
r = periksa((o) => { o.bagian[0].paragraf[0] = 'Materi sedang disusun.'; });
uji('K17 "Materi sedang disusun" menjadi P', r.ada('K17', 'P'));
r = periksa((o) => { o.bagian[1].paragraf.push('   '); });
uji('K17 string kosong menjadi P', r.ada('K17', 'P'));
r = periksa((o) => tambahParagraf(o, 'Orang yang gagal itu bodoh sekali.'));
uji('K11 kata merendahkan menjadi P', r.ada('K11', 'P'));
r = periksa((o) => tambahParagraf(o, 'Menghargai jerih payah orang lain itu penting.'));
uji('K11 idiom "jerih payah" tidak ditandai (kontrol negatif)', !r.ada('K11'));
r = periksa((o) => tambahParagraf(o, 'Anda bisa mencoba lagi nanti.'));
uji('K11 sapaan "Anda" menjadi C', r.ada('K11', 'C') && !r.ada('K11', 'P'));
r = periksa((o) => { o.bagian.length = 4; });
uji('K12 4 bagian menjadi P', r.t.some((x) => x.kode === 'K12' && /bagian/.test(x.pesan) && x.tingkat === 'P'));
r = periksa((o) => { o.bagian[4].judul = 'Hal lain'; });
uji('K12 tanpa bagian "Kesalahan yang sering terjadi" menjadi P', r.t.some((x) => x.kode === 'K12' && /Kesalahan/.test(x.pesan)));
r = periksa((o) => { o.bagian[5].judul = 'Penutup'; });
uji('K12 tanpa bagian "Kapan ..." menjadi P', r.t.some((x) => x.kode === 'K12' && /Kapan/.test(x.pesan)));
r = periksa((o) => { o.contoh = { judul: 'Contoh', teks: 'Dina menulis dua versi catatan.' }; });
uji('K12 contoh tanpa label fiktif menjadi P', r.t.some((x) => x.kode === 'K12' && /fiktif/.test(x.pesan)));
r = periksa((o) => { o.latihan.petunjuk = 'Tahap 1 (coba): tulis. Tahap 3 (bandingkan): baca. Daftar periksa mandiri: (1) a.'; });
uji('K12 latihan tanpa Tahap 2 menjadi P', r.t.some((x) => x.kode === 'K12' && /Tahap 2/.test(x.pesan)));
r = periksa((o) => { o.latihan.petunjuk = 'Tahap 1 (coba): tulis. Tahap 2 (perbaiki): baca. Tahap 3 (bandingkan): lihat.'; });
uji('K12 latihan tanpa daftar periksa menjadi P', r.t.some((x) => x.kode === 'K12' && /daftar periksa/.test(x.pesan)));
r = periksa((o) => { o.ringkasan.pop(); });
uji('K12 ringkasan 2 butir menjadi P', r.t.some((x) => x.kode === 'K12' && /ringkasan/.test(x.pesan)));
r = periksa((o) => { o.cek.pop(); });
uji('K12 soal cek 2 menjadi P', r.t.some((x) => x.kode === 'K12' && /soal/.test(x.pesan)));
r = periksa((o) => { o.status = 'rahasia'; });
uji('K12 status tidak dikenal menjadi P', r.t.some((x) => x.kode === 'K12' && /status/.test(x.pesan)));
r = periksa((o) => { o.tujuan = 'Belajar tentang catatan.'; });
uji('K12 tujuan tanpa awalan baku hanya C', r.t.some((x) => x.kode === 'K12' && x.tingkat === 'C' && /tujuan/.test(x.pesan)));
r = periksa((o) => { o.bagian = o.bagian.slice(0, 5); o.bagian.forEach((b) => { b.paragraf = b.paragraf.slice(0, 1); }); });
uji('K12 kurang dari 700 kata menjadi P', r.t.some((x) => x.kode === 'K12' && /minimal/.test(x.pesan)));
r = periksa((o) => { for (let i = 0; i < 3; i++) tambahParagraf(o, paragraf(i + 20, 9), i); });
uji('K12 lebih dari 1150 kata menjadi P', r.t.some((x) => x.kode === 'K12' && x.tingkat === 'P' && /maksimal/.test(x.pesan)));
r = periksa((o) => { o.interaktif = { judul: 'x', petunjuk: 'y', pasangan: Array.from({ length: 6 }, (_, i) => ({ skenario: paragraf(i + 40, 1), a: paragraf(i + 50, 1), b: paragraf(i + 60, 1) })) }; });
uji('K12 teks interaktif tidak dihitung ke batas kata', !r.t.some((x) => x.kode === 'K12' && /kata/.test(x.pesan)) && r.j.berkas[0].kataInteraktif > 500);
r = periksa((o) => { o.cek[0].opsi[2] = o.cek[0].opsi[1]; });
uji('K13 dua opsi sama menjadi P', r.ada('K13', 'P'));
r = periksa((o) => { o.cek.forEach((q) => { q.opsi[q.benar] += ' dengan tambahan penjelasan yang membuat opsi ini jauh lebih panjang dari yang lain'; }); });
uji('K13 opsi benar paling panjang di 3 soal menjadi C', r.t.some((x) => x.kode === 'K13' && /paling panjang/.test(x.pesan)));
r = periksa((o) => { const b = o.cek[0].opsi[0]; o.cek.forEach((q) => { q.opsi = ['A ' + q.opsi[q.benar], 'B xx', 'C xx']; q.benar = 0; }); });
uji('K13 ketiga soal berjawaban sama menjadi C', r.t.some((x) => x.kode === 'K13' && /nomor opsi yang sama/.test(x.pesan)));
r = periksa((o) => { o.cek[1].jelas = 'Karena benar.'; });
uji('K13 penjelasan terlalu pendek menjadi C', r.t.some((x) => x.kode === 'K13' && /penjelasan/.test(x.pesan)));
r = periksa((o) => { o.cek[0].opsi = 'bukan daftar'; });
uji('K13 opsi bukan daftar tidak membuat alat jatuh', r.r.status === 0 && r.ada('K13', 'P'));
r = periksa((o) => tambahParagraf(o, 'Dina menulis “' + Array.from({ length: 30 }, (_, i) => 'kata' + i).join(' ') + '” di papan.'));
uji('K14 kutipan 30 kata menjadi C', r.ada('K14', 'C'));
r = periksa((o) => tambahParagraf(o, Array.from({ length: 5 }, (_, i) => kalimatPanjang(28).replace(/kata/g, 'isi' + i)).join(' ')));
uji('K16 paragraf lebih dari 120 kata menjadi C', r.ada('K16', 'C'));
r = periksa((o) => tambahParagraf(o, 'a'.repeat(25000)));
uji('K16 string 25.000 huruf menjadi P dan alat tetap selesai', r.ada('K16', 'P') && r.r.status === 0);
r = periksa((o) => { let x = 'dalam'; for (let i = 0; i < 40; i++) x = { a: x }; o.dalam = x; });
uji('K16 struktur bersarang 40 tingkat menjadi P dan alat tetap selesai', r.ada('K16', 'P') && r.r.status === 0);

/* K15: salinan dari pelajaran lain di repo (pembanding otomatis saat berkas dipilih eksplisit) */
{
  const lain = dasar(); lain.id = 'l9-m9-p2'; writeFileSync(gabung(tmp, 'content/pelajaran/l9-m9-p2.json'), JSON.stringify(lain));
  const salinan = dasar(); salinan.id = 'l9-m9-p3';
  const f = tulis('salinan', salinan);
  const x = JSON.parse(jalan(['--json', '--semua', f]).stdout);
  uji('K15 paragraf yang sama dengan pelajaran lain terdeteksi', x.berkas[0].temuan.some((t) => t.kode === 'K15' && t.tingkat === 'C' && /l9-m9-p2/.test(t.pesan)));
  let cacah = 0; // menyisipkan kata unik tiap 6 kata di seluruh teks: tidak ada urutan 10 kata yang sama dengan pelajaran lain
  const ubah = (x) => (typeof x === 'string' ? x.split(' ').map((w, k) => (k % 6 === 5 ? `${w} unik${++cacah}` : w)).join(' ') : Array.isArray(x) ? x.map(ubah) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, ['id', 'status', 'benar'].includes(k) ? v : ubah(v)])) : x);
  const baru = ubah(dasar()); baru.id = 'l9-m9-p4';
  const y = JSON.parse(jalan(['--json', '--semua', tulis('beda', baru)]).stdout);
  uji('K15 teks yang berbeda tidak ditandai (kontrol negatif)', !y.berkas[0].temuan.some((t) => t.kode === 'K15'));
}

/* ---------- C. masukan jahat dan keluaran aman ---------- */
bagianJudul('C. Masukan jahat dan keluaran aman');
{
  const jahat = dasar(); tambahParagraf(jahat, '\u001b[31mMERAH\u001b[0m \u202Eterbalik ' + kalimatPanjang(60) + ' \u0007bunyi');
  const f = tulis('jahat', jahat);
  const teks = jalan(['--semua', f]); const jsn = jalan(['--json', '--semua', f]);
  uji('keluaran teks tanpa kode escape terminal', !/\u001b/.test(teks.stdout + teks.stderr));
  uji('keluaran teks tanpa pengecoh arah dan bel', !/[\u202A-\u202E\u2066-\u2069\u0007]/.test(teks.stdout));
  const kut = JSON.parse(jsn.stdout).berkas[0].temuan.map((t) => t.kutipan + t.pesan + t.jalur).join('');
  uji('keluaran JSON tanpa kode escape dan pengecoh arah', !/[\u001b\u202A-\u202E\u0007]/.test(kut));
  uji('teks dengan kode kontrol tetap dilaporkan sebagai K10', JSON.parse(jsn.stdout).berkas[0].temuan.some((t) => t.kode === 'K10'));
}
{
  const f = tulis('proto', '{"id":"l9-m9-p1","__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}},"status":"draf","bagian":[],"cek":[]}');
  const r2 = jalan(['--json', f]);
  uji('kunci __proto__ dan constructor tidak menjatuhkan alat dan tidak mencemari', r2.status === 0 && ({}).polluted === undefined && JSON.parse(r2.stdout).berkas.length === 1);
}
for (const [nama, isi] of [['array', '[1,2,3]'], ['angka', '42'], ['null', 'null'], ['kosongobj', '{}'], ['string', '"teks"']]) {
  const r2 = jalan(['--json', tulis('bentuk-' + nama, isi)]);
  uji(`bentuk JSON ${nama} ditangani tanpa jatuh`, (r2.status === 0 || r2.status === 2) && !/at .*\.mjs|TypeError|ReferenceError/.test(r2.stderr));
}
{
  const r2 = jalan([tulis('rusak', '{"id": "x", ')]);
  uji('JSON rusak: GALAT BACA dan kode keluar 2', r2.status === 2 && /GALAT BACA/.test(r2.stdout));
  const r3 = jalan([tulis('rusak2', '{"id": "x", '), tulis('baik', dasar())]);
  uji('JSON rusak tidak menghentikan berkas lain', r3.status === 2 && /1 berkas diperiksa/.test(r3.stdout));
  const besar = tulis('besar', '{"id":"besar","x":"' + 'a'.repeat(1_100_000) + '"}');
  const r4 = jalan([besar]);
  uji('berkas lebih dari 1 MB ditolak tanpa dibaca', r4.status === 2 && /melebihi batas/.test(r4.stdout));
  const tautan = gabung(tmp, 'uji', 'tautan.json'); try { symlinkSync(gabung(tmp, 'uji', 'baik.json'), tautan); } catch { /* sistem tanpa symlink */ }
  const r5 = jalan([tautan]);
  uji('tautan simbolik ditolak', r5.status === 2 && /bukan berkas biasa/.test(r5.stdout));
  mkdirSync(gabung(tmp, 'uji', 'folder.json'));
  const r6 = jalan([gabung(tmp, 'uji', 'folder.json')]);
  uji('folder bernama .json ditolak', r6.status === 2 && /bukan berkas biasa/.test(r6.stdout));
  writeFileSync(gabung(tmp, 'uji', 'catatan.txt'), 'ISI-RAHASIA-12345 bukan json');
  const r8 = jalan([gabung(tmp, 'uji', 'catatan.txt')]);
  uji('berkas bukan .json ditolak dan isinya tidak dicetak', r8.status === 2 && /bukan berkas \.json/.test(r8.stdout) && !/RAHASIA/.test(r8.stdout + r8.stderr));
  writeFileSync(gabung(tmp, 'uji', 'rusak-rahasia.json'), 'ISI-RAHASIA-67890 {{{');
  const r9 = jalan([gabung(tmp, 'uji', 'rusak-rahasia.json')]);
  uji('JSON rusak: pesan galat tidak membocorkan cuplikan isi berkas', r9.status === 2 && /JSON tidak valid/.test(r9.stdout) && !/RAHASIA/.test(r9.stdout + r9.stderr));
  const r7 = jalan([gabung(tmp, 'uji', 'tidak-ada.json')]);
  uji('berkas tidak ada dilaporkan, bukan jatuh', r7.status === 2 && /GALAT BACA/.test(r7.stdout) && !/TypeError|at .*\.mjs/.test(r7.stderr));
}

{
  const a = dasar(), b = dasar(); tambahParagraf(b, 'Ini ada video.');
  const x = JSON.parse(jalan(['--json', '--semua', tulis('ganda-a', a), tulis('ganda-b', b)]).stdout);
  uji('dua berkas dengan id sama diperiksa terpisah (tanpa saling menimpa)', x.berkas.length === 2 && x.berkas[0].id !== x.berkas[1].id && !x.berkas[0].temuan.some((t) => t.kode !== 'K15') && x.berkas[1].temuan.some((t) => t.kode === 'K02'));
  const c = dasar(); for (let i = 0; i < 5; i++) tambahParagraf(c, 'Baris ' + i + ' memuat \u0001 kontrol.');
  const y = JSON.parse(jalan(['--json', '--semua', tulis('kontrol-lima', c)]).stdout);
  uji('lima string berturut-turut berkarakter kontrol semuanya ditandai K10 (regresi bendera g)', y.berkas[0].temuan.filter((t) => t.kode === 'K10').length === 5);
}

/* ---------- D. opsi baris perintah dan kode keluar ---------- */
bagianJudul('D. Opsi baris perintah dan kode keluar');
{
  const withP = tulis('denganP', (() => { const o = dasar(); tambahParagraf(o, 'Ini ada video.'); return o; })());
  const onlyC = tulis('hanyaC', (() => { const o = dasar(); tambahParagraf(o, kalimatPanjang(33)); return o; })());
  const sedikitLebih = tulis('sedikitLebih', (() => { const o = dasar(); tambahParagraf(o, paragraf(31, 1)); tambahParagraf(o, paragraf(32, 1)); return o; })());
  const dl = JSON.parse(jalan(['--json', sedikitLebih]).stdout).berkas[0];
  uji(`dasar + 2 paragraf (${dl.kata} kata) hanya C jumlah kata, bukan P`, dl.temuan.some((t) => t.kode === 'K12' && t.tingkat === 'C' && /toleransi/.test(t.pesan)) && !dl.temuan.some((t) => t.kode === 'K12' && t.tingkat === 'P'));
  uji('tanpa --ketat: kode keluar 0 walau ada P', jalan([withP]).status === 0);
  uji('--ketat dan ada P: kode keluar 1', jalan(['--ketat', withP]).status === 1);
  uji('--ketat dan hanya C: kode keluar 0', jalan(['--ketat', onlyC]).status === 0);
  uji('--ketat tanpa temuan: kode keluar 0', jalan(['--ketat', tulis('bersih', dasar())]).status === 0);
  const panjang = tulis('banyak', (() => { const o = dasar(); for (let i = 0; i < 12; i++) tambahParagraf(o, kalimatPanjang(33 + i)); return o; })());
  const t1 = jalan([panjang]).stdout, t2 = jalan(['--semua', panjang]).stdout;
  uji('bawaan menyembunyikan temuan di atas 5 per kode', /disembunyikan/.test(t1) && (t1.match(/\[C\] K01/g) || []).length === 5);
  uji('--semua menampilkan semua temuan', !/disembunyikan/.test(t2) && (t2.match(/\[C\] K01/g) || []).length + (t2.match(/\[P\] K01/g) || []).length >= 12);
  const j = JSON.parse(jalan(['--json', withP, onlyC]).stdout);
  uji('--json: jumlah ringkasan sama dengan jumlah temuan', j.ringkasan.peringatan === j.berkas.flatMap((b) => b.temuan).filter((x) => x.tingkat === 'P').length && j.ringkasan.catatan === j.berkas.flatMap((b) => b.temuan).filter((x) => x.tingkat === 'C').length);
  uji('--kata-maks 2000 menghilangkan catatan jumlah kata', !JSON.parse(jalan(['--kata-maks', '2000', '--kata-min', '10', '--json', sedikitLebih]).stdout).berkas[0].temuan.some((t) => t.kode === 'K12'));
  uji('--kata-min 5000 membuat dasar kurang kata (P)', JSON.parse(jalan(['--kata-min', '5000', '--kata-maks', '5000', '--json', tulis('min', dasar())]).stdout).berkas[0].temuan.some((t) => t.kode === 'K12' && /minimal/.test(t.pesan)));
  const err = (...a) => { const x = jalan(a); return x.status === 2 && x.stderr.length > 0 && !/TypeError|at .*\.mjs/.test(x.stderr); };
  uji('opsi tidak dikenal: kode keluar 2', err('--hapus'));
  uji('--kalimat-maks bukan angka: kode keluar 2', err('--kalimat-maks', 'abc'));
  uji('--kalimat-maks di luar batas: kode keluar 2', err('--kalimat-maks', '1'));
  uji('--kalimat-maks tanpa nilai: kode keluar 2', err('--kalimat-maks'));
  uji('--kalimat-maks bernilai negatif: kode keluar 2', err('--kalimat-maks', '-5'));
  uji('--akar tanpa nilai: kode keluar 2', spawnSync(process.execPath, [skrip, '--akar'], { encoding: 'utf8' }).status === 2);
  uji('--akar ke folder yang tidak ada: kode keluar 2', spawnSync(process.execPath, [skrip, '--akar', gabung(tmp, 'tidak-ada')], { encoding: 'utf8' }).status === 2);
  uji('--akar ke folder tanpa content/pelajaran: kode keluar 2', spawnSync(process.execPath, [skrip, '--akar', gabung(tmp, 'uji')], { encoding: 'utf8' }).status === 2);
  uji('--kata-min lebih besar dari --kata-maks: kode keluar 2', err('--kata-min', '900', '--kata-maks', '800'));
  uji('--bantuan mencetak pemakaian dan kode keluar 0', (() => { const x = jalan(['--bantuan']); return x.status === 0 && /Pakai:/.test(x.stdout); })());
  const dua = [jalan([]).stdout, jalan([]).stdout];
  uji('dua kali jalan pada data sama menghasilkan keluaran identik', dua[0] === dua[1] && dua[0].length > 100);
}

/* ---------- E. tidak menulis apa pun ---------- */
bagianJudul('E. Tidak menulis apa pun');
{
  const foto = (akar) => { const h = createHash('sha256'); const jalanKaki = (d) => { for (const nama of readdirSync(d).sort()) { const p = gabung(d, nama); const st = lstatSync(p); if (st.isDirectory()) jalanKaki(p); else if (st.isFile()) h.update(p + '\0' + readFileSync(p)); } }; jalanKaki(akar); return h.digest('hex'); };
  const sebelum = foto(tmp); const sebelumRepo = spawnSync('git', ['status', '--porcelain'], { cwd: asal, encoding: 'utf8' }).stdout;
  jalan([]); jalan(['--json', '--semua']); jalan(['--ketat', gabung(tmp, 'uji', 'denganP.json')]);
  uji('isi salinan sementara identik setelah beberapa kali jalan', foto(tmp) === sebelum);
  uji('status git repo asli tidak berubah oleh pemanggilan alat', spawnSync('git', ['status', '--porcelain'], { cwd: asal, encoding: 'utf8' }).stdout === sebelumRepo);
  const kode = readFileSync(skrip, 'utf8');
  uji('kode alat tidak memanggil fungsi tulis, hapus, ganti nama, atau buat folder', !/\b(writeFile|writeFileSync|appendFile|appendFileSync|unlink|unlinkSync|rmSync|rename|renameSync|mkdir|mkdirSync|createWriteStream|copyFile|copyFileSync)\b/.test(kode));
  uji('kode alat tidak memakai jaringan atau proses anak', !/child_process|node:http|node:https|node:net|fetch\(|\beval\(|new Function/.test(kode));
}

/* ---------- F. fungsi murni ---------- */
bagianJudul('F. Fungsi murni');
{
  uji('pecahKalimat: dua kalimat sederhana', pecahKalimat('Aku pergi. Kamu datang.').length === 2);
  uji('pecahKalimat: "dkk." tidak memecah', pecahKalimat('Doughty dkk. (2024) menilai soal itu. Hasilnya baik.').length === 2);
  uji('pecahKalimat: "dst." sebelum huruf kecil tidak memecah', pecahKalimat('Ada satu, dua, dst. dan seterusnya. Selesai.').length === 2);
  uji('pecahKalimat: angka desimal tidak memecah', pecahKalimat('Nilainya 3.5 persen naik. Lalu turun.').length === 2);
  uji('pecahKalimat: inisial nama tidak memecah', pecahKalimat('Surat dari A. Rahman tiba. Isinya singkat.').length === 2);
  uji('pecahKalimat: baris baru memisahkan', pecahKalimat('Satu\nDua\nTiga').length === 3);
  uji('pecahKalimat: tanda tanya dan seru', pecahKalimat('Apa kabar? Baik! Terima kasih.').length === 3);
  uji('pecahKalimat: teks kosong', pecahKalimat('').length === 0 && pecahKalimat('   ').length === 0);
  uji('pecahKalimat: titik koma memisah hanya bila diminta', pecahKalimat('a b; c d. E f').length === 2 && pecahKalimat('a b; c d. E f', true).length === 3);
  uji('hitungKata: spasi ganda dan baris baru', hitungKata('  satu   dua\ntiga ') === 3 && hitungKata('') === 0 && hitungKata('   ') === 0);
  uji('aman: kode escape, bel, dan pengecoh arah diganti', !/[\u001b\u0007\u202E\u200B]/.test(aman('a\u001b[0mb\u0007c\u202Ed\u200Be')));
  uji('aman: memotong teks panjang dengan elipsis', aman('x'.repeat(500), 50).length === 50 && aman('x'.repeat(500), 50).endsWith('…'));
  uji('aman: mengubah angka dan objek menjadi teks tanpa jatuh', aman(42) === '42' && aman({}) === '[object Object]');
  uji('dalamKutipan: kutip lengkung dan lurus', dalamKutipan('dia “pasti benar” kata', 6) === true && dalamKutipan('dia “ya” lalu pasti', 15) === false && dalamKutipan('dia "pasti" kata', 6) === true);
  uji('kumpulTeks: melewati id, status, benar', !kumpulTeks({ id: 'a', status: 'draf', benar: 2, x: 'b' }).teks.some((t) => ['a', 'draf'].includes(t.teks)));
  uji('kumpulTeks: menandai jalur interaktif', kumpulTeks({ interaktif: { petunjuk: 'x' } }).teks[0].interaktif === true);
  uji('kumpulTeks: batas kedalaman menandai terpotong', kumpulTeks(JSON.parse('{"a":'.repeat(30) + '"x"' + '}'.repeat(30))).terpotong === true);
  uji('urai: bendera dikenali dan nilai angka diperiksa', urai(['--json', '--ketat', '--kata-min', '100', 'a.json']).angka.kataMin === 100);
  let jatuh = false; try { urai(['--kata-min', '99999']); } catch { jatuh = true; }
  uji('urai: nilai di luar batas ditolak', jatuh);
  uji('periksaPelajaran: objek bukan pelajaran memberi P, bukan jatuh', periksaPelajaran(null).temuan.some((t) => t.tingkat === 'P'));
  uji('BATAS tidak dapat diubah', (() => { try { BATAS.kataMin = 1; } catch { /* mode ketat */ } return BATAS.kataMin === 700; })());
}

/* ---------- G. repo nyata ---------- */
bagianJudul('G. Repo nyata (salinan)');
{
  rmSync(gabung(tmp, 'content/pelajaran/l9-m9-p2.json'), { force: true });
  const nyata = JSON.parse(jalan(['--json']).stdout);
  const jumlahBerkas = readdirSync(gabung(asal, 'content/pelajaran')).filter((f) => f.endsWith('.json')).length;
  uji(`semua ${jumlahBerkas} pelajaran asli diperiksa tanpa galat baca`, nyata.berkas.length === jumlahBerkas && nyata.galatBaca.length === 0);
  uji('tiap pelajaran asli memuat tiga tahap, daftar periksa, label fiktif, dan bagian wajib (tanpa K12 tingkat P)', !nyata.berkas.some((b) => b.temuan.some((t) => t.kode === 'K12' && t.tingkat === 'P')));
  uji('pelajaran asli tanpa K02, K07, K08 (nomor pasal), K09, K10 tingkat P', !nyata.berkas.some((b) => b.temuan.some((t) => ['K02', 'K07', 'K08', 'K09', 'K10'].includes(t.kode) && t.tingkat === 'P')));
  uji('pelajaran asli tanpa K03 dan K05 tingkat P (klaim belum dikonfirmasi)', !nyata.berkas.some((b) => b.temuan.some((t) => ['K03', 'K05', 'K04', 'K06'].includes(t.kode) && t.tingkat === 'P')));
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${lulus} lulus, ${gagal} gagal (dari ${nomor})`);
process.exit(gagal ? 1 : 0);
