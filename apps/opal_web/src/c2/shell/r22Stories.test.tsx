/**
 * @vitest-environment jsdom
 *
 * Repair #22 (R22-A) pins:
 *
 *  WS-1 ONE caption grammar for the whole story rail: line 1
 *       is the name, line 2 is exactly ONE state word from the
 *       closed vocabulary {Live, Loved, New, Seen, Add}, mapped
 *       1:1 from the stone state - the self door included. A
 *       live self and a live person both read "Live" (never
 *       "Live now" on one and a free-text label on the other),
 *       and a loved stone reads "Loved", not "New".
 *  WS-2 Every stone carries the orbit layer (a point of light
 *       that CSS travels around the ring, speed/brightness by
 *       state); the state itself still rides data-state, so
 *       the meaning survives with motion off.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { C2Home } from "./C2Home";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let container: HTMLElement;

async function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  container = host;
  root = createRoot(host);
  await act(async () => {
    root!.render(node);
  });
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
});

function avatarOf(name: string) {
  return { initials: name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() };
}

function story(id: string, name: string, state: "happening" | "loved" | "new" | "seen", seen: boolean) {
  return {
    id, personId: `u-${id}`, personName: name, avatar: avatarOf(name),
    mediaUrl: `/media/${id}.jpg`, caption: null, storyCount: 1, seen,
    stoneState: state,
  };
}

function projection(selfLive: boolean) {
  return {
    header: { ownAvatar: avatarOf("Sam Rivera") },
    rail: {
      self: {
        avatar: avatarOf("Sam Rivera"),
        hasLiveStory: selfLive,
        // A free-text label that MUST NOT reach the rail: the
        // grammar renders the shared state word instead.
        liveStoryLabel: "Live now at the pier",
        story: selfLive ? { storyCount: 1, mediaUrl: "/media/self.jpg", caption: null } : null,
      },
      stories: [
        story("s1", "Maya Torres", "happening", false),
        story("s2", "June Park", "loved", false),
        story("s3", "Theo Nguyen", "new", false),
        story("s4", "Ana Ruiz", "seen", true),
        story("s5", "Karl Jensen", "new", false),
        story("s6", "Priya Nair", "seen", true),
      ],
      capabilities: { canPost: true, canStory: true },
    },
    feed: [],
    feedError: null,
  };
}

const events = {
  openYou: vi.fn(), openSearch: vi.fn(), openActivity: vi.fn(),
  openGraph: vi.fn(), onShared: vi.fn(), bearer: "tok",
};

describe("R22-A WS-1 - one caption grammar across the rail", () => {
  it("every cell: name line + exactly one state word from the closed set", async () => {
    await render(<C2Home projection={projection(true) as never} events={events} />);
    const cells = container.querySelectorAll(".c2s-stone-cell");
    // The rail must work for many: self + 6 people.
    expect(cells.length).toBe(7);
    const subs = [...container.querySelectorAll('[data-testid="c2-stone-sub"]')].map(
      (el) => el.textContent,
    );
    expect(subs).toEqual(["Live", "Live", "Loved", "New", "Seen", "New", "Seen"]);
    // No second live form anywhere in the rail.
    const rail = container.querySelector('[data-testid="c2-moment-stones"]')!;
    expect(rail.textContent).not.toMatch(/Live now/);
    expect(rail.textContent).not.toMatch(/at the pier/);
    // Names stay primary and intact.
    const names = [...container.querySelectorAll(".c2s-stone-name")].map((el) => el.textContent);
    expect(names[0]).toBe("Your moment");
    expect(names[1]).toBe("Maya Torres");
  });

  it("the self door without a live moment reads Add - same one-word form", async () => {
    await render(<C2Home projection={projection(false) as never} events={events} />);
    const subs = [...container.querySelectorAll('[data-testid="c2-stone-sub"]')].map(
      (el) => el.textContent,
    );
    expect(subs[0]).toBe("Add");
    expect(subs[1]).toBe("Live");
  });
});

describe("R22-A WS-2 - the orbit layer rides every ring", () => {
  it("each stone carries orbit + dot, keyed by its data-state", async () => {
    await render(<C2Home projection={projection(true) as never} events={events} />);
    const stones = container.querySelectorAll(".c2s-stone");
    expect(stones.length).toBe(7);
    for (const stone of stones) {
      expect(stone.querySelector(".c2s-stone-orbit .c2s-stone-dot")).toBeTruthy();
      expect(stone.querySelector(".c2s-stone-ring")).toBeTruthy();
    }
    const states = [...stones].map((s) => s.getAttribute("data-state"));
    expect(states).toEqual(["happening", "happening", "loved", "new", "seen", "new", "seen"]);
  });
});
