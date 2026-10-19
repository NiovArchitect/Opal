/**
 * Repair #18 DECKFIX wave - regressions for the full pack's rendered
 * findings F1 (slot logic is covered in dir4Reveal.test.tsx), F2,
 * F3, F7:
 *  - F2a: an in-thread call record renders the call record's own
 *    human history line (the call log's derivation) as a system
 *    line - never the raw "call:<uuid>" signaling body, never a
 *    person bubble.
 *  - F2b: the thread's Next Together strip is in flow, not sticky:
 *    pinned at the CSS source (jsdom has no layout; the rendered
 *    geometry is proven in the pack re-capture).
 *  - F3: the Center deck's rest fold lands in a text-free window
 *    by rhythm (hero min-height), with the port full-height so the
 *    probe's fold and the viewport bottom agree - pinned at source,
 *    proven in the re-capture (clippedCount 0 at rest).
 *  - F7: the You hub/settings surfaces are contained in their route
 *    slot so their own .c2s-scroll scrolls with dock clearance, and
 *    hub rows carry the scroll-margin that stops them above the
 *    dock - pinned at source, proven in the re-capture.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProductCallHistory, ProductMessage } from "../../api/productClient";
import { ThreadShell } from "../../opalUi/c1/C1Surfaces";
import {
  callInviteIdOf,
  callLineForCallRecord,
  threadMsgFromProductMessage,
} from "./C1ShellHosts";
import { deckSlots, DECK_SECTION_CAP } from "./C2CenterOpening";
import type { RevealItem } from "../../api/productClient";

const CALL_ID = "47f28413-1edd-4e5e-bd25-80e72f75db4f";

const callRecord: ProductCallHistory = {
  id: CALL_ID,
  conversation_id: "conv-1",
  direction: "outgoing",
  peer_user_id: "u2",
  peer_name: "Regression B",
  status: "missed",
  ended_reason: "missed",
  history_label: "No answer",
  missed: true,
  created_at: "2026-10-18T02:03:00Z",
  media_connected_at: null,
  ended_at: null,
};

const inviteMessage: ProductMessage = {
  id: "m-call",
  body: `call:${CALL_ID}`,
  sender_user_id: "u1",
  server_seq: 9,
  created_at: "2026-10-18T02:03:00Z",
  client_message_id: `call-invite-${CALL_ID}`,
  message_type: "call_invite",
};

describe("deckfix F2a - in-thread call records render the human call line", () => {
  it("callLineForCallRecord is the call log's line: history label + local time, no id", () => {
    const line = callLineForCallRecord(callRecord);
    expect(line).toContain("No answer");
    expect(line).not.toContain(CALL_ID);
    expect(line).not.toContain("call:");
  });

  it("a call_invite message maps to a system line carrying the record's line", () => {
    const callLineById = new Map([[CALL_ID, callLineForCallRecord(callRecord)]]);
    const msg = threadMsgFromProductMessage(inviteMessage, {
      viewerUserId: "u1",
      names: new Map(),
      callLineById,
    });
    expect(msg.authorKind).toBe("system");
    expect(msg.body).toContain("No answer");
    expect(msg.body).not.toContain(CALL_ID);
    expect(msg.body).not.toContain("call:");
  });

  it("no matching call record: the line is plain Call - the raw id never renders", () => {
    const msg = threadMsgFromProductMessage(inviteMessage, {
      viewerUserId: "u1",
      names: new Map(),
      callLineById: new Map(),
    });
    expect(msg.authorKind).toBe("system");
    expect(msg.body).toBe("Call");
  });

  it("a call: body is a call invite even without the message_type stamp", () => {
    expect(callInviteIdOf({ body: `call:${CALL_ID}`, message_type: undefined })).toBe(CALL_ID);
    expect(callInviteIdOf({ body: "Saturday works for me", message_type: "text" })).toBeNull();
  });

  it("ordinary messages pass through untouched as person messages", () => {
    const msg = threadMsgFromProductMessage(
      { ...inviteMessage, id: "m1", body: "Saturday works for me", message_type: "text" },
      { viewerUserId: "u1", names: new Map([["u1", "Regression A"]]), callLineById: new Map() },
    );
    expect(msg.authorKind).toBe("person");
    expect(msg.body).toBe("Saturday works for me");
    expect(msg.own).toBe(true);
  });

  it("the thread renders the mapped call line as a system line, with no call:<uuid> anywhere", () => {
    const callLineById = new Map([[CALL_ID, callLineForCallRecord(callRecord)]]);
    const messages = [
      threadMsgFromProductMessage(
        { ...inviteMessage, id: "m0", body: "Saturday works for me - 7:30 at Juniper and Ivy?", message_type: "text", sender_user_id: "u2" },
        { viewerUserId: "u1", names: new Map(), callLineById },
      ),
      threadMsgFromProductMessage(inviteMessage, {
        viewerUserId: "u1",
        names: new Map(),
        callLineById,
      }),
    ];
    const html = renderToString(
      <ThreadShell
        name="Regression B"
        initials="RB"
        messages={messages}
        plansById={new Map()}
        composerPlaceholder="Message Regression B"
      />,
    );
    expect(html).toContain("c1-system-line");
    expect(html).toContain("No answer");
    expect(html).not.toContain("call:");
    expect(html).not.toContain(CALL_ID);
  });
});

describe("deckfix F1 - deckSlots slot logic (unit)", () => {
  const reveal = (over: Partial<RevealItem>): RevealItem => ({
    reveal_key: "plan:p1:needs-answer",
    category: "P1",
    kicker: "Your move",
    title: "Dinner at Juniper",
    plan_id: "p1",
    lit: true,
    ...over,
  });
  const card = (id: string) => ({ id });

  it("reveals come first; claimed plans are excluded from card fill; the cap holds", () => {
    const claimed = new Set(["p1", "px"]);
    const slots = deckSlots(
      [card("p1"), card("c1"), card("c2"), card("c3")],
      [reveal({}), reveal({ reveal_key: "plan:px:needs-answer", plan_id: "px", lit: false })],
      claimed,
    );
    expect(slots.map((s) => s.kind)).toEqual(["reveal", "reveal", "card"]);
    expect(slots).toHaveLength(DECK_SECTION_CAP);
    const cardSlot = slots[2];
    expect(cardSlot.kind === "card" && cardSlot.card.id).toBe("c1");
  });

  it("an unmatched reveal renders even with an empty card set", () => {
    const slots = deckSlots([], [reveal({})], new Set(["p1"]));
    expect(slots).toHaveLength(1);
    expect(slots[0].kind).toBe("reveal");
  });
});

describe("deckfix F2b/F3/F7 - occlusion discipline at the CSS source", () => {
  const c1css = readFileSync(join(process.cwd(), "src/opalUi/c1/c1.css"), "utf8");
  const shellCss = readFileSync(join(process.cwd(), "src/c2/shell/c2shell.css"), "utf8");

  it("F2b: the Next Together strip is in flow - no sticky positioning", () => {
    const rule = c1css.match(/\[data-design="r18"\] \.c1-next-strip \{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("flex: none");
    expect(rule).not.toContain("sticky");
    expect(c1css).not.toMatch(/\.c1-next-strip \{[^}]*position:\s*sticky/);
  });

  it("F3: the deck port stays full-height (no inset) and the rest rhythm is pinned in the hero", () => {
    // An inset port makes the pack's clipped-text probe count
    // below-port content as clipped (its fold IS the viewport
    // bottom); the fix is rhythm, not inset - no margin inset rule
    // may exist for the opening.
    expect(shellCss).not.toMatch(/\[data-testid="c2-center-opening"\] \{[^}]*margin-bottom/);
    const opening = readFileSync(join(process.cwd(), "src/c2/shell/C2CenterOpening.tsx"), "utf8");
    expect(opening).toContain("minHeight: 356");
    // The scrolled-state discipline (harmony2) stays green.
    expect(shellCss).toContain("scroll-padding-bottom: calc(var(--dock-clearance) + var(--space-5))");
    expect(shellCss).toContain("scroll-margin-bottom: calc(var(--dock-clearance) + var(--space-5))");
  });

  it("F7: You surfaces are contained and their rows stop above the dock", () => {
    expect(shellCss).toMatch(/\.c2s-you-surface \{[^}]*flex: 1;[^}]*min-height: 0;/);
    expect(shellCss).toMatch(
      /\.c2s-you-surface > \.c2s-scroll \{[^}]*scroll-padding-bottom: calc\(var\(--dock-clearance\)/,
    );
    expect(shellCss).toMatch(
      /\.c2s-you-surface \.c2s-row \{[^}]*scroll-margin-bottom: calc\(var\(--dock-clearance\)/,
    );
    const youTsx = readFileSync(join(process.cwd(), "src/c2/shell/C2You.tsx"), "utf8");
    expect(youTsx).toContain('data-testid="c2-you" className="c2s-you-surface"');
    expect(youTsx).toContain('className="c2s-you-surface"');
  });
});
