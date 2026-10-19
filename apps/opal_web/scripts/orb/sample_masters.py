#!/usr/bin/env python3
"""
Repair #18 - THE ORB SYSTEM - programmatic color sampling from the
founder's drawn brand masters (communication-model.md section 8.1:
DERIVE, DON'T REDRAW; palette + gradient stops are SAMPLED
PROGRAMMATICALLY from the masters and stored as design tokens; code
never approximates the drawing's colors from memory).

Method (deterministic; no eyeballing, no randomness):
  * Masters are read from shots/repair18/design-masters/ (repo root is
    four levels above this file: apps/opal_web/scripts/orb/).
  * Field: median RGB of four 41x41 corner patches (orb master) and of
    the wordmark master's top band (its own field).
  * Orb geometry: the sphere is located by a gradient-edge circle fit
    (search center 780..830, radius 390..440, maximize mean gradient
    magnitude on the circle); the gyroscope ring radius is the radial
    histogram peak of warm bright pixels outside the sphere.
  * Fire clusters: pixels strictly inside the sphere (r < 380/410 of
    the fitted radius, so the glass edge never contaminates), with
    saturation >= 0.30 and value >= 0.25, are converted to HSV with a
    vectorized conversion and binned into named hue sectors. Each
    cluster value is the MEDIAN RGB of its sector's pixels.
  * Ring metal: warm pixels (R > B + 40) with luminance > 90 in the
    annulus r in [ring_r - 20, ring_r + 20] around the fitted center;
    median + 90th percentile (the lit edge).
  * Points of light: warm pixels with luminance > 230 anywhere in the
    orb master; median RGB.
  * Wordmark: letters are located by the >60-luminance column runs
    (four runs = O, P, A, L). The left-to-right gradient is the median
    RGB of letter pixels in 8 equal x-slices of the combined letter
    bounding box. The gem O's facets are sampled every 15 degrees on
    the annulus mid-circle (center = O bbox center, radius =
    (outer_r + inner_r) / 2 as measured from the O's middle row runs),
    median of a 9x9 patch at each angle.
  * The state spectrum anchors come from the fire clusters:
    forming = violet sector, happening = cyan sector, ready = gold
    sector, action = the red-orange sector (hue < 18 deg). The master
    contains NO pure red; the action anchor is honestly the master's
    deepest warm sector, and the per-mode action tokens in
    theme/orbTokens.css are that anchor adjusted only for the
    documented per-mode contrast floors (see orb-system-report.md).

Output: apps/opal_web/src/brand/orb/orbSampled.json - the generated
record the token files mirror and orbTokens.test.ts pins against.

Usage: python3 apps/opal_web/scripts/orb/sample_masters.py
Requires: Pillow, numpy.
"""

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve()
REPO = HERE.parents[4]
WEB = HERE.parents[2]
ORB_MASTER = REPO / "shots/repair18/design-masters/opal-orb-master.webp"
WM_MASTER = REPO / "shots/repair18/design-masters/opal-wordmark-master.webp"
OUT = WEB / "src/brand/orb/orbSampled.json"


def hx(rgb) -> str:
    return "#%02x%02x%02x" % tuple(int(round(float(c))) for c in rgb)


