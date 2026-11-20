#!/usr/bin/env python3
"""render.py — render halaman episode ke MP4 (30 fps, JPEG q92 per frame, libx264 crf18 veryfast per adegan).

Pakai (dari akar repo):
  python3 tools/video/render.py video-ce.html hasil.mp4              # + suara dari tools/video/audio/aNN.wav bila ada
  python3 tools/video/render.py video-ce.html hasil.mp4 --no-audio   # video bisu
  python3 tools/video/render.py video-ce.html hasil.mp4 --force      # abaikan cache adegan di /tmp/neruvia-render

Alur: server lokal -> Chrome (Playwright) memanggil render(t) per frame -> screenshot -> ffmpeg per adegan
-> concat -> gabung suara (jeda awal 0,25 dtk per adegan, loudnorm -16 LUFS) -> MP4.
"""
import argparse, asyncio, functools, glob, http.server, os, shutil, subprocess, sys, threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FPS = 30
CHROME = '/usr/bin/google-chrome'


def serve(port):
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def render_frames(url, work, size, force):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        kw = {'executable_path': CHROME} if os.path.exists(CHROME) else {}
        b = await p.chromium.launch(**kw)
        pg = await b.new_page(viewport={'width': size[0], 'height': size[1]})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(1200)
        await pg.evaluate('document.fonts.ready')
        durs = await pg.evaluate('DURS')
        acc = 0.0
        for i, d in enumerate(durs):
            out = f'{work}/s{i+1:02d}.mp4'
            if os.path.exists(out) and not force:
                acc += d; continue
            fd = f'{work}/fr{i+1:02d}'
            shutil.rmtree(fd, ignore_errors=True); os.makedirs(fd)
            n = round(d * FPS)
            for k in range(n):
                await pg.evaluate(f'render({acc + k / FPS:.4f})')
                await pg.screenshot(path=f'{fd}/{k:04d}.jpg', type='jpeg', quality=92)
            tmp = out + '.tmp.mp4'
            r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', f'{fd}/%04d.jpg',
                                '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', str(FPS), tmp])
            if r.returncode == 0:
                os.rename(tmp, out); shutil.rmtree(fd)
            print('adegan', i + 1, n, 'frame', flush=True)
            acc += d
        await b.close()
        if errs: print('PAGE ERRORS:', errs)
        return durs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('page'); ap.add_argument('out')
    ap.add_argument('--audio', default=os.path.join(HERE, 'audio'))
    ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--size', default='1080x1920')
    ap.add_argument('--work', default='/tmp/neruvia-render')
    a = ap.parse_args()
    size = tuple(int(v) for v in a.size.split('x'))
    work = os.path.join(a.work, os.path.splitext(os.path.basename(a.page))[0]); os.makedirs(work, exist_ok=True)
    srv = serve(0); port = srv.server_address[1]
    page = a.page if '/' in a.page else 'tools/video/' + a.page
    durs = asyncio.run(render_frames(f'http://127.0.0.1:{port}/{page}', work, size, a.force))
    n = len(durs)
    with open(f'{work}/vlist.txt', 'w') as f:
        for i in range(n): f.write(f"file '{work}/s{i+1:02d}.mp4'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{work}/vlist.txt', '-c', 'copy', f'{work}/v.mp4'], check=True)
    have = [os.path.exists(f'{a.audio}/a{i+1:02d}.wav') for i in range(n)]
    if a.no_audio or not all(have):
        if not a.no_audio: print('suara tidak lengkap, hasil bisu:', have)
        shutil.copy(f'{work}/v.mp4', a.out)
    else:
        with open(f'{work}/alist.txt', 'w') as f:
            for i, d in enumerate(durs):
                p = f'{work}/p{i+1:02d}.wav'
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{a.audio}/a{i+1:02d}.wav', '-af',
                                f'adelay=250,apad=whole_dur={d},atrim=0:{d},aresample=48000', '-ac', '2', '-c:a', 'pcm_s16le', p], check=True)
                f.write(f"file '{p}'\n")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{work}/alist.txt', '-c', 'copy', f'{work}/vo.wav'], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{work}/v.mp4', '-i', f'{work}/vo.wav', '-map', '0:v', '-map', '1:a',
                        '-af', 'loudnorm=I=-16:TP=-1.5', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', a.out], check=True)
    print('selesai:', a.out, round(sum(durs), 2), 'dtk')


if __name__ == '__main__':
    main()
