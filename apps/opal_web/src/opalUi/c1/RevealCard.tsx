/**
 * Repair #18 DIR-4 - the proactive reveal presentation forms.
 *
 * ONE grammar (spec 3.0): kicker (the fixed user words the backend
 * sends), substance (finished strings from the ONE derivation),
 * one action row (one primary + a quiet permanent dismiss).
 * No basis line is rendered: D-5 is open, so no basis is composed
 * here, ever. No push, no mode words, no system vocabulary.
 *
 * FIRE IS THE ONE LIT THING (spec 3.0 / 5.4, ambient justification
 * rule): the FireFrame renders ONLY on the item the derivation
 * marked lit - the single strongest waiting item. The fire's
 * declared reason: it tells the user "Opal is speaking
 * proactively, right now, about something real" - the treatment
 * IS that signal, so it cannot be on everything. Every other
 * item renders in ordinary card grammar: present, unlit, its
 * kicker/glyph/state still carrying its meaning. Two fire-lit
 * cards on one surface at once is a defect.
 *
 * Indicator language ONLY: category fire comes from the orb
 * indicator tokens through FireFrame's state family; a plan item's
 * state color comes from PLAN_STATE_HEX (the single source) via
 * the --reveal-state custom property; the entity tint is the
 * DIR-1 --person-tint-* token. This file contains no hex.
 *
 * Category -> indicator family (spec 4.2): P1 action, P2 ready,
 * P3 forming (the only dashed line), P4 happening, P5 iris fire
 * (FireFrame with no state - the brand gradient itself), P6 no
 * fire line at all (calm hairline), P7 ready at its softest.
 */
import React from "react";
import type { RevealItem } from "../../api/productClient";
import { changeRequestAction } from "./changeRequestLane";
import { FireFrame } from "../../brand/orb/FireLine";
import { PLAN_STATE_HEX, planStateFamily } from "../../theme/planStateColors";
import { entityTintVar } from "./PlanAwareness";
import "./RevealCard.css";

export const REVEAL_CATEGORY_STATE: Record<string, string | null> = {
  P1: "action",
  P2: "ready",
  P3: "forming",
  P4: "happening",
  P5: null,
  P6: null,
  P7: "ready",
};

const GLYPH_BY_CATEGORY: Record<string, string> = {
  P1: "◆",
  P2: "✓",
  P3: "○",
  P4: "●",
  P5: "◇",
  P6: "○",
  P7: "♡",
};

/**
 * Polish Cluster A (P5) - the lit card's legibility cue. AR-05's
 * meaning ("Opal is speaking proactively, right now, about
 * something real") is carried by the fire frame alone today, and
 * a viewer cannot tell why one card burns and the next does not.
 * The cue is the rulebook's sanctioned second channel for AR-05
 * (glyph + label, AR-00.5): a plain micro-label that renders ONLY
 * on the lit card, inside its fire frame. It adds no fire, no
 * motion, and no color anywhere else (scarcity doctrine intact).
 */
export const LIT_REVEAL_CUE = "Opal's pick";

export function RevealCard({
  item,
  surface,
  onAction,
  onDismiss,
  onRequestChange,
}: {
  item: RevealItem;
  surface: "deck" | "thread" | "list";
  onAction?: (item: RevealItem) => void;
  onDismiss?: (item: RevealItem) => void;
  /** Polish Cluster A (P1): enters the existing change-proposal
   *  flow for this plan. The button renders only when the item's
   *  backend change_request lane is present (see
   *  changeRequestLane.ts) AND this handler is supplied. */
  onRequestChange?: (item: RevealItem) => void;
}) {
  const categoryState = REVEAL_CATEGORY_STATE[item.category] ?? null;
  const planFamily = item.plan_state ? planStateFamily(item.plan_state) : null;
  const tintVar = entityTintVar(item.entity_tint);
  const changeLane = changeRequestAction(item, Boolean(onRequestChange));
  // The lit cue exists only where the fire frame will actually
  // render: the derivation's lit item, and never on P6 (its calm
  // form carries no fire even when marked lit).
  const showLitCue = item.lit && item.category !== "P6";
  const inner = (
    <>
      <span className="reveal-head">
        <span className="reveal-glyph" data-testid="reveal-glyph" aria-hidden="true">
          {GLYPH_BY_CATEGORY[item.category] ?? "○"}
        </span>
        <span className="reveal-kicker" data-testid="reveal-kicker">
          {item.kicker}
        </span>
        {tintVar ? (
          <span
            className="reveal-entity"
            data-testid="reveal-entity"
            aria-hidden="true"
            style={{ background: tintVar }}
          />
        ) : null}
        {planFamily ? (
          <span
            className="reveal-state"
            data-testid="reveal-state"
            style={{ "--reveal-state": PLAN_STATE_HEX[planFamily] } as React.CSSProperties}
          >
            {planFamily}
          </span>
        ) : null}
        {showLitCue ? (
          <span className="reveal-lit-cue" data-testid="reveal-lit-cue">
            {LIT_REVEAL_CUE}
          </span>
        ) : null}
      </span>
      <span className="reveal-title" data-testid="reveal-title">
        {item.title}
      </span>
      {item.substance ? (
        <span className="reveal-substance" data-testid="reveal-substance">
          {item.substance}
        </span>
      ) : null}
      <span className="reveal-actions">
        {item.action_label ? (
          <button
            type="button"
            className="reveal-action"
            data-testid="reveal-action"
            onClick={() => onAction?.(item)}
          >
            {item.action_label}
          </button>
        ) : null}
        {changeLane ? (
          <button
            type="button"
            className="reveal-change-request"
            data-testid="reveal-change-request"
            onClick={() => onRequestChange?.(item)}
          >
            {changeLane.label}
          </button>
        ) : null}
        <button
          type="button"
          className="reveal-dismiss"
          data-testid="reveal-dismiss"
          onClick={() => onDismiss?.(item)}
        >
          Dismiss
        </button>
      </span>
    </>
  );

  const common = {
    "data-testid": "reveal-card",
    "data-category": item.category,
    "data-surface": surface,
    "data-plan-state": planFamily ?? undefined,
    "data-lit": item.lit ? "true" : "false",
    "data-reveal-key": item.reveal_key,
  } as const;

  // P6 never carries fire (its calm is the point, spec 4.2), and
  // an unlit item of any category renders WITHOUT fire, in
  // ordinary card grammar (spec 5.4) - only the derivation's one
  // lit item carries the FireFrame.
  if (item.category === "P6" || !item.lit) {
    return (
      <div
        {...common}
        className={`reveal-card ${item.category === "P6" ? "reveal-card--p6" : "reveal-card--plain"}`}
      >
        {inner}
      </div>
    );
  }

  return (
    <div {...common} className={`reveal-card reveal-card--${item.category.toLowerCase()}`}>
      <FireFrame state={categoryState ?? undefined} testId="reveal-fire-frame">
        {inner}
      </FireFrame>
    </div>
  );
}

