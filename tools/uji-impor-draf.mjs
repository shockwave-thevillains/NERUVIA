// Uji tools/impor-draf.mjs pada salinan sementara (repo asli tidak disentuh).
// Pakai: node tools/uji-impor-draf.mjs
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as gabung } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const asal = fileURLToPath(new URL('../', import.meta.url));
const tmp = mkdtempSync(gabung(tmpdir(), 'impor-'));
cpSync(gabung(asal, 'tools'), gabung(tmp, 'tools'), { recursive: true });
cpSync(gabung(asal, 'content'), gabung(tmp, 'content'), { recursive: true });
const skrip = gabung(tmp, 'tools/impor-draf.mjs');
const baca = (p) => readFileSync(gabung(tmp, p), 'utf8');
const dasar = JSON.parse(baca('content/pelajaran/l1-m1-p1.json'));
const contoh = (ubah = (x) => x) => { const o = ubah(structuredClone({ ...dasar, id: 'l1-m1-p2' })); return o; };
let nomor = 0, lulus = 0, gagal = 0;
const uji = (nama, kondisi) => { nomor++; if (kondisi) lulus++; else { gagal++; console.error('GAGAL: ' + nama); } };
const jalan = (obj, ...opsi) => {
  const f = gabung(tmp, `masuk-${nomor}.json`);
  writeFileSync(f, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return spawnSync(process.execPath, [skrip, f, ...opsi], { encoding: 'utf8' });
};
const kursus0 = baca('content/kursus.json');

try {
  let r = jalan(contoh());
  uji('uji coba lolos', r.status === 0 && /LOLOS/.test(r.stdout));
  uji('uji coba tidak menulis berkas isi', !existsSync(gabung(tmp, 'content/pelajaran/l1-m1-p2.json')));
  uji('uji coba tidak mengubah kursus.json', baca('content/kursus.json') === kursus0);

  r = jalan(contoh(), '--tulis');
  uji('tulis lolos', r.status === 0 && /DITULIS/.test(r.stdout));
  uji('berkas isi ada dan berstatus draf', existsSync(gabung(tmp, 'content/pelajaran/l1-m1-p2.json')) && JSON.parse(baca('content/pelajaran/l1-m1-p2.json')).status === 'draf');
  const k = JSON.parse(baca('content/kursus.json'));
  uji('kursus.json memuat isi=draf untuk l1-m1-p2', k.level[0].modul[0].pelajaran[1].isi === 'draf');

  const sebelum = baca('content/pelajaran/l1-m1-p2.json');
  r = jalan(contoh(), '--tulis');
  uji('menolak menimpa tanpa --timpa', r.status !== 0 && /sudah ada/.test(r.stderr));
  uji('berkas tidak berubah saat ditolak', baca('content/pelajaran/l1-m1-p2.json') === sebelum);
  r = jalan(contoh(), '--tulis', '--timpa', '--status', 'final');
  uji('timpa dengan status final lolos', r.status === 0 && JSON.parse(baca('content/pelajaran/l1-m1-p2.json')).status === 'final');

  const sebelumK = baca('content/kursus.json');
  r = jalan(contoh((o) => { o.id = 'l1-m9-p9'; return o; }), '--tulis');
  uji('menolak id yang tidak ada di kursus.json', r.status !== 0 && /tidak ada di content\/kursus.json/.test(r.stderr));
  r = jalan(contoh((o) => { o.id = '../../etc/passwd'; return o; }), '--tulis');
  uji('menolak id berbentuk path', r.status !== 0 && /format/.test(r.stderr));
  r = jalan(contoh((o) => { o.id = 'l1-m1-p3'; o.cek = o.cek.slice(0, 2); return o; }), '--tulis');
  uji('menolak isi tidak valid (cek hanya 2)', r.status !== 0 && /DITOLAK/.test(r.stderr));
  uji('isi tidak valid tidak meninggalkan berkas', !existsSync(gabung(tmp, 'content/pelajaran/l1-m1-p3.json')) && baca('content/kursus.json') === sebelumK);
  r = jalan(contoh((o) => { o.id = 'l1-m1-p3'; o.tujuan = 'Tonton video ini.'; return o; }), '--tulis');
  uji('menolak materi yang merujuk video', r.status !== 0);
  r = jalan(contoh((o) => { o.id = 'l1-m1-p3'; o.rahasia = 'x'; return o; }), '--tulis');
  uji('menolak kunci tidak dikenal', r.status !== 0 && /kunci tidak dikenal/.test(r.stderr));
  r = jalan('{bukan json');
  uji('menolak JSON rusak', r.status !== 0 && /JSON tidak valid/.test(r.stderr));
  r = jalan(contoh((o) => { o.id = 'l1-m1-p3'; o.tujuan = 'x'.repeat(61000); return o; }), '--tulis');
  uji('menolak berkas lebih dari 60000 byte', r.status !== 0 && /60000/.test(r.stderr));
  r = jalan(contoh(), '--status', 'rahasia');
  uji('menolak status tidak dikenal', r.status !== 0);
  r = spawnSync(process.execPath, [skrip], { encoding: 'utf8' });
  uji('tanpa argumen memberi petunjuk', r.status !== 0 && /sebutkan berkas/.test(r.stderr));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`${lulus} lulus, ${gagal} gagal dari ${nomor} uji.`);
process.exit(gagal ? 1 : 0);
