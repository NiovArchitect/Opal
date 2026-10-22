/**
 * Repair #22 (WS-3) — story temporality, the pure law.
 *
 * Pins the values and decisions both story viewers share:
 * the image dwell, video = actual length, expiry judged from
 * the story's own server expires_at, and the rail-order queue.
 * Every clock is an argument — no wall-clock sleeps anywhere.
 */
import { describe, expect, it } from "vitest";
import {
  IMAGE_STORY_MS,
  STORY_LIFETIME_DEFAULT_MS,
  buildStoryQueue,
  isStoryExpired,
  isVideoStorySrc,
  liveStories,
  storyDwellMs,
  storyMediaKind,
} from "./storyPlayback";

describe("WS-3 dwell law", () => {
  it("an image story holds the defined dwell: 7 seconds", () => {
    expect(IMAGE_STORY_MS).toBe(7000);
    expect(storyDwellMs("image")).toBe(7000);
    // A stray duration never changes the image dwell.
    expect(storyDwellMs("image", 60_000)).toBe(7000);
  });

  it("a video story dwells for its actual length", () => {
    expect(storyDwellMs("video", 12_340)).toBe(12_340);
    expect(storyDwellMs("video", 900)).toBe(900);
    // Duration unknown: null — the viewer advances on the
    // media element's `ended`, which is still the actual length.
    expect(storyDwellMs("video")).toBeNull();
    expect(storyDwellMs("video", 0)).toBeNull();
    expect(storyDwellMs("video", Number.NaN)).toBeNull();
  });

  it("media kind: declared wins, otherwise the ref's extension decides", () => {
    expect(isVideoStorySrc("/media/clip.mp4")).toBe(true);
    expect(isVideoStorySrc("https://x.test/a.webm?sig=1")).toBe(true);
    expect(isVideoStorySrc("/media/photo.jpg")).toBe(false);
    expect(isVideoStorySrc("/api/v1/product/social-moments/media/abc")).toBe(false);
    expect(isVideoStorySrc(undefined)).toBe(false);
    expect(storyMediaKind("/media/clip.mov")).toBe("video");
    expect(storyMediaKind("/media/photo.png")).toBe("image");
    expect(storyMediaKind("/media/photo.png", "video")).toBe("video");
    expect(storyMediaKind("/media/clip.mp4", "image")).toBe("image");
  });
});

describe("WS-3 expiry law", () => {
  const now = new Date("2026-10-21T12:00:00Z");

  it("the default lifetime is 24 hours from posting", () => {
    expect(STORY_LIFETIME_DEFAULT_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("a story is expired at and after its expires_at", () => {
    expect(isStoryExpired("2026-10-21T11:59:59Z", now)).toBe(true);
    expect(isStoryExpired("2026-10-21T12:00:00Z", now)).toBe(true);
    expect(isStoryExpired("2026-10-21T12:00:01Z", now)).toBe(false);
    expect(isStoryExpired("2026-10-22T12:00:00Z", now)).toBe(false);
  });

  it("absent or unparseable expiry is not expired — the server list is the authority", () => {
    expect(isStoryExpired(null, now)).toBe(false);
    expect(isStoryExpired(undefined, now)).toBe(false);
    expect(isStoryExpired("not-a-date", now)).toBe(false);
  });

  it("liveStories drops the expired and keeps the order of the rest", () => {
    const items = [
      { id: "a", expiresAt: "2026-10-22T00:00:00Z" },
      { id: "b", expiresAt: "2026-10-20T00:00:00Z" },
      { id: "c" },
      { id: "d", expiresAt: "2026-10-21T13:00:00Z" },
    ];
    expect(liveStories(items, now).map((s) => s.id)).toEqual(["a", "c", "d"]);
  });
});

describe("WS-3 rail-order queue", () => {
  const groups = [["a1", "a2"], ["b1"], ["c1", "c2"]];

  it("flattens from the opened group to the rail's end, in rail order", () => {
    expect(buildStoryQueue(groups, 0)).toEqual(["a1", "a2", "b1", "c1", "c2"]);
    expect(buildStoryQueue(groups, 1)).toEqual(["b1", "c1", "c2"]);
    expect(buildStoryQueue(groups, 2)).toEqual(["c1", "c2"]);
  });

  it("never wraps and never strands: an out-of-range start clamps to the last group", () => {
    expect(buildStoryQueue(groups, 9)).toEqual(["c1", "c2"]);
    expect(buildStoryQueue([], 0)).toEqual([]);
  });
});
