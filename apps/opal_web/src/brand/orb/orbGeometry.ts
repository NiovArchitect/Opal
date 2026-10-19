/**
 * Repair #18 - THE ORB SYSTEM - measured master geometry.
 *
 * Every number here was MEASURED from the founder's masters by
 * scripts/orb/sample_masters.py (see src/brand/orb/orbSampled.json),
 * never drawn by eye:
 *  - Orb master (1600x1600): sphere center (810, 800), radius 410
 *    (gradient-edge circle fit); gyroscope ring radius 568 (radial
 *    histogram peak of warm bright pixels); horizontal ring center
 *    y 846, lit span x 113..1513.
 *  - Wordmark master (1920x1280): letter runs O 195..569, P 704..958,
 *    A 1024..1364, L 1486..1724, letter height 465..837; gem O outer
 *    radius 187, counter radius 144, stroke 43 (all in master px).
 *
 * The viewBoxes below are those measurements rescaled: orb x0.125,
 * wordmark translated by (-195, -465). The standalone files in
 * public/brand/orb/ carry the SAME values; orbTokens.test.ts pins
 * the two together.
 *
 * HONESTY (fidelity law): the vector forms in this system are
 * REDUCTIONS - simplifications derived from the master geometry,
 * style-identical family. Hero sizes carry the master itself
 * (public/brand/orb/opal-orb-hero.webp), never these vectors.
 */

/** Orb reduction viewBox (200x200, master x0.125). */
export const ORB_VIEWBOX = "0 0 200 200";
export const ORB_SPHERE = { cx: 101, cy: 100, r: 51 } as const;
export const ORB_RING = { cx: 101, cy: 100, r: 71 } as const;
export const ORB_HRING = { cx: 101, cy: 106, rx: 86, ry: 11 } as const;
/** Points of light on the rings (master: lit nodes where rings catch light). */
export const ORB_POINTS = [
  { cx: 101, cy: 29 },
  { cx: 151, cy: 50 },
  { cx: 187, cy: 106 },
  { cx: 101, cy: 171 },
  { cx: 51, cy: 150 },
  { cx: 15, cy: 106 },
] as const;

/** Wordmark reduction viewBox (master letters translated to origin). */
export const WM_VIEWBOX = "0 0 1530 372";
export const WM_STROKE = 43;
/** Gem O: center (187, 186), outer r 187, counter r 144, in local px. */
export const GEM_O = { cx: 187, cy: 186, outerR: 187, innerR: 144 } as const;
/**
 * The gem O's facet sectors (12 x 30 degrees), as annulus quads.
 * Fill per sector is the SAMPLED facet color at the sector's
 * mid-angle (orbSampled.json wordmark.gemO.facets) - sampled, not
 * chosen. Sector 0 starts at the top and runs clockwise.
 */
export const GEM_O_FACETS: ReadonlyArray<{ points: string; fill: string }> = [
  { points: "187.0,-1.0 280.5,24.1 259.0,61.3 187.0,42.0", fill: "#c4c6f4" },
  { points: "280.5,24.1 348.9,92.5 311.7,114.0 259.0,61.3", fill: "#a9dff6" },
  { points: "348.9,92.5 374.0,186.0 331.0,186.0 311.7,114.0", fill: "#d9cdc7" },
  { points: "374.0,186.0 348.9,279.5 311.7,258.0 331.0,186.0", fill: "#d4d1c7" },
  { points: "348.9,279.5 280.5,347.9 259.0,310.7 311.7,258.0", fill: "#6aaee9" },
  { points: "280.5,347.9 187.0,373.0 187.0,330.0 259.0,310.7", fill: "#8c86d5" },
  { points: "187.0,373.0 93.5,347.9 115.0,310.7 187.0,330.0", fill: "#cbbdf1" },
  { points: "93.5,347.9 25.1,279.5 62.3,258.0 115.0,310.7", fill: "#754db8" },
  { points: "25.1,279.5 0.0,186.0 43.0,186.0 62.3,258.0", fill: "#8852c1" },
  { points: "0.0,186.0 25.1,92.5 62.3,114.0 43.0,186.0", fill: "#ab78dd" },
  { points: "25.1,92.5 93.5,24.1 115.0,61.3 62.3,114.0", fill: "#d7c3f7" },
  { points: "93.5,24.1 187.0,-1.0 187.0,42.0 115.0,61.3", fill: "#7a6bc7" },
];
/** P, A, L as stroked paths in local coordinates (master runs, stroke 43). */
export const WM_PATHS = {
  /** P: stem x 509..553 local, bowl to x 763, cap top to mid. */
  p: "M531 372 V0 H636 A93 93 0 0 1 636 186 H531",
  /** A: legs from baseline (829..1169 local) to the apex; no crossbar in the master. */
  a: "M856 372 L1010 2 L1164 372",
  /** L: stem x 1291..1335 local, foot to x 1529. */
  l: "M1313 0 V372 H1529",
} as const;
