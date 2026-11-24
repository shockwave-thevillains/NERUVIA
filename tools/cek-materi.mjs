// Pemeriksa gaya dan kepatuhan materi pelajaran (kegiatan L1). Hanya MEMBACA berkas dan mencetak peringatan;
// tidak pernah menulis, mengubah, atau menghapus apa pun.
//
// Pakai:
//   node tools/cek-materi.mjs                      semua content/pelajaran/*.json
//   node tools/cek-materi.mjs content/pelajaran/l1-m1-p1.json ...   hanya berkas itu
//   --akar <folder>        akar repo (bawaan: repo ini). Dipakai uji pada salinan sementara.
//   --json                 keluaran JSON, bukan teks
//   --ketat                kode keluar 1 bila ada peringatan tingkat P (bawaan: 0)
//   --semua                tampilkan semua temuan (bawaan: maks 5 per kode per berkas)
//   --kalimat-maks <n>     batas kata per kalimat (bawaan 30; di atas 125% menjadi P)
//   --kata-min <n>, --kata-maks <n>, --toleransi <n>   batas jumlah kata (bawaan 700, 1100, 50)
//   --bantuan              tampilkan ini
// Kode keluar: 0 selesai (ada atau tanpa peringatan), 1 hanya dengan --ketat dan ada P, 2 salah pakai atau berkas tak terbaca.
//
// Tingkat: P = peringatan (perlu ditinjau manusia sebelum Master menyetujui), C = catatan (kemungkinan wajar).
// Alat ini heuristik berbasis teks: bukan pengganti tinjauan Master, bukan pemeriksa fakta, dan bukan nasihat hukum.
// Aturan yang diperiksa berasal dari docs/loop/MATERI.md dan RUNBOOK.md (Standar kedalaman, Larangan).
import { readFileSync, readdirSync, lstatSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BATAS = Object.freeze({
  kalimatMaks: 30, kalimatSangat: 1.25, kataMin: 700, kataMaks: 1100, toleransi: 50,
  bagianMin: 5, bagianMaks: 7, paragrafMaks: 120, kutipanMaks: 25, jalurSama: 14, jendela: 10,
  berkasMaks: 1_000_000, stringMaks: 20_000, simpulMaks: 20_000, tampilPerKode: 5, selisihOpsi: 1.15, penjelasanMin: 15,
});

/* ---------- pembantu teks ---------- */
const KONTROL_UJI = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/; // tanpa bendera g: .test() tidak menyimpan lastIndex
const KONTROL = new RegExp(KONTROL_UJI.source, 'g'); // untuk replace
/** Teks yang aman dicetak ke terminal: karakter kontrol, kode escape, dan pengecoh arah diganti titik tengah. */
export function aman(s, n = 110) {
  const t = String(s).replace(KONTROL, '·').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}
export const hitungKata = (s) => (String(s).trim() === '' ? 0 : String(s).trim().split(/\s+/).length);

const SINGKATAN = new Set(['dst', 'dll', 'dsb', 'dkk', 'mis', 'yg', 'dg', 'dgn', 'no', 'tgl', 'bu', 'pak', 'dr', 'prof', 'hlm', 'vs', 'cth', 'sd', 'ir', 'drs', 'hj', 'kh', 'tn', 'ny', 'spt', 'sbb', 'jl', 'kab', 'kec']);
/** Memecah teks menjadi kalimat. Tidak memecah setelah singkatan umum, inisial, atau bila kata berikutnya berhuruf kecil. */
export function pecahKalimat(teks, pecahTitikKoma = false) {
  const hasil = [];
  for (const baris of String(teks).split(/\r?\n+/)) {
    let mulai = 0, m;
    const re = pecahTitikKoma ? /(?:[.!?…]+["”’'»)\]]*|;)(?=\s+(\S))/gu : /[.!?…]+["”’'»)\]]*(?=\s+(\S))/gu;
    while ((m = re.exec(baris))) {
      if (m[0] !== ';' && !/[\p{Lu}\d"“‘'(\[]/u.test(m[1])) continue;
      const kata = baris.slice(mulai, m.index).match(/(\p{L}+)$/u);
      if (m[0][0] === '.' && kata && (SINGKATAN.has(kata[1].toLowerCase()) || /^\p{Lu}$/u.test(kata[1]))) continue;
      hasil.push(baris.slice(mulai, m.index + m[0].length).trim());
      mulai = m.index + m[0].length;
    }
    const sisa = baris.slice(mulai).trim();
    if (sisa) hasil.push(sisa);
  }
  return hasil.filter(Boolean);
}

/** Mengumpulkan semua string dengan jalurnya. Kunci id, status, benar dilewati. Kedalaman dan jumlah simpul dibatasi. */
export function kumpulTeks(obj) {
  const hasil = []; let simpul = 0, terpotong = false;
  (function jalan(x, jalur, interaktif, dalam) {
    if (++simpul > BATAS.simpulMaks || dalam > 12) { terpotong = true; return; }
    if (typeof x === 'string') hasil.push({ jalur, teks: x, interaktif });
    else if (Array.isArray(x)) x.forEach((v, i) => jalan(v, `${jalur}[${i}]`, interaktif, dalam + 1));
    else if (x && typeof x === 'object') for (const k of Object.keys(x)) { if (k === 'id' || k === 'status' || k === 'benar') continue; jalan(x[k], jalur ? `${jalur}.${k}` : k, interaktif || k === 'interaktif', dalam + 1); }
  })(obj, '', false, 0);
  return { teks: hasil, terpotong };
}

/* ---------- pola ---------- */
const NEGASI = /\b(tidak|tak|bukan|jangan|belum|keliru|salah|menganggap|anggap|mengira|kira|bukan berarti|anggapan)\b/i;
const POLA_JANJI = [/\bdijamin\b/i, /\bpasti\s+(benar|berhasil|akurat|tepat|aman|lulus|diterima|untung)\b/i, /\b100\s?%/, /\btanpa\s+risiko\b/i, /\btidak\s+pernah\s+(salah|keliru)\b/i, /\bselalu\s+(benar|akurat|tepat)\b/i];
const MEDIA = /\b(video|tonton|menonton|ditonton|podcast|audio|rekaman suara|siaran)\b/i;
const PRODUK = /\b(ChatGPT|Gemini|Claude|Copilot|Perplexity|Grok|Llama|DeepSeek|Mistral|Meta AI|Bard)\b/;
const KLAIM_PRODUK = /\b(dukung|mendukung|didukung|dukungan|tersedia|bisa dipakai di|gratis|versi gratis|khusus|wajib memakai|harus memakai|bekerja sama|mitra|rekomendasi resmi)\b/i;
const GRATIS = /\b(gratis|cuma-cuma|tanpa biaya|free|freemium)\b/i;
const KONTEKS_BARANG = /\b(ongkir|ongkos|kirim|pengiriman)\b/i;
const UANG = /\bRp\.?\s?\d/;
const HARGA = /\b(langganan|berlangganan|harga paket|diskon|promo|bayar|membayar|biaya)\b/i;
const SERTIFIKAT = /\b(sertifikat|bersertifikat|tersertifikasi|sertifikasi|certified|certificate)\b/i;
const HUKUM_NOMOR = /\bPasal\s+\d+|\bUU\s*(No\.?|Nomor)?\s*\d+|\bUndang-Undang\s+(No\.?|Nomor)\s*\d+/i;
const HUKUM_ISTILAH = /\b(menggugat|gugatan|menuntut|dituntut|pidana|dipenjara|penjara)\b/i;
const HUKUM_PERINTAH = /\b(kamu|anda)\s+(wajib|harus)\s+(menuntut|menggugat|melapor ke polisi)\b/i;
const KONTAK = [['alamat email', /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/u], ['nomor telepon', /(?:\+62|\b62|\b0)8\d[\d\s-]{7,12}\d/], ['URL', /\b(?:https?:\/\/|www\.)\S+/i], ['nama pengguna (@)', /(?:^|[\s(])@[A-Za-z0-9_.]{3,}/]];
const TIDAK_AMAN = [['tag HTML', /<\/?[a-zA-Z!][^>]*>/], ['URL javascript:/vbscript:', /\b(?:javascript|vbscript)\s*:/i], ['URL data:', /\bdata:[a-z]+\/[a-z0-9.+-]+/i], ['atribut on*', /\bon[a-z]{3,}\s*=\s*["']/i], ['karakter kontrol, nol-lebar, atau pengecoh arah', KONTROL_UJI]];
const KOSONG = /\b(TODO|TBD|FIXME|XXX|lorem ipsum|materi sedang disusun)\b/i;
const KASAR = /\b(bodoh|tolol|goblok|dungu|malas)\b|(?<!jerih )\bpayah\b/i;
const SAPAAN_ANDA = /\bAnda\b/;

/** True bila posisi i berada di dalam tanda kutip (kutip lengkung atau lurus yang genap/ganjil). */
export function dalamKutipan(kal, i) {
  const awal = kal.slice(0, i);
  const lengkung = (awal.match(/[“‘]/g) || []).length - (awal.match(/[”’]/g) || []).length;
  return lengkung > 0 || ((awal.match(/"/g) || []).length % 2 === 1);
}

/* ---------- pemeriksaan satu pelajaran ---------- */
export function periksaPelajaran(obj, opsi = {}) {
  const B = { ...BATAS, ...opsi };
  const t = []; // temuan
  const tambah = (tingkat, kode, jalur, pesan, kutipan = '') => t.push({ tingkat, kode, jalur, pesan, kutipan: aman(kutipan) });
  const ada = (v) => v !== undefined && v !== null;
  const id = typeof obj?.id === 'string' ? aman(obj.id, 40) : '(tanpa id)';
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { tambah('P', 'K12', '', 'isi bukan objek JSON pelajaran'); return { id, kata: 0, kataInteraktif: 0, bagian: 0, kalimatTerpanjang: 0, temuan: t }; }
  const { teks, terpotong } = kumpulTeks(obj);
  if (terpotong) tambah('P', 'K16', '', 'struktur terlalu dalam atau terlalu banyak simpul; sebagian tidak diperiksa');

  let kata = 0, kataInteraktif = 0, terpanjang = 0;
  for (const { jalur, teks: s, interaktif } of teks) {
    const n = hitungKata(s);
    if (interaktif) kataInteraktif += n; else kata += n;
    if (s.length > B.stringMaks) { tambah('P', 'K16', jalur, `string sepanjang ${s.length} huruf (batas ${B.stringMaks}); sisanya tidak diperiksa`, s); continue; }
    if (s.trim() === '') tambah('P', 'K17', jalur, 'string kosong');
    for (const [label, re] of TIDAK_AMAN) if (re.test(s)) tambah('P', 'K10', jalur, `${label} di teks materi (penampil memakai textContent, tetapi materi tidak boleh memuatnya)`, s.replace(KONTROL, '·'));
    if (KOSONG.test(s)) tambah('P', 'K17', jalur, 'penanda belum selesai atau placeholder', s.match(KOSONG)[0]);
    if (MEDIA.test(s)) tambah('P', 'K02', jalur, 'merujuk video, audio, atau media lain (materi hanya teks dan latihan ringan)', s.match(MEDIA)[0]);
    if (SERTIFIKAT.test(s)) tambah('P', 'K07', jalur, 'menyebut sertifikat (belum dikonfirmasi Master)', s.match(SERTIFIKAT)[0]);
    for (const [label, re] of KONTAK) if (re.test(s)) tambah('P', 'K09', jalur, `memuat ${label} (jangan menampilkan identitas atau kontak nyata)`, s.match(re)[0]);
    if (KASAR.test(s)) tambah('P', 'K11', jalur, 'kata yang merendahkan pembaca', s.match(KASAR)[0]);
    if (SAPAAN_ANDA.test(s)) tambah('C', 'K11', jalur, 'memakai "Anda"; materi memakai "kamu" (wajar bila mengutip surat atau teks resmi di contoh)', s.match(/.{0,30}\bAnda\b.{0,30}/)?.[0] ?? 'Anda');
    if (HUKUM_NOMOR.test(s)) tambah('P', 'K08', jalur, 'memuat nomor pasal atau undang-undang (materi tidak memberi nasihat hukum)', s.match(HUKUM_NOMOR)[0]);
    if (HUKUM_PERINTAH.test(s)) tambah('P', 'K08', jalur, 'memerintahkan langkah hukum (di luar cakupan)', s.match(HUKUM_PERINTAH)[0]);
    else if (HUKUM_ISTILAH.test(s)) tambah('C', 'K08', jalur, 'istilah hukum; pastikan hanya penjelasan umum dan bukan nasihat hukum', s.match(HUKUM_ISTILAH)[0]);
    if (jalur.startsWith('bagian') && /paragraf\[\d+\]$/.test(jalur)) {
      if (n > B.paragrafMaks) tambah('C', 'K16', jalur, `paragraf ${n} kata (satu gagasan per paragraf; batas lunak ${B.paragrafMaks})`, s);
      for (const m of s.matchAll(/[“"]([^”"]{1,2000})[”"]/g)) {
        const q = hitungKata(m[1]);
        if (q >= B.kutipanMaks) tambah('C', 'K14', jalur, `kutipan ${q} kata (rujukan maksimal satu frasa pendek; wajar bila ini contoh prompt buatan sendiri)`, m[1]);
      }
    }
    const contohan = interaktif || /^contoh\b|^cek\[\d+\]\.opsi/.test(jalur); // teks yang memang memuat versi buruk atau pengecoh
    for (const kal of pecahKalimat(s, true)) {
      const w = hitungKata(kal);
      if (!interaktif && w > terpanjang) terpanjang = w;
      if (w > B.kalimatMaks) tambah(w > B.kalimatMaks * B.kalimatSangat ? 'P' : 'C', 'K01', jalur, `kalimat ${w} kata (batas ${B.kalimatMaks}; materi memakai kalimat pendek)`, kal);
      const janji = POLA_JANJI.map((re) => kal.match(re)).find((x) => x && !NEGASI.test(kal.slice(0, x.index)));
      if (janji) {
        const dalamKutip = dalamKutipan(kal, janji.index);
        tambah(contohan || dalamKutip ? 'C' : 'P', 'K03', jalur, contohan || dalamKutip ? 'janji berlebihan di dalam contoh, pengecoh, atau kutipan; pastikan memang versi yang salah' : 'janji berlebihan (kalimat yang menyangkalnya tidak ditandai)', janji[0] + ' · ' + kal);
      }
      const nv = /\bNERUVIA\b/i.test(kal);
      const pr = kal.match(PRODUK);
      if (pr) KLAIM_PRODUK.test(kal) ? tambah('P', 'K04', jalur, `menyebut ${pr[1]} bersama klaim dukungan atau akses (belum dikonfirmasi Master)`, kal) : tambah('C', 'K04', jalur, `menyebut produk ${pr[1]}; pastikan hanya rujukan sumber, bukan klaim dukungan NERUVIA`, kal);
      if (GRATIS.test(kal)) { const wajar = !nv && (contohan || KONTEKS_BARANG.test(kal)); tambah(wajar ? 'C' : 'P', 'K05', jalur, wajar ? 'kata gratis atau tanpa biaya dalam contoh fiktif atau konteks barang; pastikan bukan klaim tentang NERUVIA' : 'menyebut gratis (Level 1 gratis dan versi gratis belum dikonfirmasi Master)', kal); }
      if (UANG.test(kal) || HARGA.test(kal)) tambah(nv ? 'P' : 'C', 'K06', jalur, nv ? 'menyebut uang atau harga bersama NERUVIA (harga belum dikonfirmasi)' : 'menyebut uang, harga, atau pembayaran; pastikan fiktif dan bukan harga NERUVIA', kal);
    }
  }

  /* struktur menurut MATERI.md dan Standar kedalaman */
  const bagian = Array.isArray(obj.bagian) ? obj.bagian : [];
  const judulBagian = bagian.map((b) => (typeof b?.judul === 'string' ? b.judul : ''));
  if (kata < B.kataMin) tambah('P', 'K12', '', `${kata} kata (minimal ${B.kataMin}; interaktif tidak dihitung)`);
  else if (kata > B.kataMaks + B.toleransi) tambah('P', 'K12', '', `${kata} kata (maksimal ${B.kataMaks} ditambah toleransi ${B.toleransi}; interaktif tidak dihitung)`);
  else if (kata > B.kataMaks) tambah('C', 'K12', '', `${kata} kata, sedikit di atas ${B.kataMaks} tetapi dalam toleransi ${B.toleransi}`);
  if (bagian.length < B.bagianMin || bagian.length > B.bagianMaks) tambah('P', 'K12', 'bagian', `${bagian.length} bagian (harus ${B.bagianMin}–${B.bagianMaks})`);
  if (!judulBagian.some((j) => /kesalahan yang sering terjadi/i.test(j))) tambah('P', 'K12', 'bagian', 'tidak ada bagian "Kesalahan yang sering terjadi"');
  if (!judulBagian.some((j) => /^kapan\b/i.test(j.trim()))) tambah('P', 'K12', 'bagian', 'tidak ada bagian berjudul "Kapan ..." (kapan tidak dipakai)');
  if (!/^setelah pelajaran ini,? kamu bisa\b/i.test(String(obj.tujuan ?? '').trim())) tambah('C', 'K12', 'tujuan', 'tujuan tidak diawali "Setelah pelajaran ini, kamu bisa"', obj.tujuan ?? '');
  const contoh = obj.contoh && typeof obj.contoh === 'object' ? obj.contoh : {};
  if (!/fiktif/i.test(`${contoh.judul ?? ''} ${contoh.teks ?? ''}`)) tambah('P', 'K12', 'contoh', 'contoh tidak diberi label fiktif');
  const lat = String(obj.latihan?.petunjuk ?? '');
  for (const n of [1, 2, 3]) if (!new RegExp(`\\bTahap ${n}\\b`).test(lat)) tambah('P', 'K12', 'latihan.petunjuk', `latihan tidak memuat "Tahap ${n}" (tiga tahap: coba, perbaiki, bandingkan)`);
  if (!/daftar periksa/i.test(lat)) tambah('P', 'K12', 'latihan.petunjuk', 'latihan tidak memuat daftar periksa mandiri');
  if (!Array.isArray(obj.ringkasan) || obj.ringkasan.length !== 3) tambah('P', 'K12', 'ringkasan', 'ringkasan harus tepat 3 butir');
  if (!ada(obj.status) || !['draf', 'final'].includes(obj.status)) tambah('P', 'K12', 'status', 'status harus "draf" atau "final"');

  /* soal cek pemahaman */
  const cek = Array.isArray(obj.cek) ? obj.cek : [];
  if (cek.length !== 3) tambah('P', 'K12', 'cek', `${cek.length} soal (harus 3)`);
  let terpanjangBenar = 0; const benarSet = new Set();
  cek.forEach((q, i) => {
    if (!q || typeof q !== 'object' || !Array.isArray(q.opsi)) return tambah('P', 'K13', `cek[${i}]`, 'soal tanpa daftar opsi');
    const opsiTeks = q.opsi.map((o) => (typeof o === 'string' ? o : ''));
    if (new Set(opsiTeks.map((o) => o.trim().toLowerCase())).size !== opsiTeks.length) tambah('P', 'K13', `cek[${i}].opsi`, 'ada dua opsi yang sama');
    if (Number.isInteger(q.benar) && q.benar >= 0 && q.benar < opsiTeks.length) {
      benarSet.add(q.benar);
      const panjang = opsiTeks.map((o) => o.length), lain = panjang.filter((_, k) => k !== q.benar);
      if (lain.length && panjang[q.benar] >= Math.max(...lain) * B.selisihOpsi) terpanjangBenar++;
    }
    if (hitungKata(q.jelas ?? '') < B.penjelasanMin) tambah('C', 'K13', `cek[${i}].jelas`, `penjelasan ${hitungKata(q.jelas ?? '')} kata (disarankan minimal ${B.penjelasanMin}; sebut mengapa opsi lain keliru)`, q.jelas ?? '');
  });
  if (cek.length === 3 && terpanjangBenar >= 2) tambah('C', 'K13', 'cek', `opsi benar paling panjang (≥${Math.round((B.selisihOpsi - 1) * 100)}% di atas pengecoh terpanjang) pada ${terpanjangBenar} dari 3 soal; panjang bisa menjadi petunjuk`);
  if (cek.length === 3 && benarSet.size === 1) tambah('C', 'K13', 'cek', 'ketiga soal berjawaban benar di nomor opsi yang sama');
  return { id, kata, kataInteraktif, bagian: bagian.length, kalimatTerpanjang: terpanjang, temuan: t };
}

/* ---------- kesamaan antarpelajaran ---------- */
const TOKEN = /[\p{L}\p{N}'’-]+/gu;
/** Mencari urutan kata (>= jalurSama kata) yang sama persis di dua pelajaran. Mengembalikan peta id -> temuan. */
export function cariJalurSama(daftar, opsi = {}) {
  const B = { ...BATAS, ...opsi }, n = B.jendela;
  const token = new Map();
  for (const { id, obj } of daftar) {
    const seq = [];
    const { teks } = kumpulTeks(obj && typeof obj === 'object' ? { ...obj, interaktif: undefined } : {});
    for (const { teks: s, interaktif } of teks) { if (interaktif || s.length > B.stringMaks) continue; for (const m of s.toLowerCase().matchAll(TOKEN)) seq.push(m[0]); seq.push('\u0000'); }
    token.set(id, seq);
  }
  const indeks = new Map();
  for (const [id, seq] of token) for (let i = 0; i + n <= seq.length; i++) {
    const w = seq.slice(i, i + n); if (w.includes('\u0000')) continue;
    const k = w.join(' '); let a = indeks.get(k); if (!a) indeks.set(k, (a = [])); a.push([id, i]);
  }
  const posisi = new Map(); // `${a}|${b}` -> Set posisi mulai di a
  for (const a of indeks.values()) {
    if (a.length < 2 || a.length > 60) continue;
    for (const [ida, pa] of a) for (const [idb] of a) if (ida !== idb) { const k = `${ida}|${idb}`; let s = posisi.get(k); if (!s) posisi.set(k, (s = new Set())); s.add(pa); }
  }
  const hasil = new Map();
  for (const [k, s] of posisi) {
    const [ida, idb] = k.split('|'); const urut = [...s].sort((x, y) => x - y);
    let mulai = null, akhir = null;
    const tutup = () => { if (mulai === null) return; const len = akhir - mulai + n; if (len >= B.jalurSama) { const l = hasil.get(ida) ?? []; l.push({ lain: idb, kata: len, cuplikan: token.get(ida).slice(mulai, mulai + Math.min(len, 14)).join(' ') }); hasil.set(ida, l); } mulai = null; };
    for (const p of urut) { if (mulai !== null && p === akhir + 1) akhir = p; else { tutup(); mulai = akhir = p; } }
    tutup();
  }
  return hasil;
}

/* ---------- membaca berkas ---------- */
export function bacaJson(jalan) {
  if (!/\.json$/i.test(jalan)) throw new Error('bukan berkas .json');
  const st = lstatSync(jalan);
  if (st.isSymbolicLink() || !st.isFile()) throw new Error('bukan berkas biasa');
  if (st.size > BATAS.berkasMaks) throw new Error(`berkas ${st.size} byte melebihi batas ${BATAS.berkasMaks}`);
  try { return JSON.parse(readFileSync(jalan, 'utf8')); } catch (e) { throw new Error(e instanceof SyntaxError ? 'JSON tidak valid' : e.message); } // pesan SyntaxError memuat cuplikan isi berkas, jadi tidak diteruskan
}

/* ---------- antarmuka baris perintah ---------- */
const BANTUAN = 'Pakai: node tools/cek-materi.mjs [--akar <folder>] [--json] [--ketat] [--semua] [--kalimat-maks n] [--kata-min n] [--kata-maks n] [--toleransi n] [berkas.json ...]\nLihat komentar di awal berkas untuk penjelasan.';
export function urai(argv) {
  const o = { berkas: [], json: false, ketat: false, semua: false, bantuan: false, akar: null, angka: {} };
  const ANGKA = { '--kalimat-maks': ['kalimatMaks', 5, 200], '--kata-min': ['kataMin', 1, 5000], '--kata-maks': ['kataMaks', 1, 5000], '--toleransi': ['toleransi', 0, 2000] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true; else if (a === '--ketat') o.ketat = true; else if (a === '--semua') o.semua = true;
    else if (a === '--bantuan' || a === '-h' || a === '--help') o.bantuan = true;
    else if (a === '--akar') { if (i + 1 >= argv.length) throw new Error('--akar butuh nilai'); o.akar = argv[++i]; }
    else if (ANGKA[a]) {
      const [kunci, lo, hi] = ANGKA[a]; const v = argv[++i];
      if (v === undefined || !/^\d{1,5}$/.test(v) || +v < lo || +v > hi) throw new Error(`${a} butuh bilangan bulat ${lo}–${hi}`);
      o.angka[kunci] = +v;
    } else if (a.startsWith('-')) throw new Error(`opsi tidak dikenal: ${aman(a, 40)}`);
    else o.berkas.push(a);
  }
  return o;
}

export function jalankan(argv, { keluar = (s) => process.stdout.write(s + '\n'), galat = (s) => process.stderr.write(s + '\n'), cwd = process.cwd() } = {}) {
  let o;
  try { o = urai(argv); } catch (e) { galat(`cek-materi: ${e.message}\n${BANTUAN}`); return 2; }
  if (o.bantuan) { keluar(BANTUAN); return 0; }
  const akar = resolve(cwd, o.akar ?? fileURLToPath(new URL('../', import.meta.url)));
  if (!existsSync(akar) || !statSync(akar).isDirectory()) { galat(`cek-materi: akar bukan folder: ${aman(akar, 80)}`); return 2; }
  const opsi = o.angka;
  if (opsi.kataMin !== undefined && opsi.kataMaks !== undefined && opsi.kataMin > opsi.kataMaks) { galat('cek-materi: --kata-min lebih besar dari --kata-maks'); return 2; }
  const folder = join(akar, 'content', 'pelajaran');
  let jalur = o.berkas.map((b) => resolve(cwd, b));
  if (!o.berkas.length) {
    if (!existsSync(folder)) { galat(`cek-materi: tidak ada ${aman(folder, 80)}`); return 2; }
    jalur = readdirSync(folder).filter((f) => /^[a-z0-9-]+\.json$/.test(f)).sort().map((f) => join(folder, f));
  }
  const galatBaca = []; const muat = (p) => { try { return bacaJson(p); } catch (e) { galatBaca.push({ berkas: aman(p, 100), pesan: aman(e.message, 120) }); return undefined; } };
  const dipilih = jalur.map((p) => ({ p, obj: muat(p) })).filter((x) => x.obj !== undefined);
  const idDari = (x, k) => (typeof x.obj?.id === 'string' && /^[\w-]{1,40}$/.test(x.obj.id) ? x.obj.id : `berkas-${k}`);
  const dipakai = new Set();
  const daftar = dipilih.map((x, k) => { let id = idDari(x, k); if (dipakai.has(id)) id = `${id}~${k}`; dipakai.add(id); return { id, obj: x.obj }; }); // id ganda tetap diperiksa terpisah
  /* pembanding: pelajaran lain di repo, hanya bila berkas dipilih eksplisit */
  const pembanding = [];
  if (o.berkas.length && existsSync(folder)) {
    const sudah = new Set(jalur);
    for (const f of readdirSync(folder).filter((n) => /^[a-z0-9-]+\.json$/.test(n)).sort()) {
      const p = join(folder, f); if (sudah.has(p)) continue;
      try { const obj = bacaJson(p); if (typeof obj?.id === 'string' && !daftar.some((d) => d.id === obj.id)) pembanding.push({ id: obj.id, obj }); } catch { /* pembanding rusak diabaikan */ }
    }
  }
  const sama = cariJalurSama([...daftar, ...pembanding], opsi);
  const laporan = daftar.map((d) => {
    const r = periksaPelajaran(d.obj, opsi);
    r.id = d.id;
    for (const s of (sama.get(d.id) ?? []).sort((a, b) => b.kata - a.kata)) r.temuan.push({ tingkat: 'C', kode: 'K15', jalur: '', pesan: `${s.kata} kata berurutan sama dengan ${s.lain}`, kutipan: aman(s.cuplikan) });
    return r;
  });
  const hitung = (r, tk) => r.temuan.filter((x) => x.tingkat === tk).length;
  const totalP = laporan.reduce((a, r) => a + hitung(r, 'P'), 0), totalC = laporan.reduce((a, r) => a + hitung(r, 'C'), 0);
  const perKode = {}; for (const r of laporan) for (const x of r.temuan) { const k = (perKode[x.kode] ??= { P: 0, C: 0 }); k[x.tingkat]++; }

  if (o.json) {
    keluar(JSON.stringify({ berkas: laporan, galatBaca, ringkasan: { berkas: laporan.length, peringatan: totalP, catatan: totalC, perKode } }, null, 2));
  } else {
    keluar(`cek-materi: ${laporan.length} berkas diperiksa (hanya baca; tidak ada berkas diubah)`);
    for (const r of laporan) {
      if (!r.temuan.length) continue;
      keluar(`\n${r.id}  (${r.kata} kata, ${r.bagian} bagian, kalimat terpanjang ${r.kalimatTerpanjang} kata; ${hitung(r, 'P')} P, ${hitung(r, 'C')} C)`);
      const hitungKode = {};
      for (const x of r.temuan.sort((a, b) => (a.tingkat === b.tingkat ? a.kode.localeCompare(b.kode) : a.tingkat === 'P' ? -1 : 1))) {
        const n = (hitungKode[x.kode + x.tingkat] = (hitungKode[x.kode + x.tingkat] ?? 0) + 1);
        if (!o.semua && n > BATAS.tampilPerKode) { if (n === BATAS.tampilPerKode + 1) keluar(`  ... temuan ${x.tingkat} ${x.kode} lainnya disembunyikan (--semua untuk melihat semuanya)`); continue; }
        keluar(`  [${x.tingkat}] ${x.kode}${x.jalur ? ' ' + x.jalur : ''}: ${x.pesan}${x.kutipan ? `: "${x.kutipan}"` : ''}`);
      }
    }
    for (const g of galatBaca) keluar(`\nGALAT BACA ${g.berkas}: ${g.pesan}`);
    keluar(`\nRingkasan: ${totalP} peringatan (P), ${totalC} catatan (C) pada ${laporan.filter((r) => r.temuan.length).length} dari ${laporan.length} berkas.`);
    for (const k of Object.keys(perKode).sort()) keluar(`  ${k}: ${perKode[k].P} P, ${perKode[k].C} C`);
    if (laporan.length) {
      const ks = laporan.map((r) => r.kata);
      keluar(`Jumlah kata (tanpa interaktif): terkecil ${Math.min(...ks)}, terbesar ${Math.max(...ks)}, rata-rata ${Math.round(ks.reduce((a, b) => a + b, 0) / ks.length)}.`);
    }
  }
  if (galatBaca.length) return 2;
  return o.ketat && totalP > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = jalankan(process.argv.slice(2));
