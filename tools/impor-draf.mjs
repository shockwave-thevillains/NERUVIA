// Impor draf pelajaran dari /admin/ (JSON hasil "Unduh JSON") ke content/.
// Pakai:
//   node tools/impor-draf.mjs <berkas.json>                   uji coba, tidak menulis apa pun
//   node tools/impor-draf.mjs <berkas.json> --tulis           tulis content/pelajaran/<id>.json dan perbarui kursus.json
//   opsi: --status draf|final (bawaan draf)   --timpa (izinkan mengganti berkas isi yang sudah ada)
// Alat ini memeriksa berkas, menulis, menjalankan tools/validasi-kursus.mjs, dan mengembalikan
// semuanya bila validasi gagal. Hasil perlu ditinjau manusia sebelum commit.
import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const akar = (p) => fileURLToPath(new URL('../' + p, import.meta.url));
const args = process.argv.slice(2);
const opsi = (n) => args.includes(n);
const nilai = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const berkas = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--status');
const tulis = opsi('--tulis');
const timpa = opsi('--timpa');
const status = nilai('--status') || 'draf';

const gagal = (m) => { console.error('DITOLAK: ' + m); process.exit(1); };
if (!berkas) gagal('sebutkan berkas JSON. Contoh: node tools/impor-draf.mjs unduhan.json --tulis');
if (!['draf', 'final'].includes(status)) gagal('--status harus draf atau final');
if (!existsSync(berkas) || !statSync(berkas).isFile()) gagal('berkas tidak ditemukan: ' + berkas);
if (statSync(berkas).size > 60000) gagal('berkas lebih dari 60000 byte (batas draf di server)');

let c;
try { c = JSON.parse(readFileSync(berkas, 'utf8')); } catch (e) { gagal('JSON tidak valid: ' + e.message); }
if (!c || typeof c !== 'object' || Array.isArray(c)) gagal('isi berkas harus berupa objek');

const KUNCI = ['id', 'status', 'tujuan', 'bagian', 'contoh', 'latihan', 'cek', 'ringkasan'];
const asing = Object.keys(c).filter((k) => !KUNCI.includes(k));
if (asing.length) gagal('kunci tidak dikenal: ' + asing.join(', '));
if (typeof c.id !== 'string' || !/^l[0-9]{1,2}-m[0-9]{1,2}-p[0-9]{1,2}$/.test(c.id)) gagal('id tidak sesuai format l<level>-m<modul>-p<nomor>');

const fKursus = akar('content/kursus.json');
const fIsi = akar(`content/pelajaran/${c.id}.json`);
const kursusAsli = readFileSync(fKursus, 'utf8');
const kursus = JSON.parse(kursusAsli);
let target = null;
for (const l of kursus.level) for (const m of l.modul) for (const p of m.pelajaran) if (p.id === c.id) target = p;
if (!target) gagal(`id ${c.id} tidak ada di content/kursus.json. Tambahkan dulu pelajarannya di kursus.json.`);
const adaIsi = existsSync(fIsi);
if (adaIsi && !timpa) gagal(`content/pelajaran/${c.id}.json sudah ada. Pakai --timpa bila memang ingin menggantinya.`);
const isiAsli = adaIsi ? readFileSync(fIsi, 'utf8') : null;

c.status = status;
target.isi = status;
kursus.diperbarui = new Date().toISOString().slice(0, 10);

const pulihkan = () => {
  writeFileSync(fKursus, kursusAsli);
  if (isiAsli === null) { if (existsSync(fIsi)) unlinkSync(fIsi); } else writeFileSync(fIsi, isiAsli);
};

writeFileSync(fIsi, JSON.stringify(c, null, 2) + '\n');
writeFileSync(fKursus, JSON.stringify(kursus, null, 2) + '\n');
const v = spawnSync(process.execPath, [akar('tools/validasi-kursus.mjs')], { encoding: 'utf8' });
if (v.status !== 0) {
  pulihkan();
  console.error((v.stderr || v.stdout).trim());
  gagal('validasi gagal. Tidak ada berkas yang diubah.');
}
if (!tulis) {
  pulihkan();
  console.log(`LOLOS (uji coba): ${c.id} sebagai "${status}". Tidak ada berkas yang diubah. Tambahkan --tulis untuk menulis.`);
} else {
  console.log(`DITULIS: content/pelajaran/${c.id}.json (${status}) dan isi="${status}" di content/kursus.json.`);
  console.log(v.stdout.trim());
  console.log('Langkah berikut: tinjau isinya, jalankan node tools/validasi-kursus.mjs, lalu commit ke dev.');
}
