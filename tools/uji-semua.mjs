#!/usr/bin/env node
/* Perintah tunggal gerbang NERUVIA (kegiatan L2). Menjalankan alat-alat pemeriksa satu per satu dan
   merangkum hasilnya. Tanpa dependensi npm. Tidak mengubah berkas repo (hanya menjalankan alat lain,
   dan semuanya tanpa shell: tiap langkah dijalankan sebagai `node <skrip> <argumen>`).

   Pakai:
     node tools/uji-semua.mjs                 langkah bawaan: validator kursus, uji impor draf, uji keamanan --cepat (sekitar 3 detik)
     node tools/uji-semua.mjs --lengkap       bawaan + uji impor progres, uji komentar draf, uji aset, cek vercel.json, uji cek-materi
     node tools/uji-semua.mjs --penuh         uji keamanan tanpa --cepat (dengan browser, sekitar 45 detik) menggantikan versi cepat
     node tools/uji-semua.mjs --penuh --lengkap
     node tools/uji-semua.mjs --hanya=validasi,aset     hanya langkah bernama (nama apa pun dari daftar, tanpa perlu --lengkap)
     node tools/uji-semua.mjs --daftar        cetak langkah yang akan jalan, tanpa menjalankan apa pun
     node tools/uji-semua.mjs --berhenti      berhenti di kegagalan pertama (bawaan: semua langkah tetap jalan)
     node tools/uji-semua.mjs --tampil        tampilkan seluruh keluaran tiap langkah (bawaan: ekor keluaran langkah yang gagal saja)
     node tools/uji-semua.mjs --batas=DETIK   batas waktu per langkah (1 sampai 1800, bawaan 300)
     node tools/uji-semua.mjs --akar=FOLDER   akar repo lain (dipakai uji mandiri); bawaan: repo tempat berkas ini berada
     node tools/uji-semua.mjs --bantuan

   Kode keluar: 0 semua langkah lulus; 1 ada langkah gagal (kode keluar bukan 0, tidak ketemu, lewat batas waktu,
   dimatikan sinyal) atau pemakaian salah; 2 semua lulus tetapi uji browser dilewati karena Playwright tidak ada
   (arti yang sama dengan uji-keamanan.mjs). Kode 2 dari alat selain uji keamanan dihitung gagal.

   Batas yang diketahui: alat ini hanya mempercayai kode keluar tiap langkah; ia tidak menilai isi keluaran.
   Langkah ber-nama "keamanan" dengan --cepat tidak menjalankan uji browser, jadi lulus cepat bukan pengganti
   gerbang penuh sebelum commit kode atau konten (RUNBOOK, bagian Gerbang keamanan). Langkah yang lewat batas waktu
   dimatikan dengan SIGKILL; proses anak yang dibuat langkah itu (mis. browser Playwright) bisa tertinggal. */
import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAMA = { pendek: 1, panjang: 1800, bawaan: 300 };
const MAKS_KELUARAN = 64 * 1024 * 1024; // byte per langkah; lebih dari ini langkah dianggap gagal
const EKOR_BARIS = 30; // baris terakhir keluaran yang ditampilkan untuk langkah gagal
const EKOR_LEBAR = 300; // karakter maksimal per baris yang ditampilkan

/* Daftar langkah. `nama` dipakai --hanya. `kodeDua: 'lewati'` berarti kode 2 = lulus dengan bagian dilewati. */
export const LANGKAH = [
  { nama: 'validasi', inti: true, skrip: 'tools/validasi-kursus.mjs', args: [], ket: 'validator content/kursus.json dan isi pelajaran' },
  { nama: 'impor-draf', inti: true, skrip: 'tools/uji-impor-draf.mjs', args: [], ket: 'uji alat impor draf pelajaran (salinan sementara)' },
  { nama: 'keamanan', inti: true, skrip: 'tools/uji-keamanan.mjs', args: ['--cepat'], argsPenuh: [], kodeDua: 'lewati', ket: 'uji keamanan (statis; --penuh menambah uji browser)' },
  { nama: 'impor-progres', inti: false, skrip: 'tools/uji-impor-progres.mjs', args: [], ket: 'uji impor progres dengan muatan jahat' },
  { nama: 'komentar-draf', inti: false, skrip: 'tools/uji-komentar-draf.mjs', args: [], ket: 'uji kerangka komentar yang dinonaktifkan' },
  { nama: 'aset', inti: false, skrip: 'tools/uji-aset.mjs', args: [], ket: 'pemeriksa aset (rujukan, ukuran, preload) dan uji mandiri' },
  { nama: 'vercel', inti: false, skrip: 'tools/buat-vercel-json.mjs', args: ['--cek'], ket: 'vercel.json sesuai blok inline halaman' },
  { nama: 'cek-materi', inti: false, skrip: 'tools/uji-cek-materi.mjs', args: [], ket: 'uji alat cek materi (salinan sementara, sekitar 11 detik)' },
];

