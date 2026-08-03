import { describe, expect, it } from "vitest";
import {
  APPROVED_PREVIEW_FIXTURES,
  isApprovedPreviewFixture,
  normalizePhoneInput,
} from "./api/productClient";
import { FIRST_RUN_STEPS } from "./onboarding/FirstRunExperience";
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

describe("walkthrough SF14 restoration copy", () => {
  it("keeps SF14 emotional titles without technical jargon", () => {
    const blob = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ");
    expect(FIRST_RUN_STEPS[0]?.title).toBe("Life starts in conversation.");
    expect(blob).not.toMatch(/session|cookie|csrf|phoenix|elixir|bearer|synthetic provider/i);
    expect(blob).not.toMatch(/stay on signal/i);
  });

  it("has no em dashes in walkthrough or activation copy", () => {
    const files = [
      "src/onboarding/FirstRunExperience.tsx",
      "src/ActivationFlow.tsx",
      "src/designTokens.ts",
    ];
    for (const f of files) {
      const text = readFileSync(resolve(root, f), "utf8");
      expect(text, f).not.toMatch(/—/);
    }
  });

  it("activation advances without requiring invite after verify", () => {
    const act = readFileSync(resolve(root, "src/ActivationFlow.tsx"), "utf8");
    expect(act).toMatch(/onAuthenticated\(s\)/);
    expect(act).toMatch(/Preparing your account/);
    expect(act).toMatch(/approved test numbers/i);
  });

  it("hosted verify requests bearer bootstrap", () => {
    const client = readFileSync(resolve(root, "src/api/productClient.ts"), "utf8");
    expect(client).toMatch(/include_bearer:\s*true/);
    expect(client).toMatch(/setMemoryAccessToken/);
    expect(client).toMatch(/Never persist access_token|never persist access_token|Never written to localStorage|never written to localStorage/i);
  });

  it("CSP allows hosted Render API connect", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    expect(html).toMatch(/opal-api-ao0c\.onrender\.com/);
    expect(html).not.toMatch(/—/);
  });
});
