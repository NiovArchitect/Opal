#!/usr/bin/env python3
"""Repair #18 harmony2 - app icon + favicon derivation FROM the orb master.

DERIVE, DON'T REDRAW (communication-model S8.1): the icon is the orb
master itself, reduced. Pipeline:
  1. Load the splash master derivation (public/brand/orb/
     opal-orb-master-full.webp - itself a resize-only derivation of
     shots/repair18/design-masters/opal-orb-master.webp).
  2. Composite it, contained with a small margin, over the master's
     own night field (#05030f - the sampled outer-frame median
     recorded by build_splash_master.py). No text, no redraw, no
     recolor: RGB passes through untouched.
  3. Downscale (LANCZOS) to each icon size.

Outputs (the served icon slots; the interim C2/Loop icon content that
previously occupied the generic slots is replaced in place so every
existing reference - index.html, site.webmanifest, main.tsx's runtime
swap - now serves the orb):
  public/brand/orb/opal-orb-icon-1024.png (master icon raster)
  public/brand/opal-app-icon-1024.png / -512.png / -180.png
  public/brand/favicon-48.png
  public/favicon-32.png
"""
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parents[2]
MASTER = WEB / "public/brand/orb/opal-orb-master-full.webp"
NIGHT_FIELD = (5, 3, 15)  # --orb-night-field, sampled from the master frame
MARGIN_FRACTION = 0.04  # the composition sits inside its own field


def icon_canvas(size: int) -> Image.Image:
    master = Image.open(MASTER).convert("RGB")
    canvas = Image.new("RGB", (size, size), NIGHT_FIELD)
    inner = round(size * (1 - 2 * MARGIN_FRACTION))
    reduced = master.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(reduced, (offset, offset))
    return canvas


def main() -> None:
    base = icon_canvas(1024)
    targets = [
        (WEB / "public/brand/orb/opal-orb-icon-1024.png", 1024),
        (WEB / "public/brand/opal-app-icon-1024.png", 1024),
        (WEB / "public/brand/opal-app-icon-512.png", 512),
        (WEB / "public/brand/opal-app-icon-180.png", 180),
        (WEB / "public/brand/favicon-48.png", 48),
        (WEB / "public/favicon-32.png", 32),
    ]
    for path, size in targets:
        img = base if size == 1024 else base.resize((size, size), Image.LANCZOS)
        img.save(path, "PNG")
        print(f"wrote {path.relative_to(WEB)} {size}x{size}")


if __name__ == "__main__":
    main()
