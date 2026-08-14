import { describe, expect, it } from "vitest";
import {
  attributeTransaction,
  classifyAttributionStrength,
  doWithPeople,
  newSocialMoment,
  recruitmentAttributable,
  simulatePoolSplit,
  socialRankUsesCommission,
} from "./socialExperience";

describe("socialExperience Pass 15 add-on", () => {
  it("moment has Do this CTA and no commerce", () => {
    const m = newSocialMoment({
      authorUserId: "you",
      caption: "Perfect place for a date where you actually want to talk.",
      placeRef: {
        display_name: "Juniper & Ivy",
        provider_place_id: "places/ChIJ_recorded_juniper",
        area_label: "Little Italy",
      },
    });
    expect(m.cta).toBe("Do this with your people");
    expect(m.commerceLed).toBe(false);
    expect(m.placeRef?.bookability).toBe("unknown");
    expect(m.placeRef?.execution).toBe("none");
  });

  it("do with people seeds independent reality", () => {
    const m = newSocialMoment({
      id: "m1",
      authorUserId: "you",
      caption: "Date night perfection.",
      placeRef: { display_name: "Juniper & Ivy", provider_place_id: "p1" },
    });
    const seed = doWithPeople(m, ["chanelle"], "maya");
    expect("error" in seed).toBe(false);
    if ("error" in seed) return;
    expect(seed.independentCircle).toBe(true);
    expect(seed.authorizesSet).toBe(false);
    expect(seed.authorizesBooking).toBe(false);
    expect(seed.socialMomentId).toBe("m1");
    expect(seed.participantUserIds).toContain("chanelle");
  });

  it("views alone are non-causal; seed+place is direct", () => {
    expect(classifyAttributionStrength({ viewedOnly: true })).toBe("non_causal_exposure");
    expect(
      classifyAttributionStrength({
        seededRealityFromMoment: true,
        placeRemainedToTransaction: true,
      }),
    ).toBe("direct_causal");
  });

  it("no transaction abstains", () => {
    const a = attributeTransaction({
      status: "none",
      causalChain: [
        {
          momentId: "m",
          authorUserId: "you",
          hop: 0,
          evidence: { seededRealityFromMoment: true },
        },
      ],
    });
    expect(a.status).toBe("abstain");
    expect(a.isPayout).toBe(false);
    expect(a.liveEconomic).toBe(false);
  });

  it("recruitment never pays", () => {
    expect(recruitmentAttributable()).toBe(false);
    const a = attributeTransaction({
      status: "completed",
      recruitmentEvent: true,
      causalChain: [],
    });
    expect(a.status).toBe("abstain");
    expect(a.reason).toMatch(/recruitment/);
  });

  it("finite hops and bounded simulation pool", () => {
    const a = attributeTransaction({
      status: "completed",
      simulation: true,
      maxHops: 3,
      causalChain: [
        {
          momentId: "jess",
          authorUserId: "jess",
          hop: 0,
          evidence: { seededRealityFromMoment: true, placeRemainedToTransaction: true },
        },
        {
          momentId: "maya",
          authorUserId: "maya",
          hop: 1,
          evidence: { seededRealityFromMoment: true },
        },
        {
          momentId: "you",
          authorUserId: "you",
          hop: 2,
          evidence: { seededRealityFromMoment: true },
        },
        {
          momentId: "ancient",
          authorUserId: "ancient",
          hop: 5,
          evidence: { seededRealityFromMoment: true },
        },
      ],
    });
    expect(a.status).toBe("attributed");
    expect(a.contributors.map((c) => c.authorUserId)).not.toContain("ancient");
    const sim = simulatePoolSplit(a.contributors, 15);
    expect(sim.simulation).toBe(true);
    expect(sim.livePayout).toBe(false);
    expect(sim.label).toBe("SIMULATION");
    expect(sim.exceedsPool).toBe(false);
  });

  it("social rank ignores commission", () => {
    expect(socialRankUsesCommission()).toBe(false);
  });
});
