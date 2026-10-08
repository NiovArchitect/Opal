import { describe, expect, it, vi } from "vitest";
import { dedupeNudgesAgainstReminders } from "./intelligenceDedupe";
import { REMINDER_MOCK_SEED } from "./reminderLifecycle";

describe("intelligenceDedupe", () => {
  it("reminder wins over nudge same (person_id, date) and logs", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const reminder = REMINDER_MOCK_SEED[0]; // Maya + 2026-06-14
    const { kept, dropped } = dedupeNudgesAgainstReminders(
      [
        {
          event_id: "nudge-dup",
          person_id: reminder.personId,
          anchor_date: reminder.anchorDate,
          summary: "dup",
        },
        {
          event_id: "nudge-other",
          person_id: "person-other",
          anchor_date: "2026-01-01",
          summary: "keep",
        },
      ],
      [reminder],
    );
    expect(dropped.map((d) => d.event_id)).toEqual(["nudge-dup"]);
    expect(kept.map((k) => k.event_id)).toEqual(["nudge-other"]);
    expect(info).toHaveBeenCalledWith(
      "[intelligenceDedupe] reminder wins over nudge",
      "person-maya|2026-06-14",
      "nudge-dup",
    );
    info.mockRestore();
  });
});
