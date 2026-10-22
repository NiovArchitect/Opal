/**
 * @vitest-environment jsdom
 *
 * Repair #27 W27-17 - THE CLEANED MARK pin (founder ruling
 * 2026-10-22 12:30 PDT: "Clean the home-screen orb too").
 *
 * The cleaned mark - opal sphere + two golden gyroscope rings,
 * NO light points/dots on the rings - is the mark in every
 * placement. The raster placements (hero, medallion, splash
 * master-full, marble sphere, icons) all derive from the one
 * design master by the scripts in scripts/orb/, and that master
 * was replaced with the icon worker's cleaned master
 * (~/workspace/icon-orb/opal-orb-master-clean.png, 1600x1600,
 * composition-identical: ~3% of pixels differ, all at the
 * retired dot sites) and every derivation re-run. This pin
 * covers the VECTOR placement: OrbMark must draw no point-light
 * dots, and the derivation scripts must still source the single
 * design master (so the placements can never diverge).
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { OrbMark } from "./OrbMark";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("W27-17 cleaned mark", () => {
  it("OrbMark (vector placement) draws no light points on its rings", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<OrbMark size={72} />);
    });
    const svg = host.querySelector('[data-orb-asset="mark"]');
    expect(svg).not.toBeNull();
    const dots = [...(svg?.querySelectorAll("circle") ?? [])].filter(
      (c) => c.getAttribute("fill") === "var(--orb-point-light)",
    );
    expect(dots).toHaveLength(0);
    await act(async () => root.unmount());
    host.remove();
  });

  it("every raster derivation still sources the single design master", () => {
    const scriptsDir = resolve(__dirname, "../../../scripts/orb");
    for (const script of ["build_hero_assets.py", "build_splash_master.py", "build_icon_assets.py"]) {
      const src = readFileSync(resolve(scriptsDir, script), "utf8");
      expect(src, script).toContain("opal-orb-master");
    }
  });
});
