import { describe, expect, it } from "vitest";
import { clampFieldCards, fieldIsFeed, originLabel, presentField } from "./experienceField";

describe("experienceField presentation Pass 29", () => {
  it("clamps density — not a feed", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ moment_id: `m${i}` }));
    expect(clampFieldCards(many, 3)).toHaveLength(3);
    expect(fieldIsFeed(many)).toBe(true);
    expect(fieldIsFeed(clampFieldCards(many, 3))).toBe(false);
  });

  it("following origin is soft; friend has no badge", () => {
    expect(originLabel({ from_followed_creator: true })).toBe("Following");
    expect(originLabel({ from_friend: true })).toBeNull();
  });

  it("presentField preserves not-feed law", () => {
    const v = presentField({
      cards: [{ moment_id: "a" }, { moment_id: "b" }, { moment_id: "c" }, { moment_id: "d" }],
      candidate_count: 1000,
      visible_cap: 3,
      editorial_hierarchy: { dominant: "a", secondary: "b" },
    });
    expect(v.not_a_feed_engine).toBe(true);
    expect(v.not_home_attention).toBe(true);
    expect(v.card_count).toBe(3);
    expect(v.candidate_count).toBe(1000);
  });
});
