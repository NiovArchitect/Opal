#!/usr/bin/env python3
"""
Repair #18 - SPLASH 1 REBUILD - the full-bleed master asset
(founder order 2026-10-18 13:48 PDT: splash 1 IS the master
composition, full-bleed; the served medallion-on-a-panel "doesn't
functionally work for an app").

Derivation (section 8.1: DERIVE, DON'T REDRAW):
  1. Load shots/repair18/design-masters/opal-orb-master.webp (1600px,
     the founder's master, RGB).
  2. Resize ONLY (1600 -> 1024, LANCZOS). No recolor, no grade, no
     crop, no keying - the splash carries the master's own field,
     dust and vignette, edge to edge. RGB carried through unchanged
     apart from the resampling.
  3. Output: public/brand/orb/opal-orb-master-full.webp (1024px, q90).

Also records the master's edge-field sample (median of the outer
24px frame) - the value the splash's night field token
(--orb-night-field in theme/orbTokens.css) carries, so the page
field below/around the square composition is the master's own
field continued, sampled not chosen:
  edge frame median = #05030f (measured 2026-10-18, this script).

Usage: python3 apps/opal_web/scripts/orb/build_splash_master.py
Requires: Pillow, numpy.
"""

from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve()
REPO = HERE.parents[4]
WEB = HERE.parents[2]
MASTER = REPO / "shots/repair18/design-masters/opal-orb-master.webp"
OUT = WEB / "public/brand/orb/opal-orb-master-full.webp"


def main() -> None:
    im = Image.open(MASTER).convert("RGB")
    arr = np.asarray(im).astype(int)
    frame = np.concatenate(
        [
            arr[:24, :, :].reshape(-1, 3),
            arr[-24:, :, :].reshape(-1, 3),
            arr[:, :24, :].reshape(-1, 3),
            arr[:, -24:, :].reshape(-1, 3),
        ]
    )
    med = np.median(frame, axis=0).astype(int)
    print("master edge-field median: #%02x%02x%02x" % tuple(med))
    out = im.resize((1024, 1024), Image.LANCZOS)
    out.save(OUT, "WEBP", quality=90)
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
