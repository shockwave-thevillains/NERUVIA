// Validasi content/kursus.json. Pakai: node tools/validasi-kursus.mjs
import { readFileSync, existsSync } from 'node:fs';
const file = new URL('../content/kursus.json', import.meta.url);
const errs = [];
const err = (m) => errs.push(m);
let d;
try { d = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error('JSON tidak valid:', e.message); process.exit(1); }

const JENIS = Object.keys(d.xp_per_jenis || {});
const STATUS = ['gratis', 'segera'];
const ISI = ['belum', 'draf', 'final'];
const ids = new Set();
const uniq = (id, where) => { if (!id) return err(`${where}: id kosong`); if (ids.has(id)) err(`${where}: id ganda "${id}"`); ids.add(id); };

if (!JENIS.length) err('xp_per_jenis kosong');
if (!Array.isArray(d.level) || !d.level.length) err('level kosong');
(d.level || []).forEach((l, i) => {
  const w = `level[${i}]`;
  uniq(l.id, w);
  if (!l.judul) err(`${w}: judul kosong`);
  if (!l.ringkasan) err(`${w}: ringkasan kosong`);
  if (l.nomor !== i + 1) err(`${w}: nomor harus ${i + 1}`);
  if (!STATUS.includes(l.status)) err(`${w}: status harus salah satu dari ${STATUS}`);
  if (!Array.isArray(l.tag)) err(`${w}: tag harus array`);
  if (!Array.isArray(l.modul)) return err(`${w}: modul harus array`);
  if (l.status === 'gratis' && !l.modul.length) err(`${w}: level gratis wajib punya modul`);
  l.modul.forEach((m, j) => {
    const wm = `${w}.modul[${j}]`;
    uniq(m.id, wm);
    if (!String(m.id).startsWith(l.id + '-')) err(`${wm}: id harus berawalan "${l.id}-"`);
    if (!m.judul) err(`${wm}: judul kosong`);
    if (!Array.isArray(m.pelajaran) || !m.pelajaran.length) return err(`${wm}: pelajaran kosong`);
    m.pelajaran.forEach((p, k) => {
      const wp = `${wm}.pelajaran[${k}]`;
      uniq(p.id, wp);
      if (!String(p.id).startsWith(m.id + '-')) err(`${wp}: id harus berawalan "${m.id}-"`);
      if (!p.judul) err(`${wp}: judul kosong`);
      if (!JENIS.includes(p.jenis)) err(`${wp}: jenis harus salah satu dari ${JENIS}`);
      else if (p.xp !== d.xp_per_jenis[p.jenis]) err(`${wp}: xp ${p.xp} tidak sama dengan aturan ${d.xp_per_jenis[p.jenis]} untuk ${p.jenis}`);
      if (!ISI.includes(p.isi)) err(`${wp}: isi harus salah satu dari ${ISI}`);
      const fp = new URL(`../content/pelajaran/${p.id}.json`, import.meta.url);
      if (p.isi === 'belum') { if (existsSync(fp)) err(`${wp}: ada berkas isi tetapi isi masih "belum"`); }
      else if (!existsSync(fp)) err(`${wp}: isi "${p.isi}" tetapi content/pelajaran/${p.id}.json tidak ada`);
      else cekIsi(p, fp, wp);
    });
  });
});

function cekIsi(p, fp, wp) {
  let c; try { c = JSON.parse(readFileSync(fp, 'utf8')); } catch (e) { return err(`${wp}: JSON isi tidak valid (${e.message})`); }
  if (c.id !== p.id) err(`${wp}: id di berkas isi (${c.id}) berbeda`);
  if (c.status !== p.isi) err(`${wp}: status isi "${c.status}" berbeda dengan kursus.json "${p.isi}"`);
  if (!c.tujuan) err(`${wp}: tujuan kosong`);
  if (!Array.isArray(c.bagian) || !c.bagian.length) err(`${wp}: bagian kosong`);
  else c.bagian.forEach((b, i) => { if (!b.judul || !Array.isArray(b.paragraf) || !b.paragraf.length || b.paragraf.some((x) => typeof x !== 'string' || !x.trim())) err(`${wp}: bagian[${i}] tidak lengkap`); });
  if (!c.contoh || !c.contoh.teks) err(`${wp}: contoh kosong`);
  if (!c.latihan || !c.latihan.petunjuk) err(`${wp}: latihan kosong`);
  if (!Array.isArray(c.cek) || c.cek.length !== 3) err(`${wp}: cek harus 3 soal`);
  else c.cek.forEach((q, i) => {
    if (!q.tanya || !Array.isArray(q.opsi) || q.opsi.length < 3 || q.opsi.length > 5) err(`${wp}: cek[${i}] butuh 3–5 opsi`);
    else if (!Number.isInteger(q.benar) || q.benar < 0 || q.benar >= q.opsi.length) err(`${wp}: cek[${i}].benar di luar opsi`);
    if (!q.jelas) err(`${wp}: cek[${i}] tanpa penjelasan`);
  });
  if (!Array.isArray(c.ringkasan) || c.ringkasan.length !== 3) err(`${wp}: ringkasan harus 3 butir`);
  if (/\b(video|tonton)\b/i.test(JSON.stringify(c))) err(`${wp}: materi tulisan tidak boleh merujuk video`);
}
if (errs.length) { console.error(`GAGAL, ${errs.length} masalah:\n- ` + errs.join('\n- ')); process.exit(1); }
const n = d.level.reduce((a, l) => a + l.modul.reduce((b, m) => b + m.pelajaran.length, 0), 0);
console.log(`OK: ${d.level.length} level, ${n} pelajaran, ${ids.size} id unik.`);
