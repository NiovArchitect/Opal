import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertProductionNeverUsesFixtureCache,
  bootstrapDurableMemories,
  ensureDemoSocialMoment,
  isAutoBootstrapMemoryCaption,
  isDurableMomentId,
  lookupHomeFeedCard,
  productionObjectToCard,
  productionStoryToItem,
  resolveHomeStories,
} from "./socialAuthority";
import { FOUNDER_STORIES } from "./founderGraphSeed";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("socialAuthority BEAM vs fixture routing", () => {
  it("recognizes durable SocialMoment UUIDs", () => {
    expect(isDurableMomentId("seed-maya-fletcher")).toBe(false);
    expect(isDurableMomentId("a1b2c3d4-e5f6-4789-a012-3456789abcde")).toBe(true);
  });

  it("maps production feed objects to Memory cards", () => {
    const card = productionObjectToCard({
      id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      object_type: "memory",
      actor: { display_name: "Maya", initial: "M", user_id: "u1" },
      caption: "Coast light",
      created_at: new Date().toISOString(),
      engagement_summary: { like_count: 3, comment_count: 1 },
    });
    expect(card.kind).toBe("memory");
    expect(card.person).toBe("Maya");
    expect(card.likeCount).toBe(3);
    expect(card.createdAt).toBeTruthy();
  });

  it("humanWhen ticks from real post time", async () => {
    const { humanWhen, resolveCardWhen, offsetMsFromWhenLabel } = await import(
      "./socialAuthority"
    );
    const fifteenMinAgo = new Date(Date.now() - 15 * 60_000).toISOString();
    expect(humanWhen(fifteenMinAgo)).toBe("15m ago");
    expect(resolveCardWhen({ createdAt: fifteenMinAgo, when: "stale" })).toBe("15m ago");
    expect(offsetMsFromWhenLabel("15m ago")).toBe(15 * 60_000);
  });

  it("OpalApp routes engagement through authoritative adapters", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/authoritativeLike/);
    expect(app).toMatch(/authoritativeAddComment/);
    expect(app).toMatch(/authoritativeForward/);
    expect(app).toMatch(/bootstrapDurableMemories/);
    expect(app).toMatch(/authoritativeCreateStory/);
  });

  it("productClient exposes Home feed and engagement APIs", () => {
    const client = readFileSync(resolve(root, "api/productClient.ts"), "utf8");
    expect(client).toMatch(/fetchHomeFeed/);
    expect(client).toMatch(/likeSocialMoment/);
    expect(client).toMatch(/addSocialMomentComment/);
    expect(client).toMatch(/createTemporaryStory/);
  });

  it("PRODUCTION_HYDRATION never uses fixture cache for non-UUID ids", () => {
    expect(
      assertProductionNeverUsesFixtureCache({
        mode: "PRODUCTION_HYDRATION",
        contentId: "seed-maya-fletcher",
      }).ok,
    ).toBe(false);
    expect(
      assertProductionNeverUsesFixtureCache({
        mode: "FOUNDER_FIXTURE",
        contentId: "seed-maya-fletcher",
      }).ok,
    ).toBe(true);
    expect(
      assertProductionNeverUsesFixtureCache({
        mode: "PRODUCTION_HYDRATION",
        contentId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      }).ok,
    ).toBe(true);
  });

  it("refuses demo auto-publish and recognizes bootstrap captions", () => {
    expect(isAutoBootstrapMemoryCaption("Published Memory from Opal Graph")).toBe(true);
    expect(isAutoBootstrapMemoryCaption("Coast light")).toBe(false);
  });

  it("bootstrapDurableMemories and ensureDemoSocialMoment do not publish", async () => {
    const cards = await bootstrapDurableMemories(["Published Memory from Opal Graph"], "tok");
    expect(cards).toEqual([]);
    const demo = await ensureDemoSocialMoment("tok");
    expect(demo).toMatchObject({ refused: true, INFERRED_MEMORY_AUTO_PUBLISHED: 0 });
  });

  it("lookupHomeFeedCard includes productionOwners.memories for UUID cards", () => {
    const prodId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    const productionMemories = [
      {
        id: prodId,
        kind: "memory" as const,
        person: "Walk A",
        personInitial: "W",
        when: "1h",
        title: "Coast light",
        detail: "Memory",
        ctaAction: "open_memory" as const,
      },
    ];
    const hit = lookupHomeFeedCard({
      cardId: prodId,
      productionMemories,
      durableMemoryCards: [],
    });
    expect(hit?.id).toBe(prodId);
    expect(hit?.person).toBe("Walk A");
    expect(
      lookupHomeFeedCard({
        cardId: "missing-uuid-0000-0000-0000-000000000000",
        productionMemories,
      }),
    ).toBeUndefined();
  });

  it("PRODUCTION_HYDRATION prefers API stories over FOUNDER_STORIES", () => {
    const apiStories = [
      productionStoryToItem({
        id: "story-prod-1",
        author_name: "Jordan Lee",
        media_ref: "/demo/moments/restaurant.jpg",
        caption: "Who's free tonight?",
        created_at: new Date().toISOString(),
      }),
    ];
    const resolved = resolveHomeStories({
      mode: "PRODUCTION_HYDRATION",
      productionStories: apiStories,
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.id).toBe("story-prod-1");
    expect(resolved[0]?.person).toBe("Jordan Lee");
    expect(resolved.some((s) => s.id.startsWith("story-chanelle"))).toBe(false);

    const fixtureFallback = resolveHomeStories({
      mode: "PRODUCTION_HYDRATION",
      productionStories: [],
    });
    expect(fixtureFallback).toEqual(FOUNDER_STORIES);
  });

  it("OpalApp engagement/detail lookup wires production memories", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/lookupHomeFeedCard/);
    expect(app).toMatch(/productionMemories:\s*productionOwners\?\.memories/);
    expect(app).toMatch(/resolveHomeStories/);
    expect(app).not.toMatch(
      /\[\.\.\.FOUNDER_HOME_FEED,\s*\.\.\.FOUNDER_LIVE_FEED,\s*\.\.\.durableMemoryCards\]\.find/,
    );
  });
});
