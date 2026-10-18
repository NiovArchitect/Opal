/**
 * Repair #18 - Division C2 - the Join wordmark + the two legal lockups
 * (track-c2 section 1.2).
 *
 * Form: lowercase opal in a drawn rounded geometric sans. The o is a
 * true circle with a single gap at upper right, where a short joining
 * stroke exits the o and touches the stem of the p. No other letters
 * touch. In product chrome the wordmark is always solid ink (currentColor
 * resolves to the surface ink token at the call site). Gradient fill is
 * allowed ONLY in the Splash 1 / Splash 2 hero lockups, as art.
 *
 * Only two lockups are legal: hero (mark above wordmark, splash and
 * launch only) and inline (mark left of wordmark, in-app headers).
 * Below 64px wide, use the mark alone - never a shrunken wordmark.
 */
import React from "react";
import { C2_ASSETS } from "../brand/c2Identity";
import { C2Mark } from "./LoopCharacter";

/** The drawn Join letterforms, inline so currentColor carries the ink token. */
export function C2WordmarkGlyphs({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 196 88"
      role="img"
      aria-label="Opal"
      data-c2-asset="wordmark"
    >
      <title>Opal</title>
      <g fill="none" stroke="currentColor" strokeWidth={11} strokeLinecap="round">
        <path d="M 43.9 28.5 A 16 16 0 1 0 45.8 39.8" />
        <path d="M 43.5 30.5 L 60 27.8" />
        <path d="M 64 27 L 64 74" />
        <circle cx={80} cy={42} r={16} />
        <circle cx={124} cy={42} r={16} />
        <path d="M 140 27 L 140 58" />
        <path d="M 168 14 L 168 58" />
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
  const height = Math.round(width * (88 / 196));
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
  const wordH = Math.round(wordmarkWidth * (88 / 196));
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
 * Hero lockup: Loop above the gradient wordmark, centered. Splash 1,
 * Splash 2, and the app launch screen ONLY. Art, never a button, and it
 * never carries the words Enter Opal.
 */
export function C2LockupHero({
  wordmarkWidth = 132,
  className,
}: {
  wordmarkWidth?: number;
  className?: string;
}) {
  const w = Math.max(wordmarkWidth, 120);
  return (
    <span
      className={`c2-lockup-hero ${className ?? ""}`.trim()}
      data-c2-lockup="hero"
      role="img"
      aria-label="Opal Graph"
    >
      <img
        className="c2-lockup-hero-img"
        src={C2_ASSETS.lockupHero}
        width={Math.round(w * (240 / 196))}
        alt=""
        role="presentation"
        draggable={false}
        data-c2-asset="lockup-hero"
      />
    </span>
  );
}
