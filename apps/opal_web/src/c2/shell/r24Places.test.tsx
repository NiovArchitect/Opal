/**
 * @vitest-environment jsdom
 *
 * Repair #24 - WS-8 PLACE-ENERGY TRIAGE, the fixed items pinned.
 *
 *  D-P1 IDENTITY-FIRST GROUPING: at the R24 tip the lives record
 *       honestly carries a venue identity (LiveRoom.to_contract:
 *       venue_id, and the venue's own id / provider place_id in
 *       its nested venue contract) and the moment record carries
 *       a provider place id (its place_ref, projected on the feed
 *       card as place_id by the R24 HomeFeed change). The plan
 *       contract carries NO stable place id (SharedPlan: location
 *       + coordinates, no venue column), so plans bridge by name.
 *       Pins: two same-name venues with different ids stay TWO
 *       places; the same id under variant name strings stays ONE
 *       place; a name-only record bridges into the one stone its
 *       name identifies (live + plan + moment at one venue still
 *       compose one stone, the R22 behaviour); a name-only record
 *       whose name is ambiguous between two identified venues is
 *       NOT silently attributed to either - it forms the
 *       name-only stone.
 *  D-P4 THE PLACE SEED: a live-only place composes a flows2
 *       "place" seed (my-people; location = the place; empty
 *       title; no sourcePlanId / inspiredByMomentId - a live
 *       room claims no lineage), and doorsForSource offers a
 *       place source my-people only.
 */
import { describe, expect, it } from "vitest";

import {
  livePlaceInputsFromRooms,
  placeStonesFromGraph,
  withPlaceSignals,
  type PlaceLiveInput,
  type PlaceMomentInput,
} from "./shellData";
import { doorsForSource, seedCreateFor, type SeedSource } from "./flows2";
import type { OpalPlanContract } from "../../api/productClient";

const NOW = new Date("2026-10-22T17:00:00.000Z");
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

describe("R24 D-P1 - livePlaceInputsFromRooms carries the venue identity the record honestly has", () => {
  it("venue_id wins, then the venue record's id, then its provider place_id; absent identity is null", () => {
    const inputs = livePlaceInputsFromRooms([
      { id: "l-1", status: "live", place_label: "Pier", venue_id: "venue-1", venue: { id: "venue-1", place_id: "places/pier" } },
      { id: "l-2", status: "live", place_label: "Pier", venue: { place_id: "places/pier-2" } },
      { id: "l-3", status: "live", place_label: "Pier" },
      { live_room: { id: "l-4", status: "live", venue_id: "venue-9", venue: { display_name: "Depot" } } },
    ]);
    expect(inputs.map((i) => i.placeId)).toEqual(["venue-1", "places/pier-2", null, "venue-9"]);
  });
});

