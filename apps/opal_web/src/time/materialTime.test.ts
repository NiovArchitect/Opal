import { describe, expect, it } from "vitest";
import { evaluateMaterialMoment } from "./materialTime";

describe("materialTime silence gate", () => {
  it("silences leave_by when too early", () => {
    const leave = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const r = evaluateMaterialMoment({ kind: "leave_by", leave_by: leave });
    expect(r.silence).toBe(true);
    if (r.silence) expect(r.reason).toBe("too_early");
  });

  it("surfaces leave_by inside window", () => {
    const leave = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const r = evaluateMaterialMoment({
      kind: "leave_by",
      leave_by: leave,
      content_summary: "Leave for Juniper",
    });
    expect(r.silence).toBe(false);
    if (!r.silence) {
      expect(r.kind).toBe("leave_by");
      expect(r.summary).toMatch(/Juniper|Leave/);
    }
  });

  it("surfaces compressed overlap once", () => {
    const r = evaluateMaterialMoment({
      kind: "availability_overlap",
      strongest_common_start: "2026-09-07T19:00:00Z",
      window_note: "Saturday evening",
      shared_safe: true,
    });
    expect(r.silence).toBe(false);
    const again = evaluateMaterialMoment(
      {
        kind: "availability_overlap",
        strongest_common_start: "2026-09-07T19:00:00Z",
      },
      { alreadyShown: true },
    );
    expect(again.silence).toBe(true);
  });

  it("shared_now never allows roster exposure", () => {
    const bad = evaluateMaterialMoment({
      kind: "shared_now",
      shared_window_start: "2026-09-07T18:00:00Z",
      participant_roster_exposed: true,
    });
    expect(bad.silence).toBe(true);
  });
});
