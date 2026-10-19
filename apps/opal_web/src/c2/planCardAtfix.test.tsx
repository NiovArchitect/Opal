/**
 * @vitest-environment jsdom
 *
 * R19 W27 (ATFIX) pins for the PlanCardC2 ambient fixes:
 *  - AT-08: an ordinary plan card carries its STATE rule (canon hue,
 *    ambient strength), never the iris FireLine - fire is reserved
 *    for lit items. Past rests with no rule at all.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PlanCardC2, litWinnerId, type PlanCardC2Input } from "./PlanCardC2";
import { C2Home } from "./shell/C2Home";
import { avatarOf } from "./shell/shellData";
import type { HomeProjection } from "./shell/projections";

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
  host?.remove();
  host = null;
  root = null;
  document.body.innerHTML = "";
});

const base: PlanCardC2Input = {
  stateFamily: "ready",
  stateLabel: "Ready",
  title: "Dinner at Juniper and Ivy",
  whenLine: "Tonight, 7 PM",
};

describe("AT-08 - fire is reserved for lit items", () => {
  it("a non-past plan card renders the state rule in its family, and NO fire line", async () => {
    await render(<PlanCardC2 input={base} />);
    const rule = document.querySelector('[data-orb="state-rule"]');
    expect(rule).not.toBeNull();
    expect(rule?.getAttribute("data-orb-state")).toBe("ready");
    expect(document.querySelector('[data-orb="fire-line"]')).toBeNull();
  });

  it("a past plan card rests: no rule, no fire", async () => {
    await render(
      <PlanCardC2 input={{ ...base, stateFamily: "past", stateLabel: "Past" }} />,
    );
    expect(document.querySelector('[data-orb="state-rule"]')).toBeNull();
    expect(document.querySelector('[data-orb="fire-line"]')).toBeNull();
  });
});

describe("AT-15 + AT-18 - ready (solid) vs happening (double ring + live pulse)", () => {
  const unify = readFileSync(
    resolve(__dirname, "../theme/unifyChats.css"),
    "utf8",
  );
  const c1 = readFileSync(resolve(__dirname, "../opalUi/c1/c1.css"), "utf8");
  it("happening cards carry the double-ring pattern on C2 and C1; ready stays solid single", () => {
    expect(unify).toContain(
      '.c2s-root .c2-plan-card[data-plan-state="happening"] {\n  border: 1px solid',
    );
    expect(unify).toContain("0 0 0 3px color-mix(in srgb, var(--orb-indicator-happening) 30%");
    expect(c1).toContain("0 0 0 3px color-mix(in srgb, var(--state-happening) 30%");
  });
  it("the happening pulse is the LIVE key (2.4s, opacity .55-1), killed under reduced motion", () => {
    expect(unify).toContain("animation: unify-happening-pulse 2.4s ease-in-out infinite");
    expect(unify).toContain("@keyframes unify-happening-pulse");
    const rm = unify.slice(unify.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rm).toContain('[data-plan-state="happening"] .orb-state-rule');
  });
});

describe("AT-10 - burst coalescence: strongest state wins the one lit slot", () => {
  it("litWinnerId: reveal priority, earliest wins ties, past never wins", () => {
    expect(
      litWinnerId([
        { id: "f", stateFamily: "forming" },
        { id: "r", stateFamily: "ready" },
        { id: "h", stateFamily: "happening" },
        { id: "a", stateFamily: "action" },
      ]),
    ).toBe("a");
    expect(
      litWinnerId([
        { id: "r1", stateFamily: "ready" },
        { id: "r2", stateFamily: "ready" },
      ]),
    ).toBe("r1");
    expect(litWinnerId([{ id: "p", stateFamily: "past" }])).toBeNull();
    expect(litWinnerId([])).toBeNull();
  });

  it("BURST FIXTURE: four lit candidates on Home render exactly one lit card", async () => {
    const card = (id: string, stateFamily: string, stateLabel: string) => ({
      kind: "plan" as const,
      id,
      card: {
        stateFamily,
        stateLabel,
        title: `Plan ${id}`,
        whenLine: "Tonight, 7 PM",
      },
    });
    const projection: HomeProjection = {
      header: { ownAvatar: avatarOf("You") },
      rail: {
        self: { avatar: avatarOf("You"), hasLiveStory: false, liveStoryLabel: null },
        stories: [],
        capabilities: { canPost: true, canStory: true },
      },
      feed: [
        card("burst-forming", "forming", "Forming"),
        card("burst-ready", "ready", "Ready"),
        card("burst-happening", "happening", "Happening"),
        card("burst-action", "action", "Action needed"),
        card("burst-past", "past", "Past"),
      ],
    };
    await render(
      <C2Home
        projection={projection}
        events={{
          openYou: () => undefined,
          openSearch: () => undefined,
          openActivity: () => undefined,
          openGraph: () => undefined,
          onShared: () => undefined,
        }}
      />,
    );
    const cards = [...document.querySelectorAll('[data-testid="c2-plan-card"]')];
    expect(cards).toHaveLength(5);
    const lit = cards.filter((c) => c.getAttribute("data-lit") === "lit");
    const capped = cards.filter((c) => c.getAttribute("data-lit") === "capped");
    expect(lit).toHaveLength(1);
    expect(lit[0]?.getAttribute("data-plan-state")).toBe("action");
    // every other non-past candidate rests at border-only (capped)
    expect(capped).toHaveLength(3);
    const past = cards.find((c) => c.getAttribute("data-plan-state") === "past");
    expect(past?.hasAttribute("data-lit")).toBe(false);
  });
});