describe("R24 D-P1 - identity-first grouping in placeStonesFromGraph", () => {
  it("two same-name venues with different ids stay TWO places", () => {
    const stones = placeStonesFromGraph({
      ...empty,
      lives: [
        live({ liveId: "l-a", placeLabel: "The Depot", placeId: "venue-a" }),
        live({ liveId: "l-b", placeLabel: "The Depot", placeId: "venue-b" }),
      ],
    });
    expect(stones).toHaveLength(2);
    expect(stones.map((s) => s.placeId).sort()).toEqual(["venue-a", "venue-b"]);
    expect(stones.map((s) => s.key).sort()).toEqual(["id:venue-a", "id:venue-b"]);
    expect(stones.every((s) => s.name === "The Depot")).toBe(true);
    expect(stones.every((s) => s.livesHere.length === 1)).toBe(true);
  });

  it("the same id under variant display strings stays ONE place (first-seen name wins)", () => {
    const stones = placeStonesFromGraph({
      ...empty,
      lives: [live({ liveId: "l-a", placeLabel: "Oceanside Pier", placeId: "venue-pier" })],
      moments: [
        moment({ id: "m-1", placeLabel: "oceanside  pier", placeId: "venue-pier" }),
      ],
    });
    expect(stones).toHaveLength(1);
    expect(stones[0]!.name).toBe("Oceanside Pier");
    expect(stones[0]!.placeId).toBe("venue-pier");
    expect(stones[0]!.momentsHere).toHaveLength(1);
    expect(stones[0]!.livesHere).toHaveLength(1);
  });

  it("a name-only record bridges into the ONE stone its name identifies (the R22 live + plan + moment composition holds)", () => {
    const stones = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-market",
          title: "Farmers market run",
          location: "Oceanside Pier",
          status: "agreed",
          start_at: iso(mins(-45)),
          end_at: iso(mins(105)),
        }),
      ],
      lives: [live({ liveId: "l-a", placeLabel: "Oceanside Pier", placeId: "venue-pier" })],
      moments: [moment({ id: "m-1", placeLabel: "Oceanside Pier" })],
      now: NOW,
    });
    expect(stones).toHaveLength(1);
    expect(stones[0]!.placeId).toBe("venue-pier");
    expect(stones[0]!.happeningPlans).toHaveLength(1);
    expect(stones[0]!.momentsHere).toHaveLength(1);
    expect(stones[0]!.livesHere).toHaveLength(1);
  });

  it("an id record ADOPTS the single name-only stone formed before it (a later-identified record cannot split one place)", () => {
    // Moments are processed after plans in the builder, so a
    // moment carrying an id arrives at a stone the (id-less)
    // plan already formed by name: the stone is adopted, its
    // key becomes the id key, and nothing splits.
    const stones = placeStonesFromGraph({
      ...empty,
      plans: [plan({ id: "p-1", location: "Moonlight Beach", status: "completed" })],
      moments: [moment({ id: "m-1", placeLabel: "Moonlight Beach", placeId: "places/moonlight" })],
    });
    expect(stones).toHaveLength(1);
    expect(stones[0]!.placeId).toBe("places/moonlight");
    expect(stones[0]!.key).toBe("id:places/moonlight");
    expect(stones[0]!.memoryPlans).toHaveLength(1);
    expect(stones[0]!.momentsHere).toHaveLength(1);
  });

  it("a name-only record with an AMBIGUOUS name is not attributed to either identified venue", () => {
    const stones = placeStonesFromGraph({
      ...empty,
      lives: [
        live({ liveId: "l-a", placeLabel: "The Depot", placeId: "venue-a" }),
        live({ liveId: "l-b", placeLabel: "The Depot", placeId: "venue-b" }),
      ],
      moments: [moment({ id: "m-1", placeLabel: "The Depot" })],
    });
    expect(stones).toHaveLength(3);
    const nameOnly = stones.filter((s) => s.placeId === null);
    expect(nameOnly).toHaveLength(1);
    expect(nameOnly[0]!.key).toBe("name:the depot");
    expect(nameOnly[0]!.momentsHere).toHaveLength(1);
    for (const s of stones.filter((x) => x.placeId !== null)) {
      expect(s.momentsHere).toHaveLength(0);
    }
  });

  it("records with no id anywhere group exactly as R22 did (name key, normalized)", () => {
    const stones = placeStonesFromGraph({
      ...empty,
      plans: [plan({ id: "p-a", location: "  Oceanside   Pier ", status: "completed" })],
      moments: [moment({ id: "m-a", placeLabel: "oceanside pier" })],
    });
    expect(stones).toHaveLength(1);
    expect(stones[0]!.key).toBe("name:oceanside pier");
    expect(stones[0]!.placeId).toBeNull();
  });

  it("the server signal still joins by NAME onto an id-keyed stone (the signals contract is names)", () => {
    const stones = placeStonesFromGraph({
      ...empty,
      lives: [live({ liveId: "l-a", placeLabel: "Oceanside Pier", placeId: "venue-pier" })],
    });
    const [withSignal] = withPlaceSignals(stones, [
      { place: "Oceanside Pier", tier: "alive", nearby: false },
    ]);
    expect(withSignal!.key).toBe("id:venue-pier");
    expect(withSignal!.signalTier).toBe("alive");
  });
});

describe("R24 D-P4 - the place seed", () => {
  it("doorsForSource offers a place source my-people only - no join, no again, no solo", () => {
    const source: SeedSource = { kind: "place", placeLabel: "Oceanside Pier", placeId: "venue-pier" };
    expect(doorsForSource(source)).toEqual(["my-people"]);
    expect(seedCreateFor(source, "join")).toBeNull();
    expect(seedCreateFor(source, "again")).toBeNull();
    expect(seedCreateFor(source, "solo")).toBeNull();
  });

  it("the place seed's prefill carries the place and nothing it may not claim", () => {
    const create = seedCreateFor(
      { kind: "place", placeLabel: "Oceanside Pier", placeId: "venue-pier" },
      "my-people",
    );
    expect(create).not.toBeNull();
    expect(create!.location).toBe("Oceanside Pier");
    expect(create!.title).toBe("");
    expect(create!.participantUserIds).toEqual([]);
    expect(create!.audience).toBe("close_circle");
    expect(create!.lockParty).toBe(false);
    expect(create!.needsPartyRead).toBe(false);
    expect(create!.sourcePlanId).toBeUndefined();
    expect(create!.inspiredByMomentId).toBeUndefined();
    expect(create!.entry).toBe("flows-seed-my-people");
  });

  it("a live-only place composes the place seed as its start door; a plan seed still outranks it", () => {
    const [liveOnly] = placeStonesFromGraph({
      ...empty,
      lives: [live({ placeLabel: "Moonlight Beach, Encinitas", placeId: "venue-moon" })],
    });
    expect(liveOnly!.startSeed?.location).toBe("Moonlight Beach, Encinitas");
    expect(liveOnly!.startSeed?.branch).toBe("my-people");

    const [withPlan] = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-brunch",
          title: "Sunday brunch",
          location: "Moonlight Beach, Encinitas",
          status: "agreed",
          start_at: iso(mins(4 * 24 * 60)),
        }),
      ],
      lives: [live({ placeLabel: "Moonlight Beach, Encinitas", placeId: "venue-moon" })],
      moments: [],
      now: NOW,
    });
    expect(withPlan!.startSeed?.sourcePlanId).toBe("p-brunch");
  });
});
