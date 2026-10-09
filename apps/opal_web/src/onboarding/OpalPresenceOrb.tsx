/**
 * Opal presence — character artwork for Holy Shit Moments 2–5.
 * Paste W2 3.2: character replaces abstract orb; keeps gentle pulse/float.
 */
import React from "react";
import { BRAND } from "../brand/brand";

export type OpalOrbMode = "idle" | "typing" | "working" | "ready";

type Props = {
  mode?: OpalOrbMode;
  size?: number;
};

const CHARACTER_SRC =
  BRAND.assets.opalCenterOpalRest645 ||
  BRAND.assets.opalDockOrbTrioMaster ||
  "/brand/opal-graph/opal-center-opal-645-3-rest-512.png";

export function OpalPresenceOrb({ mode = "idle", size = 80 }: Props) {
  return (
    <div
      className={`hs-orb hs-orb-character hs-orb-${mode}`}
      data-testid="hs-opal-orb"
      data-orb-mode={mode}
      data-presence="character"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="hs-orb-glow" />
      <img
        className="hs-orb-character-img"
        src={CHARACTER_SRC}
        alt=""
        draggable={false}
      />
      <span className="hs-orb-ring" />
    </div>
  );
}

/** Theatrical typing dots — 650ms cycle, synced visually with character pulse. */
export function HsTypingDots() {
  return (
    <span className="hs-typing-dots" data-testid="hs-typing-dots" aria-label="Opal is typing">
      <i />
      <i />
      <i />
    </span>
  );
}
