/**
 * @vitest-environment jsdom
 *
 * Repair #22 - WS-5 PLACE ENERGY pins (jsdom layer; the rendered
 * layer is the signature-gated capture set in
 * shots/repair22/places).
 *
 *  PE-1 the computation is truthful: energy, level and family
 *       derive ONLY from the place's own qualifying records
 *       (live rooms, plans in the NextPlan indicator mirror,
 *       visibility-gated moments). NO FAKE HEAT: a place with no
 *       record produces no stone; nothing is hardcoded per place.
 *  PE-2 memory cannot ignite: moments + settled plans cap at 3,
 *       so a place carried only by its past reaches lit at most.
 *  PE-3 exclusions: virtual plans never group (their location is
 *       not a place); a location-less plan contributes nothing.
 *  PE-4 the door out: the start seed composes through the flows2
 *       machinery - a current plan seeds my-people, a settled
 *       plan seeds again (party read at door time), a moment
 *       seeds my-people, a live-only place carries NO seed
 *       (declared D-P4) and renders no start door.
 *  PE-5 the surface: stones render the builder's finished lines
 *       with their level and family stamped; tapping a stone is
 *       a door only when the shell wires the place view; the
 *       place view groups now / coming / memory and its plan
 *       rows open the real graph detail.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { C2Home, type C2HomeEvents } from "./C2Home";
import { PlaceStoneView } from "./PlaceStone";
import {
  livePlaceInputsFromRooms,
  placePlanFamily,
  placeStonesFromGraph,
  type PlaceLiveInput,
  type PlaceMomentInput,
} from "./shellData";
import type { HomeProjection, PlaceStoneProjection } from "./projections";
import type { OpalPlanContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date("2026-10-21T17:00:00.000Z");
const iso = (d: Date) => d.toISOString();
const mins = (n: number) => new Date(NOW.getTime() + n * 60_000);

function plan(partial: Partial<OpalPlanContract>): OpalPlanContract {
  return {
    id: "p-x",
    title: "A plan",
    status: "tentative",
    location: "Somewhere",
    plan_type: "in_person",
    online: false,
    viewer_state: "accepted",
    time_label: "Soon",
    ...partial,
  } as OpalPlanContract;
}

function moment(partial: Partial<PlaceMomentInput>): PlaceMomentInput {
  return {
    id: "m-x",
    placeLabel: "Somewhere",
    caption: "A moment",
    authorName: "Maya Torres",
    authorUserId: "u-maya",
    mine: false,
    ...partial,
  };
}

function live(partial: Partial<PlaceLiveInput>): PlaceLiveInput {
  return {
    liveId: "l-x",
    placeLabel: "Somewhere",
    title: "Live at Somewhere",
    hostName: "Maya Torres",
    ...partial,
  };
}

const empty = { plans: [], moments: [], lives: [], now: NOW };

describe("placePlanFamily - the NextPlan indicator mirror", () => {
  it("an agreed plan inside its window is happening (live window beats every other leg)", () => {
    const p = plan({
      status: "agreed",
      viewer_state: "pending",
      start_at: iso(mins(-45)),
      end_at: iso(mins(105)),
    });
    expect(placePlanFamily(p, NOW)).toBe("happening");
  });

  it("with no end_at the window is 180 minutes from the start, then the status legs resume", () => {
    const inside = plan({ status: "agreed", start_at: iso(mins(-60)), end_at: null });
    expect(placePlanFamily(inside, NOW)).toBe("happening");
    const outside = plan({ status: "agreed", start_at: iso(mins(-240)), end_at: null });
    expect(placePlanFamily(outside, NOW)).toBe("ready");
  });

  it("a pending viewer answer is action, ahead of the agreed ready leg", () => {
    const p = plan({ status: "agreed", viewer_state: "pending", start_at: iso(mins(3 * 24 * 60)) });
    expect(placePlanFamily(p, NOW)).toBe("action");
  });

  it("agreed ahead of time is ready; tentative without a pending answer is forming; completed is past", () => {
    expect(
      placePlanFamily(plan({ status: "agreed", start_at: iso(mins(3 * 24 * 60)) }), NOW),
    ).toBe("ready");
    expect(
      placePlanFamily(plan({ status: "tentative", start_at: iso(mins(24 * 60)) }), NOW),
    ).toBe("forming");
    expect(placePlanFamily(plan({ status: "completed" }), NOW)).toBe("past");
  });
});

describe("placeStonesFromGraph - the energy computation (PE-1..PE-4)", () => {
  it("PE-1: no records, no stone - there is no baseline glow", () => {
    expect(placeStonesFromGraph(empty)).toEqual([]);
    const stones = placeStonesFromGraph({
      ...empty,
      plans: [plan({ location: null })],
      moments: [moment({ placeLabel: null })],
    });
    expect(stones).toEqual([]);
  });

  it("PE-1: a happening plan gives its place happening family at ember (score 2)", () => {
    const stones = placeStonesFromGraph({
      ...empty,
      plans: [
        plan({
          id: "p-market",
          title: "Farmers market run",
          location: "Oceanside Farmers Market",
          status: "agreed",
          start_at: iso(mins(-45)),
          end_at: iso(mins(105)),
        }),
      ],
    });
    expect(stones).toHaveLength(1);
    expect(stones[0].name).toBe("Oceanside Farmers Market");
    expect(stones[0].energyFamily).toBe("happening");
    expect(stones[0].energyScore).toBe(2);
    expect(stones[0].energyLevel).toBe("ember");
    expect(stones[0].energyLine).toBe("Happening here now.");
    expect(stones[0].happeningPlans[0].title).toBe("Farmers market run");
  });

  it("PE-1: live + happening + memory reach radiant, strongest first in stream order", () => {
    const stones = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-ride",
          title: "Saturday ride to Oceanside",
          location: "Oceanside Pier",
          status: "completed",
          start_at: iso(mins(-8 * 24 * 60)),
        }),
        plan({
          id: "p-market",
          title: "Farmers market run",
          location: "Oceanside Farmers Market",
          status: "agreed",
          start_at: iso(mins(-45)),
          end_at: iso(mins(105)),
        }),
      ],
      lives: [live({ liveId: "l-pier", placeLabel: "Oceanside Pier" })],
      moments: [
        moment({ id: "m-1", placeLabel: "Oceanside Pier", caption: "Golden hour" }),
        moment({ id: "m-2", placeLabel: "Oceanside Pier", caption: "Pier coffee" }),
      ],
      now: NOW,
    });
    expect(stones.map((s) => s.name)).toEqual(["Oceanside Pier", "Oceanside Farmers Market"]);
    const pier = stones[0];
    // 3 (live) + capped memory 3 (2 moments + 1 settled plan) = 6.
    expect(pier.energyScore).toBe(6);
    expect(pier.energyLevel).toBe("radiant");
    expect(pier.energyFamily).toBe("happening");
    expect(pier.livesHere).toHaveLength(1);
    expect(pier.momentsHere).toHaveLength(2);
    expect(pier.memoryPlans).toHaveLength(1);
  });

  it("PE-2: memory cannot ignite - a place carried only by its past caps at lit, family past", () => {
    const plans = Array.from({ length: 6 }, (_, i) =>
      plan({ id: `p-past-${i}`, status: "completed", location: "Tamarack Beach, Carlsbad" }),
    );
    const moments = Array.from({ length: 4 }, (_, i) =>
      moment({ id: `m-past-${i}`, placeLabel: "Tamarack Beach, Carlsbad" }),
    );
    const stones = placeStonesFromGraph({ ...empty, plans, moments });
    expect(stones).toHaveLength(1);
    expect(stones[0].energyScore).toBe(3);
    expect(stones[0].energyLevel).toBe("lit");
    expect(stones[0].energyFamily).toBe("past");
  });

  it("PE-1: an action place wears action (red is spent only on a real unanswered invitation)", () => {
    const stones = placeStonesFromGraph({
      ...empty,
      plans: [
        plan({
          id: "p-rooftop",
          title: "Rooftop drinks at The Brick Hotel",
          location: "The Brick Hotel, Oceanside",
          status: "tentative",
          viewer_state: "pending",
          start_at: iso(mins(3 * 24 * 60)),
        }),
      ],
    });
    expect(stones[0].energyFamily).toBe("action");
    expect(stones[0].energyLine).toBe("A plan here is waiting on you.");
    expect(stones[0].comingPlans[0].stateFamily).toBe("action");
  });

  it("PE-3: virtual plans never group, and grouping normalizes the records' own strings", () => {
    const stones = placeStonesFromGraph({
      plans: [
        plan({ id: "p-v", location: "Oceanside Pier", plan_type: "virtual", online: true }),
        plan({ id: "p-a", location: "  Oceanside   Pier ", status: "completed" }),
      ],
      moments: [moment({ id: "m-a", placeLabel: "oceanside pier" })],
      lives: [],
      now: NOW,
    });
    expect(stones).toHaveLength(1);
    expect(stones[0].name).toBe("Oceanside Pier");
    expect(stones[0].memoryPlans).toHaveLength(1);
    expect(stones[0].momentsHere).toHaveLength(1);
  });

  it("PE-4: the start seed follows the strongest lawful source", () => {
    const [withPlan] = placeStonesFromGraph({
      ...empty,
      plans: [
        plan({
          id: "p-brunch",
          title: "Sunday brunch at Herb & Wood",
          location: "Herb & Wood, Little Italy",
          status: "agreed",
          start_at: iso(mins(4 * 24 * 60)),
        }),
      ],
    });
    expect(withPlan.startSeed?.branch).toBe("my-people");
    expect(withPlan.startSeed?.sourcePlanId).toBe("p-brunch");
    expect(withPlan.startSeed?.location).toBe("Herb & Wood, Little Italy");

    const [pastOnly] = placeStonesFromGraph({
      ...empty,
      plans: [plan({ id: "p-old", location: "Moonlight Beach, Encinitas", status: "completed" })],
    });
    expect(pastOnly.startSeed?.branch).toBe("again");
    expect(pastOnly.startSeed?.needsPartyRead).toBe(true);

    const [momentOnly] = placeStonesFromGraph({
      ...empty,
      moments: [moment({ id: "m-only", placeLabel: "Moonlight Beach, Encinitas" })],
    });
    expect(momentOnly.startSeed?.branch).toBe("my-people");
    expect(momentOnly.startSeed?.inspiredByMomentId).toBe("m-only");
    expect(momentOnly.startSeed?.location).toBe("Moonlight Beach, Encinitas");

    const [liveOnly] = placeStonesFromGraph({
      ...empty,
      lives: [live({ placeLabel: "Moonlight Beach, Encinitas" })],
    });
    expect(liveOnly.startSeed).toBeNull();
  });
});

describe("livePlaceInputsFromRooms - the lives gate", () => {
  it("only live rooms with a real place contribute; the venue name is the fallback", () => {
    const inputs = livePlaceInputsFromRooms([
      { id: "l-1", status: "live", place_label: "Oceanside Pier", host_display_name: "Maya Torres" },
      { id: "l-2", status: "ended", place_label: "Oceanside Pier" },
      { id: "l-3", status: "live" },
      { live_room: { id: "l-4", status: "live", venue: { display_name: "The Brick Hotel, Oceanside" } } },
    ]);
    expect(inputs.map((i) => i.liveId)).toEqual(["l-1", "l-4"]);
    expect(inputs[0].placeLabel).toBe("Oceanside Pier");
    expect(inputs[0].hostName).toBe("Maya Torres");
    expect(inputs[1].placeLabel).toBe("The Brick Hotel, Oceanside");
  });
});

/* ------------------------- the surface ------------------------- */

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

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

