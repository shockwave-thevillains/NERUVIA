#!/usr/bin/env python3
"""Snapshot standar halaman NERUVIA: satu gambar memanjang (desktop 1440 px).

Pakai:  python3 tools/snapshot.py            (tanggal hari ini)
        python3 tools/snapshot.py --tanggal 2026-12-01
Hasil:  docs/snapshot/<tanggal>[-2,-3...]/halaman-penuh.jpg
Butuh:  pip install playwright pillow  (dan Chrome/Chromium)
"""
import argparse, datetime, os, shutil, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEWPORT = {"width": 1440, "height": 900}   # standar: jangan diubah antar snapshot
JPEG_QUALITY = 90

def git(*a):
    return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, text=True).stdout.strip()

def target_dir(tanggal):
    base = os.path.join(ROOT, "docs", "snapshot", tanggal)
    d, n = base, 1
    while os.path.exists(os.path.join(d, "halaman-penuh.jpg")):
        n += 1
        d = f"{base}-{n}"
    os.makedirs(d, exist_ok=True)
    return d

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tanggal", default=datetime.date.today().isoformat())
    args = ap.parse_args()
    out = os.path.join(target_dir(args.tanggal), "halaman-penuh.jpg")
    chrome = shutil.which("google-chrome") or shutil.which("chromium")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome, args=["--no-sandbox", "--allow-file-access-from-files"]) if chrome else p.chromium.launch()
        pg = b.new_page(viewport=VIEWPORT)
        pg.goto("file://" + os.path.join(ROOT, "index.html"))
        pg.wait_for_timeout(2500)                       # animasi masuk + frame Neru selesai dimuat
        h = pg.evaluate("document.documentElement.scrollHeight")
        for y in range(0, h, 300):                      # scroll pelan agar semua .rv terbuka
            pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(120)
        pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(1000)
        pg.screenshot(path=out, type="jpeg", quality=JPEG_QUALITY, full_page=True)
        b.close()
    from PIL import Image
    w, hh = Image.open(out).size
    print(f"Gambar : {os.path.relpath(out, ROOT)}  ({w} x {hh}, {os.path.getsize(out)//1024} KB)")
    print(f"Versi halaman (commit) : {git('rev-parse', '--short', 'HEAD')}"
          + ("  [ADA PERUBAHAN BELUM DI-COMMIT]" if git("status", "--porcelain", "index.html", "assets") else ""))

if __name__ == "__main__":
    sys.exit(main())
