/**
 * @vitest-environment jsdom
 *
 * Repair #19 W20 (JA-12) — a failed image never collapses the
 * media well.
 *
 * Before: PlanCardC2's media well had no error fallback, so a
 * failed image left a 0-height well (the card silently lost its
 * media area); the Home memory card's well had the same hole.
 * Now: on error, both wells keep their designed height (CSS
 * min-height on the well) and render the designed no-image
 * treatment — the plan card's state stone + title initial, the
 * memory card's author monogram.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlanCardC2 } from "./PlanCardC2";
import { C2Home } from "./shell/C2Home";
import type { HomeProjection } from "./shell/projections";
import { avatarOf } from "./shell/shellData";

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
  // W21 (F1): record media now loads through AuthedImage (fetch with
  // the bearer -> blob URL). Let that settle so the <img> is in the
  // well before the error is fired, exactly as in the browser.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return host;
}

beforeEach(() => {
  // W21 (F1): the authenticated fetch succeeds (200 blob); the JA-12
  // failure under test is the rendered <img> erroring afterwards.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer as ArrayBuffer,
    })),
  );
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(
    () => "blob:ja12",
  );
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function fireError(img: Element) {
  await act(async () => {
    img.dispatchEvent(new window.Event("error", { bubbles: false }));
  });
}

describe("JA-12 — media wells survive a failed image", () => {
  it("PlanCardC2: img error swaps in the fallback treatment inside the same well", async () => {
    const el = await render(
      <PlanCardC2
        input={{
          stateFamily: "ready",
          stateLabel: "Ready",
          title: "Dinner at Juniper & Ivy",
          whenLine: "Saturday · 7:30 PM",
          media: { photoUrl: "/media/gone.jpg", provenance: "plan.image_url" },
        }}
      />,
    );
    const well = el.querySelector('[data-testid="c2-plan-media"]')!;
    expect(well.getAttribute("data-media-state")).toBe("photo");
    const img = well.querySelector("img")!;
    await fireError(img);
    expect(el.querySelector('[data-testid="c2-plan-media"]')).toBeTruthy();
    expect(
      el.querySelector('[data-testid="c2-plan-media"]')!.getAttribute("data-media-state"),
    ).toBe("fallback");
    const fallback = el.querySelector('[data-testid="c2-plan-media-fallback"]');
    expect(fallback).toBeTruthy();
    expect(fallback!.textContent).toContain("D");
    expect(el.querySelector('[data-testid="c2-plan-media"] img')).toBeNull();
  });

  it("Home memory card: img error swaps in the monogram treatment", async () => {
    const projection: HomeProjection = {
      header: { ownAvatar: avatarOf("You") },
      rail: {
        self: { avatar: avatarOf("You"), hasLiveStory: false, liveStoryLabel: null },
        stories: [],
        capabilities: { canPost: true, canStory: true },
      },
      feed: [
        {
          kind: "memory",
          id: "m1",
          photoUrl: "/media/gone.jpg",
          photoProvenance: "moment.media_ref",
          contextLine: "Golden hour at the pier",
          authorLine: "Maya Chen",
          authorName: "Maya Chen",
          authorAvatar: avatarOf("Maya Chen", 1),
        },
      ],
    };
    const el = await render(
      <C2Home
        projection={projection}
        events={{
          openYou: vi.fn(),
          openSearch: vi.fn(),
          openActivity: vi.fn(),
          openGraph: vi.fn(),
          onShared: vi.fn(),
        }}
      />,
    );
    const card = el.querySelector('[data-testid="c2-feed-memory"]')!;
    expect(card.getAttribute("data-media")).toBe("photo");
    const img = el.querySelector('[data-testid="c2-feed-memory-media"] img')!;
    await fireError(img);
    expect(
      el.querySelector('[data-testid="c2-feed-memory"]')!.getAttribute("data-media"),
    ).toBe("monogram");
    expect(el.querySelector('[data-testid="c2-feed-memory-monogram"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="c2-feed-memory-media"] img')).toBeNull();
  });
});
