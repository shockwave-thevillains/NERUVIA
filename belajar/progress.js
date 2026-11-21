/* Progres belajar NERUVIA, disimpan di browser (localStorage). Tidak dikirim ke server. */
(function (g) {
  var KEY = 'neruvia.progress.v1';
  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (!o || typeof o !== 'object' || typeof o.done !== 'object' || !o.done) o = { done: {} };
      return o;
    } catch (e) { return { done: {} }; }
  }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  g.NVProgress = {
    isDone: function (id) { return !!read().done[id]; },
    mark: function (id, on) {
      var o = read();
      if (on) o.done[id] = o.done[id] || new Date().toISOString(); else delete o.done[id];
      return write(o);
    },
    all: function () { return read().done; },
    /* ringkasan untuk daftar pelajaran [{id,xp}] */
    summary: function (lessons) {
      var d = read().done, n = 0, xp = 0, total = 0;
      lessons.forEach(function (p) { total += p.xp; if (d[p.id]) { n++; xp += p.xp; } });
      return { done: n, count: lessons.length, xp: xp, xpTotal: total };
    }
  };
})(window);
