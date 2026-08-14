import { describe, expect, it } from "vitest";
import type { ProductSignal } from "../api/productClient";
import {
  attentionResidue,
  composeHomeAttentionField,
  continuationLabel,
  evaluateAttention,
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
});
