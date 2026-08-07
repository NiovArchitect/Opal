import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIRST_RUN_STEPS, WALKTHROUGH_LOGO_SIZE } from "./FirstRunExperience";
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
  const logo = readFileSync(resolve(root, "brand/OpalLogo.tsx"), "utf8");

  it("removes product outer halo; keeps mark + wordmark", () => {
    expect(src).toMatch(/scene-orbit--rejected-demo/);
    expect(src).not.toMatch(/className=\"scene-orbit\"\s/);
    expect(css).toMatch(/\.scene-orbit\s*\{[\s\S]*?display:\s*none/);
    expect(src).toMatch(/first-run-wordmark/);
    expect(src).toMatch(/WalkthroughBrandLockup/);
  });

  it("no top-left logo; final has no calm-ring halo", () => {
    expect(src).toMatch(/first-run-top-spacer/);
    expect(src).not.toMatch(/scene-calm-ring/);
  });

  it("walkthrough marks force glow and ring off (mark-level halo)", () => {
    expect(src).toMatch(/glow=\{false\}/);
    expect(src).toMatch(/ring=\{false\}/);
    expect(logo).toMatch(/glow = false/);
    expect(logo).toMatch(/ring = false/);
  });

  it("screen 1 has exactly one OPAL wordmark and no duplicate OPAL kicker", () => {
    expect(FIRST_RUN_STEPS[0]?.kicker).toBe("");
    expect(FIRST_RUN_STEPS[0]?.scene).toBe("welcome");
    // Kicker only renders when non-empty
    expect(src).toMatch(/\{step\.kicker \? \(/);
    // Single brand lockup wordmark on welcome path
    const welcomeBlock = src.slice(
      src.indexOf('if (scene === "welcome")'),
      src.indexOf('if (scene === "spark")'),
    );
    const wordmarkMentions = (welcomeBlock.match(/Opal/g) || []).length;
    // "Opal" in wordmark text once; title="" on mark; no kicker Opal
    expect(wordmarkMentions).toBeLessThanOrEqual(3);
    expect(welcomeBlock).toMatch(/WalkthroughBrandLockup/);
    expect(welcomeBlock).not.toMatch(/first-run-kicker/);
  });

  it("screen 1 and Join share the approved logo-size token", () => {
    expect(WALKTHROUGH_LOGO_SIZE).toBe("walkthrough-hero");
    expect(src).toMatch(/data-logo-size=\{WALKTHROUGH_LOGO_SIZE\}/);
    expect(src).toMatch(/first-run-brand-lockup-join/);
    expect(css).toMatch(/--walkthrough-logo-mark:\s*96px/);
    expect(css).toMatch(/data-logo-size="walkthrough-hero"/);
    // Join uses hero mark (not reduced lg)
    expect(src).toMatch(/size="hero"/);
    expect(src).not.toMatch(/<OpalMark size="lg"/);
  });

  it("Join has no kicker Join and no OPAL wordmark; CTA is the only Join", () => {
    expect(FIRST_RUN_STEPS.at(-1)?.kicker).toBe("");
    expect(PRODUCT_COPY.onboardingEnter).toBe("Join");
    expect(src).toMatch(/isLast \? PRODUCT_COPY\.onboardingEnter/);
    // Join brand block: mark only, no wordmark test id on join
    const joinBlock = src.slice(src.indexOf("first-run-join-brand"));
    expect(joinBlock).toMatch(/OpalMark size="hero"/);
    expect(joinBlock).not.toMatch(/first-run-wordmark-join/);
    expect(joinBlock).not.toMatch(/>Opal</);
    // Skip only when !isLast
    expect(src).toMatch(/!isLast \? \([\s\S]*first-run-skip/);
  });

  it("no halo paths: orbit default hidden, clean filter, no stroke ring default", () => {
    expect(css).toMatch(/\.scene-orbit\s*\{[\s\S]*?display:\s*none/);
    expect(css).toMatch(/\.opal-mark--clean/);
    expect(css).toMatch(/\[data-no-halo="true"\] \.opal-mark/);
    expect(logo).toMatch(/ring = false/);
    // Stroke ring only when ring prop true
    expect(logo).toMatch(/\{ring \? \(/);
  });
});
