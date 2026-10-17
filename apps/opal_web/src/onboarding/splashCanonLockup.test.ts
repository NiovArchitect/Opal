/**
 * Repair #17 (W7) — Splash 1 canon alignment + Splash 2 boundary law.
 *
 * Founder (Repair #17): the Splash 1 logo text was "not the logo text
 * that I was looking for." Canon lives in shots/brand/:
 *   - opal-logo.png     = character + bubble-letter "Opal" lockup (THE logo)
 *   - opal-wordmark.png = bubble-letter wordmark only
 *   - opal-character.png = character-sheet crop (contains stray partial
 *     text fragments from the sheet — never a logo)
 * Before this repair, Splash 1 painted ONLY the character crop: the app
 * opened on a character-sheet fragment with partial "...al" / "ove." /
 * "ether." text at its edges and NO canon logo text at all.
 * After: Splash 1 paints the single canon logo lockup asset
 * (BRAND_ASSETS.opalLogo). One asset, logo count 1 — not a composed
 * character+wordmark collage, not rendered/font text.
 *
 * Splash-2 boundary law (standing): "Enter Opal" appears EXACTLY ONCE in
 * the first-run flow — the live button on the Promise page below the
 * baked art. The baked Promise PNG's own CTA strip stays cropped/masked,
 * and Splash 1 carries no "Enter Opal" at all.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_ASSETS } from "../brand/brand";

const webRoot = resolve(__dirname, "../..");
const repoRoot = resolve(__dirname, "../../../..");

function src(rel: string) {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

function count(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

describe("Repair #17 — Splash 1 uses the canon logo lockup", () => {
  it("brand map points opalLogo at the canon lockup file, which exists in public/ and in shots/brand canon", () => {
    expect(BRAND_ASSETS.opalLogo).toBe("/brand/opal-logo.png");
    const runtime = resolve(webRoot, "public/brand/opal-logo.png");
    const canon = resolve(repoRoot, "shots/brand/opal-logo.png");
    for (const p of [runtime, canon]) {
      expect(existsSync(p), p).toBe(true);
      expect(statSync(p).size, p).toBeGreaterThan(100_000);
    }
    // Canon wordmark + character remain distinct assets (never substituted).
    expect(BRAND_ASSETS.opalWordmark).toBe("/brand/opal-wordmark.png");
    expect(BRAND_ASSETS.opalCharacter).toBe("/brand/opal-character.png");
  });

  it("top-level Splash 1 (FirstRunSplashPage) paints exactly one brand image: the canon lockup", () => {
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    expect(splash).toMatch(/BRAND_ASSETS\.opalLogo/);
    expect(splash).toMatch(/data-brand-source="opal-logo"/);
    expect(splash).toMatch(/data-brand-role="logo-lockup"/);
    expect(splash).toMatch(/data-splash-identity="opal-logo-lockup"/);
    expect(splash).toMatch(/data-splash-logo-count="1"/);
    expect(splash).toMatch(/data-double-composition="0"/);
    // Exactly one <img on the splash — the lockup is the whole identity.
    expect(count(splash, "<img")).toBe(1);
    // The character-sheet crop is not the splash identity anymore.
    expect(splash).not.toMatch(/BRAND_ASSETS\.opalCharacter/);
    expect(splash).not.toMatch(/opal-character\.png/);
    // No separate wordmark composed next to the lockup, no rendered text logo.
    expect(splash).not.toMatch(/OpalWordmark|BRAND_ASSETS\.opalWordmark/);
    expect(splash).not.toMatch(/fr-splash-wordmark/);
  });

  it("nested fr00 splash paints the same canon lockup (no divergent identity)", () => {
    const fre = src("onboarding/FirstRunExperience.tsx");
    const fr00 = fre.slice(
      fre.indexOf('step === "fr00"'),
      fre.indexOf("{/* Legacy SFR"),
    );
    expect(fr00).toMatch(/BRAND_ASSETS\.opalLogo/);
    expect(fr00).toMatch(/data-brand-source="opal-logo"/);
    expect(fr00).toMatch(/data-brand-role="logo-lockup"/);
    expect(fr00).not.toMatch(/BRAND_ASSETS\.opalCharacter/);
    expect(fr00).not.toMatch(/OpalWordmark|opalWordmark/);
  });
});

describe("Repair #17 — Splash 2 boundary: 'Enter Opal' exactly once", () => {
  it("Splash 1 carries no 'Enter Opal' anywhere", () => {
    const splash = src("onboarding/FirstRunSplashPage.tsx");
    expect(count(splash, "Enter Opal")).toBe(0);
    const fre = src("onboarding/FirstRunExperience.tsx");
    const fr00 = fre.slice(
      fre.indexOf('step === "fr00"'),
      fre.indexOf("{/* Legacy SFR"),
    );
    expect(count(fr00, "Enter Opal")).toBe(0);
  });

  it("Promise (Splash 2) has exactly one live 'Enter Opal' and one live 'I already have an account'", () => {
    const promise = src("onboarding/FirstRunPromisePage.tsx");
    expect(count(promise, 'data-testid="opal-promise-enter"')).toBe(1);
    expect(count(promise, 'data-testid="opal-promise-already"')).toBe(1);
    // The button labels themselves appear once each in the live layer.
    expect(promise.match(/>\s*Enter Opal\s*</g)).toHaveLength(1);
    expect(promise.match(/>\s*I already have an account\s*</g)).toHaveLength(1);
  });

  it("the baked Promise PNG CTA strip stays masked — baked buttons never become a second live pair", () => {
    const promise = src("onboarding/FirstRunPromisePage.tsx");
    // The clip + CTA crop mask are what keep the baked "Enter Opal" /
    // "Sign in" strip inside the PNG from showing alongside the live pair.
    expect(promise).toMatch(/data-testid="opal-promise-clip"/);
    expect(promise).toMatch(/data-testid="opal-promise-cta-mask"/);
    expect(promise).toMatch(/first-run-promise-cta-crop/);
    // Canonical baked art is referenced by its pinned SHA, unmodified.
    expect(promise).toMatch(/opal-promise-exact-941x1672\.png/);
    expect(promise).toMatch(
      /20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10/,
    );
  });
});
