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
  it("brand assets include 160:2 symbol master and 161:2 / 161:3 lockups", () => {
    expect(BRAND.figma.symbolVisualMaster).toBe("160:2");
    expect(BRAND.figma.symbolDefective168).toBe("168:2");
    expect(BRAND.figma.typePlusTagline).toBe("161:2");
    expect(BRAND.figma.wordmarkOnly).toBe("161:3");
    expect(BRAND_ASSETS.opalGraphEmblem).toMatch(/opal-logo\.png/);
    expect(BRAND_ASSETS.graphSymbol).toMatch(/opal-logo\.png/);
    expect(BRAND_ASSETS.opalWordmark).toMatch(/opal-wordmark\.png/);
    expect(BRAND_ASSETS.opalCenterMark).toMatch(/opal-center-mark\.png/);
    expect(BRAND.figma.symbolOnlyMaster).toBe("160:2");
    expect(BRAND.figma.brandLockup).toBe("525:7");
    expect(BRAND_ASSETS.graphTypeTagline161).toMatch(/161-2/);
    expect(BRAND_ASSETS.graphWordmark161).toMatch(/161-3/);
    for (const p of [
      BRAND_ASSETS.opalGraphEmblem.replace(/^\//, ""),
      BRAND_ASSETS.opalGraphEmblemHero.replace(/^\//, ""),
      BRAND_ASSETS.opalGraphEmblemDock.replace(/^\//, ""),
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
    expect(fr).toMatch(/leaveSplashToPromise|onAdvanceToPromise/);
    // No timed splash skip into FR01
    expect(fr).not.toMatch(/setTimeout\(\(\) => setStep\("fr01"\)/);
    expect(FR_COPY.splashTap).toBe("Tap to begin");
  });

  it("founder override: Splash then top-level Promise then phone auth", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    const app = src("OpalApp.tsx");
    const css = src("styles.css");
    const promise = src("onboarding/FirstRunPromisePage.tsx");
    // Promise is NOT nested in FirstRunExperience critical path
    expect(fr).toMatch(/onAdvanceToPromise/);
    expect(fr).toMatch(/frPromise/); // historical id retained
    expect(fr).toMatch(/REMOVED from critical path|FirstRunPromisePage/);
    expect(fr).not.toMatch(/CINEMATIC_SCENE_MS/);
    expect(fr).not.toMatch(/setTimeout\(\(\) => advanceFrom\(step\)/);
    expect(fr).toMatch(/fr00-skip-intro|skipIntroToConversion/);
    expect(app).toMatch(/FirstRunPromisePage/);
    expect(app).toMatch(/firstRunStage/);
    expect(app).toMatch(/opal_force_promise/);
    expect(promise).toMatch(/opal-promise-enter|Enter Opal/);
    expect(promise).toMatch(/941|1672|20c5210f/);
    expect(css).toMatch(/\.fr-splash-tap/);
    expect(css).toMatch(/\.first-run-promise-page/);
    expect(css).toMatch(/object-fit:\s*contain/);
    expect(css).toMatch(/#6ee7f5|#6EE7F5|#00e5ff|#00E5FF|--opal-cyan/);
  });

  it("first-run route is exact FR00 through FR09 with one-step advance only", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/FIRST_RUN_ROUTE_ORDER/);
    expect(fr).toMatch(/frPromise/);
    expect(fr).toMatch(/advanceFrom\(step\)|advanceFrom\(from\)|leaveSplashToPromise/);
    expect(fr).not.toMatch(/setStep\("fr06"\).*fr00|setStep\("fr05"\).*fr00/);
  });

  it("OpalApp supports RESET_FIRST_RUN / opal_reset_first_run for founder QA", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/opal_reset_first_run|RESET_FIRST_RUN/);
    expect(app).toMatch(/clearFirstRunDone|consumeResetFirstRunFlag/);
    expect(app).toMatch(/reset-first-run/);
    expect(app).toMatch(/forcedFirstRun|opal\.forcedFirstRun/);
  });

  it("spectral Opal wordmark CSS matches 161 lockup intent", () => {
    const css = src("styles.css");
    expect(css).toMatch(/\.opal-graph-word-opal/);
    expect(css).toMatch(/#40f2ff|#7a70ff|#f273ff/);
    expect(css).toMatch(/background-clip:\s*text/);
  });

  it("founder seed is Memory-heavy and covers approved people universe", () => {
    expect(FOUNDER_GRAPH_SEED_ID).toMatch(/memory-heavy|ogsn|ogx-home/);
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
