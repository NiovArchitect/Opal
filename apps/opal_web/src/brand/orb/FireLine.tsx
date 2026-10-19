/**
 * Repair #18 - THE ORB SYSTEM - the FIRE LANGUAGE: the app-wide
 * treatment family derived from the master (section 8.1 point 4).
 *
 *  - FireLine / FireFrame: a thin iridescent gradient border (the
 *    "fire line") + a soft glow on the calm field. This is the
 *    treatment for notifications, nudges, and proactive reveals:
 *    one lit thing per surface (section 8 point 1) - the fire line
 *    is how a surface says "this carries the fire" without a
 *    saturated fill competing with it.
 *  - StateStone: the state spectrum from the orb, carried ONLY by
 *    the canonical indicator tokens (--orb-indicator-*): violet
 *    forming, cyan happening, gold ready, red action, past = the
 *    stone at rest (pale, NO glow). Indicator hues are pinned and
 *    mode-invariant (MP-11); pattern and fire are secondary
 *    indicators under QUIET and never carry state alone - the stone
 *    always pairs with the caller's finished label.
 *
 * Components render presentation only from explicit inputs (the
 * founder's input/output law): a state family + finished strings.
 * Unknown state families render forming + "Needs a look", matching
 * the PlanCardC2 unknown-state law - never a silent default.
 */
import React from "react";
import { ORB_INDICATOR, type OrbIndicatorState } from "./orbTokens";
import "./orb.css";

export const ORB_INDICATOR_STATES: readonly OrbIndicatorState[] = [
  "forming",
  "happening",
  "ready",
  "action",
  "past",
] as const;

export function isOrbIndicatorState(v: unknown): v is OrbIndicatorState {
  return typeof v === "string" && (ORB_INDICATOR_STATES as readonly string[]).includes(v);
}

/** The fire line alone: a 1px iridescent rule with the soft glow. */
export function FireLine({ className }: { className?: string }) {
  return <span className={`orb-fire-line ${className ?? ""}`.trim()} aria-hidden data-orb="fire-line" />;
}

/**
 * A calm surface framed by the fire line - the notification /
 * nudge / proactive-reveal container. Children are the caller's
 * finished content; the frame adds no copy of its own.
 */
export function FireFrame({
  children,
  state,
  className,
  testId,
}: {
  children: React.ReactNode;
  /** Optional state family: tints the glow to the indicator hue. */
  state?: OrbIndicatorState | string;
  className?: string;
  testId?: string;
}) {
  const known = state === undefined || isOrbIndicatorState(state);
  const family: OrbIndicatorState | null =
    state === undefined ? null : isOrbIndicatorState(state) ? state : "forming";
  if (!known && typeof console !== "undefined") {
    console.warn("[opal-orb] unknown indicator state in FireFrame", { state });
  }
  return (
    <div
      className={`orb-fire-frame ${className ?? ""}`.trim()}
      data-orb="fire-frame"
      data-orb-state={family ?? undefined}
      data-testid={testId}
      style={
        family
          ? ({ "--orb-frame-glow": `var(--orb-indicator-${family}-glow)` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}

/**
 * The state stone: a small orb reduction whose ring carries the
 * indicator hue. Past renders the stone at rest - pale ring, no
 * glow, no fire. Always paired with a label by the caller.
 */
export function StateStone({
  state,
  size = 14,
  className,
}: {
  state: OrbIndicatorState | string;
  size?: number;
  className?: string;
}) {
  const known = isOrbIndicatorState(state);
  const family: OrbIndicatorState = known ? state : "forming";
  if (!known && typeof console !== "undefined") {
    console.warn("[opal-orb] unknown indicator state in StateStone", { state });
  }
  return (
    <span
      className={`orb-state-stone ${className ?? ""}`.trim()}
      style={{ width: size, height: size }}
      data-orb="state-stone"
      data-orb-state={family}
      data-orb-state-known={known ? "1" : "0"}
      aria-hidden
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <circle cx={101} cy={100} r={51} fill="var(--orb-field)" />
        {family !== "past" ? (
          <circle cx={101} cy={100} r={51} fill="var(--orb-fire-gradient)" opacity={0.85} />
        ) : null}
        <circle
          cx={101}
          cy={100}
          r={71}
          fill="none"
          stroke={ORB_INDICATOR[family]}
          strokeWidth={10}
        />
      </svg>
    </span>
  );
}
