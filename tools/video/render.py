"""Render video Prompt 101 versi Neru pixel.
Pakai: jalankan server dari akar repo:  python3 -m http.server 8765
lalu:   python3 tools/video/render.py portrait   (atau: landscape)
Hasil:  tools/video/out/neruvia-prompt-101-pixel[-landscape].mp4
"""
import asyncio, os, sys, subprocess, shutil
from playwright.async_api import async_playwright
FPS=30
HERE=os.path.dirname(os.path.abspath(__file__))
MODE=(sys.argv[1] if len(sys.argv)>1 else 'portrait')
PAGE,VW,VH,NAME={'portrait':('video-px.html',1080,1920,'neruvia-prompt-101-pixel'),
                 'landscape':('video-px-l.html',1920,1080,'neruvia-prompt-101-pixel-landscape')}[MODE]
OUT=os.path.join(HERE,'out',MODE); os.makedirs(OUT,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':VW,'height':VH})
        await pg.goto(f'http://127.0.0.1:8765/tools/video/{PAGE}'); await pg.wait_for_timeout(1200)
        await pg.evaluate('document.fonts.ready')
        durs=await pg.evaluate('DURS'); acc=0.0; parts=[]
        for i,d in enumerate(durs):
            out=os.path.join(OUT,f's{i+1:02d}.mp4'); parts.append(out)
            if os.path.exists(out): acc+=d; continue
            fd=os.path.join(OUT,f'fr{i+1:02d}'); shutil.rmtree(fd,ignore_errors=True); os.makedirs(fd)
            for k in range(round(d*FPS)):
                await pg.evaluate(f'render({acc+k/FPS:.4f})')
                await pg.screenshot(path=f'{fd}/{k:04d}.jpg',type='jpeg',quality=92)
            tmp=out.replace('.mp4','.tmp.mp4')
            r=subprocess.run(['ffmpeg','-v','error','-y','-framerate',str(FPS),'-i',f'{fd}/%04d.jpg','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p',tmp])
            if r.returncode==0: os.rename(tmp,out); shutil.rmtree(fd)
            print('adegan',i+1,'selesai',flush=True); acc+=d
        await b.close()
    lst=os.path.join(OUT,'list.txt'); open(lst,'w').write(''.join(f"file '{x}'\n" for x in parts))
    v=os.path.join(OUT,'video.mp4')
    subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',lst,'-c','copy',v],check=True)
    final=os.path.join(HERE,'out',NAME+'.mp4')
    subprocess.run(['ffmpeg','-v','error','-y','-i',v,'-i',os.path.join(HERE,'audio','vo.m4a'),'-map','0:v','-map','1:a','-c','copy','-shortest',final],check=True)
    print('hasil:',final)
asyncio.run(main())
