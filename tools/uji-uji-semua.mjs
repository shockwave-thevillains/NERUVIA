// Uji tools/uji-semua.mjs. Hampir semua kasus memakai akar tiruan di folder sementara (skrip tiruan
// dengan kode keluar yang diatur), jadi cepat dan tidak bergantung pada kesehatan repo. Dua kasus
// memakai repo nyata sebagai kontrol positif dan memastikan repo tidak berubah.
// Pakai: node tools/uji-uji-semua.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as gabung } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LANGKAH, bersihkan, urai, pilihLangkah } from './uji-semua.mjs';

const asal = fileURLToPath(new URL('../', import.meta.url));
const skrip = gabung(asal, 'tools/uji-semua.mjs');
const tmp = mkdtempSync(gabung(tmpdir(), 'ujisemua-'));
let nomor = 0, lulus = 0, gagal = 0;
const uji = (nama, kondisi, info = '') => { nomor++; if (kondisi) lulus++; else { gagal++; console.error('GAGAL: ' + nama + (info ? '\n  ' + String(info).slice(0, 400) : '')); } };

// Bangun akar tiruan. `kode` memetakan nama langkah ke isi skrip; sisanya skrip yang hanya mencatat jejak lalu keluar 0.
const JEJAK = "import{appendFileSync}from'node:fs';appendFileSync('jejak.txt',process.argv[1].split('/').pop()+' '+process.argv.slice(2).join(' ')+'\\n');";
let urut = 0;
function akar(kode = {}, hilang = []) {
  const d = gabung(tmp, 'akar' + (++urut));
  mkdirSync(gabung(d, 'tools'), { recursive: true });
  for (const l of LANGKAH) {
    if (hilang.includes(l.nama)) continue;
    writeFileSync(gabung(d, l.skrip), JEJAK + (kode[l.nama] ?? 'process.exit(0);'));
  }
  return d;
}
const jejak = (d) => (existsSync(gabung(d, 'jejak.txt')) ? readFileSync(gabung(d, 'jejak.txt'), 'utf8').trim().split('\n').filter(Boolean) : []);
const jalan = (args, d, opsi = {}) => spawnSync(process.execPath, [skrip, ...(d ? ['--akar=' + d] : []), ...args], { encoding: 'utf8', cwd: opsi.cwd, timeout: 120000, maxBuffer: 1 << 28 });
const semua = (r) => r.stdout + r.stderr;
const NAMA_INTI = LANGKAH.filter((l) => l.inti).map((l) => l.nama);

