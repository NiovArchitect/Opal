import { describe, expect, it } from "vitest";
import {
  composeHomeFeed,
  consequenceCardsFromSignals,
  productionOwnersPresent,
  resolveHomeHydrationSource,
} from "./homeHydration";
import { FOUNDER_HOME_FEED, FOUNDER_LIVE_FEED } from "./founderGraphSeed";
import { isCardEligible, rankEligibleFeed, feedProofRows } from "./homeFeedRanking";
import {
  authorizeContentAccess,
  addComment,
  listComments,
  loadEngagement,
  toggleLike,
} from "./homeEngagementStore";

describe("homeHydration production vs fixture boundary", () => {
  it("founder seed on stays FOUNDER_FIXTURE even if production owners exist", () => {
    const mixed = composeHomeFeed({
      founderSeedEnabled: true,
      production: {
        memories: [
          {
            id: "prod-mem-1",
            kind: "memory",
            person: "ProdPerson",
            personInitial: "P",
            when: "1h",
            title: "Production memory",
            detail: "Memory",
            ctaAction: "open_memory",
          },
        ],
        followGraph: { followingNames: ["ProdPerson"] },
      },
    });
    expect(mixed.mode).toBe("FOUNDER_FIXTURE");
    expect(mixed.cards.some((c) => c.id.startsWith("seed-"))).toBe(true);
    expect(mixed.cards.some((c) => c.id === "prod-mem-1")).toBe(false);
  });

  it("production_owners mode never includes founder seed cards", () => {
    const prod = composeHomeFeed({
      founderSeedEnabled: false,
      production: {
        memories: [
          {
            id: "prod-mem-1",
            kind: "memory",
            person: "ProdPerson",
            personInitial: "P",
            when: "1h",
            title: "Production memory",
            detail: "Memory",
            ctaAction: "open_memory",
          },
        ],
        followGraph: { followingNames: ["ProdPerson"] },
      },
    });
    expect(prod.mode).toBe("PRODUCTION_HYDRATION");
    expect(prod.cards.every((c) => c.sourceOwner === "production_owners")).toBe(true);
    expect(prod.cards.some((c) => c.id.startsWith("seed-"))).toBe(false);
  });

  it("fixture mode uses seed when production empty", () => {
    const fix = composeHomeFeed({ founderSeedEnabled: true, production: null });
    expect(fix.mode).toBe("FOUNDER_FIXTURE");
    expect(fix.cards.length).toBeGreaterThanOrEqual(20);
  });

  it("resolveHomeHydrationSource prefers production when present", () => {
    expect(
      resolveHomeHydrationSource({
        founderSeedEnabled: true,
        production: { memories: [{ id: "x" } as never] },
      }),
    ).toBe("production_owners");
    expect(productionOwnersPresent(null)).toBe(false);
  });

  it("conversation consequences map from authorized signal fields", () => {
    const cards = consequenceCardsFromSignals(
      [
        {
          conversation_id: "c1",
          label: "Dinner lined up",
          shared_reality: { where: "Juniper & Ivy", when: "Saturday · 7:30 PM" },
        },
      ],
      new Map([["c1", "Chanelle"]]),
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.kind).toBe("consequence");
    expect(cards[0]?.person).toBe("Chanelle");
  });
});

describe("homeFeedRanking eligibility-before-ranking", () => {
  it("never ranks private cards for unauthorized viewers", () => {
    const privateCard = {
      ...FOUNDER_HOME_FEED[0]!,
      id: "private-x",
      person: "Secret",
      visibility: "private",
    } as (typeof FOUNDER_HOME_FEED)[0] & { visibility: string };
    expect(isCardEligible(privateCard, { relationshipNames: [] })).toBe(false);
    expect(isCardEligible(privateCard, { relationshipNames: ["Secret"] })).toBe(true);
    const ranked = rankEligibleFeed(
      [...FOUNDER_HOME_FEED.slice(0, 3), privateCard],
      { relationshipNames: [] },
    );
    expect(ranked.some((c) => c.id === "private-x")).toBe(false);
  });

  it("produces proof rows for ≥20 founder stream objects", () => {
    const ranked = rankEligibleFeed([...FOUNDER_HOME_FEED, ...FOUNDER_LIVE_FEED], {
      relationshipNames: ["Chanelle", "Maya", "Jordan"],
      followingNames: ["Sabrina"],
    });
    expect(ranked.length).toBeGreaterThanOrEqual(20);
    const rows = feedProofRows(ranked, {
      relationshipNames: ["Chanelle", "Maya", "Jordan"],
      followingNames: ["Sabrina"],
    });
    expect(rows[0]?.position).toBe(1);
    expect(new Set(rows.map((r) => r.owner)).size).toBeGreaterThan(5);
  });
});

describe("homeEngagementStore authorization", () => {
  it("denies private comment/like for unauthorized stranger", () => {
    const meta = {
      id: "priv-mem",
      visibility: "private" as const,
      ownerName: "Chanelle",
      allowedViewerNames: ["Sadeil"],
    };
    const denied = authorizeContentAccess(meta, {
      userId: "e-stranger",
      displayName: "Eve",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe("DENIED");

    let state = loadEngagement();
    const like = toggleLike(state, meta, { userId: "e-stranger", displayName: "Eve" });
    expect(like.result.ok).toBe(false);
    const comment = addComment(state, meta, { userId: "e-stranger", displayName: "Eve" }, "hi");
    expect(comment.result.ok).toBe(false);
    const listed = listComments(state, meta, { userId: "e-stranger", displayName: "Eve" });
    expect(listed.result.ok).toBe(false);
    expect(listed.comments).toHaveLength(0);
  });

  it("allows relationship peer to comment private content", () => {
    const meta = {
      id: "priv-mem-2",
      visibility: "private" as const,
      ownerName: "Chanelle",
      allowedViewerNames: ["Sadeil"],
    };
    let state = loadEngagement();
    const res = addComment(
      state,
      meta,
      { userId: "u-sadeil", displayName: "Sadeil" },
      "See you there",
    );
    expect(res.result.ok).toBe(true);
    expect(res.comment?.body).toMatch(/See you/);
  });
});
