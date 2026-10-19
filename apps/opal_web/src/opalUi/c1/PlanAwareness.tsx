/**
 * Repair #18 DIR-1 - EVENT IN CONVERSATION: the plan-awareness element.
 *
 * ONE element, three renderings (chats row, thread strip, call-log
 * row). It renders ONLY the backend's shared upcoming plan fact
 * (NextPlanFact, productClient) - the service layer derived "shared",
 * "upcoming", and "next"; this component derives none of that. It
 * never renders when the fact is absent (L8: no plan, no element -
 * not dimmed, not collapsed, ABSENT).
 *
 * Indicator language (communication-model section 9): the person's
 * ENTITY color lives on the person element (the leading dot, tinted
 * from the --person-tint-* token palette by the backend-assigned
 * stable tint); the plan's STATE color/pattern lives on the plan
 * element (pill + border). The two never blend. State -> color comes
 * from the ONE token source (theme/planStateColors PLAN_STATE_HEX,
 * the same values orbTokens pins); there is no hex in this file.
 * Patterns are the secondary cue: forming = dashed border, action =
 * solid with a heavy leading edge, happening = live dot, ready =
 * solid, past never renders here (a past plan has no fact).
 */
import React from "react";
import type { NextPlanFact } from "../../api/productClient";
import { PLAN_STATE_HEX, planStateFamily } from "../../theme/planStateColors";
import { STATE_META } from "./planProjection";
import "./PlanAwareness.css";

export function entityTintVar(tint: number | null | undefined): string | null {
  if (typeof tint !== "number" || tint < 1 || tint > 6) return null;
  return `var(--person-tint-${tint})`;
}

const PATTERN_BY_STATE: Record<string, string> = {
  forming: "dashed",
  action: "solid-bold",
  ready: "solid",
  happening: "live",
  past: "rest",
};

export function PlanAwareness({
  fact,
  entityTint,
  variant = "row",
}: {
  fact: NextPlanFact | null | undefined;
  entityTint?: number | null;
  variant?: "row" | "strip" | "call";
}) {
  if (!fact) return null;
  const family = planStateFamily(fact.state);
  const meta = STATE_META[family];
  const color = PLAN_STATE_HEX[family];
  const tintVar = entityTintVar(entityTint);
  const parts = [fact.title, fact.when_label, fact.where_label].filter(
    (p): p is string => typeof p === "string" && p.trim() !== "",
  );
  return (
    <span
      className="plan-awareness"
      data-testid="plan-awareness"
      data-variant={variant}
      data-plan-id={fact.plan_id}
      data-plan-state={family}
      data-pattern={PATTERN_BY_STATE[family] ?? "solid"}
      style={{ "--pa-state": color } as React.CSSProperties}
    >
      <span
        className="plan-awareness-entity"
        data-testid="plan-awareness-entity"
        aria-hidden="true"
        style={tintVar ? { background: tintVar } : undefined}
      />
      <span className="plan-awareness-pill" data-testid="plan-awareness-pill">
        <span className="plan-awareness-glyph" aria-hidden="true">
          {family === "happening" ? (
            <span className="plan-awareness-live-dot" />
          ) : (
            meta.glyph
          )}
        </span>
        <span className="plan-awareness-state">{meta.label}</span>
      </span>
      <span className="plan-awareness-text">{parts.join(" - ")}</span>
    </span>
  );
}
