import { describe, expect, it } from "vitest";
import {
  isTechnicalAudienceLanguage,
  whoCanSeeThis,
  PASS18_AUDIENCE_UX_CLOSED,
  PASS18_REALTIME_ROUTING_CLOSED,
  AUDIENCE_OPTIONS,
} from "./momentAudience";

describe("Pass 23 audience UX", () => {
  it("human labels for all scopes", () => {
    expect(whoCanSeeThis({ visibility: "friends" })).toBe("Friends");
    expect(whoCanSeeThis({ visibility: "friends", friendCount: 12 })).toBe(
      "Friends · 12 people",
    );
    expect(
      whoCanSeeThis({
        visibility: "specific_people",
        audienceLabels: ["Jordan", "Maya"],
      }),
    ).toBe("Jordan + Maya");
    expect(whoCanSeeThis({ visibility: "group", groupLabel: "Friends group" })).toBe(
      "Friends group",
    );
    expect(whoCanSeeThis({ visibility: "private" })).toBe("Only me");
  });

  it("no technical ACL language in options", () => {
    for (const o of AUDIENCE_OPTIONS) {
      expect(isTechnicalAudienceLanguage(o.label)).toBe(false);
      expect(isTechnicalAudienceLanguage(o.description)).toBe(false);
    }
  });

  it("closes Pass 18 audience UX hold (product surface)", () => {
    expect(PASS18_AUDIENCE_UX_CLOSED).toBe(true);
    expect(PASS18_REALTIME_ROUTING_CLOSED).toBe(true);
  });
});