function avatarOf(name: string) {
  return {
    initials: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    tint: null,
  };
}

function homeProjection(places: PlaceStoneProjection[]): HomeProjection {
  return {
    header: { ownAvatar: avatarOf("Ethan Walker") },
    rail: {
      self: { avatar: avatarOf("Ethan Walker"), hasLiveStory: false, story: null },
      stories: [],
      capabilities: { canPost: true, canStory: true },
    },
    feed: [],
    places,
  };
}

function baseEvents(extra: Partial<C2HomeEvents>): C2HomeEvents {
  return {
    openYou: () => {},
    openSearch: () => {},
    openActivity: () => {},
    openGraph: () => {},
    onShared: () => {},
    ...extra,
  };
}

describe("the place stone in Flows (PE-5)", () => {
  it("renders the builder's finished lines with level and family stamped, in builder order", async () => {
    const places = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-market",
          title: "Farmers market run",
          location: "Oceanside Farmers Market",
          status: "agreed",
          start_at: iso(mins(-45)),
          end_at: iso(mins(105)),
        }),
      ],
      lives: [live({ liveId: "l-pier", placeLabel: "Oceanside Pier" })],
      moments: [moment({ id: "m-1", placeLabel: "Oceanside Pier" })],
      now: NOW,
    });
    const el = await render(
      <C2Home projection={homeProjection(places)} events={baseEvents({ openPlace: () => {} })} />,
    );
    const stones = [...el.querySelectorAll('[data-testid="c2-place-stone"]')];
    expect(stones.map((s) => s.getAttribute("data-place"))).toEqual([
      "Oceanside Pier",
      "Oceanside Farmers Market",
    ]);
    expect(stones[0].getAttribute("data-energy-level")).toBe("lit");
    expect(stones[0].getAttribute("data-energy-family")).toBe("happening");
    expect(stones[0].textContent).toContain("Live here now.");
    expect(stones[0].textContent).toContain("Maya Torres is live here.");
    expect(stones[1].getAttribute("data-energy-level")).toBe("ember");
    expect(stones[1].textContent).toContain("Farmers market run is happening now.");
    // Presence on the stone is a light, never a roster count.
    expect(stones[0].querySelector('[data-testid="c2-place-stone-light"]')).not.toBeNull();
  });

  it("the tap is a door only when the shell wires it; without the wiring the stone rests", async () => {
    const places = placeStonesFromGraph({
      ...empty,
      plans: [plan({ id: "p-1", location: "Oceanside Pier", status: "completed" })],
    });
    const openPlace = vi.fn();
    const el = await render(
      <C2Home projection={homeProjection(places)} events={baseEvents({ openPlace })} />,
    );
    const stone = el.querySelector('[data-testid="c2-place-stone"]')!;
    expect(stone.tagName).toBe("BUTTON");
    click(stone);
    expect(openPlace).toHaveBeenCalledTimes(1);
    expect(openPlace.mock.calls[0][0].name).toBe("Oceanside Pier");

    const el2 = await render(
      <C2Home projection={homeProjection(places)} events={baseEvents({})} />,
    );
    const resting = el2.querySelector('[data-testid="c2-place-stone"]')!;
    expect(resting.tagName).toBe("ARTICLE");
  });
});

