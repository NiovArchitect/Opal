import {
  formatArrivalCopy,
  formatReadinessCopy,
  isProhibitedLiveCopy,
  neverInferArrivalFromClock,
} from "../socialFlow/liveExperience";

describe("liveExperience", () => {
  test("blocks blame and surveillance copy", () => {
    expect(isProhibitedLiveCopy("Chris expects to arrive around 8:20.")).toBe(false);
    expect(isProhibitedLiveCopy("Chris is unreliable")).toBe(true);
    expect(isProhibitedLiveCopy("Maya is absent")).toBe(true);
    expect(isProhibitedLiveCopy("watching your location")).toBe(true);
  });

  test("readiness is factual without percent", () => {
    expect(formatReadinessCopy(true)).toContain("Everything needed");
    expect(formatReadinessCopy(false, "Transportation is still open.")).toContain(
      "Transportation",
    );
    expect(formatReadinessCopy(true)).not.toContain("%");
  });

  test("silence is not absence", () => {
    expect(formatArrivalCopy("no_update")).toMatch(/not shared/i);
    expect(formatArrivalCopy("no_update")).not.toMatch(/absent/i);
  });

  test("clock never implies arrival", () => {
    expect(neverInferArrivalFromClock()).toBe(true);
  });
});
