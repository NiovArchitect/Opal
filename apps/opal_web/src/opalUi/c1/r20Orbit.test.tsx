/**
 * @vitest-environment jsdom
 *
 * Repair #20 (F-19 v2 + F-21a) pins.
 *
 * F-19 v2 (founder law, 2026-10-20 review): the orbit room is a
 * quiet card room whose center is the TOPIC, never a person -
 * - no ring of people, no center person, no viewer-at-center
 *   composition renders (the v1 testids are absent);
 * - the header names the SUBJECT (the next plan's title, else the
 *   conversation's own title) with the parties in small plain text;
 * - the where-we-are card renders the state lines and names
 *   friction plainly (waiting on an answer; a window closing; the
 *   window closed without an answer - never smoothed);
 * - what-we-have-done shows a "loved" mark ONLY where the data
 *   carries enjoyment provenance (repeat or explicit signal);
 * - the empty orbit is a promise: one teaching line plus the
 *   first-question invitation, and landing births no session;
 * - past Opal chats collapse into period pills (depth on intent);
 * - PLACE IN COMPOSER (Round 3 rebuild, superseding the v2/v4
 *   push-to-chat and drag mechanics): Opal's draft renders in a
 *   recommendation box (not a bubble); long-press SELECTS it;
 *   the one place action names the destination ("Place in Maya's
 *   composer"); the place path uses no clipboard API and sends
 *   no message; the thread landing places the words in the
 *   thread composer, unsent, caret active, under the "From your
 *   Orbit - unsent" provenance chip with its one-tap return.
 *
 * F-21a: notice routing is ONE derivation and it is exact.
 *
 * Rendered with the repo convention (react-dom/client + act).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { OrbitProjectionContract } from "../../api/productClient";
import { OrbitScreen, periodPillsForSessions } from "./OrbitScreen";
import { OrbitInfoBubble } from "./OrbitInfoBubble";
import { CenterChat, PeopleCallsList, ThreadShell, type PeopleCallSummary } from "./C1Surfaces";
import {
  routeForEtiquetteSignal,
  routeForPlanEtiquette,
  routeForReveal,
} from "./noticeRouting";
import {
  sessionsForConversation,
  type OrbitScope,
  type PersonOpalSessionRow,
} from "./opalChatScope";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}

// Repair #28 (W28-7): the composer mic renders ONLY where a
// speech recognizer genuinely exists (one composer grammar,
// capability-truth). jsdom has none, so tests that exercise the
// mic install this fake first; without it the mic is honestly
// absent (asserted in the composer-dock test).
class FakeRecognition {
  continuous = false;
  interimResults = false;
  onresult: unknown = null;
  onend: (() => void) | null = null;
  start() {}
  stop() {
    this.onend?.();
  }
}
function installFakeRecognition() {
  (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition =
    FakeRecognition;
}

afterEach(async () => {
  delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  vi.useRealTimers();
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  host?.remove();
  host = null;
  root = null;
});

function q(el: HTMLElement, sel: string) {
  return el.querySelector(sel);
}
function qa(el: HTMLElement, sel: string) {
  return Array.from(el.querySelectorAll(sel));
}

const groupScope: OrbitScope = {
  conversationId: "conv-group",
  title: "Weekend crew",
  composition: "group",
  party: [
    { id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: true, limbo: true, limboFractionRemaining: 0.4 },
    { id: "u-cy", name: "Cy", tint: 4, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null },
  ],
  personId: null,
  personName: null,
  planId: "plan-hike",
  planTitle: "Group hike",
};

const groupOrbit: OrbitProjectionContract = {
  conversation_id: "conv-group",
  composition: "group",
  parties: [
    { user_id: "u-me", display_name: "Me", is_viewer: true, pending: false, limbo: false, entity_tint: 1 },
    { user_id: "u-bea", display_name: "Bea", is_viewer: false, pending: true, limbo: true, limbo_fraction_remaining: 0.4, entity_tint: 2 },
    { user_id: "u-cy", display_name: "Cy", is_viewer: false, pending: true, limbo: false, entity_tint: 4 },
    { user_id: "u-eli", display_name: "Eli", is_viewer: false, pending: true, limbo: true, entity_tint: 3 },
  ],
  plans: [
    {
      plan_id: "plan-hike",
      title: "Group hike",
      status: "tentative",
      state: "forming",
      when_label: "Saturday 9 AM",
      where_label: "Trailhead",
      participants: [
        { user_id: "u-me", response_state: "accepted", pending: false, limbo: false },
        { user_id: "u-bea", response_state: "pending", pending: true, limbo: true, limbo_stage: "nudged", limbo_fraction_remaining: 0.4 },
        { user_id: "u-cy", response_state: "pending", pending: true, limbo: false },
        { user_id: "u-eli", response_state: "pending", pending: true, limbo: true, limbo_stage: "closed" },
      ],
    },
  ],
  next_plan: {
    plan_id: "plan-hike",
    title: "Group hike",
    status: "tentative",
    state: "forming",
    when_label: "Saturday 9 AM",
    where_label: "Trailhead",
  },
};

const noopHandlers = {
  onOpenSession: () => {},
  onStartNew: () => {},
  onOpenPlan: () => {},
  onBackToThread: () => {},
};

describe("F-19 v2 orbit screen - the quiet card room, topic at the center", () => {
  it("NO ring-of-people composition renders: no ring, no center, no person lights, no plan stones", async () => {
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
      >
        <div data-testid="orbit-child-chat" />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-screen"]')?.getAttribute("data-composition")).toBe("group");
    for (const gone of [
      "orbit-ring",
      "orbit-center",
      "orbit-person-light",
      "orbit-plan-stone",
      "orbit-ring-legend",
      "orbit-legend-person",
      "orbit-legend-plan",
      "orbit-arc",
    ]) {
      expect(q(el, `[data-testid="${gone}"]`), `${gone} must not render in v2`).toBeNull();
    }
    // V4 (Addendum B): an SVG returns - but it is the RING
    // COMPOSITION (topic at center, parties as lights), never
    // the v1 ring-of-people. Its pins live in the v4 describe.
    expect(q(el, '[data-testid="orbit-composition"]')).not.toBeNull();
  });

  it("V4 ring composition: topic at center, one light per party, state glow classes", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    const comp = q(el, '[data-testid="orbit-composition"]')!;
    expect(comp.getAttribute("data-party-count")).toBe("4");
    expect(q(comp, '[data-testid="orbit-screen-title"]')?.textContent?.trim()).toBe("Group hike");
    const lights = qa(comp, '[data-testid="orbit-composition-light"]');
    expect(lights).toHaveLength(4);
    const byId = new Map(lights.map((l) => [l.getAttribute("data-user-id"), l.getAttribute("data-state")]));
    expect(byId.get("u-bea")).toBe("limbo");
    expect(byId.get("u-cy")).toBe("action");
    expect(byId.get("u-eli")).toBe("limbo");
    expect(byId.get("u-me")).toBe("settled");
    // The rotor + trace ride the ring (brand geometry classes).
    expect(comp.querySelector(".orbit-composition-rotor")).not.toBeNull();
    expect(comp.querySelector(".orbit-composition-trace")).not.toBeNull();
    // Center is the topic text, never a person: no light sits at center.
    expect(comp.querySelector(".orbit-composition-center")?.textContent).toContain("Group hike");
  });

  it("V4 ring composition compresses a large party: 11 lights + one overflow light", async () => {
    const many = {
      ...groupOrbit,
      parties: Array.from({ length: 15 }, (_, i) => ({
        user_id: `u-${i}`, display_name: `P${i}`, is_viewer: i === 0, pending: false, limbo: false, entity_tint: 1,
      })),
    } as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={many} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(qa(el, '[data-testid="orbit-composition-light"]')).toHaveLength(11);
    expect(q(el, '[data-testid="orbit-composition-overflow"]')?.textContent).toContain("+4");
  });

  it("the header names the SUBJECT - the next plan's title - with the parties in plain small text", async () => {
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
      >
        <div data-testid="orbit-child-chat" />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-screen-title"]')?.textContent?.trim()).toBe("Group hike");
    const parties = q(el, '[data-testid="orbit-parties"]')?.textContent ?? "";
    expect(parties).toContain("Bea");
    expect(parties).toContain("Cy");
    expect(parties).toContain("You");
    // Repair #21 (Discovery Doctrine): the field carries NO purpose
    // line - the room explains nothing. The conversation lives in
    // the field, unexplained.
    expect(q(el, '[data-testid="orbit-field"]')?.textContent).not.toContain(
      "tell Opal where you're coming from",
    );
    expect(el.textContent).not.toContain("Ask Opal about this conversation");
    expect(q(el, '[data-testid="orbit-child-chat"]')).not.toBeNull();
    // One-tap return to the thread is intact, and it is the room's
    // only chrome: a short Back, not a sentence.
    const back = q(el, '[data-testid="orbit-back-to-thread"]');
    expect(back).not.toBeNull();
    expect(back?.textContent?.trim()).toBe("‹ Back");
  });

  it("a dyad with no plan names the conversation itself as the subject", async () => {
    const dyadScope: OrbitScope = {
      conversationId: "conv-dyad",
      title: "Bea",
      composition: "dyad",
      party: [
        { id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null },
      ],
      personId: "u-bea",
      personName: "Bea",
      planId: null,
      planTitle: null,
    };
    const el = await render(
      <OrbitScreen
        scope={dyadScope}
        orbit={null}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
      >
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-screen-title"]')?.textContent?.trim()).toBe("Bea");
  });

  it("where-we-are names the friction plainly: waiting, cooling, and closed without an answer", async () => {
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
      >
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    expect(q(el, '[data-testid="orbit-where-card"]')).not.toBeNull();
    // V4.1 (C-2): the row carries its delta only - the time;
    // the title lives once, at the ring's center.
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Saturday 9 AM");
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).not.toContain("Group hike");
    expect(q(el, '[data-testid="orbit-pending-line"]')?.textContent).toContain(
      "Waiting on an answer from Cy",
    );
    const cooling = q(el, '[data-testid="orbit-limbo-line"]')?.textContent ?? "";
    expect(cooling).toContain("Bea");
    expect(cooling).toContain("window is closing");
    expect(cooling).toContain("waiting on an answer");
    expect(q(el, '[data-testid="orbit-closed-line"]')?.textContent).toContain(
      "The window closed without an answer from Eli",
    );
  });

  it("what-we-have-done: the loved mark appears ONLY with enjoyment provenance in the data", async () => {
    const withPast = {
      ...groupOrbit,
      past_plans: [
        { plan_id: "p-brunch", title: "Brunch at Lola", when_label: "Last Sunday", repeated: true },
        { plan_id: "p-walk", title: "Pier walk", when_label: "Two weeks ago", loved: true, repeated: true, loved_evidence: "repeated" },
        { plan_id: "p-errand", title: "Hardware run", when_label: "Last month" },
      ],
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={withPast}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
      >
        <div />
      </OrbitScreen>,
    );
    // Collapsed by default (progressive disclosure): the card
    // header earns its place, the rows wait behind the tap.
    expect(q(el, '[data-testid="orbit-past-card"]')).not.toBeNull();
    expect(qa(el, '[data-testid="orbit-past-row"]')).toHaveLength(0);
    await act(async () => {
      (q(el, '[data-testid="orbit-past-toggle"]') as HTMLButtonElement).click();
    });
    const rows = qa(el, '[data-testid="orbit-past-row"]');
    expect(rows).toHaveLength(3);
    const byId = new Map(rows.map((r) => [r.getAttribute("data-plan-id"), r]));
    expect(byId.get("p-brunch")?.querySelector('[data-testid="orbit-past-loved"]')?.textContent).toContain("Done again");
    expect(byId.get("p-walk")?.querySelector('[data-testid="orbit-past-loved"]')?.textContent).toContain("Done again");
    // No signal in the data = no loved mark invented for the row.
    expect(byId.get("p-errand")?.querySelector('[data-testid="orbit-past-loved"]')).toBeNull();
  });

  it("no past data at all: the done-and-loved card is honestly absent, never invented", async () => {
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
      >
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-past-card"]')).toBeNull();
  });

  it("the empty orbit (v3): the room simply empty, one quiet info bubble, a minimal composer", async () => {
    const onAsk = vi.fn();
    const dyadScope: OrbitScope = {
      conversationId: "conv-dyad",
      title: "Bea",
      composition: "dyad",
      party: [
        { id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null },
      ],
      personId: "u-bea",
      personName: "Bea",
      planId: null,
      planTitle: null,
    };
    const el = await render(
      <OrbitScreen
        scope={dyadScope}
        orbit={null}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={{ onAsk }}
        {...noopHandlers}
      />,
    );
    expect(q(el, '[data-testid="orbit-empty"]')).not.toBeNull();
    // Repair #21 (A): the v2 empty-state sentence and the teaching
    // line are DEAD as first-paint copy. The room is simply empty:
    // no explanation text is in the DOM at all until the bubble is
    // tapped.
    expect(q(el, '[data-testid="orbit-empty-teaching"]')).toBeNull();
    expect(q(el, '[data-testid="orbit-empty"]')?.textContent).not.toContain(
      "keeps what this conversation becomes",
    );
    expect(q(el, '[data-testid="orbit-empty"]')?.textContent).not.toContain("Ask the first question");
    expect(q(el, '[data-testid="orbit-empty"]')?.textContent).not.toContain(
      "No chats with Opal about",
    );
    expect(q(el, '[data-testid="orbit-info-bubble-text"]')).toBeNull();
    const bubble = q(el, '[data-testid="orbit-info-bubble"]') as HTMLButtonElement;
    expect(bubble).not.toBeNull();
    expect(bubble.textContent?.trim()).toBe("i");
    // The composer placeholder is minimal.
    expect(
      (q(el, '[data-testid="orbit-empty-input"]') as HTMLInputElement).placeholder,
    ).toBe("Message Opal");
    // Tapping the bubble reveals the explanation in place; tapping
    // again folds it away.
    await act(async () => {
      bubble.click();
    });
    // V4 req 8: the (i) content is ONE static line, exact.
    expect(q(el, '[data-testid="orbit-info-bubble-text"]')?.textContent).toBe(
      "Just you and Opal, about this conversation.",
    );
    await act(async () => {
      bubble.click();
    });
    expect(q(el, '[data-testid="orbit-info-bubble-text"]')).toBeNull();
    // Landing alone births nothing.
    expect(onAsk).not.toHaveBeenCalled();

    const input = q(el, '[data-testid="orbit-empty-input"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, "What did we decide about Saturday?");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    const send = q(el, '[data-testid="orbit-empty-send"]') as HTMLButtonElement;
    expect(send).not.toBeNull();
    await act(async () => {
      send.click();
    });
    expect(onAsk).toHaveBeenCalledWith("What did we decide about Saturday?");
  });

  it("past Opal chats collapse into ONE folded row (v3); rows appear only when it opens", async () => {
    const now = new Date();
    const rows: PersonOpalSessionRow[] = [
      {
        id: "s-recent",
        title: "Hike planning",
        preview: "",
        timeLabel: "Tue",
        isActive: true,
        context: null,
        conversationScopeId: "conv-group",
        updatedAt: now.toISOString(),
      },
      {
        id: "s-old",
        title: "Old thread",
        preview: "",
        timeLabel: "Jan",
        isActive: true,
        context: null,
        conversationScopeId: "conv-group",
        updatedAt: "2025-01-15T10:00:00Z",
      },
    ];
    expect(periodPillsForSessions(rows, now).map((p) => p.key)).toEqual(["this-week", "earlier"]);
    expect(sessionsForConversation(rows, "conv-group").map((s) => s.id)).toEqual(["s-recent", "s-old"]);

    const onOpenSession = vi.fn();
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={rows}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
        onOpenSession={onOpenSession}
      >
        <div />
      </OrbitScreen>,
    );
    // The period bucketing derivation itself still stands (it is
    // the exported summarizer); the ROOM no longer paints pills.
    expect(qa(el, '[data-testid="orbit-period-pill"]')).toHaveLength(0);
    expect(el.textContent).not.toContain("Start a new chat in this orbit");
    // ONE folded row for all past chats, whatever their periods.
    const fold = q(el, '[data-testid="orbit-past-chats-toggle"]') as HTMLButtonElement;
    expect(fold).not.toBeNull();
    expect(fold.textContent).toContain("Past chats (2)");
    // Collapsed: no session rows are painted until intent.
    expect(qa(el, '[data-testid="orbit-index-row"]')).toHaveLength(0);
    expect(q(el, '[data-testid="orbit-index-new"]')).toBeNull();
    await act(async () => {
      fold.click();
    });
    const indexRows = qa(el, '[data-testid="orbit-index-row"]');
    expect(indexRows).toHaveLength(2);
    expect(indexRows.map((r) => r.getAttribute("data-session-id"))).toEqual([
      "s-recent",
      "s-old",
    ]);
    // The new-chat affordance lives inside the fold now, minimal.
    const newBtn = q(el, '[data-testid="orbit-index-new"]');
    expect(newBtn?.textContent?.trim()).toBe("+ New chat");
    await act(async () => {
      (indexRows[0] as HTMLButtonElement).click();
    });
    expect(onOpenSession).toHaveBeenCalledWith("s-recent");
  });
});

describe("Repair #21 orbit v3 - radical calm", () => {
  it("DISCOVERY DOCTRINE PIN: none of the killed explanatory copy renders anywhere in the room", async () => {
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
        recommendation="A draft."
        onShapeRequest={() => {}}
      >
        <div data-testid="orbit-child-chat" />
      </OrbitScreen>,
    );
    for (const killed of [
      "Start a new chat in this orbit",
      "Ask Opal about this conversation",
      "Ask Opal for another take",
      "tell Opal where you're coming from",
      "Ask Opal, or tell Opal where you're coming from",
      "PAST CHATS WITH OPAL HERE",
      "A DRAFT FOR YOU",
      "OPAL'S READ",
    ]) {
      expect(el.textContent, `killed copy must not render: ${killed}`).not.toContain(killed);
    }
    // The minimal replacement affordance is what renders instead.
    const box = q(el, '[data-testid="orbit-recommendation"]') as HTMLElement;
    await act(async () => {
      box.dispatchEvent(new window.MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });
    const another = q(el, '[data-testid="orbit-recommendation-another"]');
    expect(another?.textContent).toContain("Another take");
    expect(another?.textContent).not.toContain("Ask Opal");
  });

  it("where-we-are rows carry their state, and Next together is visibly tappable when a plan opener exists", async () => {
    const onOpenPlan = vi.fn();
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
        onOpenPlan={onOpenPlan}
      >
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    const next = q(el, '[data-testid="orbit-next-together"]') as HTMLButtonElement;
    // groupOrbit's next plan is forming: the row carries the family.
    expect(next.getAttribute("data-state")).toBe("forming");
    expect(next.tagName).toBe("BUTTON");
    await act(async () => {
      next.click();
    });
    expect(onOpenPlan).toHaveBeenCalledWith("plan-hike");
    expect(q(el, '[data-testid="orbit-pending-line"]')?.getAttribute("data-state")).toBe("action");
    expect(q(el, '[data-testid="orbit-limbo-line"]')?.getAttribute("data-state")).toBe("limbo");
    expect(q(el, '[data-testid="orbit-closed-line"]')?.getAttribute("data-state")).toBe("limbo");
  });

  it("the projection's next-together restatement line does not render twice (integrator dedupe pin)", async () => {
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        whereLines={[
          "Next together: Group hike - Saturday 9 AM.",
          "Bea has not answered Group hike yet.",
        ]}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
      >
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    // The key row carries the fact (from next_plan)...
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Saturday 9 AM");
    // ...and the projection's restatement of it is gone, while the
    // standing line that follows it still renders.
    const lines = [...el.querySelectorAll('[data-testid="orbit-where-line"]')].map(
      (n) => n.textContent,
    );
    expect(lines).toEqual(["Bea has not answered Group hike yet."]);
    expect(el.textContent).not.toContain("Next together: Group hike");
  });

  it("the info bubble pattern stands alone: quiet at rest, explanation only on tap", async () => {
    const el = await render(
      <OrbitInfoBubble label="About this room">The quiet explanation.</OrbitInfoBubble>,
    );
    expect(q(el, '[data-testid="orbit-info-bubble-text"]')).toBeNull();
    const bubble = q(el, '[data-testid="orbit-info-bubble"]') as HTMLButtonElement;
    expect(bubble.getAttribute("aria-label")).toBe("About this room");
    expect(bubble.getAttribute("aria-expanded")).toBe("false");
    await act(async () => {
      bubble.click();
    });
    expect(q(el, '[data-testid="orbit-info-bubble-text"]')?.textContent).toBe(
      "The quiet explanation.",
    );
    expect(bubble.getAttribute("aria-expanded")).toBe("true");
  });

  it("the embedded conversation carries no chrome of its own: no hamburger, no second back, no chip, no pill", async () => {
    const context = {
      personId: "u-bea",
      personName: "Bea",
      planId: null,
      planTitle: null,
      conversationId: "conv-bea",
    } as never;
    const el = await render(
      <CenterChat
        title="Dinner chat"
        messages={[]}
        plansById={new Map()}
        embedded
        composerPlaceholder="Message Opal"
        context={context}
        chrome={{ onOpenRail: () => {}, onRename: () => {} }}
      />,
    );
    expect(q(el, '[data-testid="center-chat-navigator"]')).toBeNull();
    expect(q(el, '[aria-label="Back to chats"]')).toBeNull();
    expect(q(el, '[data-testid="center-chat-title"]')).toBeNull();
    expect(q(el, '[data-testid="opal-context-chip"]')).toBeNull();
    expect(el.textContent).not.toContain("Chat with Opal");
    // The one quiet remainder is the conversation actions overflow.
    expect(q(el, '[data-testid="center-chat-overflow"]')).not.toBeNull();
    const input = q(el, '[data-testid="opal-chat-composer"] input') as HTMLInputElement;
    expect(input.placeholder).toBe("Message Opal");
  });

  it("the standalone conversation keeps its full chrome (embedded is orbit-only)", async () => {
    const el = await render(
      <CenterChat
        title="Dinner chat"
        messages={[]}
        plansById={new Map()}
        chrome={{ onOpenRail: () => {} }}
      />,
    );
    expect(q(el, '[data-testid="center-chat-navigator"]')).not.toBeNull();
    expect(q(el, '[aria-label="Back to chats"]')).not.toBeNull();
    expect(q(el, '[data-testid="center-chat-title"]')?.textContent).toBe("Dinner chat");
  });
});

describe("F-19 v2 place in composer - the Voice Law mechanic (Round 3 rebuild)", () => {
  it("the draft renders in its own recommendation box; long-press SELECTS it; the place action names the destination and carries the words", async () => {
    vi.useFakeTimers();
    const onPushToChat = vi.fn();
    const onShapeRequest = vi.fn();
    const el = await render(
      <OrbitScreen
        scope={{ ...groupScope, personId: "u-maya", personName: "Maya Torres" }}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
        recommendation="Saturday works for me - see you at the trailhead at 9."
        onShapeRequest={onShapeRequest}
        onPushToChat={onPushToChat}
      >
        <div data-testid="orbit-child-chat" />
      </OrbitScreen>,
    );

    // The shape affordance is explicit, above the conversation.
    const shape = q(el, '[data-testid="orbit-shape-request"]') as HTMLButtonElement;
    expect(shape?.textContent).toContain("Shape what to say");
    await act(async () => {
      shape.click();
    });
    expect(onShapeRequest).toHaveBeenCalled();

    const box = q(el, '[data-testid="orbit-recommendation"]') as HTMLElement;
    expect(box).not.toBeNull();
    expect(q(el, '[data-testid="orbit-recommendation-text"]')?.textContent).toContain("Saturday works for me");
    // Not selected, no actions, until the long-press lands.
    expect(box.getAttribute("data-selected")).toBeNull();
    expect(q(el, '[data-testid="orbit-recommendation-actions"]')).toBeNull();
    await act(async () => {
      box.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    // Round 3: the hold SELECTS the draft (the copy-gesture users
    // already own) - visible selected state, one place action.
    expect(box.getAttribute("data-selected")).toBe("true");
    const place = q(el, '[data-testid="orbit-recommendation-place"]') as HTMLButtonElement;
    expect(place).not.toBeNull();
    // The action names the DESTINATION (the anchor's person,
    // first name) and never reads as sending.
    expect(place?.textContent?.trim()).toBe("Place in Maya's composer");
    expect(place?.textContent ?? "").not.toMatch(/send/i);
    // The unsent truth is stated beside it.
    expect(q(el, '[data-testid="orbit-recommendation-actions"]')?.textContent).toContain("unsent");
    await act(async () => {
      place.click();
    });
    // The tap crosses immediately - no flight, no timer: the
    // host carries the words into the thread composer.
    expect(onPushToChat).toHaveBeenCalledWith(
      "Saturday works for me - see you at the trailhead at 9.",
    );
  });

  it("Round 3: the drag is DISPOSED - a long-press then a move selects nothing, lifts nothing, and flies nothing", async () => {
    vi.useFakeTimers();
    const onPushToChat = vi.fn();
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} recommendation="Drag me to the chat" onPushToChat={onPushToChat}>
        <div data-testid="orbit-child-chat" />
      </OrbitScreen>,
    );
    const box = q(el, '[data-testid="orbit-recommendation"]') as HTMLElement;
    const fire = (type: string, x: number, y: number) =>
      box.dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
    await act(async () => { fire("pointerdown", 10, 10); });
    // A moving press is a scroll, not a hold: it cancels the
    // press, so even after the long-press window nothing is
    // selected - and there is no drag state or drop target at all.
    await act(async () => { fire("pointermove", 90, 80); });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(box.getAttribute("data-selected")).toBeNull();
    expect(box.getAttribute("data-dragging")).toBeNull();
    expect(box.getAttribute("data-flying")).toBeNull();
    expect(box.style.transform).toBe("");
    expect(q(el, '[data-testid="orbit-drop-target"]')).toBeNull();
    expect(q(el, '[data-testid="orbit-field"]')?.getAttribute("data-drop-target")).toBeNull();
    await act(async () => { fire("pointerup", 90, 80); });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(onPushToChat).not.toHaveBeenCalled();
    // The source carries no drag path at all anymore.
    const orbitSrc = readFileSync(resolve(__dirname, "OrbitScreen.tsx"), "utf8");
    expect(orbitSrc).not.toContain("data-dragging");
    expect(orbitSrc).not.toContain("orbit-drop-target");
    expect(orbitSrc).not.toContain("flyToChat");
  });

  it("adjust edits the draft in Orbit and the edited words are what gets pushed", async () => {
    vi.useFakeTimers();
    const onPushToChat = vi.fn();
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={[]}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
        recommendation="first draft"
        onPushToChat={onPushToChat}
      >
        <div />
      </OrbitScreen>,
    );
    const box = q(el, '[data-testid="orbit-recommendation"]') as HTMLElement;
    await act(async () => {
      box.dispatchEvent(new window.MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });
    // The context press selects too - the same one mechanic.
    expect(box.getAttribute("data-selected")).toBe("true");
    await act(async () => {
      (q(el, '[data-testid="orbit-recommendation-adjust"]') as HTMLButtonElement).click();
    });
    const input = q(el, '[data-testid="orbit-recommendation-input"]') as HTMLTextAreaElement;
    expect(input).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )!.set!;
      setter.call(input, "edited words");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await act(async () => {
      (q(el, '[data-testid="orbit-recommendation-save"]') as HTMLButtonElement).click();
    });
    expect(q(el, '[data-testid="orbit-recommendation-text"]')?.textContent).toContain("edited words");
    // The selection survives the edit, and the place action
    // carries the EDITED words - immediately, no flight timer.
    expect(box.getAttribute("data-selected")).toBe("true");
    await act(async () => {
      (q(el, '[data-testid="orbit-recommendation-place"]') as HTMLButtonElement).click();
    });
    expect(onPushToChat).toHaveBeenCalledWith("edited words");
  });

  it("PIN: the place path contains no clipboard API and no thread send - placement is an in-app handoff, not a copy", () => {
    const orbitSrc = readFileSync(
      resolve(__dirname, "OrbitScreen.tsx"),
      "utf8",
    );
    expect(orbitSrc).not.toContain("navigator.clipboard");
    expect(orbitSrc).not.toContain("execCommand");
    expect(orbitSrc).not.toContain("writeText");
    // OrbitScreen has no send prop or send call anywhere: placing
    // carries words into a composer, it never sends them.
    expect(orbitSrc).not.toMatch(/onSend/);
    expect(orbitSrc).not.toMatch(/sendMessage/);
    // The place action's label can never read as delivery.
    expect(orbitSrc).not.toContain("Send to");
  });

  it("the thread landing places the words in the composer, unsent, caret active, with the provenance chip and its one-tap return", async () => {
    const onSend = vi.fn();
    const onReturnToOrigin = vi.fn();
    const el = await render(
      <ThreadShell
        name="Bea"
        initials="B"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Bea"
        initialDraft="Saturday works for me - see you at 9."
        draftOrigin="orbit"
        onReturnToOrigin={onReturnToOrigin}
        onSend={onSend}
      />,
    );
    const input = q(el, '[data-testid="thread-composer-input"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("Saturday works for me - see you at 9.");
    // Placed, not sent.
    expect(onSend).not.toHaveBeenCalled();
    // Caret active: focus sits in the words, at their end.
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(input.value.length);
    // Round 3: the quiet provenance chip names the truth, and
    // its return is one tap.
    const chip = q(el, '[data-testid="thread-orbit-draft-chip"]');
    expect(chip?.textContent?.trim()).toBe("From your Orbit - unsent");
    const ret = q(el, '[data-testid="thread-orbit-draft-return"]') as HTMLButtonElement;
    expect(ret).not.toBeNull();
    await act(async () => {
      ret.click();
    });
    expect(onReturnToOrigin).toHaveBeenCalled();
    // Edit works from the landing: the words are a live draft.
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, "Saturday works for me - see you at 9. Bringing the map.");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    expect(input.value).toContain("Bringing the map.");
    expect(onSend).not.toHaveBeenCalled();
    // The chip lives exactly as long as the unsent draft: send
    // the words and it is gone.
    await act(async () => {
      (q(el, '[data-testid="thread-composer-send"]') as HTMLButtonElement).click();
    });
    expect(onSend).toHaveBeenCalledWith(
      "Saturday works for me - see you at 9. Bringing the map.",
    );
    expect(q(el, '[data-testid="thread-orbit-draft-chip"]')).toBeNull();
  });

  it("a thread with no orbit provenance carries no chip - a self-typed draft claims nothing", async () => {
    const el = await render(
      <ThreadShell
        name="Bea"
        initials="B"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Bea"
        onSend={() => {}}
      />,
    );
    expect(q(el, '[data-testid="thread-orbit-draft"]')).toBeNull();
  });
});

describe("F-19 v2 doorway parity - a call is a conversation", () => {
  const callRow: PeopleCallSummary = {
    id: "call-1",
    name: "Bea",
    initials: "B",
    metadata: "Yesterday - 12 min",
    conversationId: "conv-bea",
  };

  it("a call row carrying a conversation offers the same orbit doorway, opening that conversation's orbit", async () => {
    const onOpenOrbit = vi.fn();
    const el = await render(
      <PeopleCallsList calls={[callRow]} onOpenOrbit={onOpenOrbit} />,
    );
    const doorway = q(el, '[data-testid="calls-open-orbit-call-1"]') as HTMLButtonElement;
    expect(doorway).not.toBeNull();
    expect(doorway.getAttribute("data-conversation-id")).toBe("conv-bea");
    expect(doorway.querySelector(".c1-thread-opal-orb")).not.toBeNull();
    await act(async () => {
      doorway.click();
    });
    expect(onOpenOrbit).toHaveBeenCalledWith(expect.objectContaining({ id: "call-1" }));
  });

  it("a call row with no conversation id offers no doorway (honest absence)", async () => {
    const el = await render(
      <PeopleCallsList
        calls={[{ ...callRow, id: "call-2", conversationId: null }]}
        onOpenOrbit={() => {}}
      />,
    );
    expect(q(el, '[data-testid="calls-open-orbit-call-2"]')).toBeNull();
  });
});

describe("F-21a notice routing — the exact orbit/thread, never a generic landing", () => {
  it("a fork notice for conversation X lands in X's orbit", () => {
    expect(
      routeForEtiquetteSignal({
        signal_type: "non_response_fork",
        conversation_id: "conv-x",
        plan_id: "plan-1",
      }),
    ).toEqual({ kind: "orbit", conversationId: "conv-x", planId: "plan-1" });
    expect(
      routeForEtiquetteSignal({ signal_type: "non_response_closure", conversation_id: "conv-x" }),
    ).toEqual({ kind: "orbit", conversationId: "conv-x", planId: null });
    expect(
      routeForEtiquetteSignal({
        signal_type: "non_response_nudge",
        conversation_id: "conv-y",
        plan_id: null,
      }),
    ).toEqual({ kind: "orbit", conversationId: "conv-y", planId: null });
  });

  it("an etiquette signal without a trustworthy conversation lands nowhere", () => {
    expect(routeForEtiquetteSignal({ signal_type: "non_response_fork" })).toBeNull();
    expect(
      routeForEtiquetteSignal({ signal_type: "plan_reminder", conversation_id: "conv-x" }),
    ).toBeNull();
    expect(routeForEtiquetteSignal({ conversation_id: "conv-x" })).toBeNull();
    expect(routeForEtiquetteSignal(null)).toBeNull();
    expect(routeForEtiquetteSignal(undefined)).toBeNull();
  });

  it("a lane notice lands in its own thread's orbit", () => {
    expect(
      routeForReveal({
        change_request: { conversation_id: "conv-lane" },
        plan_id: "plan-lane",
      } as never),
    ).toEqual({ kind: "orbit", conversationId: "conv-lane", planId: "plan-lane" });
  });

  it("a conversation-bearing reveal lands in its thread; a plan-only reveal stays a plan", () => {
    expect(
      routeForReveal({ conversation_id: "conv-c", plan_id: "plan-c" } as never),
    ).toEqual({ kind: "thread", conversationId: "conv-c" });
    expect(routeForReveal({ plan_id: "plan-only" } as never)).toEqual({
      kind: "plan",
      planId: "plan-only",
    });
    expect(routeForReveal({} as never)).toBeNull();
    expect(routeForReveal(null)).toBeNull();
  });

  it("a plan card wearing a live fork or limbo routes to its conversation's orbit", () => {
    expect(
      routeForPlanEtiquette({
        conversation_id: "conv-f",
        etiquette: { fork: { state: "presented" }, limbo: { state: "settled" } },
      }),
    ).toEqual({ kind: "orbit", conversationId: "conv-f" });

    expect(
      routeForPlanEtiquette({
        conversation_id: "conv-l",
        etiquette: { fork: { state: "upcoming" }, limbo: { state: "limbo" } },
      }),
    ).toEqual({ kind: "orbit", conversationId: "conv-l" });

    // A settled card is not an orbit notice; a card with no
    // conversation identity can never be routed honestly.
    expect(
      routeForPlanEtiquette({
        conversation_id: "conv-s",
        etiquette: { fork: { state: "upcoming" }, limbo: { state: "settled" } },
      }),
    ).toBeNull();
    expect(
      routeForPlanEtiquette({
        conversation_id: null,
        etiquette: { fork: { state: "upcoming" }, limbo: { state: "limbo" } },
      }),
    ).toBeNull();
    expect(routeForPlanEtiquette({ conversation_id: "conv-n" })).toBeNull();
  });
});

async function expandWhere(el: HTMLElement) {
  await act(async () => { (q(el, '[data-testid="orbit-where-toggle"]') as HTMLButtonElement).click(); });
}

describe("Repair #21 orbit v4 - dock, collapse, discipline, doors, glimpse, chapters, frost", () => {
  it("composer dock: the empty orbit composer bar is present on first paint, mic in the slot, Send primary with text", async () => {
    // W28-7: with no recognizer in this environment the mic is
    // honestly ABSENT (it used to render unconditionally and fake
    // a recording state). With the capability installed below it
    // renders and records for real.
    const noCap = await render(
      <OrbitScreen scope={{ conversationId: "conv-x", title: "Bea", composition: "dyad", party: [{ id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null }], personId: "u-bea", personName: "Bea", planId: null, planTitle: null } as OrbitScope} orbit={null} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} />,
    );
    expect(q(noCap, '[data-testid="orbit-composer-mic"]')).toBeNull();
    installFakeRecognition();
    const onAsk = vi.fn();
    const dyadScope: OrbitScope = {
      conversationId: "conv-dyad", title: "Bea", composition: "dyad",
      party: [{ id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null }],
      personId: "u-bea", personName: "Bea", planId: null, planTitle: null,
    };
    const el = await render(
      <OrbitScreen scope={dyadScope} orbit={null} insight={null} sessions={[]} activeSessionId={null} emptyInvite={{ onAsk }} {...noopHandlers} />,
    );
    const bar = q(el, '[data-testid="orbit-composer-bar"]')!;
    expect(bar).not.toBeNull();
    const slot = q(el, '[data-testid="orbit-composer-action-slot"]')!;
    expect(slot.contains(q(el, '[data-testid="orbit-composer-mic"]'))).toBe(true);
    // Mic: recording state renders INSIDE the bar.
    await act(async () => { (q(el, '[data-testid="orbit-composer-mic"]') as HTMLButtonElement).click(); });
    expect(bar.contains(q(el, '[data-testid="orbit-composer-recording"]'))).toBe(true);
    await act(async () => { (q(el, '[data-testid="orbit-composer-stop"]') as HTMLButtonElement).click(); });
    expect(q(el, '[data-testid="orbit-composer-recording"]')).toBeNull();
    // Text present: Send is primary and labeled - nobody can miss it.
    const input = q(el, '[data-testid="orbit-empty-input"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Hello there");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    const send = q(el, '[data-testid="orbit-empty-send"]') as HTMLButtonElement;
    expect(send).not.toBeNull();
    // Reference form: a filled circle with an up-arrow - its
    // accessible name is Send, its face is the arrow.
    expect(send.textContent?.trim()).toBe("↑");
    expect(send.getAttribute("aria-label")).toBe("Send");
    expect(send.className).toContain("orbit-send-primary");
    expect(slot.contains(send)).toBe(true);
    await act(async () => { send.click(); });
    expect(onAsk).toHaveBeenCalledWith("Hello there");
  });

  it("composer dock CSS: the embedded surface is height-bounded and its flow scrolls, not the composer", () => {
    const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
    expect(css).toMatch(/\.orbit-field \.c1-surface \{[^}]*min-height: 0/);
    expect(css).toMatch(/\.orbit-field \.c1-surface \.c1-flow \{[^}]*overflow-y: auto/);
    expect(css).toMatch(/\.orbit-send-primary \{[^}]*border-radius: 50%/);
    const c1css = readFileSync(resolve(__dirname, "c1.css"), "utf8");
    expect(c1css).toContain(".c1-composer:focus-within { border-color: var(--line-2); }");
    expect(c1css).not.toContain(".c1-composer:focus-within { border-color: var(--accent-1); }");
  });

  it("V4.2 F-4 (supersedes the v4 collapse default): SLIM is home - live essentials only (next + your move); the full card is one tap; the choice persists", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    const card = q(el, '[data-testid="orbit-where-card"]')!;
    // Slim by default even with a live state: the essentials show...
    expect(card.getAttribute("data-expanded")).toBe("false");
    expect(q(el, '[data-testid="orbit-next-together"]')).not.toBeNull();
    // ...and nothing else does: open window / glimpse / insight wait for the tap.
    expect(q(el, '[data-testid="orbit-pending-line"]')).toBeNull();
    expect(q(el, '[data-testid="orbit-insight"]')).toBeNull();
    await expandWhere(el);
    expect(q(el, '[data-testid="orbit-where-card"]')!.getAttribute("data-expanded")).toBe("true");
    expect(q(el, '[data-testid="orbit-pending-line"]')).not.toBeNull();
    // The user's choice persists across the room's life (no reset on re-render or toggle back).
    await expandWhere(el);
    expect(q(el, '[data-testid="orbit-where-card"]')!.getAttribute("data-expanded")).toBe("false");
    expect(q(el, '[data-testid="orbit-next-together"]')).not.toBeNull();

    const quietScope: OrbitScope = {
      conversationId: "conv-q", title: "Bea", composition: "dyad",
      party: [{ id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null }],
      personId: "u-bea", personName: "Bea", planId: null, planTitle: null,
    };
    const el2 = await render(
      <OrbitScreen scope={quietScope} orbit={null} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(q(el2, '[data-testid="orbit-where-card"]')!.getAttribute("data-expanded")).toBe("false");
    expect(q(el2, '[data-testid="orbit-next-together"]')).toBeNull();
    await expandWhere(el2);
    expect(q(el2, '[data-testid="orbit-next-together"]')?.textContent).toContain("Nothing is planned");
  });

  it("color/weight discipline: headings carry the heading class, content carries content - and CSS spends state color on headings only", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    const next = q(el, '[data-testid="orbit-next-together"]')!;
    expect(next.querySelector(".orbit-card-label")!.className).toContain("orbit-heading");
    expect(next.querySelector(".orbit-where-value")!.className).toContain("orbit-content");
    for (const tid of ["orbit-pending-line", "orbit-limbo-line", "orbit-closed-line"]) {
      expect(q(el, `[data-testid="${tid}"]`)!.querySelector(".orbit-where-value")!.className, tid).toContain("orbit-content");
    }
    const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
    expect(css).toMatch(/\.orbit-where-value \{\s*font: 400 14px/);
    expect(css).not.toMatch(/\.orbit-where-row\[data-state[^]]*\] \.orbit-where-value \{[^}]*color: var\(--state/);
    expect(css).toMatch(/\.orbit-where-row\[data-state="action"\] \.orbit-heading \{ color: var\(--state-action-ink\)/);
  });

  it("rows are doors: pending, limbo, closed and open-window rows each open their own plan", async () => {
    const onOpenPlan = vi.fn();
    const withWindow = {
      ...groupOrbit,
      plans: [
        ...groupOrbit.plans,
        { plan_id: "plan-picnic", title: "Picnic", status: "tentative", state: "forming", when_label: null, where_label: "Park", participants: [] },
      ],
    } as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={withWindow} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} onOpenPlan={onOpenPlan}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    const click = async (tid: string) => {
      const row = q(el, `[data-testid="${tid}"]`) as HTMLButtonElement;
      expect(row.tagName, tid).toBe("BUTTON");
      await act(async () => { row.click(); });
    };
    await click("orbit-open-window");
    expect(onOpenPlan).toHaveBeenLastCalledWith("plan-picnic");
    await click("orbit-pending-line");
    expect(onOpenPlan).toHaveBeenLastCalledWith("plan-hike");
    await click("orbit-limbo-line");
    expect(onOpenPlan).toHaveBeenLastCalledWith("plan-hike");
    await click("orbit-closed-line");
    expect(onOpenPlan).toHaveBeenLastCalledWith("plan-hike");
  });

  it("future glimpse: this anchor's other real plans render as quiet stone doors; next together is not duplicated; no future = no glimpse", async () => {
    const onOpenPlan = vi.fn();
    const withFuture = {
      ...groupOrbit,
      plans: [
        ...groupOrbit.plans,
        { plan_id: "plan-cabin", title: "Cabin weekend", status: "tentative", state: "ready", when_label: "Next month", where_label: "Big Bear", participants: [] },
      ],
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={withFuture} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} onOpenPlan={onOpenPlan}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    const glimpse = qa(el, '[data-testid="orbit-glimpse-row"]');
    expect(glimpse).toHaveLength(1);
    expect(glimpse[0]!.getAttribute("data-plan-id")).toBe("plan-cabin");
    expect(glimpse[0]!.getAttribute("data-state")).toBe("ready");
    expect(glimpse[0]!.querySelector(".orbit-where-value")!.className).toContain("orbit-content");
    await act(async () => { (glimpse[0] as HTMLButtonElement).click(); });
    expect(onOpenPlan).toHaveBeenCalledWith("plan-cabin");
    const el2 = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(qa(el2, '[data-testid="orbit-glimpse-row"]')).toHaveLength(0);
  });

  it("retrospective chapters: pills are the chapter index inside the fold, stones are the settled plans, loved + firsts only from the record", async () => {
    const now = new Date();
    const rows: PersonOpalSessionRow[] = [
      { id: "s-recent", title: "Hike planning", preview: "", timeLabel: "Tue", isActive: true, context: null, conversationScopeId: "conv-group", updatedAt: now.toISOString() },
      { id: "s-old", title: "First talk", preview: "", timeLabel: "Jan", isActive: true, context: null, conversationScopeId: "conv-group", updatedAt: "2025-01-15T10:00:00Z" },
    ];
    const withPast = {
      ...groupOrbit,
      past_plans: [
        { plan_id: "p-brunch", title: "Brunch at Lola", when_label: "Last Sunday", repeated: true },
        { plan_id: "p-errand", title: "Hardware run", when_label: "Last month" },
      ],
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={withPast} insight={null} sessions={rows} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    // First paint: no pills, no chapter - the retrospective is discovered.
    expect(qa(el, '[data-testid="orbit-period-pill"]')).toHaveLength(0);
    await act(async () => { (q(el, '[data-testid="orbit-past-toggle"]') as HTMLButtonElement).click(); });
    const stones = qa(el, '[data-testid="orbit-past-row"]');
    expect(stones).toHaveLength(2);
    expect(stones.every((r) => r.getAttribute("data-stone") === "true")).toBe(true);
    const pills = qa(el, '[data-testid="orbit-period-pill"]');
    expect(pills.map((pp) => pp.getAttribute("data-chapter-key"))).toEqual(["this-week", "earlier"]);
    // V4.1 (C-2 dedupe): a plan appears ONCE, in its strongest
    // form - the stone in the fold, loved mark on it. The chapter
    // panel never re-lists plans.
    expect(q(el, '[data-testid="orbit-chapter"]')?.getAttribute("data-chapter-key")).toBe("this-week");
    expect(q(el, '[data-testid="orbit-chapter-loved"]')).toBeNull();
    expect(qa(el, '[data-testid="orbit-past-row"]')).toHaveLength(2);
    expect(q(el, '[data-testid="orbit-chapter"]')?.textContent).toContain("Hike planning");
    // Earliest chapter carries the record's first.
    await act(async () => { (pills[1] as HTMLButtonElement).click(); });
    expect(q(el, '[data-testid="orbit-chapter"]')?.getAttribute("data-chapter-key")).toBe("earlier");
    expect(q(el, '[data-testid="orbit-chapter-milestone"]')?.textContent).toContain("First chat here - First talk");
  });

  it("twin test layers: the room root carries the ring state (its light), and the exit names its destination", async () => {
    const dyadScope: OrbitScope = {
      conversationId: "conv-dyad", title: "Bea", composition: "dyad",
      party: [{ id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null }],
      personId: "u-bea", personName: "Bea", planId: null, planTitle: null,
    };
    const el = await render(
      <OrbitScreen scope={dyadScope} orbit={null} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} />,
    );
    expect(q(el, '[data-testid="orbit-composition"]')).not.toBeNull();
    const back = q(el, '[data-testid="orbit-back-to-thread"]')!;
    expect(back.getAttribute("aria-label")).toBe("Back to your chat with Bea");
    expect(back.textContent?.trim()).toBe("‹ Back");
    const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
    expect(css).toMatch(/\.orbit-screen \{[^}]*--orbit-glow/);
    expect(css).toMatch(/\.orbit-screen \{\s*background: linear-gradient\(180deg, color-mix\(in srgb, var\(--orbit-glow\) 7%/);
  });

  it("V4.1 C-1: heading color is PER-ROW - ready next, forming window, action your-move, each its own state token", async () => {
    const orbit = {
      ...groupOrbit,
      plans: [
        { plan_id: "plan-ready", title: "Dinner", status: "agreed", state: "ready", when_label: "Friday 7 PM", where_label: "Lola", participants: [{ user_id: "u-me", response_state: "pending", pending: true, limbo: false }] },
        { plan_id: "plan-open", title: "Picnic", status: "tentative", state: "action", when_label: null, where_label: "Park", participants: [] },
      ],
      next_plan: { plan_id: "plan-ready", title: "Dinner", status: "agreed", state: "ready", when_label: "Friday 7 PM", where_label: "Lola" },
      parties: [
        { user_id: "u-me", display_name: "Me", is_viewer: true, pending: true, limbo: false, entity_tint: 1 },
        { user_id: "u-bea", display_name: "Bea", is_viewer: false, pending: false, limbo: false, entity_tint: 2 },
      ],
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={orbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    expect(q(el, '[data-testid="orbit-next-together"]')?.getAttribute("data-state")).toBe("ready");
    expect(q(el, '[data-testid="orbit-open-window"]')?.getAttribute("data-state")).toBe("forming");
    expect(q(el, '[data-testid="orbit-viewer-pending"]')?.getAttribute("data-state")).toBe("action");
    // The card heading carries NO state color: it is a name, not a row.
    expect(q(el, '[data-testid="orbit-where-toggle"]')?.getAttribute("data-state")).toBeNull();
    const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
    const tok = (st: string) => css.match(new RegExp(`\\.orbit-where-row\\[data-state="${st}"\\] \\.orbit-heading \\{ color: var\\((--[a-z-]+)\\)`))?.[1];
    expect(tok("ready")).toBe("--state-ready-ink");
    expect(tok("forming")).toBe("--state-forming-ink");
    expect(tok("action")).toBe("--state-action-ink");
    expect(new Set([tok("ready"), tok("forming"), tok("action")]).size).toBe(3);
    // C-2 deltas in the same room: no plan title inside any row.
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Friday 7 PM");
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).not.toContain("Dinner");
    expect(q(el, '[data-testid="orbit-open-window"]')?.textContent).toContain("Time not set yet");
    expect(q(el, '[data-testid="orbit-open-window"]')?.textContent).not.toContain("Picnic");
  });

  it("V4.1 C-2: a waiting-on restatement folds into Your move (the fact is carried once)", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} whereLines={["Still waiting on Ethan Walker for Group hike.", "Bea has not answered Group hike yet."]} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    // groupOrbit's viewer is not pending, so nothing folds here:
    expect(el.textContent).toContain("Still waiting on Ethan Walker");
    const viewerOrbit = {
      ...groupOrbit,
      parties: groupOrbit.parties.map((pp) => pp.is_viewer ? { ...pp, pending: true } : pp),
    } as OrbitProjectionContract;
    const el2 = await render(
      <OrbitScreen scope={groupScope} orbit={viewerOrbit} whereLines={["Still waiting on Ethan Walker for Group hike."]} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el2);
    expect(q(el2, '[data-testid="orbit-viewer-pending"]')).not.toBeNull();
    expect(el2.textContent).not.toContain("Still waiting on Ethan Walker");
  });

  it("V4.1 C-3: the embedded (orbit) session composer is uniform - mic in the slot when empty, recording inside the bar, Send with text", async () => {
    installFakeRecognition();
    const el = await render(
      <CenterChat title="Dinner chat" messages={[]} plansById={new Map()} embedded composerPlaceholder="Message Opal" onSend={() => {}} />,
    );
    const slot = q(el, '[data-testid="opal-chat-composer-action-slot"]')!;
    const mic = q(el, '[data-testid="opal-chat-composer-mic"]') as HTMLButtonElement;
    expect(mic).not.toBeNull();
    expect(slot.contains(mic)).toBe(true);
    await act(async () => { mic.click(); });
    expect(q(el, '[data-testid="opal-chat-composer-recording"]')).not.toBeNull();
    await act(async () => { (q(el, '[data-testid="opal-chat-composer-stop"]') as HTMLButtonElement).click(); });
    expect(q(el, '[data-testid="opal-chat-composer-recording"]')).toBeNull();
    const input = q(el, '[data-testid="opal-chat-composer"] input') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "See you then");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    expect(q(el, '[data-testid="opal-chat-composer-send"]')).not.toBeNull();
    expect(q(el, '[data-testid="opal-chat-composer-mic"]')).toBeNull();
  });

  it("purpose test / C-2 at the data level: an insight that restates the next plan's time is suppressed; a real read renders", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={"Saturday 9 AM"} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    expect(q(el, '[data-testid="orbit-insight"]')).toBeNull();
    const el2 = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={"Bea has gone quiet since Tuesday."} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el2);
    expect(q(el2, '[data-testid="orbit-insight"]')?.textContent).toContain("gone quiet");
  });

  it("V4.2 F-3: the ring enters big, then SETTLES SMALL (data-settled after the settle window); reduced motion starts compact; the ring never leaves", async () => {
    vi.useFakeTimers();
    try {
      const el = await render(
        <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
          <div />
        </OrbitScreen>,
      );
      const comp = q(el, '[data-testid="orbit-composition"]')!;
      expect(comp.getAttribute("data-settled")).toBeNull();
      await act(async () => { vi.advanceTimersByTime(1700); });
      expect(comp.getAttribute("data-settled")).toBe("true");
      // Twin Test layer 1 holds at the small size: still present, lights + topic intact.
      expect(q(el, '[data-testid="orbit-composition"]')).not.toBeNull();
      expect(qa(el, '[data-testid="orbit-composition-light"]').length).toBeGreaterThan(0);
      const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
      expect(css).toContain('.orbit-composition[data-settled="true"]');
      expect(css).toContain("width: 90px; height: 90px");
    } finally { vi.useRealTimers(); }
    // Reduced motion: compact from the first frame.
    const origMM = window.matchMedia;
    window.matchMedia = ((qstr: string) => ({ matches: qstr.includes("prefers-reduced-motion"), media: qstr, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      const el2 = await render(
        <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
          <div />
        </OrbitScreen>,
      );
      expect(q(el2, '[data-testid="orbit-composition"]')!.getAttribute("data-settled")).toBe("true");
    } finally { window.matchMedia = origMM; }
  });

  it("V4.2 F-5: furniture placement - the Shape chip docks above the composer in the frost zone; the embedded overflow lives in the header row (CSS contract)", () => {
    const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
    const chip = css.slice(css.indexOf(".orbit-shape-btn {"), css.indexOf(".orbit-shape-btn {") + 700);
    expect(chip).toContain("position: absolute");
    expect(chip).toContain("bottom: 142px");
    const head = css.slice(css.indexOf('.c1-surface[data-embedded="true"] .c1-header {'));
    expect(head).toContain("position: absolute; top: 6px; right: var(--gutter, 16px)");
    const c1 = readFileSync(resolve(__dirname, "c1.css"), "utf8");
    // F-1/F-2 stacking: composer bars sit inside the sheet, above the chrome band.
    expect(c1).toContain("z-index: calc(var(--layer-chrome, 30) + 1)");
  });

  it("full-width frost: the shell carries a frost strip element and its CSS spans edge to edge", () => {
    const shell = readFileSync(resolve(__dirname, "../../c2/shell/C2Shell.tsx"), "utf8");
    expect(shell).toContain('data-testid="c2-frost-strip"');
    const css = readFileSync(resolve(__dirname, "../../c2/shell/c2shell.css"), "utf8");
    const strip = css.slice(css.indexOf(".c2s-frost-strip {"), css.indexOf(".c2s-dock::before"));
    expect(strip).toContain("left: 0");
    expect(strip).toContain("right: 0");
    // V4.2 (F-1): ONE true backdrop sheet - bottom-anchored,
    // tall enough to hold composer AND pad, translucent tint,
    // the blur itself dissolving at the top via mask (no hard
    // edge floating mid-screen).
    expect(strip).toContain("bottom: 0");
    expect(strip).toContain("backdrop-filter: blur(22px)");
    // V4.2.1 (CF2-7): no kink an edge can form on - the tint
    // eases in on a multi-stop ramp and the blur's mask fade
    // runs on the same long curve (the v4.2 two-stop 80%-at-56%
    // tint + 48% mask read as a slab edge in an empty room).
    expect(strip).toContain("mask-image: linear-gradient(to bottom, transparent 0%, black 64%)");
    expect(strip).toContain("color-mix(in srgb, var(--chrome-glass-tint) 48%, transparent) 52%");
    expect(strip).toContain("color-mix(in srgb, var(--chrome-glass-tint) 94%, transparent) 100%");
    expect(strip).not.toContain("80%, transparent) 56%");
    expect(strip).not.toContain("border");
    expect(strip).not.toContain("box-shadow");
  });
});

describe("Repair #21 orbit v4.2.1 - CF2-5 compact header, CF2-6 copy coherence", () => {
  const longSubjectOrbit = {
    ...groupOrbit,
    subject: "Talk tonight about Saturday",
    next_plan: { plan_id: "plan-hike", title: "Talk tonight about Saturday", status: "tentative", state: "action", when_label: "tomorrow after 10 PM", where_label: null },
    parties: [
      { user_id: "u-me", display_name: "Me", is_viewer: true, pending: true, limbo: false, entity_tint: 1 },
      { user_id: "u-bea", display_name: "Bea", is_viewer: false, pending: false, limbo: false, entity_tint: 2 },
    ],
    plans: [
      {
        plan_id: "plan-hike", title: "Talk tonight about Saturday", status: "tentative", state: "action",
        when_label: "tomorrow after 10 PM", where_label: null,
        participants: [
          { user_id: "u-me", response_state: "pending", pending: true, limbo: false },
          { user_id: "u-bea", response_state: "accepted", pending: false, limbo: false },
        ],
      },
    ],
  } as unknown as OrbitProjectionContract;

  it("CF2-5: entry form centers the topic in the ring; once settled the topic sits OUTSIDE the small ring, in full - the ring holds the glyph only", async () => {
    vi.useFakeTimers();
    try {
      const el = await render(
        <OrbitScreen scope={groupScope} orbit={longSubjectOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
          <div />
        </OrbitScreen>,
      );
      const comp = q(el, '[data-testid="orbit-composition"]')!;
      // Entry (big) form: the topic is at the ring's center.
      expect(comp.getAttribute("data-settled")).toBeNull();
      expect(comp.contains(q(el, '[data-testid="orbit-screen-title"]'))).toBe(true);
      expect(q(el, '[data-testid="orbit-screen-title"]')?.textContent?.trim()).toBe("Talk tonight about Saturday");
      await act(async () => { vi.advanceTimersByTime(1700); });
      // Settled (compact) form: the title has LEFT the ring...
      expect(comp.getAttribute("data-settled")).toBe("true");
      const title = q(el, '[data-testid="orbit-screen-title"]')!;
      expect(title).not.toBeNull();
      expect(comp.contains(title)).toBe(false);
      expect(title.className).toContain("orbit-compact-topic");
      // ...and reads IN FULL beside it - the exact subject, no cut.
      expect(title.textContent?.trim()).toBe("Talk tonight about Saturday");
      // The small ring's center holds no topic text (glyph only).
      expect(comp.querySelector(".orbit-composition-center")?.textContent?.trim()).toBe("");
      expect(comp.querySelector(".orbit-composition-orb")).not.toBeNull();
      // Twin Test at the compact size: ring overhead present, lights on it.
      expect(qa(comp, '[data-testid="orbit-composition-light"]').length).toBeGreaterThan(0);
      // CSS contract: no clamp/ellipsis anywhere in the settled
      // header, and the settled orb is never display:none.
      const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
      expect(css).not.toContain("-webkit-line-clamp");
      expect(css).not.toContain("text-overflow: ellipsis");
      expect(css).toContain(".orbit-compact-topic");
      const orbRule = css.slice(css.indexOf('.orbit-composition[data-settled="true"] .orbit-composition-orb'));
      expect(orbRule.slice(0, orbRule.indexOf("}"))).not.toContain("display: none");
    } finally { vi.useRealTimers(); }
  });

  it("CF2-6 scheduled+move: the next row carries the time, Your move renders beneath it, and neither contradicts the other", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={longSubjectOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    const next = q(el, '[data-testid="orbit-next-together"]');
    expect(next?.textContent).toContain("tomorrow after 10 PM");
    expect(next?.textContent).not.toContain("Not scheduled yet");
    expect(next?.textContent).not.toContain("Nothing is planned");
    expect(q(el, '[data-testid="orbit-viewer-pending"]')?.textContent).toContain("waiting on your answer");
  });

  it("CF2-6 unscheduled+move (next pick exists, no time yet): the next row says Not scheduled yet - one waiting on you", async () => {
    const unscheduled = {
      ...longSubjectOrbit,
      next_plan: { plan_id: "plan-hike", title: "Talk tonight about Saturday", status: "tentative", state: "action", when_label: null, where_label: null },
      plans: longSubjectOrbit.plans.map((p) => ({ ...p, when_label: null })),
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={unscheduled} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    const next = q(el, '[data-testid="orbit-next-together"]');
    expect(next?.textContent).toContain("Not scheduled yet - one waiting on you.");
    expect(next?.textContent).not.toContain("Nothing is planned");
    expect(q(el, '[data-testid="orbit-viewer-pending"]')).not.toBeNull();
  });

  it("CF2-6 empty+move (plans present, NO next pick, viewer waiting): the row derives from the waiting plan and is its door - never 'Nothing is planned'", async () => {
    const onOpenPlan = vi.fn();
    const noPick = { ...longSubjectOrbit, next_plan: null } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={noPick} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} onOpenPlan={onOpenPlan}>
        <div />
      </OrbitScreen>,
    );
    const next = q(el, '[data-testid="orbit-next-together"]') as HTMLButtonElement;
    expect(next?.textContent).toContain("Not scheduled yet - one waiting on you.");
    expect(el.textContent).not.toContain("Nothing is planned together yet");
    expect(q(el, '[data-testid="orbit-viewer-pending"]')).not.toBeNull();
    await act(async () => { next.click(); });
    expect(onOpenPlan).toHaveBeenCalledWith("plan-hike");
  });

  it("CF2-6 empty+move via the scope fallback (projection not landed, the collapsed-light shape): still coherent", async () => {
    const scopeWithMove: OrbitScope = {
      conversationId: "conv-dyad", title: "Talk tonight about Saturday", composition: "dyad",
      party: [
        { id: "u-me", name: "Me", tint: 1, isViewer: true, pending: true, limbo: false, limboFractionRemaining: null },
        { id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null },
      ],
      personId: "u-bea", personName: "Bea", planId: "plan-hike", planTitle: "Talk tonight about Saturday",
    };
    const el = await render(
      <OrbitScreen scope={scopeWithMove} orbit={null} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Not scheduled yet - one waiting on you.");
    expect(el.textContent).not.toContain("Nothing is planned together yet");
    expect(q(el, '[data-testid="orbit-viewer-pending"]')).not.toBeNull();
  });

  it("CF2-6 empty+no-move: 'Nothing is planned together yet' stands alone - it is the only pairing that may say it", async () => {
    const quietScope: OrbitScope = {
      conversationId: "conv-q", title: "Bea", composition: "dyad",
      party: [{ id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null }],
      personId: "u-bea", personName: "Bea", planId: null, planTitle: null,
    };
    const el = await render(
      <OrbitScreen scope={quietScope} orbit={null} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    await expandWhere(el);
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Nothing is planned together yet.");
    expect(q(el, '[data-testid="orbit-viewer-pending"]')).toBeNull();
    expect(el.textContent).not.toContain("Not scheduled yet");
  });

  it("CF2-6 unscheduled, nobody waiting on the viewer: 'Not scheduled yet' without the move clause", async () => {
    const noMove = {
      ...longSubjectOrbit,
      next_plan: { plan_id: "plan-hike", title: "Talk tonight about Saturday", status: "tentative", state: "forming", when_label: null, where_label: null },
      parties: longSubjectOrbit.parties.map((p) => ({ ...p, pending: false })),
      plans: longSubjectOrbit.plans.map((p) => ({ ...p, state: "forming", when_label: null, participants: (p.participants ?? []).map((pp) => ({ ...pp, pending: false, response_state: "accepted" })) })),
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={noMove} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Not scheduled yet.");
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).not.toContain("waiting on you");
    expect(q(el, '[data-testid="orbit-viewer-pending"]')).toBeNull();
  });
});

describe("Repair #21 orbit Round 3 - O-1 traced messages, O-2 parties named in the compact header, O-3 select-and-place", () => {
  const mayaOrbit = {
    ...groupOrbit,
    subject: "Talk tonight about Saturday",
    parties: [
      { user_id: "u-me", display_name: "Me", is_viewer: true, pending: false, limbo: false, entity_tint: 1 },
      { user_id: "u-maya", display_name: "Maya Torres", is_viewer: false, pending: false, limbo: false, entity_tint: 2 },
    ],
  } as unknown as OrbitProjectionContract;

  it("O-2: the dyad party line is the founder's form - viewer first as You, then the other by name", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={mayaOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-parties"]')?.textContent?.trim()).toBe("You - Maya Torres");
  });

  it("O-2: the party line survives the settle - the compact header keeps the names in the header zone", async () => {
    vi.useFakeTimers();
    try {
      const el = await render(
        <OrbitScreen scope={groupScope} orbit={mayaOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
          <div />
        </OrbitScreen>,
      );
      await act(async () => { vi.advanceTimersByTime(1700); });
      expect(q(el, '[data-testid="orbit-composition"]')?.getAttribute("data-settled")).toBe("true");
      const parties = q(el, '[data-testid="orbit-parties"]');
      expect(parties).not.toBeNull();
      expect(parties?.textContent?.trim()).toBe("You - Maya Torres");
      // The line lives in the header, beside/under the topic - no new card.
      expect(q(el, ".orbit-screen-head")?.contains(parties!)).toBe(true);
      // CSS contract: the settled parties rule seats the line as a
      // full-width header row - it is never display:none again.
      const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
      const ruleStart = css.indexOf('.orbit-screen-head:has(.orbit-composition[data-settled="true"]) .orbit-screen-parties');
      expect(ruleStart).toBeGreaterThan(-1);
      const rule = css.slice(ruleStart, css.indexOf("}", ruleStart));
      expect(rule).toContain("flex-basis: 100%");
      expect(rule).not.toContain("display: none");
    } finally { vi.useRealTimers(); }
  });

  it("O-2: viewer-relativity - the line is built from the viewer's seat even when the projection lists the viewer second", async () => {
    const viewerSecond = {
      ...mayaOrbit,
      parties: [mayaOrbit.parties[1], mayaOrbit.parties[0]],
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={viewerSecond} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-parties"]')?.textContent?.trim()).toBe("You - Maya Torres");
  });

  it("O-2: the scope fallback (projection not landed, peers only) still leads with the viewer's seat - You is present in both derivations", async () => {
    const dyadScope: OrbitScope = {
      conversationId: "conv-dyad",
      title: "Bea",
      composition: "dyad",
      party: [
        { id: "u-bea", name: "Bea", tint: 2, isViewer: false, pending: false, limbo: false, limboFractionRemaining: null },
      ],
      personId: "u-bea",
      personName: "Bea",
      planId: null,
      planTitle: null,
    };
    const el = await render(
      <OrbitScreen scope={dyadScope} orbit={null} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-parties"]')?.textContent?.trim()).toBe("You - Bea");
  });

  it("O-2: a group names everybody - You first, then each party by name", async () => {
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    expect(q(el, '[data-testid="orbit-parties"]')?.textContent?.trim()).toBe("You - Bea - Cy - Eli");
  });

  it("O-2: a large group truncates the NAMES quietly - first three plus the count; the topic is never the truncated text", async () => {
    const many = {
      ...groupOrbit,
      parties: Array.from({ length: 15 }, (_, i) => ({
        user_id: `u-${i}`, display_name: `P${i}`, is_viewer: i === 0, pending: false, limbo: false, entity_tint: 1,
      })),
    } as unknown as OrbitProjectionContract;
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={many} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers}>
        <div />
      </OrbitScreen>,
    );
    const line = q(el, '[data-testid="orbit-parties"]')?.textContent?.trim() ?? "";
    expect(line).toBe("You - P1 - P2 +12 more");
    expect(line).not.toContain("P5");
    expect(line).not.toContain("...");
    // The topic itself still renders in full beside the line.
    expect(q(el, '[data-testid="orbit-screen-title"]')?.textContent?.trim()).toBe("Group hike");
  });

  it("O-1: the message trace is one identity treatment for every bubble in the room - fire family, masked ring, per-mode strength, static under reduced motion, no per-message or per-state variation", () => {
    const css = readFileSync(resolve(__dirname, "OrbitScreen.css"), "utf8");
    // Scoped to the room's own conversation field, both seats alike.
    const ruleStart = css.indexOf('[data-design="r18"] .orbit-field .c1-bubble::after');
    expect(ruleStart).toBeGreaterThan(-1);
    const rule = css.slice(ruleStart, css.indexOf("}", ruleStart));
    expect(rule).toContain("conic-gradient");
    expect(rule).toContain("var(--orbit-trace-angle)");
    expect(rule).toContain("mask-composite: exclude");
    expect(rule).toContain("var(--orb-fire-violet)");
    expect(rule).toContain("var(--orb-point-light)");
    expect(rule).toContain("orbit-msg-trace-travel");
    // IDENTITY, not state: the trace never derives from a state
    // token or the room's state glow, and no author/status variant
    // of it exists - a variation would claim a meaning no message has.
    expect(rule).not.toContain("var(--state-");
    expect(rule).not.toContain("var(--orbit-glow");
    expect(css).not.toContain(".c1-bubble-opal::after");
    expect(css).not.toContain("c1-bubble-own .c1-bubble::after");
    expect(css).not.toContain("data-msg-status");
    // Luminous in dark: a dedicated dark-mode rule raises it.
    const darkStart = css.indexOf(':root[data-mode="dark"] [data-design="r18"] .orbit-field .c1-bubble::after');
    expect(darkStart).toBeGreaterThan(-1);
    const darkRule = css.slice(darkStart, css.indexOf("}", darkStart));
    expect(darkRule).toContain("drop-shadow");
    // Reduced motion: the travel stops, the trace stands still.
    const rmStart = css.indexOf("@media (prefers-reduced-motion: reduce)", ruleStart);
    expect(rmStart).toBeGreaterThan(-1);
    const rmBlock = css.slice(rmStart, css.indexOf("}", rmStart));
    expect(rmBlock).toContain(".c1-bubble::after");
    expect(rmBlock).toContain("animation: none");
  });

  it("O-3: a short press selects nothing and places nothing - only the full hold selects", async () => {
    vi.useFakeTimers();
    const onPushToChat = vi.fn();
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} recommendation="Hold still" onPushToChat={onPushToChat}>
        <div data-testid="orbit-child-chat" />
      </OrbitScreen>,
    );
    const box = q(el, '[data-testid="orbit-recommendation"]') as HTMLElement;
    const fire = (type: string, x: number, y: number) =>
      box.dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
    await act(async () => { fire("pointerdown", 40, 40); });
    await act(async () => { vi.advanceTimersByTime(200); });
    await act(async () => { fire("pointerup", 40, 40); });
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(box.getAttribute("data-selected")).toBeNull();
    expect(q(el, '[data-testid="orbit-recommendation-actions"]')).toBeNull();
    expect(onPushToChat).not.toHaveBeenCalled();
  });

  it("O-3: the place label falls back honestly for a group anchor - the thread composer, never a send", async () => {
    vi.useFakeTimers();
    const el = await render(
      <OrbitScreen scope={groupScope} orbit={groupOrbit} insight={null} sessions={[]} activeSessionId={null} emptyInvite={null} {...noopHandlers} recommendation="Group words" onPushToChat={() => {}}>
        <div data-testid="orbit-child-chat" />
      </OrbitScreen>,
    );
    const box = q(el, '[data-testid="orbit-recommendation"]') as HTMLElement;
    await act(async () => {
      box.dispatchEvent(new window.MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });
    const place = q(el, '[data-testid="orbit-recommendation-place"]');
    expect(place?.textContent?.trim()).toBe("Place in the thread composer");
    expect(place?.textContent ?? "").not.toMatch(/send/i);
  });
});
