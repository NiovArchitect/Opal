/**
 * Pass 30R2 / 31 — Reality forming (Figma 124:2).
 * Atmospheric Moment residue + human facts. No FORMING / WHERE schema labels.
 * Pass 31: when exact place is grounded, show place — never "Where should dinner be?"
 */
import React from "react";

export type RealityFormingProps = {
  whoLabel: string;
  whenLabel?: string;
  /** Settled place line when exact place grounded */
  placeLabel?: string | null;
  question?: string;
  mediaUrl?: string | null;
  /** next_gap for tests — must not be "place" when place grounded */
  nextGap?: string;
  exactPlaceGrounded?: boolean;
  onContinue: () => void;
  onDismiss?: () => void;
};

export function RealityFormingSurface({
  whoLabel,
  whenLabel = "When still open",
  placeLabel = null,
  question = "When works?",
  mediaUrl,
  nextGap,
  exactPlaceGrounded = false,
  onContinue,
  onDismiss,
}: RealityFormingProps) {
  return (
    <div
      className="reality-forming-surface"
      data-testid="reality-forming-surface"
      data-node-ref="124:2"
      data-exact-place={exactPlaceGrounded ? "true" : "false"}
      data-next-gap={nextGap || undefined}
      role="dialog"
      aria-label={whoLabel}
    >
      <div className="reality-forming-atmosphere" aria-hidden>
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="reality-forming-media" />
        ) : (
          <div className="reality-forming-media is-fallback" />
        )}
        <div className="reality-forming-wash" />
        {mediaUrl ? (
          <div className="reality-forming-residue">
            <img src={mediaUrl} alt="" />
          </div>
        ) : null}
      </div>

      <div className="reality-forming-plate">
        <h2 className="reality-forming-title" data-testid="reality-forming-title">
          {whoLabel}
        </h2>
        {placeLabel ? (
          <p className="reality-forming-place" data-testid="reality-forming-place">
            {placeLabel}
          </p>
        ) : null}
        <p className="reality-forming-when">{whenLabel}</p>
        <button
          type="button"
          className="reality-forming-question"
          data-testid="reality-forming-continue"
          data-opens-place={exactPlaceGrounded ? "false" : "true"}
          onClick={onContinue}
        >
          {question}
        </button>
      </div>

      {onDismiss ? (
        <button
          type="button"
          className="reality-forming-dismiss"
          data-testid="reality-forming-dismiss"
          onClick={onDismiss}
        >
          Not now
        </button>
      ) : null}
    </div>
  );
}
