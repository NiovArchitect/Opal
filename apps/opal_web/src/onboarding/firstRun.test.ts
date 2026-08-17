import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIRST_RUN_STEPS, FR_COPY } from "./firstRunCopy";
import { PRODUCT_PUBLIC_NAME } from "../brand/brand";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function source(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("S1 Final First Run (217:2)", () => {
  it("exposes FR00-FR09 product route with founder copy", () => {
    expect(FIRST_RUN_STEPS).toHaveLength(6);
    expect(FIRST_RUN_STEPS[0]?.id).toBe("fr00");
    expect(FIRST_RUN_STEPS[5]?.id).toBe("fr05");
    expect(FR_COPY.startTitle).toBe("Start with your people.");
    expect(FR_COPY.circleStays).toBe("Your circle stays your circle.");
    expect(FR_COPY.continuePhone).toBe("Continue with phone number");
    expect(FR_COPY.alreadyAccount).toBe("I already have an account");
    expect(FR_COPY.ambientOpal).toBe("Opal lined this up");
    expect(FR_COPY.liveTitle).toBe("Then it actually happens.");
    expect(FR_COPY.profileTitle).toBe("Make it yours.");
    expect(FR_COPY.findTitle).toBe("Find your people.");
    expect(FR_COPY.notNow).toBe("Not now");
  });

  it("implements every FR step id in FirstRunExperience", () => {
    const src = source("onboarding/FirstRunExperience.tsx");
    for (const id of [
      "fr00",
      "fr01",
      "fr02",
      "fr03",
      "fr04",
      "fr05",
      "fr06",
      "fr07",
      "fr08",
      "fr09",
    ]) {
      expect(src).toMatch(new RegExp(`fr-step-${id}|step === "${id}"`));
      expect(src).toMatch(new RegExp(`data-testid="fr-step-${id}"|fr-step-\\$\\{step\\}`));
    }
    expect(src).toMatch(/data-figma-first-run="217:2"/);
    expect(src).toMatch(/data-visual-authority="201:2"/);
    expect(src).toMatch(/startChallenge/);
    expect(src).toMatch(/verifyChallenge/);
    expect(src).toMatch(/updateProfile/);
    expect(src).toMatch(/FindPeopleFlow/);
  });

  it("teaches people-first product without AI-hype or Ask Opal", () => {
    const blob = [
      ...FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`),
      FR_COPY.ambientOpal,
      FR_COPY.startBody,
      FR_COPY.circleStays,
      FR_COPY.liveBody,
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).toMatch(/people/);
    expect(blob).toMatch(/opal lined this up|coordination|synced/);
    expect(blob).not.toMatch(/ai-powered|surveillance|daily engagement|don't miss|ask opal/);
  });

  it("uses full Opal Graph identity and approved tagline on splash", () => {
    const src = source("onboarding/FirstRunExperience.tsx");
    expect(src).toMatch(/Opal/);
    expect(src).toMatch(/Graph/);
    expect(src).toMatch(/BRAND\.tagline|PEOPLE\. EXPERIENCES\. CONNECTED\./);
    expect(PRODUCT_PUBLIC_NAME).toBe("Opal Graph");
    expect(src).not.toMatch(/Opal G[^r]/);
  });

  it("forbids em dash, en dash, and ellipsis in S1 customer copy", () => {
    const files = [
      "onboarding/FirstRunExperience.tsx",
      "onboarding/firstRunCopy.ts",
    ];
    for (const f of files) {
      const text = source(f);
      expect(text, f).not.toMatch(/—/);
      expect(text, f).not.toMatch(/–/);
      // Customer-facing strings: ban … and ...
      const stringLits = text.match(/(['"`])(?:\\.|(?!\1).)*\1/g) || [];
      for (const lit of stringLits) {
        if (lit.includes("http") || lit.includes("eslint") || lit.includes("node:")) continue;
        expect(lit, `${f} ${lit.slice(0, 40)}`).not.toMatch(/…|\.\.\./);
      }
    }
  });

  it("does not mutate real server state from WHO walkthrough selection", () => {
    const src = source("onboarding/FirstRunExperience.tsx");
    const whoBlock = src.slice(src.indexOf('step === "fr02"'), src.indexOf('step === "fr03"'));
    expect(whoBlock).toMatch(/Demo only/);
    expect(whoBlock).not.toMatch(/startChallenge|verifyChallenge|createInvitation|ensureDirect/);
  });

  it("wires real phone, verify, profile, and contacts seams", () => {
    const src = source("onboarding/FirstRunExperience.tsx");
    expect(src).toMatch(/startChallenge\(/);
    expect(src).toMatch(/verifyChallenge\(/);
    expect(src).toMatch(/updateProfile\(/);
    expect(src).toMatch(/FindPeopleFlow/);
    expect(src).toMatch(/otpConsent/);
    expect(src).toMatch(/verifyLockRef|startLockRef/);
  });

  it("keeps developer preview code only in non-production SMS mode", () => {
    const src = source("onboarding/FirstRunExperience.tsx");
    expect(src).toMatch(/not_production_sms/);
    expect(src).toMatch(/development_code/);
    expect(src).toMatch(/not_production_sms === false \? null/);
  });
});
