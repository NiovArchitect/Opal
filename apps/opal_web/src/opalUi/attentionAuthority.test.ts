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
  scoreAttention,
  selectHomeAwaken,
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

describe("Pass 13 attention priority correctness", () => {
  const now = new Date("2026-08-14T15:00:00-07:00"); // Thu 3 PM local-ish

  const tonightPlace = (id: string, whoLabel = "Alex") =>
    sig({
      conversation_id: id,
      lifecycle_stage: "still_open",
      label: whoLabel,
      shared_reality: {
        what: "Dinner",
        when: "Tonight · 7:00 PM",
        gaps: ["place"],
        next_gap: "place",
        sufficiency: "converging",
      },
      requires_user_action: true,
    } as ProductSignal);

  const saturdayPlace = (id: string, whoLabel = "Group") =>
    sig({
      conversation_id: id,
      lifecycle_stage: "still_open",
      label: whoLabel,
      shared_reality: {
        what: "Dinner",
        when: "Saturday · 7:30 PM",
        gaps: ["place"],
        next_gap: "place",
        sufficiency: "converging",
      },
      requires_user_action: true,
    } as ProductSignal);

  it("A: tonight actionable unresolved outranks later actionable unresolved", () => {
    const a = tonightPlace("tonight-a");
    const b = saturdayPlace("sat-b");
    const { winner, ranked } = selectHomeAwaken([b, a], now);
    expect(winner?.conversation_id).toBe("tonight-a");
    const j = ranked.find((r) => r.signal.conversation_id === "tonight-a");
    const f = ranked.find((r) => r.signal.conversation_id === "sat-b");
    expect(j!.priority).toBeGreaterThan(f!.priority);
    expect(j!.reasons.some((r) => /delay_cost_high|temporal_within|tonight/i.test(r))).toBe(true);
  });

  it("B: tonight settled no action loses to later actionable", () => {
    const settled = sig({
      conversation_id: "tonight-set",
      lifecycle_stage: "set",
      shared_reality: {
        what: "Dinner",
        when: "Tonight · 7:00 PM",
        where: "Herb & Wood",
        sufficiency: "usable",
        gaps: [],
        next_gap: "none",
      },
      requires_user_action: false,
    } as ProductSignal);
    const later = saturdayPlace("sat-action");
    const { winner } = selectHomeAwaken([settled, later], now);
    expect(winner?.conversation_id).toBe("sat-action");
  });

  it("C: later external deadline can beat tonight low-urgency place-open", () => {
    const tonightLow = tonightPlace("tonight-low");
    const satHold = {
      ...saturdayPlace("sat-hold"),
      action_deadline_minutes: 8,
    } as ProductSignal & { action_deadline_minutes: number };
    const { winner, ranked } = selectHomeAwaken([tonightLow, satHold], now);
    expect(winner?.conversation_id).toBe("sat-hold");
    const w = ranked[0];
    expect(w.reasons.some((r) => /deadline/i.test(r) || w.decision.class === "time_sensitive")).toBe(
      true,
    );
  });

  it("D: personal immediate leave can beat social later", () => {
    const sat = saturdayPlace("sat");
    const personal = sig({
      conversation_id: "personal-leave",
      lifecycle_stage: "set",
      composition: "personal",
      personal_reality: true,
      leave_by_relevant: true,
      minutes_until: 20,
      shared_reality: {
        what: "Leave for appointment",
        when: "Today · 3:30 PM",
        sufficiency: "usable",
        leave_by: "3:20 PM",
      },
    } as ProductSignal & { personal_reality: boolean; leave_by_relevant: boolean; minutes_until: number });
    const { winner } = selectHomeAwaken([sat, personal], now);
    expect(winner?.conversation_id).toBe("personal-leave");
  });

  it("E: insertion order does not change winner", () => {
    const a = tonightPlace("t1", "PersonA");
    const b = saturdayPlace("s1", "PersonB");
    const w1 = selectHomeAwaken([a, b], now).winner?.conversation_id;
    const w2 = selectHomeAwaken([b, a], now).winner?.conversation_id;
    expect(w1).toBe("t1");
    expect(w2).toBe("t1");
  });

  it("F: recompute with no feature delta keeps same winner", () => {
    const pool = [saturdayPlace("s"), tonightPlace("t")];
    const w1 = selectHomeAwaken(pool, now);
    const w2 = selectHomeAwaken(pool, now);
    expect(w1.winner?.conversation_id).toBe(w2.winner?.conversation_id);
    expect(w1.ranked[0].priority).toBe(w2.ranked[0].priority);
  });

  it("G: after tonight place resolved, later may take awaken", () => {
    const resolved = sig({
      conversation_id: "t-resolved",
      lifecycle_stage: "set",
      shared_reality: {
        what: "Dinner",
        when: "Tonight · 7:00 PM",
        where: "Juniper & Ivy",
        sufficiency: "usable",
        next_gap: "none",
        gaps: [],
      },
      requires_user_action: false,
    } as ProductSignal);
    const later = saturdayPlace("sat-next");
    const { winner } = selectHomeAwaken([resolved, later], now);
    expect(winner?.conversation_id).toBe("sat-next");
  });

  it("no identity bias: arbitrary labels same semantics", () => {
    const a = tonightPlace("id-near", "Zed");
    const b = saturdayPlace("id-far", "Ann");
    expect(selectHomeAwaken([a, b], now).winner?.conversation_id).toBe("id-near");
    expect(selectHomeAwaken([b, a], now).winner?.conversation_id).toBe("id-near");
  });

  it("scoreAttention explains delay cost without score dump fields in reasons as product copy", () => {
    const s = scoreAttention(tonightPlace("x"), now);
    expect(s.reasons.some((r) => /delay_cost/i.test(r))).toBe(true);
    expect(s.reasons.join(" ")).not.toMatch(/Temporal threshold crossed/i);
  });

  it("composeHome ranks tonight before Saturday in afterCollapse", () => {
    const ex = composeHomeAttentionFieldExplain(
      [saturdayPlace("sat"), tonightPlace("tonight")],
      { now, maxNow: 2, maxLater: 2 },
    );
    expect(ex.afterCollapse[0].signal.conversation_id).toBe("tonight");
  });
});
