import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  contextChipLabel,
  contextualSharedCopy,
  FORBIDDEN_PRESSURE_PHRASES,
  groupShareCountLine,
  isInternalDesignCopy,
  privateGuidanceCopy,
  RELATIONSHIP_PULSE_EXPERIMENT,
  shouldShowOpalEdge,
  violatesPressureCopy,
} from "./grammar";

const root = resolve(__dirname, "..");

const sampleOverlap = {
  label: "One time works for both of you.",
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

describe("Opal UI grammar", () => {
  it("context chip absent when quiet / no signal", () => {
    expect(contextChipLabel({})).toBeNull();
    expect(contextChipLabel({ signalKind: "ready" })).toBeNull();
    expect(contextChipLabel({ signalKind: "set" })).toBeNull();
  });

  it("context chip is Find a time for plan — null when overlap owns the CTA", () => {
    expect(contextChipLabel({ signalKind: "plan_forming" })).toBe("Find a time");
    expect(contextChipLabel({ signalKind: "open_loop" })).toBe("Find a time");
    // Expanded Moment owns the payoff — no duplicate chip.
    expect(
      contextChipLabel({
        signalKind: "plan_forming",
        overlap: sampleOverlap,
      }),
    ).toBeNull();
  });

  it("Opal Edge for useful states; stays true while sheet open (no remount replay)", () => {
    expect(shouldShowOpalEdge({})).toBe(false);
    expect(shouldShowOpalEdge({ signalKind: "plan_forming" })).toBe(true);
    // findTimeOpen no longer hides Edge — prevents entrance replay on close.
    expect(
      shouldShowOpalEdge({
        signalKind: "plan_forming",
        findTimeOpen: true,
      }),
    ).toBe(true);
    expect(
      shouldShowOpalEdge({
        overlap: sampleOverlap,
      }),
    ).toBe(true);
  });

  it("private guidance is first-person; proactive branch needs hasPrivateWindows", () => {
    const g = privateGuidanceCopy({
      overlap: sampleOverlap,
    });
    expect(g?.text).toMatch(/Want a couple ideas/);
    expect(g?.quiet).toBe(true);
    expect(violatesPressureCopy(g!.text)).toBe(false);

    expect(
      privateGuidanceCopy({
        overlap: {
          label: "x",
          overlap_status: "need_more_shares",
          overlaps: [],
          no_private_schedule: true,
        },
      }),
    ).toBeNull();

    const proactive = privateGuidanceCopy({
      overlap: {
        label: "x",
        overlap_status: "need_more_shares",
        overlaps: [],
        no_private_schedule: true,
      },
      hasPrivateWindows: true,
    });
    expect(proactive?.id).toBe("private-share-prompt");
    expect(proactive?.text).toMatch(/Share a couple times/);

    // No overlap object + private windows still reaches proactive nudge.
    expect(
      privateGuidanceCopy({ hasPrivateWindows: true })?.id,
    ).toBe("private-share-prompt");

    for (const p of FORBIDDEN_PRESSURE_PHRASES) {
      expect(violatesPressureCopy(`Still ${p}`)).toBe(true);
    }
  });

  it("vibe copy is natural language, not debug state labels", () => {
    expect(contextualSharedCopy("still_open", { overlapCount: 1 })).toBe(
      "This could work",
    );
    expect(contextualSharedCopy("still_open", { overlapCount: 2 })).toBe(
      "A couple options fit",
    );
    expect(contextualSharedCopy("still_open")).toBe(
      "We're still working this out",
    );
    expect(contextualSharedCopy("availability_overlap", { overlapCount: 2 })).toBe(
      "A couple times could work",
    );
    expect(contextualSharedCopy("still_open")).not.toMatch(/figuring this one out/i);
  });

  it("group share count only from real participant_count ≥ 3 on overlap", () => {
    expect(groupShareCountLine(sampleOverlap)).toBeNull();
    expect(
      groupShareCountLine({
        ...sampleOverlap,
        participant_count: 4,
      }),
    ).toBe("From 4 people who shared a time");
    expect(
      groupShareCountLine({
        ...sampleOverlap,
        participant_count: 4,
        overlap_status: "need_more_shares",
      }),
    ).toBeNull();
    expect(isInternalDesignCopy("count only, never a roster")).toBe(true);
    expect(isInternalDesignCopy("From 4 people who shared a time")).toBe(false);
  });

  it("Relationship Pulse stays experiment-off in production grammar", () => {
    expect(RELATIONSHIP_PULSE_EXPERIMENT).toBe(false);
  });

  it("shared styles do not give dominant violet to shared labels", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/opal-private-guidance/);
    expect(css).toMatch(/#8b5cf6|#8B5CF6/i);
    const shared = css.slice(
      css.indexOf("signal-availability_overlap"),
      css.indexOf("signal-availability_overlap") + 350,
    );
    expect(shared).not.toMatch(/#c4b5fd/);
  });

  it("Context Chip is ≥44px; Edge glow survives reduced-motion", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/\.opal-context-chip\s*\{[^}]*min-height:\s*44px/s);
    // Resting Edge uses box-shadow; reduced-motion must not strip it globally.
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(reduced).not.toMatch(/\.opal-moment\s*\{\s*box-shadow:\s*none/);
    expect(css).toMatch(/opal-edge-animate/);
    expect(css).toMatch(/has-opal-context/);
  });

  it("OpalApp wires edge, hasPrivateWindows, group count, expand kicker", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/opal-edge/);
    expect(app).toMatch(/opal-edge-animate/);
    expect(app).toMatch(/hasPrivateWindows/);
    expect(app).toMatch(/listMyAvailabilityWindows/);
    expect(app).toMatch(/groupShareCountLine/);
    expect(app).toMatch(/ContextChip/);
    expect(app).toMatch(/PrivateGuidance/);
    expect(app).toMatch(/opal-moment-expand/);
    expect(app).toMatch(/opal-moment-expand-kicker/);
    expect(app).toMatch(/has-opal-context/);
    expect(app).toMatch(/RELATIONSHIP_PULSE_EXPERIMENT/);
    expect(app).toMatch(/PRIVATE_DISMISS_KEY|private_dismissed/);
  });

  it("review route has no internal design rationale in product surfaces", () => {
    const review = readFileSync(
      resolve(root, "availability/AvailabilityReview.tsx"),
      "utf8",
    );
    // Notes outside phone may mention design; product strings must not.
    expect(review).not.toMatch(/count only, never a roster/);
    expect(review).toMatch(/groupShareCountLine/);
    expect(review).toMatch(/hasPrivateWindows/);
  });
});
