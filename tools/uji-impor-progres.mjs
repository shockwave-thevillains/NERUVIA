// Uji impor dan baca progres (belajar/progress.js) tanpa browser dan tanpa jaringan.
// Pakai: node tools/uji-impor-progres.mjs   (keluar 0 bila semua lulus)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const kode = readFileSync(new URL('../belajar/progress.js', import.meta.url), 'utf8');
function baru(simpan) {
  const store = new Map(simpan ? [['neruvia.progress.v1', simpan]] : []);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const window = {};
  vm.runInNewContext(kode, { window, localStorage, Date, JSON, Object, Array, Math, isNaN, String, Number }, { filename: 'progress.js' });
  return { NV: window.NVProgress, store };
}
const IDS = ['l1-m1-p1', 'l1-m1-p2'];
const besok = new Date(Date.now() + 2 * 864e5).toISOString();
const kemarin = new Date(Date.now() - 864e5).toISOString();
const bagus = '2026-11-21T10:00:00.000Z';
const berkas = (done) => ({ app: 'neruvia', versi: 1, done });

let gagal = 0;
const cek = (nama, kondisi) => { if (!kondisi) gagal++; console.log((kondisi ? 'lulus  ' : 'GAGAL  ') + nama); };
const hasil = (done, validIds = IDS) => { const { NV } = baru(); const r = NV.importData(berkas(done), validIds); return { r, kini: NV.all() }; };
const diterima = (v) => { const { r, kini } = hasil({ 'l1-m1-p1': v }); return r.ok && r.added === 1 && !!kini['l1-m1-p1']; };

cek('tanggal ISO sah diterima', diterima(bagus));
cek('tanggal ISO tanpa milidetik diterima', diterima('2026-11-21T10:00:00Z'));
['1', 'March 7', '2026-11-21', '2026-11-21 10:00:00', '2026-11-21T10:00:00+07:00', '9999-12-31T00:00:00.000Z',
 '+275760-09-13T00:00:00.000Z', '0001-01-01T00:00:00.000Z', '2025-12-31T23:59:59.000Z', '2026-02-31T10:00:00.000Z',
 '2026-13-01T10:00:00.000Z', '2026-11-21T24:00:00.000Z', '2026-11-21T10:60:00.000Z', '', ' 2026-11-21T10:00:00.000Z', besok]
  .forEach((v) => cek('tanggal ditolak: ' + JSON.stringify(v), !diterima(v)));
[1, 1.5, null, true, {}, [], { x: 1 }, ['2026-11-21T10:00:00.000Z']]
  .forEach((v) => cek('nilai bukan teks ditolak: ' + JSON.stringify(v), !diterima(v)));
cek('tanggal kemarin diterima', diterima(kemarin));
cek('id di luar daftar putih dilewati', hasil({ 'l9-m9-p9': bagus }).r.skipped === 1);
cek('id berformat aneh dilewati', hasil({ 'L1-M1-P1': bagus, 'l1 m1': bagus, '../x': bagus, ['a'.repeat(60)]: bagus }, ['L1-M1-P1', 'l1 m1', '../x', 'a'.repeat(60)]).r.added === 0);

// kunci berbahaya
const proto = JSON.parse('{"app":"neruvia","versi":1,"done":{"__proto__":"' + bagus + '","constructor":"' + bagus + '","prototype":"' + bagus + '","l1-m1-p1":"' + bagus + '"}}');
{ const { NV } = baru(); const r = NV.importData(proto, IDS);
  cek('__proto__/constructor/prototype dilewati, id sah masuk', r.ok && r.added === 1 && r.skipped === 3);
  cek('Object.prototype tidak tercemar', ({}).polluted === undefined && Object.getPrototypeOf(NV.all()) === null && !('l1-m1-p1' in {})); }
{ const { NV } = baru(); const r = NV.importData(proto, ['__proto__', 'constructor', 'prototype', 'l1-m1-p1']);
  cek('kunci berbahaya tetap ditolak walau ada di daftar id', r.added === 1 && r.skipped === 3); }

