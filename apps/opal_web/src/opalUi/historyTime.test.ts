import { describe, expect, it } from "vitest";
import {
  formatHistoryDetail,
  formatHistoryInstant,
  formatPastPlanWhen,
} from "./historyTime";
import { formatHumanTime } from "../sharedReality";

const now = new Date(2026, 8, 28, 15, 0, 0);

describe("history time ages", () => {
  it("uses the clock today, yesterday next, then a weekday, then a date", () => {
    expect(formatHistoryInstant(new Date(2026, 8, 28, 20, 42), now)).toMatch(/8:42\s*PM/);
    expect(formatHistoryInstant(new Date(2026, 8, 27, 20, 42), now)).toMatch(/^Yesterday · /);
    expect(formatHistoryInstant(new Date(2026, 8, 24, 20, 42), now)).toMatch(/Thursday · /);
    expect(formatHistoryInstant(new Date(2026, 8, 21, 20, 42), now)).toMatch(/^Sep 21 · /);
    expect(formatHistoryInstant(new Date(2025, 8, 21, 20, 42), now)).toMatch(/2025/);
  });

  it("does not leave a bare weekday on an old row", () => {
    const old = formatHistoryInstant(new Date(2026, 8, 1, 18, 49), now);
    expect(old).not.toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) · /);
    expect(formatHumanTime("2026-09-01T18:49:00", now)).toBe(old);
  });

  it("keeps the full date for a detail", () => {
    expect(formatHistoryDetail(new Date(2026, 8, 27, 18, 49))).toMatch(/September 27, 2026/);
  });
});

describe("M-03 past plan when", () => {
  it("reads as past — Last weekday / N days ago — never bare upcoming Tuesday", () => {
    expect(formatPastPlanWhen(new Date(2026, 8, 27, 20, 0), now)).toMatch(/^Yesterday · /);
    expect(formatPastPlanWhen(new Date(2026, 8, 24, 20, 0), now)).toMatch(/^Last Thursday · /);
    expect(formatPastPlanWhen(new Date(2026, 8, 20, 20, 0), now)).toMatch(/^8 days ago · /);
    expect(formatPastPlanWhen(new Date(2026, 8, 24, 20, 0), now)).not.toMatch(/^Thursday · /);
  });
});
