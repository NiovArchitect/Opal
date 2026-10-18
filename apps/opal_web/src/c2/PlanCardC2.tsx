/**
 * Repair #18 - Division C2 - reference plan card (C1 section 4 grammar,
 * C2 section 2.4 treatments). This is the foundation proof the C1/C2
 * surface phases consume: ONE card grammar rendered purely from tokens.
 *
 * CONTRACT (founder engineering law): every input is an explicit,
 * finished projection field. The card NEVER derives plan state from
 * raw fields, label text, or counts: the caller passes the derived
 * state family (from the single derivation) and finished strings.
 * An unknown state family renders the forming treatment with the pill
 * label "Needs a look" and logs the value (section 2.4 unknown-state
 * law) - it never defaults silently to ready.
 */
import React from "react";

export type PlanStateFamilyC2 = "forming" | "action" | "ready" | "happening" | "past";

export const PLAN_STATE_FAMILIES_C2: readonly PlanStateFamilyC2[] = [
  "forming",
  "action",
  "ready",
  "happening",
  "past",
] as const;

export function isPlanStateFamilyC2(v: unknown): v is PlanStateFamilyC2 {
  return typeof v === "string" && (PLAN_STATE_FAMILIES_C2 as readonly string[]).includes(v);
}

/** Non-color cue per state (section 2.4): glyph + border style + label. */
export const PLAN_STATE_GLYPH_C2: Record<PlanStateFamilyC2, string> = {
  forming: "○",
  action: "▲",
  ready: "✓",
  happening: "◎",
  past: "■",
};

export type PlanCardC2Input = {
  /** Derived state family from the one projection/derivation. Required. */
  stateFamily: PlanStateFamilyC2 | string;
  /** Finished pill label from the projection (for example "Idea" for a
   *  forming idea, "Live" for a live happening plan). */
  stateLabel: string;
  /** Human title. Always rendered in surface ink, never state color. */
  title: string;
  /** Finished when line from the projection (already formatted). */
  whenLine: string;
  /** Finished where line, or null when unset on compact cards. */
  whereLine?: string | null;
  /** Finished attendance string (for example "3 of 4 going"), or null
   *  when attendance is null in the projection - then no row renders. */
  attendanceLine?: string | null;
  /** The one primary action label for the state, or null. */
  primaryActionLabel?: string | null;
};

export function PlanStatePillC2({
  stateFamily,
  stateLabel,
}: {
  stateFamily: PlanStateFamilyC2 | string;
  stateLabel: string;
}) {
  const known = isPlanStateFamilyC2(stateFamily);
  const family: PlanStateFamilyC2 = known ? stateFamily : "forming";
  const label = known ? stateLabel : "Needs a look";
  if (!known && typeof console !== "undefined") {
    console.warn("[opal-c2] unknown plan state family in projection", { stateFamily });
  }
  return (
    <span
      className="c2-state-pill"
      data-plan-state={family}
      data-plan-state-known={known ? "1" : "0"}
      data-testid="c2-plan-state-pill"
    >
      <span className="c2-state-glyph" aria-hidden>
        {PLAN_STATE_GLYPH_C2[family]}
      </span>
      <span className="c2-state-label">{label}</span>
    </span>
  );
}

export function PlanCardC2({
  input,
  onOpen,
  onPrimaryAction,
}: {
  input: PlanCardC2Input;
  onOpen?: () => void;
  onPrimaryAction?: () => void;
}) {
  const family: PlanStateFamilyC2 = isPlanStateFamilyC2(input.stateFamily)
    ? input.stateFamily
    : "forming";
  return (
    <article
      className="c2-plan-card"
      data-plan-state={family}
      data-testid="c2-plan-card"
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="c2-plan-card-top">
        <PlanStatePillC2 stateFamily={input.stateFamily} stateLabel={input.stateLabel} />
      </div>
      <h3 className="c2-plan-title">{input.title}</h3>
      <p className="c2-plan-when">{input.whenLine}</p>
      {input.whereLine ? <p className="c2-plan-where">{input.whereLine}</p> : null}
      {input.attendanceLine ? (
        <p className="c2-plan-attendance">{input.attendanceLine}</p>
      ) : null}
      {input.primaryActionLabel ? (
        <button
          type="button"
          className="c2-plan-primary"
          data-testid="c2-plan-primary"
          onClick={(e) => {
            e.stopPropagation();
            onPrimaryAction?.();
          }}
        >
          {input.primaryActionLabel}
        </button>
      ) : null}
    </article>
  );
}
