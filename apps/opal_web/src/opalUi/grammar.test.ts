import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  contextChipLabel,
  contextualSharedCopy,
  FORBIDDEN_INTERNAL_PRIMITIVE_NAMES,
  FORBIDDEN_PRESSURE_PHRASES,
  groupShareCountLine,
  isInternalDesignCopy,
  privateGuidanceCopy,
  RELATIONSHIP_PULSE_EXPERIMENT,
  resolvePrimaryOpalSurface,
  shouldShowOpalEdge,
  violatesPressureCopy,
} from "./grammar";

const root = resolve(__dirname, "..");

const sampleOverlap = {
  label: "This could work",
  overlap_status: "overlap_found" as const,
  overlaps: [
    {
      display_start: "a",
      display_end: "b",
      timezone: "UTC",
      shared_safe: true as const,
    },
  ],
  no_private_schedule: true as const,
  participant_count: 2,
};

describe("Opal UI grammar — one surface at a time", () => {
  it("quiet → nothing", () => {
    expect(resolvePrimaryOpalSurface({})).toEqual({ kind: "none" });
    expect(contextChipLabel({})).toBeNull();
  });

  it("plan_forming → only Find a time chip (edge ambient, not a second surface)", () => {
    const p = resolvePrimaryOpalSurface({ signalKind: "plan_forming" });
    expect(p).toEqual({ kind: "chip", label: "Find a time", withEdge: true });
    expect(contextChipLabel({ signalKind: "plan_forming" })).toBe("Find a time");
    expect(shouldShowOpalEdge({ signalKind: "plan_forming" })).toBe(true);
    // No status copy for plan_forming under one-surface rule
    expect(contextualSharedCopy("plan_forming")).toBe("");
  });

  it("overlap_found → only insight; chip and private suppressed", () => {
    const p = resolvePrimaryOpalSurface({
      signalKind: "plan_forming",
      overlap: sampleOverlap,
      hasPrivateWindows: true,
    });
    expect(p.kind).toBe("overlap");
    if (p.kind === "overlap") {
      expect(p.label).toMatch(/could work/i);
    }
    expect(
      contextChipLabel({
        signalKind: "plan_forming",
        overlap: sampleOverlap,
      }),
    ).toBeNull();
    expect(
      privateGuidanceCopy({
        signalKind: "plan_forming",
        overlap: sampleOverlap,
        hasPrivateWindows: true,
      }),
    ).toBeNull();
  });

  it("sheet open → only sheet", () => {
    expect(
      resolvePrimaryOpalSurface({
        signalKind: "plan_forming",
        findTimeOpen: true,
        hasPrivateWindows: true,
      }),
    ).toEqual({ kind: "sheet" });
  });

  it("set → only Set", () => {
    expect(resolvePrimaryOpalSurface({ signalKind: "set" })).toEqual({
      kind: "set",
    });
    expect(
      resolvePrimaryOpalSurface({
        signalKind: "set",
        overlap: sampleOverlap,
      }),
    ).toEqual({ kind: "set" });
  });

  it("private only when it is the most useful thing", () => {
    const p = resolvePrimaryOpalSurface({ hasPrivateWindows: true });
    expect(p.kind).toBe("private");
    // Plan chip beats private
    expect(
      resolvePrimaryOpalSurface({
        signalKind: "plan_forming",
        hasPrivateWindows: true,
      }).kind,
    ).toBe("chip");
  });

  it("never stacks chip + overlap in resolver output", () => {
    const p = resolvePrimaryOpalSurface({
      signalKind: "open_loop",
      overlap: sampleOverlap,
    });
    expect(p.kind).toBe("overlap");
  });

  it("vibe copy stays human; no debug status labels", () => {
    expect(contextualSharedCopy("availability_overlap", { overlapCount: 1 })).toBe(
      "This could work",
    );
    expect(contextualSharedCopy("availability_overlap", { overlapCount: 2 })).toBe(
      "A couple times could work",
    );
    expect(contextualSharedCopy("set")).toBe("Set");
    expect(contextualSharedCopy("still_open")).toBe("");
  });

  it("group share count only from real participant_count ≥ 3 on overlap", () => {
    expect(groupShareCountLine(sampleOverlap)).toBeNull();
    expect(
      groupShareCountLine({
        ...sampleOverlap,
        participant_count: 4,
      }),
    ).toBe("From 4 people who shared a time");
  });

  it("blocks pressure and internal design/primitive names", () => {
    for (const p of FORBIDDEN_PRESSURE_PHRASES) {
      expect(violatesPressureCopy(`Still ${p}`)).toBe(true);
    }
    for (const p of FORBIDDEN_INTERNAL_PRIMITIVE_NAMES) {
      expect(isInternalDesignCopy(p)).toBe(true);
    }
    expect(isInternalDesignCopy("Find a time")).toBe(false);
    expect(isInternalDesignCopy("Thursday could work")).toBe(false);
  });

  it("Relationship Pulse stays experiment-off", () => {
    expect(RELATIONSHIP_PULSE_EXPERIMENT).toBe(false);
  });

  it("Context Chip is ≥44px; chip-edge ambient exists", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/\.opal-context-chip\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/opal-chip-edge/);
  });

  it("OpalApp uses resolvePrimaryOpalSurface — one surface + OpalInsightField", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/resolvePrimaryOpalSurface/);
    expect(app).toMatch(/primary\.kind === "chip"/);
    expect(app).toMatch(/primary\.kind === "overlap"/);
    expect(app).toMatch(/primary\.kind === "set"/);
    expect(app).toMatch(/primary\.kind === "private"/);
    expect(app).toMatch(/primary\.kind === "sheet"/);
    expect(app).toMatch(/OpalInsightField/);
  });

  it("possibility material is free-field, not a card module", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    const poss = readFileSync(resolve(root, "opalUi/OpalPossibility.tsx"), "utf8");
    const field = readFileSync(resolve(root, "opalUi/OpalInsightField.tsx"), "utf8");
    expect(css).toMatch(/\.opal-possibility\s*\{/);
    expect(css).toMatch(/opal-insight-field/);
    expect(css).toMatch(/FREE-FIELD|free-field|thread-native/i);
    // Insight field must not be a heavy glass card
    const insightBlock = css.slice(
      css.indexOf(".opal-insight-field {"),
      css.indexOf(".opal-insight-field {") + 500,
    );
    expect(insightBlock).toMatch(/background:\s*transparent/);
    expect(insightBlock).toMatch(/box-shadow:\s*none/);
    expect(css).toMatch(/min-height:\s*44px/);
    expect(poss).toMatch(/aria-pressed/);
    expect(field).toMatch(/is-converging|chosen|receding/);
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).not.toMatch(/opal-moment-expand[\s\S]*btn ghost/);
  });

  it("review route: continuous Jordan thread; chrome outside phone", () => {
    const review = readFileSync(
      resolve(root, "availability/AvailabilityReview.tsx"),
      "utf8",
    );
    expect(review).toMatch(/review-chrome/);
    expect(review).toMatch(/review-phone/);
    expect(review).toMatch(/Previous/);
    expect(review).toMatch(/Next/);
    expect(review).toMatch(/Jordan Lee/);
    expect(review).toMatch(/ContinuousPhone|STEPS/);
    expect(review).toMatch(/OpalThreadMoment/);
    // Same peer throughout — no mini-app peer swap in continuous scenario
    expect(review).not.toMatch(/Saturday dinner/);
    const code = review.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/Quiet → notice/);
    expect(code).not.toMatch(/A\. Quiet conversation/);
    expect(review).toMatch(/How was your week\?/);
  });

  it("thread history aging helpers exist", () => {
    const hist = readFileSync(resolve(root, "opalUi/threadHistory.ts"), "utf8");
    expect(hist).toMatch(/ageThreadMoments|appendThreadMoment/);
    expect(hist).toMatch(/historical|live|recent/);
  });
});
