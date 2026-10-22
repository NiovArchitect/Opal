/**
 * @vitest-environment jsdom
 *
 * Repair #22 (WS-3) — story temporality on the C2 Home surface.
 *
 * Before R22 the C2 story viewer was a still frame: segments
 * that never filled, no dwell, no advance — the founder's law
 * ("a real story that slowly times out based off of how long a
 * video or image is there, then it JUMPS to the next story as
 * the rail moves along; ALL stories EXPIRE") lived only in the
 * legacy OpalApp viewer. These tests pin the law where the
 * founder actually walks:
 *
 * - the rail projection drops expired stories (the record's own
 *   server expires_at) and carries every playable story per
 *   person, in rail order;
 * - the viewer dwells 7s on an image with its segment filling,
 *   jumps to the next story, crosses to the next person, and
 *   EXITS at the rail's end (never stranded);
 * - a video story advances on its media `ended` — its actual
 *   length — not on the image dwell;
 * - the open-time queue builder drops a story that expired
 *   while Home sat open.
 *
 * All time is fake-timer time or explicit instants — no
 * wall-clock sleeps.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { StoryViewerC2, storyQueueFromRail, type StoryPlayItem } from "./StoryViewerC2";
import { IMAGE_STORY_MS } from "../../opalUi/storyPlayback";
import type { ProductSession } from "../../api/productClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date("2026-10-21T12:00:00Z");
const LIVE = "2026-10-22T09:00:00Z"; // posted + 24h lifetime, still live at NOW
const DEAD = "2026-10-21T01:00:00Z"; // expired before NOW

const SESSION = {
  user_id: "u-viewer",
  display_name: "Ethan Walker",
} as ProductSession;

const story = (id: string, authorId: string, name: string, expiresAt: string) => ({
  id,
  author_user_id: authorId,
  author_name: name,
  media_ref: `/media/${id}.jpg`,
  caption: `${name} story ${id}`,
  expires_at: expiresAt,
  seen: false,
});

beforeEach(() => {
  listOpalPlans.mockReset().mockResolvedValue({ plans: [] });
  listTemporaryStories.mockReset();
  fetchHomeFeed.mockReset().mockResolvedValue({ objects: [] });
  getLivesVisible.mockReset().mockResolvedValue({ lives: [] });
});

describe("WS-3 rail projection: expiry + per-person playable items", () => {
  it("expired stories leave the rail; a person whose stories all expired has no stone", async () => {
    listTemporaryStories.mockResolvedValue({
      stories: [
        story("s-m1", "u-maya", "Maya Torres", LIVE),
        story("s-m2", "u-maya", "Maya Torres", LIVE),
        story("s-m3", "u-maya", "Maya Torres", DEAD),
        story("s-j1", "u-jordan", "Jordan Ellis", DEAD),
      ],
    });
    const home = await homeFromSession(SESSION, "tok", NOW);
    expect(home.rail.stories.map((s) => s.personName)).toEqual(["Maya Torres"]);
    const maya = home.rail.stories[0];
    // The expired record is gone from the count AND the queue.
    expect(maya.storyCount).toBe(2);
    expect(maya.items?.map((i) => i.id)).toEqual(["s-m1", "s-m2"]);
    expect(maya.items?.[0].expiresAt).toBe(LIVE);
    expect(maya.mediaUrl).toBe("/media/s-m1.jpg");
  });

  it("your own expired story is not a live story: the self cell rests at Add", async () => {
    listTemporaryStories.mockResolvedValue({
      stories: [story("s-own", "u-viewer", "Ethan Walker", DEAD)],
    });
    const home = await homeFromSession(SESSION, "tok", NOW);
    expect(home.rail.self.hasLiveStory).toBe(false);
    expect(home.rail.self.story ?? null).toBeNull();
  });

  it("your own live stories feed the self cell's playable items", async () => {
    listTemporaryStories.mockResolvedValue({
      stories: [
        story("s-own1", "u-viewer", "Ethan Walker", LIVE),
        story("s-own2", "u-viewer", "Ethan Walker", LIVE),
      ],
    });
    const home = await homeFromSession(SESSION, "tok", NOW);
    expect(home.rail.self.hasLiveStory).toBe(true);
    expect(home.rail.self.story?.items?.map((i) => i.id)).toEqual(["s-own1", "s-own2"]);
  });
});

describe("WS-3 queue builder: expired at open time never gets staged", () => {
  it("drops expired items and starts at the opened group", () => {
    const groups = [
      {
        personName: "Maya Torres",
        personId: "u-maya",
        items: [
          { id: "m1", mediaUrl: "/media/m1.jpg", caption: null, expiresAt: LIVE },
          { id: "m2", mediaUrl: "/media/m2.jpg", caption: null, expiresAt: DEAD },
        ],
      },
      {
        personName: "Jordan Ellis",
        personId: "u-jordan",
        items: [{ id: "j1", mediaUrl: "/media/j1.jpg", caption: null, expiresAt: LIVE }],
      },
    ];
    expect(storyQueueFromRail(groups, 0, NOW).map((i) => i.id)).toEqual(["m1", "j1"]);
    expect(storyQueueFromRail(groups, 1, NOW).map((i) => i.id)).toEqual(["j1"]);
    const first = storyQueueFromRail(groups, 0, NOW)[0];
    expect(first.personName).toBe("Maya Torres");
    expect(first.personId).toBe("u-maya");
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
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host = null;
  vi.useRealTimers();
});

const img = (id: string, personName: string, personId: string): StoryPlayItem => ({
  id,
  personName,
  personId,
  mediaUrl: `/media/${id}.jpg`,
  caption: `${personName} story ${id}`,
  expiresAt: LIVE,
});

describe("WS-3 viewer: dwell, filling progress, jump along the rail, clean exit", () => {
  it("an image dwells 7s with its segment filling, then jumps person to person and exits at the rail's end", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    await render(
      <StoryViewerC2
        queue={[img("m1", "Maya Torres", "u-maya"), img("m2", "Maya Torres", "u-maya"), img("j1", "Jordan Ellis", "u-jordan")]}
        onClose={onClose}
      />,
    );
    // TopLayer portals to document.body — query the document,
    // the same discipline as r21Flows2's viewer assertions.
    const viewer = () => document.querySelector('[data-testid="c2-story-viewer"]');
    const segs = () => [...document.querySelectorAll(".c2s-viewer-seg")];
    const fill = () => document.querySelector(".c2s-viewer-seg-fill") as HTMLElement | null;

    expect(viewer()?.getAttribute("data-story-id")).toBe("m1");
    expect(viewer()?.getAttribute("data-story-media")).toBe("image");
    // Maya has two stories: two segments, the first is current.
    expect(segs().length).toBe(2);
    expect(segs()[0].getAttribute("data-current")).toBe("1");
    expect(fill()?.style.width).toBe("0%");

    // Half the dwell: the segment is half full, same story.
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS / 2);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("m1");
    const p = Number(document.querySelector('[data-testid="c2-story-viewer-progress"]')?.getAttribute("data-progress"));
    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.6);
    expect(fill()?.style.width).toBe("50%");

    // Dwell ends: JUMP to Maya's next story; segment 1 is done.
    // (Fake rAF ticks on ~16ms frames, so the completing frame
    // lands a hair past the exact boundary — step one frame on.)
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS / 2 + 100);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("m2");
    expect(segs()[0].getAttribute("data-done")).toBe("1");
    expect(segs()[1].getAttribute("data-current")).toBe("1");

    // Next dwell ends: the rail moves along to Jordan (one segment).
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS + 100);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("j1");
    expect(segs().length).toBe(1);

    // Rail's end: the viewer exits — the user is never stranded.
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS + 100);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a video story advances on its actual length (media ended), not the image dwell", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    await render(
      <StoryViewerC2
        queue={[
          { id: "v1", personName: "Maya Torres", personId: "u-maya", mediaUrl: "/media/clip.mp4", caption: "clip", expiresAt: LIVE },
          img("m1", "Maya Torres", "u-maya"),
        ]}
        onClose={onClose}
      />,
    );
    const viewer = () => document.querySelector('[data-testid="c2-story-viewer"]');
    expect(viewer()?.getAttribute("data-story-media")).toBe("video");
    // Long past the image dwell, the video story is still on
    // stage: only its own end advances it.
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS * 3);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("v1");
    const video = document.querySelector("video")!;
    await act(async () => {
      video.dispatchEvent(new Event("ended"));
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("m1");
  });

  it("tap right advances now, tap left goes back, and backing past the first story exits", async () => {
    const onClose = vi.fn();
    await render(
      <StoryViewerC2
        queue={[img("m1", "Maya Torres", "u-maya"), img("m2", "Maya Torres", "u-maya")]}
        onClose={onClose}
      />,
    );
    const viewer = () => document.querySelector('[data-testid="c2-story-viewer"]');
    const well = () => document.querySelector(".c2s-viewer-media") as HTMLElement;
    // jsdom rects are 0 — give the well a real box for the
    // left/right third split.
    well().getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 600, right: 300, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    await act(async () => {
      well().dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 290 }));
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("m2");
    await act(async () => {
      well().dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 10 }));
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("m1");
    await act(async () => {
      well().dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 10 }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
