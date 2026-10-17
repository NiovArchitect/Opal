/**
 * P0-05.9 — FOUNDER_RESET_SPLASH_PRIMARY_CONTENT_VISIBLE
 * Founder Reality Repair #2 — splash identity, amended Repair #17 (W7):
 * Splash 1 identity is the single canon logo lockup (opal-logo.png).
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
    expect(splash).toMatch(/BRAND_ASSETS\.opalLogo|opal-logo\.png/);
    expect(splash).toMatch(/data-splash-runtime-asset="single_source"/);
    expect(splash).not.toMatch(/initial=\{[^}]*opacity:\s*0/);
    expect(app).toMatch(/FirstRunSplashPage/);
    expect(app).toMatch(/firstRunStage === "splash"/);
    expect(app).toMatch(/app-first-run-splash/);
    // Auth path must not remount nested fr00 Splash under forced first-run
    expect(app).toMatch(/mode=\{firstRunMode\}/);
    expect(app).toMatch(/firstRunMode = "sign_in"/);
  });

  it("production Splash uses the canon logo lockup - one asset, no composed collage / OPAL GRAPH text", () => {
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    expect(splash).toMatch(/BRAND_ASSETS\.opalLogo/);
    expect(splash).toMatch(/data-brand-role="logo-lockup"/);
    expect(splash).toMatch(/data-brand-source="opal-logo"/);
    expect(splash).not.toMatch(/BRAND_ASSETS\.opalCharacter/);
    // No separate wordmark line / OPAL GRAPH h1 in JSX (comments may mention the law).
    expect(splash).not.toMatch(/opal-graph-word-opal|opal-graph-word-graph|fr-splash-wordmark/);
    expect(splash).not.toMatch(/<h1[\s\S]{0,120}OPAL[\s\S]{0,40}GRAPH/);
  });

  it("nested fr00 uses the canon logo lockup; BrandChrome stays character-only (no double composition)", () => {
    const fre = src("onboarding/FirstRunExperience.tsx");
    const fr00 = fre.slice(fre.indexOf('step === "fr00"'), fre.indexOf("{/* Legacy SFR"));
    expect(fr00).toMatch(/BRAND_ASSETS\.opalLogo/);
    expect(fr00).toMatch(/data-brand-role="logo-lockup"/);
    expect(fr00).toMatch(/data-brand-source="opal-logo"/);
    expect(fr00).not.toMatch(/BRAND_ASSETS\.opalCharacter/);
    expect(fr00).not.toMatch(/opal-graph-word-opal|opal-graph-word-graph|fr-splash-wordmark/);
    expect(fr00).not.toMatch(/OpalWordmark|opalWordmark/);
    // BrandChrome: character identity — never OpalMark + OpalWordmark collage
    const brandChrome = fre.slice(
      fre.indexOf("function BrandChrome"),
      fre.indexOf("function CharacterLockup"),
    );
    expect(brandChrome).toMatch(/BRAND_ASSETS\.opalCharacter/);
    expect(brandChrome).not.toMatch(/OpalWordmark|opalWordmark/);
    expect(brandChrome).not.toMatch(/OpalMark/);
  });

  it("force Splash isolation exists without ambient/fr-void wrappers", () => {
    const main = src("main.tsx");
    expect(main).toMatch(/opal_force_splash/);
    expect(main).toMatch(/SplashIsolationProbe|FirstRunSplashPage/);
  });

  it("FOUNDER_RESET_SPLASH_PRIMARY_CONTENT_VISIBLE", () => {
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    for (const needle of [
      "fr00-splash-emblem",
      "fr00-tap-begin",
      "fr00-already-account",
      'data-splash-hold="indefinite"',
      'data-splash-auto-advance="0"',
      'data-splash-identity="opal-logo-lockup"',
    ]) {
      expect(splash, needle).toMatch(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    expect(splash).not.toMatch(/fr00-skip-intro|onSkipIntro/);
    expect(splash).not.toMatch(/SPLASH_AUTO_MS|setTimeout\(goBegin/);
    // Legacy nested fr00 may still expose Skip for tests — splash identity
    // there is the same canon logo lockup (auth chrome keeps the character).
    const fre = src("onboarding/FirstRunExperience.tsx");
    expect(fre).toMatch(/opalCharacter|opal-character/);
  });
});
