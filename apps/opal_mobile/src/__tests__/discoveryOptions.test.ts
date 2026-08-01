import {
  canSelectOption,
  filterHiddenSponsored,
  formatNoMatchCopy,
  isProhibitedDiscoveryCopy,
  sponsorshipAnnouncement,
} from "../socialFlow/discoveryOptions";

describe("discoveryOptions", () => {
  const organic = {
    id: "1",
    display_name: "Harbor Table",
    sponsorship_state: "organic" as const,
    accessibility_label: "Harbor Table",
    hard_constraint_pass: true,
    availability_guaranteed: false,
    availability_state: "available",
  };

  const sponsored = {
    ...organic,
    id: "2",
    display_name: "Partner Plaza Café",
    sponsorship_state: "sponsored" as const,
    sponsored_label: "Sponsored",
    accessibility_label: "Partner Plaza Café, Sponsored",
  };

  test("blocks scarcity and emotional commercial copy", () => {
    expect(isProhibitedDiscoveryCopy("Harbor Table fits accessibility.")).toBe(false);
    expect(isProhibitedDiscoveryCopy("Only 2 left — act now!")).toBe(true);
    expect(isProhibitedDiscoveryCopy("You need a relaxing date")).toBe(true);
  });

  test("announces sponsorship for screen readers", () => {
    expect(sponsorshipAnnouncement(organic)).toBe("Harbor Table");
    expect(sponsorshipAnnouncement(sponsored)).toContain("Sponsored");
  });

  test("hides sponsored without removing organic discovery", () => {
    const filtered = filterHiddenSponsored([organic, sponsored], true);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].sponsorship_state).toBe("organic");
  });

  test("stale or failed hard constraints cannot be selected", () => {
    expect(canSelectOption(organic)).toBe(true);
    expect(canSelectOption({ ...organic, hard_constraint_pass: false })).toBe(false);
    expect(canSelectOption({ ...organic, availability_state: "stale" })).toBe(false);
  });

  test("no-match copy is calm", () => {
    expect(formatNoMatchCopy()).toMatch(/couldn’t find an option/i);
    expect(formatNoMatchCopy()).not.toMatch(/%/);
  });
});
