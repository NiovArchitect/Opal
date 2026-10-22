/**
 * @vitest-environment jsdom
 *
 * Repair #23 - WS-23-5 PLACE SIGNAL, FELT (web pins).
 *
 *  PS-1 tier-to-light mapping: the server tier is the stone's
 *       warmth input - quiet/cold, stirring/ember, warm/lit,
 *       alive/radiant - reconciled with the R22 energy level as
 *       the WARMER of the two, so a quiet tier never dims a
 *       plan state that is really happening and a warm tier
 *       lifts a stone whose own records are modest.
 *  PS-2 the merge: withPlaceSignals folds the server read onto
 *       the R22 stones by the builder's own key; signals for
 *       places with no stone change nothing, stones with no
 *       signal keep their R22 reading untouched.
 *  PS-3 the stone's warmth render: the stone stamps its tier,
 *       its reconciled warmth and its nearby flag; the visible
 *       text carries NO tier word, NO numeral of heat and NO
 *       "trending" label anywhere.
 *  PS-4 the place view's felt state: the view stamps the same
 *       tier/warmth/nearby and renders the warmth halo (light,
 *       not words about heat).
 *  PS-5 nearby on the rail: the story stone's "nearby" state
 *       renders with the same one-word caption grammar as
 *       every other state ("Nearby"), and a stone without the
 *       state never wears it.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { C2Home, type C2HomeEvents } from "./C2Home";
import { PlaceStoneView } from "./PlaceStone";
import {
  placeStonesFromGraph,
  placeWarmthLevel,
  withPlaceSignals,
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

function stoneAt(placeName: string, tier: PlaceStoneProjection["signalTier"]): PlaceStoneProjection {
  const [stone] = placeStonesFromGraph({
    plans: [],
    moments: [moment({ id: `m-${placeName}`, placeLabel: placeName })],
    lives: [],
    now: NOW,
  });
  return tier ? { ...stone, signalTier: tier } : stone;
}

describe("PS-1: tier-to-light mapping (placeWarmthLevel)", () => {
  it("each tier maps to its warmth level on a modest stone", () => {
    // A single-moment stone is R22 ember; the tier warmth is
    // quiet->cold (never lifts), stirring->ember, warm->lit,
    // alive->radiant, reconciled as the warmer of the two.
    expect(placeWarmthLevel(stoneAt("A Place", "quiet"))).toBe("ember");
    expect(placeWarmthLevel(stoneAt("A Place", "stirring"))).toBe("ember");
    expect(placeWarmthLevel(stoneAt("A Place", "warm"))).toBe("lit");
    expect(placeWarmthLevel(stoneAt("A Place", "alive"))).toBe("radiant");
  });

  it("a quiet tier never dims a stone whose plan state is really happening", () => {
    const [stone] = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-hot",
          location: "Harbor Pier",
          status: "agreed",
          start_at: iso(mins(-45)),
          end_at: iso(mins(105)),
        }),
      ],
      moments: [],
      lives: [live({ liveId: "l-hot", placeLabel: "Harbor Pier" })],
      now: NOW,
    });
    // R22 level here is lit (live 3 + happening 2 = 5).
    expect(stone.energyLevel).toBe("lit");
    expect(placeWarmthLevel({ ...stone, signalTier: "quiet" })).toBe("lit");
    expect(placeWarmthLevel({ ...stone, signalTier: "alive" })).toBe("radiant");
    // No tier at all: the R22 level alone, honestly.
    expect(placeWarmthLevel(stone)).toBe("lit");
  });
});

describe("PS-2: withPlaceSignals - the merge", () => {
  it("folds tier + nearby onto the matching stone only, by the builder key", () => {
    const stones = placeStonesFromGraph({
      plans: [],
      moments: [
        moment({ id: "m-1", placeLabel: "Harbor Pier" }),
        moment({ id: "m-2", placeLabel: "Still Cove" }),
      ],
      lives: [],
      now: NOW,
    });
    const merged = withPlaceSignals(stones, [
      { place: "  harbor   pier ", tier: "alive", nearby: true },
      { place: "A Place With No Stone", tier: "warm", nearby: false },
    ]);
    const pier = merged.find((s) => s.name === "Harbor Pier")!;
    const beach = merged.find((s) => s.name === "Still Cove")!;
    expect(pier.signalTier).toBe("alive");
    expect(pier.signalNearby).toBe(true);
    expect(beach.signalTier).toBeUndefined();
    expect(beach.signalNearby).toBeUndefined();
    expect(merged).toHaveLength(2);
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

describe("PS-3: the stone's warmth render", () => {
  it("a warm place reads visibly warmer than a cold place, with zero numerals or heat words in frame", async () => {
    const stones = withPlaceSignals(
      placeStonesFromGraph({
        plans: [],
        moments: [
          moment({ id: "m-1", placeLabel: "Harbor Pier" }),
          moment({ id: "m-2", placeLabel: "Still Cove" }),
        ],
        lives: [],
        now: NOW,
      }),
      [
        { place: "Harbor Pier", tier: "alive", nearby: false },
        { place: "Still Cove", tier: "quiet", nearby: false },
      ],
    );
    const el = await render(
      <C2Home projection={homeProjection(stones)} events={baseEvents({ openPlace: () => {} })} />,
    );
    const rendered = [...el.querySelectorAll('[data-testid="c2-place-stone"]')];
    const pier = rendered.find((s) => s.getAttribute("data-place") === "Harbor Pier")!;
    const beach = rendered.find((s) => s.getAttribute("data-place") === "Still Cove")!;
    expect(pier.getAttribute("data-signal-tier")).toBe("alive");
    expect(pier.getAttribute("data-warmth")).toBe("radiant");
    expect(beach.getAttribute("data-signal-tier")).toBe("quiet");
    // The cold place's warmth never exceeds its own R22 ember.
    expect(beach.getAttribute("data-warmth")).toBe("ember");
    // Zero numerals of heat, zero trending labels, zero tier
    // words in the VISIBLE text of either stone.
    for (const stone of rendered) {
      const text = stone.textContent ?? "";
      expect(text).not.toMatch(/trending/i);
      expect(text).not.toMatch(/alive|stirring|warm|quiet/i);
      expect(text).not.toMatch(/\d+\s*(°|%|heat)/i);
    }
  });

  it("nearby stamps on the stone only when the signal carries it", async () => {
    const stones = withPlaceSignals(
      placeStonesFromGraph({
        plans: [],
        moments: [moment({ id: "m-1", placeLabel: "Harbor Pier" })],
        lives: [],
        now: NOW,
      }),
      [{ place: "Harbor Pier", tier: "warm", nearby: true }],
    );
    const el = await render(
      <C2Home projection={homeProjection(stones)} events={baseEvents({ openPlace: () => {} })} />,
    );
    const stone = el.querySelector('[data-testid="c2-place-stone"]')!;
    expect(stone.getAttribute("data-nearby")).toBe("true");
    expect(stone.getAttribute("data-warmth")).toBe("lit");
  });
});

describe("PS-4: the place view's felt state", () => {
  it("the view stamps tier/warmth/nearby and renders the warmth halo as light only", async () => {
    const [place] = withPlaceSignals(
      placeStonesFromGraph({
        plans: [],
        moments: [moment({ id: "m-1", placeLabel: "Harbor Pier", caption: "Flower stall haul" })],
        lives: [live({ liveId: "l-1", placeLabel: "Harbor Pier" })],
        now: NOW,
      }),
      [{ place: "Harbor Pier", tier: "alive", nearby: true }],
    );
    const el = await render(<PlaceStoneView place={place} onClose={() => {}} />);
    const view =
      el.querySelector('[data-testid="c2-place-view"]') ??
      document.querySelector('[data-testid="c2-place-view"]');
    expect(view).not.toBeNull();
    expect(view!.getAttribute("data-signal-tier")).toBe("alive");
    expect(view!.getAttribute("data-warmth")).toBe("radiant");
    expect(view!.getAttribute("data-nearby")).toBe("true");
    expect(view!.querySelector('[data-testid="c2-place-view-warmth"]')).not.toBeNull();
    const text = view!.textContent ?? "";
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/heat/i);
  });
});

describe("PS-5: nearby on the story rail", () => {
  it("a nearby stone renders in the rail's one-word grammar", async () => {
    const projection = homeProjection([]);
    projection.rail.stories = [
      {
        id: "s-near",
        personName: "Maya Torres",
        personId: "u-maya",
        avatar: avatarOf("Maya Torres"),
        seen: false,
        ringKind: "unseen",
        stoneState: "nearby",
        storyCount: 1,
        mediaUrl: "/media/maya.jpg",
        caption: null,
        items: [],
      },
      {
        id: "s-far",
        personName: "Jordan Lee",
        personId: "u-jordan",
        avatar: avatarOf("Jordan Lee"),
        seen: false,
        ringKind: "unseen",
        stoneState: "new",
        storyCount: 1,
        mediaUrl: "/media/jordan.jpg",
        caption: null,
        items: [],
      },
    ];
    const el = await render(<C2Home projection={projection} events={baseEvents({})} />);
    const stones = [...el.querySelectorAll('[data-testid="c2-stone"]')];
    expect(stones.map((s) => s.getAttribute("data-state"))).toEqual(["nearby", "new"]);
    const subs = [...el.querySelectorAll('[data-testid="c2-stone-sub"]')].map((s) => s.textContent);
    // The self door's word leads; then one word per stone.
    expect(subs).toContain("Nearby");
    expect(subs).toContain("New");
  });
});
