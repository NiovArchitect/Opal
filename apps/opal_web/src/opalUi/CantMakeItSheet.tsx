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
  /** When true, lead must hand off before leaving (863:195). */
  viewerIsLead?: boolean;
  onBack: () => void;
  onConfirm: (note?: string) => void;
  onHandoffLead?: () => void;
};

export function CantMakeItSheet({
  place,
  whenLabel,
  viewerIsLead = false,
  onBack,
  onConfirm,
  onHandoffLead,
}: Props) {
  return (
    <div
      className="cant-make-it-sheet"
      data-testid="cant-make-it-sheet"
      data-figma-cant="863:195"
      data-figma-node="863:195"
      data-figma-cant-lineage="258:49"
      data-viewer-is-lead={viewerIsLead ? "true" : "false"}
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
        Leaving changes only your participation.
      </p>
      <p className="gsh-meta">
        {place || "This Journey"} · {whenLabel || "scheduled"}
      </p>
      <p className="gsh-meta">
        Only you leave. The Journey continues for everyone else. The reservation stays unless an authorized lead changes it.
      </p>
      {viewerIsLead ? (
        <p className="gsh-gate-note" role="status" data-testid="cant-make-it-lead-gate">
          If you are the lead - Hand off lead first.
        </p>
      ) : null}
      <div className="cant-make-it-actions">
        <button
          type="button"
          className="btn ghost"
          data-testid="cant-make-it-keep-going"
          onClick={onBack}
        >
          Keep going
        </button>
        {viewerIsLead && onHandoffLead ? (
          <button
            type="button"
            className="btn primary"
            data-testid="cant-make-it-handoff"
            onClick={onHandoffLead}
          >
            Hand off lead
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            data-testid="cant-make-it-confirm"
            onClick={() => onConfirm(undefined)}
            disabled={viewerIsLead}
          >
            Leave this plan
          </button>
        )}
      </div>
    </div>
  );
}
