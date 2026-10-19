/**
 * Repair #18 - Division C2 - the wordmark + the two legal lockups
 * (track-c2 section 1.2), refined in the DIR-5 pass.
 *
 * Form: lowercase "opal" in a drawn rounded geometric sans, one
 * 11-unit stroke throughout (geometry: brand/c2Geometry.ts, the
 * single source the public/brand/c2 files are pinned to by test).
 * The o is a true closed circle, joined to the p by a short
 * horizontal bridge - the join, the wordmark's one ownable gesture.
 * The p is the only descender; the a is a bowl with a right stem
 * flush to the baseline; the l is a clean ascender. No other letters
 * touch, and the clear gaps between letter groups are even.
 *
 * In product chrome the wordmark is always solid ink (currentColor
 * resolves to the surface ink token at the call site). The Current
 * gradient is allowed ONLY in the Splash 1 / Splash 2 hero lockups,
 * as art - and it is always painted with gradientUnits=
 * "userSpaceOnUse": an objectBoundingBox gradient silently drops
 * every zero-width-bbox stroke (all our stems), which is why the
 * pre-refinement splash wordmark rendered as "ooo".
 *
 * Only two lockups are legal: hero (character above wordmark, splash
 * and launch only) and inline (mark left of wordmark, in-app
 * headers). Below 64px wide, use the mark alone - never a shrunken
 * wordmark.
 */
import React, { useId } from "react";
import {
  C2_CURRENT_STOPS,
  C2_WORDMARK,
  C2_WORDMARK_STROKE,
  C2_WORDMARK_VIEWBOX,
} from "../brand/c2Geometry";
import { LoopCharacter } from "./LoopCharacter";
import { C2Mark } from "./LoopCharacter";

/**
 * The drawn letterforms, inline so currentColor carries the ink
 * token. With variant="gradient" the same geometry is painted in the
 * Current gradient (hero lockups only).
 */
export function C2WordmarkGlyphs({
  className,
  variant = "ink",
}: {
  className?: string;
  variant?: "ink" | "gradient";
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `c2-current-${rawId}`;
  const paint = variant === "gradient" ? `url(#${gradientId})` : "currentColor";
  const w = C2_WORDMARK;
  return (
    <svg
      className={className}
      viewBox={C2_WORDMARK_VIEWBOX}
      role="img"
      aria-label="Opal"
      data-c2-asset="wordmark"
      data-c2-variant={variant}
    >
      <title>Opal</title>
      {variant === "gradient" ? (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={172}
            y2={0}
          >
            {C2_CURRENT_STOPS.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <g fill="none" stroke={paint} strokeWidth={C2_WORDMARK_STROKE} strokeLinecap="round">
        <path d={w.bridgeD} />
        <circle cx={w.o.cx} cy={w.o.cy} r={w.o.r} />
        <path d={w.pStemD} />
        <circle cx={w.pBowl.cx} cy={w.pBowl.cy} r={w.pBowl.r} />
        <circle cx={w.aBowl.cx} cy={w.aBowl.cy} r={w.aBowl.r} />
        <path d={w.aStemD} />
        <path d={w.lStemD} />
      </g>
    </svg>
  );
}

/** Chrome wordmark at a pixel width (>= 64). Solid ink, never gradient. */
export function C2Wordmark({
  width = 96,
  className,
}: {
  width?: number;
  className?: string;
}) {
  if (width < 64) {
    return <C2Mark size={Math.round(width * 0.45)} className={className} />;
  }
  const height = Math.round(width * (88 / 172));
  return (
    <span
      className={`c2-wordmark ${className ?? ""}`.trim()}
      style={{ width, height }}
      data-c2-lockup="wordmark"
    >
      <C2WordmarkGlyphs />
    </span>
  );
}

/** Inline lockup: mark left of wordmark on one baseline. In-app only. */
export function C2LockupInline({
  wordmarkWidth = 72,
  className,
}: {
  wordmarkWidth?: number;
  className?: string;
}) {
  const wordH = Math.round(wordmarkWidth * (88 / 172));
  return (
    <span
      className={`c2-lockup-inline ${className ?? ""}`.trim()}
      data-c2-lockup="inline"
      role="img"
      aria-label="Opal"
    >
      <C2Mark size={wordH} />
      <C2Wordmark width={wordmarkWidth} />
    </span>
  );
}

/**
 * Hero lockup: the character above the gradient wordmark, centered.
 * Splash 1, Splash 2, and the app launch screen ONLY. Art, never a
 * button, and it never carries the words Enter Opal. Composed from
 * live components - the pre-refinement baked lockup image carried
 * the broken "ooo" gradient geometry and is retired from this role.
 */
export function C2LockupHero({
  wordmarkWidth = 132,
  className,
}: {
  wordmarkWidth?: number;
  className?: string;
}) {
  const w = Math.max(wordmarkWidth, 120);
  const wordH = Math.round(w * (88 / 172));
  return (
    <span
      className={`c2-lockup-hero ${className ?? ""}`.trim()}
      data-c2-lockup="hero"
      role="img"
      aria-label="Opal Graph"
    >
      <LoopCharacter expression="rest" size={96} hero title="" />
      <span
        className="c2-wordmark"
        style={{ width: w, height: wordH }}
        data-c2-asset="lockup-hero"
      >
        <C2WordmarkGlyphs variant="gradient" />
      </span>
    </span>
  );
}
