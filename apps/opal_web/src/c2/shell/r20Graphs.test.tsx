/**
 * @vitest-environment jsdom
 *
 * Repair #20 - Graphs cluster pins (founder review orders 2026-10-20):
 *  - F-11: Horizon contents and expanded Past contents render as
 *    individual purposeful plan CARDS (state color, own pill), never
 *    walls of one-line text; Past stays collapsed by default.
 *  - F-12: a plan the VIEWER declined produces NO standalone
 *    "You said you could not make it" row in any list surface - one
 *    settled summary line carries all settled outcomes; the plan's
 *    settled line remains reachable in its own detail.
 *  - F-14: the shared when-line renders start AND end for a
 *    multi-day plan on cards and the detail header; same-day format
 *    is byte-identical to before.
 *  - F-16: a plan in limbo for the viewer shows the cooling
 *    treatment + the projection's remaining-window text on its
 *    Graphs card (incl. the horizon card) and its deck card.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Graphs, C2GraphDetail, type C2GraphsEvents } from "./C2Graphs";
import { C2CenterOpening } from "./C2CenterOpening";
import {
  cardFromPlan,
  detailFromPlan,
  graphListFromPlans,
  openingFromPlans,
} from "./shellData";
import { planWhenLine } from "./density";
import type { OpalPlanContract } from "../../api/productClient";

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

const events: C2GraphsEvents = {
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

const NOW = new Date("2026-10-19T17:00:00Z");

// -------------------------------------------------------------------
// F-14 - multi-day dates through the ONE shared formatter
// -------------------------------------------------------------------

describe("F-14 planWhenLine - the shared time-range rendering", () => {
  const joshuaTree = plan({
    id: "jt",
    title: "A long weekend in Joshua Tree with the whole crew",
    status: "agreed",
    time_label: "Saturday, January 2 at 7 PM",
    start_at: "2027-01-02T19:00:00Z",
    end_at: "2027-01-04T16:00:00Z",
    timezone: "UTC",
  });

  it("multi-day: start AND end render, on the formatter, the card, and the detail header", () => {
    const expected = "Saturday, January 2 at 7 PM - Mon Jan 4";
    expect(planWhenLine(joshuaTree)).toBe(expected);
    expect(cardFromPlan(joshuaTree).whenLine).toBe(expected);
    expect(detailFromPlan(joshuaTree, "graphs").whenLine).toBe(expected);
  });

  it("multi-day with no time_label: both ends format from the record's instants", () => {
    const bare = plan({
      id: "jt2",
      status: "agreed",
      start_at: "2027-01-02T19:00:00Z",
      end_at: "2027-01-04T16:00:00Z",
      timezone: "UTC",
    });
    expect(planWhenLine(bare)).toBe("Sat Jan 2, 7 PM - Mon Jan 4");
  });

  it("same-day: the record's own label renders verbatim - format unchanged", () => {
    const dinner = plan({
      id: "d",
      status: "agreed",
      time_label: "Saturday, January 2 at 7 PM",
      start_at: "2027-01-02T19:00:00Z",
      end_at: "2027-01-02T23:00:00Z",
      timezone: "UTC",
    });
    expect(planWhenLine(dinner)).toBe("Saturday, January 2 at 7 PM");
  });

  it("no end / end not after start / no instants: label (or the unset line) as before", () => {
    expect(planWhenLine(plan({ id: "a", time_label: "Friday 8 PM" }))).toBe("Friday 8 PM");
    expect(
      planWhenLine(
        plan({
          id: "b",
          time_label: "Friday 8 PM",
          start_at: "2027-01-02T19:00:00Z",
          end_at: "2027-01-02T18:00:00Z",
        }),
      ),
    ).toBe("Friday 8 PM");
    expect(planWhenLine(plan({ id: "c" }))).toBe("Time not set yet.");
  });

  it("the end renders in the plan's own timezone, not UTC", () => {
    // Starts Sat 7 PM UTC = Sat 11 AM in Los Angeles; ends Mon
    // 04:00 UTC = Sun 8 PM in Los Angeles - a different LOCAL day
    // span than the UTC span, and the end label must be the local one.
    const p = plan({
      id: "tz",
      status: "agreed",
      start_at: "2027-01-02T19:00:00Z",
      end_at: "2027-01-04T04:00:00Z",
      timezone: "America/Los_Angeles",
    });
    expect(planWhenLine(p)).toBe("Sat Jan 2, 11 AM - Sun Jan 3");
  });
});

// -------------------------------------------------------------------
// F-12 - settled-declined noise resolves into the settled summary
// -------------------------------------------------------------------

describe("F-12 settled outcomes - one summary, no standalone rows", () => {
  const declined = plan({
    id: "fm",
    title: "Farmers market run",
    status: "tentative",
    viewer_state: "declined",
    who_label: "with Jordan",
    start_at: "2026-10-10T17:00:00Z",
    time_label: "Saturday at 10 AM",
  });
  const list = graphListFromPlans([declined], NOW);

  it("projection: the declined plan is in no group; its card rides the settled entry", () => {
    expect(list.groups.flatMap((g) => g.cards.map((c) => c.id))).not.toContain("fm");
    expect(list.settledInvitations).toHaveLength(1);
    expect(list.settledInvitations?.[0].card?.title).toBe("Farmers market run");
    expect(list.settledInvitations?.[0].card?.stateLabel).toBe("Settled");
  });

  it("render: no standalone 'You said you could not make it' row in the list or the Past lens", async () => {
    await render(<C2Graphs projection={list} events={events} />);
    expect(document.querySelectorAll('[data-testid="c2-settled-invitation-line"]').length).toBe(0);
    expect(document.body.textContent).not.toContain("You said you could not make it");
    const summary = document.querySelector('[data-testid="c2-settled-summary"]');
    expect(summary?.textContent).toContain("Settled quietly - 1 you could not make.");

    // The Past lens shows the same single summary, not the row.
    click(document.querySelector('[data-testid="c2-lens-past"]')!);
    expect(document.body.textContent).not.toContain("You said you could not make it");
    expect(document.querySelectorAll('[data-testid="c2-settled-summary"]').length).toBe(1);

    // By intent: expanding the summary reveals the plan's own card.
    click(document.querySelector('[data-testid="c2-settled-summary"]')!);
    const card = document.querySelector('[data-testid="c2-settled-card"]');
    expect(card?.textContent).toContain("Farmers market run");
    expect(card?.textContent).toContain("Settled");
    expect(document.body.textContent).not.toContain("You said you could not make it");
  });

  it("the settled line remains reachable in the plan's own detail", async () => {
    const detail = detailFromPlan(declined, "graphs");
    expect(detail.settledLine).toBe(
      "Farmers market run - settled. You said you could not make it.",
    );
    await render(<C2GraphDetail detail={detail} events={events} />);
    expect(
      document.querySelector('[data-testid="c2-detail-settled-line"]')?.textContent,
    ).toContain("You said you could not make it");
  });

  it("a live plan's detail carries no settled line", () => {
    expect(detailFromPlan(plan({ id: "live", status: "agreed" }), "graphs").settledLine).toBeNull();
  });
});

// -------------------------------------------------------------------
// F-11 - Horizon + Past as cards
// -------------------------------------------------------------------

describe("F-11 horizon and past render as individual cards", () => {
  const far = plan({
    id: "far-1",
    title: "Desert star party",
    status: "agreed",
    start_at: "2026-12-20T19:00:00Z",
    time_label: "Sunday, December 20 at 7 PM",
  });
  const past = plan({
    id: "past-1",
    title: "Morning hike",
    status: "completed",
    start_at: "2026-10-04T16:00:00Z",
    time_label: "Sunday, October 4 at 9 AM",
  });
  const list = graphListFromPlans([far, past], NOW);

  it("horizon: a real plan card with its state pill at distant presence", async () => {
    await render(<C2Graphs projection={list} events={events} />);
    const wrap = document.querySelector('[data-testid="c2-horizon-card"]');
    expect(wrap?.getAttribute("data-presence-weight")).toBe("distant");
    const card = wrap?.querySelector('[data-testid="c2-plan-card"]');
    expect(card).not.toBeNull();
    expect(card?.getAttribute("data-plan-state")).toBe("ready");
    expect(wrap?.querySelector('[data-testid="c2-plan-state-pill"]')?.textContent).toContain(
      "Ready",
    );
    expect(wrap?.textContent).toContain("Desert star party");
  });

  it("past: collapsed pill by default; expanding reveals plan cards, not text rows", async () => {
    await render(<C2Graphs projection={list} events={events} />);
    expect(document.querySelectorAll('[data-testid="c2-past-card"]').length).toBe(0);
    const pill = document.querySelector('[data-testid="c2-past-pill"]');
    expect(pill?.textContent).toContain("October 2026");
    click(pill!);
    const cards = document.querySelectorAll('[data-testid="c2-past-card"]');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('[data-testid="c2-plan-card"]')?.getAttribute("data-plan-state")).toBe(
      "past",
    );
    expect(cards[0].textContent).toContain("Morning hike");
  });
});

// -------------------------------------------------------------------
// F-16 - limbo visibility on plan surfaces
// -------------------------------------------------------------------

describe("F-16 limbo on Graphs cards and the deck card", () => {
  const limboPlan = (extra: Partial<OpalPlanContract> = {}) =>
    plan({
      id: "limbo-1",
      title: "Dinner at Juniper",
      status: "tentative",
      viewer_state: "pending",
      start_at: "2026-10-24T19:00:00Z",
      time_label: "Saturday at 7 PM",
      location: "Juniper and Ivy",
      etiquette: {
        plan_id: "limbo-1",
        viewer_role: "recipient",
        stage: "nudged",
        lifecycle_open: true,
        window: { set: true, closes_at: "2026-10-21T19:00:00Z", seconds: 172_800, available: true, unavailable_reason: null },
        limbo: {
          state: "limbo",
          treatment: "cooling",
          pattern_channel: "cooling-lines",
          window_fraction_remaining: 0.25,
          remaining_window_text: "About 12 hours left in the answer window.",
          copy: "Your answer window for Dinner at Juniper is still open. A yes or a no is plenty - either answer is a kind one.",
        },
      },
      ...extra,
    });

  it("projection: cardFromPlan carries the limbo fields from the contract", () => {
    const card = cardFromPlan(limboPlan());
    expect(card.limbo?.state).toBe("limbo");
    expect(card.limbo?.treatment).toBe("cooling");
    expect(card.limbo?.remainingWindowText).toBe("About 12 hours left in the answer window.");
  });

  it("Graphs: the card shows the cooling treatment + remaining window text", async () => {
    const list = graphListFromPlans([limboPlan()], NOW);
    await render(<C2Graphs projection={list} events={events} />);
    const strip = document.querySelector('[data-testid="c2-plan-limbo"]');
    expect(strip).not.toBeNull();
    expect(strip?.getAttribute("data-treatment")).toBe("cooling");
    expect(strip?.textContent).toContain("still open");
    expect(
      document.querySelector('[data-testid="c2-plan-limbo-window"]')?.textContent,
    ).toBe("About 12 hours left in the answer window.");
    const card = document.querySelector('[data-testid="c2-plan-card"]');
    expect(card?.getAttribute("data-limbo")).toBe("limbo");
  });

  it("Graphs horizon: a far limbo plan's horizon CARD also carries the treatment", async () => {
    const farLimbo = limboPlan({ start_at: "2026-12-24T19:00:00Z" });
    const list = graphListFromPlans([farLimbo], NOW);
    await render(<C2Graphs projection={list} events={events} />);
    const wrap = document.querySelector('[data-testid="c2-horizon-card"]');
    expect(wrap).not.toBeNull();
    expect(wrap?.querySelector('[data-testid="c2-plan-limbo"]')).not.toBeNull();
    expect(wrap?.querySelector('[data-testid="c2-plan-limbo-window"]')?.textContent).toContain(
      "12 hours",
    );
  });

  it("deck: the opening's card for a limbo plan shows cooling + window text", async () => {
    const opening = openingFromPlans([limboPlan()], "You");
    await render(
      <C2CenterOpening
        projection={opening}
        events={{
          openGraph: vi.fn(),
          makeSomethingHappen: vi.fn(),
          completeSlot: vi.fn(),
          dismissReveal: vi.fn(),
          revealAction: vi.fn(),
          requestChangeReveal: vi.fn(),
        }}
      />,
    );
    const strip = document.querySelector('[data-testid="c2-plan-limbo"]');
    expect(strip).not.toBeNull();
    expect(strip?.getAttribute("data-treatment")).toBe("cooling");
    expect(
      document.querySelector('[data-testid="c2-plan-limbo-window"]')?.textContent,
    ).toBe("About 12 hours left in the answer window.");
  });
});
