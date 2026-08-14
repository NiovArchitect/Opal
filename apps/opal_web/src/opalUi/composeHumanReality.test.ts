import { describe, expect, it } from "vitest";
import {
  composeHumanReality,
  dedupeTemporalLabel,
  formatClockAmPm,
  isRedundantFilamentLabel,
} from "./composeHumanReality";

describe("composeHumanReality — one fact one presentation", () => {
  it("formats AM/PM for ISO clocks", () => {
    const t = formatClockAmPm("2026-08-13T18:30:00.000Z");
    // Locale-dependent absolute hour, but must include AM or PM
    expect(t).toMatch(/\b(AM|PM)\b/i);
  });

  it("formats bare 6:30 with PM for social UI", () => {
    expect(formatClockAmPm("6:30")).toMatch(/6:30\s*PM/i);
  });

  it("does not restate Thursday three times", () => {
    const c = composeHumanReality({
      what: "Dinner",
      who: "Jordan",
      when: "Thursday · 6:30 PM",
      gap: "Place still open",
    });
    // Full "Thursday" at most once (kicker); presence may use "Thu" short form
    const fullThursday = (
      `${c.kicker} ${c.headline} ${c.primary} ${c.presenceTitle} ${c.presenceDetail}`.match(
        /thursday/gi,
      ) || []
    ).length;
    expect(fullThursday).toBeLessThanOrEqual(1);
    const sixThirty = (
      `${c.primary} ${c.presenceDetail}`.match(/6:30/g) || []
    ).length;
    // primary + presenceDetail may each show time once — presence is a different surface
    // Within a single composed object field, primary should show time once
    expect((c.primary || "").match(/6:30/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(c.headline).toMatch(/Dinner/i);
    expect(c.headline).toMatch(/Jordan/i);
    expect(c.primary || c.presenceDetail).toMatch(/6:30/);
    expect(c.primary || c.presenceDetail).toMatch(/PM/i);
    expect(c.headline).not.toMatch(/6:30/);
    expect(c.headline).not.toMatch(/Thursday/i);
    void sixThirty;
  });

  it("dedupes repeated temporal fragments", () => {
    expect(dedupeTemporalLabel("Thursday · Thursday · 6:30 PM")).toBe(
      "Thursday · 6:30 PM",
    );
  });

  it("home_does_not_repeat_same_temporal_fact (Thu + Thursday)", () => {
    const c = composeHumanReality({
      what: "Dinner",
      who: "Jordan",
      when: "Thursday · 6:30",
      where: "Juniper & Ivy",
    });
    const blob = `${c.presenceDetail} ${c.primary}`;
    expect(blob).not.toMatch(/Thu\s*[·,]\s*Thursday/i);
    expect(blob).not.toMatch(/Thursday\s*[·,]\s*Thu/i);
    // Clock field never retains weekday
    expect(formatClockAmPm("Thursday · 6:30")).toMatch(/^6:30\s*PM$/i);
    expect(c.presenceDetail).toMatch(/6:30/);
    expect(c.presenceDetail).toMatch(/PM/i);
    // Day appears once (short or long), not both
    const dayHits = (c.presenceDetail.match(/\b(thu|thursday)\b/gi) || []).length;
    expect(dayHits).toBeLessThanOrEqual(1);
  });

  it("chronology_no_redundant_same_dimension_filament", () => {
    expect(
      isRedundantFilamentLabel("Dinner · Thursday · 6:30", "Dinner · Thursday · 6:30"),
    ).toBe(true);
    expect(
      isRedundantFilamentLabel("Dinner · Thursday · 6:30", "Thursday · around 6:30"),
    ).toBe(true);
    expect(
      isRedundantFilamentLabel(
        "Dinner · Thursday · 6:30",
        "Dinner · Thursday · 6:30 · Juniper & Ivy",
      ),
    ).toBe(false);
  });

  it("keeps travel secondary without restating time", () => {
    const c = composeHumanReality({
      what: "Dinner",
      who: "Jordan",
      when: "2026-08-13T18:30:00",
      where: "Juniper & Ivy",
      area: "Little Italy",
      distance: "18 min from you",
      leaveAround: "Leave around 6:55",
    });
    expect(c.primary).toMatch(/Juniper/);
    expect(c.secondary).toMatch(/Little Italy/);
    expect(c.secondary).not.toMatch(/6:30/);
  });
});
