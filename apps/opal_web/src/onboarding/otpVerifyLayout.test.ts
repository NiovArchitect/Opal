/**
 * Paste W6 Phase 0 — OTP Verify must never overlap code boxes (keyboard-open).
 * Static CSS law + document-order assertions (Playwright visual proof in verify_paste_w6.mjs).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const css = readFileSync(resolve(root, "styles.css"), "utf8");
const fre = readFileSync(resolve(__dirname, "FirstRunExperience.tsx"), "utf8");

describe("Paste W6 Phase 0 — OTP Verify layout law", () => {
  it("uses canonical logo lockup, not abstract OPALGRAPH emblem, on verify", () => {
    expect(fre).toMatch(/fr-character-lockup|CharacterLockup|fr-logo-lockup/);
    expect(fre).toMatch(/opalLogo|opal-logo\.png/);
    // Verify step must not mount AuthHeroMark / graph emblem hero
    const verifyBlock = fre.slice(fre.indexOf('step === "fr07"'), fre.indexOf('step === "fr08"'));
    expect(verifyBlock).toMatch(/CharacterLockup/);
    expect(verifyBlock).not.toMatch(/AuthHeroMark|opalGraphEmblemHero/);
  });

  it("places Verify submit after code wrap in document order", () => {
    const verifyBlock = fre.slice(fre.indexOf('step === "fr07"'), fre.indexOf('step === "fr08"'));
    const wrapIdx = verifyBlock.indexOf("fr-code-wrap");
    const submitIdx = verifyBlock.indexOf('data-testid="fr07-submit"');
    expect(wrapIdx).toBeGreaterThan(0);
    expect(submitIdx).toBeGreaterThan(wrapIdx);
  });

  it("forbids absolute Verify / code-wrap / change-number on OTP", () => {
    // EOF / W6 block forces relative on verify primary
    expect(css).toMatch(
      /\.fr-auth-v4\.fr-verify \.fr-primary[\s\S]{0,200}?position:\s*relative\s*!important/,
    );
    expect(css).toMatch(
      /\.fr-auth-v4\.fr-verify \.fr-code-wrap[\s\S]{0,120}?position:\s*relative\s*!important/,
    );
    // No bottom-anchor of verify primary after W6
    const nativeVerifyPrimary = css.match(
      /html\.opal-native-host \.fr-auth-v4\.fr-verify \.fr-primary[\s\S]{0,180}?bottom:\s*calc/,
    );
    expect(nativeVerifyPrimary).toBeNull();
  });
});
