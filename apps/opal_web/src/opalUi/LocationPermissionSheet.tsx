/**
 * PERMISSION-01 — Location value / contextual
 * Figma 473:348
 * Never imitates the native OS/browser permission dialog.
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  onContinue: () => void;
  onNotNow: () => void;
};

export function LocationPermissionSheet({ onContinue, onNotNow }: Props) {
  return (
    <div
      className="location-permission-sheet"
      data-testid="location-permission-sheet"
      data-figma-permission="473:348"
      role="dialog"
      aria-modal="true"
      aria-label="Use location for timing"
    >
      <header className="graph-create-head">
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <h1 className="chats-home-title">Use location for timing?</h1>
      <p className="gsh-meta">
        Opal can suggest when to leave for this Journey. Knowing your location for private timing is not the
        same as sharing exact location with others.
      </p>
      <button type="button" className="btn primary" data-testid="location-permission-continue" onClick={onContinue}>
        Continue
      </button>
      <button type="button" className="btn ghost" data-testid="location-permission-not-now" onClick={onNotNow}>
        Not now
      </button>
      <p className="gsh-meta">Journey still works if you decline — leave timing stays unavailable.</p>
    </div>
  );
}
