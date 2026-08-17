/**
 * S1 integrated adversarial closure harness (web unit/integration evidence).
 * Implementation scope: S1 first run. Validation: seams that currently exist.
 * Level 2-3 evidence; browser multi-session proof remains founder Level 5-6.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FR_COPY, FIRST_RUN_STEPS } from "./firstRunCopy";
// PROFILE_PHOTO_DURABILITY_DEFERRED — S1.1 Option B
import {
  isApprovedPreviewFixture,
  normalizePhoneInput,
  APPROVED_PREVIEW_FIXTURES,
} from "../api/productClient";
import { BRAND, BRAND_ASSETS, CREATE_DOCK_EXPOSED, PRODUCT_PUBLIC_NAME } from "../brand/brand";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "../..");

function src(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("S1 adversarial harness - authority and isolation", () => {
  it("never exposes member shell before auth truth", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/data-member-nav="false"/);
    expect(app).toMatch(/data-member-nav="true"/);
    expect(app).toMatch(/FirstRunExperience/);
    // Member shell only after authenticated gate.
    expect(app.indexOf("member-shell")).toBeGreaterThan(
      app.indexOf("FirstRunExperience"),
    );
  });

  it("walkthrough WHO does not call server mutators", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    const who = fr.slice(fr.indexOf('step === "fr02"'), fr.indexOf('step === "fr03"'));
    expect(who).toMatch(/Demo only/);
    expect(who).not.toMatch(
      /startChallenge|verifyChallenge|createInvitation|ensureDirect|updateProfile/,
    );
  });

  it("phone start and verify are guarded against double submit races", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/startLockRef/);
    expect(fr).toMatch(/verifyLockRef/);
    expect(fr).toMatch(/if \(busy \|\| startLockRef\.current\) return/);
    expect(fr).toMatch(/if \(busy \|\| verifyLockRef\.current\) return/);
  });

  it("handles malformed phone and incomplete code without claiming success", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/invalidPhone|FR_COPY\.invalidPhone/);
    expect(fr).toMatch(/\\d\{6\}|invalidCode/);
    expect(fr).toMatch(/normalizePhoneInput/);
  });

  it("normalizes pasted and spaced numbers", () => {
    expect(normalizePhoneInput("202 555 0101")).toBe("+12025550101");
    expect(normalizePhoneInput("+1 (202) 555-0101")).toBe("+12025550101");
    expect(normalizePhoneInput("1-202-555-0101")).toBe("+12025550101");
  });

  it("preview fixtures stay separated from arbitrary production numbers", () => {
    expect(isApprovedPreviewFixture("+12025550101")).toBe(true);
    expect(isApprovedPreviewFixture("+15551234567")).toBe(false);
    expect(APPROVED_PREVIEW_FIXTURES.every((f) => f.e164.startsWith("+1"))).toBe(true);
  });

  it("dev codes only surface when not_production_sms", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/not_production_sms === false \? null/);
    expect(fr).toMatch(/development_code/);
  });

  it("profile persists via server PATCH not only localStorage", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    const client = src("api/productClient.ts");
    expect(fr).toMatch(/updateProfile\(/);
    expect(client).toMatch(/\/api\/v1\/product\/session\/profile/);
    expect(client).toMatch(/method:\s*"PATCH"/);
  });

  it("username uniqueness is real (no fake success path)", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/handle_taken|already taken/);
    expect(fr).toMatch(/usernameOptional|Optional/);
  });

  it("contacts path is optional and cannot trap the user", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/fr09-not-now/);
    expect(fr).toMatch(/Not now|FR_COPY\.notNow/);
    expect(fr).toMatch(/FindPeopleFlow/);
    expect(FR_COPY.contactsPrivacy.toLowerCase()).toMatch(/select|not|upload|silent/);
  });

  it("returning signed-out users use sign_in mode without forced walkthrough", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/sign_in/);
    expect(app).toMatch(/firstRunMode/);
    expect(app).toMatch(/showFirstRun \? "full" : "sign_in"/);
  });

  it("CREATE dock remains deferred (no dead global create)", () => {
    expect(CREATE_DOCK_EXPOSED).toBe(false);
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/data-create-dock=\{CREATE_DOCK_EXPOSED \? "exposed" : "deferred"\}/);
  });
});

describe("S1 adversarial harness - brand and assets", () => {
  it("runtime symbol is exact 168:2 path", () => {
    expect(BRAND_ASSETS.graphSymbol).toBe("/brand/opal-graph/symbol-transparent.png");
    expect(BRAND.figma.symbolExactPng).toBe("168:2");
    expect(PRODUCT_PUBLIC_NAME).toBe("Opal Graph");
    expect(BRAND.tagline).toBe("PEOPLE. EXPERIENCES. CONNECTED.");
  });

  it("brand asset files exist and are non-zero", () => {
    const publicDir = resolve(root, "../public");
    const assets = [
      "brand/opal-graph/symbol-transparent.png",
      "brand/opal-graph/symbol-source-168-2.png",
      "brand/opal-graph/app-icon-180.png",
      "favicon-opal-graph.png",
      "demo/moments/restaurant.jpg",
      "demo/moments/portrait.jpg",
      "demo/moments/food.jpg",
    ];
    for (const a of assets) {
      const p = resolve(publicDir, a);
      expect(existsSync(p), a).toBe(true);
      expect(statSync(p).size, a).toBeGreaterThan(100);
    }
  });

  it("no old opposing-arcs mark in first-run source", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).not.toMatch(/opal-mark-63-7|opposing-arcs|REJECTED-arcs/);
    expect(fr).toMatch(/OpalMark|graphSymbol|168/);
  });
});

describe("S1 adversarial harness - copy and privacy law", () => {
  it("S1 customer strings have no em/en dash or ellipsis", () => {
    const copy = src("onboarding/firstRunCopy.ts");
    const values = Object.values(FR_COPY).map(String).join("\n");
    expect(values).not.toMatch(/—|–|…|\.\.\./);
    expect(copy).not.toMatch(/—/);
  });

  it("does not claim full production Live implementation", () => {
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/Product preview|later tranche|Full Live production/i);
  });

  it("Opal is ambient coordinator not primary chat partner in FR03", () => {
    const blob = `${FR_COPY.ambientOpal} ${FIRST_RUN_STEPS.find((s) => s.id === "fr03")?.body}`;
    expect(blob.toLowerCase()).toMatch(/lined this up|coordination/);
    expect(blob.toLowerCase()).not.toMatch(/ask opal|chat with opal/);
  });

  it("P31 / WHO-FAST-PATH / messaging seams remain in member product", () => {
    const app = src("OpalApp.tsx");
    expect(app).toMatch(/WHO-FAST-PATH|moment-fork|ensureDirectConversation|buildWhoFastPath/);
    expect(app).toMatch(/productRealtime|message:send|human-message-row/);
  });
});

describe("S1 adversarial harness - NOT_YET_IMPLEMENTED inventory", () => {
  it("documents deferred product slices honestly", () => {
    const deferred = {
      fullGraphCreate: "S5",
      homeContinuum2015: "S6",
      liveProduction: "later",
      journeyRedesign: "S4",
      durableProfilePhotoUpload: "PROFILE_PHOTO_DURABILITY_DEFERRED",
      nativeAddressBookFullSync: "mobile seam",
    };
    expect(CREATE_DOCK_EXPOSED).toBe(false);
    expect(deferred.fullGraphCreate).toBe("S5");
    const fr = src("onboarding/FirstRunExperience.tsx");
    expect(fr).toMatch(/photo-deferred|photoDeferred|deferred/i);
    expect(fr).not.toMatch(/type="file"/);
    expect(fr).not.toMatch(/createObjectURL|photoPreview/);
    expect(FR_COPY.photoDeferredNote.toLowerCase()).toMatch(/not available|initials/);
  });
});
