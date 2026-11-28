#!/usr/bin/env python3
"""Draws the game icon (512x512) into assets/icon.png."""
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent.parent / "assets" / "icon.png"
FONT = "/usr/share/fonts/julietaula-montserrat-fonts/Montserrat-Black.otf"
if not Path(FONT).exists():
    FONT = "/usr/share/fonts/julietaula-montserrat-fonts/Montserrat-Bold.otf"
S = 512
img = Image.new("RGB", (S, S))
top, bot = (34, 14, 74), (255, 96, 150)
for y in range(S):
    t = (y / S) ** 1.3
    ImageDraw.Draw(img).line([(0, y), (S, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bot)))
d = ImageDraw.Draw(img, "RGBA")

# Moon with glow
glow = Image.new("RGBA", (S, S))
ImageDraw.Draw(glow).ellipse((150, 70, 362, 282), fill=(255, 220, 150, 170))
img.paste(glow.filter(ImageFilter.GaussianBlur(30)), (0, 0), glow.filter(ImageFilter.GaussianBlur(30)))
d.ellipse((176, 96, 336, 256), fill=(255, 236, 190))

# Torii silhouette
red = (150, 20, 40)
d.rectangle((130, 300, 150, 512), fill=red)
d.rectangle((362, 300, 382, 512), fill=red)
d.polygon([(86, 282), (426, 282), (440, 262), (72, 262)], fill=(40, 10, 20))
d.rectangle((110, 318, 402, 334), fill=red)

# Petals
rnd = random.Random(3)
for _ in range(60):
    x, y, r = rnd.randint(0, S), rnd.randint(0, S), rnd.randint(3, 7)
    d.ellipse((x - r, y - r * 0.6, x + r, y + r * 0.6), fill=(255, 190, 215, rnd.randint(140, 230)))

def outlined(text, y, size, fill):
    f = ImageFont.truetype(FONT, size)
    w = d.textlength(text, font=f)
    d.text(((S - w) / 2, y), text, font=f, fill=fill, stroke_width=max(6, size // 10), stroke_fill=(28, 10, 40))

outlined("ANIME", 300, 104, (255, 255, 255))
outlined("DRAFT", 396, 104, (255, 205, 64))
img.save(OUT)
print("wrote", OUT)
