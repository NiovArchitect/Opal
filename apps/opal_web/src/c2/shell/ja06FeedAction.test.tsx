/**
 * @vitest-environment jsdom
 *
 * Repair #19 W20 (JA-06) — no dead buttons on Home.
 *
 * The generic feed-card action button used to terminate in the
 * shell's `feedAction: () => undefined` — its only production
 * wiring — so the first real live room would have put a Watch
 * button on Home that does nothing. Watching a Live has no viewer
 * surface yet (J2's named exception), so the honest state is: no
 * wired outcome, no button.
 *
 * Pins:
 * - with NO feedAction wired (the production shell's state), live
 *   and discovery cards render NO action button;
 * - with a real feedAction wired, the button renders and clicking
 *   it terminates in the handler with the card's own ids (the
 *   click outcome is observable, not a no-op);
 * - the production shell source carries no no-op feedAction.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { C2Home, type C2HomeEvents } from "./C2Home";
import type { HomeProjection } from "./projections";
import { avatarOf } from "./shellData";

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
  host?.remove();
  host = null;
  document.body.innerHTML = "";
});

const FEED: HomeProjection["feed"] = [
  {
    kind: "live",
    id: "live-r1",
    title: "Live now: rooftop session",
    contextLine: "Jordan Lee is live from Zilker Park Rooftop",
    actionLabel: "Watch",
    actionId: "watch:r1",
    hostName: "Jordan Lee",
    hostAvatar: avatarOf("Jordan Lee", 2),
    placeLabel: "Zilker Park Rooftop",
  },
  {
    kind: "discovery",
    id: "d1",
    title: "New people near you",
    contextLine: "Three people joined this week",
    actionLabel: "Take a look",
    actionId: "discovery:people",
  },
];

function projection(): HomeProjection {
  return {
    header: { ownAvatar: avatarOf("You") },
    rail: {
      self: { avatar: avatarOf("You"), hasLiveStory: false, liveStoryLabel: null },
      stories: [],
      capabilities: { canPost: true, canStory: true },
    },
    feed: FEED,
  };
}

const baseEvents: Omit<C2HomeEvents, "feedAction"> = {
  openYou: () => undefined,
  openSearch: () => undefined,
  openActivity: () => undefined,
  openGraph: () => undefined,
  onShared: () => undefined,
};

describe("JA-06 — every Home card action terminates", () => {
  it("no wired outcome: live and discovery cards render NO action button", async () => {
    const el = await render(<C2Home projection={projection()} events={baseEvents} />);
    expect(el.querySelector('[data-testid="c2-feed-live"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="c2-feed-discovery"]')).toBeTruthy();
    expect(el.querySelectorAll(".c2s-card-action").length).toBe(0);
    expect(el.textContent).not.toContain("Watch");
  });

  it("wired outcome: clicking each card's action calls the handler with that card's ids", async () => {
    const feedAction = vi.fn();
    const el = await render(
      <C2Home projection={projection()} events={{ ...baseEvents, feedAction }} />,
    );
    const buttons = el.querySelectorAll<HTMLButtonElement>(".c2s-card-action");
    expect(buttons.length).toBe(2);
    for (const btn of Array.from(buttons)) {
      await act(async () => {
        btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });
    }
    expect(feedAction).toHaveBeenCalledTimes(2);
    expect(feedAction).toHaveBeenCalledWith("live-r1", "watch:r1");
    expect(feedAction).toHaveBeenCalledWith("d1", "discovery:people");
  });

  it("the production shell wires no no-op feedAction (source scan)", () => {
    const shell = readFileSync(resolve(__dirname, "./C2Shell.tsx"), "utf8");
    expect(shell).not.toMatch(/feedAction:\s*\(\)\s*=>\s*undefined/);
    expect(shell).not.toContain("feedAction:");
    const home = readFileSync(resolve(__dirname, "./C2Home.tsx"), "utf8");
    expect(home).toContain("feedAction?:");
  });
});
