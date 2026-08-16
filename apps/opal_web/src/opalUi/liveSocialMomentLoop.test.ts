import { describe, expect, it } from "vitest";
import {
  DEMO_SOCIAL_MOMENT,
  lineageAfterRealityCreate,
  presentationReopensGrounded,
  privateSeedFilamentBody,
  providerCandidatesForMomentSeed,
  realityFormingPrimaryAction,
  realityFormingTitle,
  seedRealityFromMoment,
  shouldOpenPlaceAfterForming,
} from "./liveSocialMomentLoop";
import { momentHasExactPlace, whatFromMoment } from "./socialExperience";

describe("liveSocialMomentLoop Pass 16/31 continuity", () => {
  it("demo moment is media-human not commerce with exact place", () => {
    expect(DEMO_SOCIAL_MOMENT.cta).toBe("I want to do this");
    expect(DEMO_SOCIAL_MOMENT.relationship).toBe("following");
    expect(DEMO_SOCIAL_MOMENT.commerceLed).toBe(false);
    expect(DEMO_SOCIAL_MOMENT.placeRef?.provider_place_id).toBeTruthy();
    expect(momentHasExactPlace(DEMO_SOCIAL_MOMENT)).toBe(true);
  });

  it("P0-31-01 Solo: Juniper exact place survives — WHERE not reopened", () => {
    const { seed, error } = seedRealityFromMoment(DEMO_SOCIAL_MOMENT, [], "founder", {
      solo: true,
    });
    expect(error).toBeUndefined();
    expect(seed.participantNames).toEqual(["Solo"]);
    expect(seed.when).toBe("open");
    expect(seed.inspiredByMoment).toBe(true);
    expect(seed.exactPlaceGrounded).toBe(true);
    expect(seed.intentMode).toBe("exact");
    expect(seed.placeCandidateName).toMatch(/Juniper/i);
    expect(seed.providerPlaceId).toMatch(/juniper/i);
    expect(seed.nextGap).toBe("when");
    expect(seed.nextGap).not.toBe("place");
    expect(shouldOpenPlaceAfterForming(seed)).toBe(false);
    expect(presentationReopensGrounded(seed, "place")).toBe(true);
    expect(realityFormingPrimaryAction(seed).opensPlace).toBe(false);
    expect(realityFormingPrimaryAction(seed).question).not.toMatch(/where should dinner/i);
    expect(realityFormingPrimaryAction(seed).question).not.toMatch(/where should this be/i);
    expect(realityFormingTitle(seed)).toMatch(/Juniper/i);
    expect(realityFormingTitle(seed)).not.toBe("Dinner");
    expect(seed.what).toMatch(/Juniper/i);
    expect(seed.what).not.toBe("Dinner");
  });

  it("P0-31-01 With Jordan: WHO changes, exact place remains", () => {
    const { seed, error } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [{ id: "j1", name: "Jordan" }],
      "founder",
    );
    expect(error).toBeUndefined();
    expect(seed.participantNames).toEqual(["Jordan"]);
    expect(seed.exactPlaceGrounded).toBe(true);
    expect(seed.placeCandidateName).toMatch(/Juniper/i);
    expect(seed.providerPlaceId).toMatch(/juniper/i);
    expect(seed.nextGap).toBe("when");
    expect(shouldOpenPlaceAfterForming(seed)).toBe(false);
    expect(realityFormingTitle(seed)).toMatch(/Juniper/i);
    expect(realityFormingTitle(seed)).toMatch(/Jordan/i);
    expect(privateSeedFilamentBody(seed)).toMatch(/Juniper/i);
    expect(privateSeedFilamentBody(seed)).not.toMatch(/^Dinner/);
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

  it("private filament preserves place not Dinner hard-code", () => {
    const { seed } = seedRealityFromMoment(
      DEMO_SOCIAL_MOMENT,
      [{ id: "j", name: "Jordan" }],
      "f",
    );
    const body = privateSeedFilamentBody(seed);
    expect(body).toMatch(/Juniper/i);
    expect(body).toMatch(/Jordan/i);
    expect(body).not.toMatch(/\$|earn|commission|began as|FORMING/i);
  });

  it("like_this intent does not ground exact place", () => {
    const { seed } = seedRealityFromMoment(DEMO_SOCIAL_MOMENT, [], "founder", {
      solo: true,
      intentMode: "like_this",
    });
    expect(seed.exactPlaceGrounded).toBe(false);
    expect(seed.nextGap).toBe("place");
    expect(shouldOpenPlaceAfterForming(seed)).toBe(true);
  });

  it("INV-NO-REOPEN: presentation cannot ask place when exact grounded", () => {
    const { seed } = seedRealityFromMoment(DEMO_SOCIAL_MOMENT, [], "a", { solo: true });
    expect(presentationReopensGrounded(seed, "place")).toBe(true);
    expect(presentationReopensGrounded(seed, "when")).toBe(false);
  });

  it("whatFromMoment does not invent Dinner for Juniper-only place", () => {
    expect(whatFromMoment(DEMO_SOCIAL_MOMENT)).toMatch(/Juniper/i);
    expect(whatFromMoment(DEMO_SOCIAL_MOMENT)).not.toBe("Dinner");
  });
});