// bentuk berkas
const salah = [null, 1, 'x', [], {}, { app: 'lain', versi: 1, done: {} }, { app: 'neruvia', versi: '1', done: {} }, { app: 'neruvia', versi: 2, done: {} },
  { app: 'neruvia', versi: 1 }, { app: 'neruvia', versi: 1, done: [] }, { app: 'neruvia', versi: 1, done: 'x' }, { app: 'neruvia', versi: 1, done: null }];
salah.forEach((o, i) => { const { NV } = baru(); cek('bentuk berkas salah #' + i + ' ditolak', NV.importData(o, IDS).ok === false); });
{ const { NV } = baru(); cek('daftar id bukan array ditolak', NV.importData(berkas({}), 'l1-m1-p1').ok === false); }
{ const besar = {}; for (let i = 0; i < 501; i++) besar['l1-m1-p' + i] = bagus;
  const { NV } = baru(); cek('lebih dari 500 kunci ditolak', NV.importData(berkas(besar), Object.keys(besar)).ok === false); }

// gabung: ambil waktu paling awal
{ const { NV } = baru(); NV.importData(berkas({ 'l1-m1-p1': '2026-11-21T10:00:00.000Z' }), IDS);
  NV.importData(berkas({ 'l1-m1-p1': '2026-11-20T08:00:00.000Z' }), IDS);
  cek('gabung memakai waktu paling awal', NV.all()['l1-m1-p1'] === '2026-11-20T08:00:00.000Z');
  NV.importData(berkas({ 'l1-m1-p1': '2026-11-22T08:00:00.000Z' }), IDS);
  cek('gabung tidak memundurkan waktu', NV.all()['l1-m1-p1'] === '2026-11-20T08:00:00.000Z'); }

// baca dari localStorage yang dirusak (K9)
{ const rusak = JSON.stringify({ done: { 'l1-m1-p1': { x: 1 }, 'l1-m1-p2': bagus, '__proto__': bagus, 'constructor': bagus, 'x y': bagus, 'l1-m1-p3': 'kemarin' } });
  const { NV } = baru(rusak); const k = Object.keys(NV.all());
  cek('baca: entri rusak dibuang, entri sah tinggal', k.length === 1 && k[0] === 'l1-m1-p2');
  cek('baca: isDone tidak terkecoh warisan prototipe', NV.isDone('constructor') === false && NV.isDone('l1-m1-p1') === false && NV.isDone('l1-m1-p2') === true);
  cek('baca: summary menghitung hanya yang sah', NV.summary([{ id: 'l1-m1-p1', xp: 10 }, { id: 'l1-m1-p2', xp: 10 }]).done === 1); }
{ const { NV } = baru('bukan json {'); cek('baca: JSON rusak tidak melempar galat', Object.keys(NV.all()).length === 0); }
{ const { NV } = baru('[]'); cek('baca: larik di puncak diabaikan', Object.keys(NV.all()).length === 0); }

// mark dan ekspor
{ const { NV } = baru();
  cek('mark id sah berhasil', NV.mark('l1-m1-p1', true) === true && NV.isDone('l1-m1-p1'));
  cek('mark id aneh ditolak', NV.mark('__proto__', true) === false && NV.mark('<img>', true) === false && NV.mark(5, true) === false);
  const e = NV.exportData(); cek('ekspor berbentuk sah dan bisa diimpor ulang', e.app === 'neruvia' && e.versi === 1 && baru().NV.importData(JSON.parse(JSON.stringify(e)), IDS).added === 1);
  NV.mark('l1-m1-p1', false); cek('mark off menghapus', !NV.isDone('l1-m1-p1')); }

console.log(gagal ? `\n${gagal} uji GAGAL` : '\nSemua uji lulus');
process.exit(gagal ? 1 : 0);
