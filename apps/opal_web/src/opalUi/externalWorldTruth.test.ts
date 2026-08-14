import { describe, expect, it } from "vitest";
import {
  curatePresentation,
  hasProvenance,
  llmIsNotProvider,
  mergeProviderIntoSocialRank,
  overclaimsProvider,
  placeIdentity,
  softTravelCopy,
  type ProviderPlaceCandidate,
} from "./externalWorldTruth";

const juniper: ProviderPlaceCandidate = {
  id: "juniper",
  name: "Juniper & Ivy",
  area: "Little Italy",
  travel_minutes: 18,
  open_now: true,
  social_score: 4.6,
  provider_place_id: "places/ChIJ_recorded_juniper",
  provenance: {
    source: "recorded_fixture",
    source_item_id: "places/ChIJ_recorded_juniper",
    observed_at: "2026-08-13T18:00:00Z",
    live: false,
    real: false,
  },
};

describe("externalWorldTruth Pass 15", () => {
  it("curate line is quiet with travel when grounded", () => {
    const line = curatePresentation(juniper);
    expect(line.title).toBe("Juniper & Ivy");
    expect(line.meta).toMatch(/Little Italy/);
    expect(line.meta).toMatch(/18 min|about 18/);
    expect(line.fitHint).toBe("Good fit");
  });

  it("rejects overclaiming provider language", () => {
    expect(overclaimsProvider("Table is reserved for Saturday")).toBe(true);
    expect(overclaimsProvider("Juniper looks like a good fit")).toBe(false);
  });

  it("llm is not provider", () => {
    expect(llmIsNotProvider("openai")).toBe(false);
    expect(llmIsNotProvider("recorded_fixture")).toBe(true);
    expect(llmIsNotProvider("google_places")).toBe(true);
  });

  it("social order wins over provider order", () => {
    const a = { ...juniper, id: "a", provider_place_id: "a", name: "A" };
    const b = { ...juniper, id: "b", provider_place_id: "b", name: "B" };
    const merged = mergeProviderIntoSocialRank([a, b], ["b", "a"]);
    expect(merged.map((c) => c.name)).toEqual(["B", "A"]);
  });

  it("place identity retains provider id", () => {
    const id = placeIdentity(juniper);
    expect(id?.provider_place_id).toMatch(/juniper/);
    expect(id?.authorizes_set).toBe(false);
    expect(id?.reservation_available).toBe("unknown");
  });

  it("soft travel never invents 6:17 exactness", () => {
    expect(softTravelCopy(23)).toMatch(/about 25|about 20/);
    expect(softTravelCopy(23)).not.toMatch(/6:17/);
  });

  it("provenance required for grounded candidates", () => {
    expect(hasProvenance(juniper)).toBe(true);
    expect(hasProvenance({ id: "x", name: "X" })).toBe(false);
  });
});
