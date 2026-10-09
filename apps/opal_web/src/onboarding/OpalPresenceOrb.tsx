/**
 * Opal presence — founder character in a Meta-Thaddeus-style bubble.
 * Paste W3 Brand Identity Lock: shots/brand/opal-character.png only.
 * Placement: onboarding chat + Opal Center talk surfaces (≥64px, dark, unobstructed).
 */
import React from "react";
import { BRAND } from "../brand/brand";

export type OpalOrbMode = "idle" | "typing" | "working" | "ready";

type Props = {
  mode?: OpalOrbMode;
  /** Rendered size in CSS px. Below 64 the character must not be used (caller should use gradient dot). */
  size?: number;
  /** When false, render bubble only (no status pill). Default true. */
  showStatus?: boolean;
  className?: string;
  testId?: string;
};

/** Founder asset only — never substitute, redraw, or crop into another pose. */
export const OPAL_CHARACTER_SRC =
  BRAND.assets.opalCharacter || "/brand/opal-character.png";

/** Honest status from real app mode — never fake activity. */
export function statusLabelForMode(mode: OpalOrbMode): string | null {
  if (mode === "working") return "Opal is working";
  if (mode === "typing") return "Opal is thinking";
  return null;
}

/**
 * Character bubble + optional status pill as one unit.
 * Idle/ready: gentle float, no pill. Working/thinking: honest pill.
 */
export function OpalPresenceOrb({
  mode = "idle",
  size = 80,
  showStatus = true,
  className,
  testId = "hs-opal-orb",
}: Props) {
  const safeSize = Math.max(64, size);
  const status = showStatus ? statusLabelForMode(mode) : null;

  return (
    <div
      className={`opal-presence-unit hs-orb-character hs-orb-${mode}${className ? ` ${className}` : ""}`}
      data-testid={testId}
      data-orb-mode={mode}
      data-presence="character"
      data-status={status ?? "rest"}
    >
      <div
        className={`hs-orb hs-orb-bubble hs-orb-${mode}`}
        style={{ width: safeSize, height: safeSize }}
        aria-hidden
      >
        <span className="hs-orb-glow" />
        <span className="hs-orb-bubble-frame">
          <img
            className="hs-orb-character-img"
            src={OPAL_CHARACTER_SRC}
            alt=""
            width={safeSize}
            height={safeSize}
            draggable={false}
          />
        </span>
        <span className="hs-orb-ring" />
      </div>
      {status ? (
        <p
          className="opal-presence-status"
          data-testid="opal-presence-status"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
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
