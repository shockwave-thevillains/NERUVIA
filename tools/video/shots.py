#!/usr/bin/env python3
"""shots.py — cek cepat tata letak: satu frame per adegan -> lembar kontak JPG.

  python3 tools/video/shots.py video-ce.html /tmp/sheet.jpg 0.8        # titik 80% tiap adegan
  python3 tools/video/shots.py video-ce.html /tmp/sheet.jpg 0.3 0.9    # beberapa titik: satu baris per titik
Juga menyimpan tiap frame penuh ke /tmp/neruvia-shots/.
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import serve, CHROME
from PIL import Image


async def main(page, out, fracs, size=(1080, 1920)):
    from playwright.async_api import async_playwright
    srv = serve(0); port = srv.server_address[1]
    os.makedirs('/tmp/neruvia-shots', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        pg = await b.new_page(viewport={'width': size[0], 'height': size[1]})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{port}/' + (page if '/' in page else 'tools/video/' + page))
        await pg.wait_for_timeout(1200); await pg.evaluate('document.fonts.ready')
        durs = await pg.evaluate('DURS'); files = []
        for fr in fracs:
            acc = 0
            for i, d in enumerate(durs):
                await pg.evaluate(f'render({acc + d * fr:.4f})')
                f = f'/tmp/neruvia-shots/{int(fr*100):03d}_{i+1:02d}.jpg'
                await pg.screenshot(path=f, type='jpeg', quality=85); files.append(f); acc += d
        print('page errors:', errs); await b.close()
    n = len(durs); cols = min(n, 6); w, h = 270, 480
    rows = (len(files) + cols - 1) // cols
    W = Image.new('RGB', (w * cols, h * rows))
    for k, f in enumerate(files): W.paste(Image.open(f).resize((w, h)), ((k % cols) * w, (k // cols) * h))
    W.save(out, quality=88); print(out, len(files), 'frame')

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3:]] or [0.8]))