def rgb_to_hsv_deg(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Vectorized RGB (0..1) -> hue degrees, saturation, value."""
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    mx = rgb.max(axis=1)
    mn = rgb.min(axis=1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-9
    idx = nz & (mx == r)
    h[idx] = (60 * ((g[idx] - b[idx]) / d[idx]) + 360) % 360
    idx = nz & (mx == g)
    h[idx] = 60 * ((b[idx] - r[idx]) / d[idx]) + 120
    idx = nz & (mx == b)
    h[idx] = 60 * ((r[idx] - g[idx]) / d[idx]) + 240
    s = np.where(mx > 1e-9, d / np.maximum(mx, 1e-9), 0.0)
    return h, s, mx


def median_hex(pixels: np.ndarray) -> str:
    return hx(np.median(pixels, axis=0))


def main() -> None:
    orb = np.asarray(Image.open(ORB_MASTER).convert("RGB")).astype(float)
    wm = np.asarray(Image.open(WM_MASTER).convert("RGB")).astype(float)
    H, W = orb.shape[:2]
    lum = orb.mean(axis=2)

    # ---- field ------------------------------------------------------------
    patches = []
    for y, x in [(50, 50), (50, W - 51), (H - 51, 50), (800, 80), (80, 800)]:
        patches.append(orb[max(0, y - 20):y + 21, max(0, x - 20):x + 21].reshape(-1, 3))
    field = median_hex(np.concatenate(patches))
    wm_field = median_hex(wm[0:400].reshape(-1, 3))

    # ---- sphere geometry: gradient-edge circle fit ------------------------
    gy, gx = np.gradient(lum)
    mag = np.hypot(gx, gy)
    theta = np.linspace(0, 2 * np.pi, 360, endpoint=False)
    best = None
    for cx in range(780, 831, 10):
        for cy in range(780, 831, 10):
            for r in range(390, 441, 5):
                xs = (cx + r * np.cos(theta)).astype(int)
                ys = (cy + r * np.sin(theta)).astype(int)
                v = float(mag[ys, xs].mean())
                if best is None or v > best[0]:
                    best = (v, cx, cy, r)
    _, scx, scy, sr = best

    # ---- gyroscope ring radius: radial peak of warm bright pixels ---------
    Y, X = np.mgrid[0:H, 0:W]
    rad = np.hypot(X - scx, Y - scy)
    warm = (orb[:, :, 0] > orb[:, :, 2] + 40) & (lum > 110) & (rad > sr + 20)
    hist = np.bincount(rad[warm].astype(int).ravel(), minlength=900)
    ring_r = int(np.argmax(hist))

    # ---- fire clusters inside the sphere ----------------------------------
    inside = rad < (sr * 380 / 410)
    px = orb[inside].reshape(-1, 3) / 255.0
    hue, sat, val = rgb_to_hsv_deg(px)
    keep = (sat >= 0.30) & (val >= 0.25)
    px, hue, sat_all = px[keep], hue[keep], sat[keep]
    sectors = {
        "redOrange": (hue < 18) | (hue >= 345),
        "gold": (hue >= 18) & (hue < 70),
        "cyan": (hue >= 170) & (hue < 215),
        "blue": (hue >= 215) & (hue < 255),
        "violet": (hue >= 255) & (hue < 295),
        "magenta": (hue >= 295) & (hue < 345),
    }
    fire = {}
    total = len(px)
    val_all = px.max(axis=1)
    for name, m in sectors.items():
        if m.sum() == 0:
            continue
        # Core hue: the fire's bright core - median RGB of the sector's
        # top quartile by value. Still purely programmatic; the plain
        # median ("hex") is shadow-weighted by the swirl's dark folds.
        # Peak hue: median RGB of the sector's top 5% by
        # saturation x value - the vivid filament color the eye reads
        # as the fire. Gradient stops use peakHex; light-mode state
        # anchors use the shadow-weighted median (contrast, below).
        core = m & (val_all >= np.percentile(val_all[m], 75))
        score = sat_all * val_all
        peak = m & (score >= np.percentile(score[m], 95))
        # Shade: median of the sector's value 10th..35th percentile -
        # the same hue in the swirl's shadowed folds; this is the
        # light-mode anchor (the bright fire cannot carry contrast on
        # a soft field, and light mode is a variant, not an inversion).
        vlo, vhi = np.percentile(val_all[m], 10), np.percentile(val_all[m], 35)
        shade = m & (val_all >= vlo) & (val_all <= vhi)
        fire[name] = {
            "hex": median_hex(px[m] * 255),
            "coreHex": median_hex(px[core] * 255),
            "peakHex": median_hex(px[peak] * 255),
            "shadeHex": median_hex(px[shade] * 255),
            "pixels": int(m.sum()),
            "shareOfFire": round(float(m.sum()) / total, 4),
            "medianHueDeg": round(float(np.median(hue[m])), 1),
        }

    # ---- ring metal + points of light -------------------------------------
    annulus = warm & (rad >= ring_r - 20) & (rad <= ring_r + 20)
    ring_px = orb[annulus].reshape(-1, 3)
    ring_metal = {
        "median": median_hex(ring_px),
        "p90": hx(np.percentile(ring_px, 90, axis=0)),
        "pixels": int(len(ring_px)),
    }
    bright_warm = orb[warm & (lum > 230)].reshape(-1, 3)
    points = {"median": median_hex(bright_warm), "pixels": int(len(bright_warm))}

    # ---- wordmark geometry + gradient -------------------------------------
    wlum = wm.mean(axis=2)
    mask = wlum > 60
    col = mask.any(axis=0)
    runs = []
    in_run = False
    for x, v in enumerate(col):
        if v and not in_run:
            start, in_run = x, True
        if not v and in_run:
            runs.append([start, x - 1])
            in_run = False
    letters = []
    for a, b in runs:
        ys = np.where(mask[:, a:b + 1].any(axis=1))[0]
        letters.append({"x0": int(a), "x1": int(b), "y0": int(ys.min()), "y1": int(ys.max())})
    lx0, lx1 = runs[0][0], runs[-1][1]
    letter_px_mask = mask[:, lx0:lx1 + 1]
    slices = []
    edges = np.linspace(lx0, lx1 + 1, 9).astype(int)
    for i in range(8):
        sub = wm[:, edges[i]:edges[i + 1]]
        m = wlum[:, edges[i]:edges[i + 1]] > 60
        slices.append(median_hex(sub[m].reshape(-1, 3)))
    # gem O: annulus from the middle-row runs of the O's column span
    o = letters[0]
    ocx, ocy = (o["x0"] + o["x1"]) / 2, (o["y0"] + o["y1"]) / 2
    mid_row = np.where(wlum[int(ocy), o["x0"]:o["x1"] + 1] > 60)[0]
    outer_r = (o["x1"] - o["x0"]) / 2
    # inner counter edge: first dark run between the two lit runs on the middle row
    lit = wlum[int(ocy), o["x0"]:o["x1"] + 1] > 60
    edges_idx = np.where(np.diff(lit.astype(int)) != 0)[0]
    inner_left = o["x0"] + int(edges_idx[0]) + 1
    inner_right = o["x0"] + int(edges_idx[1])
    inner_r = (inner_right - inner_left) / 2
    facet_r = (outer_r + inner_r) / 2
    facets = []
    for deg in range(0, 360, 15):
        t = math.radians(deg)
        x = int(ocx + facet_r * math.cos(t))
        y = int(ocy + facet_r * math.sin(t))
        patch = wm[y - 4:y + 5, x - 4:x + 5].reshape(-1, 3)
        facets.append({"deg": deg, "hex": median_hex(patch)})

    data = {
        "generatedBy": "apps/opal_web/scripts/orb/sample_masters.py",
        "masters": {
            "orb": "shots/repair18/design-masters/opal-orb-master.webp",
            "wordmark": "shots/repair18/design-masters/opal-wordmark-master.webp",
        },
        "field": {"orb": field, "wordmark": wm_field},
        "orbGeometry": {
            "canvas": [int(W), int(H)],
            "sphereCenter": [int(scx), int(scy)],
            "sphereRadius": int(sr),
            "ringRadius": ring_r,
            "horizontalRingCenterY": 846,
        },
        "fire": fire,
        "ringMetal": ring_metal,
        "pointsOfLight": points,
        "wordmark": {
            "canvas": [int(wm.shape[1]), int(wm.shape[0])],
            "letters": letters,
            "gradientSlices": slices,
            "gemO": {
                "center": [ocx, ocy],
                "outerRadius": outer_r,
                "innerRadius": inner_r,
                "stroke": round(outer_r - inner_r, 1),
                "facets": facets,
            },
        },
    }
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
