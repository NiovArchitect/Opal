import { describe, expect, it } from "vitest";
import {
  DEMO_SOCIAL_MOMENT,
  lineageAfterRealityCreate,
  privateSeedFilamentBody,
  providerCandidatesForMomentSeed,
  seedRealityFromMoment,
} from "./liveSocialMomentLoop";

describe("liveSocialMomentLoop Pass 16", () => {
  it("demo moment is media-human not commerce", () => {
    // Pass 29c: creator I follow → natural desire CTA (not ownership)
    expect(DEMO_SOCIAL_MOMENT.cta).toBe("I want to do this");
    expect(DEMO_SOCIAL_MOMENT.relationship).toBe("following");
    expect(DEMO_SOCIAL_MOMENT.commerceLed).toBe(false);
    expect(DEMO_SOCIAL_MOMENT.placeRef?.provider_place_id).toBeTruthy();
    expect(DEMO_SOCIAL_MOMENT.placeRef?.bookability).toBe("unknown");
  });

  it("solo fork seeds Reality without forced friend picker", () => {
    const { seed, error } = seedRealityFromMoment(DEMO_SOCIAL_MOMENT, [], "founder", {
      solo: true,
    });
    expect(error).toBeUndefined();
    expect(seed.participantNames).toEqual(["Solo"]);
    expect(seed.when).toBe("open");
    expect(seed.inspiredByMoment).toBe(true);
  });

  it("seeds reality with when open and place identity", () => {
    const { seed, error } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [{ id: "j1", name: "Jordan Lee" }],
      "founder",
    );
    expect(error).toBeUndefined();
    expect(seed.when).toBe("open");
    expect(seed.providerPlaceId).toMatch(/juniper/i);
    expect(seed.liveProviderClaimed).toBe(false);
    expect(seed.bookability).toBe("unknown");
    expect(seed.lineageEdge.kind).toBe("inspired_by");
  });

  it("provider candidates feed curate without auto-win only juniper", () => {
    const p = providerCandidatesForMomentSeed(DEMO_SOCIAL_MOMENT);
    expect(p.liveClaimed).toBe(false);
    expect(p.source).toBe("recorded_fixture");
    expect(p.candidates.length).toBeGreaterThan(1);
    expect(p.candidates.some((c) => /Juniper/i.test(c.name))).toBe(true);
  });

  it("lineage after create is structural not payout", () => {
    const { seed } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [{ id: "j", name: "Jordan" }],
      "f",
    );
    const lin = lineageAfterRealityCreate(seed);
    expect(lin.isPayout).toBe(false);
    expect(lin.liveEconomic).toBe(false);
    expect(lin.strength).toBe("strong_assist");
  });

  it("private filament is human not economic", () => {
    const { seed } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [{ id: "j", name: "Jordan" }],
      "f",
    );
    const body = privateSeedFilamentBody(seed);
    expect(body).toMatch(/Dinner with Jordan/i);
    expect(body).toMatch(/still opening/i);
    expect(body).not.toMatch(/\$|earn|commission|began as|FORMING/i);
  });
});
