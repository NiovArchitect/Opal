/**
 * @vitest-environment jsdom
 *
 * Repair #19 (W9) - Home that feels social. What these prove:
 *  - imagery comes from the RECORD's own fields (plan image field
 *    precedence + provenance; a moment's media_ref), never from a
 *    title, never from an opaque media_id, never a stock photo;
 *  - a record with no image renders the designed monogram
 *    treatment - and the caption NEVER sits inside the media well
 *    (the founder's "Race night dinner" text-in-a-box defect);
 *  - LIVE presence gating: a live card exists only when a real
 *    live room (status exactly "live") was read back from
 *    GET /lives/visible; ended rooms and failed reads paint none;
 *  - state variety: Home composition orders finished plan cards
 *    by state rank without relabeling any state, and plans are
 *    never sliced away by a moment-heavy feed;
 *  - state treatments use canon tokens only (the live card and
 *    forming treatment read the same indicator tokens as the rest
 *    of the app), and every ambient element carries its reason.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const listOpalPlans = vi.fn();
const listTemporaryStories = vi.fn();
const fetchHomeFeed = vi.fn();
const getLivesVisible = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    listOpalPlans: (...a: unknown[]) => listOpalPlans(...a),
    listTemporaryStories: (...a: unknown[]) => listTemporaryStories(...a),
    fetchHomeFeed: (...a: unknown[]) => fetchHomeFeed(...a),
    getLivesVisible: (...a: unknown[]) => getLivesVisible(...a),
  };
});

import {
  homeCardFromPlan,
  homeFromSession,
  liveFeedFromRooms,
  planImageFromRecord,
} from "./shellData";
import { C2Home, HOME_AMBIENT_ELEMENTS } from "./C2Home";
import { avatarOf } from "./shellData";
import type { HomeProjection } from "./projections";
import type { OpalPlanContract } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PLAN: OpalPlanContract = {
  id: "plan-1",
  title: "Race night dinner",
  status: "agreed",
  location: "Juniper and Ivy",
  time_label: "Sat 7pm",
};

beforeEach(() => {
  // W21 (F1): the authenticated media fetch succeeds with a blob.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer as ArrayBuffer,
    })),
  );
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(
    () => "blob:home-social",
  );
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  listOpalPlans.mockReset();
  listTemporaryStories.mockReset();
  fetchHomeFeed.mockReset();
  getLivesVisible.mockReset();
  listTemporaryStories.mockResolvedValue({ stories: [] });
  listOpalPlans.mockResolvedValue({ plans: [] });
  fetchHomeFeed.mockResolvedValue({ mode: "live", objects: [], stories: [] });
  getLivesVisible.mockResolvedValue({ lives: [], count: 0 });
});

describe("W9 planImageFromRecord - image from the record, with provenance", () => {
  it("prefers the record-level image_url and stamps its provenance", () => {
    const img = planImageFromRecord({
      ...PLAN,
      image_url: "/venues/juniper.jpg",
      place: { photo_url: "/venues/other.jpg" },
    });
    expect(img).toEqual({ photoUrl: "/venues/juniper.jpg", provenance: "plan.image_url" });
  });

  it("falls to the place projection's photo when no record image exists", () => {
    const img = planImageFromRecord({ ...PLAN, place: { photo_url: "/venues/place.jpg" } });
    expect(img).toEqual({ photoUrl: "/venues/place.jpg", provenance: "plan.place.photo_url" });
  });

  it("never promotes an opaque media_id to an image", () => {
    expect(planImageFromRecord({ ...PLAN, media_id: "media-123" })).toBeNull();
  });

  it("rejects non-URL values and returns null (the no-image treatment)", () => {
    expect(planImageFromRecord({ ...PLAN, image_url: "juniper.jpg" })).toBeNull();
    expect(planImageFromRecord({ ...PLAN })).toBeNull();
  });
});

describe("W9 homeCardFromPlan - people from the record only", () => {
  it("carries the organizer as the one named person and who_label verbatim", () => {
    const card = homeCardFromPlan({
      ...PLAN,
      organizer_name: "Maya Chen",
      who_label: "Maya Chen and Jordan Lee",
    });
    expect(card.people).toHaveLength(1);
    expect(card.people?.[0].name).toBe("Maya Chen");
    expect(card.peopleLine).toBe("Maya Chen and Jordan Lee");
  });

  it("invents no people when the record names none", () => {
    const card = homeCardFromPlan({ ...PLAN });
    expect(card.people).toEqual([]);
    expect(card.peopleLine).toBeNull();
  });
});

describe("W9 liveFeedFromRooms - live only when truly live", () => {
  const room = {
    id: "room-1",
    status: "live",
    title: "Rooftop session",
    host_display_name: "Jordan Lee",
    place_label: "Zilker Park Rooftop",
    venue: { display_name: "Zilker Park Rooftop" },
    mine: false,
  };

  it("maps a live room with its host and its anchored place", () => {
    const cards = liveFeedFromRooms([{ live_room: room }]);
    expect(cards).toHaveLength(1);
    expect(cards[0].hostName).toBe("Jordan Lee");
    expect(cards[0].placeLabel).toBe("Zilker Park Rooftop");
    expect(cards[0].actionId).toBe("watch:room-1");
  });

  it("an ended room never renders", () => {
    expect(liveFeedFromRooms([{ live_room: { ...room, status: "ended" } }])).toEqual([]);
    expect(liveFeedFromRooms([{ live_room: { ...room, status: undefined } }])).toEqual([]);
  });

  it("a room with no place carries no invented place", () => {
    const cards = liveFeedFromRooms([
      { live_room: { id: "r2", status: "live", host_display_name: "Sam Rivera" } },
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].placeLabel).toBeNull();
    expect(cards[0].contextLine).toBe("Sam Rivera is live now");
  });
});

describe("W9 homeFromSession - composition and gating", () => {
  it("surfaces a live card only when the visible-lives read returns a live room", async () => {
    getLivesVisible.mockResolvedValue({
      lives: [
        {
          live_room: {
            id: "room-9",
            status: "live",
            host_display_name: "Jordan Lee",
            place_label: "Zilker Park Rooftop",
          },
        },
      ],
      count: 1,
    });
    const home = await homeFromSession(null, "tok");
    expect(home.feed[0].kind).toBe("live");
    getLivesVisible.mockResolvedValue({ lives: [], count: 0 });
    const quiet = await homeFromSession(null, "tok");
    expect(quiet.feed.some((f) => f.kind === "live")).toBe(false);
  });

  it("a failed lives read paints no live and does not fail the feed", async () => {
    getLivesVisible.mockRejectedValue(new Error("down"));
    const home = await homeFromSession(null, "tok");
    expect(home.feed.some((f) => f.kind === "live")).toBe(false);
    expect(home.feedError).toBeNull();
  });

  it("plans keep their states and lead moments; variety is ordered, never relabeled", async () => {
    listOpalPlans.mockResolvedValue({
      plans: [
        { ...PLAN, id: "p-forming", status: "idea", title: "Beach walk" },
        { ...PLAN, id: "p-ready", status: "ready", title: "Dinner" },
        { ...PLAN, id: "p-live", status: "live", title: "Rooftop Jazz" },
      ],
    });
    fetchHomeFeed.mockResolvedValue({
      mode: "live",
      objects: Array.from({ length: 12 }, (_, i) => ({
        id: `m-${i}`,
        object_type: "memory",
        caption: `Moment ${i}`,
        actor: { display_name: "Riley" },
      })),
      stories: [],
    });
    const home = await homeFromSession(null, "tok");
    const planIds = home.feed.filter((f) => f.kind === "plan").map((f) => f.id);
    expect(planIds).toEqual(["p-live", "p-ready", "p-forming"]);
    const states = home.feed
      .filter((f) => f.kind === "plan")
      .map((f) => (f.kind === "plan" ? f.card.stateFamily : ""));
    expect(states).toEqual(["happening", "ready", "forming"]);
  });

  it("a moment's photo comes from its media_ref, stamped with provenance", async () => {
    fetchHomeFeed.mockResolvedValue({
      mode: "live",
      objects: [
        {
          id: "post-1",
          object_type: "memory",
          caption: "Golden hour",
          actor: { display_name: "Maya Chen" },
          media_ref: "/api/v1/product/social-moments/media/abc",
        },
        {
          id: "post-2",
          object_type: "memory",
          caption: "Race night dinner",
          actor: { display_name: "Sam Rivera" },
        },
      ],
      stories: [],
    });
    const home = await homeFromSession(null, "tok");
    const withPhoto = home.feed.find((f) => f.kind === "memory" && f.id === "post-1");
    const noPhoto = home.feed.find((f) => f.kind === "memory" && f.id === "post-2");
    expect(withPhoto?.kind === "memory" && withPhoto.photoUrl).toContain("/media/abc");
    expect(withPhoto?.kind === "memory" && withPhoto.photoProvenance).toBe("moment.media_ref");
    expect(noPhoto?.kind === "memory" && noPhoto.photoUrl).toBeNull();
  });
});

let host: HTMLDivElement | null = null;
let root: Root | null = null;
async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  // W21 (F1): record media loads through AuthedImage (authenticated
  // fetch -> blob URL); let it settle so the <img> is rendered.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return host;
}
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const events = {
  openYou: () => undefined,
  openSearch: () => undefined,
  openActivity: () => undefined,
  openGraph: () => undefined,
  feedAction: () => undefined,
  onShared: () => undefined,
};

function projection(feed: HomeProjection["feed"]): HomeProjection {
  return {
    header: { ownAvatar: avatarOf("You") },
    rail: {
      self: { avatar: avatarOf("You"), hasLiveStory: false, liveStoryLabel: null },
      stories: [],
      capabilities: { canPost: true, canStory: true },
    },
    feed,
  };
}

describe("W9 C2Home render - imagery and the no-image treatment", () => {
  it("a memory with a photo renders that photo in the well", async () => {
    const el = await render(
      <C2Home
        projection={projection([
          {
            kind: "memory",
            id: "m1",
            photoUrl: "/media/pier.jpg",
            photoProvenance: "moment.media_ref",
            contextLine: "Golden hour at the pier",
            authorLine: "Maya Chen",
            authorName: "Maya Chen",
            authorAvatar: avatarOf("Maya Chen", 1),
          },
        ])}
        events={events}
      />,
    );
    const img = el.querySelector('[data-testid="c2-feed-memory-media"] img');
    // W21 (F1): the well renders the authenticated blob URL, never
    // the bearer-gated record URL itself.
    expect(img?.getAttribute("src")).toBe("blob:home-social");
    expect(img?.getAttribute("data-authed-image")).toBe("blob");
    expect(
      el.querySelector('[data-testid="c2-feed-memory-media"]')?.getAttribute("data-media-provenance"),
    ).toBe("moment.media_ref");
  });

  it("a memory without a photo renders the monogram - the caption is NEVER in the well", async () => {
    const el = await render(
      <C2Home
        projection={projection([
          {
            kind: "memory",
            id: "m2",
            photoUrl: null,
            contextLine: "Race night dinner was unreal",
            authorLine: "Sam Rivera",
            authorName: "Sam Rivera",
            authorAvatar: avatarOf("Sam Rivera", 3),
          },
        ])}
        events={events}
      />,
    );
    const well = el.querySelector('[data-testid="c2-feed-memory-media"]');
    expect(well).toBeTruthy();
    expect(well?.querySelector('[data-testid="c2-feed-memory-monogram"]')).toBeTruthy();
    expect(well?.textContent ?? "").not.toContain("Race night dinner");
    // The caption still renders exactly once, as the card's title.
    expect(el.querySelector('[data-testid="c2-feed-memory"]')?.textContent).toContain(
      "Race night dinner was unreal",
    );
  });

  it("a plan card renders the record image and its people", async () => {
    const el = await render(
      <C2Home
        projection={projection([
          {
            kind: "plan",
            id: "p1",
            card: {
              stateFamily: "forming",
              stateLabel: "Forming",
              title: "Beach walk and coffee",
              whenLine: "Time not set yet.",
              whereLine: "Oceanside Pier",
              attendanceLine: null,
              media: { photoUrl: "/venues/pier.jpg", provenance: "plan.place.photo_url" },
              people: [{ name: "Maya Chen", initials: "MC", tint: 3 }],
              peopleLine: "With Maya Chen",
            },
          },
        ])}
        events={events}
      />,
    );
    const media = el.querySelector('[data-testid="c2-plan-media"]');
    expect(media?.querySelector("img")?.getAttribute("src")).toBe("blob:home-social");
    expect(media?.getAttribute("data-media-provenance")).toBe("plan.place.photo_url");
    expect(el.querySelector('[data-testid="c2-plan-people"]')?.textContent).toContain("Maya Chen");
    expect(el.querySelector('[data-testid="c2-plan-card"]')?.getAttribute("data-plan-state")).toBe(
      "forming",
    );
  });

  it("a live card renders only from a live projection item, with its place", async () => {
    const el = await render(
      <C2Home
        projection={projection([
          {
            kind: "live",
            id: "live-r1",
            title: "Live now: rooftop session",
            contextLine: "Jordan Lee is live from Zilker Park Rooftop",
            actionLabel: "Watch",
            actionId: "watch:r1",
            hostName: "Jordan Lee",
            hostAvatar: avatarOf("Jordan Lee", 2),
            placeLabel: "Zilker Park Rooftop",
          },
        ])}
        events={events}
      />,
    );
    expect(el.querySelector('[data-testid="c2-feed-live"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="c2-live-place"]')?.textContent).toContain(
      "Zilker Park Rooftop",
    );
    const quiet = await render(<C2Home projection={projection([])} events={events} />);
    expect(quiet.querySelector('[data-testid="c2-feed-live"]')).toBeNull();
  });
});

describe("W9 ambient system - canon tokens, recorded reasons", () => {
  it("every ambient element on Home carries a one-sentence reason", () => {
    expect(HOME_AMBIENT_ELEMENTS.length).toBeGreaterThanOrEqual(5);
    for (const entry of HOME_AMBIENT_ELEMENTS) {
      expect(entry.element.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });

  it("the live treatment uses the canon happening tokens, same as plan cards", () => {
    const shellCss = readFileSync(join(process.cwd(), "src/c2/shell/c2shell.css"), "utf8");
    expect(shellCss).toContain(".c2s-live-card");
    expect(shellCss).toContain("var(--state-happening)");
    const unify = readFileSync(join(process.cwd(), "src/theme/unifyChats.css"), "utf8");
    // Forming-as-anticipation and the happening plan treatment share
    // the orb indicator family with the live card - one language.
    expect(unify).toContain("--orb-indicator-forming");
    expect(unify).toContain("--orb-indicator-happening");
    expect(shellCss).toContain("--orb-indicator-happening");
  });
});
