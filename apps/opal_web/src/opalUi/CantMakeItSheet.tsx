/**
 * Journey I Can't Make It — CURRENT 863:195
 * Lineage only: 258:49
 * Participant-specific — does not cancel everyone or the reservation automatically.
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  place?: string | null;
  whenLabel?: string | null;
  onBack: () => void;
  onConfirm: (note?: string) => void;
};

export function CantMakeItSheet({ place, whenLabel, onBack, onConfirm }: Props) {
  return (
    <div
      className="cant-make-it-sheet"
      data-testid="cant-make-it-sheet"
      data-figma-cant="863:195"
      data-figma-node="863:195"
      data-figma-cant-lineage="258:49"
      role="dialog"
      aria-modal="true"
      aria-label="I can't make it"
    >
      <header className="graph-create-head">
        <button type="button" className="opal-nav-chevron" data-testid="cant-make-it-back" aria-label="Back" onClick={onBack}>‹</button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <h1 className="chats-home-title">I can't make it</h1>
      <p className="gsh-meta" data-testid="cant-make-it-lede">
        Withdraw yourself from this Journey
      </p>
      <p className="gsh-meta">
        {place || "This Journey"} · {whenLabel || "scheduled"}
      </p>
      <p className="gsh-meta">
        Only you leave. The Journey continues for everyone else.
      </p>
      <div className="cant-make-it-actions">
        <button
          type="button"
          className="btn ghost"
          data-testid="cant-make-it-keep-going"
          onClick={onBack}
        >
          Keep going
        </button>
        <button
          type="button"
          className="btn primary"
          data-testid="cant-make-it-confirm"
          onClick={() => onConfirm(undefined)}
        >
          I can't make it
        </button>
      </div>
    </div>
  );
}
