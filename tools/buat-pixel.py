#!/usr/bin/env python3
"""Menggambar sprite pixel NERUVIA lewat kode (tanpa generator gambar AI).

Keluaran (assets/pixel/):
  neru-diam.png   lembar 3 frame: mata ^ ^, kedip, ekor naik
  koin.png, hati.png  ikon 8x8 untuk HUD dan daftar fakta
  kota-jauh.png   siluet kota lapis belakang
  kota-dekat.png  kota lapis depan (jendela cyan, papan neon, atap tempat Neru berdiri)
  bulan.png       bulan 16x16

Palet dibatasi: monokrom + satu aksen cyan #38E1FF (dan satu cyan gelap untuk bayangan).
Jalankan: python3 tools/buat-pixel.py [--pratinjau]
"""
import os
import random
import sys

from PIL import Image

PALET = {
    '.': (0, 0, 0, 0),
    'K': (8, 8, 8, 255),          # tinta
    'W': (255, 255, 255, 255),    # putih
    'L': (217, 217, 214, 255),    # abu terang (bayangan putih)
    'M': (154, 156, 158, 255),    # abu sedang
    'N': (30, 32, 34, 255),       # hampir hitam (sendi, ekor)
    'C': (56, 225, 255, 255),     # cyan NERUVIA
    'D': (27, 140, 163, 255),     # cyan gelap
}
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'pixel')
os.makedirs(OUT, exist_ok=True)


class Kanvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = [['.'] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[y][x] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.p[y][x]
        return '.'

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def elips(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    self.set(x, y, c)

    def cermin(self, x, y, c):
        """Titik simetris terhadap kolom tengah."""
        self.set(x, y, c)
        self.set(self.w - 1 - x, y, c)

    def garis_tepi(self, c='K'):
        """Tepi 1 piksel di sekeliling bentuk (tetangga 4 arah)."""
        tambah = []
        for y in range(self.h):
            for x in range(self.w):
                if self.p[y][x] == '.':
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        if self.get(x + dx, y + dy) not in ('.', c):
                            tambah.append((x, y))
                            break
        for x, y in tambah:
            self.p[y][x] = c

    def gambar(self):
        im = Image.new('RGBA', (self.w, self.h))
        px = im.load()
        for y in range(self.h):
            for x in range(self.w):
                px[x, y] = PALET[self.p[y][x]]
        return im

    def teks(self):
        return '\n'.join(''.join(r) for r in self.p)


# ---------------------------------------------------------------- NERU
NW, NH = 33, 38
TENGAH = 16


def neru(kedip=False, ekor=0, lambai=0):
    k = Kanvas(NW, NH)
    # telinga besar (cangkang putih, dalam cyan)
    telinga = [(5, 5), (4, 6), (4, 7), (4, 8), (4, 9), (4, 10), (4, 11), (5, 12)]
    dalam = {2: (5, 5), 3: (5, 6), 4: (5, 7), 5: (5, 8), 6: (6, 9)}
    for sisi in (0, 1):
        def px(x, y, c, s=sisi):
            k.set(x if s == 0 else NW - 1 - x, y, c)
        for y, (a_, b_) in enumerate(telinga):
            for x in range(a_, b_ + 1):
                px(x, y, 'W')
        for y, (a_, b_) in dalam.items():
            for x in range(a_, b_ + 1):
                px(x, y, 'C')
        px(4, 7, 'L'); px(4, 8, 'L')
    # kepala bulat
    k.elips(16, 14.5, 12.2, 8.9, 'W')
    k.rect(6, 9, 26, 21, 'W')
    for x in range(6, 27):
        k.set(x, 22, 'L')
    k.set(5, 18, 'L'); k.set(27, 18, 'L'); k.set(5, 19, 'L'); k.set(27, 19, 'L')
    # layar (visor) bersudut dipotong
    k.rect(7, 10, 25, 19, 'K')
    for x, y in ((7, 10), (25, 10), (7, 19), (25, 19)):
        k.set(x, y, 'W')
    for x, y in ((8, 10), (24, 10), (8, 19), (24, 19), (7, 11), (25, 11), (7, 18), (25, 18)):
        k.set(x, y, 'K')
    # mata
    if kedip:
        for x in range(9, 14):
            k.set(x, 14, 'C')
            k.set(x + 10, 14, 'C')
    else:
        for x, y in ((10, 12), (11, 12), (12, 12), (9, 13), (13, 13), (9, 14), (13, 14)):
            k.cermin(x, y, 'C')
        for x, y in ((10, 13), (12, 13)):
            k.cermin(x, y, 'D')
    # mulut kucing
    k.set(15, 16, 'C'); k.set(17, 16, 'C'); k.set(16, 17, 'C')
    k.set(14, 17, 'D'); k.set(18, 17, 'D')
    # headphone
    for sisi in (0, 1):
        def px(x, y, c, s=sisi):
            k.set(x if s == 0 else NW - 1 - x, y, c)
        for y in range(10, 19):
            for x in (1, 2, 3):
                px(x, y, 'W')
        px(1, 10, '.'); px(1, 18, '.')
        for y in range(12, 17):
            px(2, y, 'C')
        px(3, 11, 'L'); px(3, 17, 'L'); px(1, 17, 'L')
    # leher + cincin cyan
    k.rect(12, 23, 20, 24, 'N')
    for x in range(14, 19):
        k.set(x, 24, 'C')
    # ekor: dua piksel tebal, pita cyan, tiga posisi (digambar dulu supaya paha menutup pangkalnya)
    jalur = {
        0: [(26, 35), (27, 35), (28, 34), (29, 33), (30, 32), (30, 31), (30, 30), (30, 29), (30, 28), (29, 27), (28, 27)],
        1: [(26, 35), (27, 35), (28, 34), (29, 33), (30, 32), (30, 31), (30, 30), (30, 29), (30, 28), (30, 27), (29, 26), (28, 26)],
        2: [(26, 35), (27, 35), (28, 34), (29, 33), (30, 32), (30, 31), (30, 30), (30, 29), (29, 28), (28, 28), (28, 27), (27, 27)],
    }[ekor]
    for i, (x, y) in enumerate(jalur):
        c = 'C' if i == 5 else 'N'
        for dx in (0, 1):
            for dy in (0, 1):
                k.set(x + dx, y + dy, c)
        if c == 'N' and i > 2 and i % 2 == 0:
            k.set(x, y, 'M')
    # badan
    k.elips(16, 29, 7.4, 5.2, 'W')
    k.rect(11, 25, 21, 31, 'W')
    for y in range(25, 32):
        k.set(10, y, 'L'); k.set(22, y, 'L')
    k.rect(12, 26, 20, 32, 'K')
    letters = {
        'N': ['C.C', 'CCC', 'CCC', 'C.C', 'C.C'],
        'V': ['C.C', 'C.C', 'C.C', '.C.', '.C.'],
    }
    for ox, ch in ((13, 'N'), (17, 'V')):
        for dy, row in enumerate(letters[ch]):
            for dx, c in enumerate(row):
                if c == 'C':
                    k.set(ox + dx, 27 + dy, 'C')
    # lengan
    for sisi in (0, 1):
        def px(x, y, c, s=sisi):
            k.set(x if s == 0 else NW - 1 - x, y, c)
        if sisi == 1 and lambai:
            g = 0 if lambai == 1 else 1
            k.rect(23, 25, 25, 29, 'W')
            k.rect(24 + g, 20, 26 + g, 26, 'W')
            k.rect(25 + g, 14, 28 + g, 21, 'W')
            for y in range(14, 22):
                k.set(28 + g, y, 'L')
            k.rect(26 + g, 16, 27 + g, 18, 'C')
            k.set(23, 25, 'L'); k.set(23, 26, 'L'); k.set(23, 27, 'L')
            continue
        for y in range(26, 34):
            px(8, y, 'W'); px(9, y, 'W')
        px(8, 29, 'N'); px(9, 29, 'N'); px(8, 30, 'L'); px(9, 30, 'L')
    # paha dengan jejak kaki cyan
    for sisi in (0, 1):
        def px(x, y, c, s=sisi):
            k.set(x if s == 0 else NW - 1 - x, y, c)
        for y in range(30, 37):
            for x in range(4, 10):
                px(x, y, 'W')
        px(4, 30, '.'); px(4, 36, '.'); px(9, 30, '.')
        for x in range(5, 10):
            px(x, 36, 'L')
        for x, y in ((6, 31), (8, 31), (5, 32), (9, 32), (6, 33), (7, 33), (8, 33), (6, 34), (7, 34), (8, 34)):
            px(x, y, 'C')
    # kaki depan
    for x0 in (11, 17):
        for y in range(33, 38):
            for x in range(x0, x0 + 5):
                k.set(x, y, 'W')
        for x in range(x0, x0 + 5):
            k.set(x, 37, 'L')
        k.set(x0 + 2, 36, 'L'); k.set(x0 + 2, 37, 'M')
    k.garis_tepi('K')
    return k


def lembar(frames):
    w = frames[0].w
    h = frames[0].h
    im = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames):
        im.paste(f.gambar(), (i * w, 0))
    return im


# ---------------------------------------------------------------- KOTA
def kota(lebar, tinggi, seed, warna_badan, warna_tepi, nyala, rapat, jendela_besar, neon=False, atap_neru=None):
    """Siluet gedung. atap_neru=(x0,x1,y) memaksa satu gedung berhenti di y supaya jadi tempat berdiri."""
    r = random.Random(seed)
    k = Kanvas(lebar, tinggi)
    x = 0
    gedung = []
    while x < lebar:
        w = r.randint(9, 17)
        h = r.randint(int(tinggi * 0.25), int(tinggi * 0.78))
        gedung.append([x, w, h])
        x += w + (0 if rapat else r.randint(0, 2))
    if atap_neru:
        ax0, ax1, ah = atap_neru
        gedung = [g for g in gedung if g[0] + g[1] < ax0 or g[0] > ax1]
        gedung.append([ax0, ax1 - ax0 + 1, ah])
    for gx, gw, gh in gedung:
        top = tinggi - gh
        for yy in range(top, tinggi):
            for xx in range(gx, min(gx + gw, lebar)):
                k.set(xx, yy, warna_badan)
        for xx in range(gx, min(gx + gw, lebar)):
            k.set(xx, top, warna_tepi)
        for yy in range(top, tinggi):
            k.set(gx, yy, warna_tepi)
        # antena atau tangki atap
        pilih = r.random()
        if pilih < 0.28 and gw > 6:
            tx = gx + gw // 2
            for yy in range(top - r.randint(3, 6), top):
                k.set(tx, yy, warna_tepi)
            k.set(tx, top - 7, 'C' if neon else warna_tepi)
        elif pilih < 0.5 and gw > 8:
            k.rect(gx + 2, top - 3, gx + 5, top - 1, warna_tepi)
        # jendela
        for wy in range(top + 3, tinggi - 2, jendela_besar + 2):
            for wx in range(gx + 2, gx + gw - 2, jendela_besar + 1):
                if r.random() < nyala:
                    c = 'C' if r.random() < 0.55 else ('W' if r.random() < 0.4 else 'D')
                    k.rect(wx, wy, wx + jendela_besar - 1, wy + jendela_besar - 1, c)
        # papan neon vertikal
        if neon and r.random() < 0.3 and gh > 24:
            nx = gx + gw - 3
            for yy in range(top + 4, top + 4 + r.randint(6, 10)):
                k.set(nx, yy, 'C')
                k.set(nx + 1, yy, 'D')
    return k


def bulan():
    k = Kanvas(16, 16)
    k.elips(7.5, 7.5, 7.2, 7.2, 'W')
    for x, y in ((4, 5), (5, 5), (9, 9), (10, 9), (10, 10), (6, 11), (11, 5)):
        k.set(x, y, 'L')
    k.set(5, 6, 'L')
    k.garis_tepi('M')
    return k


KOIN = ['..KKKK..', '.KCCCCDK', 'KCWCCCDK', 'KCWCDCDK', 'KCCCDCDK', 'KCCCCCDK', '.KCCDDK.', '..KKKK..']
HATI = ['.KK..KK.', 'KCCKKCCK', 'KCWCCCCK', 'KCCCCCDK', '.KCCCDK.', '..KCDK..', '...KK...']


def ikon():
    for nama, peta in (('koin.png', KOIN), ('hati.png', HATI)):
        k = Kanvas(8, len(peta))
        for y, baris in enumerate(peta):
            for x, c in enumerate(baris):
                k.set(x, y, c)
        simpan(k.gambar(), nama)



def simpan(im, nama):
    p = os.path.join(OUT, nama)
    im.save(p, optimize=True)
    return p


def main():
    f0 = neru(False, 0)
    f1 = neru(True, 1)
    f2 = neru(False, 2)
    simpan(lembar([f0, f1, f2]), 'neru-diam.png')
    ikon()
    simpan(bulan().gambar(), 'bulan.png')
    jauh = kota(320, 70, 7, 'N', 'N', 0.0, True, 2)
    # lapis jauh: warna abu kebiruan gelap, ditimpa agar berbeda dari lapis dekat
    im = jauh.gambar()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]:
                px[x, y] = (18, 36, 44, 255)
    # jendela redup acak
    rr = random.Random(3)
    for _ in range(140):
        x, y = rr.randint(0, im.width - 1), rr.randint(20, im.height - 3)
        if px[x, y][3]:
            px[x, y] = (27, 140, 163, 255) if rr.random() < 0.35 else (30, 62, 74, 255)
    simpan(im, 'kota-jauh.png')
    dekat = kota(320, 64, 11, 'K', 'N', 0.55, False, 2, neon=True, atap_neru=(222, 262, 22))
    im2 = dekat.gambar()
    px2 = im2.load()
    # lantai jalan di dasar
    for y in range(im2.height - 3, im2.height):
        for x in range(im2.width):
            px2[x, y] = (8, 8, 8, 255)
    for x in range(0, im2.width, 6):
        px2[x, im2.height - 2] = (56, 225, 255, 255)
    simpan(im2, 'kota-dekat.png')
    if '--pratinjau' in sys.argv:
        susun = Image.new('RGBA', (320, 150), (4, 8, 10, 255))
        susun.alpha_composite(Image.open(os.path.join(OUT, 'kota-jauh.png')), (0, 150 - 70 - 0))
        susun.alpha_composite(Image.open(os.path.join(OUT, 'kota-dekat.png')), (0, 150 - 64))
        susun.alpha_composite(f0.gambar(), (222 + 3, 150 - 64 + 22 - NH + 1))
        susun.resize((320 * 4, 150 * 4), Image.NEAREST).save('/tmp/lihat/pratinjau-pixel.png')
        big = lembar([f0, f1, f2])
        bg = Image.new('RGBA', big.size, (11, 28, 36, 255))
        bg.alpha_composite(big)
        bg.resize((big.width * 10, big.height * 10), Image.NEAREST).save('/tmp/lihat/neru-pixel.png')


if __name__ == '__main__':
    main()
