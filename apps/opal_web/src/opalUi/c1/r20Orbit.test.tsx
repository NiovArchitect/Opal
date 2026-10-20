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
 * - PUSH TO CHAT: Opal's draft renders in a recommendation box
 *   (not a bubble); long-press raises its menu; the carry action
 *   is labeled "Push to chat"; the push path uses no clipboard
 *   API and sends no message; the thread landing places the words
 *   in the thread composer, unsent.
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
import { PeopleCallsList, ThreadShell, type PeopleCallSummary } from "./C1Surfaces";
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

afterEach(async () => {
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
    expect(el.querySelector("svg")).toBeNull();
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
    // The conversation lives in the field, under the bidirectional purpose line.
    expect(q(el, '[data-testid="orbit-field"]')?.textContent).toContain(
      "tell Opal where you're coming from",
    );
    expect(q(el, '[data-testid="orbit-child-chat"]')).not.toBeNull();
    // One-tap return to the thread is intact.
    expect(q(el, '[data-testid="orbit-back-to-thread"]')).not.toBeNull();
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
    expect(q(el, '[data-testid="orbit-where-card"]')).not.toBeNull();
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Group hike");
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

  it("the empty orbit is a promise: the teaching line plus the first-question invitation", async () => {
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
    expect(q(el, '[data-testid="orbit-empty-teaching"]')?.textContent).toContain(
      "keeps what this conversation becomes",
    );
    expect(q(el, '[data-testid="orbit-empty"]')?.textContent).toContain("Ask the first question");
    expect(q(el, '[data-testid="orbit-empty"]')?.textContent).toContain(
      "tell Opal where you're coming from",
    );
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

  it("past Opal chats collapse into period pills; rows appear only when a pill opens", async () => {
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
    const pills = qa(el, '[data-testid="orbit-period-pill"]');
    expect(pills.map((p) => p.getAttribute("data-period"))).toEqual(["this-week", "earlier"]);
    // Collapsed: no session rows are painted until intent.
    expect(qa(el, '[data-testid="orbit-index-row"]')).toHaveLength(0);
    await act(async () => {
      (pills[0] as HTMLButtonElement).click();
    });
    const indexRows = qa(el, '[data-testid="orbit-index-row"]');
    expect(indexRows).toHaveLength(1);
    expect(indexRows[0].getAttribute("data-session-id")).toBe("s-recent");
    await act(async () => {
      (indexRows[0] as HTMLButtonElement).click();
    });
    expect(onOpenSession).toHaveBeenCalledWith("s-recent");
  });
});

describe("F-19 v2 push to chat - the Voice Law mechanic", () => {
  it("the draft renders in its own recommendation box; long-press raises the menu; Push to chat carries the words", async () => {
    vi.useFakeTimers();
    const onPushToChat = vi.fn();
    const onShapeRequest = vi.fn();
    const el = await render(
      <OrbitScreen
        scope={groupScope}
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
    // No menu until the long-press lands.
    expect(q(el, '[data-testid="orbit-recommendation-menu"]')).toBeNull();
    await act(async () => {
      box.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(q(el, '[data-testid="orbit-recommendation-menu"]')).not.toBeNull();
    const push = q(el, '[data-testid="orbit-recommendation-push"]') as HTMLButtonElement;
    // The carry action is labeled Push to chat - never copy.
    expect(push?.textContent?.trim()).toBe("Push to chat");
    await act(async () => {
      push.click();
    });
    expect(onPushToChat).toHaveBeenCalledWith(
      "Saturday works for me - see you at the trailhead at 9.",
    );
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
    await act(async () => {
      box.dispatchEvent(new window.MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      (q(el, '[data-testid="orbit-recommendation-push"]') as HTMLButtonElement).click();
    });
    expect(onPushToChat).toHaveBeenCalledWith("edited words");
  });

  it("PIN: the push-to-chat source path contains no clipboard API and no thread send", () => {
    const orbitSrc = readFileSync(
      resolve(__dirname, "OrbitScreen.tsx"),
      "utf8",
    );
    expect(orbitSrc).not.toContain("navigator.clipboard");
    expect(orbitSrc).not.toContain("execCommand");
    expect(orbitSrc).not.toContain("writeText");
    // OrbitScreen has no send prop or send call anywhere: pushing
    // carries words into a composer, it never sends them.
    expect(orbitSrc).not.toMatch(/onSend/);
    expect(orbitSrc).not.toMatch(/sendMessage/);
  });

  it("the thread landing places pushed words in the composer, unsent and unmarked", async () => {
    const onSend = vi.fn();
    const el = await render(
      <ThreadShell
        name="Bea"
        initials="B"
        messages={[]}
        plansById={new Map()}
        composerPlaceholder="Message Bea"
        initialDraft="Saturday works for me - see you at 9."
        onSend={onSend}
      />,
    );
    const input = q(el, '[data-testid="thread-composer-input"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("Saturday works for me - see you at 9.");
    // Placed, not sent; and nothing in the thread marks the help.
    expect(onSend).not.toHaveBeenCalled();
    expect(el.textContent).not.toContain("Opal helped");
    expect(el.textContent).not.toContain("draft from Opal");
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
