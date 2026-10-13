import { describe, expect, it } from "vitest";
import {
  composeGraphsList,
  isSeedGraphCardId,
  GRAPH_AUTHORITY_CARDS,
} from "./graphsHydration";

describe("graphsHydration prefer-real / seed-off", () => {
  it("seed on keeps founder authority cards even with empty live", () => {
    const fix = composeGraphsList({
      founderSeedEnabled: true,
      liveGraphs: [],
      createdPlans: [],
    });
    expect(fix.mode).toBe("FOUNDER_FIXTURE");
    expect(fix.graphs.some((g) => g.id === "seed-chanelle-juniper")).toBe(true);
    expect(fix.graphs.length).toBeGreaterThanOrEqual(GRAPH_AUTHORITY_CARDS.length);
    expect(fix.seedLabeled).toBe(true);
    expect(fix.timelineItems.some((t) => t.id.startsWith("seed-"))).toBe(true);
  });

  it("seed off + no live is EMPTY with zero seed cards", () => {
    const empty = composeGraphsList({
      founderSeedEnabled: false,
      liveGraphs: [],
      createdPlans: [],
    });
    expect(empty.mode).toBe("EMPTY");
    expect(empty.graphs).toEqual([]);
    expect(empty.timelineItems).toEqual([]);
    expect(empty.seedLabeled).toBe(false);
    expect(empty.graphs.some((g) => isSeedGraphCardId(g.id))).toBe(false);
  });

  it("seed off + live graphs never includes seed-* cards", () => {
    const prod = composeGraphsList({
      founderSeedEnabled: false,
      liveGraphs: [
        {
          id: "ace99adc-db67-4258-9d95-f612246c6c84",
          title: "Fort Oak",
          whenLine: "Tonight · 8:00 PM",
          signalLine: "Ready · Walk A",
          status: "ready",
          person: "Walk B",
        },
      ],
      createdPlans: [],
    });
    expect(prod.mode).toBe("PRODUCTION_HYDRATION");
    expect(prod.graphs.every((g) => g.real)).toBe(true);
    expect(prod.graphs.some((g) => isSeedGraphCardId(g.id))).toBe(false);
    expect(prod.graphs.some((g) => g.id.includes("fort") || g.title === "Fort Oak")).toBe(
      true,
    );
    expect(prod.timelineItems.every((t) => t.source === "live")).toBe(true);
    expect(prod.seedLabeled).toBe(false);
  });

  it("seed off keeps created plan overlays without seed authority cards", () => {
    const composed = composeGraphsList({
      founderSeedEnabled: false,
      liveGraphs: [],
      createdPlans: [
        {
          id: "local-plan-maya-dinner",
          title: "Dinner with Maya",
          who: "Maya",
          when: "Friday",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(composed.mode).toBe("PRODUCTION_HYDRATION");
    expect(composed.graphs.some((g) => g.id === "local-plan-maya-dinner")).toBe(true);
    expect(composed.graphs.some((g) => g.id === "seed-chanelle-juniper")).toBe(false);
  });
});
