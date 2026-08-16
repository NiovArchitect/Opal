/**
 * Pass 30R2 — Reality forming (Figma 124:2).
 * Atmospheric Moment residue + human facts. No FORMING / WHERE schema labels.
 * No provenance chip text. Lineage lives underneath, not as metadata UI.
 */
import React from "react";

export type RealityFormingProps = {
  whoLabel: string;
  whenLabel?: string;
  question?: string;
  mediaUrl?: string | null;
  onContinue: () => void;
  onDismiss?: () => void;
};

export function RealityFormingSurface({
  whoLabel,
  whenLabel = "Saturday · still opening",
  question = "Where should dinner be?",
  mediaUrl,
  onContinue,
  onDismiss,
}: RealityFormingProps) {
  return (
    <div
      className="reality-forming-surface"
      data-testid="reality-forming-surface"
      data-node-ref="124:2"
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
        <h2 className="reality-forming-title">{whoLabel}</h2>
        <p className="reality-forming-when">{whenLabel}</p>
        <button
          type="button"
          className="reality-forming-question"
          data-testid="reality-forming-continue"
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
