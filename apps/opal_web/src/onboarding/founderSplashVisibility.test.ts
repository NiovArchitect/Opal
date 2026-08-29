/**
 * P0-05.9 — FOUNDER_RESET_SPLASH_PRIMARY_CONTENT_VISIBLE
 * A 390×844 frost-only backdrop must NEVER pass as Splash.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(__dirname, "../..");
const repoRoot = resolve(__dirname, "../../../..");

function src(rel: string) {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("P0-05.9 founder Splash primary content visibility", () => {
  it("Splash is a top-level FirstRunSplashPage owner (Promise lesson)", () => {
    const app = src("OpalApp.tsx");
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    expect(splash).toMatch(/data-figma-authority="618:19"/);
    expect(splash).toMatch(/data-splash-owner="FirstRunSplashPage"/);
    expect(splash).toMatch(/fr00-tap-begin/);
    expect(splash).toMatch(/OPAL/);
    expect(splash).toMatch(/TALK\. ALIGN\. GO\./);
    expect(splash).not.toMatch(/initial=\{[^}]*opacity:\s*0/);
    expect(app).toMatch(/FirstRunSplashPage/);
    expect(app).toMatch(/firstRunStage === "splash"/);
    expect(app).toMatch(/app-first-run-splash/);
    // Auth path must not remount nested fr00 Splash under forced first-run
    expect(app).toMatch(/mode=\{firstRunMode\}/);
    expect(app).toMatch(/firstRunMode = "sign_in"/);
  });

  it("force Splash isolation exists without ambient/fr-void wrappers", () => {
    const main = src("main.tsx");
    expect(main).toMatch(/opal_force_splash/);
    expect(main).toMatch(/SplashIsolationProbe|FirstRunSplashPage/);
  });

  it("FOUNDER_RESET_SPLASH_PRIMARY_CONTENT_VISIBLE semantic guard", () => {
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    for (const needle of [
      "fr00-splash-emblem",
      "fr00-splash-wordmark",
      "opal-graph-tagline",
      "fr00-skip-intro",
      "fr00-tap-begin",
      "fr00-already-account",
    ]) {
      expect(splash, needle).toMatch(new RegExp(needle));
    }
  });

  it("Promise remains a separate top-level stage (no Splash regression into Promise)", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/FirstRunPromisePage/);
    expect(app).toMatch(/firstRunStage === "promise"/);
    const promise = src("onboarding/FirstRunPromisePage.tsx");
    expect(promise).toMatch(/opal-promise-exact|first-run-promise/);
  });

  it("invalidates frost-only geometry-as-pass thinking in authority notes", () => {
    const invalid = resolve(
      repoRoot,
      "docs/evidence/v2-coded-experience/p0-05-9-splash-frost-emergency/INVALIDATED_EVIDENCE.md",
    );
    expect(existsSync(invalid)).toBe(true);
    void webRoot;
  });
});
