/**
 * @vitest-environment jsdom
 *
 * Repair #21 - Cluster Flows Wave 2 pins (jsdom layer; the
 * rendered layer is the signature-gated capture set):
 *
 *  W-12 the bond builder is mutual by construction: chapters,
 *       next-together, places and the pair score come only from
 *       shared plans and the pair's own validated guesses; the
 *       builder's inputs carry no capsule at all.
 *  W-13/I-2 light is counts-free: the control renders a glow
 *       tier, never a numeral; the author alone sees who lit it.
 *  W-13 a reply is a door to the author's conversation.
 *  W-14/W-15 presence lights + happening first: Lives lift out
 *       of the braid to under the stones, with co-presence lights.
 *  I-1 (refined) the four doors: each branch composes its party
 *       and provenance by law - join takes the original party,
 *       solo is private with NO original party, my-people starts
 *       with none of the original party, again reads the roster
 *       at door time (needsPartyRead) through the repeat lineage.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const likeSocialMoment = vi.fn();
const unlikeSocialMoment = vi.fn();
const getMomentLight = vi.fn();
const createGraphPlan = vi.fn();
const listRelationships = vi.fn();
const listPeople = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    likeSocialMoment: (...a: unknown[]) => likeSocialMoment(...a),
    unlikeSocialMoment: (...a: unknown[]) => unlikeSocialMoment(...a),
    getMomentLight: (...a: unknown[]) => getMomentLight(...a),
    createGraphPlan: (...a: unknown[]) => createGraphPlan(...a),
    listRelationships: (...a: unknown[]) => listRelationships(...a),
    listPeople: (...a: unknown[]) => listPeople(...a),
  };
});

import { C2Home } from "./C2Home";
import { BondStone } from "./BondStone";
import { CreateFlow } from "./C2Shell";
import { bondFromPair, liveFeedFromRooms } from "./shellData";
import {
  doorsForSource,
  happeningFirst,
  lightTierFor,
  seedCreateFor,
  type MomentSeed,
  type PlanSeed,
} from "./flows2";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let container: HTMLElement;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  container = host;
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}
function q(sel: string) {
  // Sheets and flows render through the TopLayer portal at
  // document.body (stacking law), so fall back to the document.
  return container.querySelector(sel) ?? document.querySelector(sel);
}
function qa(sel: string) {
  const inContainer = [...container.querySelectorAll(sel)];
  return inContainer.length > 0 ? inContainer : [...document.querySelectorAll(sel)];
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

beforeEach(() => {
  likeSocialMoment.mockResolvedValue({ viewer_liked: true, like_count: 4 });
  unlikeSocialMoment.mockResolvedValue({ viewer_liked: false, like_count: 0 });
  getMomentLight.mockResolvedValue({
    moment_id: "m1",
    author_only_people: true,
    people: [{ user_id: "u-june", display_name: "June Park" }],
    warmth: 1,
    viewer_liked: false,
  });
  createGraphPlan.mockResolvedValue({ plan: { id: "p-new" }, participants: [] });
  listRelationships.mockResolvedValue({ contacts: [], relationships: [] });
  listPeople.mockResolvedValue({ connected: [] });
});

function avatarOf(name: string) {
  return {
    initials: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    tint: null,
  };
}

const momentSeed: MomentSeed = {
  kind: "moment",
  momentId: "m1",
  authorUserId: "u-maya",
  authorName: "Maya Chen",
  caption: "Golden hour at the bay",
  placeLabel: "The Cove",
  mine: false,
};
const planSeed: PlanSeed = {
  kind: "plan",
  planId: "p1",
  title: "Dinner at Juniper and Ivy",
  location: "Juniper and Ivy",
  placeLat: 32.7,
  placeLon: -117.1,
  planType: null,
  viewerState: null,
  organizerUserId: "u-maya",
};

describe("I-1 refined - the four doors compose by law", () => {
  it("a friend's moment offers join / solo / my-people - and never again", () => {
    expect(doorsForSource(momentSeed)).toEqual(["join", "solo", "my-people"]);
    expect(seedCreateFor(momentSeed, "again")).toBeNull();
  });

  it("join: me + the original party (the author the moment names), lineage on the moment", () => {
    const create = seedCreateFor(momentSeed, "join")!;
    expect(create.participantUserIds).toEqual(["u-maya"]);
    expect(create.inspiredByMomentId).toBe("m1");
    expect(create.audience).toBe("close_circle");
    expect(create.lockParty).toBe(true);
    expect(create.location).toBe("The Cove");
    expect(create.entry).toBe("flows-seed-join");
  });

  it("solo: PRIVATE by default and NO original-party id anywhere in the branch", () => {
    const create = seedCreateFor(momentSeed, "solo")!;
    expect(create.audience).toBe("private");
    expect(create.participantUserIds).toEqual([]);
    expect(create.participantUserIds).not.toContain("u-maya");
    // The lineage is kept (consent-scoped to the new plan's own
    // participants - here, the creator alone).
    expect(create.inspiredByMomentId).toBe("m1");
  });

  it("my-people: the original party is NOT involved - the party starts empty for my choice", () => {
    const create = seedCreateFor(momentSeed, "my-people")!;
    expect(create.participantUserIds).toEqual([]);
    expect(create.lockParty).toBe(false);
    expect(create.inspiredByMomentId).toBe("m1");
  });

  it("plan join/again read the roster at door time and ride the repeat lineage", () => {
    const join = seedCreateFor(planSeed, "join")!;
    expect(join.needsPartyRead).toBe(true);
    expect(join.sourcePlanId).toBe("p1");
    expect(join.participantUserIds).toEqual([]);
    const again = seedCreateFor(planSeed, "again")!;
    expect(again.needsPartyRead).toBe(true);
    expect(again.sourcePlanId).toBe("p1");
    expect(again.entry).toBe("flows-seed-again");
  });

  it("a viewer already in the plan is not offered join again", () => {
    expect(doorsForSource({ ...planSeed, viewerState: "going" })).toEqual([
      "solo",
      "my-people",
      "again",
    ]);
  });

  it("my own moment offers only my-people", () => {
    expect(doorsForSource({ ...momentSeed, mine: true })).toEqual(["my-people"]);
  });
});

describe("W-12 - the bond builder (mutual by construction)", () => {
  const plan = (over: Record<string, unknown>) =>
    ({
      id: "p?",
      title: "Untitled",
      status: "tentative",
      location: null,
      ...over,
    }) as never;

  it("chapters, next, places and pair score come only from shared truth", () => {
    const bond = bondFromPair({
      pair: { id: "u-maya", name: "Maya Chen" },
      viewerId: "u-me",
      relationshipLabel: "Close friend",
      shared: [
        { plan: plan({ id: "p-old", title: "Cove picnic", status: "completed", location: "The Cove" }) },
        { plan: plan({ id: "p-next", title: "Night market", status: "tentative", location: "The Cove" }) },
      ],
      guesses: [
        { guesserUserId: "u-me", subjectUserId: "u-maya", status: "validated", multiplier: 2 },
        { guesserUserId: "u-maya", subjectUserId: "u-me", status: "validated", multiplier: 1 },
        { guesserUserId: "u-me", subjectUserId: "u-maya", status: "pending", multiplier: 1 },
        { guesserUserId: "u-me", subjectUserId: "u-other", status: "validated", multiplier: 1 },
      ],
    });
    expect(bond.chapters.map((c) => c.planId)).toEqual(["p-old"]);
    expect(bond.nextTogether?.planId).toBe("p-next");
    expect(bond.sharedPlaces).toEqual(["The Cove"]);
    // Only the pair's VALIDATED guesses count: 10x2 + 10x1.
    expect(bond.pairScore).toEqual({ confirmed: 2, points: 30 });
    expect(bond.sharedPlanCount).toBe(2);
  });

  it("a pair with almost nothing gets the sparse stone - a promise, not a fabrication", () => {
    const bond = bondFromPair({
      pair: { id: "u-new", name: "New Person" },
      viewerId: "u-me",
      relationshipLabel: null,
      shared: [],
      guesses: [],
    });
    expect(bond.chapters).toEqual([]);
    expect(bond.nextTogether).toBeNull();
    expect(bond.pairScore).toBeNull();
    expect(bond.sharedPlaces).toEqual([]);
  });

  it("the Bond surface renders chapters + score for the rich pair, and only the door for the sparse pair", async () => {
    const onStartPlan = vi.fn();
    const rich = bondFromPair({
      pair: { id: "u-maya", name: "Maya Chen" },
      viewerId: "u-me",
      relationshipLabel: "Close friend",
      shared: [
        { plan: plan({ id: "p-old", title: "Cove picnic", status: "completed", location: "The Cove" }) },
      ],
      guesses: [
        { guesserUserId: "u-me", subjectUserId: "u-maya", status: "validated", multiplier: 1 },
      ],
    });
    await render(
      <BondStone bond={rich} onClose={() => {}} onStartPlan={onStartPlan} onOpenGraph={() => {}} />,
    );
    expect(q('[data-testid="c2-bond-stone"]')!.getAttribute("data-sparse")).toBeNull();
    expect(qa('[data-testid="c2-bond-chapter"]').length).toBe(1);
    expect(q('[data-testid="c2-bond-score"]')!.textContent).toMatch(/Know Me\? 10/);
    click(q('[data-testid="c2-bond-start-plan"]')!);
    expect(onStartPlan).toHaveBeenCalledWith("u-maya", "Maya Chen");

    // Unmount the rich stone before the sparse one renders - both
    // portal to document.body, so the first would shadow queries.
    if (root) await act(async () => root!.unmount());
    host?.remove();
    host = null;
    root = null;

    const sparse = bondFromPair({
      pair: { id: "u-new", name: "New Person" },
      viewerId: "u-me",
      relationshipLabel: null,
      shared: [],
      guesses: [],
    });
    await render(
      <BondStone bond={sparse} onClose={() => {}} onStartPlan={onStartPlan} />,
    );
    const stone = q('[data-testid="c2-bond-stone"]')!;
    expect(stone.getAttribute("data-sparse")).toBe("1");
    expect(qa('[data-testid="c2-bond-chapter"]').length).toBe(0);
    expect(q('[data-testid="c2-bond-score"]')).toBeNull();
    expect(q('[data-testid="c2-bond-start-plan"]')).toBeTruthy();
  });
});

const baseProjection = {
  header: { ownAvatar: avatarOf("Sam Rivera") },
  rail: {
    self: { avatar: avatarOf("Sam Rivera"), hasLiveStory: false, liveStoryLabel: null, story: null },
    stories: [],
    capabilities: { canPost: true, canStory: true },
  },
  feedError: null,
};

const memoryItem = {
  kind: "memory" as const,
  id: "m1",
  photoUrl: null,
  photoProvenance: null,
  contextLine: "Golden hour at the bay",
  authorLine: "Maya Chen",
  authorName: "Maya Chen",
  authorAvatar: avatarOf("Maya Chen"),
  authorUserId: "u-maya",
  mine: false,
  placeLabel: "The Cove",
  likeCount: 3,
  viewerLiked: false,
};

describe("W-13 / I-2 - light is counts-free, reply is a door", () => {
  it("the light control renders a glow tier and no numeral, and lights through the real endpoint", async () => {
    const seedDoor = vi.fn();
    const replyToPerson = vi.fn();
    await render(
      <C2Home
        projection={{ ...baseProjection, feed: [memoryItem] } as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
          seedDoor, replyToPerson,
        }}
      />,
    );
    const light = q('[data-testid="c2-light-heart"]')!;
    expect(light.getAttribute("data-tier")).toBe("warmer");
    expect(lightTierFor(3)).toBe("warmer");
    // F-D: light is a GLYPH - the heart carries no word at all,
    // and the lit state rides data-lit, never a label.
    expect(light.textContent).toBe("");
    expect(light.querySelector("svg")).toBeTruthy();
    expect(light.getAttribute("data-lit")).toBeNull();
    // Counts-free: no numeral anywhere in the card's action row.
    const row = light.parentElement!;
    expect(row.textContent).not.toMatch(/\d/);
    // F-F: the resting card carries GLYPHS ONLY - the heart,
    // the reply glyph, the graph-in glyph; no button farm, no
    // take tiles until the panel opens.
    expect(qa('[data-testid="c2-seed-door"]').length).toBe(0);
    expect(q('[data-testid="c2-feed-memory"]')!.textContent).not.toMatch(/Make it yours|Take it|I want in/);
    const glyph = q('[data-testid="c2-feed-doors"]')!;
    expect(glyph.textContent).toBe("");
    click(light);
    await flush();
    expect(likeSocialMoment).toHaveBeenCalledWith("m1", "tok");
    expect(q('[data-testid="c2-light-heart"]')!.getAttribute("data-lit")).toBe("1");
    // Reply is a card glyph now (F-F) - one tap, straight to
    // the author's conversation.
    click(q('[data-testid="c2-feed-reply"]')!);
    expect(replyToPerson).toHaveBeenCalledWith("u-maya");
    // The take-panel opens from graph-in; its captions are at
    // most two words each.
    click(glyph);
    expect(q('[data-testid="c2-take-panel"]')).toBeTruthy();
    for (const tile of qa('[data-testid="c2-seed-door"]')) {
      const caption = tile.querySelector(".c2s-take-caption")?.textContent ?? "";
      expect(caption.split(" ").filter(Boolean).length).toBeLessThanOrEqual(2);
    }
    // The four doors on a friend's moment (three honest ones).
    const doors = qa('[data-testid="c2-seed-door"]');
    expect(doors.map((d) => d.getAttribute("data-branch"))).toEqual([
      "join",
      "solo",
      "my-people",
    ]);
    click(doors[1]);
    expect(seedDoor).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "solo",
        audience: "private",
        participantUserIds: [],
        inspiredByMomentId: "m1",
      }),
    );
  });

  it("the author sees who lit it - and gets no reply door on their own moment", async () => {
    await render(
      <C2Home
        projection={{ ...baseProjection, feed: [{ ...memoryItem, mine: true, authorUserId: "u-me" }] } as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
          seedDoor: vi.fn(), replyToPerson: vi.fn(),
        }}
      />,
    );
    await flush();
    expect(getMomentLight).toHaveBeenCalledWith("m1", "tok");
    expect(q('[data-testid="c2-light-people"]')!.textContent).toMatch(/June Park/);
    expect(q('[data-testid="c2-feed-reply"]')).toBeNull();
    // Even with the door surface open, an own moment carries no
    // reply door - only the my-people branch of the family.
    click(q('[data-testid="c2-feed-doors"]')!);
    expect(q('[data-testid="c2-feed-reply"]')).toBeNull();
    expect(
      qa('[data-testid="c2-seed-door"]').map((d) => d.getAttribute("data-branch")),
    ).toEqual(["my-people"]);
  });
});

describe("W-14 / W-15 / I-3 - presence and happening first", () => {
  it("lives lift to the happening strip with co-presence lights; the presence strip is dead (F-B)", async () => {
    // CF2-3: the derivation states the place ONCE (in the
    // title); the context line carries the host only, and the
    // place line is not repeated below.
    const [liveItem] = liveFeedFromRooms([
      {
        live_room: {
          id: "l1",
          status: "live",
          host_display_name: "Maya Chen",
          host_account_id: "u-maya",
          venue: { display_name: "The Cove" },
        },
      },
    ]);
    expect(liveItem.title).toBe("Live at The Cove");
    expect(liveItem.contextLine).toBe("Maya Chen is live");
    expect(liveItem.placeLabel).toBeNull();
    const { happening, rest } = happeningFirst([memoryItem, liveItem] as never);
    expect(happening.map((i) => i.id)).toEqual(["live-l1"]);
    expect(rest.map((i) => i.id)).toEqual(["m1"]);

    await render(
      <C2Home
        projection={{
          ...baseProjection,
          feed: [memoryItem, liveItem],
          presence: [
            { userId: "u-maya", name: "Maya Chen", avatar: avatarOf("Maya Chen"), liveId: "l1", mine: false },
          ],
        } as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
          openBond: vi.fn(),
        }}
      />,
    );
    // F-B: the presence strip is DEAD - it duplicated her
    // story and her Live card. Presence rides the stone's ring
    // state and this Live stone, nothing else.
    expect(q('[data-testid="c2-presence"]')).toBeNull();
    expect(qa('[data-testid="c2-presence-person"]').length).toBe(0);
    const strip = q('[data-testid="c2-happening"]')!;
    expect(strip.querySelector('[data-testid="c2-feed-live"]')).toBeTruthy();
    expect(strip.querySelector('[data-testid="c2-live-presence"]')).toBeTruthy();
    // CF2-3: co-presence is a LIGHT - an orb with no letters in
    // it (the letter tile is disposed of), named for AT only.
    const orb = strip.querySelector('[data-testid="c2-live-light"]')!;
    expect(orb).toBeTruthy();
    expect(orb.textContent).toBe("");
    expect(orb.getAttribute("aria-label")).toMatch(/Maya Chen is here/);
    // The moment stays in the braid below.
    expect(q('[data-testid="c2-feed"]')!.querySelector('[data-testid="c2-feed-memory"]')).toBeTruthy();
    expect(q('[data-testid="c2-feed"]')!.querySelector('[data-testid="c2-feed-live"]')).toBeNull();
  });
});

describe("I-1 - a seeded create lands in the real graph-create path", () => {
  it("the solo branch opens locked and private, and submits its provenance", async () => {
    const onCreated = vi.fn();
    await render(
      <CreateFlow
        kind="plan"
        bearer="tok"
        conversations={[]}
        prefill={{
          title: "Golden hour at the bay",
          participantUserIds: [],
          location: "The Cove",
          audience: "private",
          inspiredByMomentId: "m1",
          entry: "flows-seed-solo",
          lockParty: true,
        }}
        onClose={() => {}}
        onCreated={onCreated}
      />,
    );
    await flush();
    expect(q('[data-testid="c2-create-who-locked"]')!.textContent).toMatch(/Just you - private/);
    expect(q('[data-testid="c2-create-who-row"]')).toBeNull();
    expect((q('[data-testid="c2-create-place"]') as HTMLInputElement).value).toBe("The Cove");
    click(q('[data-testid="c2-create-submit"]')!);
    await flush();
    expect(createGraphPlan).toHaveBeenCalledTimes(1);
    const attrs = createGraphPlan.mock.calls[0][0] as Record<string, unknown>;
    expect(attrs.audience).toBe("private");
    expect(attrs.inspired_by_moment_id).toBe("m1");
    expect(attrs.entry).toBe("flows-seed-solo");
    expect(attrs.participant_user_ids).toBeUndefined();
    expect(attrs.location).toBe("The Cove");
    expect(onCreated).toHaveBeenCalled();
  });
});

describe("Round 3 - F-A stones, T-5 trivia poster, W-17x story viewer", () => {
  const triviaFixture = {
    questions: [
      {
        id: "q1", subjectUserId: "u-maya", subjectName: "Maya Chen",
        question: "When is Maya's birthday?", factSummary: "Maya Chen's birthday is October 23",
        source: "celebration",
      },
      {
        id: "q2", subjectUserId: "u-june", subjectName: "June Park",
        question: "When is June's birthday?", factSummary: "June Park's birthday is May 4",
        source: "celebration",
      },
    ],
    mine: [
      {
        id: "g9", subjectUserId: "u-maya", subjectName: "Maya Chen",
        guesserUserId: "u-me", guesserName: null, anonymous: false,
        question: "What is Maya's go-to trail snack?", guess: "Trail mix",
        status: "validated", multiplier: 1,
      },
    ],
    aboutMe: [],
    score: { validatedCount: 1, points: 10 },
    aboutYouFact: null,
  };

  it("T-5: the poster is owned by a person, the score rides the pair line, switching re-owns it", async () => {
    await render(
      <C2Home
        projection={{ ...baseProjection, feed: [], trivia: triviaFixture } as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
        }}
      />,
    );
    const card = q('[data-testid="c2-trivia-card"]')!;
    expect(card.className).toMatch(/c2s-trivia-poster/);
    expect(card.querySelector(".c2s-trivia-title")!.textContent).toBe("Know Me? - Maya");
    // One derivation with the bond: 1 validated pair guess x1 = 10.
    expect(q('[data-testid="c2-trivia-score"]')!.textContent).toBe(
      "You & Maya - 10 points - 1 confirmed",
    );
    // The tease: a real unplayed question, face-down - opening
    // words shown, the rest withheld under the mask.
    const tease = q('[data-testid="c2-trivia-tease"]')!;
    expect(tease.textContent).toMatch(/^When is /);
    const masked = tease.querySelector(".c2s-trivia-masked")!;
    expect(masked).toBeTruthy();
    expect(masked.textContent).toMatch(/Maya's birthday\?/);
    // The round rests behind the play door (T-5): no answer
    // field at rest; Play opens the round for this pair.
    expect(q('[data-testid="c2-trivia-answer"]')).toBeNull();
    click(q('[data-testid="c2-trivia-play"]')!);
    expect(q('[data-testid="c2-trivia-answer"]')).toBeTruthy();
    // Friend switching (T-3): June's chip re-owns the card -
    // title and pair line follow; her pair has no score.
    const chips = qa('[data-testid="c2-trivia-subject"]');
    expect(chips.length).toBe(2);
    click(chips[1]);
    expect(card.querySelector(".c2s-trivia-title")!.textContent).toBe("Know Me? - June");
    expect(q('[data-testid="c2-trivia-score"]')!.textContent).toBe("You & June");
  });

  it("T-5: a pending validation is the tease, and the spectacle deepens for it", async () => {
    await render(
      <C2Home
        projection={{
          ...baseProjection,
          feed: [],
          trivia: {
            ...triviaFixture,
            aboutMe: [
              {
                id: "g7", subjectUserId: "u-me", subjectName: null,
                guesserUserId: "u-maya", guesserName: "Maya Chen", anonymous: false,
                question: "What is Sam's comfort food?", guess: "Ramen",
                status: "pending", multiplier: 1,
              },
            ],
          },
        } as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
        }}
      />,
    );
    const card = q('[data-testid="c2-trivia-card"]')!;
    expect(card.getAttribute("data-light")).toBe("validation");
    expect(q('[data-testid="c2-trivia-tease"]')!.textContent).toBe(
      "Maya answered one about you - see if Maya knows you.",
    );
    expect(q('[data-testid="c2-trivia-validation"]')).toBeTruthy();
  });

  it("F-A + W-17x: round stones carry orbit rings; the viewer opens, replies, and returns", async () => {
    const replyToPerson = vi.fn();
    await render(
      <C2Home
        projection={{
          ...baseProjection,
          feed: [memoryItem],
          rail: {
            ...baseProjection.rail,
            stories: [
              {
                id: "s1", personId: "u-maya", personName: "Maya Chen",
                avatar: avatarOf("Maya Chen"), mediaUrl: "/media/maya-story.jpg",
                caption: "Pier at golden hour", storyCount: 1, seen: false,
                stoneState: "happening",
              },
            ],
          },
        } as never}
        events={{
          openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
          openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
          replyToPerson, openBond: vi.fn(),
        }}
      />,
    );
    const stone = q('[data-testid="c2-stone"]')!;
    expect(stone.getAttribute("data-state")).toBe("happening");
    expect(stone.querySelector(".c2s-stone-ring")).toBeTruthy();
    click(stone);
    const viewer = q('[data-testid="c2-story-viewer"]')!;
    expect(viewer).toBeTruthy();
    expect(q('[data-testid="c2-story-viewer-caption"]')!.textContent).toMatch(/Pier at golden hour/);
    // The viewer's live door: Reply. The heart and take doors
    // are DECLARED for stories (D-15) - they must NOT render.
    expect(q('[data-testid="c2-story-viewer-reply"]')).toBeTruthy();
    expect(viewer.querySelector('[data-testid="c2-light-heart"]')).toBeNull();
    expect(viewer.querySelector('[data-testid="c2-feed-doors"]')).toBeNull();
    click(q('[data-testid="c2-story-viewer-reply"]')!);
    expect(replyToPerson).toHaveBeenCalledWith("u-maya");
    expect(q('[data-testid="c2-story-viewer"]')).toBeNull();
    // Exit preserves the stream: reopen and close, and the
    // braid underneath is the same tree (never unmounted).
    click(q('[data-testid="c2-stone"]')!);
    expect(q('[data-testid="c2-story-viewer"]')).toBeTruthy();
    click(q('[data-testid="c2-story-viewer-close"]')!);
    expect(q('[data-testid="c2-story-viewer"]')).toBeNull();
    expect(q('[data-testid="c2-feed-memory"]')).toBeTruthy();
    expect(q('[data-testid="c2-moment-stones"]')).toBeTruthy();
  });
});
