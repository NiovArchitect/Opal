import { describe, expect, it } from "vitest";
import {
  FAKE_BOOKING_CTA_FOR_AT_HOME,
  FAKE_TRAVEL_CTA_FOR_AT_HOME,
  GRAPH_NOT_RESERVATION,
  activityIsAtHome,
  activitySupportsProviderBooking,
  activitySupportsTravelCtas,
  executionCtaPolicy,
  inferActivityCapabilities,
} from "./activityCapabilities";

describe("activityCapabilities — GRAPH != RESERVATION", () => {
  it("exports product law zeros", () => {
    expect(GRAPH_NOT_RESERVATION).toBe(1);
    expect(FAKE_BOOKING_CTA_FOR_AT_HOME).toBe(0);
    expect(FAKE_TRAVEL_CTA_FOR_AT_HOME).toBe(0);
  });

  it("movie at home has no booking or travel CTAs", () => {
    const caps = inferActivityCapabilities("Movie at home");
    expect(activityIsAtHome(caps)).toBe(true);
    expect(activitySupportsProviderBooking(caps)).toBe(false);
    expect(activitySupportsTravelCtas(caps)).toBe(false);
    expect(executionCtaPolicy(caps)).toEqual({
      showProviderBooking: false,
      showTravelCtas: false,
      showLeaveBy: false,
    });
  });

  it("Bible study / study session stay provider-free", () => {
    for (const a of ["Bible study", "Study session together"]) {
      const caps = inferActivityCapabilities(a);
      expect(activitySupportsProviderBooking(caps)).toBe(false);
      expect(executionCtaPolicy(caps).showLeaveBy).toBe(false);
    }
  });

  it("dinner at a restaurant may support booking + place", () => {
    const caps = inferActivityCapabilities("Dinner", { placeName: "Fort Oak" });
    expect(caps.has("needs_place")).toBe(true);
    expect(activitySupportsProviderBooking(caps)).toBe(true);
    expect(activitySupportsTravelCtas(caps)).toBe(true);
    expect(executionCtaPolicy(caps).showLeaveBy).toBe(true);
  });

  it("phone call is remote without place booking", () => {
    const caps = inferActivityCapabilities("Phone call");
    expect(caps.has("supports_remote")).toBe(true);
    expect(caps.has("supports_at_home")).toBe(false);
    expect(activitySupportsProviderBooking(caps)).toBe(false);
    expect(activitySupportsTravelCtas(caps)).toBe(false);
  });

  it("unknown activity does not invent reservation semantics", () => {
    const caps = inferActivityCapabilities("Something together");
    expect(activitySupportsProviderBooking(caps)).toBe(false);
    expect(executionCtaPolicy(caps).showProviderBooking).toBe(false);
  });

  it("atHomeExplicit suppresses travel even with a place name", () => {
    const caps = inferActivityCapabilities("Movie", {
      placeName: "Home",
      atHomeExplicit: true,
    });
    expect(activityIsAtHome(caps)).toBe(true);
    expect(executionCtaPolicy(caps)).toEqual({
      showProviderBooking: false,
      showTravelCtas: false,
      showLeaveBy: false,
    });
  });
});
