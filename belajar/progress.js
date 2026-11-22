/* Progres belajar NERUVIA, disimpan di browser (localStorage). Tidak dikirim ke server. */
(function (g) {
  var KEY = 'neruvia.progress.v1';
  var DAY = 86400000;
  /* Aturan data (S2): id pelajaran huruf kecil/angka/strip; tanggal hanya ISO UTC "YYYY-MM-DDTHH:mm:ss(.sss)Z". */
  var ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
  function okId(id) { return typeof id === 'string' && ID_RE.test(id) && id !== 'constructor' && id !== 'prototype'; }   /* __proto__ sudah ditolak ID_RE */
  var ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?Z$/;
  var MIN_MS = Date.UTC(2026, 0, 1);          /* NERUVIA belum ada sebelum 2026 */
  var FUTURE_SLACK = DAY;                     /* toleransi jam perangkat: 1 hari ke depan */
  /* kembalikan ms epoch bila v tanggal ISO valid dan tidak sebelum 1 Jan 2026; selain itu NaN */
  function isoMs(v) {
    if (typeof v !== 'string' || v.length > 30) return NaN;
    var m = ISO_RE.exec(v); if (!m) return NaN;
    var t = Date.parse(v); if (isNaN(t) || t < MIN_MS) return NaN;
    var d = new Date(t);   /* tolak 31 Feb dan sejenisnya: tanggal hasil parse harus sama dengan tulisan */
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() + 1 !== +m[2] || d.getUTCDate() !== +m[3] || d.getUTCHours() !== +m[4]) return NaN;
    return t;
  }
  /* salin hanya entri yang id dan tanggalnya valid, ke objek tanpa prototipe */
  function clean(src) {
    var out = Object.create(null);
    if (!src || typeof src !== 'object' || Array.isArray(src)) return out;
    Object.keys(src).forEach(function (id) {
      if (okId(id) && !isNaN(isoMs(src[id]))) out[id] = src[id];
    });
    return out;
  }
  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { done: clean(o && o.done) };
    } catch (e) { return { done: clean(null) }; }
  }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function dayKey(d) { /* tanggal lokal YYYY-MM-DD */
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayNum(k) { var p = k.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY); }

  /* pola ikon piksel 8x8 (# = terisi) */
  var ICON = {
    star:  ['...##...','...##...','########','.######.','..####..','..####..','.##..##.','.#....#.'],
    check: ['........','......##','.....##.','##..##..','.####...','..##....','........','........'],
    flame: ['....#...','...##...','...###..','..####.#','.#######','.#######','.#######','..#####.'],
    bolt:  ['....###.','...###..','..###...','.######.','...###..','..###...','..##....','.#......'],
    lens:  ['..####..','.#....#.','#......#','#......#','.#....#.','..####.#','......##','.......#']
  };

  g.NVProgress = {
    icons: ICON,
    isDone: function (id) { return !!read().done[id]; },
    mark: function (id, on) {
      if (!okId(id)) return false;
      var o = read(), now = new Date().toISOString();
      if (on && isNaN(isoMs(now))) return false;   /* jam perangkat salah (sebelum 2026): jangan simpan tanggal yang nanti dibuang */
      if (on) o.done[id] = o.done[id] || now; else delete o.done[id];
      return write(o);
    },
    all: function () { return read().done; },
    /* ringkasan untuk daftar pelajaran [{id,xp}] */
    summary: function (lessons) {
      var d = read().done, n = 0, xp = 0, total = 0;
      lessons.forEach(function (p) { total += p.xp; if (d[p.id]) { n++; xp += p.xp; } });
      return { done: n, count: lessons.length, xp: xp, xpTotal: total };
    },
    /* streak: hari beruntun (tanggal lokal) dengan minimal satu pelajaran selesai */
    streak: function (now) {
      var d = read().done, days = {}, list = [];
      Object.keys(d).forEach(function (id) {
        var t = new Date(d[id]); if (isNaN(t)) return;
        var k = dayKey(t); if (!days[k]) { days[k] = 1; list.push(dayNum(k)); }
      });
      list.sort(function (a, b) { return a - b; });
      var best = 0, run = 0;
      list.forEach(function (n, i) { run = (i && n === list[i - 1] + 1) ? run + 1 : 1; if (run > best) best = run; });
      var today = dayNum(dayKey(now || new Date())), cur = 0, set = {};
      list.forEach(function (n) { set[n] = 1; });
      var start = set[today] ? today : (set[today - 1] ? today - 1 : null);
      if (start !== null) { for (var n = start; set[n]; n--) cur++; }
      return { current: cur, best: best };
    },
    /* badge dihitung dari data kursus: [{id,judul,ikon,syarat,aktif}] */
    badges: function (kursus, now) {
      var d = read().done, all = [], byMod = {}, latihan = [];
      kursus.level.forEach(function (l) { l.modul.forEach(function (m) {
        byMod[m.id] = m.pelajaran;
        m.pelajaran.forEach(function (p) { all.push(p); if (p.jenis === 'Latihan') latihan.push(p); });
      }); });
      var sum = g.NVProgress.summary(all), st = g.NVProgress.streak(now);
      var m1 = byMod['l1-m1'] || [];
      return [
        { id: 'pertama', judul: 'Langkah Pertama', ikon: 'star',  syarat: 'Selesaikan 1 pelajaran',      aktif: sum.done >= 1 },
        { id: 'latihan', judul: 'Si Pengecek',     ikon: 'lens',  syarat: 'Selesaikan 1 latihan',        aktif: latihan.some(function (p) { return d[p.id]; }) },
        { id: 'xp50',    judul: '50 XP',           ikon: 'bolt',  syarat: 'Kumpulkan 50 XP',             aktif: sum.xp >= 50 },
        { id: 'streak3', judul: 'Api Kecil',       ikon: 'flame', syarat: 'Belajar 3 hari beruntun',     aktif: st.best >= 3 },
        { id: 'modul1',  judul: 'Modul 1 Tuntas',  ikon: 'check', syarat: 'Selesaikan semua pelajaran Modul 1', aktif: m1.length > 0 && m1.every(function (p) { return d[p.id]; }) }
      ];
    },
    /* ekspor: objek siap di-JSON-kan */
    exportData: function () { return { app: 'neruvia', versi: 1, diekspor: new Date().toISOString(), done: read().done }; },
    /* impor: validasi ketat, hanya id yang dikenal, gabung (ambil waktu paling awal). */
    importData: function (obj, validIds) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.app !== 'neruvia' || obj.versi !== 1 ||
          !obj.done || typeof obj.done !== 'object' || Array.isArray(obj.done) || !Array.isArray(validIds)) return { ok: false, error: 'Format berkas tidak dikenali.' };
      var keys = Object.keys(obj.done);
      if (keys.length > 500) return { ok: false, error: 'Berkas terlalu besar.' };
      var o = read(), added = 0, skipped = 0, limit = Date.now() + FUTURE_SLACK;
      keys.forEach(function (id) {
        var v = obj.done[id], t = isoMs(v);
        /* tolak: id di luar daftar putih atau berformat aneh, tanggal bukan ISO, sebelum 2026, atau di masa depan */
        if (!okId(id) || validIds.indexOf(id) < 0 || isNaN(t) || t > limit) { skipped++; return; }
        var iso = new Date(t).toISOString();
        if (!o.done[id]) { o.done[id] = iso; added++; }
        else if (t < Date.parse(o.done[id])) o.done[id] = iso;
      });
      if (!write(o)) return { ok: false, error: 'Progres tidak bisa disimpan di browser ini.' };
      return { ok: true, added: added, skipped: skipped };
    }
  };
})(window);
