// Validasi content/kursus.json. Pakai: node tools/validasi-kursus.mjs
import { readFileSync } from 'node:fs';
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
    });
  });
});

if (errs.length) { console.error(`GAGAL, ${errs.length} masalah:\n- ` + errs.join('\n- ')); process.exit(1); }
const n = d.level.reduce((a, l) => a + l.modul.reduce((b, m) => b + m.pelajaran.length, 0), 0);
console.log(`OK: ${d.level.length} level, ${n} pelajaran, ${ids.size} id unik.`);
