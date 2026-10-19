/**
 * DIR-5 logo / wordmark refinement - geometry parity + the
 * vanishing-stems regression.
 *
 * The pre-refinement gradient wordmark rendered as "ooo" on Splash 1
 * (both modes, first-look captures seed 3b34052): its p descender, a
 * stem, and l are vertical strokes with zero-width bounding boxes,
 * painted with an objectBoundingBox gradient - per the SVG spec such
 * shapes are not rendered at all. These tests pin:
 *  1. every gradient brand file uses gradientUnits="userSpaceOnUse";
 *  2. the public/brand/c2 files carry EXACTLY the shared geometry
 *     from brand/c2Geometry.ts that the live components render, so
 *     the file path and the component path can never drift apart;
 *  3. the wordmark geometry actually contains four distinct letters:
 *     a closed o, a joined p with the only descender, an a with a
 *     baseline-flush right stem, and an ascender l.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  C2_CURRENT_STOPS,
  C2_MARK_BODY_D,
  C2_MARK_CREST,
  C2_MARK_STROKE,
  C2_MARK_VIEWBOX,
  C2_WORDMARK,
  C2_WORDMARK_STROKE,
  C2_WORDMARK_VIEWBOX,
} from "./c2Geometry";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const brandDir = resolve(root, "public/brand/c2");
const read = (name: string) => readFileSync(resolve(brandDir, name), "utf8");

const W = C2_WORDMARK;
const wordmarkShapes = [
  `<path d="${W.bridgeD}"/>`,
  `<circle cx="${W.o.cx}" cy="${W.o.cy}" r="${W.o.r}"/>`,
  `<path d="${W.pStemD}"/>`,
  `<circle cx="${W.pBowl.cx}" cy="${W.pBowl.cy}" r="${W.pBowl.r}"/>`,
  `<circle cx="${W.aBowl.cx}" cy="${W.aBowl.cy}" r="${W.aBowl.r}"/>`,
  `<path d="${W.aStemD}"/>`,
  `<path d="${W.lStemD}"/>`,
];
const markShapes = [
  `<path d="${C2_MARK_BODY_D}" fill="none" stroke="currentColor" stroke-width="${C2_MARK_STROKE}" stroke-linejoin="round"/>`,
  `<circle cx="${C2_MARK_CREST.cx}" cy="${C2_MARK_CREST.cy}" r="${C2_MARK_CREST.r}" fill="none" stroke="currentColor" stroke-width="${C2_MARK_STROKE}"/>`,
];

describe("DIR-5 C2 brand geometry", () => {
  it("mark file carries the shared mark geometry exactly", () => {
    const svg = read("opal-c2-mark.svg");
    expect(svg).toContain(`viewBox="${C2_MARK_VIEWBOX}"`);
    for (const shape of markShapes) expect(svg).toContain(shape);
  });

  it("wordmark files carry the shared wordmark geometry exactly", () => {
    for (const name of ["opal-c2-wordmark.svg", "opal-c2-wordmark-gradient.svg"]) {
      const svg = read(name);
      expect(svg).toContain(`viewBox="${C2_WORDMARK_VIEWBOX}"`);
      expect(svg).toContain(`stroke-width="${C2_WORDMARK_STROKE}"`);
      for (const shape of wordmarkShapes) expect(svg, `${name}: ${shape}`).toContain(shape);
    }
  });

  it("lockup files compose the same mark + wordmark geometry", () => {
    const inline = read("opal-c2-lockup-inline.svg");
    for (const shape of [...markShapes, ...wordmarkShapes]) expect(inline).toContain(shape);
    const hero = read("opal-c2-lockup-hero.svg");
    for (const shape of wordmarkShapes) expect(hero).toContain(shape);
  });

  it("every gradient in the C2 brand files is userSpaceOnUse (vanishing-stems regression)", () => {
    for (const name of [
      "opal-c2-wordmark-gradient.svg",
      "opal-c2-lockup-hero.svg",
      "opal-c2-app-icon.svg",
    ]) {
      const svg = read(name);
      // The hero lockup's character group keeps one objectBoundingBox
      // gradient (id="cur") for its closed, area-ful pebble outline -
      // that shape class renders correctly. Every gradient that paints
      // a STEM or the refined mark must be userSpaceOnUse.
      const gradientTags = svg.match(/<linearGradient[^>]*>/g) ?? [];
      expect(gradientTags.length).toBeGreaterThan(0);
      const userSpace = gradientTags.filter((t) => t.includes('gradientUnits="userSpaceOnUse"'));
      if (name === "opal-c2-lockup-hero.svg") {
        expect(userSpace.length).toBe(1);
        expect(svg).toContain('stroke="url(#curw)"');
      } else {
        expect(gradientTags).toEqual(userSpace);
      }
      for (const stop of C2_CURRENT_STOPS) expect(svg).toContain(stop.color);
    }
  });

  it("app icon carries the refined mark: ring crest on the pebble crown", () => {
    const svg = read("opal-c2-app-icon.svg");
    expect(svg).toContain(
      `<circle cx="50" cy="8" r="10" fill="none" stroke="url(#cur)" stroke-width="5"/>`,
    );
    // No trace of the retired crest sliver in the icon.
    expect(svg).not.toContain("M50 21 C41 8 59 2 55 14");
  });

  it("wordmark geometry reads as four distinct letters", () => {
    // o is a closed circle (no gap arc, no diagonal stick), drawn at
    // the same size and baseline as the p and a bowls.
    expect({ cy: W.o.cy, r: W.o.r }).toEqual({ cy: W.pBowl.cy, r: W.pBowl.r });
    expect({ cy: W.o.cy, r: W.o.r }).toEqual({ cy: W.aBowl.cy, r: W.aBowl.r });
    // p is the only descender: its stem ends below the baseline (58).
    const pBottom = Number(W.pStemD.match(/V(\d+)/)?.[1]);
    expect(pBottom).toBeGreaterThan(58);
    // a stem and l stem both end flush at the baseline.
    expect(W.aStemD.endsWith("V58")).toBe(true);
    expect(W.lStemD.endsWith("V58")).toBe(true);
    // l is the only ascender: it starts above the x-height top (28),
    // and only modestly (21, not the old 14 tower).
    const lTop = Number(W.lStemD.match(/M163 (\d+)/)?.[1]);
    expect(lTop).toBeLessThan(28);
    expect(lTop).toBeGreaterThanOrEqual(20);
    // The join is horizontal (a link), not diagonal (a stick).
    expect(W.bridgeD).toMatch(/^M\d+ \d+ H\d+$/);
  });
});
