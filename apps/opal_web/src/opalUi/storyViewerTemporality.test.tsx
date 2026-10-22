/**
 * @vitest-environment jsdom
 *
 * Repair #22 (WS-3) — the OpalApp StoryViewer's temporality,
 * verified (it existed) and pinned, including the graph-story
 * law: a story whose content is a graph/plan piece (pulseState
 * GRAPH — e.g. the trip-graph memories queue) dwells, fills its
 * progress segment, and auto-advances under the SAME law as a
 * moment story. There is no second timing regime for graph
 * content.
 *
 * All time is fake-timer time — no wall-clock sleeps.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryViewer } from "./StoryViewer";
import { IMAGE_STORY_MS } from "./storyPlayback";
import type { FounderStoryItem } from "./founderGraphSeed";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const item = (id: string, extra: Partial<FounderStoryItem> = {}): FounderStoryItem => ({
  id,
  person: "Maya",
  personInitial: "M",
  mediaSrc: `/media/${id}.jpg`,
  mediaKind: "image",
  caption: `story ${id}`,
  when: "1h",
  ...extra,
});

describe("WS-3 OpalApp viewer temporality", () => {
  // Frame-by-frame rAF simulation of three full dwells is
  // CPU-heavy under fake timers; the timeout is raised for
  // this test only (the behavior asserted is unchanged).
  it("segments per story, current fills with the 7s dwell, advance jumps, rail end exits", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const stories = [item("s1"), item("s2"), item("s3")];
    await render(<StoryViewer story={stories[0]} stories={stories} onClose={onClose} />);
    // TopLayer portals to document.body — query the document.
    const viewer = () => document.querySelector('[data-testid="story-viewer"]');
    const fills = () => [...document.querySelectorAll(".story-viewer-progress-fill")] as HTMLElement[];

    expect(viewer()?.getAttribute("data-story-id")).toBe("s1");
    expect(fills().length).toBe(3);
    expect(fills()[0].style.width).toBe("0%");

    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS / 2);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("s1");
    expect(fills()[0].style.width).toBe("50%");

    // The completing rAF frame lands a hair past the exact
    // boundary under fake timers — step one frame beyond it.
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS / 2 + 100);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("s2");
    expect(fills()[0].style.width).toBe("100%");
    expect(fills()[1].style.width).toBe("0%");

    // Each dwell gets its own act step: a single synchronous
    // timer sweep cannot chain dwells, because the next dwell's
    // rAF is armed by the effect that runs when React flushes
    // the advance — in a real browser that flush lands between
    // frames; under fake timers it lands between act steps.
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS + 100);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("s3");

    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS + 100);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("a GRAPH-pulse story (graph piece as story) dwells and advances under the same law", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const stories = [
      item("g1", { pulseState: "GRAPH", caption: "Juniper crew · who's locking 7:30?" }),
      item("m1", { pulseState: "MEMORY" }),
    ];
    await render(<StoryViewer story={stories[0]} stories={stories} onClose={onClose} />);
    const viewer = () => document.querySelector('[data-testid="story-viewer"]');
    expect(viewer()?.getAttribute("data-story-id")).toBe("g1");
    expect(document.querySelector('[data-testid="story-viewer-pulse"]')?.getAttribute("data-pulse")).toBe("GRAPH");
    // One millisecond before the dwell ends, the graph story
    // is still on stage; at the dwell it jumps like any story.
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS - 1);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("g1");
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(viewer()?.getAttribute("data-story-id")).toBe("m1");
    await act(async () => {
      vi.advanceTimersByTime(IMAGE_STORY_MS + 100);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