const BANTUAN = `Pakai: node tools/uji-semua.mjs [--lengkap] [--penuh] [--hanya=a,b] [--daftar] [--berhenti] [--tampil] [--batas=DETIK] [--akar=FOLDER]
Nama langkah: ${LANGKAH.map((l) => l.nama).join(', ')}. Lihat docs/uji-semua.md.`;

/* Hapus karakter kontrol (termasuk ESC), kontrol C1, dan penanda arah bidi supaya keluaran alat lain
   tidak bisa menggerakkan kursor, mengubah judul terminal, atau membalik teks laporan. Baris baru dan tab dipertahankan. */
export function bersihkan(teks) {
  return String(teks)
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩﻿]/g, '�');
}

export function urai(argv) {
  const o = { lengkap: false, penuh: false, daftar: false, berhenti: false, tampil: false, bantuan: false, hanya: null, batas: LAMA.bawaan, akar: null, galat: null };
  for (const a of argv) {
    if (a === '--lengkap') o.lengkap = true;
    else if (a === '--penuh') o.penuh = true;
    else if (a === '--daftar') o.daftar = true;
    else if (a === '--berhenti') o.berhenti = true;
    else if (a === '--tampil') o.tampil = true;
    else if (a === '--bantuan' || a === '--help' || a === '-h') o.bantuan = true;
    else if (a.startsWith('--hanya=')) {
      const bagian = a.slice(8).split(',');
      if (bagian.some((x) => !/^[a-z][a-z-]{0,30}$/.test(x))) { o.galat = `nilai --hanya tidak valid: ${bersihkan(a.slice(0, 80))}`; break; }
      o.hanya = [...new Set(bagian)];
    } else if (a.startsWith('--batas=')) {
      const v = a.slice(8);
      if (!/^[0-9]{1,5}$/.test(v) || Number(v) < LAMA.pendek || Number(v) > LAMA.panjang) { o.galat = `--batas harus bilangan bulat ${LAMA.pendek} sampai ${LAMA.panjang} detik`; break; }
      o.batas = Number(v);
    } else if (a.startsWith('--akar=')) {
      if (!a.slice(7) || a.slice(7).includes('\0')) { o.galat = '--akar kosong atau tidak valid'; break; }
      o.akar = a.slice(7);
    } else { o.galat = `opsi tidak dikenal: ${bersihkan(a.slice(0, 80))}`; break; }
  }
  return o;
}

export function pilihLangkah(o) {
  const semua = LANGKAH.filter((l) => l.inti || o.lengkap || (o.hanya && o.hanya.includes(l.nama)));
  if (!o.hanya) return { langkah: semua, galat: null };
  const kenal = new Set(LANGKAH.map((l) => l.nama));
  const asing = o.hanya.filter((n) => !kenal.has(n));
  if (asing.length) return { langkah: [], galat: `nama langkah tidak dikenal: ${asing.map((n) => bersihkan(n)).join(', ')}` };
  return { langkah: LANGKAH.filter((l) => o.hanya.includes(l.nama)), galat: null };
}

function jalankan(l, akar, o) {
  const berkas = join(akar, l.skrip);
  const catat = { nama: l.nama, status: 'lulus', kode: 0, detik: 0, keluaran: '', alasan: '' };
  if (!existsSync(berkas) || !statSync(berkas).isFile()) {
    return { ...catat, status: 'gagal', kode: null, alasan: `skrip tidak ditemukan: ${l.skrip}` };
  }
  const args = o.penuh && l.argsPenuh ? l.argsPenuh : l.args;
  const mulai = process.hrtime.bigint();
  const r = spawnSync(process.execPath, [berkas, ...args], {
    cwd: akar, encoding: 'utf8', timeout: o.batas * 1000, killSignal: 'SIGKILL', maxBuffer: MAKS_KELUARAN, stdio: ['ignore', 'pipe', 'pipe'],
  });
  catat.detik = Number(process.hrtime.bigint() - mulai) / 1e9;
  catat.keluaran = (r.stdout || '') + (r.stderr ? (r.stdout ? '\n' : '') + r.stderr : '');
  if (r.error) {
    const sebab = r.error.code === 'ETIMEDOUT' ? `lewat batas waktu ${o.batas} detik` : r.error.code === 'ENOBUFS' ? 'keluaran melebihi batas 64 MB' : `galat menjalankan: ${r.error.code || r.error.message}`;
    return { ...catat, status: 'gagal', kode: null, alasan: sebab };
  }
  if (r.signal) return { ...catat, status: 'gagal', kode: null, alasan: `dimatikan sinyal ${r.signal}` };
  catat.kode = r.status;
  if (r.status === 0) return catat;
  if (r.status === 2 && l.kodeDua === 'lewati') return { ...catat, status: 'lewati', alasan: 'lulus, tetapi uji browser dilewati (Playwright tidak ada)' };
  return { ...catat, status: 'gagal', alasan: `kode keluar ${r.status}` };
}

