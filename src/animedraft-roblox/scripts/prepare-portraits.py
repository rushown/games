#!/usr/bin/env python3
"""Shrinks character portraits for Roblox and lists which characters still need one.

Put your own (or licensed) art in portraits/raw/, one file per character named by key
(e.g. portraits/raw/gojo.png; see the keys in src/shared/Data.luau). This writes 256x256 JPEGs
to portraits/upload/ (small = fast to load on phones). Upload them in Studio with
Asset Manager -> Bulk Import, then put each asset id in Config.CHARACTER_IMAGES.

Usage (from animedraft-roblox/):  python3 scripts/prepare-portraits.py
"""
from pathlib import Path
import re
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "portraits" / "raw", ROOT / "portraits" / "upload"
SIZE = 256

keys = re.findall(r'\{ key = "([^"]+)", name = "([^"]+)", series =', (ROOT / "src/shared/Data.luau").read_text())
RAW.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
found = {p.stem.lower(): p for p in RAW.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp"}}
done, missing = 0, []
for key, name in keys:
    src = found.get(key.lower())
    if not src:
        missing.append(f"{key} ({name})")
        continue
    img = ImageOps.fit(Image.open(src).convert("RGB"), (SIZE, SIZE), Image.LANCZOS, centering=(0.5, 0.3))
    img.save(OUT / f"{key}.jpg", quality=86, optimize=True)
    done += 1
# Drop shrunk copies whose original was removed from raw/ (so they aren't uploaded again).
for old in OUT.glob("*.jpg"):
    if old.stem.lower() not in found:
        old.unlink()
print(f"Prepared {done}/{len(keys)} portraits in {OUT}")
if missing:
    print(f"Still missing {len(missing)}: " + ", ".join(missing[:20]) + (" ..." if len(missing) > 20 else ""))
