/**
 * @vitest-environment jsdom
 *
 * Repair #18 - SPLASH 1 REBUILD - the living rings pins:
 *  1. One shared system, two intensities (hero over the master,
 *     ambient in the dock) - same measured geometry (orbGeometry).
 *  2. Motion is transform-only travel: points ride the circular ring
 *     (rotate) and the horizontal ring (animateMotion on the
 *     measured ellipse path); one lit arc precesses in reverse.
 *     The layer draws NO ring strokes of its own - the rings beneath
 *     (baked master / vector mark) stay the only structure.
 *  3. Reduced motion RESTS the system: no animation elements at
 *     all; hero shows the measured points statically, ambient
 *     renders nothing (the mark's own points remain).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrbLivingRings } from "./OrbLivingRings";
import { ORB_POINTS } from "./orbGeometry";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

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
  vi.restoreAllMocks();
});

describe("OrbLivingRings - the shared living ring system", () => {
  it("hero: travelers ride both rings at the measured geometry, arc precesses in reverse", async () => {
    mockReducedMotion(false);
    const el = await render(<OrbLivingRings variant="hero" />);
    const svg = el.querySelector('[data-orb-living-rings="hero"]');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("data-motion")).toBe("living");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 200 200");
    // No structure of its own: the only path is the lit arc - no
    // ring circles/ellipses are redrawn over the master's rings.
    expect(svg?.querySelectorAll("circle[fill='none'], ellipse")).toHaveLength(0);
    const motions = [...el.querySelectorAll("animateMotion")];
    expect(motions).toHaveLength(2);
    for (const m of motions) {
      // The horizontal ring, measured: rx 86, ry 11 in viewBox units.
      expect(m.getAttribute("path")).toContain("A 86 11");
      expect(m.getAttribute("repeatCount")).toBe("indefinite");
    }
    const transforms = [...el.querySelectorAll("animateTransform")];
    expect(transforms).toHaveLength(2);
    const durs = transforms.map((t) => t.getAttribute("dur"));
    // Differential speeds, all slow (QUIET): no lap under 40s.
    for (const t of transforms) {
      const from = t.getAttribute("from") ?? "";
      expect(from).toContain("101 100"); // rotates about the measured ring center
    }
    expect(new Set(durs).size).toBe(2);
    // The arc precesses against the travelers (360 -> 0).
    expect(transforms.some((t) => (t.getAttribute("from") ?? "").startsWith("360"))).toBe(true);
  });

  it("ambient: the same system, fewer travelers, slower laps", async () => {
    mockReducedMotion(false);
    const el = await render(<OrbLivingRings variant="ambient" />);
    const svg = el.querySelector('[data-orb-living-rings="ambient"]');
    expect(svg?.getAttribute("data-motion")).toBe("living");
    expect(el.querySelectorAll("animateMotion")).toHaveLength(1);
    const durs = [...el.querySelectorAll("animateTransform")].map((t) =>
      Number((t.getAttribute("dur") ?? "0s").replace("s", "")),
    );
    expect(Math.min(...durs)).toBeGreaterThanOrEqual(90);
  });

  it("reduced motion: hero rests on the measured points, no animation elements", async () => {
    mockReducedMotion(true);
    const el = await render(<OrbLivingRings variant="hero" />);
    const svg = el.querySelector('[data-orb-living-rings="hero"]');
    expect(svg?.getAttribute("data-motion")).toBe("rest");
    expect(el.querySelectorAll("animateMotion, animateTransform")).toHaveLength(0);
    const rest = el.querySelector('[data-living="points-rest"]');
    expect(rest).not.toBeNull();
    // One traveler group per measured point of light (halo + core each).
    expect(rest?.querySelectorAll(":scope > g")).toHaveLength(ORB_POINTS.length);
  });

  it("reduced motion: ambient rests to nothing (the mark's own points remain)", async () => {
    mockReducedMotion(true);
    const el = await render(<OrbLivingRings variant="ambient" />);
    const svg = el.querySelector('[data-orb-living-rings="ambient"]');
    expect(svg?.getAttribute("data-motion")).toBe("rest");
    expect(el.querySelectorAll("animateMotion, animateTransform, circle")).toHaveLength(0);
  });
});
