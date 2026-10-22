/**
 * @vitest-environment jsdom
 *
 * Repair #23 (WS-23-3) - LIVE, ENTERABLE pins (audit F-2).
 * What these prove:
 *  - the Live card is a tap target: the whole card fires
 *    events.openLive with the ROOM id (not the card id, not a
 *    feedAction overload); with no openLive wired, the card is
 *    a resting article - never a dead button dressed as a door;
 *  - the watch surface renders host / place / title / elapsed
 *    from a contract-shaped GET /lives/:id record (the client
 *    mocked at the established pattern), including the base
 *    show contract's shape with no enrichment and no seed -
 *    where the record names no host, no host is invented;
 *  - presence is exactly the record's lights: the host's, and
 *    the viewer's own light shown as self beside it - never
 *    counted, no roster painted;
 *  - an ended room renders its ended state truthfully, read
 *    from the record at open (duration + ended stamp);
 *  - the JA-06 confession is gone from C2Shell.tsx, replaced
 *    by the wire it confessed missing, and the shell mounts
 *    the watch surface with its return door (Home never
 *    unmounts; close clears the surface state only).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getLive = vi.fn();

vi.mock("../../api/productClient", async () => {
  const actual = await vi.importActual<typeof import("../../api/productClient")>(
    "../../api/productClient",
  );
  return {
    ...actual,
    getLive: (...a: unknown[]) => getLive(...a),
  };
});

import { C2Home, type C2HomeEvents } from "./C2Home";
import { C2LiveWatch } from "./C2LiveWatch";
import { avatarOf } from "./shellData";
import type { HomeProjection } from "./projections";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let container: HTMLElement;

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  container = host;
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  await flush();
  return host;
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

function q(sel: string) {
  // The watch surface renders through the TopLayer portal.
  return container.querySelector(sel) ?? document.querySelector(sel);
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  document.body.innerHTML = "";
  getLive.mockReset();
});

beforeEach(() => {
  getLive.mockReset();
});

/* ------------------------------------------------------------------ */
/* The card                                                            */
/* ------------------------------------------------------------------ */

