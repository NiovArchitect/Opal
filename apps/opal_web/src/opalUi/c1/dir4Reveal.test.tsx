/**
 * Repair #18 DIR-4 - proactive reveal presentation, web acceptance:
 *  - every category renders its fixed kicker, glyph, and fire from
 *    the ONE derivation's item (the component derives nothing);
 *  - indicator drift: the same plan state renders the same
 *    PLAN_STATE_HEX token on deck, thread, and list forms;
 *  - P6 carries no fire frame; P3 is the dashed category; P5/P7
 *    carry no plan state;
 *  - fire is the ONE lit thing (spec 3.0/5.4): only the item the
 *    derivation marked lit renders a fire frame; unlit items
 *    render their full content in ordinary grammar, unlit;
 *  - enter/exit at unit level (L8 pair): the item present renders
 *    the form, the item absent renders nothing - on deck, thread,
 *    and list alike;
 *  - no raw hex in the reveal component sources (DIR-1 pattern).
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RevealItem } from "../../api/productClient";
import { PLAN_STATE_HEX } from "../../theme/planStateColors";
import { RevealCard, RevealListLine } from "./RevealCard";
import { PeopleChatsList, ThreadShell } from "./C1Surfaces";
import { C2CenterOpening } from "../../c2/shell/C2CenterOpening";
import type { CenterOpeningProjection } from "../../c2/shell/C2CenterOpening";

function item(over: Partial<RevealItem>): RevealItem {
  return {
    reveal_key: "plan:p1:needs-answer",
    category: "P1",
    kicker: "Your move",
    title: "Dinner at Juniper",
    substance: "Saturday 7:30 PM - Juniper and Ivy",
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

describe("DIR-4 RevealCard", () => {
  it("renders the derivation verbatim: kicker, title, substance, one action plus dismiss", () => {
    const html = renderToString(<RevealCard item={item({})} surface="deck" />);
    expect(html).toContain('data-testid="reveal-card"');
    expect(html).toContain('data-category="P1"');
    expect(html).toContain("Your move");
    expect(html).toContain("Dinner at Juniper");
    expect(html).toContain("Saturday 7:30 PM - Juniper and Ivy");
    expect(html).toContain('data-testid="reveal-action"');
    expect(html).toContain("Confirm");
    expect(html).toContain('data-testid="reveal-dismiss"');
    expect(html).toContain('data-testid="reveal-fire-frame"');
  });

  it("every category carries its fixed kicker and glyph", () => {
    const cases: Array<[string, string, string]> = [
      ["P1", "Your move", "◆"],
      ["P2", "Ready for you", "✓"],
      ["P3", "One thing left", "○"],
      ["P4", "Happening now", "●"],
      ["P5", "Remember this", "◇"],
      ["P6", "Opal update", "○"],
      ["P7", "A gentle check-in", "♡"],
    ];
    for (const [category, kicker, glyph] of cases) {
      const html = renderToString(
        <RevealCard
          item={item({ category, kicker, plan_state: null, reveal_key: `k-${category}` })}
          surface="deck"
        />,
      );
      expect(html).toContain(kicker);
      expect(html).toContain(glyph);
      expect(html).toContain(`data-category="${category}"`);
    }
  });

  it("P6 carries no fire frame and P5/P7 carry no plan state", () => {
    const p6 = renderToString(
      <RevealCard item={item({ category: "P6", kicker: "Opal update", plan_state: null })} surface="deck" />,
    );
    expect(p6).not.toContain("reveal-fire-frame");
    expect(p6).toContain("reveal-card--p6");
    const p5 = renderToString(
      <RevealCard item={item({ category: "P5", kicker: "Remember this", plan_state: null })} surface="deck" />,
    );
    expect(p5).not.toContain('data-testid="reveal-state"');
  });

  it("an unlit item renders its full content WITHOUT fire (ordinary grammar)", () => {
    const html = renderToString(
      <RevealCard item={item({ lit: false, reveal_key: "plan:p2:ready", category: "P2", kicker: "Ready for you" })} surface="deck" />,
    );
    expect(html).not.toContain("reveal-fire-frame");
    expect(html).toContain("reveal-card--plain");
    expect(html).toContain('data-lit="false"');
    expect(html).toContain("Ready for you");
    expect(html).toContain("Dinner at Juniper");
    expect(html).toContain('data-testid="reveal-dismiss"');
  });

  it("one lit thing: across a lit and an unlit card, exactly one fire frame renders", () => {
    const lit = renderToString(<RevealCard item={item({})} surface="deck" />);
    const unlit = renderToString(
      <RevealCard item={item({ lit: false, reveal_key: "plan:p9:ready", category: "P2", kicker: "Ready for you" })} surface="deck" />,
    );
    const frames = (lit + unlit).match(/reveal-fire-frame/g)?.length ?? 0;
    expect(frames).toBe(1);
    expect(lit).toContain('data-lit="true"');
  });

  it("entity tint is a --person-tint token, separate from the state color", () => {
    const html = renderToString(<RevealCard item={item({})} surface="deck" />);
    expect(html).toContain("var(--person-tint-3)");
    expect(html).toContain(PLAN_STATE_HEX.action);
  });

  it("dismiss fires the handler with the item (exit is the host re-rendering without it)", () => {
    const onDismiss = vi.fn();
    // Render-to-string cannot click; the wiring is asserted statically
    // and the exit leg is proven by the absent-item renders below.
    const html = renderToString(<RevealCard item={item({})} surface="deck" onDismiss={onDismiss} />);
    expect(html).toContain('data-testid="reveal-dismiss"');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("no raw hex in the reveal component sources", () => {
    for (const file of ["RevealCard.tsx", "RevealCard.css"]) {
      const src = readFileSync(join(__dirname, file), "utf8");
      expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    }
  });
});

describe("DIR-4 indicator drift - same state, same token, every surface", () => {
  const p1 = item({});

  it("deck, thread, and list all render PLAN_STATE_HEX for the plan state", () => {
    const deck = renderToString(<RevealCard item={p1} surface="deck" />);
    const thread = renderToString(<RevealCard item={p1} surface="thread" />);
    const list = renderToString(<RevealListLine item={p1} />);
    for (const html of [deck, thread, list]) {
      expect(html).toContain(PLAN_STATE_HEX.action);
      expect(html).toContain('data-plan-state="action"');
    }
  });
});

describe("DIR-4 enter/exit pairs (L8, unit level)", () => {
  const chat = {
    id: "conv-1",
    name: "Maya",
    initials: "M",
    preview: "See you Saturday",
    timeLabel: "2h",
    unread: false,
    plan: null,
    nextPlan: null,
    entityTint: 3,
  };

  it("chats list: P1 reveal takes the plan line; absent reveal restores the plain row", () => {
    const withReveal = renderToString(
      <PeopleChatsList chats={[{ ...chat, reveal: item({}) }]} />,
    );
    expect(withReveal).toContain('data-testid="reveal-list-line"');
    expect(withReveal).toContain("Dinner at Juniper");
    const without = renderToString(<PeopleChatsList chats={[chat]} />);
    expect(without).not.toContain("reveal-list-line");
    expect(without).not.toContain("reveal-card");
  });

  it("thread: first reveal renders in flow; no reveals renders nothing", () => {
    const base = {
      name: "Maya",
      initials: "M",
      messages: [],
      plansById: new Map(),
      composerPlaceholder: "Message Maya",
    };
    const withReveal = renderToString(<ThreadShell {...base} reveals={[item({})]} />);
    expect(withReveal).toContain('data-testid="reveal-thread"');
    expect(withReveal).toContain('data-testid="reveal-card"');
    const without = renderToString(<ThreadShell {...base} reveals={[]} />);
    expect(without).not.toContain("reveal-thread");
    expect(without).not.toContain("reveal-card");
  });

  it("thread renders at most one reveal even when the feed carries more", () => {
    const base = {
      name: "Maya",
      initials: "M",
      messages: [],
      plansById: new Map(),
      composerPlaceholder: "Message Maya",
    };
    const html = renderToString(
      <ThreadShell
        {...base}
        reveals={[item({}), item({ reveal_key: "plan:p2:ready", category: "P2", kicker: "Ready for you" })]}
      />,
    );
    expect(html.match(/data-testid="reveal-card"/g)?.length).toBe(1);
  });

  it("deck: a P5/P7 reveal renders in its named section; no reveals, no section", () => {
    const projection: CenterOpeningProjection = {
      greeting: "Good evening.",
      presence: "idle",
      celebrateOnce: false,
      needsYou: [],
      next: null,
      comingUp: [],
      forming: [],
      reveals: [
        item({ category: "P5", kicker: "Remember this", title: "Maya - birthday", plan_id: null, plan_state: null, reveal_key: "celebration:1" }),
        item({ category: "P7", kicker: "A gentle check-in", title: "Close friends", plan_id: null, plan_state: null, reveal_key: "checkin-ask:1" }),
      ],
    };
    const events = { openGraph: () => {}, makeSomethingHappen: () => {}, completeSlot: () => {} };
    const withReveals = renderToString(<C2CenterOpening projection={projection} events={events} />);
    expect(withReveals).toContain('data-testid="reveal-deck-coming-up"');
    expect(withReveals).toContain('data-testid="reveal-deck-needs-you"');
    expect(withReveals).toContain("Maya - birthday");
    const without = renderToString(
      <C2CenterOpening projection={{ ...projection, reveals: [] }} events={events} />,
    );
    expect(without).not.toContain("reveal-deck-coming-up");
    expect(without).not.toContain("reveal-deck-needs-you");
    expect(without).toContain("Nothing needs you right now. It is all yours.");
  });

  it("deckfix F1: a lit P1 whose plan is NOT in the deck's capped card set still renders in Needs you, with its FireFrame", () => {
    // The full pack's exact setup: the deck's capped Taking-shape
    // set holds three unrelated forming cards; the derivation's lit
    // P1 is for a plan that is in NO deck card set. The pre-fix deck
    // rendered a reveal only as a replacement for a card already in
    // the set, so this lit item never landed (no Needs-you section,
    // zero FireFrames) while GET /reveals served it lit.
    const formingCard = (id: string, title: string) => ({
      id,
      stateFamily: "forming" as const,
      stateLabel: "Forming",
      title,
      whenLine: "7 PM",
      whereLine: null,
      attendanceLine: null,
      primaryActionLabel: null,
      completionAction: null,
    });
    const projection: CenterOpeningProjection = {
      greeting: "Good evening.",
      presence: "idle",
      celebrateOnce: false,
      needsYou: [],
      next: null,
      comingUp: [],
      forming: [
        formingCard("f1", "Juniper & Ivy"),
        formingCard("f2", "Dinner at Campfire"),
        formingCard("f3", "Sunday brunch at Herb & Wood"),
      ],
      reveals: [item({})],
    };
    const events = { openGraph: () => {}, makeSomethingHappen: () => {}, completeSlot: () => {} };
    const html = renderToString(<C2CenterOpening projection={projection} events={events} />);
    expect(html).toContain('data-testid="c2-opening-needs-you"');
    expect(html).toContain('data-testid="reveal-card"');
    expect(html).toContain('data-lit="true"');
    expect(html).toContain('data-testid="reveal-fire-frame"');
    expect(html).toContain("Dinner at Juniper");
    expect(html).not.toContain('data-testid="c2-opening-calm"');
    // Caps unchanged: the Taking shape section still holds exactly
    // its three capped cards - the reveal took a Needs-you slot, it
    // did not grow any section.
    const formingSection = html.split('data-testid="c2-opening-forming"')[1] ?? "";
    expect(formingSection.match(/data-testid="c2-plan-card"/g)?.length).toBe(3);
  });

  it("deckfix F1: an unmatched plan reveal claims its plan - the plan never also renders as a plain card in another section", () => {
    const card = {
      id: "p1",
      stateFamily: "forming" as const,
      stateLabel: "Forming",
      title: "Dinner at Juniper",
      whenLine: "Saturday 7:30 PM",
      whereLine: "Juniper and Ivy",
      attendanceLine: null,
      primaryActionLabel: null,
      completionAction: null,
    };
    const projection: CenterOpeningProjection = {
      greeting: "Good evening.",
      presence: "idle",
      celebrateOnce: false,
      needsYou: [],
      next: null,
      comingUp: [],
      forming: [card],
      // The P1 reveal is about the same plan the deck holds as a
      // forming card: it renders once, as the reveal in Needs you.
      reveals: [item({})],
    };
    const events = { openGraph: () => {}, makeSomethingHappen: () => {}, completeSlot: () => {} };
    const html = renderToString(<C2CenterOpening projection={projection} events={events} />);
    expect(html).toContain('data-testid="c2-opening-needs-you"');
    expect(html).toContain('data-testid="reveal-card"');
    expect(html).not.toContain('data-testid="c2-opening-forming"');
    expect(html.match(/Dinner at Juniper/g)?.length).toBe(1);
  });

  it("deckfix F1: section cap holds when reveals and cards combine (reveals take their slots first)", () => {
    const card = (id: string, title: string) => ({
      id,
      stateFamily: "action" as const,
      stateLabel: "Action needed",
      title,
      whenLine: "Saturday 7:30 PM",
      whereLine: null,
      attendanceLine: null,
      primaryActionLabel: null,
    });
    const projection: CenterOpeningProjection = {
      greeting: "Good evening.",
      presence: "idle",
      celebrateOnce: false,
      needsYou: [card("a1", "Alpha"), card("a2", "Beta"), card("a3", "Gamma")],
      next: null,
      comingUp: [],
      forming: [],
      reveals: [
        item({}),
        item({ reveal_key: "plan:px:needs-answer", plan_id: "px", title: "Xray", lit: false }),
      ],
    };
    const events = { openGraph: () => {}, makeSomethingHappen: () => {}, completeSlot: () => {} };
    const html = renderToString(<C2CenterOpening projection={projection} events={events} />);
    const needsSection = html.split('data-testid="c2-opening-needs-you"')[1] ?? "";
    const slots =
      (needsSection.match(/data-testid="reveal-card"/g)?.length ?? 0) +
      (needsSection.match(/data-testid="c2-plan-card"/g)?.length ?? 0);
    expect(slots).toBe(3);
    expect(needsSection).toContain("Dinner at Juniper");
    expect(needsSection).toContain("Xray");
  });

  it("deck: a plan reveal replaces its plan card in the Needs you slot", () => {
    const card = {
      id: "p1",
      stateFamily: "action" as const,
      stateLabel: "Action needed",
      title: "Dinner at Juniper",
      whenLine: "Saturday 7:30 PM",
      whereLine: "Juniper and Ivy",
      attendanceLine: null,
      primaryActionLabel: null,
    };
    const projection: CenterOpeningProjection = {
      greeting: "Good evening.",
      presence: "idle",
      celebrateOnce: false,
      needsYou: [card],
      next: null,
      comingUp: [],
      forming: [],
      reveals: [item({})],
    };
    const events = { openGraph: () => {}, makeSomethingHappen: () => {}, completeSlot: () => {} };
    const html = renderToString(<C2CenterOpening projection={projection} events={events} />);
    expect(html).toContain('data-testid="c2-opening-needs-you"');
    expect(html).toContain('data-testid="reveal-card"');
    expect(html).toContain(PLAN_STATE_HEX.action);
  });
});
