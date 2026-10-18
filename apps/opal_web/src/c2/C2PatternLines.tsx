/**
 * Repair #18 - Division C2 - Current Lines pattern (section 2.3).
 * Thin contour lines converging toward a single off-center point.
 * At most 9 lines in any viewport, no line crosses text (the splash
 * layouts stop the pattern before the copy block by composition), and
 * the stroke resolves from the mode token so it is correct in both
 * modes with no second render.
 */
import React from "react";

export function C2PatternLines({
  convergenceY = 62,
  heightPct = 100,
  className,
}: {
  /** Convergence point height, percent of the pattern zone height. */
  convergenceY?: number;
  /**
   * Pattern zone height, percent of the surface. The pattern stops
   * before the copy block (section 2.3: no line crosses text), so
   * splashes cap the zone above their headlines.
   */
  heightPct?: number;
  className?: string;
}) {
  const cy = convergenceY;
  const starts = [4, 16, 28, 40, 52, 64, 76, 88, 97];
  return (
    <svg
      className={`c2-pattern-lines ${className ?? ""}`.trim()}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={heightPct !== 100 ? { height: `${heightPct}%` } : undefined}
      aria-hidden
      data-c2-pattern="current-lines"
    >
      <g stroke="var(--pattern-lines)" strokeWidth={0.35} fill="none">
        {starts.map((x) => (
          <line key={x} x1={x} y1={-4} x2={50} y2={cy} />
        ))}
      </g>
    </svg>
  );
}
