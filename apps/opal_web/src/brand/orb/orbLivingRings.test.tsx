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
 *  4. The traveler set IS the rest set (ORB_POINTS): hero points
 *     render at their rest positions inside their rings' motion,
 *     and when the living phase ends the component renders the
 *     rest branch - settled state equals rest composition.
 *  5. Differential motion: circle rotor, ellipse riders and the
 *     counter-rotating precessing arc all travel differently.
 *  6. Reduced motion RESTS the system: no animation elements at
 *     all; hero shows the measured points statically, ambient
 *     renders nothing (the mark's own points remain).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OrbLivingRings,
  buildEllipseTravelKeyframes,
  circleBaseAngleDeg,
  ellipsePoint,
  ellipseRestPhiDeg,
  ringOfPoint,
  ORB_AMBIENT_DURATIONS_MS,
  ORB_HERO_ARC_FROM_DEG,
  ORB_HERO_CIRCLE_FROM_DEG,
  ORB_HERO_DURATION_MS,
  ORB_HERO_ELLIPSE_TRAVEL_DEG,
  ORB_HERO_SETTLE_MS,
  ORB_LIVING_DELAY_MS,
} from "./OrbLivingRings";
import { ORB_HRING, ORB_POINTS, ORB_RING } from "./orbGeometry";

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

function translateOf(el: Element | null): { x: number; y: number } {
  const t = el?.getAttribute("transform") ?? "";
  const m = t.match(/translate\((-?[\d.]+)[ ,](-?[\d.]+)\)/);
  if (!m) throw new Error(`no translate on ${t}`);
  return { x: Number(m[1]), y: Number(m[2]) };
}

describe("OrbLivingRings v2 - dots ride their rings", () => {
  it("hero: no SMIL; circle points are rotor children at their rest positions", async () => {
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

    // The rotor: one finite settle run, displaced -> rest.
    const rotor = el.querySelector('[data-ring-rotor="circle"]');
    expect(rotor).not.toBeNull();
    expect(Number(rotor?.getAttribute("data-rotor-from-deg"))).toBe(ORB_HERO_CIRCLE_FROM_DEG);
    expect(Number(rotor?.getAttribute("data-rotor-to-deg"))).toBe(0);
    expect(Number(rotor?.getAttribute("data-rotor-duration-ms"))).toBe(ORB_HERO_DURATION_MS);
    expect(rotor?.getAttribute("data-rotor-iterations")).toBe("1");

    // Every circle point of the rest set rides INSIDE the rotor,
    // rendered at its exact rest position: its effective angle is
    // base + rotor by construction, and at rotor = 0 (settle) the
    // position is the rest position - it cannot leave the ring.
    const restCircle = ORB_POINTS.filter((p) => ringOfPoint(p) === "circle");
    const riders = [...(rotor?.querySelectorAll('[data-ring-point="circle"]') ?? [])];
    expect(riders).toHaveLength(restCircle.length);
    for (const rider of riders) {
      const pos = translateOf(rider);
      const base = Number(rider.getAttribute("data-base-angle-deg"));
      const rest = restCircle.find((p) => p.cx === pos.x && p.cy === pos.y);
      expect(rest, `rider at ${pos.x},${pos.y} is a rest point`).toBeTruthy();
      // The pinned base angle is the point's true rest angle on
      // the measured ring (within the geometry's rounding).
      expect(base).toBe(circleBaseAngleDeg(rest!));
      const onRing = {
        x: ORB_RING.cx + ORB_RING.r * Math.cos((base * Math.PI) / 180),
        y: ORB_RING.cy + ORB_RING.r * Math.sin((base * Math.PI) / 180),
      };
      expect(Math.hypot(onRing.x - pos.x, onRing.y - pos.y)).toBeLessThan(1);
    }
  });

  it("hero: ellipse riders carry the parametric law (rest phi, travel, duration as data)", async () => {
    mockReducedMotion(false);
    const el = await render(<OrbLivingRings variant="hero" />);
    const restEllipse = ORB_POINTS.filter((p) => ringOfPoint(p) === "ellipse");
    const riders = [...el.querySelectorAll('[data-ring-point="ellipse"]')];
    expect(riders).toHaveLength(restEllipse.length);
    for (const rider of riders) {
      const pos = translateOf(rider);
      const rest = restEllipse.find((p) => p.cx === pos.x && p.cy === pos.y);
      expect(rest).toBeTruthy();
      expect(Number(rider.getAttribute("data-rest-phi-deg"))).toBe(ellipseRestPhiDeg(rest!));
      expect(Number(rider.getAttribute("data-travel-deg"))).toBe(ORB_HERO_ELLIPSE_TRAVEL_DEG);
      expect(Number(rider.getAttribute("data-duration-ms"))).toBe(ORB_HERO_DURATION_MS);
      expect(rider.getAttribute("data-iterations")).toBe("1");
    }
    // The arc precesses AGAINST the circle rotor (opposite sign),
    // on the same finite clock, and lands faded at rest.
    const arc = el.querySelector('[data-ring-arc="circle"]');
    expect(Number(arc?.getAttribute("data-arc-from-deg"))).toBe(ORB_HERO_ARC_FROM_DEG);
    expect(Math.sign(ORB_HERO_ARC_FROM_DEG)).toBe(-Math.sign(ORB_HERO_CIRCLE_FROM_DEG));
    expect(Number(arc?.getAttribute("data-arc-duration-ms"))).toBe(ORB_HERO_DURATION_MS);
    // Differential angular travel: three distinct rates.
    const rates = new Set([
      Math.abs(ORB_HERO_CIRCLE_FROM_DEG) / ORB_HERO_DURATION_MS,
      Math.abs(ORB_HERO_ELLIPSE_TRAVEL_DEG) / ORB_HERO_DURATION_MS,
      Math.abs(ORB_HERO_ARC_FROM_DEG) / ORB_HERO_DURATION_MS,
    ]);
    expect(rates.size).toBe(3);
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
    // The settled layer is the rest branch: every rest point, at
    // its rest position, and nothing else - no rotor, no arc, no
    // riders left over.
    expect(el.querySelectorAll("[data-ring-rotor], [data-ring-arc], [data-ring-point]")).toHaveLength(0);
    const rest = el.querySelector('[data-living="points-rest"]');
    expect(rest).not.toBeNull();
    const groups = [...(rest?.querySelectorAll(":scope > g") ?? [])];
    expect(groups).toHaveLength(ORB_POINTS.length);
    const positions = groups.map((g) => translateOf(g)).map((p) => `${p.x},${p.y}`).sort();
    expect(positions).toEqual(ORB_POINTS.map((p) => `${p.cx},${p.cy}`).sort());
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

  it("reduced motion: hero rests on the measured points, no animation elements", async () => {
    mockReducedMotion(true);
    const el = await render(<OrbLivingRings variant="hero" />);
    const svg = el.querySelector('[data-orb-living-rings="hero"]');
    expect(svg?.getAttribute("data-motion")).toBe("rest");
    expect(el.querySelectorAll("animateMotion, animateTransform, animate")).toHaveLength(0);
    expect(el.querySelectorAll("[data-ring-rotor], [data-ring-arc], [data-ring-point]")).toHaveLength(0);
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