/** The chats-list form (entry 7): a P1 item takes over the row's
 *  plan line - same slot, never a fourth line. R19 W5-06 redesign:
 *  the takeover is a properly formatted MINI-CARD inside the row,
 *  in the same grammar as RevealCard (kicker head, title on its own
 *  full-width line, substance line, deliberate actions row) - NOT a
 *  single flattened text run. The pre-fix form concatenated
 *  `${action} - ${title}` into one flex line whose text span had no
 *  width contract (no flex/min-width/wrap rules) beside a floated
 *  Dismiss button; inside the row's flex main column the line
 *  collapsed to its min-content width and wrapped word-per-line
 *  ("Confirm / - / Dinner / at / Juniper / and Ivy") with Dismiss
 *  floating beside the column. The card's state edge is the plan's
 *  STATE color (indicator language, the DIR-1 row treatment), not
 *  fire: the list form never carries fire and never counts against
 *  the one-lit ceiling. The primary action is a styled label, not
 *  a nested button - the row itself is the open target (the host's
 *  row activation), and Dismiss is the card's one real button,
 *  placed at the end of the actions row. */
export function RevealListLine({
  item,
  onDismiss,
  onRequestChange,
}: {
  item: RevealItem;
  onDismiss?: (item: RevealItem) => void;
  /** Polish Cluster A (P1): same lane as the card form - renders
   *  only when the backend change_request is present AND this
   *  handler is supplied. The list form never carries fire, so it
   *  never carries the lit cue either. */
  onRequestChange?: (item: RevealItem) => void;
}) {
  const planFamily = item.plan_state ? planStateFamily(item.plan_state) : null;
  const tintVar = entityTintVar(item.entity_tint);
  const changeLane = changeRequestAction(item, Boolean(onRequestChange));
  return (
    <span
      className="reveal-list-line reveal-row-card"
      data-testid="reveal-list-line"
      data-category={item.category}
      data-plan-state={planFamily ?? undefined}
      data-reveal-key={item.reveal_key}
      style={
        planFamily
          ? ({ "--reveal-state": PLAN_STATE_HEX[planFamily] } as React.CSSProperties)
          : undefined
      }
    >
      <span className="reveal-row-head">
        <span className="reveal-glyph" aria-hidden="true">
          {GLYPH_BY_CATEGORY[item.category] ?? "○"}
        </span>
        <span className="reveal-kicker" data-testid="reveal-list-kicker">
          {item.kicker}
        </span>
        {tintVar ? (
          <span
            className="reveal-entity"
            data-testid="reveal-list-entity"
            aria-hidden="true"
            style={{ background: tintVar }}
          />
        ) : null}
        {planFamily ? (
          <span className="reveal-state" data-testid="reveal-list-state">
            {planFamily}
          </span>
        ) : null}
      </span>
      <span className="reveal-row-title" data-testid="reveal-list-title">
        {item.title}
      </span>
      {item.substance ? (
        <span className="reveal-row-substance" data-testid="reveal-list-substance">
          {item.substance}
        </span>
      ) : null}
      <span className="reveal-row-actions">
        {item.action_label ? (
          <span className="reveal-row-action" data-testid="reveal-list-action">
            {item.action_label}
          </span>
        ) : null}
        {changeLane ? (
          <button
            type="button"
            className="reveal-change-request reveal-change-request--line"
            data-testid="reveal-change-request"
            onClick={(e) => {
              e.stopPropagation();
              onRequestChange?.(item);
            }}
          >
            {changeLane.label}
          </button>
        ) : null}
        <button
          type="button"
          className="reveal-dismiss reveal-dismiss--line"
          data-testid="reveal-dismiss"
          aria-label="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.(item);
          }}
        >
          Dismiss
        </button>
      </span>
    </span>
  );
}
