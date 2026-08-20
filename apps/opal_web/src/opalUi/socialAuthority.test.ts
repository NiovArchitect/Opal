import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertProductionNeverUsesFixtureCache,
  isDurableMomentId,
  productionObjectToCard,
} from "./socialAuthority";

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
});
