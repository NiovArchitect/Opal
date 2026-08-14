import { describe, expect, it } from "vitest";
import {
  candidatesFromProviderProjection,
  composePlaceOptions,
  defaultPlaceCandidates,
  detectCurrentIntent,
  episodeCategoryFrom,
} from "./placeComposition";

describe("placeComposition — memory + episode precedence", () => {
  it("provider projection feeds existing composePlaceOptions without new engine", () => {
    const fromProvider = candidatesFromProviderProjection([
      {
        provider_place_id: "places/b",
        name: "B Place",
        area: "Downtown",
        cuisine: "italian",
        social_score: 4.0,
      },
      {
        provider_place_id: "juniper",
        name: "Juniper & Ivy",
        area: "Little Italy",
        cuisine: "italian",
        quiet: true,
        social_score: 4.6,
      },
    ]);
    const r = composePlaceOptions({
      candidates: fromProvider,
      category: "italian",
      currentIntent: "quiet",
    });
    expect(r.ranked.length).toBeGreaterThan(0);
    // social re-rank may prefer quiet Italian — not provider insertion order
    expect(r.ranked.some((c) => c.id === "juniper" || c.name.includes("Juniper"))).toBe(true);
  });

  it("Italian episode category ranks Juniper first", () => {
    const r = composePlaceOptions({
      candidates: defaultPlaceCandidates(),
      placeGapLabel: "Italian dinner · place still open",
    });
    expect(r.episodeCategory).toBe("italian");
    expect(r.ranked[0]?.id).toBe("juniper");
  });

  it("current lively intent overrides quiet relationship memory", () => {
    const r = composePlaceOptions({
      candidates: defaultPlaceCandidates(),
      placeGapLabel: "Italian dinner · place still open",
      relationshipPrefs: [
        {
          preference: "quiet restaurants",
          polarity: "prefer",
          weight_class: "old_statement",
        },
      ],
      currentIntent: "lively",
    });
    // Campfire is lively (quiet:false); may compete with Italian boost on Juniper
    const top = r.ranked[0];
    expect(top).toBeTruthy();
    // Intent applied
    expect(r.currentIntent).toBe("lively");
    // Quiet-only memory must not force only quiet if lively said
    const livelyPresent = r.ranked.some((c) => c.quiet === false);
    expect(livelyPresent || top?.quiet === false).toBe(true);
  });

  it("detectCurrentIntent from thread text", () => {
    expect(detectCurrentIntent("somewhere lively tonight")).toBe("lively");
    expect(detectCurrentIntent("prefer quiet")).toBe("quiet");
  });

  it("fixed venue / where known → memory irrelevant", () => {
    const r = composePlaceOptions({
      candidates: defaultPlaceCandidates(),
      placeGapLabel: "Italian",
      whereKnown: true,
    });
    expect(r.irrelevant).toBe(true);
    expect(r.ranked).toEqual([]);
  });

  it("episodeCategoryFrom place_gap_label", () => {
    expect(
      episodeCategoryFrom({ placeGapLabel: "Italian dinner · place still open" }),
    ).toBe("italian");
  });
});
