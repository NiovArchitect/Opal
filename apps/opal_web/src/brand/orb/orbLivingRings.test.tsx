/**
 * @vitest-environment jsdom
 *
 * Repair #19 - SPLASH ANIMATION v2 - the living rings pins:
 *  1. One shared system, two intensities (hero over the master,
 *     ambient in the dock) - same measured geometry (orbGeometry).
 *  2. NO SMIL anywhere (v1's jagged root cause): all motion is
 *     CSS transforms - rotors for the circular ring, sampled
 *     parametric keyframes for the ellipse riders.
 *  3. DOTS RIDE THEIR RINGS, structurally: circle points are
 *     children of the rotor group (point angle = base angle +
 *     rotor angle); ellipse riders' CSS keyframes are samples of
 *     the ring's parametric equation (every sample ON the ellipse,
 *     final sample = the rest point exactly - the committed CSS
 *     is parsed and pinned to the generating law).
 *  4. SUPERSEDED for the hero by W27-17 (founder ruling
 *     2026-10-22 12:30 PDT - the cleaned mark everywhere): the
 *     hero carries NO ring points in motion, at rest, or settled;
 *     the precessing arc (the ring's own lit metal) is the hero's
 *     only moving element, and the settled frame is the cleaned
 *     still beneath. The AMBIENT instrument keeps its travelers -
 *     they carry live plan-state color, they are not the logo's
 *     decorative lights.
 *  5. Differential motion: circle rotor, ellipse riders and the
 *     counter-rotating precessing arc all travel differently.
 *  6. Reduced motion RESTS the system: no animation elements at
 *     all; hero and ambient both render nothing (the cleaned
 *     mark beneath speaks alone).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OrbLivingRings,
  orbAmbientStateFromFamilies,
  buildEllipseTravelKeyframes,
  ellipsePoint,
  ORB_AMBIENT_DURATIONS_MS,
  ORB_HERO_ARC_FROM_DEG,
  ORB_HERO_CIRCLE_FROM_DEG,
  ORB_HERO_DURATION_MS,
  ORB_HERO_ELLIPSE_TRAVEL_DEG,
  ORB_HERO_SETTLE_MS,
  ORB_LIVING_DELAY_MS,
} from "./OrbLivingRings";
import { ORB_HRING } from "./orbGeometry";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const orbCss = readFileSync(resolve(__dirname, "orb.css"), "utf8");

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
  vi.useRealTimers();
});

describe("OrbLivingRings v2 - dots ride their rings (ambient); hero cleaned (W27-17)", () => {
  it("hero: no SMIL and NO ring points anywhere (W27-17 cleaned mark)", async () => {
    mockReducedMotion(false);
    const el = await render(<OrbLivingRings variant="hero" />);
    const svg = el.querySelector('[data-orb-living-rings="hero"]');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("data-motion")).toBe("living");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 200 200");
    // v1's jagged mechanism is gone: zero SMIL animation elements.
    expect(el.querySelectorAll("animateMotion, animateTransform, animate")).toHaveLength(0);
    // No structure of its own: no ring circles/ellipses redrawn.
    expect(svg?.querySelectorAll("circle[fill='none'], ellipse")).toHaveLength(0);
    // W27-17: the hero renders no points, no rotor, no riders -
    // the cleaned master beneath is the whole mark.
    expect(el.querySelectorAll("[data-ring-point]")).toHaveLength(0);
    expect(el.querySelector('[data-ring-rotor="circle"]')).toBeNull();
    expect(el.querySelector('[data-ring-riders="ellipse"]')).toBeNull();
    expect(svg?.querySelectorAll("circle")).toHaveLength(0);
  });

  it("hero: the precessing arc still carries the rings' rotation, on the finite clock", async () => {
    mockReducedMotion(false);
    const el = await render(<OrbLivingRings variant="hero" />);
    // The arc precesses AGAINST the (retired) circle rotor's
    // direction (opposite sign), on the same finite clock, and
    // lands faded at rest - it is the ring's own lit metal, the
    // one moving element the cleaned mark keeps on the splash.
    const arc = el.querySelector('[data-ring-arc="circle"]');
    expect(arc).not.toBeNull();
    expect(Number(arc?.getAttribute("data-arc-from-deg"))).toBe(ORB_HERO_ARC_FROM_DEG);
    expect(Math.sign(ORB_HERO_ARC_FROM_DEG)).toBe(-Math.sign(ORB_HERO_CIRCLE_FROM_DEG));
    expect(Number(arc?.getAttribute("data-arc-duration-ms"))).toBe(ORB_HERO_DURATION_MS);
    expect(arc?.getAttribute("data-arc-iterations")).toBe("1");
  });

  it("ellipse keyframe builder: every sample lies ON the ring; the last is the rest point", () => {
    for (const restPhi of [0, 180]) {
      const frames = buildEllipseTravelKeyframes(restPhi, ORB_HERO_ELLIPSE_TRAVEL_DEG);
      expect(frames.length).toBe(41);
      for (const f of frames) {
        const ex = (f.cx - ORB_HRING.cx) / ORB_HRING.rx;
        const ey = (f.cy - ORB_HRING.cy) / ORB_HRING.ry;
        // On the measured ellipse to float precision - the point
        // is a function of phi alone and cannot leave the ring.
        expect(Math.abs(ex * ex + ey * ey - 1)).toBeLessThan(1e-9);
        expect(f.transform).toContain("translate(");
      }
      // Starts displaced by exactly the travel (the opposite end
      // for a -180deg travel) and lands exactly on rest.
      const start = ellipsePoint(restPhi + ORB_HERO_ELLIPSE_TRAVEL_DEG);
      expect(frames[0].cx).toBeCloseTo(start.cx, 9);
      expect(frames[0].cy).toBeCloseTo(start.cy, 9);
      const rest = ellipsePoint(restPhi);
      const last = frames[frames.length - 1];
      expect(last.cx).toBe(rest.cx);
      expect(last.cy).toBe(rest.cy);
      expect(last.offset).toBe(1);
      // The settle profile is monotonic in phi (never reverses).
      for (let i = 1; i < frames.length; i += 1) {
        expect(frames[i].offset).toBeGreaterThan(frames[i - 1].offset);
      }
    }
  });

  it("committed CSS ellipse keyframes ARE the parametric law (parsed + pinned)", () => {
    // Extract one @keyframes block's (offset%, x, y) samples.
    const parseBlock = (name: string) => {
      const start = orbCss.indexOf(`@keyframes ${name}`);
      expect(start, `${name} exists in orb.css`).toBeGreaterThanOrEqual(0);
      const body = orbCss.slice(start, orbCss.indexOf("\n}", start));
      const samples = [...body.matchAll(/([\d.]+)%\s*\{\s*transform:\s*translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/g)].map(
        (m) => ({ pct: Number(m[1]), x: Number(m[2]), y: Number(m[3]) }),
      );
      return samples;
    };
    const cases: Array<{ name: string; restPhi: number; travel: number; profile: "settle" | "lap" }> = [
      { name: "orb-ellipse-hero-0", restPhi: 0, travel: ORB_HERO_ELLIPSE_TRAVEL_DEG, profile: "settle" },
      { name: "orb-ellipse-hero-180", restPhi: 180, travel: ORB_HERO_ELLIPSE_TRAVEL_DEG, profile: "settle" },
      { name: "orb-ellipse-ambient-0", restPhi: 0, travel: -360, profile: "lap" },
    ];
    for (const c of cases) {
      const samples = parseBlock(c.name);
      const law = buildEllipseTravelKeyframes(c.restPhi, c.travel, 40, c.profile);
      expect(samples).toHaveLength(law.length);
      samples.forEach((s, i) => {
        expect(s.pct).toBeCloseTo(law[i].offset * 100, 1);
        // The committed sample equals the law's sample exactly
        // (both rounded to 3dp) - the CSS cannot drift off-ring.
        expect(s.x).toBe(Math.round(law[i].cx * 1000) / 1000);
        expect(s.y).toBe(Math.round(law[i].cy * 1000) / 1000);
        // And independently: the sample lies on the ellipse.
        const ex = (s.x - ORB_HRING.cx) / ORB_HRING.rx;
        const ey = (s.y - ORB_HRING.cy) / ORB_HRING.ry;
        expect(Math.abs(ex * ex + ey * ey - 1)).toBeLessThan(0.002);
      });
      // Hero riders land on their rest endpoints; the lap rider
      // starts and ends at its rest point.
      const rest = ellipsePoint(c.restPhi);
      const last = samples[samples.length - 1];
      expect(last.x).toBe(Math.round(rest.cx * 1000) / 1000);
      expect(last.y).toBe(Math.round(rest.cy * 1000) / 1000);
      // Rider classes wire the right keyframes at the right clocks.
      expect(orbCss).toContain(`animation: ${c.name} ${c.profile === "lap" ? "72s linear infinite" : "15s linear 0.45s both"}`);
    }
  });

  it("hero SETTLES into the rest composition (settled DOM == reduced-motion DOM)", async () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    const el = await render(<OrbLivingRings variant="hero" />);
    const svg = () => el.querySelector('[data-orb-living-rings="hero"]');
    expect(svg()?.getAttribute("data-motion")).toBe("living");
    // Not yet settled one millisecond before the settle instant.
    await act(async () => {
      vi.advanceTimersByTime(ORB_HERO_SETTLE_MS - 1);
    });
    expect(svg()?.getAttribute("data-motion")).toBe("living");
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(svg()?.getAttribute("data-motion")).toBe("settled");
    // The settled layer is the rest branch, and W27-17's rest
    // branch renders NOTHING: no rotor, no arc, no riders, and no
    // rest points - the settled frame is the cleaned still
    // beneath, exactly.
    expect(el.querySelectorAll("[data-ring-rotor], [data-ring-arc], [data-ring-point]")).toHaveLength(0);
    expect(el.querySelector('[data-living="points-rest"]')).toBeNull();
    expect(el.querySelectorAll("circle")).toHaveLength(0);
    expect(ORB_HERO_SETTLE_MS).toBe(ORB_LIVING_DELAY_MS + ORB_HERO_DURATION_MS);
  });

  it("ambient: the same riding system, indefinite, fewer travelers, slower laps", async () => {
    mockReducedMotion(false);
    const el = await render(<OrbLivingRings variant="ambient" />);
    const svg = el.querySelector('[data-orb-living-rings="ambient"]');
    expect(svg?.getAttribute("data-motion")).toBe("living");
    expect(el.querySelectorAll("animateMotion, animateTransform, animate")).toHaveLength(0);
    const rotor = el.querySelector('[data-ring-rotor="circle"]');
    expect(rotor?.getAttribute("data-rotor-iterations")).toBe("infinite");
    expect(Number(rotor?.getAttribute("data-rotor-duration-ms"))).toBe(ORB_AMBIENT_DURATIONS_MS.circle);
    expect(rotor?.querySelectorAll('[data-ring-point="circle"]')).toHaveLength(2);
    const riders = [...el.querySelectorAll('[data-ring-point="ellipse"]')];
    expect(riders).toHaveLength(1);
    expect(riders[0].getAttribute("data-iterations")).toBe("infinite");
    expect(Number(riders[0].getAttribute("data-duration-ms"))).toBe(ORB_AMBIENT_DURATIONS_MS.ellipse);
    const arc = el.querySelector('[data-ring-arc="circle"]');
    expect(arc?.getAttribute("data-arc-iterations")).toBe("infinite");
    // QUIET: every ambient lap is at least 60s.
    for (const d of Object.values(ORB_AMBIENT_DURATIONS_MS)) expect(d).toBeGreaterThanOrEqual(60_000);
  });

  it("CSS law: rotors are transform-only, centered on the ring, pausable, rest-exact", () => {
    expect(orbCss).toContain("@keyframes orb-rotor-settle-circle");
    expect(orbCss).toContain("rotate(-60deg)");
    expect(orbCss).toContain("rotate(0deg)");
    // transform-origin is the measured ring center in viewBox units.
    expect(orbCss).toContain("transform-box: view-box");
    expect(orbCss).toContain("transform-origin: 101px 100px");
    expect(orbCss).toContain("will-change: transform");
    // The hero rotor runs the full living phase once, after the beat.
    expect(orbCss).toContain("orb-rotor-settle-circle 15s");
    expect(orbCss).toContain("0.45s both");
    // The arc lands faded out (rest composition carries no arc).
    expect(orbCss).toContain("@keyframes orb-arc-settle");
    // Pause law for hidden / off-screen.
    expect(orbCss).toContain('[data-paused="true"]');
    expect(orbCss).toContain("animation-play-state: paused");
  });

  it("reduced motion: hero rests to nothing (W27-17 - the cleaned still speaks alone)", async () => {
    mockReducedMotion(true);
    const el = await render(<OrbLivingRings variant="hero" />);
    const svg = el.querySelector('[data-orb-living-rings="hero"]');
    expect(svg?.getAttribute("data-motion")).toBe("rest");
    expect(el.querySelectorAll("animateMotion, animateTransform, animate")).toHaveLength(0);
    expect(el.querySelectorAll("[data-ring-rotor], [data-ring-arc], [data-ring-point]")).toHaveLength(0);
    expect(el.querySelector('[data-living="points-rest"]')).toBeNull();
    expect(el.querySelectorAll("circle")).toHaveLength(0);
  });

  it("reduced motion: ambient rests to nothing", async () => {
    mockReducedMotion(true);
    const el = await render(<OrbLivingRings variant="ambient" />);
    const svg = el.querySelector('[data-orb-living-rings="ambient"]');
    expect(svg?.getAttribute("data-motion")).toBe("rest");
    expect(el.querySelectorAll("animateMotion, animateTransform, circle")).toHaveLength(0);
  });
});

describe("AT-06 (R19 W27) - ambient rings are state-keyed, never state-blind", () => {
  it("strongest live family wins by reveal priority; past/empty rest", () => {
    expect(orbAmbientStateFromFamilies(["forming", "ready"])).toBe("ready");
    expect(orbAmbientStateFromFamilies(["ready", "happening"])).toBe("happening");
    expect(orbAmbientStateFromFamilies(["happening", "action"])).toBe("action");
    expect(orbAmbientStateFromFamilies(["past", "past"])).toBeNull();
    expect(orbAmbientStateFromFamilies([])).toBeNull();
    expect(orbAmbientStateFromFamilies([null, undefined])).toBeNull();
  });

  it("ambient renders data-ambient-state=rest with no live state, the family with one", async () => {
    mockReducedMotion(false);
    const quiet = await render(<OrbLivingRings variant="ambient" />);
    expect(
      quiet.querySelector('[data-orb-living-rings="ambient"]')?.getAttribute("data-ambient-state"),
    ).toBe("rest");
    const live = await render(<OrbLivingRings variant="ambient" liveState="ready" />);
    expect(
      live.querySelector('[data-orb-living-rings="ambient"]')?.getAttribute("data-ambient-state"),
    ).toBe("ready");
  });

  it("the rest signature slows every lap 4x in CSS; live families tint the arc", () => {
    expect(orbCss).toContain('.orb-living-rings[data-ambient-state="rest"] .orb-ring-rotor--ambient');
    expect(orbCss).toContain("animation-duration: 384s");
    expect(orbCss).toContain("animation-duration: 288s");
    expect(orbCss).toContain("animation-duration: 640s");
    for (const family of ["action", "happening", "ready", "forming"]) {
      expect(orbCss).toContain(
        `.orb-living-rings[data-ambient-state="${family}"] .orb-ring-arc path { stroke: var(--orb-indicator-${family}); }`,
      );
    }
  });
});
