import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPlanIcs,
  filterTimelineByRangeDays,
  isFutureTimelineItem,
  liveGraphsToTimelineItems,
  personNodeTemporal,
  withSeedStartsAt,
  type TimelineItem,
} from "./graphCalendaring";
import { SEED_TIMELINE_ITEMS } from "./GraphsTemporalTimeline";

const root = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Paste J Phase 5 graph calendaring", () => {
  it("person nodes expose next 3 plans and next open loop", () => {
    const chanelle = personNodeTemporal("Chanelle");
    expect(chanelle.upcomingPlans.length).toBeGreaterThan(0);
    expect(chanelle.upcomingPlans.length).toBeLessThanOrEqual(3);
    expect(chanelle.nextOpenLoop?.label).toMatch(/table time/i);
  });

  it("30-day filter keeps near items and drops far next_month estimates in a tight window", () => {
    const now = Date.parse("2026-10-09T12:00:00.000Z");
    const items: TimelineItem[] = withSeedStartsAt(
      [
        {
          id: "near",
          title: "Near",
          whenLabel: "Tonight",
          who: ["Maya"],
          bucket: "tonight",
          source: "seed",
        },
        {
          id: "far",
          title: "Far",
          whenLabel: "Next month",
          who: ["Alex"],
          bucket: "next_month",
          source: "seed",
          startsAt: new Date(now + 45 * 86400_000).toISOString(),
        },
        {
          id: "dream",
          title: "Someday",
          whenLabel: "Someday",
          who: ["You"],
          bucket: "someday",
          source: "seed",
        },
      ],
      now,
    );
    const days30 = filterTimelineByRangeDays(items, 30, now);
    expect(days30.map((i) => i.id)).toContain("near");
    expect(days30.map((i) => i.id)).toContain("dream");
    expect(days30.map((i) => i.id)).not.toContain("far");
    const days90 = filterTimelineByRangeDays(items, 90, now);
    expect(days90.map((i) => i.id)).toContain("far");
  });

  it("live graphs map into timeline items", () => {
    const items = liveGraphsToTimelineItems([
      {
        id: "plan-1",
        title: "Harbor",
        whenLine: "Tonight · 7:30",
        signalLine: "Chanelle",
        status: "ready",
        person: "Chanelle",
        startsAt: new Date(Date.now() + 4 * 3600_000).toISOString(),
      },
    ]);
    expect(items[0]?.source).toBe("live");
    expect(items[0]?.bucket).toBe("tonight");
    expect(isFutureTimelineItem(items[0]!)).toBe(true);
  });

  it("ICS export is opt-in and includes the plan title", () => {
    const ics = buildPlanIcs(SEED_TIMELINE_ITEMS[0]!);
    expect(ics).toMatch(/BEGIN:VCALENDAR/);
    expect(ics).toMatch(/SUMMARY:/);
    expect(ics).toMatch(/Juniper/);
  });

  it("timeline UI wires range toggle and future actions", () => {
    const timeline = read("opalUi/GraphsTemporalTimeline.tsx");
    expect(timeline).toMatch(/graphs-range-toggle/);
    expect(timeline).toMatch(/graphs-range-\$\{d\}/);
    expect(timeline).toMatch(/Add to calendar/);
    expect(timeline).toMatch(/graphs-message-/);
    expect(timeline).toMatch(/graphs-adjust-/);
    expect(timeline).toMatch(/graphs-temporal-seed-note/);
    expect(timeline).not.toMatch(/—/);
  });

  it("GraphsHome and profile surfaces carry temporal context", () => {
    const home = read("opalUi/GraphsHome.tsx");
    const profile = read("opalUi/GraphProfilePage.tsx");
    const social = read("opalUi/GraphSocialHome.tsx");
    expect(home).toMatch(/graphs-card-temporal/);
    expect(home).toMatch(/liveGraphsToTimelineItems/);
    expect(profile).toMatch(/gprof-upcoming-plans/);
    expect(profile).toMatch(/gprof-open-loop/);
    expect(social).toMatch(/gsh-gr-temporal/);
    expect(profile).not.toMatch(/—/);
  });
});
