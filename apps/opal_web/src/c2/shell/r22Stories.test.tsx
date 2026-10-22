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
 *
 * AMENDMENT (Repair #23, R23-rail; founder charge 2026-10-21
 * 18:04): the WS-1 word map above was AMENDED by the R23
 * story-state taxonomy item. Reason: "Loved" as a caption is
 * semantically wrong - it describes the viewer's relationship
 * to the author, not the story's state, and "Seen" is the
 * viewer's history, not a state of the story. The amended
 * map: captions speak ONLY the story's own state -
 * happening -> "Live", unseen-fresh -> "New", seen -> NO
 * caption word, loved -> NO caption word, ever. The signal
 * that used to print "Loved" (traced in shellData.ts: the
 * author's relationship type on the viewer's rows - spouse /
 * partner / family / close friend; NOT viewer light) now
 * drives a warmth treatment on the ring (data-warmth="warm").
 * The self door's "Add" stays: it is the door's affordance,
 * not a caption. The pins below assert the AMENDED map.
 *
 * Repair #23 also pins here: the two-tier ring glow stamps
 * (data-glow: live and close-people stones at "attention",
 * plain new and seen stones at "rest" - the CSS half of the
 * two-tier law is pinned in r20Connect.test.tsx, amended
 * there with its provenance) and rail caption parity (one
 * caption treatment for the self name and every other name,
 * including the bond-door <button> names).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

