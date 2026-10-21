#!/usr/bin/env python3
"""
Repair #21 (W-19) - THE MARBLE SPHERE - the brand's stone grain as a
reusable material asset.

Provenance: the grain is NOT redrawn and NOT synthesized. It is the
master's own sphere interior, cropped from the same keyed hero the
splash and Center carry (public/brand/orb/opal-orb-hero-512.webp,
itself a resize-only derivation of the founder's master), using the
measured master geometry recorded in src/brand/orb/orbGeometry.ts:
master 1600px sphere center (810, 800), radius 410 -> at 512px,
center (259.2, 256), radius 131.2.

Pipeline (deterministic, re-runnable):
  1. Load the 512px keyed hero (RGBA).
  2. Crop the sphere's bounding square (center +- radius).
  3. Mask to the circle: alpha 0 outside radius, the master's own
     pixels inside (RGB unchanged - no recolor, no grade).
  4. Resize to 256px and save as WebP (alpha preserved, quality 90):
       public/brand/orb/opal-marble-sphere.webp

The asset is the stone WITHOUT the gyroscope rings and WITHOUT the
night field, so a surface can seat the grain under its own ring
device (the pad's OrbMark rings, the splash composition) and every
sighting is the same stone.

Usage: python3 apps/opal_web/scripts/orb/build_marble_sphere.py
Requires: Pillow.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "brand" / "orb" / "opal-orb-hero-512.webp"
OUT = ROOT / "public" / "brand" / "orb" / "opal-marble-sphere.webp"

# Measured master geometry (orbGeometry.ts), scaled 1600 -> 512.
CX, CY, R = 259.2, 256.0, 131.2


def main() -> None:
    hero = Image.open(SRC).convert("RGBA")
    box = (round(CX - R), round(CY - R), round(CX + R), round(CY + R))
    crop = hero.crop(box)
    size = crop.width
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    alpha = crop.split()[-1].point(lambda a: a)
    # Intersect the master's own alpha with the circle mask.
    from PIL import ImageChops

    crop.putalpha(ImageChops.multiply(alpha, mask))
    out = crop.resize((256, 256), Image.LANCZOS)
    out.save(OUT, "WEBP", quality=90, method=6)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes) from {SRC.name} box={box}")


if __name__ == "__main__":
    main()
