import { describe, expect, it } from "vitest";
import {
  CALENDAR_DAY_ATTRIBUTION,
  SAMPLE_DAY_ATTRIBUTION,
  SAMPLE_DAY_SPECS,
  STRIP_TICK_MS,
  composeNowStrip,
  formatStripTime,
  normalizeDayStripEvents,
  sampleDayEventsFor,
} from "./centerNowStrip";

describe("Paste W6 Phase 5 center now strip", () => {
  it("ticks at least every 60 seconds", () => {
    expect(STRIP_TICK_MS).toBe(60_000);
  });

  it("sample day uses Appointment 3:30 and Dinner 7:30 local specs", () => {
    expect(SAMPLE_DAY_SPECS.map((s) => s.title)).toEqual(["Appointment", "Dinner"]);
    expect(SAMPLE_DAY_SPECS[0]?.hour).toBe(15);
    expect(SAMPLE_DAY_SPECS[0]?.minute).toBe(30);
    expect(SAMPLE_DAY_SPECS[1]?.hour).toBe(19);
    expect(SAMPLE_DAY_SPECS[1]?.minute).toBe(30);
  });

  it("before sample events: Now/Open + next two with real times", () => {
    const day = new Date(2026, 9, 9, 10, 0, 0, 0); // local Oct 9 10:00
    const events = sampleDayEventsFor(day);
    const strip = composeNowStrip({
      nowMs: day.getTime(),
      events,
      source: "sample",
    });
    expect(strip.nodes).toHaveLength(3);
    expect(strip.nodes[0]).toMatchObject({ time: "Now", label: "Open", kind: "now" });
    expect(strip.nodes[1]?.label).toBe("Appointment");
    expect(strip.nodes[1]?.time).toBe(formatStripTime(events[0]!.startMs));
    expect(strip.nodes[2]?.label).toBe("Dinner");
    expect(strip.source).toBe("sample");
    expect(strip.attribution).toBe(SAMPLE_DAY_ATTRIBUTION);
    expect(strip.attribution).toMatch(/not your real appointments/i);
  });

  it("during Appointment: Now label is live event name + Dinner upcoming", () => {
    const day = new Date(2026, 9, 9, 15, 45, 0, 0);
    const events = sampleDayEventsFor(day);
    const strip = composeNowStrip({
      nowMs: day.getTime(),
      events,
      source: "sample",
    });
    expect(strip.nodes[0]).toMatchObject({ time: "Now", label: "Appointment" });
    expect(strip.nodes).toHaveLength(2);
    expect(strip.nodes[1]?.label).toBe("Dinner");
  });

  it("after sample day: Now/Open only — past events drop (real clock)", () => {
    const day = new Date(2026, 9, 9, 22, 0, 0, 0);
    const strip = composeNowStrip({
      nowMs: day.getTime(),
      events: sampleDayEventsFor(day),
      source: "sample",
    });
    expect(strip.nodes).toEqual([
      { id: "now", time: "Now", label: "Open", kind: "now" },
    ]);
  });

  it("calendar source never uses sample attribution", () => {
    const now = new Date(2026, 9, 9, 12, 0, 0, 0).getTime();
    const events = normalizeDayStripEvents([
      {
        id: "e1",
        title: "Standup",
        start_at: new Date(2026, 9, 9, 14, 0, 0, 0).toISOString(),
        end_at: new Date(2026, 9, 9, 14, 30, 0, 0).toISOString(),
      },
      {
        id: "e2",
        title: "Ship review",
        start_at: new Date(2026, 9, 9, 16, 0, 0, 0).toISOString(),
        end_at: new Date(2026, 9, 9, 17, 0, 0, 0).toISOString(),
      },
      {
        id: "e3",
        title: "Noise",
        start_at: new Date(2026, 9, 9, 18, 0, 0, 0).toISOString(),
        end_at: new Date(2026, 9, 9, 19, 0, 0, 0).toISOString(),
      },
    ]);
    const strip = composeNowStrip({ nowMs: now, events, source: "calendar" });
    expect(strip.nodes).toHaveLength(3);
    expect(strip.nodes.map((n) => n.label)).toEqual(["Open", "Standup", "Ship review"]);
    expect(strip.nodes.map((n) => n.label)).not.toContain("Noise");
    expect(strip.source).toBe("calendar");
    expect(strip.attribution).toBe(CALENDAR_DAY_ATTRIBUTION);
    expect(strip.attribution).not.toMatch(/sample/i);
  });

  it("seed vs real labeling stays distinct", () => {
    expect(SAMPLE_DAY_ATTRIBUTION).not.toBe(CALENDAR_DAY_ATTRIBUTION);
    expect(SAMPLE_DAY_ATTRIBUTION).toMatch(/Sample day/i);
    expect(CALENDAR_DAY_ATTRIBUTION).toMatch(/linked calendar/i);
  });
});
