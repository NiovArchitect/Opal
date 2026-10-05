import { describe, expect, it } from "vitest";
import {
  bestTimeToLeave,
  buildJuniperConvoyFixture,
  convoyStatusLine,
  formatClock,
  geometricEta,
  JUNIPER_VENUE,
  FOUNDER_ORIGIN_FIXTURE,
  sortConvoyByArrival,
  youdArrive,
} from "./graphConvoyEta";

describe("graphConvoyEta geometric + convoy", () => {
  it("computes haversine geometric ETA for fixture coords", () => {
    const eta = geometricEta(FOUNDER_ORIGIN_FIXTURE, JUNIPER_VENUE);
    expect(eta.estimateClass).toBe("geometric_estimate");
    expect(eta.trafficAware).toBe(false);
    expect(eta.provider).toBe("haversine");
    expect(eta.durationMinutes).toBeGreaterThanOrEqual(1);
    expect(eta.durationMinutes).toBeLessThan(60);
    expect(eta.distanceMeters).toBeGreaterThan(1000);
  });

  it("best time to leave subtracts travel + 15m buffer", () => {
    const reservation = new Date("2026-10-05T19:30:00");
    const leave = bestTimeToLeave(reservation, 18, 15);
    expect(formatClock(leave)).toBe("6:57 PM");
  });

  it("you'd arrive adds travel minutes to now", () => {
    const now = new Date("2026-10-05T18:00:00");
    expect(formatClock(youdArrive(now, 22))).toBe("6:22 PM");
  });

  it("privacy: not sharing never says Not left yet", () => {
    const line = convoyStatusLine({
      userId: "a",
      displayName: "Alex",
      travelState: "not_started",
      shareMode: "none",
      minutesAway: 18,
    });
    expect(line).toBe("Not sharing location");
    expect(line).not.toMatch(/Not left yet/);
  });

  it("sharing + not started can say Not left yet", () => {
    const line = convoyStatusLine({
      userId: "s",
      displayName: "Sabrina",
      travelState: "not_started",
      shareMode: "eta",
      minutesAway: 18,
    });
    expect(line).toBe("Not left yet · 18 min away");
  });

  it("sorts convoy by earliest arrival", () => {
    const now = new Date("2026-10-05T18:00:00");
    const rows = sortConvoyByArrival(buildJuniperConvoyFixture(now), now);
    expect(rows[0]?.displayName).toBe("Jordan");
    expect(rows[0]?.line).toMatch(/Arrived/);
    expect(rows.some((r) => r.line.includes("Not sharing location"))).toBe(true);
    const sharingOnWay = rows.find((r) => r.displayName === "Chanelle");
    expect(sharingOnWay?.line).toMatch(/On the way/);
    // Alex (not sharing) sorts after members with arrival times
    const alexIdx = rows.findIndex((r) => r.displayName === "Alex");
    const jordanIdx = rows.findIndex((r) => r.displayName === "Jordan");
    expect(alexIdx).toBeGreaterThan(jordanIdx);
  });
});
