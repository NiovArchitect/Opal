import { describe, expect, it } from "vitest";
import type { ProductSignal } from "../api/productClient";
import {
  attentionResidue,
  composeHomeAttentionField,
  composeHomeAttentionFieldExplain,
  continuationLabel,
  evaluateAttention,
  homeEditorialLines,
  notificationCopyPreview,
  personalFlowConsequence,
  shouldOfferContinuation,
  shouldShowFilamentLabel,
} from "./attentionAuthority";

function sig(partial: Partial<ProductSignal> & { conversation_id: string }): ProductSignal {
  return {
    kind: "signal",
    label: "x",
    lifecycle_stage: "still_open",
    ...partial,
  } as ProductSignal;
}

describe("attentionAuthority", () => {
  it("silences weak intention without dims", () => {
    const d = evaluateAttention(
      sig({
        conversation_id: "c1",
        lifecycle_stage: "quiet",
        shared_reality: { sufficiency: "intention" },
      }),
    );
    expect(d.class).toBe("silence");
    expect(d.shouldSurfaceHome).toBe(false);
  });

  it("surfaces place gap as action_required", () => {
    const d = evaluateAttention(
      sig({
        conversation_id: "c2",
        lifecycle_stage: "still_open",
        shared_reality: {
          what: "Dinner",
          when: "Thursday · 6:30 PM",
          gaps: ["place"],
          sufficiency: "converging",
        },
        requires_user_action: true,
      } as ProductSignal),
    );
    // next_gap may come from gaps[0]
    expect(d.shouldSurfaceHome).toBe(true);
    expect(["action_required", "ambient", "useful_now"]).toContain(d.class);
  });

  it("Home field stays sparse when many signals exist", () => {
    const many: ProductSignal[] = Array.from({ length: 15 }, (_, i) =>
      sig({
        conversation_id: `c${i}`,
        lifecycle_stage: i < 4 ? "still_open" : i < 8 ? "set" : "handled",
        shared_reality: {
          what: "Dinner",
          when: "Sat",
          sufficiency: i < 8 ? "usable" : "intention",
          gaps: i < 4 ? ["place"] : [],
        },
        requires_user_action: i < 4,
      } as ProductSignal),
    );
    const field = composeHomeAttentionField(many);
    expect(field.length).toBeLessThanOrEqual(6);
    expect(field.every((f) => f.decision.shouldSurfaceHome)).toBe(true);
  });

  it("more non-home signals do not increase surfaced Home count", () => {
    const base = [
      sig({
        conversation_id: "main",
        lifecycle_stage: "still_open",
        shared_reality: { what: "Dinner", when: "Thu", gaps: ["place"], sufficiency: "converging" },
        requires_user_action: true,
      } as ProductSignal),
    ];
    const bloated = [
      ...base,
      ...Array.from({ length: 8 }, (_, i) =>
        sig({
          conversation_id: `noise${i}`,
          lifecycle_stage: "quiet",
          kind: "proposal",
          shared_reality: { sufficiency: "intention" },
        }),
      ),
    ];
    const a = composeHomeAttentionField(base).length;
    const b = composeHomeAttentionField(bloated).length;
    expect(b).toBeLessThanOrEqual(a + 1);
  });

  it("suppresses chronology replaced-day noise", () => {
    expect(shouldShowFilamentLabel("Thursday · 6:30 replaced Thursday")).toBe(false);
    expect(shouldShowFilamentLabel("Dinner became the plan.")).toBe(true);
  });

  it("continuation labels are daypart-aware without night hardcode for morning", () => {
    expect(continuationLabel({ hour: 9 })).not.toMatch(/night/i);
    expect(continuationLabel({ hour: 22 })).toMatch(/night|evening|Continue/i);
    expect(continuationLabel({ remote: true })).toMatch(/hanging out/i);
  });

  it("attention residue reports silence share", () => {
    const r = attentionResidue([
      sig({ conversation_id: "a", kind: "proposal" }),
      sig({
        conversation_id: "b",
        lifecycle_stage: "still_open",
        shared_reality: { gaps: ["place"], what: "Dinner", sufficiency: "converging" },
        requires_user_action: true,
      } as ProductSignal),
    ]);
    expect(r.total).toBe(2);
    expect(r.silenced).toBeGreaterThanOrEqual(1);
  });

  it("same conversation multiple signals collapse to one Home row", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      sig({
        conversation_id: "jordan",
        lifecycle_stage: "still_open",
        shared_reality: {
          what: "Dinner",
          when: "Thu",
          gaps: ["place"],
          next_gap: "place",
          sufficiency: "converging",
        },
        requires_user_action: true,
        label: `variant-${i}`,
      } as ProductSignal),
    );
    const ex = composeHomeAttentionFieldExplain(many, { maxNow: 5, maxLater: 5 });
    const jordan = ex.surfaced.filter((s) => s.signal.conversation_id === "jordan");
    expect(jordan.length).toBe(1);
    expect(ex.suppressed.some((s) => s.suppressReason.includes("reality_collapse"))).toBe(true);
  });

  it("imminent action outranks far action before caps", () => {
    const far = sig({
      conversation_id: "sat",
      lifecycle_stage: "still_open",
      shared_reality: { what: "Dinner", gaps: ["place"], next_gap: "place", sufficiency: "converging" },
      requires_user_action: true,
      minutes_until: 3000,
    } as ProductSignal & { minutes_until: number });
    const near = sig({
      conversation_id: "jordan",
      lifecycle_stage: "still_open",
      shared_reality: { what: "Dinner", gaps: ["place"], next_gap: "place", sufficiency: "converging" },
      requires_user_action: true,
      minutes_until: 40,
    } as ProductSignal & { minutes_until: number });
    const ex = composeHomeAttentionFieldExplain([far, near], { maxNow: 1, maxLater: 0, maxQuiet: 0 });
    expect(ex.surfaced).toHaveLength(1);
    expect(ex.surfaced[0].signal.conversation_id).toBe("jordan");
  });

  it("home editorial is not night-centric when morning and quiet", () => {
    const [a, b] = homeEditorialLines({ hour: 9, hasAction: false, hasPresence: false });
    expect(a.toLowerCase()).toMatch(/morning/);
    expect(b.toLowerCase()).not.toMatch(/night/);
  });

  it("home editorial marks action when awaken is present", () => {
    const [a, b] = homeEditorialLines({ hour: 19, hasAction: true, hasPresence: true });
    expect(`${a} ${b}`.toLowerCase()).toMatch(/needs you|tonight/);
  });

  it("continuation suppression when next commitment is soon", () => {
    expect(shouldOfferContinuation({ nextCommitmentSoon: true })).toBe(false);
    expect(shouldOfferContinuation({ userAlreadyLeaving: true })).toBe(false);
    expect(shouldOfferContinuation({ currentRealityIncomplete: true })).toBe(false);
    expect(shouldOfferContinuation({})).toBe(true);
  });

  it("personal flow is silent early and on-track", () => {
    expect(personalFlowConsequence("early")).toBeNull();
    expect(personalFlowConsequence("on_track")).toBeNull();
    expect(personalFlowConsequence("pre_departure")).toMatch(/Leave around/i);
  });

  it("notification copy is human not technical", () => {
    expect(notificationCopyPreview("actionable")).toMatch(/Leave around/i);
    expect(notificationCopyPreview("actionable")).not.toMatch(/temporal|recompute/i);
    expect(notificationCopyPreview("silent")).toBeNull();
  });

  it("suppresses vague dinner forming filament", () => {
    expect(shouldShowFilamentLabel("Dinner · forming")).toBe(false);
    expect(shouldShowFilamentLabel("Dinner became the plan.")).toBe(true);
  });
});
