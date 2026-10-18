import { describe, expect, it } from "vitest";
import { occurrenceLine } from "./CareRotationView";
import type { CareCheckIn } from "./careClient";

const base: CareCheckIn = {
  id: "ci-1",
  rotation_id: "rot-1",
  occurrence_key: "care:rot-1:2026-10-19",
  assignee_user_id: "ana",
  slot_user_id: "ana",
  window_start_at: "2026-10-19T22:00:00Z",
  window_end_at: "2026-10-20T02:00:00Z",
  status: "open",
  done_by_user_id: null,
  done_at: null,
  note: null,
  handoff_from_user_id: null,
  handoff_to_user_id: null,
  handoff_at: null,
  handoff_reason: null,
  missed_surfaced_at: null,
};

const names = { ana: "Ana", cora: "Cora" };

describe("care rotation occurrence lines (B4 copy law)", () => {
  it("renders a completion with its note verbatim", () => {
    expect(occurrenceLine({ ...base, status: "done", note: "Talked, all good" }, names)).toBe(
      "Ana checked in — Talked, all good",
    );
  });

  it("renders a late cover by who actually checked in", () => {
    expect(
      occurrenceLine({ ...base, status: "covered", done_by_user_id: "cora" }, names),
    ).toBe("Covered by Cora");
  });

  it("a missed window states the fact about the window, never a judgment about a person", () => {
    const line = occurrenceLine(
      { ...base, status: "open", missed_surfaced_at: "2026-10-20T02:01:00Z" },
      names,
    );
    expect(line).toBe("No check-in logged for this window — anyone can cover it");
    expect(line.toLowerCase()).not.toMatch(/fail|forgot|neglect|missed their|unwell|emergency/);
  });

  it("never renders scores, streaks, or counts", () => {
    for (const status of ["done", "covered", "cancelled", "open"]) {
      const line = occurrenceLine({ ...base, status }, names);
      expect(line).not.toMatch(/\d+ (in a row|streak|times missed|misses)/);
    }
  });
});