describe("the place view (PE-5)", () => {
  it("groups now / coming / memory, opens plan details, and carries the start door", async () => {
    const [place] = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-now",
          title: "Farmers market run",
          location: "Oceanside Farmers Market",
          status: "agreed",
          start_at: iso(mins(-45)),
          end_at: iso(mins(105)),
        }),
        plan({
          id: "p-old",
          title: "Last month's market run",
          location: "Oceanside Farmers Market",
          status: "completed",
          start_at: iso(mins(-30 * 24 * 60)),
        }),
      ],
      lives: [live({ liveId: "l-m", placeLabel: "Oceanside Farmers Market" })],
      moments: [moment({ id: "m-m", placeLabel: "Oceanside Farmers Market", caption: "Flower stall haul" })],
      now: NOW,
    });
    const onOpenGraph = vi.fn();
    const onStartPlan = vi.fn();
    const el = await render(
      <PlaceStoneView place={place} onClose={() => {}} onOpenGraph={onOpenGraph} onStartPlan={onStartPlan} />,
    );
    const view = el.querySelector('[data-testid="c2-place-view"]') ?? document.querySelector('[data-testid="c2-place-view"]');
    expect(view).not.toBeNull();
    expect(view!.querySelector('[data-testid="c2-place-live-row"]')).not.toBeNull();
    expect(view!.querySelector('[data-testid="c2-place-now"]')).not.toBeNull();
    expect(view!.querySelector('[data-testid="c2-place-memory"]')).not.toBeNull();
    expect(view!.textContent).toContain("Flower stall haul");

    const happeningRow = [...view!.querySelectorAll('[data-testid="c2-place-plan-row"]')].find(
      (r) => r.getAttribute("data-plan-state") === "happening",
    )!;
    click(happeningRow);
    expect(onOpenGraph).toHaveBeenCalledWith("p-now");

    const start = view!.querySelector('[data-testid="c2-place-start-plan"]')!;
    click(start);
    expect(onStartPlan).toHaveBeenCalledTimes(1);
    expect(onStartPlan.mock.calls[0][0].startSeed.location).toBe("Oceanside Farmers Market");
  });

  it("a live-only place renders its now group and NO start door (D-P4 is absence, not a dead control)", async () => {
    const [place] = placeStonesFromGraph({
      ...empty,
      lives: [live({ placeLabel: "Oceanside Pier" })],
    });
    const el = await render(
      <PlaceStoneView place={place} onClose={() => {}} onOpenGraph={() => {}} onStartPlan={() => {}} />,
    );
    const view = el.querySelector('[data-testid="c2-place-view"]') ?? document.querySelector('[data-testid="c2-place-view"]');
    expect(view).not.toBeNull();
    expect(view!.querySelector('[data-testid="c2-place-start-plan"]')).toBeNull();
    expect(view!.querySelector('[data-testid="c2-place-memory"]')).toBeNull();
  });
});
