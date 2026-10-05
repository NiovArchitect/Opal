/**
 * Opal presence orb — identity for Holy Shit Moments 2–5.
 * Cyan radial glow. Pulses at rest, intensifies while typing, spins while working.
 */
import React from "react";

export type OpalOrbMode = "idle" | "typing" | "working" | "ready";

type Props = {
  mode?: OpalOrbMode;
  size?: number;
};

export function OpalPresenceOrb({ mode = "idle", size = 80 }: Props) {
  return (
    <div
      className={`hs-orb hs-orb-${mode}`}
      data-testid="hs-opal-orb"
      data-orb-mode={mode}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="hs-orb-glow" />
      <span className="hs-orb-core" />
      <span className="hs-orb-ring" />
    </div>
  );
}

/** Theatrical typing dots — 650ms cycle, synced visually with orb pulse. */
export function HsTypingDots() {
  return (
    <span className="hs-typing-dots" data-testid="hs-typing-dots" aria-label="Opal is typing">
      <i />
      <i />
      <i />
    </span>
  );
}