const ekor = (teks) => {
  const baris = bersihkan(teks).split('\n');
  while (baris.length && baris[baris.length - 1].trim() === '') baris.pop();
  return baris.slice(-EKOR_BARIS).map((b) => (b.length > EKOR_LEBAR ? b.slice(0, EKOR_LEBAR) + '…' : b)).join('\n');
};
const detik = (n) => (n < 10 ? n.toFixed(1) : Math.round(n)) + ' dtk';

export function main(argv, keluar = (s) => process.stdout.write(s + '\n'), galatOut = (s) => process.stderr.write(s + '\n')) {
  const o = urai(argv);
  if (o.bantuan) { keluar(BANTUAN); return 0; }
  if (o.galat) { galatOut(`GAGAL: ${o.galat}\n${BANTUAN}`); return 1; }
  const akar = o.akar ? resolve(o.akar) : join(dirname(fileURLToPath(import.meta.url)), '..');
  if (!existsSync(join(akar, 'tools')) || !statSync(join(akar, 'tools')).isDirectory()) { galatOut(`GAGAL: akar tidak berisi folder tools: ${bersihkan(akar)}`); return 1; }
  const { langkah, galat } = pilihLangkah(o);
  if (galat) { galatOut(`GAGAL: ${galat}\n${BANTUAN}`); return 1; }
  if (!langkah.length) { galatOut('GAGAL: tidak ada langkah untuk dijalankan'); return 1; }

  if (o.daftar) {
    keluar(`Langkah (${langkah.length})${o.penuh ? ', mode penuh' : ''}:`);
    for (const l of langkah) keluar(`  ${l.nama.padEnd(14)} node ${l.skrip}${(o.penuh && l.argsPenuh ? l.argsPenuh : l.args).map((a) => ' ' + a).join('')}  # ${l.ket}`);
    return 0;
  }

  keluar(`NERUVIA uji-semua: ${langkah.length} langkah${o.penuh ? ' (mode penuh)' : ''}${o.berhenti ? ', berhenti di kegagalan pertama' : ''}`);
  const hasil = [];
  let berhentiKarena = null;
  for (const l of langkah) {
    if (berhentiKarena) { hasil.push({ nama: l.nama, status: 'tidak-jalan', kode: null, detik: 0, keluaran: '', alasan: `tidak dijalankan karena ${berhentiKarena} gagal` }); continue; }
    keluar(`\n-- ${l.nama}: node ${l.skrip}${(o.penuh && l.argsPenuh ? l.argsPenuh : l.args).map((a) => ' ' + a).join('')}`);
    const r = jalankan(l, akar, o);
    hasil.push(r);
    if (o.tampil) { const t = bersihkan(r.keluaran).trimEnd(); if (t) keluar(t); }
    else if (r.status === 'gagal') { const t = ekor(r.keluaran); if (t) keluar(t); }
    keluar(`   ${r.status.toUpperCase()} (${detik(r.detik)})${r.alasan ? ' - ' + r.alasan : ''}`);
    if (r.status === 'gagal' && o.berhenti) berhentiKarena = l.nama;
  }

  const n = (s) => hasil.filter((h) => h.status === s).length;
  keluar('\n== Ringkasan ==');
  for (const h of hasil) keluar(`  ${h.status.toUpperCase().padEnd(11)} ${h.nama.padEnd(14)} ${h.status === 'tidak-jalan' ? '' : detik(h.detik)}`);
  const total = hasil.reduce((a, h) => a + h.detik, 0);
  keluar(`${n('lulus')} lulus, ${n('lewati')} lulus dengan bagian dilewati, ${n('gagal')} gagal, ${n('tidak-jalan')} tidak dijalankan, dari ${hasil.length} langkah (${detik(total)})`);
  if (n('gagal') || n('tidak-jalan')) return 1;
  if (n('lewati')) { keluar('Catatan: uji browser dilewati; pasang Playwright untuk gerbang penuh.'); return 2; }
  return 0;
}

// Pakai exitCode, bukan process.exit: dengan stdout berupa pipa, process.exit memotong keluaran besar yang belum terkirim.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
