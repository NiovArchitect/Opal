/**
 * @vitest-environment jsdom
 *
 * Repair #27 - Cluster A (Flows feed & places) pins.
 *
 *  W27-4 the (i) info affordance is ABSENT from the Flows stream:
 *       the feed-empty line and the loading line render as visible
 *       words, never hidden behind a calm-info bubble.
 *  W27-6 place truth at the projection layer:
 *       (1) one plan, one stone - a plan id never lands in two
 *           stones or twice in one stone, however the records
 *           repeat or variant-spell the place;
 *       (2) the boilerplate "A plan is forming here." never
 *           renders - a forming place's line names its own plan;
 *       (3) a plan row's when line never repeats tokens its title
 *           already carries;
 *       (4) titles and place names render first-letter capital
 *           without mangling real names ("iPhone", "McDonald's");
 *       (5) place rows carry each plan's TRUE state family, not a
 *           stamped Forming;
 *       (6) a place with a real image on its records carries that
 *           image on the stone and the sheet; without one, the
 *           stone renders no media well (warmth treatment only).
 *  W27-7 "omething": no web derivation drops a leading character -
 *       adversarial place names render whole on the card, the
 *       sheet, and the plan's where line.
 *  W27-11 discovery rows: no repeated "You talk with them"; the
 *       subtitle is specific per person or absent; no row carries
 *       an unexplained dimmed state.
 *  W27-3 first paint: homeFromSession starts every independent
 *       read before any of them resolves (no sequential waterfall).
 *  W27-13 scroll/tap integrity: the sheet material is height-
 *       capped and scrolls internally, so the last plan row of a
 *       tall place sheet is reachable.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const listTemporaryStories = vi.fn();
const listOpalPlans = vi.fn();
const fetchHomeFeed = vi.fn();
const getLivesVisible = vi.fn();
const listCelebrations = vi.fn();
const listRelationships = vi.fn();
const listTriviaGuesses = vi.fn();
const listMemoryFacts = vi.fn();
const getSoulMemory = vi.fn();
const listConversations = vi.fn();
const listFollowing = vi.fn();
const getPlaceSignals = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listTemporaryStories: (...a: unknown[]) => listTemporaryStories(...a),
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
    fetchHomeFeed: (...a: unknown[]) => fetchHomeFeed(...a),
    getLivesVisible: (...a: unknown[]) => getLivesVisible(...a),
    listCelebrations: (...a: unknown[]) => listCelebrations(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    listTriviaGuesses: (...a: unknown[]) => listTriviaGuesses(...a),
    listMemoryFacts: (...a: unknown[]) => listMemoryFacts(...a),
    getSoulMemory: (...a: unknown[]) => getSoulMemory(...a),
    listConversations: (...a: unknown[]) => listConversations(...a),
    listFollowing: (...a: unknown[]) => listFollowing(...a),
    getPlaceSignals: (...a: unknown[]) => getPlaceSignals(...a),
  };
});

import { C2Home, type C2HomeEvents } from "./C2Home";
import { PlaceStoneView } from "./PlaceStone";
import { cardFromPlan, homeFromSession, placeStonesFromGraph } from "./shellData";
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
    start_at: iso(mins(3 * 24 * 60)),
    ...partial,
  } as OpalPlanContract;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(node);
  });
  return host;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
});

const emptyHome = (over: Partial<HomeProjection> = {}): HomeProjection => ({
  header: { ownAvatar: { initials: "YO", tint: 1 } },
  rail: {
    self: { avatar: { initials: "YO", tint: 1 }, hasLiveStory: false, story: null },
    stories: [],
    capabilities: { canPost: true, canStory: true },
  },
  feed: [],
  places: [],
  discovery: [],
  ...over,
});

const events: C2HomeEvents = {
  bearer: "tok",
  openYou: () => {},
  openSearch: () => {},
  openActivity: () => {},
  openGraph: () => {},
  onShared: () => {},
};

/* ------------------------------------------------------------------ */
/* W27-6 (1) one plan, one stone                                       */
/* ------------------------------------------------------------------ */

