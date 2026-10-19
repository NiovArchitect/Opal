/**
 * @vitest-environment jsdom
 *
 * Repair #19 W7 - Graphs as futures + the living graph detail.
 *
 * Pins: the future thread renders a state node per plan; the Past
 * lens is a named Completed-and-past view; private graphs never
 * render in the default list, the Private area stays shut on a
 * wrong code (verified by the handler, i.e. the server) and opens
 * on the right one; the detail's Who rows render the finished
 * location line verbatim - a not-sharing joiner carries NO distance.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Graphs, C2GraphDetail } from "./C2Graphs";
import { graphListFromPlans, detailWithHistory, detailFromPlan } from "./shellData";
import type { GraphDetailProjection, GraphListProjection } from "./projections";
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
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
function setInput(el: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

const card = (id: string, stateFamily: string, title: string) => ({
  id,
  stateFamily,
  stateLabel: stateFamily,
  title,
  whenLine: "Saturday 7 PM",
  whereLine: "Juniper & Ivy",
  attendanceLine: "2 of 2 going",
  primaryActionLabel: null,
});

function projection(): GraphListProjection {
  return {
    groups: [
      { id: "g1", kind: "coming-up", title: "Coming up", cards: [card("p-ready", "ready", "Dinner at Juniper")] },
      { id: "g2", kind: "needs-detail", title: "Needs a day or a detail", cards: [{ ...card("p-form", "forming", "Beach day"), completionAction: { label: "Pick a day", slotKind: "time" } }] },
      { id: "g3", kind: "past", title: "Past", cards: [card("p-past", "past", "Last week's hike")] },
    ],
    privateCards: [{ ...card("p-secret", "ready", "Secret anniversary plan"), isPrivate: true as const }],
    lensCounts: { all: 3, action: 1, ready: 1, past: 1 },
    timelineAvailable: true,
  };
}

const baseEvents = {
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

describe("R19 graphs as futures", () => {
  it("renders the future thread with a state node per plan", async () => {
    await render(<C2Graphs projection={projection()} events={baseEvents} />);
    const threads = document.querySelectorAll('[data-testid="c2-graphs-thread"]');
    expect(threads.length).toBeGreaterThan(0);
    const states = Array.from(document.querySelectorAll(".c2s-thread-node")).map((n) =>
      n.getAttribute("data-plan-state"),
    );
    expect(states).toContain("ready");
    expect(states).toContain("forming");
  });

  it("Past lens is the named Completed and past view with real past records only", async () => {
    await render(<C2Graphs projection={projection()} events={baseEvents} />);
    click(document.querySelector('[data-testid="c2-lens-past"]')!);
    await flush();
    expect(document.querySelector('[data-testid="c2-graphs-past-view"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Completed and past plans");
    expect(document.body.textContent).toContain("Last week's hike");
    expect(document.body.textContent).not.toContain("Dinner at Juniper");
  });

  it("private graphs never render in the default list or any lens", async () => {
    await render(<C2Graphs projection={projection()} events={baseEvents} />);
    expect(document.body.textContent).not.toContain("Secret anniversary plan");
    click(document.querySelector('[data-testid="c2-lens-past"]')!);
    await flush();
    expect(document.body.textContent).not.toContain("Secret anniversary plan");
    click(document.querySelector('[data-testid="c2-lens-all"]')!);
    await flush();
    expect(document.body.textContent).not.toContain("Secret anniversary plan");
  });
});

describe("R19 private gate", () => {
  const gateEvents = (unlockOk: boolean) => ({
    ...baseEvents,
    setPlanPrivate: vi.fn(async () => undefined),
    graphLockPasscodeSet: true,
    unlockPrivate: vi.fn(async (code: string) => unlockOk && code === "2468"),
    setPrivatePasscode: vi.fn(async () => true),
  });

  it("wrong code does not open the Private area; the right code does", async () => {
    const events = gateEvents(true);
    await render(<C2Graphs projection={projection()} events={events} />);
    expect(document.querySelector('[data-testid="c2-graphs-private"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain("Secret anniversary plan");

    const input = document.querySelector('[data-testid="c2-private-code"]') as HTMLInputElement;
    setInput(input, "0000");
    click(document.querySelector('[data-testid="c2-private-unlock"]')!);
    await flush();
    expect(events.unlockPrivate).toHaveBeenCalledWith("0000");
    expect(document.querySelector('[data-testid="c2-private-error"]')?.textContent).toContain(
      "did not open",
    );
    expect(document.body.textContent).not.toContain("Secret anniversary plan");

    setInput(input, "2468");
    click(document.querySelector('[data-testid="c2-private-unlock"]')!);
    await flush();
    expect(document.body.textContent).toContain("Secret anniversary plan");

    // Relock hides them again.
    click(document.querySelector('[data-testid="c2-private-lock"]')!);
    await flush();
    expect(document.body.textContent).not.toContain("Secret anniversary plan");
  });

  it("with no passcode set, the gate sets one through the server handler", async () => {
    const events = {
      ...baseEvents,
      setPlanPrivate: vi.fn(async () => undefined),
      graphLockPasscodeSet: false,
      unlockPrivate: vi.fn(async () => false),
      setPrivatePasscode: vi.fn(async () => true),
    };
    await render(<C2Graphs projection={projection()} events={events} />);
    const input = document.querySelector('[data-testid="c2-private-code"]') as HTMLInputElement;
    setInput(input, "newcode1");
    click(document.querySelector('[data-testid="c2-private-unlock"]')!);
    await flush();
    expect(events.setPrivatePasscode).toHaveBeenCalledWith("newcode1");
    expect(events.unlockPrivate).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Secret anniversary plan");
  });

  it("Make private / Make visible run the real handler with the flag", async () => {
    const events = gateEvents(true);
    await render(<C2Graphs projection={projection()} events={events} />);
    click(document.querySelector('[data-testid="c2-graph-make-private"]')!);
    await flush();
    expect(events.setPlanPrivate).toHaveBeenCalledWith("p-ready", true);

    const input = document.querySelector('[data-testid="c2-private-code"]') as HTMLInputElement;
    setInput(input, "2468");
    click(document.querySelector('[data-testid="c2-private-unlock"]')!);
    await flush();
    click(document.querySelector('[data-testid="c2-graph-make-visible"]')!);
    await flush();
    expect(events.setPlanPrivate).toHaveBeenCalledWith("p-secret", false);
  });

  it("without lock handlers the Private area does not render at all", async () => {
    await render(<C2Graphs projection={projection()} events={baseEvents} />);
    expect(document.querySelector('[data-testid="c2-graphs-private"]')).toBeNull();
  });
});

describe("R19 living detail", () => {
  const detail = (): GraphDetailProjection => ({
    id: "p-ready",
    title: "Dinner at Juniper",
    card: card("p-ready", "ready", "Dinner at Juniper"),
    whenLine: "Saturday 7 PM",
    where: { label: "Juniper & Ivy", kind: "place", handoffLabel: null },
    who: [
      {
        name: "Maya",
        avatar: { initials: "M", tint: 1 },
        responseLabel: "Going",
        locationLabel: "Not sharing location",
        locationState: "not_sharing",
      },
      {
        name: "Jordan",
        avatar: { initials: "J", tint: 2 },
        responseLabel: "Going",
        locationLabel: "Sharing location - 1.9 mi away from the place (measured from the location they shared for this plan)",
        locationState: "sharing",
      },
    ],
    activity: [],
    history: [],
    origin: "graphs",
  });

  it("who rows show attendance + honest location lines; not-sharing carries no distance", async () => {
    await render(<C2GraphDetail detail={detail()} events={baseEvents} />);
    const locs = Array.from(document.querySelectorAll('[data-testid="c2-detail-who-location"]')).map(
      (n) => n.textContent ?? "",
    );
    expect(locs.some((t) => t.includes("Not sharing location"))).toBe(true);
    expect(locs.some((t) => t.includes("1.9 mi away"))).toBe(true);
    const mayaRow = locs.find((t) => t.includes("Not sharing"))!;
    expect(mayaRow).not.toMatch(/mi away|km away/);
    expect(document.body.textContent).toContain("Who is coming, and where they are");
  });

  it("share control renders only with a handler and shows the returned line", async () => {
    const events = {
      ...baseEvents,
      shareMyLocation: vi.fn(async () => "You shared where you are now for this plan. It's a one-time snapshot, not live tracking — it stays shared until you stop it or 4 hours pass."),
      stopMyLocation: vi.fn(async () => "Stopped."),
    };
    await render(<C2GraphDetail detail={detail()} events={events} />);
    click(document.querySelector('[data-testid="c2-detail-share-location-btn"]')!);
    await flush();
    expect(events.shareMyLocation).toHaveBeenCalledWith("p-ready");
    expect(document.querySelector('[data-testid="c2-detail-share-note"]')?.textContent).toContain(
      "4 hours",
    );
  });
});

describe("R19 adapter separation", () => {
  const plan = (id: string, extra: Partial<OpalPlanContract>): OpalPlanContract => ({
    id,
    title: id,
    status: "agreed",
    time_label: "Saturday 7 PM",
    location: "Juniper & Ivy",
    ...extra,
  });

  it("graphListFromPlans keeps private plans out of groups and counts", () => {
    const list = graphListFromPlans([
      plan("a", {}),
      plan("b", { is_private: true }),
      plan("c", { status: "completed" }),
    ]);
    const groupedIds = list.groups.flatMap((g) => g.cards.map((c) => c.id));
    expect(groupedIds).toContain("a");
    expect(groupedIds).not.toContain("b");
    expect(list.privateCards.map((c) => c.id)).toEqual(["b"]);
    expect(list.lensCounts.all).toBe(2);
    expect(list.lensCounts.past).toBe(1);
  });

  it("detailWithHistory maps finished location lines verbatim, never inventing one", () => {
    const base = detailFromPlan(plan("a", {}), "graphs");
    const merged = detailWithHistory(base, {
      plan_id: "a",
      history: [],
      counts: {},
      who: [
        {
          user_id: "u1",
          name: "Maya",
          role: "participant",
          response_state: "accepted",
          response_label: "Going",
          location_state: "not_sharing",
          location_label: "Not sharing location",
          distance_label: null,
          distance_basis: null,
        },
      ],
    });
    expect(merged.who[0].locationLabel).toBe("Not sharing location");
    expect(merged.who[0].locationState).toBe("not_sharing");
  });
});
