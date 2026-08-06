import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIRST_RUN_STEPS } from "./FirstRunExperience";
import { PRODUCT_COPY } from "../designTokens";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("first-run narrative", () => {
  it("teaches Opal value without AI-hype or manipulation", () => {
    const blob = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ").toLowerCase();
    expect(blob).toMatch(/conversation/);
    expect(blob).toMatch(/plan|follow|happen/);
    expect(blob).toMatch(/private|people/);
    expect(blob).toMatch(/should actually happen|taking shape|make it happen/);
    expect(blob).not.toMatch(/your people/);
    expect(blob).not.toMatch(/don't miss|ai-powered|surveillance|daily engagement/);
    expect(blob).not.toMatch(/calm\. human\. yours|private by design/);
  });

  it("keeps screens 1-4 and converts only the final join beat", () => {
    expect(FIRST_RUN_STEPS[0]?.title).toBe("Life starts in conversation.");
    expect(FIRST_RUN_STEPS[1]?.title).toBe("When talk becomes something real.");
    expect(FIRST_RUN_STEPS[2]?.title).toBe("Decide without killing the vibe.");
    expect(FIRST_RUN_STEPS[3]?.title).toBe("Moments that actually happen.");
    expect(FIRST_RUN_STEPS.at(-1)?.id).toBe("join");
    expect(FIRST_RUN_STEPS.at(-1)?.title).toBe(
      "More of what you talk about should actually happen.",
    );
    expect(PRODUCT_COPY.onboardingEnter).toBe("Join");
    expect(PRODUCT_COPY.onboardingEnterAria).toBe("Join Opal");
  });
});

describe("P0 no-halo brand hierarchy only", () => {
  const src = readFileSync(resolve(root, "onboarding/FirstRunExperience.tsx"), "utf8");
  const css = readFileSync(resolve(root, "styles.css"), "utf8");

  it("removes product outer halo; keeps mark + wordmark", () => {
    expect(src).toMatch(/scene-orbit--rejected-demo/);
    expect(src).not.toMatch(/className=\"scene-orbit\"\s/);
    expect(css).toMatch(/\.scene-orbit\s*\{[\s\S]*?display:\s*none/);
    expect(src).toMatch(/first-run-wordmark/);
    expect(src).toMatch(/Opal/);
  });

  it("no top-left logo; final has no calm-ring halo", () => {
    expect(src).toMatch(/first-run-top-spacer/);
    expect(src).not.toMatch(/scene-calm-ring/);
  });

  it("walkthrough marks force glow and ring off (mark-level halo)", () => {
    expect(src).toMatch(/glow=\{false\}/);
    expect(src).toMatch(/ring=\{false\}/);
    const logo = readFileSync(resolve(root, "brand/OpalLogo.tsx"), "utf8");
    expect(logo).toMatch(/glow = false/);
    expect(logo).toMatch(/ring = false/);
  });
});
