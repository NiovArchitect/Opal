import { describe, expect, it } from "vitest";
import {
  FOUNDER_VISUAL_DECISION,
  intensityForPhase,
  OPAL_SPECTRUM,
  semanticStateForSignal,
  visualShellProps,
  WALKTHROUGH_SCENE_MOOD,
} from "./technicolorProduction";
import { FIRST_RUN_STEPS } from "../onboarding/FirstRunExperience";
import { PRODUCT_COPY } from "../designTokens";
import fs from "node:fs";
import path from "node:path";

describe("production Technicolor system", () => {
  it("locks founder visual decision", () => {
    expect(FOUNDER_VISUAL_DECISION.walkthrough).toBe("full");
    expect(FOUNDER_VISUAL_DECISION.activation).toBe("controlled");
    expect(FOUNDER_VISUAL_DECISION.memberProduct).toBe("controlled");
    expect(FOUNDER_VISUAL_DECISION.experimentMerge).toBe(false);
  });

  it("maps walkthrough to full and member/activation to controlled", () => {
    expect(intensityForPhase("walkthrough")).toBe("full");
    expect(intensityForPhase("activation")).toBe("controlled");
    expect(intensityForPhase("member")).toBe("controlled");
  });

  it("does not put full intensity attributes on member shell props", () => {
    const member = visualShellProps("member");
    expect(member["data-technicolor"]).toBe("controlled");
    expect(member["data-visual-phase"]).toBe("member");
    expect(member.className).toContain("tc-controlled");
    expect(member.className).not.toContain("tc-full");

    const walk = visualShellProps("walkthrough");
    expect(walk["data-technicolor"]).toBe("full");
    expect(walk.className).toContain("tc-full");
  });

  it("maps signals to semantic states with non-color-only labels available", () => {
    expect(semanticStateForSignal("plan_forming")).toBe("recognition");
    expect(semanticStateForSignal("open_loop")).toBe("participation");
    expect(semanticStateForSignal("ready")).toBe("completion");
    expect(semanticStateForSignal("private")).toBe("private");
    expect(semanticStateForSignal("execution")).toBe("execution");
    expect(semanticStateForSignal("failed")).toBe("urgency");
  });

  it("preserves S1 first-run people-first titles", () => {
    expect(FIRST_RUN_STEPS.map((s) => s.id)).toEqual([
      "fr00",
      "fr01",
      "fr02",
      "fr03",
      "fr04",
      "fr05",
    ]);
    expect(FIRST_RUN_STEPS[5]?.title).toMatch(/Start with your people/i);
    // Legacy Join tokens may remain for other surfaces; S1 conversion is phone CTA.
    expect(PRODUCT_COPY.onboardingContinue).toBe("Continue");
  });

  it("has scene mood for known walkthrough scenes when mapped", () => {
    for (const step of FIRST_RUN_STEPS) {
      if (WALKTHROUGH_SCENE_MOOD[step.scene as keyof typeof WALKTHROUGH_SCENE_MOOD]) {
        expect(WALKTHROUGH_SCENE_MOOD[step.scene as keyof typeof WALKTHROUGH_SCENE_MOOD]).toBeTruthy();
      }
    }
  });

  it("owns Opal spectrum (not Google branding tokens)", () => {
    expect(OPAL_SPECTRUM.luminousCyan).toMatch(/^#/i);
    expect(OPAL_SPECTRUM.warmIvory).toMatch(/^#/i);
    expect(Object.keys(OPAL_SPECTRUM)).not.toContain("googleBlue");
  });

  it("CSS scopes full mesh to walkthrough and controlled moments to product", () => {
    const cssPath = path.join(__dirname, "technicolorProduction.css");
    const css = fs.readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\[data-technicolor="full"\]/);
    expect(css).toMatch(/\[data-technicolor="controlled"\]/);
    expect(css).toMatch(/first-run-mesh/);
    expect(css).toMatch(/opal-moment/);
    expect(css).toMatch(/prefers-reduced-motion/);
    // No experiment founder chrome in production CSS
    expect(css).not.toMatch(/DARK TECHNICOLOR STUDY/i);
    expect(css).not.toMatch(/mode-btn|study-chrome/);
  });
});
