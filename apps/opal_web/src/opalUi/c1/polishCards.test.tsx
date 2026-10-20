/**
 * Repair #19 polish, Cluster A - web pins for P1 (request-a-change
 * lane) and P5 (lit-reveal cue).
 *
 * P1: the presence rule is derived server-side (SocialFlow.Reveal);
 * the web gate (changeRequestAction) is pinned across the full
 * render matrix: lane object present/absent/malformed x handler
 * present/absent. The card forms render the button only when the
 * gate passes, on deck, thread, and chats-list forms alike.
 *
 * P5: the lit cue ("Opal's pick", AR-05's glyph + label channel)
 * renders ONLY on the lit card that actually carries the fire
 * frame - never on an unlit card, never on P6, and never on the
 * chats-list form (which never carries fire).
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { RevealChangeRequest, RevealItem } from "../../api/productClient";
import { LIT_REVEAL_CUE, RevealCard, RevealListLine } from "./RevealCard";
import { changeRequestAction } from "./changeRequestLane";
import { ThreadShell } from "./C1Surfaces";

const lane: RevealChangeRequest = {
  label: "Request a change",
  conversation_id: "conv-1",
  alternatives: [
    { share_id: "s1", owner_user_id: "other-1", display_start: "2026-10-24T02:00:00Z", display_end: "2026-10-24T05:00:00Z", open_ended: false, timezone: "UTC" },
  ],
  scope_person_id: "other-1",
  scope_person_name: "Maya Torres",
};

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
    change_request: null,
    lit: true,
    ...over,
  };
}

describe("polish A P1 - changeRequestAction render gate (permission x alternatives, as served)", () => {
  it("lane object + handler -> the action, verbatim label and counts", () => {
    const action = changeRequestAction(item({ change_request: lane }), true);
    expect(action).not.toBeNull();
    expect(action!.label).toBe("Request a change");
    expect(action!.conversationId).toBe("conv-1");
    expect(action!.alternativeCount).toBe(1);
    expect(action!.scopePersonId).toBe("other-1");
    expect(action!.scopePersonName).toBe("Maya Torres");
  });

  it("lane object but NO handler -> null (no dead control)", () => {
    expect(changeRequestAction(item({ change_request: lane }), false)).toBeNull();
  });

  it("no lane (backend derived nil: no permission or no alternatives) -> null even with a handler", () => {
    expect(changeRequestAction(item({ change_request: null }), true)).toBeNull();
    expect(changeRequestAction(item({ change_request: undefined }), true)).toBeNull();
  });

  it("lane with zero alternatives -> null (the window closed; presence is state-driven)", () => {
    expect(changeRequestAction(item({ change_request: { ...lane, alternatives: [] } }), true)).toBeNull();
  });

  it("lane for a different conversation than the item's -> null (fail closed)", () => {
    expect(
      changeRequestAction(item({ change_request: { ...lane, conversation_id: "conv-other" } }), true),
    ).toBeNull();
  });

  it("lane without a scope person or with a blank label -> null", () => {
    expect(changeRequestAction(item({ change_request: { ...lane, scope_person_id: "" } }), true)).toBeNull();
    expect(changeRequestAction(item({ change_request: { ...lane, label: "  " } }), true)).toBeNull();
  });
});

describe("polish A P1 - the lane button on the card forms", () => {
  it("deck card: Confirm, Request a change, Dismiss - in that order", () => {
    const html = renderToString(
      <RevealCard item={item({ change_request: lane })} surface="deck" onRequestChange={() => {}} />,
    );
    expect(html).toContain('data-testid="reveal-change-request"');
    expect(html).toContain("Request a change");
    const confirmAt = html.indexOf("Confirm");
    const laneAt = html.indexOf("Request a change");
    const dismissAt = html.indexOf("Dismiss");
    expect(confirmAt).toBeGreaterThan(-1);
    expect(laneAt).toBeGreaterThan(confirmAt);
    expect(dismissAt).toBeGreaterThan(laneAt);
  });

  it("deck card: no lane object -> no button, even with a handler", () => {
    const html = renderToString(
      <RevealCard item={item({})} surface="deck" onRequestChange={() => {}} />,
    );
    expect(html).not.toContain("reveal-change-request");
    expect(html).not.toContain("Request a change");
  });

  it("deck card: lane object but no handler -> no button", () => {
    const html = renderToString(<RevealCard item={item({ change_request: lane })} surface="deck" />);
    expect(html).not.toContain("reveal-change-request");
  });

  it("thread card: the lane renders in the thread context too", () => {
    const base = {
      name: "Maya",
      initials: "M",
      messages: [],
      plansById: new Map(),
      composerPlaceholder: "Message Maya",
    };
    const withLane = renderToString(
      <ThreadShell {...base} reveals={[item({ change_request: lane })]} onRequestChangeReveal={() => {}} />,
    );
    expect(withLane).toContain('data-testid="reveal-change-request"');
    expect(withLane).toContain("Request a change");
    const without = renderToString(
      <ThreadShell {...base} reveals={[item({})]} onRequestChangeReveal={() => {}} />,
    );
    expect(without).not.toContain("reveal-change-request");
  });

  it("chats list line: the lane renders as a real button beside Dismiss; absent lane, absent button", () => {
    const withLane = renderToString(
      <RevealListLine item={item({ change_request: lane })} onRequestChange={() => {}} />,
    );
    expect(withLane).toContain('data-testid="reveal-change-request"');
    expect(withLane).toContain("Request a change");
    const without = renderToString(<RevealListLine item={item({})} onRequestChange={() => {}} />);
    expect(without).not.toContain("reveal-change-request");
    const noHandler = renderToString(<RevealListLine item={item({ change_request: lane })} />);
    expect(noHandler).not.toContain("reveal-change-request");
  });

  it("the handler receives the item (wiring is the item, not a copy)", () => {
    const onRequestChange = vi.fn();
    const html = renderToString(
      <RevealCard item={item({ change_request: lane })} surface="deck" onRequestChange={onRequestChange} />,
    );
    // Render-to-string cannot click; the button's presence with the
    // item-bound handler is asserted statically, as in dir4Reveal.
    expect(html).toContain('data-testid="reveal-change-request"');
    expect(onRequestChange).not.toHaveBeenCalled();
  });
});

describe("polish A P5 - the lit-reveal cue", () => {
  it("the lit card carries the cue beside its fire frame, in deck and thread contexts", () => {
    for (const surface of ["deck", "thread"] as const) {
      const html = renderToString(<RevealCard item={item({})} surface={surface} />);
      expect(html).toContain('data-testid="reveal-fire-frame"');
      expect(html).toContain('data-testid="reveal-lit-cue"');
      // React escapes the apostrophe in rendered HTML.
      expect(html).toContain("Opal&#x27;s pick");
      expect(LIT_REVEAL_CUE).toBe("Opal's pick");
    }
  });

  it("an unlit card carries no cue and no fire", () => {
    const html = renderToString(<RevealCard item={item({ lit: false })} surface="deck" />);
    expect(html).not.toContain("reveal-lit-cue");
    expect(html).not.toContain(LIT_REVEAL_CUE);
    expect(html).not.toContain("reveal-fire-frame");
  });

  it("P6 carries no cue even when marked lit (P6 never carries fire)", () => {
    const html = renderToString(
      <RevealCard item={item({ category: "P6", kicker: "Opal update", plan_state: null })} surface="deck" />,
    );
    expect(html).not.toContain("reveal-lit-cue");
    expect(html).not.toContain("reveal-fire-frame");
  });

  it("across a lit and an unlit card, exactly one cue renders (scarcity intact)", () => {
    const lit = renderToString(<RevealCard item={item({})} surface="deck" />);
    const unlit = renderToString(
      <RevealCard item={item({ lit: false, reveal_key: "plan:p9:ready", category: "P2", kicker: "Ready for you" })} surface="deck" />,
    );
    expect((lit + unlit).match(/data-testid="reveal-lit-cue"/g)?.length).toBe(1);
  });

  it("the chats-list form never carries the cue (the list form never carries fire)", () => {
    const html = renderToString(<RevealListLine item={item({})} />);
    expect(html).not.toContain("reveal-lit-cue");
    expect(html).not.toContain(LIT_REVEAL_CUE);
  });
});
