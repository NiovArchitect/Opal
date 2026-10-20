/**
 * @vitest-environment jsdom
 *
 * Repair #19 polish - Cluster H (P11) + P12 pins:
 *  - past renders PILLS, not rows, by default (DOM count under the
 *    heavy persona), expansion is by intent and shows plan cards
 *    (R20 F-11 - ledger text rows retired by founder order);
 *  - declined / expired invitations settle into ONE summary line in
 *    the viewer's own past area (R20 F-12) and are absent from
 *    actionable lists; their per-plan lines live in their details;
 *  - bucket/pin ordering: happening + needs-you ahead of later and
 *    forming; far plans rest in the horizon band as distant cards
 *    (R20 F-11);
 *  - horizon migration: a plan's presence weight class changes as
 *    its start crosses the thresholds (pinned clock);
 *  - cooling is one physics with limbo (P14): warm -> cooling ->
 *    limbo (past-grace) -> settled, never action red;
 *  - the preparation spine projects from the real completion
 *    record - states, owners, arc positions, no simulated booking.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Graphs } from "./C2Graphs";
import { graphListFromPlans } from "./shellData";
import {
  bandForStart,
  farBandMilestone,
  invitationTemperature,
  pastPillsFromEntries,
  presenceForPlan,
  spineFromPlan,
} from "./density";
import { HEAVY_PERSONA, heavyPersonaPlans, heavySubstantialPlan } from "./heavyPersona";
import type { OpalPlanContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date("2026-10-19T17:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

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
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

const events = {
  openGraph: vi.fn(),
  createPlan: vi.fn(),
  createTrip: vi.fn(),
  createIdea: vi.fn(),
  completeSlot: vi.fn(),
  dropPlan: vi.fn(async () => null),
  runNextAction: vi.fn(),
  addPeople: vi.fn(),
  openChatForPlan: vi.fn(),
  back: vi.fn(),
};

const plan = (p: Partial<OpalPlanContract> & { id: string }): OpalPlanContract =>
  ({ title: p.id, status: "tentative", ...p }) as OpalPlanContract;

describe("one bucket system - thresholds and migration (pinned clock)", () => {
  it("bands: today / week / month / far at the exact thresholds", () => {
    expect(bandForStart(at(0), NOW)).toBe("today");
    expect(bandForStart(at(1), NOW)).toBe("week");
    expect(bandForStart(at(7), NOW)).toBe("week");
    expect(bandForStart(at(8), NOW)).toBe("month");
    expect(bandForStart(at(30), NOW)).toBe("month");
    expect(bandForStart(at(31), NOW)).toBe("far");
  });

  it("migration: the same plan gains presence as now crosses its thresholds", () => {
    const p = plan({ id: "m", start_at: at(40).toISOString() });
    expect(presenceForPlan(p, NOW)?.weightClass).toBe("distant");
    expect(presenceForPlan(p, at(20))?.weightClass).toBe("quiet");
    expect(presenceForPlan(p, at(35))?.weightClass).toBe("present");
    expect(presenceForPlan(p, at(40))?.weightClass).toBe("full");
    expect(presenceForPlan(p, at(40))?.weight).toBe(1);
  });

  it("no real start, no band - a time_label string never invents one", () => {
    expect(presenceForPlan(plan({ id: "x", time_label: "Next spring" }), NOW)).toBeNull();
  });
});

describe("past as a pill", () => {
  it("month pills within a year, year pills beyond, highlights capped at three", () => {
    const entries = [
      { card: { id: "a", title: "A" } as never, date: new Date("2026-10-04T19:00:00Z") },
      { card: { id: "b", title: "B" } as never, date: new Date("2026-10-11T19:00:00Z") },
      { card: { id: "c", title: "C" } as never, date: new Date("2026-09-02T19:00:00Z") },
      { card: { id: "d", title: "D" } as never, date: new Date("2024-05-02T19:00:00Z") },
    ];
    const pills = pastPillsFromEntries(entries, NOW);
    expect(pills.map((p) => p.periodLabel)).toEqual(["October 2026", "September 2026", "2024"]);
    expect(pills[0].count).toBe(2);
    expect(pills[0].highlights).toEqual(["B", "A"]); // newest first
  });
});

describe("heavy persona - density under the fullest graph", () => {
  const plans = heavyPersonaPlans(NOW);
  const list = graphListFromPlans(plans, NOW);

  it("the persona is booked out: 100+ past, dozens of invitations, multiple circles", () => {
    expect(plans.filter((p) => p.status === "completed").length).toBeGreaterThanOrEqual(100);
    expect(plans.filter((p) => p.viewer_state === "declined").length).toBe(14);
    expect(plans.filter((p) => p.status === "expired").length).toBe(12);
    expect(plans.filter((p) => p.viewer_state === "pending").length).toBeGreaterThanOrEqual(16);
    expect(HEAVY_PERSONA.circles.length).toBeGreaterThanOrEqual(3);
  });

  it("past collapses: no past rows group; pills carry all 120 past plans", () => {
    expect(list.groups.some((g) => g.kind === "past")).toBe(false);
    const pillTotal = (list.pastPills ?? []).reduce((n, p) => n + p.count, 0);
    expect(pillTotal).toBe(120);
    expect((list.pastPills ?? []).length).toBeLessThanOrEqual(15);
    expect(list.lensCounts.past).toBe(120 + 26);
  });

  it("settled invitations: absent from every group, carried for the summary + detail only", () => {
    const groupedIds = list.groups.flatMap((g) => g.cards.map((c) => c.id));
    expect(groupedIds.some((id) => id.startsWith("heavy-declined"))).toBe(false);
    expect(groupedIds.some((id) => id.startsWith("heavy-expired"))).toBe(false);
    expect(list.settledInvitations).toHaveLength(26);
    // R20 F-12: the per-plan line is carried for the plan's DETAIL
    // (and only there); the list renders one summary line instead -
    // the DOM half of that claim is pinned in the budget test below.
    expect(list.settledInvitations?.find((s) => s.id === "heavy-declined-0")?.line).toContain(
      "settled",
    );
    expect(list.settledInvitations?.find((s) => s.id === "heavy-expired-0")?.kind).toBe("expired");
    // Each settled entry carries the plan's own card for intent
    // expansion - past family, "Settled" label.
    const settledCard = list.settledInvitations?.find((s) => s.id === "heavy-declined-0")?.card;
    expect(settledCard?.stateFamily).toBe("past");
    expect(settledCard?.stateLabel).toBe("Settled");
  });

  it("far plans rest in the horizon band, not in Coming up", () => {
    const horizon = list.groups.find((g) => g.kind === "horizon");
    const comingUp = list.groups.find((g) => g.id === "coming-up");
    expect(horizon?.cards.map((c) => c.id)).toContain("heavy-far-joshua-tree");
    expect(horizon?.cards.map((c) => c.id)).toContain("heavy-far-birthday");
    expect(comingUp?.cards.map((c) => c.id)).not.toContain("heavy-far-joshua-tree");
    expect(comingUp?.cards.map((c) => c.id)).toContain("heavy-happening");
    expect(horizon?.cards[0].presence?.weightClass).toBe("distant");
  });

  it("ordering: needs-you and happening ahead of forming and the horizon", () => {
    const withAction = graphListFromPlans(
      [
        plan({
          id: "f1",
          status: "tentative",
          start_at: at(5).toISOString(),
          time_label: "Saturday 7 PM",
          location: "The pier",
        }),
        plan({ id: "a1", status: "needs-action", start_at: at(2).toISOString() }),
        plan({ id: "h1", status: "live", start_at: at(0).toISOString() }),
        plan({ id: "far1", status: "agreed", start_at: at(60).toISOString() }),
      ],
      NOW,
    );
    expect(withAction.groups.map((g) => g.id)).toEqual([
      "action-group",
      "coming-up",
      "someday",
      "horizon",
    ]);
  });

  it("DOM budget: pills render, past cards do not - until a pill is expanded by intent", async () => {
    await render(<C2Graphs projection={list} events={events} />);
    const pills = document.querySelectorAll('[data-testid="c2-past-pill"]');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills.length).toBeLessThanOrEqual(15);
    expect(document.querySelectorAll('[data-testid="c2-past-card"]').length).toBe(0);
    // R20 F-12: NO standalone settled rows anywhere in the list -
    // one quiet summary line carries all 26 settled outcomes.
    expect(document.querySelectorAll('[data-testid="c2-settled-invitation-line"]').length).toBe(0);
    expect(document.body.textContent).not.toContain("You said you could not make it");
    const summary = document.querySelector('[data-testid="c2-settled-summary"]');
    expect(summary?.textContent).toContain("Settled quietly");
    expect(summary?.textContent).toContain("14 you could not make");
    expect(summary?.textContent).toContain("12 that passed without an answer");
    // R20 F-11: horizon renders individual cards at distant presence,
    // not one-line text rows.
    expect(document.querySelectorAll('[data-testid="c2-horizon-card"]').length).toBe(2);
    expect(
      document
        .querySelector('[data-testid="c2-horizon-card"]')
        ?.getAttribute("data-presence-weight"),
    ).toBe("distant");
    // Expand the newest pill: only that period's plan CARDS appear.
    const first = pills[0] as HTMLElement;
    const periodCount = Number(first.textContent?.match(/- (\d+) plan/)?.[1] ?? 0);
    click(first);
    const cards = document.querySelectorAll('[data-testid="c2-past-card"]');
    expect(cards.length).toBe(periodCount);
    expect(cards.length).toBeLessThanOrEqual(10);
    // Each expanded card is a real plan card with its state pill.
    expect(cards[0].querySelector('[data-testid="c2-plan-card"]')).not.toBeNull();
    expect(cards[0].querySelector('[data-testid="c2-plan-state-pill"]')).not.toBeNull();
  });
});

describe("cooling is one physics with limbo (P14 coordination)", () => {
  const inv = (days: number, extra: Partial<OpalPlanContract> = {}) =>
    plan({ id: "inv", viewer_state: "pending", start_at: at(days).toISOString(), ...extra });
  it("warm -> cooling -> limbo -> settled along one invitation's life", () => {
    expect(invitationTemperature(inv(20), NOW)).toBe("warm");
    expect(invitationTemperature(inv(3), NOW)).toBe("cooling");
    expect(invitationTemperature(inv(-1), NOW)).toBe("limbo");
    expect(invitationTemperature(inv(3, { viewer_state: "declined" }), NOW)).toBe("settled");
    expect(invitationTemperature(inv(3, { status: "expired" }), NOW)).toBe("settled");
  });
  it("the settled end-state is the same line the settle derivation writes", () => {
    const list = graphListFromPlans([inv(-1, { title: "Old invite" })], NOW);
    // Still pending past its start = limbo: it has NOT settled yet,
    // so it stays an individual card - limbo is a segment, not a bin.
    expect(list.settledInvitations).toHaveLength(0);
  });
});

describe("horizon milestone rule (web mirror of the Reveal gate)", () => {
  it("a far ready plan is quiet; a far plan needing the viewer is a milestone", () => {
    expect(
      farBandMilestone(plan({ id: "r", status: "agreed", start_at: at(60).toISOString() }), NOW),
    ).toBe(false);
    expect(
      farBandMilestone(
        plan({ id: "p", status: "tentative", viewer_state: "pending", start_at: at(60).toISOString() }),
        NOW,
      ),
    ).toBe(true);
    // Near plans are outside the rule entirely.
    expect(
      farBandMilestone(plan({ id: "n", status: "agreed", start_at: at(3).toISOString() }), NOW),
    ).toBe(true);
  });
});

describe("preparation spine (P12)", () => {
  it("projects intent -> preparation -> event -> settling from the real completion record", () => {
    const spine = spineFromPlan({ plan: heavySubstantialPlan(NOW) });
    expect(spine.map((i) => i.phase)).toEqual([
      "intent",
      "preparation",
      "preparation",
      "preparation",
      "preparation",
      "preparation",
      "event",
      "settling",
    ]);
    const calendar = spine.find((i) => i.id === "step-calendar")!;
    expect(calendar.state).toBe("done");
    expect(calendar.owner).toBe("opal");
    const ride = spine.find((i) => i.id === "step-ride")!;
    // A ride is never a simulated completion: it waits, and it is yours.
    expect(ride.state).not.toBe("done");
    expect(ride.owner).toBe("you");
    expect(spine[spine.length - 1].arcPosition).toBe(1);
    expect(spine.map((i) => i.arcPosition)).toEqual(
      [...spine.map((i) => i.arcPosition)].sort((a, b) => a - b),
    );
  });

  it("a plan with no completion record carries only intent, event, and settling - nothing invented", () => {
    const spine = spineFromPlan({ plan: plan({ id: "bare", status: "agreed" }) });
    expect(spine.map((i) => i.id)).toEqual(["intent", "event", "settling"]);
  });
});