try {
  /* ---------- A. Perilaku normal ---------- */
  {
    const d = akar();
    const r = jalan([], d);
    uji('A1 semua lulus: kode 0', r.status === 0, semua(r));
    uji('A2 hanya langkah inti jalan, berurutan', jejak(d).map((x) => x.split(' ')[0]).join(',') === 'validasi-kursus.mjs,uji-impor-draf.mjs,uji-keamanan.mjs', jejak(d).join('|'));
    uji('A3 keamanan memakai --cepat secara bawaan', jejak(d).some((x) => x === 'uji-keamanan.mjs --cepat'), jejak(d).join('|'));
    uji('A4 ringkasan memuat hitungan', /3 lulus, 0 lulus dengan bagian dilewati, 0 gagal, 0 tidak dijalankan, dari 3 langkah/.test(r.stdout), r.stdout);
    uji('A5 langkah dijalankan dengan cwd di akar', existsSync(gabung(d, 'jejak.txt')));
  }
  {
    const d = akar();
    const r = jalan(['--lengkap'], d);
    uji('A6 --lengkap menjalankan 8 langkah', r.status === 0 && jejak(d).length === LANGKAH.length, semua(r));
    uji('A7 vercel dijalankan dengan --cek', jejak(d).includes('buat-vercel-json.mjs --cek'), jejak(d).join('|'));
  }
  {
    const d = akar();
    const r = jalan(['--penuh'], d);
    uji('A8 --penuh menjalankan keamanan tanpa --cepat', r.status === 0 && jejak(d).includes('uji-keamanan.mjs') && !jejak(d).some((x) => x.includes('--cepat')), jejak(d).join('|'));
  }
  {
    const d = akar();
    const r = jalan(['--hanya=aset,validasi'], d);
    uji('A9 --hanya menjalankan nama itu saja, urutan daftar', r.status === 0 && jejak(d).map((x) => x.split(' ')[0]).join(',') === 'validasi-kursus.mjs,uji-aset.mjs', jejak(d).join('|'));
    const d2 = akar();
    const r2 = jalan(['--hanya=validasi,validasi,validasi'], d2);
    uji('A10 nama ganda hanya dijalankan sekali', r2.status === 0 && jejak(d2).length === 1, jejak(d2).join('|'));
  }
  {
    const d = akar();
    const r = jalan(['--daftar', '--lengkap'], d);
    uji('A11 --daftar tidak menjalankan apa pun dan keluar 0', r.status === 0 && jejak(d).length === 0 && r.stdout.includes('Langkah (8)'), semua(r));
    const r2 = jalan(['--bantuan'], d);
    uji('A12 --bantuan keluar 0 tanpa menjalankan langkah', r2.status === 0 && /Pakai:/.test(r2.stdout) && jejak(d).length === 0);
  }

  /* ---------- B. Kegagalan harus terdeteksi ---------- */
  {
    const d = akar({ 'impor-draf': 'console.error("galat-penanda-xyz");process.exit(1);' });
    const r = jalan([], d);
    uji('B1 satu langkah gagal: kode 1', r.status === 1, semua(r));
    uji('B2 langkah sesudahnya tetap jalan (bawaan)', jejak(d).length === 3, jejak(d).join('|'));
    uji('B3 keluaran langkah gagal ditampilkan', r.stdout.includes('galat-penanda-xyz'), r.stdout);
    uji('B4 ringkasan menyebut 1 gagal', /2 lulus, 0 lulus dengan bagian dilewati, 1 gagal/.test(r.stdout), r.stdout);
  }
  {
    const d = akar({ validasi: 'process.exit(1);' });
    const r = jalan(['--berhenti'], d);
    uji('B5 --berhenti: langkah sesudahnya tidak jalan', r.status === 1 && jejak(d).length === 1 && /2 tidak dijalankan/.test(r.stdout), semua(r));
    uji('B6 --berhenti tidak melaporkan lulus untuk yang tidak jalan', /TIDAK-JALAN\s+impor-draf/.test(r.stdout), r.stdout);
  }
  {
    const d = akar({ validasi: 'process.exit(2);' });
    const r = jalan([], d);
    uji('B7 kode 2 dari alat selain keamanan dihitung gagal', r.status === 1, semua(r));
  }
  {
    const d = akar({ keamanan: 'process.exit(2);' });
    const r = jalan([], d);
    uji('B8 kode 2 dari keamanan: lulus dengan bagian dilewati, kode 2', r.status === 2 && /1 lulus dengan bagian dilewati/.test(r.stdout), semua(r));
  }
  {
    const d = akar({ keamanan: 'process.exit(2);', validasi: 'process.exit(1);' });
    const r = jalan([], d);
    uji('B9 kegagalan menang atas kode 2', r.status === 1, semua(r));
  }
  {
    const d = akar({}, ['impor-draf']);
    const r = jalan([], d);
    uji('B10 skrip hilang dihitung gagal, bukan dilewati diam-diam', r.status === 1 && /skrip tidak ditemukan: tools\/uji-impor-draf\.mjs/.test(r.stdout), semua(r));
    uji('B11 langkah lain tetap jalan walau satu skrip hilang', jejak(d).length === 2, jejak(d).join('|'));
  }
  {
    const d = akar({ validasi: 'setInterval(()=>{},1000);' });
    const mulai = Date.now();
    const r = jalan(['--batas=1', '--hanya=validasi'], d);
    uji('B12 langkah yang menggantung dimatikan oleh batas waktu', r.status === 1 && /lewat batas waktu 1 detik/.test(r.stdout) && Date.now() - mulai < 20000, semua(r));
  }
  {
    const d = akar({ validasi: 'process.kill(process.pid,"SIGKILL");' });
    const r = jalan(['--hanya=validasi'], d);
    uji('B13 langkah yang dimatikan sinyal dihitung gagal', r.status === 1 && /sinyal SIGKILL/.test(r.stdout), semua(r));
  }
  {
    const d = akar({ validasi: 'throw new Error("meledak");' });
    const r = jalan(['--hanya=validasi'], d);
    uji('B14 pengecualian tak tertangkap dihitung gagal', r.status === 1, semua(r));
  }
  {
    const d = akar({ validasi: 'console.log("GAGAL: tampak gagal di teks");process.exit(0);' });
    const r = jalan(['--hanya=validasi'], d);
    uji('B15 alat ini hanya mempercayai kode keluar (teks GAGAL dengan kode 0 tetap lulus)', r.status === 0);
  }
  {
    const d = akar({ validasi: 'const b="x".repeat(1024*1024);for(let i=0;i<3;i++)process.stdout.write(b+"\\n");console.log("AKHIR-PENANDA");' });
    const r = jalan(['--hanya=validasi', '--tampil'], d);
    uji('B16 keluaran besar (3 MB) tidak membuat alat jatuh', r.status === 0 && r.stdout.includes('AKHIR-PENANDA'), r.status + ' ' + r.stderr.slice(0, 200));
    const d2 = akar({ validasi: 'const b="x".repeat(1024*1024);for(let i=0;i<3;i++)process.stdout.write(b+"\\n");console.log("AKHIR-PENANDA");process.exitCode=1;' });
    const r2 = jalan(['--hanya=validasi'], d2);
    uji('B17 ekor keluaran langkah gagal dipotong per baris (tidak mencetak 3 MB)', r2.status === 1 && r2.stdout.length < 20000 && r2.stdout.includes('AKHIR-PENANDA'), r2.stdout.length);
  }
  {
    const d = akar({ validasi: 'for(let i=0;i<200;i++)console.log("baris-"+i);process.exit(1);' });
    const r = jalan(['--hanya=validasi'], d);
    uji('B18 hanya 30 baris terakhir ditampilkan untuk langkah gagal', r.stdout.includes('baris-199') && r.stdout.includes('baris-170') && !r.stdout.includes('baris-169\n'), r.stdout.slice(0, 200));
  }

  {
    const d = akar({ validasi: 'const b="y".repeat(1024*1024);for(let i=0;i<70;i++)process.stdout.write(b);' });
    const r = jalan(['--hanya=validasi'], d);
    uji('B19 keluaran melebihi 64 MB dihitung gagal, bukan lulus', r.status === 1 && /melebihi batas 64 MB/.test(r.stdout), r.status + ' ' + r.stdout.slice(0, 300) + r.stderr.slice(0, 200));
  }

  /* ---------- C. Masukan jahat dan pemakaian salah ---------- */
  {
    const d = akar();
    for (const [nama, arg] of [
      ['opsi tak dikenal', '--hapus-semua'],
      ['opsi mirip perintah shell', '--lengkap;touch PWNED'],
      ['argumen tanpa tanda', 'validasi'],
      ['--hanya kosong', '--hanya='],
      ['--hanya dengan titik koma', '--hanya=validasi;touch PWNED'],
      ['--hanya dengan substitusi', '--hanya=$(touch PWNED)'],
      ['--hanya dengan backtick', '--hanya=`touch PWNED`'],
      ['--hanya nama asing', '--hanya=tidak-ada'],
      ['--hanya jalur', '--hanya=../../etc/passwd'],
      ['--hanya huruf besar', '--hanya=VALIDASI'],
      ['--hanya koma kosong', '--hanya=validasi,,aset'],
      ['--batas bukan angka', '--batas=abc'],
      ['--batas negatif', '--batas=-5'],
      ['--batas nol', '--batas=0'],
      ['--batas terlalu besar', '--batas=99999999'],
      ['--batas desimal', '--batas=1.5'],
      ['--batas notasi ilmiah', '--batas=1e3'],
      ['--batas kosong', '--batas='],
      ['--akar kosong', '--akar='],
    ]) {
      const r = spawnSync(process.execPath, [skrip, '--akar=' + d, arg], { encoding: 'utf8', cwd: d, timeout: 60000 });
      uji(`C1 ${nama}: ditolak kode 1`, r.status === 1, r.status + ' ' + semua(r));
    }
    uji('C2 tidak ada langkah yang jalan dan tidak ada berkas PWNED', jejak(d).length === 0 && !existsSync(gabung(d, 'PWNED')) && !existsSync('PWNED'), jejak(d).join('|'));
  }
  {
    const r = spawnSync(process.execPath, [skrip, '--akar=' + gabung(tmp, 'tidak-ada-folder')], { encoding: 'utf8' });
    uji('C3 akar yang tidak ada ditolak', r.status === 1 && /akar tidak berisi folder tools/.test(r.stderr), semua(r));
    const f = gabung(tmp, 'berkas-biasa'); writeFileSync(f, 'x');
    const r2 = spawnSync(process.execPath, [skrip, '--akar=' + f], { encoding: 'utf8' });
    uji('C4 akar berupa berkas ditolak', r2.status === 1, semua(r2));
    const kosong = gabung(tmp, 'akar-kosong'); mkdirSync(gabung(kosong, 'tools'), { recursive: true });
    const r3 = spawnSync(process.execPath, [skrip, '--akar=' + kosong], { encoding: 'utf8' });
    uji('C5 akar tanpa skrip: semua langkah gagal, bukan lulus kosong', r3.status === 1 && /3 gagal/.test(r3.stdout), semua(r3));
  }
  {
    // Nama folder berisi karakter shell: tidak boleh ditafsirkan.
    const d = gabung(tmp, 'a b $(touch SUNTIK) `x` ; &');
    mkdirSync(gabung(d, 'tools'), { recursive: true });
    for (const l of LANGKAH) writeFileSync(gabung(d, l.skrip), JEJAK + 'process.exit(0);');
    const r = jalan([], d);
    uji('C6 folder dengan karakter shell tetap jalan tanpa suntikan', r.status === 0 && jejak(d).length === 3 && !existsSync(gabung(d, 'SUNTIK')) && !existsSync('SUNTIK'), semua(r));
  }
  {
    // Keluaran jahat: ESC, OSC judul terminal, bidi, karakter kontrol, C1.
    const jahat = 'console.log("\\x1b]0;DIBAJAK\\x07\\x1b[2J\\x1b[31mmerah\\x1b[0m \\u202eterbalik\\u2066 \\u009b31m \\x00nol \\x08mundur\\r-timpa");process.exit(1);';
    const d = akar({ validasi: jahat });
    const r = jalan(['--hanya=validasi'], d);
    // eslint-disable-next-line no-control-regex
    const bersih = !/[\u001b\u0007\u0000\u0008‮⁦\u009b\r]/.test(r.stdout);
    uji('C7 keluaran jahat (ESC, OSC, bidi, C1, NUL) dibersihkan sebelum ditampilkan', r.status === 1 && bersih && r.stdout.includes('merah'), JSON.stringify(r.stdout));
    const d2 = akar({ validasi: jahat.replace('process.exit(1)', 'process.exit(0)') });
    const r2 = jalan(['--hanya=validasi', '--tampil'], d2);
    uji('C8 --tampil juga membersihkan keluaran', r2.status === 0 && !/[\u001b\u0007\u0000‮⁦\u009b]/.test(r2.stdout), JSON.stringify(r2.stdout));
  }
  {
    // Langkah yang berusaha memengaruhi alat: menulis ke stdout kata-kata ringkasan palsu.
    const d = akar({ validasi: 'console.log("3 lulus, 0 lulus dengan bagian dilewati, 0 gagal, 0 tidak dijalankan, dari 3 langkah");process.exit(1);' });
    const r = jalan(['--hanya=validasi'], d);
    uji('C9 ringkasan palsu dari langkah tidak mengubah kode keluar', r.status === 1, semua(r));
  }
  {
    const d = akar({ validasi: 'process.exit(1);' });
    const r = spawnSync(process.execPath, [skrip, '--akar=' + d, '--hanya=validasi'], { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' }, cwd: tmp });
    uji('C10 dijalankan dari cwd lain tetap memakai --akar', r.status === 1 && jejak(d).length === 1);
  }

  {
    const r = spawnSync(process.execPath, [skrip, '--hanya=$(touch PWNED)'], { encoding: 'utf8' });
    uji('C11 karakter di luar a-z dan strip ditolak sebagai nilai tidak valid (bukan sekadar nama asing)', r.status === 1 && /nilai --hanya tidak valid/.test(r.stderr), r.stderr);
    const r2 = spawnSync(process.execPath, [skrip, '--hanya=\u001b]0;X\u0007'], { encoding: 'utf8' });
    uji('C12 pesan galat tidak mengulang karakter kontrol dari argumen', r2.status === 1 && !/[\u001b\u0007]/.test(r2.stderr), JSON.stringify(r2.stderr));
  }

  /* ---------- D. Fungsi murni ---------- */
  {
    uji('D1 bersihkan membuang ESC dan mempertahankan baris baru dan tab', bersihkan('a\x1b[0mb\n\tc') === 'a�[0mb\n\tc', JSON.stringify(bersihkan('a\x1b[0mb\n\tc')));
    uji('D2 bersihkan mengubah CRLF dan CR menjadi baris baru', bersihkan('a\r\nb\rc') === 'a\nb\nc');
    uji('D3 bersihkan menerima bukan-string', bersihkan(undefined) === 'undefined' && bersihkan(12) === '12');
    uji('D4 urai: bawaan', JSON.stringify(urai([])) === JSON.stringify({ lengkap: false, penuh: false, daftar: false, berhenti: false, tampil: false, bantuan: false, hanya: null, batas: 300, akar: null, galat: null }));
    uji('D5 urai: --batas=1800 dan =1 batas yang sah', urai(['--batas=1800']).batas === 1800 && urai(['--batas=1']).batas === 1);
    uji('D6 urai: --batas=1801 ditolak', urai(['--batas=1801']).galat !== null);
    uji('D7 pilihLangkah: bawaan = langkah inti saja', pilihLangkah(urai([])).langkah.map((l) => l.nama).join() === NAMA_INTI.join());
    uji('D8 pilihLangkah: --lengkap = semua', pilihLangkah(urai(['--lengkap'])).langkah.length === LANGKAH.length);
    uji('D9 nama langkah unik dan skrip ada di repo', new Set(LANGKAH.map((l) => l.nama)).size === LANGKAH.length && LANGKAH.every((l) => existsSync(gabung(asal, l.skrip))), LANGKAH.filter((l) => !existsSync(gabung(asal, l.skrip))).map((l) => l.skrip).join());
    uji('D10 hanya langkah keamanan yang boleh memakai kode 2 sebagai lewati', LANGKAH.filter((l) => l.kodeDua).map((l) => l.nama).join() === 'keamanan');
    uji('D11 tidak ada langkah yang memakai shell atau argumen berbahaya', LANGKAH.every((l) => /^tools\/[a-z-]+\.mjs$/.test(l.skrip) && l.args.every((a) => /^--[a-z]+$/.test(a))));
  }

  /* ---------- E. Repo nyata (kontrol positif) ---------- */
  {
    const status = () => spawnSync('git', ['status', '--porcelain'], { cwd: asal, encoding: 'utf8' }).stdout;
    const sebelum = status();
    const r = spawnSync(process.execPath, [skrip], { encoding: 'utf8', cwd: tmp, timeout: 300000 });
    uji('E1 repo nyata: perintah bawaan lulus (kode 0)', r.status === 0 && /3 lulus, 0 lulus dengan bagian dilewati, 0 gagal/.test(r.stdout), semua(r).slice(-600));
    uji('E2 repo nyata: menjalankan alat tidak mengubah berkas repo', status() === sebelum);
    const r2 = spawnSync(process.execPath, [skrip, '--daftar', '--lengkap'], { encoding: 'utf8' });
    uji('E3 repo nyata: --daftar --lengkap menyebut 8 langkah', r2.status === 0 && r2.stdout.includes('Langkah (8)'));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`${lulus} lulus, ${gagal} gagal dari ${nomor} uji.`);
process.exit(gagal ? 1 : 0);
