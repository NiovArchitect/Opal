/**
 * @vitest-environment jsdom
 *
 * Repair #21 (W-19) - THE MARBLE MATERIAL - pins:
 *  1. The marble sphere asset exists and is the master's own grain
 *     (a real WebP with substance, derived by
 *     scripts/orb/build_marble_sphere.py from the keyed hero).
 *  2. OrbMark's marble seat renders that asset clipped to the
 *     measured sphere, under the rings; the plain mark does not.
 *  3. Marble does not apply below 24px (the small reduction) -
 *     grain cannot read at that size.
 *  4. The pad's center orb (C2Shell dock) is a marble seat; the
 *     splash master is a declared marble sighting whose settle
 *     still is the same img.
 *  5. QUIET: nothing animates the grain (no keyframes target it).
 *  6. The thread doorway button is PROTECTED: its flat fire
 *     gradient is untouched by this cluster.
 */
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ORB_ASSETS } from "./orbTokens";
import { OrbHero, OrbMark } from "./OrbMark";
import { ORB_SPHERE } from "./orbGeometry";

const webRoot = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

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

describe("R21 W-19 marble - the asset is the master's own grain", () => {
  it("marbleSphere is a real WebP with substance on disk", () => {
    const p = resolve(webRoot, "public/brand/orb/opal-marble-sphere.webp");
    const buf = readFileSync(p);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(buf.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect(statSync(p).size).toBeGreaterThan(10000);
    expect(ORB_ASSETS.marbleSphere).toBe("/brand/orb/opal-marble-sphere.webp");
  });

  it("the derivation script crops the measured sphere from the keyed hero", () => {
    const script = read("scripts/orb/build_marble_sphere.py");
    expect(script).toContain("opal-orb-hero-512.webp");
    expect(script).toContain("opal-marble-sphere.webp");
  });
});

describe("R21 W-19 marble - OrbMark seats", () => {
  it("marble renders the grain image clipped to the measured sphere", async () => {
    const el = await render(<OrbMark size={40} marble />);
    const svg = el.querySelector("svg.orb-mark")!;
    expect(svg.getAttribute("data-marble")).toBe("sphere");
    const img = svg.querySelector("image[data-marble-image]")!;
    expect(img).not.toBeNull();
    expect(img.getAttribute("href")).toBe(ORB_ASSETS.marbleSphere);
    expect(img.getAttribute("x")).toBe(String(ORB_SPHERE.cx - ORB_SPHERE.r));
    expect(img.getAttribute("y")).toBe(String(ORB_SPHERE.cy - ORB_SPHERE.r));
    expect(img.getAttribute("width")).toBe(String(ORB_SPHERE.r * 2));
    expect(img.getAttribute("clip-path")).toContain("sphere-clip");
    // The rings still render above the stone (the master's layering).
    expect(svg.querySelectorAll("ellipse").length).toBeGreaterThan(0);
    // The flat reduction's core glow must NOT bleach the grain:
    // no circle in the marble seat is filled with the core gradient.
    const fills = [...svg.querySelectorAll("circle")].map((c) => c.getAttribute("fill") ?? "");
    expect(fills.some((f) => f.includes("-core"))).toBe(false);
  });

  it("the plain mark keeps its core glow (the reduction is unchanged)", async () => {
    const el = await render(<OrbMark size={40} />);
    const svg = el.querySelector("svg.orb-mark")!;
    const fills = [...svg.querySelectorAll("circle")].map((c) => c.getAttribute("fill") ?? "");
    expect(fills.some((f) => f.includes("-core"))).toBe(true);
  });

  it("the plain mark carries no marble image (vector reduction stays)", async () => {
    const el = await render(<OrbMark size={40} />);
    const svg = el.querySelector("svg.orb-mark")!;
    expect(svg.getAttribute("data-marble")).toBeNull();
    expect(svg.querySelector("image")).toBeNull();
  });

  it("marble does not apply below 24px - the small reduction renders instead", async () => {
    const el = await render(<OrbMark size={20} marble />);
    expect(el.querySelector("image")).toBeNull();
    expect(el.querySelector("[data-orb-asset='mark-small']")).not.toBeNull();
  });

  it("OrbHero declares its marble sighting per mode variant", async () => {
    const el = await render(<OrbHero size={168} title="" />);
    const img = el.querySelector("img.orb-hero")!;
    expect(img.getAttribute("data-marble")).toMatch(/^master/);
  });
});

describe("R21 W-19 marble - the carried sightings", () => {
  it("the pad's center orb is a marble seat (C2Shell dock)", () => {
    const shell = read("src/c2/shell/C2Shell.tsx");
    expect(shell).toContain("<OrbMark size={40} marble />");
  });

  it("the splash master is a declared marble sighting (settle still = same img)", () => {
    const splash = read("src/onboarding/C2Splash1.tsx");
    expect(splash).toContain("ORB_ASSETS.masterFull");
    expect(splash).toContain('data-marble="master"');
  });

  it("QUIET: no keyframes or animation rule targets the grain", () => {
    const orbCss = read("src/brand/orb/orb.css");
    expect(orbCss).toMatch(/\[data-marble="sphere"\] image \{\s*animation: none;/);
    expect(orbCss).not.toMatch(/@keyframes[^{]*marble/);
    const mark = read("src/brand/orb/OrbMark.tsx");
    const marbleBranch = mark.slice(mark.indexOf("marble ?"), mark.indexOf("marble ?") + 700);
    expect(marbleBranch).not.toMatch(/animate|animation/);
  });

  it("the thread doorway button is protected - flat fire gradient, untouched", () => {
    const c1Css = read("src/opalUi/c1/c1.css");
    const orbRule = c1Css.slice(c1Css.indexOf(".c1-thread-opal-orb {"), c1Css.indexOf(".c1-thread-opal-orb {") + 200);
    expect(orbRule).toContain("background: var(--opal-iris-gradient)");
    expect(c1Css).not.toContain("opal-marble-sphere");
  });
});
