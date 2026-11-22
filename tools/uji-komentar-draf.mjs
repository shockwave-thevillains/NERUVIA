// Uji kerangka komentar (belajar/komentar-draf.js) tanpa jaringan. DRAF nonaktif.
// Pakai: node tools/uji-komentar-draf.mjs   (keluar 0 bila semua lulus; uji browser dilewati bila Playwright tidak ada)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const kode = readFileSync(new URL('../belajar/komentar-draf.js', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/draf/komentar.sql', import.meta.url), 'utf8');
let gagal = 0, lulus = 0;
const cek = (nama, ok) => { if (ok) lulus++; else gagal++; console.log((ok ? 'lulus  ' : 'GAGAL  ') + nama); };

const window = {};
vm.runInNewContext(kode, { window, String, Array, Date, isNaN, RegExp }, { filename: 'komentar-draf.js' });
const K = window.NVKomentar;

cek('flag nonaktif secara bawaan', K.aktif === false);
cek('pasang() tidak melakukan apa pun saat flag nonaktif', K.pasang({}, 'l1-m1-p1', { adaptor: {} }) === false);
cek('berkas tidak memanggil fetch/XMLHttpRequest/innerHTML/eval', !/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval|new Function)\b/.test(kode.replace(/\/\*[\s\S]*?\*\//g, '')));
cek('tidak ada kunci atau URL layanan di berkas', !/supabase\.co|sb_publishable|service_role|https?:\/\//i.test(kode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/https\?:/g, '')));

const ok = (t) => K.validasi(t).ok;
cek('komentar biasa diterima', ok('Penjelasannya jelas, terima kasih.'));
cek('emoji dan Unicode diterima', ok('Mantap 👍 café ñ 日本'));
cek('kosong ditolak', !ok('') && !ok('   \n  '));
cek('bukan teks ditolak', !ok(null) && !ok({}) && !ok(42) && !ok(['a']));
cek('500 diterima, 501 ditolak', ok('a'.repeat(500)) && !ok('a'.repeat(501)));
cek('masukan sangat panjang ditolak cepat', !ok('a'.repeat(1e6)));
cek('tag HTML ditolak', !ok('<img src=x onerror=alert(1)>') && !ok('a > b'));
cek('tautan ditolak (huruf besar, www, javascript:, data:)', !ok('HTTPS://x.test') && !ok('cek www.x.test') && !ok('javascript:alert(1)') && !ok('data:text/html,x') && !ok('ftp://x'));
cek('karakter kontrol dan lebar nol dibuang, bukan ditolak', K.validasi('ke\u200Bcoh\u0007').nilai === 'kecoh');
cek('pengecoh bidi dibuang', K.validasi('a\u202Eb').nilai === 'ab');
cek('NFKC: tanda < versi lebar penuh dinormalkan lalu ditolak', !ok('＜script＞'));
cek('NFKC: "ｈｔｔｐ：" lebar penuh dinormalkan lalu ditolak sebagai tautan', !ok('ｈｔｔｐ：//x.test'));
cek('tiga baris kosong dirapikan menjadi dua', K.validasi('a\n\n\n\nb').nilai === 'a\n\nb');
cek('CRLF menjadi LF', K.validasi('a\r\nb').nilai === 'a\nb');
cek('spasi ujung dibuang', K.validasi('  halo  ').nilai === 'halo');
cek('kunci __proto__ sebagai teks tidak berbahaya', ok('__proto__') && ({}).polluted === undefined);

/* kesamaan kelas karakter dengan SQL (server tidak boleh lebih longgar) */
const bagian = '\\u200B-\\u200F\\u2028-\\u202E\\u2060-\\u206F\\uFEFF\\uFFF9-\\uFFFC';
cek('daftar karakter terlarang JS dan SQL sama', kode.includes(bagian) && sql.includes(bagian));
cek('batas 500 sama di JS dan SQL', /MAKS = 500/.test(kode) && /char_length\(isi\) between 1 and 500/.test(sql));
cek('daftar tautan terlarang sama di JS dan SQL', /https\?:\|ftp:\|javascript:\|data:\|www\\\./.test(kode) && /https\?:\|ftp:\|javascript:\|data:\|www\\\./.test(sql));

/* uji browser: render() harus menaruh payload sebagai teks */
let pw = null;
try { pw = createRequire(import.meta.url)('playwright'); } catch { console.log('PERINGATAN: Playwright tidak ada, uji browser dilewati'); }
if (pw) {
  const b = await pw.chromium.launch();
  const p = await b.newPage();
  const galat = []; p.on('pageerror', (e) => galat.push(String(e))); p.on('dialog', (d) => { galat.push('dialog: ' + d.message()); d.dismiss(); });
  await p.setContent('<!doctype html><div id="w"></div>');
  await p.addScriptTag({ content: kode });
  const r = await p.evaluate(() => {
    const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=2<\/script>';
    const n = NVKomentar.render(document.getElementById('w'), [
      { nama_tampil: payload, isi: payload, created_at: '2026-11-22T00:00:00Z' },
      { nama_tampil: 'ok', isi: 'x'.repeat(2000), created_at: 'bukan tanggal' },
      null, 5, { isi: undefined }
    ]);
    const w = document.getElementById('w');
    return { n, xss: window.__xss === undefined, img: w.querySelectorAll('img,script').length, teks: w.querySelector('.komentar-isi').textContent === payload, panjang: w.querySelectorAll('.komentar-isi')[1].textContent.length };
  });
  cek('render: 3 entri sah digambar, entri rusak dilewati', r.n === 3);
  cek('render: payload XSS tampil sebagai teks (tanpa eksekusi, tanpa elemen img/script)', r.xss && r.img === 0 && r.teks);
  cek('render: isi dipotong ke 500 karakter', r.panjang === 500);
  const kosong = await p.evaluate(() => { const w = document.getElementById('w'); NVKomentar.render(w, []); return w.textContent; });
  cek('render: daftar kosong menampilkan pesan', kosong === 'Belum ada komentar.');
  cek('tidak ada galat skrip atau dialog', galat.length === 0);
  await b.close();
}
console.log('\n' + lulus + ' lulus, ' + gagal + ' gagal');
process.exit(gagal ? 1 : 0);
