# -*- coding: utf-8 -*-
"""Generate pixel-perfect PWA assets from the official logo (zesto-logo.jpg).

Produces, in public/:
  icons/icon-{192,512}.png            maskable=false, mark ~68% (task switcher, install UI)
  icons/icon-maskable-{192,512}.png   safe-zone padded, mark ~54% (Android adaptive icon)
  icons/apple-touch-icon.png          180, opaque, corner-safe (iOS home screen)
  favicon.ico  favicon-96.png  favicon.svg
  og-default.png                      1200x630 social card
  splash/*.png                        iOS apple-touch-startup-image, one per device

Everything is a Lanczos downscale of a crop taken directly from the 1000px master,
so pixels come from the real logo — no re-drawing.
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path.home() / "Desktop" / "zesto-logo.jpg"
if not SRC.exists():
    SRC = ROOT / "zesto-logo.jpg"

ICONS = ROOT / "public" / "icons"
SPLASH = ROOT / "public" / "splash"
ICONS.mkdir(parents=True, exist_ok=True)
SPLASH.mkdir(parents=True, exist_ok=True)

master = Image.open(SRC).convert("RGB")
W, H = master.size  # 1000 x 1000
SS = 4  # supersample factor for crisp downscale

# --- measured geometry of the master (see scripts analysis) ---
MARK_BBOX = (333, 208, 712, 588)     # just the ribbon-Z + leaf, no wordmark
# full lockup with generous black margin — cropping this and matching the canvas to its
# (deep-vignette) corner gives a seamless paste with the artwork's own subtle glow intact
LOGO_BBOX = (170, 120, 832, 852)

# the exact near-black the artwork uses, sampled just outside the mark
BG = tuple(int(c) for c in master.getpixel((MARK_BBOX[0] - 40, MARK_BBOX[1] + 30)))

MARK = master.crop(MARK_BBOX)                       # 379 x 380, real logo pixels
MARK_SQ = max(MARK.size)


def icon_from_mark(size, mark_fraction):
    """Composite the extracted mark, scaled to `mark_fraction` of the canvas, dead
    centre on a flat brand-black square. No wordmark, full control of padding."""
    px = size * SS
    canvas = Image.new("RGB", (px, px), BG)
    target = round(px * mark_fraction)
    scale = target / MARK_SQ
    m = MARK.resize((round(MARK.width * scale), round(MARK.height * scale)), Image.LANCZOS)
    canvas.paste(m, ((px - m.width) // 2, (px - m.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


# ---------- Android / generic icons ----------
for s in (192, 512):
    icon_from_mark(s, 0.68).save(ICONS / f"icon-{s}.png")
    icon_from_mark(s, 0.54).save(ICONS / f"icon-maskable-{s}.png")

# ---------- iOS home-screen icon (opaque, iOS applies its own ~22% radius) ----------
icon_from_mark(180, 0.60).save(ICONS / "apple-touch-icon.png")
icon_from_mark(167, 0.60).save(ICONS / "apple-touch-icon-167.png")
icon_from_mark(152, 0.60).save(ICONS / "apple-touch-icon-152.png")
icon_from_mark(120, 0.60).save(ICONS / "apple-touch-icon-120.png")

# ---------- favicons ----------
fav96 = icon_from_mark(96, 0.82)
fav96.save(ROOT / "public" / "favicon-96.png")
ico_sizes = [16, 24, 32, 48, 64]
icon_from_mark(64, 0.86).save(ROOT / "public" / "favicon.ico", sizes=[(n, n) for n in ico_sizes])

# a crisp SVG favicon that embeds the real mark (always matches, scales to any dpi)
import base64
mark_png = ICONS / "_favmark.png"
icon_from_mark(128, 0.86).save(mark_png)
b64 = base64.b64encode(mark_png.read_bytes()).decode()
mark_png.unlink()
(ROOT / "public" / "favicon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">'
    f'<image href="data:image/png;base64,{b64}" width="128" height="128"/></svg>\n',
    encoding="utf-8",
)

logo = master.crop(LOGO_BBOX)
# the crop's corner sits deep in the artwork's vignette (~#05050A) — fill canvases with
# exactly that and the rectangle edge is invisible; the crop's own falloff reads as glow
EDGE_BG = tuple(int(c) for c in logo.getpixel((4, 4)))


def paste_logo(canvas, cx, cy, target_w):
    scale = target_w / logo.width
    lg = logo.resize((round(logo.width * scale), round(logo.height * scale)), Image.LANCZOS)
    canvas.paste(lg, (round(cx - lg.width / 2), round(cy - lg.height / 2)))

# ---------- OG / social card (1200x630) ----------
S2 = 2
og = Image.new("RGB", (1200 * S2, 630 * S2), EDGE_BG)
paste_logo(og, 300 * S2, 315 * S2, 470 * S2)
d = ImageDraw.Draw(og)
try:
    big = ImageFont.truetype("arialbd.ttf", 62 * S2)
    small = ImageFont.truetype("arial.ttf", 27 * S2)
except Exception:
    big = small = ImageFont.load_default()
tx = 560 * S2
d.text((tx, 232 * S2), "what can you", font=big, fill=(255, 255, 255))
d.text((tx, 300 * S2), "make right now?", font=big, fill=(255, 255, 255))
d.text((tx, 388 * S2), "broke  ·  tired  ·  midnight  ·  ₹30  ·  10 min",
       font=small, fill=(150, 155, 180))
og.resize((1200, 630), Image.LANCZOS).save(ROOT / "public" / "og-default.png")

# ---------- iOS splash screens ----------
# (css device-width, device-height, dpr) -> pixel canvas
IOS_DEVICES = [
    (375, 667, 2), (414, 736, 3), (375, 812, 3), (414, 896, 2), (414, 896, 3),
    (390, 844, 3), (428, 926, 3), (393, 852, 3), (430, 932, 3), (402, 874, 3),
    (440, 956, 3),
    (744, 1133, 2), (768, 1024, 2), (820, 1180, 2), (834, 1194, 2), (1024, 1366, 2),
]
for dw, dh, dpr in IOS_DEVICES:
    pw, ph = dw * dpr, dh * dpr
    canvas = Image.new("RGB", (pw, ph), EDGE_BG)
    paste_logo(canvas, pw / 2, ph * 0.44, min(pw, ph) * 0.52)
    canvas.save(SPLASH / f"splash-{pw}x{ph}.png")

print("icons:", sorted(p.name for p in ICONS.glob("*.png")))
print("splash:", len(list(SPLASH.glob('*.png'))), "screens")
print("bg:", "#%02X%02X%02X" % BG)
