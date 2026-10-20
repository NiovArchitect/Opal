/**
 * Repair #20, F-1 — the lane button boxing pin.
 *
 * Founder review (2026-10-20): on Your Move cards the "Request a
 * change" action rendered as BARE TEXT beside the Confirm/Dismiss
 * buttons. Root cause, pinned here so it cannot regress silently:
 * RevealCard.css gave .reveal-change-request `border: 0;
 * background: none; padding: 4px 0` — an explicit strip of the
 * boxed affordance — and .reveal-dismiss--line stripped Dismiss
 * the same way in the chats-list form, while no rule at all boxed
 * the row.
 *
 * The fix gives the whole actions row ONE boxed affordance
 * (border, fill, radius, hit height, press state), in the
 * chats-list row's own pill grammar. These pins read the shipped
 * stylesheet (the rendered layer's source of truth for a CSS-only
 * affordance) and the rendered forms: on the base stylesheet the
 * CSS pins fail (the strip is right there in the rule); on the
 * fixed stylesheet they pass.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import type { RevealChangeRequest, RevealItem } from "../../api/productClient";
import { RevealCard, RevealListLine } from "./RevealCard";
import { ThreadShell } from "./C1Surfaces";

const css = readFileSync(resolve(__dirname, "./RevealCard.css"), "utf8");

/** The declaration block of the first rule whose selector list is
 *  exactly `selector` (a single-selector rule). */
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`rule not found: ${selector}`);
  return m[1];
}

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

describe("R20 F-1 - the change lane is a boxed button, not bare text", () => {
  it("the shared actions-row rule boxes all three actions (border, fill, radius, hit height)", () => {
    // The shared rule's selector list names all three actions.
    const shared = css.match(/\.reveal-action,\s*\.reveal-dismiss,\s*\.reveal-change-request\s*\{([^}]*)\}/);
    expect(shared, "a shared boxed rule for the actions row").not.toBeNull();
    const body = shared![1];
    expect(body).toMatch(/border:\s*1px solid/);
    expect(body).toMatch(/background:\s*var\(--surface-2\)/);
    expect(body).toMatch(/border-radius:\s*999px/);
    expect(body).toMatch(/min-height:\s*36px/);
    expect(body).toMatch(/cursor:\s*pointer/);
  });

  it("no rule strips the change lane or the list Dismiss back to bare text", () => {
    expect(ruleBody(".reveal-change-request--line")).not.toMatch(/border:\s*0/);
    expect(ruleBody(".reveal-dismiss--line")).not.toMatch(/border:\s*0/);
    expect(ruleBody(".reveal-dismiss--line")).not.toMatch(/background:\s*none/);
    // The old bare-text rule is gone entirely: .reveal-change-request
    // never appears as a single-selector rule carrying the strip.
    const singles = [...css.matchAll(/\.reveal-change-request\s*\{([^}]*)\}/g)].map((m) => m[1]);
    for (const body of singles) {
      expect(body).not.toMatch(/border:\s*0/);
      expect(body).not.toMatch(/background:\s*none/);
    }
  });

  it("the row has a press state (the affordance answers a tap)", () => {
    expect(css).toMatch(/\.reveal-change-request:active/);
    expect(css).toMatch(/\.reveal-action:active/);
    expect(css).toMatch(/\.reveal-dismiss:active/);
  });

  it("the primary's box is state-tinted from --reveal-state (canon channel, no new hue)", () => {
    expect(ruleBody(".reveal-action")).toMatch(/var\(--reveal-state/);
  });

  it("deck, thread, and chats-list forms render the lane as a real <button> in the row", () => {
    const deck = renderToString(
      <RevealCard item={item({ change_request: lane })} surface="deck" onRequestChange={() => {}} />,
    );
    expect(deck).toMatch(/<button[^>]*data-testid="reveal-change-request"/);

    const thread = renderToString(
      <ThreadShell
        name="Maya"
        initials="M"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Maya"
        reveals={[item({ change_request: lane })]}
        onRequestChangeReveal={() => {}}
      />,
    );
    expect(thread).toMatch(/<button[^>]*data-testid="reveal-change-request"/);

    const line = renderToString(
      <RevealListLine item={item({ change_request: lane })} onRequestChange={() => {}} />,
    );
    expect(line).toMatch(/<button[^>]*data-testid="reveal-change-request"/);
    expect(line).toMatch(/<button[^>]*data-testid="reveal-dismiss"/);
  });

  it("permission logic unchanged: no lane object or no handler, no button anywhere", () => {
    const noLane = renderToString(
      <RevealCard item={item({})} surface="deck" onRequestChange={() => {}} />,
    );
    expect(noLane).not.toContain("reveal-change-request");
    const noHandler = renderToString(
      <RevealCard item={item({ change_request: lane })} surface="deck" />,
    );
    expect(noHandler).not.toContain("reveal-change-request");
  });
});
