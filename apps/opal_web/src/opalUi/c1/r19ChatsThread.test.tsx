/**
 * Repair #19 W5 - CHATS LIST LAYOUT + THREAD STRIP (W5-06 / W5-07):
 *  (i) the in-row plan/reveal block is a properly formatted
 *      mini-card - title on its own full-width line, substance on
 *      its own line, actions in one deliberate row - and can never
 *      collapse into a single-word column: the card's width
 *      contract (flex column, width 100%, min-width 0, title
 *      white-space normal + overflow-wrap) is pinned at the CSS
 *      source (jsdom has no layout; rendered geometry is the pack's
 *      job, with the seed rows named in chatsthread-report.md);
 *  (ii) the Next Together strip is SOLID in both modes: sticky at
 *      the scroll column's top, ground = the opaque var(--canvas)
 *      field token (defined in both modes in c2Tokens), no
 *      transparent / rgba / backdrop ground anywhere in its rule,
 *      and the legacy strips carry no translucent tint either;
 *  (iii) chats-row ambient borders map ONLY from the canon tokens:
 *      every [data-plan-state] row rule in unifyChats.css mixes
 *      from var(--orb-indicator-<state>), those tokens equal
 *      PLAN_STATE_HEX, no raw state hex is introduced, and a row
 *      with no plan carries no data-plan-state at all.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextPlanFact, RevealItem } from "../../api/productClient";
import { PLAN_STATE_HEX } from "../../theme/planStateColors";
import { RevealListLine } from "./RevealCard";
import { PlanAwareness } from "./PlanAwareness";
import { PeopleChatsList, ThreadShell } from "./C1Surfaces";
import { ChatsHome } from "../ChatsHome";

const LONG_TITLE =
  "Dinner at Juniper and Ivy with the whole crew to celebrate the new place";
const SUBSTANCE = "Saturday 7:30 PM - Juniper and Ivy";

function p1(over: Partial<RevealItem> = {}): RevealItem {
  return {
    reveal_key: "plan:p1:needs-answer",
    category: "P1",
    kicker: "Your move",
    title: LONG_TITLE,
    substance: SUBSTANCE,
    plan_id: "p1",
    conversation_id: "conv-1",
    plan_state: "action",
    entity_tint: 3,
    action_label: "Confirm",
    missing_slot: null,
    lit: true,
    ...over,
  };
}

const FACT: NextPlanFact = {
  plan_id: "plan-r19-1",
  title: LONG_TITLE,
  when_label: "Saturday 7:30 PM",
  starts_at: null,
  where_label: "Juniper and Ivy",
  where_kind: "physical",
  status: "tentative",
  state: "action",
  conversation_id: "conv-1",
};

const read = (rel: string) => readFileSync(join(__dirname, rel), "utf8");
const revealCss = read("RevealCard.css");
const awarenessCss = read("PlanAwareness.css");
const c1Css = read("c1.css");
const unify = read("../../theme/unifyChats.css");
const orbTokens = read("../../theme/orbTokens.css");
const styles = read("../../styles.css");

function ruleOf(css: string, selector: RegExp): string {
  return css.match(selector)?.[0] ?? "";
}

describe("R19 W5-06 RevealListLine - mini-card, not a flattened line", () => {
  it("renders kicker, title, substance, and actions as separate elements", () => {
    const html = renderToString(<RevealListLine item={p1()} />);
    expect(html).toContain('data-testid="reveal-list-line"');
    expect(html).toContain("reveal-row-card");
    expect(html).toContain('data-testid="reveal-list-kicker"');
    expect(html).toContain("Your move");
    // The title is its OWN element carrying the full human-length title.
    const title = html.match(
      /data-testid="reveal-list-title"[^>]*>([^<]*)</,
    )?.[1];
    expect(title).toBe(LONG_TITLE);
    const substance = html.match(
      /data-testid="reveal-list-substance"[^>]*>([^<]*)</,
    )?.[1];
    expect(substance).toBe(SUBSTANCE);
    // Actions row: Confirm pill and Dismiss, both present, in order.
    expect(html).toContain('data-testid="reveal-list-action"');
    expect(html).toContain("Confirm");
    expect(html).toContain('data-testid="reveal-dismiss"');
    expect(html.indexOf("reveal-list-action")).toBeLessThan(
      html.indexOf("reveal-dismiss"),
    );
  });

  it("the old flattened run is gone: no 'Confirm - <title>' concatenation, no reveal-list-text", () => {
    const html = renderToString(<RevealListLine item={p1()} />);
    expect(html).not.toContain(`Confirm - ${LONG_TITLE}`);
    expect(html).not.toContain("reveal-list-text");
    expect(read("RevealCard.tsx")).not.toContain("reveal-list-text");
  });

  it("CSS contract: full-width flex column card; title wraps by phrase, never a nowrap squeeze", () => {
    const card = ruleOf(revealCss, /\.reveal-list-line \{[^}]*\}/);
    expect(card).toContain("display: flex");
    expect(card).toContain("flex-direction: column");
    expect(card).toContain("width: 100%");
    expect(card).toContain("min-width: 0");
    expect(card).toContain("box-sizing: border-box");
    const title = ruleOf(revealCss, /\.reveal-row-title \{[^}]*\}/);
    expect(title).toContain("display: block");
    expect(title).toContain("width: 100%");
    expect(title).toContain("min-width: 0");
    expect(title).toContain("white-space: normal");
    expect(title).toContain("overflow-wrap: anywhere");
    expect(title).not.toContain("nowrap");
    const actions = ruleOf(revealCss, /\.reveal-row-actions \{[^}]*\}/);
    expect(actions).toContain("display: flex");
    // Dismiss is placed deliberately at the end of the actions row,
    // never floating beside the text: pinned at CSS source.
    const dismiss = ruleOf(revealCss, /\.reveal-dismiss--line \{[^}]*\}/);
    expect(dismiss).toContain("margin-left: auto");
  });

  it("the card's state edge mixes from --reveal-state (PLAN_STATE_HEX via the component), no raw hex", () => {
    const html = renderToString(<RevealListLine item={p1()} />);
    expect(html).toContain(PLAN_STATE_HEX.action);
    expect(revealCss).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});

describe("R19 W5-06 PlanAwareness row variant - mini-card layout", () => {
  it("title and meta are separate full lines; the one-line joined run is not used", () => {
    const html = renderToString(
      <PlanAwareness fact={FACT} entityTint={3} variant="row" />,
    );
    const title = html.match(
      /data-testid="plan-awareness-title"[^>]*>([^<]*)</,
    )?.[1];
    expect(title).toBe(LONG_TITLE);
    const meta = html.match(/data-testid="plan-awareness-meta"[^>]*>([^<]*)</)?.[1];
    expect(meta).toBe("Saturday 7:30 PM - Juniper and Ivy");
    expect(html).not.toContain(`${LONG_TITLE} - Saturday`);
    // State pill + entity still ride the head, unblended.
    expect(html).toContain('data-testid="plan-awareness-pill"');
    expect(html).toContain('data-testid="plan-awareness-entity"');
    expect(html).toContain(PLAN_STATE_HEX.action);
  });

  it("CSS contract: row variant is a full-width flex column card", () => {
    const row = ruleOf(
      awarenessCss,
      /\.plan-awareness\[data-variant="row"\] \{[^}]*\}/,
    );
    expect(row).toContain("flex-direction: column");
    expect(row).toContain("width: 100%");
    expect(row).toContain("min-width: 0");
    const title = ruleOf(awarenessCss, /\.plan-awareness-title \{[^}]*\}/);
    expect(title).toContain("white-space: normal");
    expect(title).toContain("overflow-wrap: anywhere");
  });

  it("strip and call variants keep the compact one-line form (unchanged grammar)", () => {
    const strip = renderToString(
      <PlanAwareness fact={FACT} entityTint={3} variant="strip" />,
    );
    expect(strip).toContain(`${LONG_TITLE} - Saturday 7:30 PM - Juniper and Ivy`);
    expect(strip).not.toContain("plan-awareness-title");
  });
});

describe("R19 W5-06 chats rows - state border source + presence discipline", () => {
  const base = {
    name: "Maya",
    initials: "M",
    preview: "See you Saturday",
    timeLabel: "2h",
    unread: false,
    plan: null,
    nextPlan: null,
    entityTint: 3,
  };

  it("row state comes from the reveal first, then next_plan, then the plan projection - never invented", () => {
    const withReveal = renderToString(
      <PeopleChatsList chats={[{ ...base, id: "c1", reveal: p1() }]} />,
    );
    expect(withReveal).toContain('data-plan-state="action"');
    const withFact = renderToString(
      <PeopleChatsList chats={[{ ...base, id: "c2", nextPlan: FACT }]} />,
    );
    expect(withFact).toContain('data-plan-state="action"');
    const readyFact = renderToString(
      <PeopleChatsList
        chats={[{ ...base, id: "c3", nextPlan: { ...FACT, state: "ready" } }]}
      />,
    );
    expect(readyFact).toContain('data-plan-state="ready"');
  });

  it("a row with no plan carries NO data-plan-state (no border condition, no border)", () => {
    const html = renderToString(<PeopleChatsList chats={[{ ...base, id: "c9" }]} />);
    expect(html).not.toContain("data-plan-state");
  });

  it("legacy ChatsHome row: state from next_plan / pill; no plan, no attribute", () => {
    const withFact = renderToString(
      <ChatsHome
        rows={[
          {
            id: "conv-1",
            name: "Maya",
            kind: "direct",
            preview: "See you then",
            when: "9:41 AM",
            nextPlan: FACT,
            entityTint: 3,
          },
        ]}
        onOpenChat={() => {}}
      />,
    );
    expect(withFact).toContain('data-plan-state="action"');
    // The mini-card renders at the copy column's full width, NOT
    // inside the flex meta-row beside the connection label.
    const metaRow = withFact.split("chats-home-meta-row")[1]?.split("</span>")[0] ?? "";
    expect(metaRow).not.toContain("plan-awareness");
    const plain = renderToString(
      <ChatsHome
        rows={[
          {
            id: "conv-2",
            name: "Alex",
            kind: "direct",
            preview: "Ok",
            when: "8:00 AM",
          },
        ]}
        onOpenChat={() => {}}
      />,
    );
    expect(plain).not.toContain("data-plan-state");
  });

  it("border mapping is canon-only: every row rule mixes from --orb-indicator-<state> == PLAN_STATE_HEX", () => {
    for (const s of ["forming", "action", "ready", "happening", "past"] as const) {
      expect(unify).toContain(
        `.c1-chat-row[data-plan-state="${s}"]`,
      );
      expect(unify).toContain(
        `.chats-home-row[data-plan-state="${s}"]`,
      );
      const m = orbTokens.match(
        new RegExp(`--orb-indicator-${s}:\\s*(#[0-9a-fA-F]{6})`),
      );
      expect(m![1]!.toLowerCase()).toBe(PLAN_STATE_HEX[s].toLowerCase());
      // The unify sheet introduces no raw canonical hex for rows.
      expect(unify.toLowerCase()).not.toContain(PLAN_STATE_HEX[s].toLowerCase());
    }
    // Ambient intensity, not a saturated perimeter: borders mix
    // the canon token toward transparent at 52%.
    expect(unify).toContain(
      "color-mix(in srgb, var(--orb-indicator-action) 52%, transparent)",
    );
    // Forming keeps its dashed pattern cue on rows.
    const forming = ruleOf(
      unify,
      /\[data-design="r18"\] \.c1-chat-row\[data-plan-state="forming"\] \{[^}]*\}/,
    );
    expect(forming).toContain("dashed");
    // The borderless default now applies only to plan-less rows.
    expect(unify).toContain('.c1-chat-row:not([data-plan-state])');
  });
});

describe("R19 W5-07 Next Together strip - solid + anchored, both modes", () => {
  it("the strip renders in the thread with its state treatment (fact-fed and projection-fed)", () => {
    const html = renderToString(
      <ThreadShell
        name="Maya"
        initials="M"
        nextPlanFact={FACT}
        entityTint={3}
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
      />,
    );
    expect(html).toContain('data-testid="next-together-strip"');
    expect(html).toContain('data-testid="plan-awareness"');
    expect(html).toContain('data-variant="strip"');
    expect(html).toContain("NEXT TOGETHER");
  });

  it("CSS: sticky at the scroll top, opaque canvas ground, layer token only - no see-through paint", () => {
    const rule = ruleOf(c1Css, /\[data-design="r18"\] \.c1-next-strip \{[^}]*\}/);
    expect(rule).toContain("position: sticky");
    expect(rule).toContain("top: 0");
    expect(rule).toContain("z-index: var(--layer-chrome)");
    expect(rule).toContain("background: var(--canvas)");
    expect(rule).not.toContain("transparent");
    expect(rule).not.toContain("rgba(");
    expect(rule).not.toContain("backdrop-filter");
    // --canvas is a solid hex in BOTH modes (c2Tokens law) - the
    // ground cannot resolve translucent in either mode.
    const c2tokens = read("../../theme/c2Tokens.css");
    expect(c2tokens).toMatch(/\[data-mode="light"\][\s\S]*?--canvas: #[0-9a-fA-F]{6}/);
    expect(c2tokens).toMatch(/\[data-mode="dark"\][\s\S]*?--canvas: #[0-9a-fA-F]{6}/);
  });

  it("legacy strips carry no translucent ground either", () => {
    const legacy = ruleOf(styles, /\.next-together-strip \{[^}]*\}/);
    expect(legacy).toContain("background: var(--surface-raised)");
    expect(legacy).not.toContain("rgba(110, 231, 245, 0.04)");
    const live = ruleOf(styles, /\.next-plan-strip \{[^}]*\}/);
    expect(live).toContain("background: rgb(8, 16, 28)");
  });
});
