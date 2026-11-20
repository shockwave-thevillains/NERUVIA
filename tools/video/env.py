"""Hitung amplop suara (gerak mulut Neru) dari audio/aNN.opus -> env.js.
Setiap baris suara diasumsikan mulai 0,25 detik setelah adegan dimulai."""
import numpy as np, subprocess, json, os
HERE=os.path.dirname(os.path.abspath(__file__)); out={}
for k in range(1,13):
    raw=subprocess.run(['ffmpeg','-v','error','-i',os.path.join(HERE,'audio',f'a{k:02d}.opus'),'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
    x=np.frombuffer(raw,np.int16).astype(np.float32)/32768; hop=16000//30; n=len(x)//hop+1
    r=np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop+hop//2]**2)+1e-12) for i in range(n)])
    v=np.clip(r/np.percentile(r,95),0,1.2); v=np.where(v<0.12,0,v); s=np.zeros_like(v)
    for i in range(len(v)):
        p=s[i-1] if i else 0; s[i]=p+(v[i]-p)*(0.75 if v[i]>p else 0.35)
    out[f'a{k:02d}']=[round(float(a),3) for a in s]
open(os.path.join(HERE,'env.js'),'w').write('window.ENV='+json.dumps(out)+';')
print('env.js diperbarui')
