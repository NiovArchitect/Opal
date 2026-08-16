import { describe, expect, it } from "vitest";
import { seedRealityFromMoment, applyWhenToSeed, DEMO_SOCIAL_MOMENT } from "./liveSocialMomentLoop";
import {
  applyExecutionToSeed,
  compositionSettledIsNotReserved,
  humanExecutionConsequence,
  withExecutionDefaults,
} from "./realityExecution";

function juniperJordanAt730() {
  const { seed: base } = seedRealityFromMoment(
    DEMO_SOCIAL_MOMENT,
    [{ id: "j", name: "Jordan" }],
    "founder",
  );
  const { seed } = applyWhenToSeed(base, "Saturday · 7:30 PM");
  return seed;
}

function juniperSoloAt730() {
  const { seed: base } = seedRealityFromMoment(DEMO_SOCIAL_MOMENT, [], "founder", {
    solo: true,
  });
  const { seed } = applyWhenToSeed(base, "Saturday · 7:30 PM");
  return seed;
}

describe("P0-31-03 reservation → same Reality", () => {
  it("composition settled is not reserved without execution", () => {
    const seed = juniperJordanAt730();
    expect(seed.nextGap).toBe("none");
    expect(compositionSettledIsNotReserved(seed)).toBe(true);
    expect(humanExecutionConsequence({ status: "none", placeName: "Juniper", whenLabel: "7:30" })).toBeNull();
  });

  it("With Jordan confirmed attaches to same Reality + human consequence", () => {
    const before = juniperJordanAt730();
    const realityId = before.realitySeedId;
    const applied = applyExecutionToSeed(before, {
      status: "confirmed",
      executionId: "exec-j1",
      placeDisplayName: "Juniper & Ivy",
      slotLabel: "Saturday · 7:30 PM",
      liveClaimed: false,
    });
    expect(applied.lineage.realitySeedId).toBe(realityId);
    expect(applied.lineage.momentId).toBe(DEMO_SOCIAL_MOMENT.id);
    expect(applied.lineage.providerPlaceId).toMatch(/juniper/i);
    expect(applied.duplicateReality).toBe(false);
    expect(applied.compositionIntact).toBe(true);
    expect(applied.seed.placeCandidateName).toMatch(/Juniper/i);
    expect(applied.seed.when).toBe("Saturday · 7:30 PM");
    expect(applied.seed.participantNames).toEqual(["Jordan"]);
    expect(applied.seed.exactPlaceGrounded).toBe(true);
    expect(applied.seed.executionStatus).toBe("confirmed");
    expect(applied.emitConsequence).toBe(true);
    expect(applied.humanConsequence).toMatch(/Juniper/i);
    expect(applied.humanConsequence).toMatch(/7:30/);
    expect(applied.humanConsequence).not.toMatch(/execution|provider|booking operation/i);
  });

  it("Solo confirmed — no peer required; same Reality", () => {
    const before = juniperSoloAt730();
    const applied = applyExecutionToSeed(before, {
      status: "confirmed",
      executionId: "exec-s1",
      placeDisplayName: "Juniper & Ivy",
      slotLabel: "Saturday · 7:30 PM",
    });
    expect(applied.seed.participantNames).toEqual(["Solo"]);
    expect(applied.seed.realitySeedId).toBe(before.realitySeedId);
    expect(applied.seed.executionStatus).toBe("confirmed");
    expect(applied.emitConsequence).toBe(true);
  });

  it("failure keeps WHAT/WHERE/WHO/WHEN — no reopen", () => {
    const before = juniperJordanAt730();
    const applied = applyExecutionToSeed(before, {
      status: "failed",
      executionId: "exec-f1",
      placeDisplayName: "Juniper & Ivy",
      slotLabel: "Saturday · 7:30 PM",
    });
    expect(applied.seed.executionStatus).toBe("failed");
    expect(applied.seed.placeCandidateName).toBe(before.placeCandidateName);
    expect(applied.seed.when).toBe(before.when);
    expect(applied.seed.participantNames).toEqual(["Jordan"]);
    expect(applied.seed.exactPlaceGrounded).toBe(true);
    expect(applied.humanConsequence).toMatch(/couldn't be completed|intact/i);
    expect(applied.humanConsequence).not.toMatch(/where should|who should/i);
  });

  it("pending does not emit confirmed human consequence", () => {
    const before = juniperJordanAt730();
    const applied = applyExecutionToSeed(before, {
      status: "requested",
      executionId: "exec-p1",
    });
    expect(applied.seed.executionStatus).toBe("pending");
    expect(applied.emitConsequence).toBe(false);
    expect(applied.humanConsequence).toBeNull();
  });

  it("idempotent confirmation — second apply does not re-emit", () => {
    const before = juniperJordanAt730();
    const first = applyExecutionToSeed(before, {
      status: "confirmed",
      executionId: "exec-idem",
      placeDisplayName: "Juniper & Ivy",
      slotLabel: "Saturday · 7:30 PM",
    });
    expect(first.emitConsequence).toBe(true);
    const second = applyExecutionToSeed(first.seed, {
      status: "confirmed",
      executionId: "exec-idem",
      placeDisplayName: "Juniper & Ivy",
      slotLabel: "Saturday · 7:30 PM",
    });
    expect(second.emitConsequence).toBe(false);
    expect(second.humanConsequence).toBeNull();
    expect(second.seed.executionStatus).toBe("confirmed");
    expect(second.lineage.realitySeedId).toBe(before.realitySeedId);
  });

  it("provider place conflict does not silently rewrite WHERE", () => {
    const before = juniperJordanAt730();
    const applied = applyExecutionToSeed(before, {
      status: "confirmed",
      executionId: "exec-drift",
      placeDisplayName: "Harbor Table",
      slotLabel: "Saturday · 7:30 PM",
    });
    expect(applied.error).toBe("provider_place_conflict");
    expect(applied.seed.placeCandidateName).toMatch(/Juniper/i);
    expect(applied.seed.when).toBe("Saturday · 7:30 PM");
    expect(applied.seed.executionStatus).not.toBe("confirmed");
  });

  it("withExecutionDefaults does not invent reservation", () => {
    const seed = withExecutionDefaults(juniperSoloAt730());
    expect(seed.executionStatus).toBe("none");
    expect(compositionSettledIsNotReserved(seed)).toBe(true);
  });
});
