/**
 * Repair #18 - Division C2 - Loop, the new character (section 1.3).
 *
 * One continuous ribbon folded into a soft upright pebble with a single
 * crest loop. Matte ceramic body, the Current gradient as a thin inlaid
 * line, minimal ink face. Exactly five expressions, drawn as full asset
 * replacements, never morphed by code.
 *
 * Honesty law: the caller passes an expression derived from a REAL
 * signal (see loopExpressionForPresence). This component has no timers,
 * no mount effects, and never performs an emotion on its own. Breath
 * motion exists only at hero size on hero surfaces, and stops under
 * prefers-reduced-motion (c2.css). Below 64px it renders the faceless
 * mark, always.
 */
import React from "react";
import { C2_ASSETS, LOOP_FACE_MIN_PX, type LoopExpression } from "../brand/c2Identity";

export function LoopCharacter({
  expression = "rest",
  size = 88,
  hero = false,
  title = "Opal",
  className,
}: {
  /** Derived from a real presence signal by the caller. Default Rest. */
  expression?: LoopExpression;
  /** Rendered height in px. Width follows the 100:124 pebble ratio. */
  size?: number;
  /** Hero surfaces only: enables the slow Rest breath. */
  hero?: boolean;
  title?: string;
  className?: string;
}) {
  const height = size;
  const width = Math.round(size * (100 / 124));
  if (size < LOOP_FACE_MIN_PX) {
    return (
      <C2Mark size={size} title={title} className={className} />
    );
  }
  return (
    <img
      className={`c2-loop ${hero ? "c2-loop--hero" : ""} ${className ?? ""}`.trim()}
      src={C2_ASSETS.character[expression]}
      width={width}
      height={height}
      alt={title === "" ? "" : title}
      role={title === "" ? "presentation" : "img"}
      aria-hidden={title === "" ? true : undefined}
      data-c2-asset="character"
      data-c2-expression={expression}
      draggable={false}
    />
  );
}

/**
 * The faceless in-app mark at any size (headers, dock, empty states).
 * Rendered as INLINE svg so currentColor resolves to the surface ink
 * token in the active mode - an <img> SVG cannot inherit page color
 * and would paint black on the night stage. The standalone file
 * public/brand/c2/opal-c2-mark.svg carries the same two shapes for
 * non-DOM slots (favicon-class uses).
 */
export function C2Mark({
  size = 28,
  title = "",
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  const height = Math.max(size, 1);
  const width = Math.round(height * (100 / 124));
  return (
    <svg
      className={`c2-mark ${className ?? ""}`.trim()}
      viewBox="0 0 100 124"
      width={width}
      height={height}
      role={title === "" ? "presentation" : "img"}
      aria-label={title === "" ? undefined : title}
      aria-hidden={title === "" ? true : undefined}
      data-c2-asset="mark"
      data-c2-faceless="1"
    >
      <path
        d="M50 20 C72 20 86 40 86 64 C86 92 71 110 50 110 C29 110 14 92 14 64 C14 40 28 20 50 20 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path
        d="M50 21 C41 8 59 2 55 14 C53 19 47 20 50 21 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
      />
    </svg>
  );
}
