import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIRST_RUN_STEPS, FR_COPY } from "./firstRunCopy";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("pre-member shell isolation (S1)", () => {
  it("gates member tabbar and panes behind authentication in OpalApp", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/first-run-splash-shell|first-run-meet-opal-shell/);
    expect(app).toMatch(/premember-activation-shell/);
    expect(app).toMatch(/data-testid="member-shell"/);
    expect(app).toMatch(/data-testid="member-tabbar"/);
    expect(app).toMatch(/data-member-nav="false"/);
    expect(app).toMatch(/data-member-nav="true"/);
    expect(app).toMatch(/FirstRunExperience/);
    // Member shell remains after authenticated gate.
    expect(app).toMatch(/\/\/ --- Authenticated member shell/);
  });

  it("S1 walkthrough teaches people-first route then phone conversion", () => {
    expect(FIRST_RUN_STEPS[0]?.id).toBe("fr00");
    expect(FIRST_RUN_STEPS.at(-1)?.id).toBe("fr05");
    expect(FR_COPY.continuePhone).toBe("Continue with phone number");
    expect(FR_COPY.alreadyAccount).toBe("I already have an account");
    const firstRun = readFileSync(resolve(root, "onboarding/FirstRunExperience.tsx"), "utf8");
    expect(firstRun).toMatch(/fr05-continue-phone/);
    expect(firstRun).toMatch(/fr05-already-account/);
    expect(firstRun).toMatch(/fr06-phone/);
    expect(firstRun).toMatch(/fr07-verify/);
    expect(firstRun).toMatch(/fr08-profile/);
    expect(firstRun).toMatch(/fr09-find/);
  });

  it("walkthrough complete + auth complete both land in session authority", () => {
    const firstRun = readFileSync(resolve(root, "onboarding/FirstRunExperience.tsx"), "utf8");
    expect(firstRun).toMatch(/onAuthenticated/);
    expect(firstRun).toMatch(/onWalkthroughComplete/);
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/completeFirstRun/);
    expect(app).toMatch(/writeFirstRunDone/);
    expect(app).toMatch(/mode=\{firstRunMode\}/);
    expect(app).toMatch(/sign_in/);
  });
});
