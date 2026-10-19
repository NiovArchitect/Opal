#!/usr/bin/env python3
"""
Repair #18 - THE ORB SYSTEM - hero asset derivation (section 8.1:
the HERO asset = the master itself, near-black keyed to transparent;
light mode gets a VARIANT - the stone in its own dark medallion,
jewel-in-case - never an inversion).

Pipeline (deterministic, re-runnable):
  1. Load shots/repair18/design-masters/opal-orb-master.webp (1600px).
  2. Luminosity key: alpha = clamp((lum - 10) / (64 - 10)) where lum is
     the per-pixel mean channel value, so the near-black field
     (sampled field = #000000 at the corners) goes fully transparent
     and the lit composition stays opaque.
  3. Saturation guard: alpha = max(alpha, clamp((sat - 24) / 96))
     where sat = max-min channel spread, so the deep violet fire in
     the swirl's shadowed folds (dark but saturated) is not keyed
     away with the field.
  4. RGB is carried through UNCHANGED from the master (no recolor, no
     grade). Where alpha < 1 the stored RGB still holds the master's
     own pixels; browsers composite with premultiplied alpha, so the
     result on any field is the master's light, nothing added.
  5. Outputs (WebP, alpha preserved):
       public/brand/orb/opal-orb-hero.webp        1024px, quality 90
       public/brand/orb/opal-orb-hero-512.webp     512px, quality 90
  6. Light-mode medallion variant: the 1024px keyed hero scaled to
     92% and masked into a circle (radius 46% of canvas) over a disc
     filled with the sampled wordmark field #18141c deepened toward
     the orb field (the disc IS the master's own field color family),
     ringed with the sampled ring-metal median #dbae8e at 2px plus a
     soft outer glow of the same metal at low alpha. The art inside
     the medallion is the master itself, untouched; the disc is a
     presentation device derived from sampled tokens, declared as
     such in orb-system-report.md.
       public/brand/orb/opal-orb-medallion.webp   1024px, quality 90

Usage: python3 apps/opal_web/scripts/orb/build_hero_assets.py
Requires: Pillow, numpy.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve()
REPO = HERE.parents[4]
WEB = HERE.parents[2]
MASTER = REPO / "shots/repair18/design-masters/opal-orb-master.webp"
OUT_DIR = WEB / "public/brand/orb"

# Keying parameters (recorded per the derive-don't-redraw law).
LUM_T0, LUM_T1 = 10.0, 64.0
SAT_T0, SAT_T1 = 24.0, 96.0
# Sampled tokens used by the medallion device (orbSampled.json).
MEDALLION_FIELD = (16, 12, 22)      # orb field family, between #000000 and #18141c
RING_METAL = (219, 174, 142)        # sampled ring metal median #dbae8e


def key_alpha(rgb: np.ndarray) -> np.ndarray:
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    a_lum = np.clip((lum - LUM_T0) / (LUM_T1 - LUM_T0), 0, 1)
    a_sat = np.clip((sat - SAT_T0) / (SAT_T1 - SAT_T0), 0, 1)
    return (np.maximum(a_lum, a_sat) * 255).astype(np.uint8)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = Image.open(MASTER).convert("RGB")
    rgb = np.asarray(src).astype(float)
    alpha = key_alpha(rgb)
    hero = Image.merge(
        "RGBA",
        (
            src.split()[0],
            src.split()[1],
            src.split()[2],
            Image.fromarray(alpha, "L"),
        ),
    )
    hero1024 = hero.resize((1024, 1024), Image.LANCZOS)
    hero1024.save(OUT_DIR / "opal-orb-hero.webp", "WEBP", quality=90, method=6)
    hero.resize((512, 512), Image.LANCZOS).save(
        OUT_DIR / "opal-orb-hero-512.webp", "WEBP", quality=90, method=6
    )

    # ---- light-mode medallion variant (jewel-in-case) ---------------------
    size = 1024
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # soft glow of sampled ring metal behind the disc
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([28, 28, size - 28, size - 28], outline=RING_METAL + (110,), width=26)
    glow = glow.filter(ImageFilter.GaussianBlur(36))
    canvas.alpha_composite(glow)
    disc = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dd = ImageDraw.Draw(disc)
    dd.ellipse([40, 40, size - 40, size - 40], fill=MEDALLION_FIELD + (255,))
    canvas.alpha_composite(disc)
    # the master itself, keyed, masked into the disc's inner circle
    inner = hero1024.resize((int(size * 0.92), int(size * 0.92)), Image.LANCZOS)
    mask = Image.new("L", inner.size, 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([6, 6, inner.size[0] - 6, inner.size[1] - 6], fill=255)
    offset = ((size - inner.size[0]) // 2, (size - inner.size[1]) // 2)
    # effective alpha = min(master alpha, circular mask), per pixel;
    # composited with true Porter-Duff (Image.paste is NOT alpha
    # compositing on an RGBA destination - it would thin the disc's
    # alpha and let the page field bleed through the jewel).
    combined = np.minimum(
        np.asarray(inner.split()[3]).astype(int), np.asarray(mask).astype(int)
    ).astype(np.uint8)
    inner.putalpha(Image.fromarray(combined, "L"))
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(inner, offset)
    canvas = Image.alpha_composite(canvas, layer)
    ring = ImageDraw.Draw(canvas)
    ring.ellipse([40, 40, size - 40, size - 40], outline=RING_METAL + (255,), width=3)
    canvas.save(OUT_DIR / "opal-orb-medallion.webp", "WEBP", quality=90, method=6)

    a = np.asarray(alpha)
    print(
        "alpha: transparent {:.1%}  opaque {:.1%}  partial {:.1%}".format(
            float((a == 0).mean()), float((a == 255).mean()),
            float(((a > 0) & (a < 255)).mean()),
        )
    )
    for f in sorted(OUT_DIR.iterdir()):
        print(f.name, f.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
