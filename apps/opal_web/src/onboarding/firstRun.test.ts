import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIRST_RUN_STEPS } from "./FirstRunExperience";
import { PRODUCT_COPY } from "../designTokens";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("first-run narrative (age-12 aha)", () => {
  it("creates a 7th-grade aha without AI hype", () => {
    const blob = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ").toLowerCase();
    expect(blob).toMatch(/we should|plan/);
    expect(blob).toMatch(/private|people you actually talk to|together/);
    expect(blob).not.toMatch(/your people/);
    expect(blob).not.toMatch(/don't miss|ai-powered|surveillance|daily engagement/);
    expect(blob).not.toMatch(/social medium|chat list/);
    expect(blob).not.toMatch(/calm\. human\. yours|private by design/);
  });

  it("keeps five screens and Join conversion", () => {
    expect(FIRST_RUN_STEPS).toHaveLength(5);
    expect(FIRST_RUN_STEPS[0]?.title).toMatch(/we should/i);
    expect(FIRST_RUN_STEPS.at(-1)?.id).toBe("join");
    expect(PRODUCT_COPY.onboardingEnter).toBe("Join");
    expect(PRODUCT_COPY.onboardingEnterAria).toBe("Join Opal");
  });
});

describe("P0 no-halo brand hierarchy", () => {
  const src = readFileSync(resolve(root, "onboarding/FirstRunExperience.tsx"), "utf8");
  const css = readFileSync(resolve(root, "styles.css"), "utf8");
  const tc = readFileSync(resolve(root, "theme/technicolorProduction.css"), "utf8");

  it("does not render product outer halo (orbit only as rejected demo)", () => {
    expect(src).toMatch(/scene-orbit--rejected-demo/);
    expect(src).not.toMatch(/className=\"scene-orbit\"\s/);
    expect(css).toMatch(/\.scene-orbit\s*\{[\s\S]*?display:\s*none/);
    expect(tc).toMatch(/scene-orbit:not\(\.scene-orbit--rejected-demo\)/);
  });

  it("first screen includes OPAL wordmark and no top-left logo loop", () => {
    expect(src).toMatch(/data-testid=\"first-run-wordmark\"/);
    expect(src).toMatch(/OPAL/);
    expect(src).toMatch(/No top-left logo/);
    expect(src).toMatch(/first-run-top-spacer/);
  });

  it("Join is a real button on final screen; Skip absent when last", () => {
    expect(src).toMatch(/first-run-join/);
    expect(src).toMatch(/data-final/);
    expect(src).toMatch(/first-run-skip-spacer/);
    expect(src).toMatch(/!isLast/);
  });

  it("Becoming a plan is an Opal system moment, not a tiny chip", () => {
    expect(src).toMatch(/scene-opal-moment/);
    expect(src).toMatch(/Becoming a plan/);
    expect(src).toMatch(/opal-moment-becoming-plan/);
  });

  it("final scene has no large logo halo", () => {
    expect(src).toMatch(/join-scene-no-logo/);
    expect(src).not.toMatch(/scene-calm-ring/);
  });
});
