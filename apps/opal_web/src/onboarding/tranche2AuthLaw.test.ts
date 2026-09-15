/**
 * Tranche #2 — RC auth law (client).
 * Real phone auth must not be blocked by optimistic synthetic/fixture gates.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizePhoneInput } from "../api/productClient";

const root = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Tranche #2 phone normalization", () => {
  it("maps formatting variants of the same US number to one E.164", () => {
    const a = normalizePhoneInput("(760) 555-0199", "+1");
    const b = normalizePhoneInput("760-555-0199", "+1");
    const c = normalizePhoneInput("+1 760 555 0199", "+1");
    const d = normalizePhoneInput("17605550199", "+1");
    expect(a).toBe("+17605550199");
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(d).toBe(a);
  });

  it("client normalizer is permissive; FirstRun still gates short numbers before challenge", () => {
    // productClient.normalizePhoneInput does not throw; FirstRun checks digit length.
    expect(normalizePhoneInput("123", "+1")).toBe("+123");
    const fr = read("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/normalized\.replace\(\/\\D\/g, ""\)\.length < 8/);
  });
});

describe("Tranche #2 first-run RC auth law", () => {
  it("does not client-block real numbers before the server answers", () => {
    const fr = read("onboarding/FirstRunExperience.tsx");
    expect(fr).not.toMatch(/notProductionSms &&\s*\n?\s*!isApprovedPreviewFixture/);
    expect(fr).not.toMatch(/environmentLikelyHosted\(\)/);
    expect(fr).toMatch(/do NOT client-block real numbers before the server answers/);
    // Server remains authority for fixture-only synthetic hosts.
    expect(fr).toMatch(/number_not_enabled/);
  });

  it("never autofills OTP unless founder seed is explicitly enabled", () => {
    const fr = read("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/isFounderSeedEnabled\(\)\s*\)\s*setCode\(codeShown\)/);
    expect(fr).toMatch(/founderReview \? FOUNDER_AUTH_FIXTURE\.national : ""/);
  });

  it("re-submits phone on verify for production_sms digest law", () => {
    const client = read("api/productClient.ts");
    expect(client).toMatch(/phone:\s*input\.phone/);
    expect(client).toMatch(/include_bearer:\s*true/);
  });
});

describe("Tranche #1 media bridge preserved", () => {
  it("native media acquisition path remains wired", () => {
    expect(read("opalUi/StoryCreateFlow.tsx")).toMatch(/acquireMedia/);
    expect(read("opalUi/GraphCreateFlow.tsx")).toMatch(/acquireMedia/);
    expect(read("opalUi/OpalCenterLifeGraph.tsx")).toMatch(/acquireMedia/);
    expect(read("nativeHostBridge.ts")).toMatch(/opal_native_request_media/);
  });
});
