/**
 * Repair #21 (Orbit v3) - THE INFO BUBBLE PATTERN (reusable).
 *
 * Discovery doctrine: the product explains nothing on first paint.
 * Where an explanation is genuinely needed, it lives behind this
 * small italic (i) bubble, sitting quietly where the explanation
 * would have gone. Untapped, the surface carries only the bubble;
 * tapping it reveals the text in place, tapping again folds it
 * away. No other cluster needs to invent its own version of this:
 * import OrbitInfoBubble, pass an accessible label and the
 * explanation as children.
 *
 * The bubble is presentation only: it holds no state beyond its
 * own open fold and renders the words it is handed verbatim.
 */
import React, { useState } from "react";
import "./OrbitInfoBubble.css";

export function OrbitInfoBubble({
  label,
  children,
  testId = "orbit-info-bubble",
}: {
  /** Accessible name for the bubble button, e.g. "About this room". */
  label: string;
  /** The explanation, revealed only on tap. */
  children: React.ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="orbit-info-bubble-wrap">
      <button
        type="button"
        className="orbit-info-bubble"
        data-testid={testId}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open ? (
        <span className="orbit-info-bubble-text" data-testid={`${testId}-text`} role="note">
          {children}
        </span>
      ) : null}
    </span>
  );
}
