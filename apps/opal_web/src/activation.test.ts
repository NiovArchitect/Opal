import { describe, expect, it } from "vitest";
import {
  APPROVED_PREVIEW_FIXTURES,
  isApprovedPreviewFixture,
  normalizePhoneInput,
} from "./api/productClient";
import { FIRST_RUN_STEPS, FR_COPY } from "./onboarding/FirstRunExperience";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("activation preview fixtures", () => {
  it("accepts approved fixtures only patterns", () => {
    expect(isApprovedPreviewFixture("+12025550101")).toBe(true);
    expect(isApprovedPreviewFixture("202-555-0102")).toBe(true);
    expect(isApprovedPreviewFixture("+15551234567")).toBe(false);
    expect(APPROVED_PREVIEW_FIXTURES.length).toBeGreaterThanOrEqual(8);
  });

  it("normalizes US numbers", () => {
    expect(normalizePhoneInput("2025550101")).toBe("+12025550101");
    expect(normalizePhoneInput("1 202 555 0101")).toBe("+12025550101");
  });
});

describe("S1 first-run auth conversion", () => {
  it("routes walkthrough into phone conversion with founder copy", () => {
    expect(FIRST_RUN_STEPS.length).toBeGreaterThanOrEqual(5);
    expect(FR_COPY.continuePhone).toBe("Continue with phone number");
    expect(FR_COPY.alreadyAccount).toBe("I already have an account");
    expect(FR_COPY.phoneTitle).toMatch(/phone number/i);
    expect(FR_COPY.verifyTitle).toMatch(/code/i);
    const blob = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ");
    expect(blob).not.toMatch(/session|cookie|csrf|phoenix|elixir|bearer|synthetic provider/i);
  });

  it("first-run owns phone/verify and does not require legacy Join CTA", () => {
    const onboard = readFileSync(
      resolve(root, "src/onboarding/FirstRunExperience.tsx"),
      "utf8",
    );
    expect(onboard).toMatch(/startChallenge/);
    expect(onboard).toMatch(/verifyChallenge/);
    expect(onboard).toMatch(/fr05-continue-phone/);
    expect(onboard).toMatch(/FR_COPY\.continuePhone|continuePhone/);
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/FirstRunExperience/);
    expect(app).not.toMatch(/import \{ ActivationFlow \}/);
  });

  it("has no em dashes in walkthrough or activation copy", () => {
    const files = [
      "src/onboarding/FirstRunExperience.tsx",
      "src/onboarding/firstRunCopy.ts",
      "src/ActivationFlow.tsx",
      "src/designTokens.ts",
    ];
    for (const f of files) {
      const text = readFileSync(resolve(root, f), "utf8");
      expect(text, f).not.toMatch(/—/);
    }
  });

  it("activation path uses OTP consent and real verify locks", () => {
    const fr = readFileSync(resolve(root, "src/onboarding/FirstRunExperience.tsx"), "utf8");
    expect(fr).toMatch(/otpConsent/);
    expect(fr).toMatch(/startLockRef|verifyLockRef/);
    expect(fr).toMatch(/FR_COPY\.rates|rates/);
    expect(fr).toMatch(/updateProfile/);
    const copy = readFileSync(resolve(root, "src/onboarding/firstRunCopy.ts"), "utf8");
    expect(copy).toMatch(/Message and data rates may apply/);
    const client = readFileSync(resolve(root, "src/api/productClient.ts"), "utf8");
    expect(client).toMatch(/session\/profile/);
  });

  it("hosted verify requests bearer bootstrap", () => {
    const client = readFileSync(resolve(root, "src/api/productClient.ts"), "utf8");
    expect(client).toMatch(/include_bearer:\s*true/);
    expect(client).toMatch(/setMemoryAccessToken/);
    expect(client).toMatch(/Never persist access_token|never persist access_token|Never written to localStorage|never written to localStorage/i);
  });

  it("CSP allows hosted API hosts (same-site + Render rollback)", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    expect(html).toMatch(/opal-api-ao0c\.onrender\.com/);
    expect(html).toMatch(/api-opal\.niovlabs\.com|api\.opal\.niovlabs\.com/);
    expect(html).not.toMatch(/—/);
  });

  it("boot recovers session without requiring localStorage bearer", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/fetchSession\(session\?\.access_token\)/);
    expect(app).toMatch(/cookie/i);
    const client = readFileSync(resolve(root, "src/api/productClient.ts"), "utf8");
    expect(client).toMatch(/credentials:\s*["']include["']/);
    // Must not persist access_token to disk.
    expect(client).not.toMatch(/localStorage\.setItem\([^)]*access_token/);
  });
});
