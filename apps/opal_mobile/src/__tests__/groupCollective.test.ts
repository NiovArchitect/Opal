import {
  canClaimEveryoneAgreed,
  formatReadiness,
  isProhibitedGroupCopy,
} from "../socialFlow/groupCollective";

describe("groupCollective", () => {
  test("blocks ranking and pressure copy", () => {
    expect(isProhibitedGroupCopy("Saturday works for three people.")).toBe(false);
    expect(isProhibitedGroupCopy("Maya is holding the group back")).toBe(true);
    expect(isProhibitedGroupCopy("67% complete")).toBe(true);
  });

  test("everyone agreed requires no silence or tentative", () => {
    expect(
      canClaimEveryoneAgreed({
        accepted_count: 3,
        tentative_count: 1,
        silent_required_count: 0,
        copy: "x",
        everyone_agreed: true,
        majority_is_not_consensus: true,
      }),
    ).toBe(false);
    expect(
      canClaimEveryoneAgreed({
        accepted_count: 4,
        tentative_count: 0,
        silent_required_count: 0,
        copy: "x",
        everyone_agreed: true,
        majority_is_not_consensus: true,
      }),
    ).toBe(true);
  });

  test("readiness is factual not percent", () => {
    expect(formatReadiness(2, 1)).toContain("remain");
    expect(formatReadiness(2, 0)).toContain("Everything needed");
    expect(formatReadiness(2, 1)).not.toContain("%");
  });
});
