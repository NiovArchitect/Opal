import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIRST_RUN_STEPS } from "./FirstRunExperience";
import { PRODUCT_COPY } from "../designTokens";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("pre-member shell isolation", () => {
  it("gates member tabbar and panes behind authentication in OpalApp", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-testid="premember-walkthrough-shell"/);
    expect(app).toMatch(/data-testid="premember-activation-shell"/);
    expect(app).toMatch(/data-testid="member-shell"/);
    expect(app).toMatch(/data-testid="member-tabbar"/);
    expect(app).toMatch(/data-member-nav="false"/);
    expect(app).toMatch(/data-member-nav="true"/);
    // Walkthrough path must not render the primary tabbar.
    const walkthroughBlock = app.slice(
      app.indexOf("if (showFirstRun)"),
      app.indexOf("if (!authenticated)"),
    );
    expect(walkthroughBlock).not.toMatch(/tabbar/);
    expect(walkthroughBlock).not.toMatch(/>Home</);
    expect(walkthroughBlock).not.toMatch(/>Chats</);
    // Activation path also without tabbar.
    const activationBlock = app.slice(
      app.indexOf("if (!authenticated)"),
      app.indexOf("// --- Authenticated member shell"),
    );
    expect(activationBlock).not.toMatch(/tabbar/);
    expect(activationBlock).toMatch(/ActivationFlow/);
  });

  it("screens 1-4 preserved; final is Join without Skip or invite homework", () => {
    expect(FIRST_RUN_STEPS[0]?.title).toBe("Life starts in conversation.");
    expect(FIRST_RUN_STEPS[1]?.title).toBe("When talk becomes something real.");
    expect(FIRST_RUN_STEPS[2]?.title).toBe("Decide without killing the vibe.");
    expect(FIRST_RUN_STEPS[3]?.title).toBe("Moments that actually happen.");
    expect(FIRST_RUN_STEPS[4]?.title).toBe(
      "More of what you talk about should actually happen.",
    );
    expect(FIRST_RUN_STEPS[4]?.body).toMatch(
      /understands what is taking shape.*people carry it forward/i,
    );
    expect(PRODUCT_COPY.onboardingEnter).toBe("Join");
    expect(PRODUCT_COPY.onboardingEnterAria).toBe("Join Opal");
    expect(PRODUCT_COPY).not.toHaveProperty("onboardingInviteAfter");
    expect(PRODUCT_COPY.onboardingEnter).not.toMatch(/Continue with phone number/i);

    const firstRun = readFileSync(resolve(root, "onboarding/FirstRunExperience.tsx"), "utf8");
    expect(firstRun).toMatch(/!isLast \?/);
    expect(firstRun).toMatch(/first-run-skip/);
    expect(firstRun).toMatch(/first-run-join/);
    expect(firstRun).not.toMatch(/onboardingInviteAfter/);
    expect(firstRun).not.toMatch(/Bring your people in after you join/);
  });

  it("skip and join both complete into activation authority path", () => {
    const firstRun = readFileSync(resolve(root, "onboarding/FirstRunExperience.tsx"), "utf8");
    expect(firstRun).toMatch(/onComplete/);
    expect(firstRun).toMatch(/joiningRef/);
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/completeFirstRun/);
    expect(app).toMatch(/writeFirstRunDone/);
  });
});
