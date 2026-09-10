# -*- coding: utf-8 -*-
"""Render Zesto PWA icons + og image: a bold ribbon 'Z' on the brand gradient.
Palette from zesto.png (Coolors export): purple #9035C0, blue #4CBDF7,
yellow #FDCF00, amber #F7B200, ink #000.
"""
import math, pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

PURPLE = (0x90, 0x35, 0xC0)
BLUE = (0x4C, 0xBD, 0xF7)
YELLOW = (0xFD, 0xCF, 0x00)
INK = (0x0B, 0x10, 0x20)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diagonal_gradient(size, c0, c1):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)
            px[x, y] = lerp(c0, c1, t)
    return img


def rounded_stroke(draw, pts, width, fill):
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i + 1]], fill=fill, width=width)
    r = width // 2
    for p in pts:
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)


def draw_z(size, bg0, bg1, stroke=(255, 255, 255), maskable=False):
    ss = 4  # supersample
    S = size * ss
    img = diagonal_gradient(S, bg0, bg1)
    d = ImageDraw.Draw(img, "RGBA")

    pad = 0.30 if maskable else 0.235
    x0, x1 = pad, 1 - pad
    yt, yb = pad + 0.02, 1 - pad - 0.02
    P = [(x0, yt), (x1, yt), (x0, yb), (x1, yb)]
    P = [(round(px * S), round(py * S)) for px, py in P]
    w = int(S * (0.115 if maskable else 0.132))

    # soft drop shadow, offset along the light diagonal
    off = int(w * 0.16)
    shadow = [(p[0] + off, p[1] + off) for p in P]
    rounded_stroke(d, [shadow[0], shadow[1], shadow[2], shadow[3]], w, (0, 0, 0, 38))
    # main ribbon
    rounded_stroke(d, [P[0], P[1], P[2], P[3]], w, stroke)
    # tiny leaf/teardrop terminal on the bottom-right end
    lx, ly = P[3]
    lr = int(w * 0.62)
    d.ellipse([lx - lr, ly - lr, lx + lr, ly + lr], fill=YELLOW + (255,))

    img = img.resize((size, size), Image.LANCZOS)
    return img


def with_squircle_mask(img):
    size = img.size[0]
    ss = 4
    m = Image.new("L", (size * ss, size * ss), 0)
    md = ImageDraw.Draw(m)
    n = 4.0
    cx = size * ss / 2
    R = size * ss / 2
    for y in range(size * ss):
        for x in range(size * ss):
            if (abs((x - cx) / R) ** n + abs((y - cx) / R) ** n) <= 1:
                m.putpixel((x, y), 255)
    m = m.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


for s in (192, 512):
    with_squircle_mask(draw_z(s, PURPLE, BLUE)).save(OUT / f"icon-{s}.png")
draw_z(512, PURPLE, BLUE, maskable=True).save(OUT / "icon-maskable-512.png")
draw_z(180, PURPLE, BLUE).save(OUT / "apple-touch-icon.png")

# social / OG share card 1200x630
og = Image.new("RGB", (1200, 630), INK)
gd = diagonal_gradient(630, PURPLE, BLUE).resize((1200, 630))
og.paste(gd)
z = draw_z(360, PURPLE, BLUE)
og.paste(z, (90, 135), z if z.mode == "RGBA" else None)
d = ImageDraw.Draw(og)
try:
    from PIL import ImageFont
    f = ImageFont.truetype("arial.ttf", 92)
    fs = ImageFont.truetype("arial.ttf", 40)
    d.text((520, 250), "Zesto", font=f, fill=(255, 255, 255))
    d.text((522, 360), "what can you make right now?", font=fs, fill=(255, 255, 255, 220))
except Exception:
    pass
og.save(ROOT / "public" / "og-default.png")

print("icons written to", OUT)
