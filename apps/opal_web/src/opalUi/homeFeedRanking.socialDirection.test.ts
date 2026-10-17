/**
 * Repair #15 (DF) - SOCIAL_DIRECTION guard for Home ranking.
 *
 * Direction: Opal social is Moments anchored to real plans, people, and
 * places - not an open attention feed. Ranking may order eligible cards
 * by relationship, recency, kind, and place relevance. It must never
 * reward engagement: like/comment counts do not buy position.
 * (Counts still render truthfully on cards when the backend reports
 * them; they just hold no ranking power.)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { FounderFeedCard } from "./founderGraphSeed";
import { rankEligibleFeed, scoreCard } from "./homeFeedRanking";

const here = dirname(fileURLToPath(import.meta.url));
const rankingSrc = readFileSync(join(here, "homeFeedRanking.ts"), "utf8");

function card(overrides: Partial<FounderFeedCard>): FounderFeedCard {
  return {
    id: "card-1",
    kind: "memory",
    person: "Maya",
    personInitial: "M",
    when: "2h ago",
    title: "Golden hour hike",
    detail: "Memory",
    ...overrides,
  } as FounderFeedCard;
}

describe("Home ranking - no attention term (SOCIAL_DIRECTION)", () => {
  it("scoreCard source contains no engagement-count term", () => {
    expect(rankingSrc).not.toMatch(/likeCount/);
    expect(rankingSrc).not.toMatch(/commentCount/);
    expect(rankingSrc).not.toMatch(/repostCount/);
  });

  it("a card with huge engagement scores the same as the identical quiet card", () => {
    const quiet = card({ id: "quiet", likeCount: 0, commentCount: 0 });
    const loud = card({ id: "loud", likeCount: 12000, commentCount: 400 });
    const ctx = { relationshipNames: ["Maya"], followingNames: [] as string[] };
    expect(scoreCard(loud, ctx, [], [])).toBe(scoreCard(quiet, ctx, [], []));
  });

  it("relationship still outranks a stranger card with huge engagement", () => {
    const friend = card({ id: "friend", person: "Maya", likeCount: 0 });
    const stranger = card({ id: "stranger", person: "Unknown", likeCount: 99999, commentCount: 999 });
    const ranked = rankEligibleFeed([stranger, friend], {
      relationshipNames: ["Maya"],
      followingNames: [],
    });
    expect(ranked[0]?.id).toBe("friend");
  });
});
