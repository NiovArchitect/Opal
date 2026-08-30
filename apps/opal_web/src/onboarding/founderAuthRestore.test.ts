/**
 * P0-05.11B — founder auth functional restore (no visual changes).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNDER_AUTH_FIXTURE,
  codeHintForE164,
  normalizePhoneInput,
} from "../api/productClient";

const fr = readFileSync(resolve(__dirname, "FirstRunExperience.tsx"), "utf8");

describe("P0-05.11B founder auth restore", () => {
  it("FOUNDER_PHONE_FIXTURE_NORMALIZES_E164", () => {
    expect(FOUNDER_AUTH_FIXTURE.e164).toBe("+12025550101");
    expect(FOUNDER_AUTH_FIXTURE.otp).toBe("111111");
    expect(
      normalizePhoneInput(FOUNDER_AUTH_FIXTURE.national, FOUNDER_AUTH_FIXTURE.dial),
    ).toBe(FOUNDER_AUTH_FIXTURE.e164);
    expect(codeHintForE164(FOUNDER_AUTH_FIXTURE.e164)).toBe("111111");
  });

  it("FOUNDER_PHONE_CONTINUE_SUCCEEDS structural wiring", () => {
    expect(fr).toMatch(/FOUNDER_AUTH_FIXTURE/);
    expect(fr).toMatch(/founderReview \? FOUNDER_AUTH_FIXTURE\.national/);
    expect(fr).toMatch(/codeHintForE164\(normalized\)/);
    expect(fr).toMatch(/if \(isFounderSeedEnabled\(\)\) setCode\(codeShown\)/);
  });

  it("FOUNDER_OTP_VERIFY_SUCCEEDS / autofill without product UI preview", () => {
    expect(fr).toMatch(/OPAL_DEV_OTP/);
    expect(fr).not.toMatch(/Preview code:/);
    expect(fr).not.toMatch(/fr07-dev-code/);
  });

  it("FOUNDER_PHONE_TO_PROFILE_FLOW_SUCCEEDS", () => {
    // Continue → verifyChallenge → setStep("fr08") Profile; no visual Preview chrome.
    expect(fr).toMatch(/verifyChallenge\(/);
    expect(fr).toMatch(/setStep\("fr08"\)/);
    expect(fr).toMatch(/data-testid="fr08-profile"/);
    expect(fr).not.toMatch(/Preview code/);
  });

  it("FOUNDER_SKIP_FOR_NOW_NOT_DEAD", () => {
    expect(fr).toMatch(/founderSkipForNow/);
    expect(fr).toMatch(/void founderSkipForNow\(\)/);
    expect(fr).toMatch(/path: "founder_skip"/);
  });

  it("FOUNDER_SKIP_DOES_NOT_CREATE_PRODUCTION_AUTH", () => {
    expect(fr).toMatch(/if \(!isFounderSeedEnabled\(\)\)/);
    expect(fr).toMatch(/Phone verification is required to continue/);
  });

  it("INTERNATIONAL_PHONE_STILL_SUPPORTED", () => {
    expect(normalizePhoneInput("5512345678", "+52")).toBe("+525512345678");
    expect(normalizePhoneInput("7700900123", "+44")).toBe("+447700900123");
    expect(normalizePhoneInput("9171234567", "+63")).toBe("+639171234567");
    expect(fr).toMatch(/fr06-dial-select/);
  });

  it("PREVIEW_OTP_NOT_RENDERED_IN_PRODUCT_UI", () => {
    expect(fr).not.toMatch(/className="dev-code"/);
  });
});
