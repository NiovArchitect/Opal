/**
 * Repair #18 - Division C2 - DIR-5 logo / wordmark refinement pass.
 *
 * SINGLE SOURCE for the refined mark + wordmark geometry. The React
 * components (src/c2/LoopCharacter.tsx, src/c2/C2Wordmark.tsx) and the
 * standalone files under public/brand/c2/ are both built from these
 * exact values; brandGeometry.test.ts pins the files to this module so
 * the two render paths can never drift apart again.
 *
 * What was wrong (first-look captures, seed 3b34052):
 *  1. The gradient wordmark did not say "opal" at all. Its three
 *     vertical stems (p descender, a stem, l) are zero-width-bounding-
 *     box strokes painted with an objectBoundingBox gradient; per the
 *     SVG paint-server rule such shapes are NOT rendered. Splash 1 in
 *     both modes therefore showed three circles and a bar - "ooo".
 *     Fix: every C2 gradient is now gradientUnits="userSpaceOnUse",
 *     and the letterforms no longer depend on tangent stems alone.
 *  2. Even in solid ink (Home header) the wordmark read weird: three
 *     identical r16 circles in a row (o, p bowl, a bowl), the o a
 *     smaller gapped arc with a diagonal stick (magnifier / lollipop
 *     read), p and a bowls nearly touching, and the l a bare bar
 *     floating after a double-width gap, taller than everything.
 *  3. The faceless mark was a thin (6-unit) pebble outline whose tiny
 *     crest sliver collapsed to a dot at dock/header sizes - an egg
 *     with a bump, illegible below hero size.
 *
 * The refinement - keep the interesting, remove the weird:
 *  - Wordmark: lowercase rounded geometric, ONE stroke weight. The o
 *    is a true closed circle, joined to the p by a short HORIZONTAL
 *    bridge at upper-third height (the "join" - the one ownable
 *    gesture, kept from the old mark, now drawn as a link between two
 *    full rings instead of a stick poking out of a broken o). The p
 *    carries the only descender, the a a right stem flush with the
 *    baseline, the l a clean ascender only modestly taller than the
 *    x-height. Even clear gaps between letter groups.
 *  - Mark: the character's pebble silhouette, distilled. Heavier
 *    10-unit outline, and the character's crest loop abstracted to a
 *    bold RING sitting on the pebble's crown - one device, legible at
 *    28px, and the same circle language as the wordmark's o.
 *  - Case stays lowercase; spacing is baked into the geometry (no
 *    letter-spacing at call sites).
 */

/** Mark canvas. Height grew 124 -> 136 to give the ring crest room. */
export const C2_MARK_VIEWBOX = "0 0 100 136";
export const C2_MARK_STROKE = 10;
/** Pebble body: the character silhouette, shifted +12y for the crest. */
export const C2_MARK_BODY_D =
  "M50 32 C72 32 86 52 86 76 C86 104 71 122 50 122 C29 122 14 104 14 76 C14 52 28 32 50 32 Z";
/** Crest ring: the character's loop, abstracted to one bold ring. */
export const C2_MARK_CREST = { cx: 50, cy: 17, r: 10 } as const;

export const C2_WORDMARK_VIEWBOX = "0 0 172 88";
export const C2_WORDMARK_STROKE = 11;
/** Baseline 58, x-height top 28, in a 172x88 canvas. */
export const C2_WORDMARK = {
  /** The join: a horizontal bridge, drawn first so its ends tuck
   *  under the o and the p stem. Visible only in the gap. */
  bridgeD: "M40 37 H63",
  o: { cx: 27, cy: 43, r: 15 },
  pStemD: "M63 28 V81",
  pBowl: { cx: 78, cy: 43, r: 15 },
  aBowl: { cx: 127, cy: 43, r: 15 },
  aStemD: "M142 28 V58",
  lStemD: "M163 21 V58",
} as const;

/**
 * The Current gradient stops, shared by every gradient brand asset.
 * Gradient files MUST use gradientUnits="userSpaceOnUse" - see the
 * header note: objectBoundingBox gradients silently drop strokes
 * whose bounding box has zero width or height (every stem we draw).
 */
export const C2_CURRENT_STOPS = [
  { offset: "0", color: "#2DD4BF" },
  { offset: "0.25", color: "#818CF8" },
  { offset: "0.5", color: "#C084FC" },
  { offset: "0.75", color: "#F0ABFC" },
  { offset: "1", color: "#FBBF24" },
] as const;
