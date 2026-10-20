/**
 * @vitest-environment jsdom
 *
 * Repair #20 (F-19 + F-21a) pins.
 *
 * F-19: the orbit screen renders its ring FROM the orbit
 * projection — the group party set (every member a light), plan
 * stones in their state, a pending person's limbo cooling on their
 * light (amber arc + legend words, never hue alone) — and the
 * empty orbit invites the first question in the same language,
 * birthing no session until a question is actually asked.
 *
 * F-21a: notice routing is ONE derivation and it is exact — a fork
 * notice for conversation X lands in X's orbit, a lane notice
 * lands in its own thread's orbit, and a notice whose identity
 * cannot be trusted lands nowhere (never a generic inbox).
 *
 * Rendered with the repo convention (react-dom/client + act).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrbitProjectionContract } from "../../api/productClient";
import { OrbitScreen } from "./OrbitScreen";
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
    { user_id: "u-cy", display_name: "Cy", is_viewer: false, pending: false, limbo: false, entity_tint: 4 },
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
        { user_id: "u-cy", response_state: "accepted", pending: false, limbo: false },
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

describe("F-19 orbit screen — the ring renders from the projection", () => {
  it("group thread: EVERY party member is a light; the viewer is the center stone", async () => {
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
    const lights = qa(el, '[data-testid="orbit-person-light"]');
    // Two non-viewer members on the ring — the full group party set.
    expect(lights.map((l) => l.getAttribute("data-person-id"))).toEqual(["u-bea", "u-cy"]);
    expect(q(el, '[data-testid="orbit-center"]')).not.toBeNull();

    const stones = qa(el, '[data-testid="orbit-plan-stone"]');
    expect(stones).toHaveLength(1);
    expect(stones[0].getAttribute("data-plan-id")).toBe("plan-hike");
    expect(stones[0].getAttribute("data-state")).toBe("forming");

    // The conversation lives inside the field, under the purpose line.
    expect(q(el, '[data-testid="orbit-field"]')?.textContent).toContain("Ask about this conversation.");
    expect(q(el, '[data-testid="orbit-child-chat"]')).not.toBeNull();

    // The long arc: next together + the limbo line, in words.
    expect(q(el, '[data-testid="orbit-next-together"]')?.textContent).toContain("Group hike");
    expect(q(el, '[data-testid="orbit-limbo-line"]')?.textContent).toContain("Bea");
  });

  it("a person in limbo wears the cooling arc on their light and is named in the legend", async () => {
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

    const bea = q(el, '[data-testid="orbit-person-light"][data-person-id="u-bea"]');
    expect(bea?.getAttribute("data-state")).toBe("limbo");
    const arc = bea?.querySelector(".orbit-light-limbo-arc");
    expect(arc).not.toBeNull();
    // The remaining fraction of the window is what the arc shows.
    expect(arc?.getAttribute("stroke-dasharray")).toBe("40 100");

    const cy = q(el, '[data-testid="orbit-person-light"][data-person-id="u-cy"]');
    expect(cy?.getAttribute("data-state")).toBe("settled");
    expect(cy?.querySelector(".orbit-light-limbo-arc")).toBeNull();

    // No hue-only meaning: the legend names every light in words.
    const legendPeople = qa(el, '[data-testid="orbit-legend-person"]');
    expect(legendPeople.map((l) => l.getAttribute("data-person-id"))).toEqual(["u-bea", "u-cy"]);
    expect(legendPeople[0].textContent).toContain("Bea");
    expect(legendPeople[0].textContent?.toLowerCase()).toContain("limbo");
    const legendPlans = qa(el, '[data-testid="orbit-legend-plan"]');
    expect(legendPlans[0].textContent).toContain("Group hike");
    expect(legendPlans[0].textContent).toContain("Forming");
  });

  it("the empty orbit invites the first question — and asks only on submit", async () => {
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
    expect(q(el, '[data-testid="orbit-empty"]')?.textContent).toContain("Ask the first question");
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

  it("the past-chats index lists only this orbit's sessions", async () => {
    const rows: PersonOpalSessionRow[] = [
      {
        id: "s-group",
        title: "Hike planning",
        preview: "",
        timeLabel: "Tue",
        isActive: true,
        context: null,
        conversationScopeId: "conv-group",
      },
      {
        id: "s-other",
        title: "Someone else entirely",
        preview: "",
        timeLabel: "Mon",
        isActive: true,
        context: { personId: "u-x", personName: "X", conversationId: "conv-other" },
      },
    ];
    expect(sessionsForConversation(rows, "conv-group").map((s) => s.id)).toEqual(["s-group"]);

    const onOpenSession = vi.fn();
    const el = await render(
      <OrbitScreen
        scope={groupScope}
        orbit={groupOrbit}
        insight={null}
        sessions={sessionsForConversation(rows, "conv-group")}
        activeSessionId={null}
        emptyInvite={null}
        {...noopHandlers}
        onOpenSession={onOpenSession}
      >
        <div />
      </OrbitScreen>,
    );
    const indexRows = qa(el, '[data-testid="orbit-index-row"]');
    expect(indexRows).toHaveLength(1);
    expect(indexRows[0].getAttribute("data-session-id")).toBe("s-group");
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
