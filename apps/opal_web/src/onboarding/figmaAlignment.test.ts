import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, BRAND_ASSETS } from "../brand/brand";
import { FOUNDER_HOME_FEED, FOUNDER_PEOPLE, FOUNDER_GRAPH_SEED_ID } from "../opalUi/founderGraphSeed";
import { FR_COPY } from "./firstRunCopy";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "../public");

function src(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Figma alignment reset — exact authorities", () => {
  it("brand assets include 168:2 symbol and 161:2 / 161:3 lockups", () => {
    expect(BRAND.figma.symbolExactPng).toBe("168:2");
    expect(BRAND.figma.typePlusTagline).toBe("161:2");
    expect(BRAND.figma.wordmarkOnly).toBe("161:3");
    expect(BRAND_ASSETS.graphSymbol).toBe("/brand/opal-graph/symbol-transparent.png");
    expect(BRAND_ASSETS.graphTypeTagline161).toMatch(/161-2/);
    expect(BRAND_ASSETS.graphWordmark161).toMatch(/161-3/);
    for (const p of [
      BRAND_ASSETS.graphSymbol.replace(/^\//, ""),
      BRAND_ASSETS.graphTypeTagline161.replace(/^\//, ""),
      BRAND_ASSETS.graphWordmark161.replace(/^\//, ""),
    ]) {
      const abs = resolve(publicDir, p);
      expect(existsSync(abs), p).toBe(true);
      expect(statSync(abs).size, p).toBeGreaterThan(1000);
    }
  });

  it("FR00 requires Tap to begin and never auto-advances past splash", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/fr00-splash/);
    expect(fr).toMatch(/Tap to begin|FR_COPY\.splashTap/);
    expect(fr).toMatch(/advanceFrom\("fr00"\)/);
    // No timed splash skip into FR01
    expect(fr).not.toMatch(/setTimeout\(\(\) => setStep\("fr01"\)/);
    expect(FR_COPY.splashTap).toBe("Tap to begin");
  });

  it("first-run route is exact FR00 through FR09 with one-step advance only", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/FIRST_RUN_ROUTE_ORDER/);
    expect(fr).toMatch(/advanceFrom\("fr01"\)/);
    expect(fr).toMatch(/advanceFrom\("fr02"\)/);
    expect(fr).toMatch(/advanceFrom\("fr03"\)/);
    expect(fr).toMatch(/advanceFrom\("fr04"\)/);
    // Phone only after FR05 conversion gate
    expect(fr).toMatch(/if \(step !== "fr05"\) return/);
    expect(fr).not.toMatch(/setStep\("fr06"\).*fr00|setStep\("fr05"\).*fr00/);
  });

  it("OpalApp supports RESET_FIRST_RUN / opal_reset_first_run for founder QA", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/opal_reset_first_run|RESET_FIRST_RUN/);
    expect(app).toMatch(/clearFirstRunDone|consumeResetFirstRunFlag/);
    expect(app).toMatch(/reset-first-run/);
  });

  it("spectral Opal wordmark CSS matches 161 lockup intent", () => {
    const css = src("styles.css");
    expect(css).toMatch(/\.opal-graph-word-opal/);
    expect(css).toMatch(/#40f2ff|#7a70ff|#f273ff/);
    expect(css).toMatch(/background-clip:\s*text/);
  });

  it("founder seed is Memory-heavy and covers approved people universe", () => {
    expect(FOUNDER_GRAPH_SEED_ID).toMatch(/memory-heavy/);
    const memories = FOUNDER_HOME_FEED.filter((c) => c.kind === "memory");
    const graphs = FOUNDER_HOME_FEED.filter((c) => c.kind === "graph");
    expect(memories.length).toBeGreaterThanOrEqual(graphs.length);
    expect(FOUNDER_PEOPLE).toEqual([
      "Maya",
      "Jordan",
      "Chanelle",
      "Sam",
      "Alex",
      "Sabrina",
      "Nina",
      "Taylor",
      "Riley",
    ]);
    expect(FOUNDER_HOME_FEED.some((c) => c.person === "Chanelle" && c.kind === "graph")).toBe(true);
    expect(FOUNDER_HOME_FEED.some((c) => c.person === "Maya" && c.kind === "memory")).toBe(true);
  });

  it("I'd go remains soft interest (155:2)", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/onIdGoSoftInterest/);
    expect(app).not.toMatch(/onIdGo=\{onMomentDoWithPeople\}/);
  });
});