const FEED: HomeProjection["feed"] = [
  {
    kind: "live",
    id: "live-r1",
    title: "Live at Oceanside Pier",
    contextLine: "Maya Torres is live",
    actionLabel: "Watch",
    actionId: "watch:r1",
    hostName: "Maya Torres",
    hostAvatar: avatarOf("Maya Torres", 2),
    placeLabel: null,
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

const baseEvents: C2HomeEvents = {
  openYou: () => undefined,
  openSearch: () => undefined,
  openActivity: () => undefined,
  openGraph: () => undefined,
  onShared: () => undefined,
};

describe("WS-23-3 - the Live card is a destination", () => {
  it("the whole card is the tap target, firing openLive with the room id", async () => {
    const openLive = vi.fn();
    const el = await render(
      <C2Home projection={projection()} events={{ ...baseEvents, openLive }} />,
    );
    const card = el.querySelector('[data-testid="c2-feed-live"]');
    expect(card).toBeTruthy();
    expect(card!.tagName).toBe("BUTTON");
    expect(card!.getAttribute("data-live-id")).toBe("r1");
    click(card!);
    expect(openLive).toHaveBeenCalledTimes(1);
    expect(openLive).toHaveBeenCalledWith("r1");
  });

  it("with no openLive wired, the card rests as an article with no tap target", async () => {
    const el = await render(<C2Home projection={projection()} events={baseEvents} />);
    const card = el.querySelector('[data-testid="c2-feed-live"]');
    expect(card).toBeTruthy();
    expect(card!.tagName).toBe("ARTICLE");
    expect(el.querySelectorAll(".c2s-card-action").length).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* The watch surface                                                   */
/* ------------------------------------------------------------------ */

function liveRoomRecord(overrides: Record<string, unknown> = {}) {
  return {
    live_room: {
      id: "r1",
      host_account_id: "user-maya",
      venue_id: "venue-1",
      status: "live",
      heat_contribution_frozen: false,
      presence_report_count: 0,
      started_at: new Date(Date.now() - (12 * 60 + 30) * 1000).toISOString(),
      ended_at: null,
      title: "Morning market haul",
      placed: true,
      location_required: true,
      place_label: "Oceanside Pier",
      host_display_name: "Maya Torres",
      host_handle: "maya",
      mine: false,
      venue: { id: "venue-1", name: "Oceanside Pier", display_name: "Oceanside Pier" },
      ...overrides,
    },
  };
}

describe("WS-23-3 - the watch surface over the room record", () => {
  it("renders host, place, title and elapsed from the contract record", async () => {
    getLive.mockResolvedValue(liveRoomRecord());
    await render(<C2LiveWatch liveId="r1" onClose={() => undefined} />);
    expect(getLive).toHaveBeenCalledWith("r1", undefined);
    expect(q('[data-testid="c2-live-watch"]')?.getAttribute("data-status")).toBe("live");
    expect(q('[data-testid="c2-live-watch-title"]')?.textContent).toBe("Morning market haul");
    expect(q('[data-testid="c2-live-watch-host"]')?.textContent).toBe("Maya Torres is hosting");
    expect(q('[data-testid="c2-live-watch-place"]')?.textContent).toBe("At Oceanside Pier");
    expect(q('[data-testid="c2-live-watch-elapsed"]')?.textContent).toBe("12 min in");
    expect(q('[data-testid="c2-live-watch-pill"]')).toBeTruthy();
  });

  it("the viewer's light renders as self beside the host's, never counted", async () => {
    getLive.mockResolvedValue(liveRoomRecord());
    await render(<C2LiveWatch liveId="r1" onClose={() => undefined} />);
    const presence = q('[data-testid="c2-live-watch-presence"]');
    expect(presence).toBeTruthy();
    const hostLight = q('[data-testid="c2-live-watch-host-light"]');
    const selfLight = q('[data-testid="c2-live-watch-self-light"]');
    expect(hostLight).toBeTruthy();
    expect(hostLight!.getAttribute("aria-label")).toBe("Maya Torres is here");
    expect(selfLight).toBeTruthy();
    expect(selfLight!.getAttribute("aria-label")).toBe("You are here");
    // Host first, self beside it - and exactly two lights: no
    // roster, no crowd, no count anywhere on the surface.
    const lights = presence!.querySelectorAll(".c2s-live-light");
    expect(lights.length).toBe(2);
    expect(lights[0]).toBe(hostLight);
    expect(lights[1]).toBe(selfLight);
    expect(q('[data-testid="c2-live-watch"]')?.textContent).not.toMatch(/\d+\s*(watching|watchers|viewers)/i);
  });

  it("the base show contract alone: title and venue place render, no host is invented", async () => {
    // The plain LiveRoom.to_contract shape LivesController.show
    // returns - no place_label, no host_display_name, no seed.
    getLive.mockResolvedValue(
      liveRoomRecord({ place_label: undefined, host_display_name: undefined, host_handle: undefined }),
    );
    await render(<C2LiveWatch liveId="r1" onClose={() => undefined} />);
    expect(q('[data-testid="c2-live-watch-title"]')?.textContent).toBe("Morning market haul");
    expect(q('[data-testid="c2-live-watch-place"]')?.textContent).toBe("At Oceanside Pier");
    expect(q('[data-testid="c2-live-watch-host"]')).toBeNull();
    expect(q('[data-testid="c2-live-watch-host-light"]')?.getAttribute("aria-label")).toBe(
      "The host is here",
    );
  });

  it("an ended room renders its ended state truthfully from the record", async () => {
    const started = Date.now() - 40 * 60 * 1000;
    const ended = Date.now() - 16 * 60 * 1000;
    getLive.mockResolvedValue(
      liveRoomRecord({
        status: "ended",
        started_at: new Date(started).toISOString(),
        ended_at: new Date(ended).toISOString(),
      }),
    );
    await render(<C2LiveWatch liveId="r1" onClose={() => undefined} />);
    expect(q('[data-testid="c2-live-watch"]')?.getAttribute("data-status")).toBe("ended");
    expect(q('[data-testid="c2-live-watch-ended"]')).toBeTruthy();
    expect(q('[data-testid="c2-live-watch-ended-line"]')?.textContent).toBe(
      "This live has ended.",
    );
    expect(q('[data-testid="c2-live-watch-duration"]')?.textContent).toBe("Ran 24 min");
    expect(q('[data-testid="c2-live-watch-ended-at"]')?.textContent).toContain("Ended");
    // No live presence is painted for a room that is not live.
    expect(q('[data-testid="c2-live-watch-presence"]')).toBeNull();
    expect(q('[data-testid="c2-live-watch-pill"]')).toBeNull();
  });

  it("a failed load shows its error and a retry, never a painted room", async () => {
    getLive.mockRejectedValue(new Error("down"));
    await render(<C2LiveWatch liveId="r1" onClose={() => undefined} />);
    expect(q('[data-testid="c2-live-watch-error"]')).toBeTruthy();
    expect(q('[data-testid="c2-live-watch-title"]')).toBeNull();
  });

  it("exit fires onClose - the return door back to Flows", async () => {
    getLive.mockResolvedValue(liveRoomRecord());
    const onClose = vi.fn();
    await render(<C2LiveWatch liveId="r1" onClose={onClose} />);
    const close = q('[data-testid="c2-live-watch-close"]');
    expect(close).toBeTruthy();
    click(close!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/* The shell wire (source pins)                                        */
/* ------------------------------------------------------------------ */

describe("WS-23-3 - the shell wire replaced the confession", () => {
  const shell = readFileSync(resolve(__dirname, "./C2Shell.tsx"), "utf8");
  const home = readFileSync(resolve(__dirname, "./C2Home.tsx"), "utf8");

  it("the JA-06 confession is gone from C2Shell.tsx", () => {
    expect(shell).not.toContain("there is no live viewer");
    expect(shell).not.toContain("no feedAction is wired");
    expect(shell).not.toMatch(/JA-06: no/);
  });

  it("openLive is wired in the shell and declared in the Home contract", () => {
    expect(home).toContain("openLive?:");
    expect(shell).toContain("openLive:");
    expect(shell).toContain("onOpenLive={(liveId, seed) => setLiveWatch({ liveId, seed })}");
  });

  it("the watch surface is mounted with doors-with-return", () => {
    expect(shell).toContain("<C2LiveWatch");
    expect(shell).toContain("onClose={() => setLiveWatch(null)}");
  });
});
