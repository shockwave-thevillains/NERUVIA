#!/usr/bin/env python3
"""env.py — amplop suara (gerak mulut) + durasi adegan -> env.js

Pakai:
  python3 tools/video/env.py                       # baca tools/video/audio/a01.wav, a02.wav, ...
  python3 tools/video/env.py --provisional 5,5,5   # tanpa suara: durasi sementara, mulut diam

Durasi adegan = 0,25 dtk jeda awal + panjang suara + 0,6 dtk jeda akhir, dibulatkan ke kelipatan 1/30 dtk.
"""
import argparse, glob, json, math, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
LEAD, TAIL = 0.25, 0.35


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def envelope(x, sr=16000):
    hop = sr // FPS
    n = len(x) // hop + 1
    r = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop + hop // 2] ** 2) + 1e-12) for i in range(n)])
    v = np.clip(r / np.percentile(r, 95), 0, 1.2)
    v = np.where(v < 0.12, 0, v)
    s = np.zeros_like(v)
    for i in range(len(v)):
        p = s[i - 1] if i else 0
        s[i] = p + (v[i] - p) * (0.75 if v[i] > p else 0.35)
    return [round(float(a), 3) for a in s]


def snap(sec):
    return math.ceil(sec * FPS) / FPS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', default=os.path.join(HERE, 'audio'))
    ap.add_argument('--provisional', help='daftar durasi dipisah koma, mis. 5,5,4 (tanpa berkas suara)')
    ap.add_argument('--out', default=os.path.join(HERE, 'env.js'))
    a = ap.parse_args()
    env, durs = {}, []
    if a.provisional:
        for i, d in enumerate(a.provisional.split(','), 1):
            d = snap(float(d)); durs.append(d); env[f'a{i:02d}'] = [0.0] * int(d * FPS)
    else:
        files = sorted(glob.glob(os.path.join(a.audio, 'a[0-9][0-9].wav')))
        if not files:
            sys.exit('tidak ada a01.wav, a02.wav, ... di ' + a.audio)
        for f in files:
            name = os.path.basename(f)[:-4]
            x = load(f)
            env[name] = envelope(x)
            durs.append(snap(LEAD + len(x) / 16000 + TAIL))
            print(name, round(len(x) / 16000, 2), 'dtk suara ->', round(durs[-1], 2), 'dtk adegan')
    open(a.out, 'w').write('window.ENV=' + json.dumps(env) + ';window.DURS=' + json.dumps([round(d, 4) for d in durs]) + ';')
    print('total', round(sum(durs), 2), 'dtk ->', a.out)


if __name__ == '__main__':
    main()