describe("R22-A WS-1 as AMENDED by R23 - captions speak only the story's own state", () => {
  it("every cell: name line + the amended state word (Live / New / no word)", async () => {
    await render(<C2Home projection={projection(true) as never} events={events} />);
    const cells = container.querySelectorAll(".c2s-stone-cell");
    // The rail must work for many: self + 6 people.
    expect(cells.length).toBe(7);
    const subs = [...container.querySelectorAll('[data-testid="c2-stone-sub"]')].map(
      (el) => el.textContent,
    );
    // Amended map: loved (June Park) and seen (Ana Ruiz, Priya
    // Nair) render NO caption word - the line rests empty so
    // the two-line rhythm and baseline hold across the rail.
    expect(subs).toEqual(["Live", "Live", "", "New", "", "New", ""]);
    // No second live form anywhere in the rail, and neither
    // viewer-history word ever renders as a caption again.
    const rail = container.querySelector('[data-testid="c2-moment-stones"]')!;
    expect(rail.textContent).not.toMatch(/Live now/);
    expect(rail.textContent).not.toMatch(/at the pier/);
    expect(rail.textContent).not.toMatch(/Loved/);
    expect(rail.textContent).not.toMatch(/Seen/);
    // Names stay primary and intact.
    const names = [...container.querySelectorAll(".c2s-stone-name")].map((el) => el.textContent);
    expect(names[0]).toBe("Your moment");
    expect(names[1]).toBe("Maya Torres");
  });

  it("PIN R23 taxonomy: a loved-input story renders NO Loved caption and carries the ring warmth marker; a seen story renders no state word", async () => {
    await render(<C2Home projection={projection(true) as never} events={events} />);
    const stones = [...container.querySelectorAll(".c2s-stone, .c2s-stone-self")];
    const byState = (s: string) => stones.find((el) => el.getAttribute("data-state") === s)!;
    const loved = byState("loved");
    expect(loved.getAttribute("data-warmth")).toBe("warm");
    const lovedCell = loved.closest(".c2s-stone-cell")!;
    expect(lovedCell.querySelector('[data-testid="c2-stone-sub"]')!.textContent).toBe("");
    // Warmth is the loved signal's ONLY home now: no other
    // stone in this rail carries it.
    for (const el of stones) {
      if (el !== loved) expect(el.getAttribute("data-warmth")).toBeNull();
    }
    const seen = byState("seen");
    const seenCell = seen.closest(".c2s-stone-cell")!;
    expect(seenCell.querySelector('[data-testid="c2-stone-sub"]')!.textContent).toBe("");
    expect(seen.getAttribute("data-warmth")).toBeNull();
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

describe("R23 - two-tier ring glow stamps (IF-1 resolution)", () => {
  it("a plain new story and a seen story render the resting tier; a live story renders attention", async () => {
    await render(<C2Home projection={projection(true) as never} events={events} />);
    const stones = [...container.querySelectorAll(".c2s-stone, .c2s-stone-self")];
    const glowByState = new Map(stones.map((el) => [el.getAttribute("data-state"), el.getAttribute("data-glow")]));
    expect(glowByState.get("happening")).toBe("attention");
    expect(glowByState.get("new")).toBe("rest");
    expect(glowByState.get("seen")).toBe("rest");
    // The self door follows the same tier law.
    const self = container.querySelector('[data-testid="c2-stone-self"]')!;
    expect(self.getAttribute("data-glow")).toBe("attention");
  });

  it("the self door at rest (no live story) renders the resting tier", async () => {
    await render(<C2Home projection={projection(false) as never} events={events} />);
    const self = container.querySelector('[data-testid="c2-stone-self"]')!;
    expect(self.getAttribute("data-glow")).toBe("rest");
  });

  it("viewer-relevance trigger, wired: a close-people (loved-input) story renders attention - its author is the viewer's close people", async () => {
    await render(<C2Home projection={projection(true) as never} events={events} />);
    const loved = [...container.querySelectorAll(".c2s-stone")].find(
      (el) => el.getAttribute("data-state") === "loved",
    )!;
    expect(loved.getAttribute("data-glow")).toBe("attention");
    // The demonstrated-interest trigger still has no signal in
    // the rail record and stays DECLARED unwired - no stamp in
    // this suite pretends otherwise.
  });

  it("mention/response trigger, wired by Repair #24 (WS-1): a plain new story whose record flags a mention of the viewer renders attention", async () => {
    const p = projection(true) as { rail: { stories: Array<Record<string, unknown>> } };
    // Theo Nguyen is the plain "new" stone (resting at R23).
    (p.rail.stories[2] as Record<string, unknown>).viewerMentioned = true;
    await render(<C2Home projection={p as never} events={events} />);
    const theo = [...container.querySelectorAll(".c2s-stone")].find(
      (el) => el.getAttribute("data-state") === "new",
    )!;
    expect(theo.getAttribute("data-glow")).toBe("attention");
  });
});

describe("R23 - rail caption parity (one treatment rail-wide)", () => {
  it("the self name and a bond-door name resolve to the same caption class; the unlayered parity rule carries the one treatment", async () => {
    const bondEvents = { ...events, openBond: vi.fn() };
    await render(<C2Home projection={projection(true) as never} events={bondEvents} />);
    const names = [...container.querySelectorAll(".c2s-stone-name")];
    const selfName = names[0]!;
    const mayaName = names[1]!;
    // The split that caused the imbalance, documented: the self
    // name is a <p>, Maya's name is the bond-door <button>.
    expect(selfName.tagName).toBe("P");
    expect(mayaName.tagName).toBe("BUTTON");
    // Both carry the ONE caption class - no per-stone variant.
    expect(selfName.className).toContain("c2s-stone-name");
    expect(mayaName.className).toContain("c2s-stone-name");
    expect(mayaName.className).not.toMatch(/name-(self|alt|other)/);
    // jsdom loads no stylesheet, so the treatment itself is
    // pinned as CSS text (the r20Connect / r22StreamRhythm
    // precedent): the parity rule must sit UNLAYERED (after
    // the @layer block, beside the primary-button fix), where
    // the global button reset cannot beat it.
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(resolve(here, "./c2shell.css"), "utf8");
    const marker = css.indexOf("RAIL CAPTION PARITY, UNLAYERED");
    expect(marker).toBeGreaterThan(-1);
    const unlayered = css.slice(marker);
    expect(unlayered).toMatch(/\.c2s-stone-name \{\n  font: var\(--type-caption\);\n  font-weight: 600;\n  color: var\(--ink-1\);\n\}/);
    expect(unlayered).toMatch(/\.c2s-stone-sub \{\n  font-size: 11px;\n  line-height: 14px;\n  font-weight: 500;/);
    expect(unlayered).toMatch(/\.c2s-stone-name-btn \{\n  display: block;\n  width: 100%;\n\}/);
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
