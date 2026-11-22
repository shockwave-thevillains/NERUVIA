#!/usr/bin/env node
/* Alat ukur muat halaman (Paket B). Hanya mengukur dan mencetak JSON; tidak mengubah berkas.
   Pakai:  node tools/ukur-muat.mjs [--runs 3] [--jalan /] [--label nama] [--json]
   Server statis lokal (tanpa header Vercel), konteks browser baru tiap putaran (tanpa cache),
   jaringan dibatasi lewat CDP: 1,6 Mbps, RTT 150 ms (mirip 4G lambat). HP: 390 px, DPR 3, sentuh, CPU 4x lebih lambat.
   Mengukur: LCP, CLS, jumlah dan bobot permintaan sebelum LCP, jumlah frame Neru yang diminta sebelum LCP,
   bobot total sampai Neru animasi siap (maks. 40 dtk) + 1 dtk, kapan Neru "live" (canvas animasi siap).
   Kode keluar 2 bila Playwright tidak ada. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const RUNS = Math.max(1, Math.min(9, parseInt(arg('runs', '3'), 10) || 3));
const JALAN = arg('jalan', '/');
const LABEL = arg('label', 'ukur');
if (!JALAN.startsWith('/') || JALAN.includes('..')) { console.error('--jalan harus diawali / dan tanpa ..'); process.exit(1); }

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright tidak tersedia'); process.exit(2); }

const server = await new Promise((res) => {
  const s = createServer((req, resp) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT)) { resp.writeHead(403); return resp.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { resp.writeHead(404); return resp.end('tidak ada'); }
    resp.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    resp.end(readFileSync(f));
  }).listen(0, '127.0.0.1', () => res(s));
});
const base = 'http://127.0.0.1:' + server.address().port;

const PROFIL = {
  desktop1440: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, cpu: 1 },
  mobile390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpu: 4 },
};

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function satuPutaran(browser, nama, prof) {
  const { cpu, ...opsi } = prof;
  const ctx = await browser.newContext(opsi);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0, live: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__m.lcp = e.startTime; window.__m.el = (e.element ? e.element.tagName + (e.element.id ? '#' + e.element.id : '') : '') + (e.url ? ' ' + e.url.replace(location.origin, '') : ''); } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    document.addEventListener('DOMContentLoaded', () => {
      const n = document.getElementById('neru');
      if (n) new MutationObserver(() => { if (n.classList.contains('live') && !window.__m.live) window.__m.live = performance.now(); }).observe(n, { attributes: true, attributeFilter: ['class'] });
    });
  });
  const galat = [];
  page.on('pageerror', (e) => galat.push(String(e)));
  await page.goto(base + JALAN, { waitUntil: 'load', timeout: 60000 });
  /* tunggu Neru animasi siap (maks. 40 dtk, halaman tanpa #neru langsung lanjut), lalu 1 dtk agar permintaan susulan tercatat */
  await page.waitForFunction(() => !document.getElementById('neru') || document.getElementById('neru').classList.contains('live'), null, { timeout: 40000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(1000);
  const h = await page.evaluate(() => {
    const m = window.__m, nav = performance.getEntriesByType('navigation')[0];
    const r = performance.getEntriesByType('resource').map((e) => ({ n: e.name.replace(location.origin, ''), s: e.startTime, e: e.responseEnd, b: e.transferSize || 0 }));
    const frame = (x) => /maskot-animasi\/frames/.test(x.n);
    const sebelum = r.filter((x) => x.e <= m.lcp);
    return {
      lcp: m.lcp, cls: m.cls, live: m.live, load: nav.loadEventEnd,
      reqSebelumLCP: sebelum.length, kbSebelumLCP: sebelum.reduce((a, x) => a + x.b, 0) / 1024,
      frameDimintaSebelumLCP: r.filter((x) => frame(x) && x.s < m.lcp).length,
      frameSelesaiSebelumLCP: r.filter((x) => frame(x) && x.e <= m.lcp).length,
      frameTotal: r.filter(frame).length, kbFrame: r.filter(frame).reduce((a, x) => a + x.b, 0) / 1024,
      reqTotal: r.length + 1, kbTotal: (r.reduce((a, x) => a + x.b, 0) + (nav.transferSize || 0)) / 1024,
      dirFrame: (r.find(frame) || { n: '' }).n.replace(/\/f\d+\.webp.*/, ''),
      lcpEl: m.el || '',
    };
  });
  await ctx.close();
  return { ...h, galat };
}

const browser = await chromium.launch();
const hasil = {};
for (const [nama, prof] of Object.entries(PROFIL)) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await satuPutaran(browser, nama, prof));
  const med = {};
  for (const k of Object.keys(runs[0])) if (typeof runs[0][k] === 'number') med[k] = Math.round(median(runs.map((r) => r[k])) * 1000) / 1000;
  hasil[nama] = { medianDari: RUNS, median: med, putaran: runs };
}
await browser.close(); server.close();

if (process.argv.includes('--json')) console.log(JSON.stringify({ label: LABEL, jalan: JALAN, hasil }, null, 1));
else {
  console.log(`# ${LABEL}  ${JALAN}  (median dari ${RUNS} putaran, 1,6 Mbps / RTT 150 ms)`);
  for (const [n, h] of Object.entries(hasil)) {
    const m = h.median;
    console.log(`${n}: LCP ${m.lcp.toFixed(0)} ms | CLS ${m.cls.toFixed(4)} | sebelum LCP: ${m.reqSebelumLCP} permintaan ${m.kbSebelumLCP.toFixed(0)} KB, frame diminta ${m.frameDimintaSebelumLCP}, selesai ${m.frameSelesaiSebelumLCP} | load ${m.load.toFixed(0)} ms | Neru live ${m.live.toFixed(0)} ms | total ${m.reqTotal} permintaan ${m.kbTotal.toFixed(0)} KB (frame ${m.frameTotal} = ${m.kbFrame.toFixed(0)} KB) | dir ${h.putaran[0].dirFrame || '-'} | galat ${h.putaran.reduce((a, r) => a + r.galat.length, 0)}`);
  }
}
