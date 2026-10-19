/**
 * Repair #19 W20 (JA-11) — the story rail shows the viewer's own
 * story ONCE.
 *
 * Before: the adapter hardcoded the self cell's hasLiveStory to
 * false ("Your story · Add") while the viewer's own seeded story
 * ALSO rendered as a separate named circle in the rail. Now the
 * viewer's own records feed the self cell (and can open the
 * viewer from it), the rail carries one entry per person, and
 * "Add" remains only the truly-empty case.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { homeFromSession } from "./shellData";
import type { ProductSession } from "../../api/productClient";

const SESSION = {
  user_id: "u-viewer",
  display_name: "Ethan Walker",
} as ProductSession;

const story = (id: string, authorId: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  author_user_id: authorId,
  author_name: name,
  media_ref: `/media/${id}.jpg`,
  caption: `${name} story`,
  seen: false,
  ...extra,
});

beforeEach(() => {
  listOpalPlans.mockReset().mockResolvedValue({ plans: [] });
  listTemporaryStories.mockReset();
  fetchHomeFeed.mockReset().mockResolvedValue({ objects: [] });
  getLivesVisible.mockReset().mockResolvedValue({ lives: [] });
});

describe("JA-11 — story rail dedupe at the projection", () => {
  it("the viewer's own story feeds the self cell and never appears as a named rail cell", async () => {
    listTemporaryStories.mockResolvedValue({
      stories: [
        story("s-own", "u-viewer", "Ethan Walker"),
        story("s-maya", "u-maya", "Maya Torres"),
      ],
    });
    const home = await homeFromSession(SESSION, "tok");
    expect(home.rail.self.hasLiveStory).toBe(true);
    expect(home.rail.self.story?.storyCount).toBe(1);
    expect(home.rail.self.story?.mediaUrl).toBe("/media/s-own.jpg");
    expect(home.rail.stories.map((s) => s.personName)).toEqual(["Maya Torres"]);
  });

  it("one entry per person: two stories by Maya collapse into one cell with the count", async () => {
    listTemporaryStories.mockResolvedValue({
      stories: [
        story("s-m1", "u-maya", "Maya Torres"),
        story("s-m2", "u-maya", "Maya Torres", { seen: true }),
        story("s-j1", "u-jordan", "Jordan Ellis"),
      ],
    });
    const home = await homeFromSession(SESSION, "tok");
    expect(home.rail.stories).toHaveLength(2);
    const maya = home.rail.stories.find((s) => s.personName === "Maya Torres")!;
    expect(maya.storyCount).toBe(2);
    // One unseen record keeps the cell unseen.
    expect(maya.seen).toBe(false);
    expect(maya.ringKind).toBe("unseen");
    expect(home.rail.self.hasLiveStory).toBe(false);
    expect(home.rail.self.story).toBeNull();
  });

  it("no stories at all: self cell is the Add case, rail empty", async () => {
    listTemporaryStories.mockResolvedValue({ stories: [] });
    const home = await homeFromSession(SESSION, "tok");
    expect(home.rail.self.hasLiveStory).toBe(false);
    expect(home.rail.stories).toEqual([]);
  });
});
