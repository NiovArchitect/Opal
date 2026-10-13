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
    expect(splash).toMatch(/opalLogo|opal-logo/);
    expect(splash).toMatch(/TALK\. ALIGN\. GO\./);
    expect(splash).not.toMatch(/initial=\{[^}]*opacity:\s*0/);
    expect(app).toMatch(/FirstRunSplashPage/);
    expect(app).toMatch(/firstRunStage === "splash"/);
    expect(app).toMatch(/app-first-run-splash/);
    // Auth path must not remount nested fr00 Splash under forced first-run
    expect(app).toMatch(/mode=\{firstRunMode\}/);
    expect(app).toMatch(/firstRunMode = "sign_in"/);
  });

  it("production Splash uses lockup only — no OPAL GRAPH text beside opalLogo", () => {
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    expect(splash).toMatch(/BRAND_ASSETS\.opalLogo|opalLogo/);
    expect(splash).toMatch(/data-brand-role="logo-lockup"/);
    // No separate wordmark line / OPAL GRAPH h1 in JSX (comments may mention the law).
    expect(splash).not.toMatch(/opal-graph-word-opal|opal-graph-word-graph|fr-splash-wordmark/);
    expect(splash).not.toMatch(/<h1[\s\S]{0,120}OPAL[\s\S]{0,40}GRAPH/);
  });

  it("nested fr00 + BrandChrome are lockup-only (no double composition)", () => {
    const fre = src("onboarding/FirstRunExperience.tsx");
    const fr00 = fre.slice(fre.indexOf('step === "fr00"'), fre.indexOf("{/* Legacy SFR"));
    expect(fr00).toMatch(/BRAND_ASSETS\.opalLogo/);
    expect(fr00).toMatch(/data-brand-role="logo-lockup"/);
    expect(fr00).toMatch(/TALK\. ALIGN\. GO\./);
    expect(fr00).not.toMatch(/opal-graph-word-opal|opal-graph-word-graph|fr-splash-wordmark/);
    expect(fr00).not.toMatch(/OpalWordmark|opalWordmark/);
    // BrandChrome: single opalLogo — never OpalMark + OpalWordmark
    const brandChrome = fre.slice(
      fre.indexOf("function BrandChrome"),
      fre.indexOf("function CharacterLockup"),
    );
    expect(brandChrome).toMatch(/BRAND_ASSETS\.opalLogo/);
    expect(brandChrome).not.toMatch(/OpalWordmark|opalWordmark/);
    expect(brandChrome).not.toMatch(/OpalMark/);
  });

  it("ActOnBehalfOptInStep header is lockup-only (no OPAL GRAPH text)", () => {
    const act = src("onboarding/ActOnBehalfOptInStep.tsx");
    expect(act).toMatch(/BRAND_ASSETS\.opalLogo/);
    expect(act).not.toMatch(/opalGraphEmblemHero/);
    expect(act).not.toMatch(/opal-graph-word-opal|opal-graph-word-graph|fr-auth-header-wordmark/);
  });

  it("force Splash isolation exists without ambient/fr-void wrappers", () => {
    const main = src("main.tsx");
    expect(main).toMatch(/opal_force_splash/);
    expect(main).toMatch(/SplashIsolationProbe|FirstRunSplashPage/);
  });

  it("FOUNDER_RESET_SPLASH_PRIMARY_CONTENT_VISIBLE", () => {
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    // Lockup carries Opal letters; no Skip on production Splash (new users see Splash 2).
    for (const needle of [
      "fr00-splash-emblem",
      "opal-graph-tagline",
      "fr00-tap-begin",
      "fr00-already-account",
      "data-splash-hold=\"indefinite\"",
      "data-splash-auto-advance=\"0\"",
    ]) {
      expect(splash, needle).toMatch(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    expect(splash).not.toMatch(/fr00-skip-intro|onSkipIntro/);
    expect(splash).not.toMatch(/SPLASH_AUTO_MS|setTimeout\(goBegin/);
    // Legacy nested fr00 may still expose Skip for tests — must remain lockup-only.
    const fre = src("onboarding/FirstRunExperience.tsx");
    expect(fre).toMatch(/fr00-skip-intro/);
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

  it("SPLASH_NOT_NESTED_IN_LEGACY_FIRST_RUN_SHELL and PROMISE_NOT_NESTED_IN_LEGACY_FIRST_RUN_SHELL", () => {
    const app = src("OpalApp.tsx");
    const splashIdx = app.indexOf('firstRunStage === "splash"');
    const promiseIdx = app.indexOf('firstRunStage === "promise"');
    const frIdx = app.indexOf("<FirstRunExperience");
    expect(splashIdx).toBeGreaterThan(-1);
    expect(promiseIdx).toBeGreaterThan(-1);
    expect(frIdx).toBeGreaterThan(-1);
    // Top-level Splash and Promise early-returns must appear BEFORE FirstRunExperience JSX mount.
    expect(splashIdx).toBeLessThan(frIdx);
    expect(promiseIdx).toBeLessThan(frIdx);
    // Auth shell may use FirstRunExperience; Splash owner must remain FirstRunSplashPage top-level.
    expect(app).toMatch(/data-splash-owner="FirstRunSplashPage"/);
    expect(app).toMatch(/data-testid="first-run-splash-shell"/);
  });

  it("runtime= checkpoint bust exists so hard-refresh is not founder duty", () => {
    const main = src("main.tsx");
    const checkpoint = src("runtime/founderRuntimeCheckpoint.ts");
    const app = src("OpalApp.tsx");
    expect(main).toMatch(/applyFounderRuntimeCheckpoint/);
    expect(checkpoint).toMatch(/runtime/);
    expect(checkpoint).toMatch(/opal\.runtime_checkpoint/);
    expect(checkpoint).toMatch(/location\.reload/);
    // RUNTIME_CHECKPOINT_PARAM_PRESERVED — reset consume must not strip runtime=
    expect(app).toMatch(/NEVER strip `runtime=`|do not strip session identity|Preserve `runtime=`/);
  });
});
