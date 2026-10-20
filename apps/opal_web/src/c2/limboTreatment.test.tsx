/**
 * @vitest-environment jsdom
 *
 * P14 (Founder Polish Wave, Cluster I) - LIMBO treatment pins.
 *
 * Limbo is a first-class state rendered from the backend etiquette
 * projection (limbo state + window fraction + finished per-viewer
 * copy). The treatment is the COOLING treatment: amber cooling toward
 * muted, carried also by the cooling-lines pattern channel. It is
 * never the action red - red stays reserved for true needs-you.
 *
 * Finisher repair: the rescued WIP imported `@testing-library/react`,
 * which this repo does not install (its web-full run died before ever
 * executing this file). Rewritten to the repo's render convention -
 * react-dom/client + act, exactly as planCardAtfix.test.tsx renders.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PlanCardC2, type PlanCardC2Input } from "./PlanCardC2";

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
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  host?.remove();
  host = null;
  root = null;
});

const base: PlanCardC2Input = {
  stateFamily: "forming",
  stateLabel: "Forming",
  title: "Dinner at Juniper",
  whenLine: "Saturday at 7:30 PM",
};

const limboFor = (viewerRole: string, copy: string) => ({
  state: "limbo",
  treatment: "cooling",
  patternChannel: "cooling-lines",
  windowFractionRemaining: 0.25,
  copy,
  viewerRole,
});

describe("P14 limbo - both parties, one state, two legible meanings", () => {
  it("sender view: limbo present, waiting copy, cooling pattern + fraction", async () => {
    const container = await render(
      <PlanCardC2
        input={{
          ...base,
          limbo: limboFor(
            "requester",
            "Waiting to hear back about Dinner at Juniper. We will share the answer as soon as it arrives.",
          ),
        }}
      />,
    );
    const card = container.querySelector('[data-testid="c2-plan-card"]');
    expect(card?.getAttribute("data-limbo")).toBe("limbo");
    expect(card?.getAttribute("data-limbo-viewer")).toBe("requester");
    expect((card as HTMLElement | null)?.style.getPropertyValue("--limbo-remaining")).toBe("0.25");
    const strip = container.querySelector('[data-testid="c2-plan-limbo"]');
    expect(strip?.getAttribute("data-pattern")).toBe("cooling-lines");
    expect(strip?.getAttribute("data-treatment")).toBe("cooling");
    expect(strip?.textContent).toContain("Waiting to hear back");
  });

  it("recipient view: limbo present, window-closing copy, kindly worded", async () => {
    const container = await render(
      <PlanCardC2
        input={{
          ...base,
          limbo: limboFor(
            "recipient",
            "Your answer window for Dinner at Juniper is still open. A yes or a no is plenty - either answer is a kind one.",
          ),
        }}
      />,
    );
    const card = container.querySelector('[data-testid="c2-plan-card"]');
    expect(card?.getAttribute("data-limbo")).toBe("limbo");
    expect(card?.getAttribute("data-limbo-viewer")).toBe("recipient");
    const strip = container.querySelector('[data-testid="c2-plan-limbo"]');
    expect(strip?.textContent).toContain("still open");
    expect(strip?.textContent).not.toMatch(/alarm|hurry|urgent|warning/i);
  });

  it("no limbo projection = no limbo treatment", async () => {
    const container = await render(<PlanCardC2 input={base} />);
    expect(container.querySelector('[data-testid="c2-plan-limbo"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="c2-plan-card"]')?.getAttribute("data-limbo"),
    ).toBeNull();
  });
});

describe("P14 limbo - the cooling treatment is token-driven and never action red", () => {
  const tokens = readFileSync(resolve(__dirname, "../theme/c2Tokens.css"), "utf8");
  const css = readFileSync(resolve(__dirname, "./c2.css"), "utf8");

  it("limbo tokens exist in both modes and are distinct from action + ready", () => {
    const occurrences = tokens.match(/--state-limbo:/g) ?? [];
    expect(occurrences.length).toBe(2);
    expect(tokens).toContain("--state-limbo-muted:");
    expect(tokens).toContain("--state-limbo-ink:");
  });

  it("the limbo CSS cools amber toward muted by the fraction and carries the pattern channel", () => {
    const limboCss = css.slice(css.indexOf("P14 LIMBO"), css.indexOf(".c2-plan-limbo-copy"));
    expect(limboCss).toContain("var(--state-limbo)");
    expect(limboCss).toContain("var(--state-limbo-muted)");
    expect(limboCss).toContain("var(--limbo-remaining");
    expect(limboCss).toContain("repeating-linear-gradient");
    // The non-negotiable color resolution: limbo never touches action red.
    expect(limboCss).not.toContain("--state-action");
    expect(limboCss).not.toContain("orb-indicator-action");
  });
});
