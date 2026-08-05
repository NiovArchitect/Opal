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
  it("keeps screens 1-4 and founder-approved screen 5 conversion hook", () => {
    expect(FIRST_RUN_STEPS).toHaveLength(5);
    expect(FIRST_RUN_STEPS[0]?.title).toBe("Life starts in conversation.");
    expect(FIRST_RUN_STEPS[1]?.title).toBe("When talk becomes something real.");
    expect(FIRST_RUN_STEPS[2]?.title).toBe("Decide without killing the vibe.");
    expect(FIRST_RUN_STEPS[3]?.title).toBe("Moments that actually happen.");
    expect(FIRST_RUN_STEPS[4]?.title).toBe(
      "More of what you talk about should actually happen.",
    );
    expect(FIRST_RUN_STEPS[4]?.body).toMatch(
      /understands what is taking shape.*people you actually talk to/i,
    );
    expect(FIRST_RUN_STEPS[4]?.body).not.toMatch(/your people/i);
    const blob = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ");
    expect(blob).not.toMatch(/session|cookie|csrf|phoenix|elixir|bearer|synthetic provider/i);
    expect(blob).not.toMatch(/stay on signal/i);
    expect(blob).not.toMatch(/Private by design/i);
    expect(blob).not.toMatch(/Calm\. Human\. Yours\./);
  });

  it("final CTA is Join with accessible name Join Opal and no invite homework", () => {
    const tokens = readFileSync(resolve(root, "src/designTokens.ts"), "utf8");
    expect(tokens).toMatch(/onboardingEnter:\s*"Join"/);
    expect(tokens).toMatch(/onboardingEnterAria:\s*"Join Opal"/);
    expect(tokens).not.toMatch(/Continue with phone number/);
    expect(tokens).not.toMatch(/Bring your people in after you join/);
    const onboard = readFileSync(
      resolve(root, "src/onboarding/FirstRunExperience.tsx"),
      "utf8",
    );
    expect(onboard).toMatch(/onboardingEnter/);
    expect(onboard).toMatch(/onboardingEnterAria/);
    expect(onboard).not.toMatch(/onboardingInviteAfter/);
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

  it("activation advances without requiring invite after verify and shows trust copy", () => {
    const act = readFileSync(resolve(root, "src/ActivationFlow.tsx"), "utf8");
    expect(act).toMatch(/onAuthenticated\(s\)/);
    expect(act).toMatch(/Preparing your account/);
    expect(act).toMatch(/approved test numbers/i);
    expect(act).toMatch(/activationTrust/);
    const tokens = readFileSync(resolve(root, "src/designTokens.ts"), "utf8");
    expect(tokens).toMatch(
      /Your relationships and conversations stay private\. You choose what Opal may use or share\./,
    );
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
