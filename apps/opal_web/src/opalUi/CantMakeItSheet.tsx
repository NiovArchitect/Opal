/**
 * OGSN-14 — I cannot make it
 * Figma 258:49
 * Participant-specific — does not cancel everyone or the reservation automatically.
 */
import React, { useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  place?: string | null;
  whenLabel?: string | null;
  onBack: () => void;
  onConfirm: (note?: string) => void;
};

export function CantMakeItSheet({ place, whenLabel, onBack, onConfirm }: Props) {
  const [note, setNote] = useState("");
  return (
    <div
      className="cant-make-it-sheet"
      data-testid="cant-make-it-sheet"
      data-figma-cant="258:49"
      role="dialog"
      aria-modal="true"
      aria-label="I cannot make it"
    >
      <header className="graph-create-head">
        <button type="button" className="btn ghost" data-testid="cant-make-it-back" onClick={onBack}>
          Back
        </button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <h1 className="chats-home-title">I can't make it</h1>
      <p className="gsh-meta">
        {place || "This Journey"} · {whenLabel || "scheduled"}
      </p>
      <p className="gsh-meta">
        This only updates your participation. It does not cancel everyone else or automatically cancel a
        reservation.
      </p>
      <textarea
        className="opal-query"
        data-testid="cant-make-it-note"
        rows={3}
        placeholder="Optional note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="button"
        className="btn primary"
        data-testid="cant-make-it-confirm"
        onClick={() => onConfirm(note.trim() || undefined)}
      >
        Confirm I can't make it
      </button>
    </div>
  );
}