describe("W27-6 grouping: one plan, one stone, listed once", () => {
  it("the same plan id arriving twice (variant place spellings) lands in ONE stone, once", () => {
    const dup = plan({
      id: "p-dup",
      title: "Dinner",
      location: "Night Hawk",
      time_label: "Friday 7 PM",
    });
    const variant = plan({
      id: "p-dup",
      title: "Dinner",
      location: "night hawk",
      time_label: "Friday 7 PM",
    });
    const stones = placeStonesFromGraph({
      plans: [dup, variant],
      moments: [],
      lives: [],
      now: NOW,
    });
    expect(stones).toHaveLength(1);
    const allRows = [
      ...stones[0].happeningPlans,
      ...stones[0].comingPlans,
      ...stones[0].memoryPlans,
    ];
    expect(allRows.filter((r) => r.planId === "p-dup")).toHaveLength(1);
  });

  it("a leading article does not split one place into two stones", () => {
    const stones = placeStonesFromGraph({
      plans: [
        plan({ id: "p-a", title: "Drinks", location: "The Brick Hotel" }),
        plan({ id: "p-b", title: "Brunch", location: "Brick Hotel" }),
      ],
      moments: [],
      lives: [],
      now: NOW,
    });
    expect(stones).toHaveLength(1);
    expect(stones[0].comingPlans.map((r) => r.planId).sort()).toEqual(["p-a", "p-b"]);
  });

  it("the place sheet lists each distinct plan once, even if the projection repeats it", () => {
    const stone = placeStonesFromGraph({
      plans: [plan({ id: "p-1", title: "Dinner" })],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    const repeated: PlaceStoneProjection = {
      ...stone,
      comingPlans: [...stone.comingPlans, ...stone.comingPlans],
    };
    const el = render(
      <PlaceStoneView place={repeated} onClose={() => {}} onOpenGraph={() => {}} />,
    );
    const rows = document.querySelectorAll('[data-testid="c2-place-plan-row"]');
    expect(rows).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* W27-6 (2) boilerplate dies; (5) true states                         */
/* ------------------------------------------------------------------ */

describe("W27-6 copy: no boilerplate, true per-plan states", () => {
  it("a forming place's energy line names its own plan - never 'A plan is forming here.'", () => {
    const stones = placeStonesFromGraph({
      plans: [
        plan({ id: "p-1", title: "Dinner soon", location: "Night Hawk" }),
        plan({ id: "p-2", title: "Tacos", location: "Mariscos" }),
      ],
      moments: [],
      lives: [],
      now: NOW,
    });
    for (const s of stones) {
      expect(s.energyLine).not.toBe("A plan is forming here.");
      expect(s.energyLine).not.toContain("A plan is forming here");
    }
    const hawk = stones.find((s) => s.name === "Night Hawk")!;
    expect(hawk.energyLine).toContain("Dinner soon");
    const mar = stones.find((s) => s.name === "Mariscos")!;
    expect(mar.energyLine).toContain("Tacos");
    expect(hawk.energyLine).not.toBe(mar.energyLine);
  });

  it("rows carry each plan's TRUE state: agreed reads Ready beside a tentative Forming", () => {
    const stone = placeStonesFromGraph({
      plans: [
        plan({ id: "p-ready", title: "Locked dinner", status: "agreed" }),
        plan({ id: "p-forming", title: "Maybe tacos", status: "tentative" }),
        plan({
          id: "p-action",
          title: "RSVP drinks",
          status: "agreed",
          viewer_state: "pending",
        }),
      ],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    const byId = new Map(stone.comingPlans.map((r) => [r.planId, r]));
    expect(byId.get("p-ready")?.stateLabel).toBe("Ready");
    expect(byId.get("p-ready")?.stateFamily).toBe("ready");
    expect(byId.get("p-forming")?.stateLabel).toBe("Forming");
    expect(byId.get("p-action")?.stateLabel).toBe("Action needed");
    // And the sheet stamps those families, not one blanket state.
    const el = render(
      <PlaceStoneView place={stone} onClose={() => {}} onOpenGraph={() => {}} />,
    );
    const states = [...document.querySelectorAll('[data-testid="c2-place-plan-row"]')].map((r) =>
      r.getAttribute("data-plan-state"),
    );
    expect(states).toContain("ready");
    expect(states).toContain("forming");
    expect(states).toContain("action");
  });
});

/* ------------------------------------------------------------------ */
/* W27-6 (3) meta never repeats the title                              */
/* ------------------------------------------------------------------ */

describe("W27-6 meta/title non-repetition", () => {
  it("a when line whose tokens the title already carries is trimmed to what is new", () => {
    const stone = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-1",
          title: "Night Hawk tonight",
          location: "Night Hawk",
          time_label: "tonight · 5 PM",
          start_at: iso(mins(60)),
        }),
      ],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    const row = stone.comingPlans[0] ?? stone.happeningPlans[0];
    expect(row.title.toLowerCase()).toContain("tonight");
    expect(row.whenLine.toLowerCase()).not.toContain("tonight");
    expect(row.whenLine).toContain("5 PM");
  });

  it("the rendered sheet row does not repeat 'tonight' across title + meta", () => {
    const stone = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-1",
          title: "Dinner tonight",
          location: "Night Hawk",
          time_label: "tonight · 5 PM",
          start_at: iso(mins(60)),
        }),
      ],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    const el = render(
      <PlaceStoneView place={stone} onClose={() => {}} onOpenGraph={() => {}} />,
    );
    const rowEl = document.querySelector('[data-testid="c2-place-plan-row"]')!;
    const hits = (rowEl.textContent?.toLowerCase().match(/tonight/g) ?? []).length;
    expect(hits).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* W27-6 (4) casing                                                    */
/* ------------------------------------------------------------------ */

describe("W27-6 casing: first-letter capital, real names unmangled", () => {
  it("a lowercase plan title and place name render capitalized", () => {
    const stone = placeStonesFromGraph({
      plans: [plan({ id: "p-1", title: "nighthawk dinner", location: "nighthawk" })],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    expect(stone.name).toBe("Nighthawk");
    expect(stone.comingPlans[0].title).toBe("Nighthawk dinner");
  });

  it("camel-case and apostrophe names keep their real shape", () => {
    const stone = placeStonesFromGraph({
      plans: [plan({ id: "p-1", title: "iPhone swap", location: "McDonald's" })],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    expect(stone.name).toBe("McDonald's");
    expect(stone.comingPlans[0].title).toBe("iPhone swap");
  });

  it("feed plan cards built by the one adapter carry the same casing", () => {
    const card = cardFromPlan(plan({ id: "p-9", title: "nighthawk" }));
    expect(card.title).toBe("Nighthawk");
  });
});

/* ------------------------------------------------------------------ */
/* W27-6 (6) imagery                                                   */
/* ------------------------------------------------------------------ */

describe("W27-6 imagery: real place image or honest warmth, never a bare stack", () => {
  it("the stone carries the place image its plan record carries", () => {
    const stone = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-1",
          title: "Dinner",
          location: "Juniper & Ivy",
          image_url: "/seed_assets/juniper_dinner.jpg",
        }),
      ],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    expect(stone.imageUrl).toBe("/seed_assets/juniper_dinner.jpg");
  });

  it("the stone and the sheet render that image; a place without one renders no media well", () => {
    const withImg = placeStonesFromGraph({
      plans: [
        plan({
          id: "p-1",
          title: "Dinner",
          location: "Juniper & Ivy",
          image_url: "/seed_assets/juniper_dinner.jpg",
        }),
      ],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    const el = render(
      <C2Home projection={emptyHome({ places: [withImg] })} events={events} />,
    );
    const stoneEl = el.querySelector('[data-testid="c2-place-stone"]')!;
    expect(stoneEl.querySelector("img")).toBeTruthy();
    const el2 = render(
      <PlaceStoneView place={withImg} onClose={() => {}} onOpenGraph={() => {}} />,
    );
    expect(document.querySelector('[data-testid="c2-place-view"] img')).toBeTruthy();

    const bare = placeStonesFromGraph({
      plans: [plan({ id: "p-2", title: "Dinner", location: "No Photo Place" })],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    expect(bare.imageUrl ?? null).toBeNull();
    const el3 = render(
      <C2Home projection={emptyHome({ places: [bare] })} events={events} />,
    );
    expect(
      el3.querySelector('[data-testid="c2-place-stone"]')!.querySelector("img"),
    ).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* W27-7 "omething"                                                    */
/* ------------------------------------------------------------------ */

describe("W27-7 adversarial place names render whole everywhere", () => {
  it("'Something' survives the card, the sheet, and the plan's where line", () => {
    const p = plan({ id: "p-s", title: "Plan something", location: "Something" });
    const stone = placeStonesFromGraph({
      plans: [p],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    expect(stone.name).toBe("Something");
    const card = cardFromPlan(p);
    expect(card.whereLine).toBe("Something");
    const el = render(
      <C2Home projection={emptyHome({ places: [stone] })} events={events} />,
    );
    expect(
      el.querySelector('[data-testid="c2-place-stone"]')!.getAttribute("data-place"),
    ).toBe("Something");
    const el2 = render(
      <PlaceStoneView place={stone} onClose={() => {}} onOpenGraph={() => {}} />,
    );
    expect(document.querySelector('[data-testid="c2-place-view-name"]')!.textContent).toBe(
      "Something",
    );
    expect(document.body.textContent).not.toContain("omething\"");
    expect(stone.comingPlans[0].title).toBe("Plan something");
  });

  it("article-led and single-word lowercase names render whole and capitalized", () => {
    const stone = placeStonesFromGraph({
      plans: [plan({ id: "p-t", title: "Stay", location: "the brick hotel" })],
      moments: [],
      lives: [],
      now: NOW,
    })[0];
    expect(stone.name.toLowerCase()).toContain("brick hotel");
    expect(stone.name.startsWith("The") || stone.name.startsWith("the")).toBe(true);
    expect(stone.name).not.toMatch(/^he brick/);
  });
});

/* ------------------------------------------------------------------ */
/* W27-4 the (i) dies on Flows                                         */
/* ------------------------------------------------------------------ */

describe("W27-4 no info bubble on the Flows stream", () => {
  it("the empty feed renders its line as visible words, with no calm-info anywhere", () => {
    const el = render(<C2Home projection={emptyHome()} events={events} />);
    expect(el.querySelector('[data-testid="calm-info"]')).toBeNull();
    expect(el.querySelector('[data-testid="calm-info-pop"]')).toBeNull();
    const empty = el.querySelector('[data-testid="c2-feed-empty"]')!;
    expect(empty.textContent).toContain("Posts from your people");
  });
});

/* ------------------------------------------------------------------ */
/* W27-11 discovery rows                                               */
/* ------------------------------------------------------------------ */

describe("W27-11 discovery: specific subtitle or none, no unexplained dimming", () => {
  it("no row repeats 'You talk with them'; a person with no true context line renders none", () => {
    const proj = emptyHome({
      discovery: [
        { userId: "u-nina", name: "Nina Park", avatar: { initials: "NP", tint: 2 } },
        { userId: "u-dan", name: "Dan Cole", avatar: { initials: "DC", tint: 3 } },
      ],
    });
    const el = render(<C2Home projection={proj} events={events} />);
    const rows = el.querySelectorAll('[data-testid="c2-discovery-row"]');
    expect(rows).toHaveLength(2);
    expect(el.textContent).not.toContain("You talk with them");
    for (const row of rows) {
      expect(row.querySelector(".c2s-discovery-sub")).toBeNull();
      expect(row.getAttribute("data-dimmed")).toBeNull();
      expect((row as HTMLElement).style.opacity).toBe("");
    }
  });

  it("a person WITH a true context line renders exactly that line", () => {
    const proj = emptyHome({
      discovery: [
        {
          userId: "u-maya",
          name: "Maya Torres",
          avatar: { initials: "MT", tint: 1 },
          contextLine: "Dinner Friday is coming up together",
        },
      ],
    });
    const el = render(<C2Home projection={proj} events={events} />);
    const sub = el.querySelector(".c2s-discovery-sub");
    expect(sub?.textContent).toBe("Dinner Friday is coming up together");
  });
});

/* ------------------------------------------------------------------ */
/* W27-3 first paint: no sequential waterfall                          */
/* ------------------------------------------------------------------ */

describe("W27-3 homeFromSession starts independent reads in parallel", () => {
  beforeEach(() => {
    for (const m of [
      listTemporaryStories,
      listOpalPlans,
      fetchHomeFeed,
      getLivesVisible,
      listCelebrations,
      listRelationships,
      listTriviaGuesses,
      listMemoryFacts,
      getSoulMemory,
      listConversations,
      listFollowing,
      getPlaceSignals,
    ]) {
      m.mockReset();
    }
  });

  it("every independent leg is invoked before the first one resolves", async () => {
    const deferred = () => {
      let resolveFn: (v: unknown) => void = () => {};
      const promise = new Promise((res) => {
        resolveFn = res;
      });
      return { promise, resolve: resolveFn };
    };
    const legs = {
      stories: deferred(),
      plans: deferred(),
      feed: deferred(),
      lives: deferred(),
      celebrations: deferred(),
      relationships: deferred(),
      trivia: deferred(),
      facts: deferred(),
      wallet: deferred(),
      conversations: deferred(),
      following: deferred(),
    };
    listTemporaryStories.mockReturnValue(legs.stories.promise);
    listOpalPlans.mockReturnValue(legs.plans.promise);
    fetchHomeFeed.mockReturnValue(legs.feed.promise);
    getLivesVisible.mockReturnValue(legs.lives.promise);
    listCelebrations.mockReturnValue(legs.celebrations.promise);
    listRelationships.mockReturnValue(legs.relationships.promise);
    listTriviaGuesses.mockReturnValue(legs.trivia.promise);
    listMemoryFacts.mockReturnValue(legs.facts.promise);
    getSoulMemory.mockReturnValue(legs.wallet.promise);
    listConversations.mockReturnValue(legs.conversations.promise);
    listFollowing.mockReturnValue(legs.following.promise);
    getPlaceSignals.mockResolvedValue({ signals: [], nearby_user_ids: [] });

    const homeP = homeFromSession(null, "tok");
    // Flush microtasks WITHOUT resolving any leg.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // The waterfall is dead when all of these have STARTED already.
    expect(listTemporaryStories).toHaveBeenCalled();
    expect(listOpalPlans).toHaveBeenCalled();
    expect(fetchHomeFeed).toHaveBeenCalled();
    expect(getLivesVisible).toHaveBeenCalled();
    expect(listCelebrations).toHaveBeenCalled();
    expect(listRelationships).toHaveBeenCalled();
    expect(listConversations).toHaveBeenCalled();
    expect(listFollowing).toHaveBeenCalled();

    legs.stories.resolve({ stories: [] });
    legs.plans.resolve({ plans: [] });
    legs.feed.resolve({ objects: [] });
    legs.lives.resolve({ lives: [] });
    legs.celebrations.resolve({ celebrations: [] });
    legs.relationships.resolve({ relationships: [], contacts: [] });
    legs.trivia.resolve({ about_me: [], mine: [], score: {} });
    legs.facts.resolve({ facts: [] });
    legs.wallet.resolve({ capsules: [] });
    legs.conversations.resolve({ conversations: [] });
    legs.following.resolve({ following_user_ids: [] });
    const home = await homeP;
    expect(home.feed).toEqual([]);
    // The dependent signal read runs exactly once, after places exist.
    expect(getPlaceSignals).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* W27-13 scroll integrity (CSS contract)                              */
/* ------------------------------------------------------------------ */

describe("W27-13 sheet scroll integrity", () => {
  const css = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");

  it("the sheet material is height-capped and scrolls internally", () => {
    const sheetBlock = css.match(/\.c2s-sheet\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(sheetBlock).toMatch(/max-height\s*:/);
    expect(sheetBlock).toMatch(/overflow-y\s*:\s*auto/);
  });

  it("the comments list can shrink inside its capped sheet (min-height 0)", () => {
    const listBlock = css.match(/\.c2s-comments-list\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(listBlock).toMatch(/min-height\s*:\s*0/);
  });

  it("the home stream scroller keeps its dock clearance", () => {
    const scrollBlock = css.match(/\.c2s-scroll\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(scrollBlock).toMatch(/overflow-y\s*:\s*auto/);
    expect(scrollBlock).toMatch(/var\(--dock-clearance\)/);
  });
});
