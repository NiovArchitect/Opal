/**
 * FE polish: when a reminder card and a nudge share (person_id, date),
 * the reminder wins — drop the duplicate nudge and log.
 */
import { reminderDedupeKey } from "../../realtime/intelligenceChoreography";
import type { ReminderProjection } from "./reminderLifecycle";

export type NudgeLike = {
  event_id: string;
  person_id?: string | null;
  anchor_date?: string | null;
  summary?: string | null;
};

export function dedupeNudgesAgainstReminders<T extends NudgeLike>(
  nudges: T[],
  reminders: ReminderProjection[],
): { kept: T[]; dropped: T[] } {
  const reminderKeys = new Set<string>();
  for (const r of reminders) {
    const key = reminderDedupeKey(r.personId, r.anchorDate);
    if (key) reminderKeys.add(key);
  }

  const kept: T[] = [];
  const dropped: T[] = [];
  for (const n of nudges) {
    const key = reminderDedupeKey(n.person_id, n.anchor_date);
    if (key && reminderKeys.has(key)) {
      console.info(
        "[intelligenceDedupe] reminder wins over nudge",
        key,
        n.event_id,
      );
      dropped.push(n);
    } else {
      kept.push(n);
    }
  }
  return { kept, dropped };
}

/**
 * Apply FE reminder-wins dedupe when projecting choreography nudges into UI.
 * Logs once per dropped event_id.
 */
export function projectNudgesForUi<T extends NudgeLike>(
  nudges: T[],
  reminders: ReminderProjection[],
): T[] {
  return dedupeNudgesAgainstReminders(nudges, reminders).kept;
}
