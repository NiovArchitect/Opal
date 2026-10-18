/**
 * Repair #18 Division B (B4) — care rotation view.
 *
 * Renders the rotation contract exactly as the backend projects it:
 * the set, the order, and the ledger of occurrences. No counts, no
 * streaks, no per-person tallies — by product law the ledger lists
 * occurrences chronologically and that is all. Copy follows the track
 * law: verbs are log / record / cover; the strongest statement the UI
 * makes about a window is that no check-in was logged.
 *
 * Division C owns final layout/styling integration; this component is
 * the data-faithful surface.
 */
import type { CareCheckIn, CareRotation } from "./careClient";

export function occurrenceLine(checkIn: CareCheckIn, names: Record<string, string>): string {
  const who = checkIn.assignee_user_id ? names[checkIn.assignee_user_id] || "A member" : "Unassigned";
  switch (checkIn.status) {
    case "done":
      return `${who} checked in${checkIn.note ? ` — ${checkIn.note}` : ""}`;
    case "covered": {
      const by = checkIn.done_by_user_id ? names[checkIn.done_by_user_id] || "A member" : "A member";
      return `Covered by ${by}${checkIn.note ? ` — ${checkIn.note}` : ""}`;
    }
    case "cancelled":
      return "Cancelled";
    case "open":
      return checkIn.missed_surfaced_at
        ? "No check-in logged for this window — anyone can cover it"
        : `${who} is up`;
    default:
      return who;
  }
}

export function CareRotationView({
  rotation,
  names,
  onComplete,
  onPass,
}: {
  rotation: CareRotation;
  names: Record<string, string>;
  onComplete?: (checkIn: CareCheckIn) => void;
  onPass?: (checkIn: CareCheckIn) => void;
}) {
  const open = rotation.check_ins.filter((c) => c.status === "open");
  const history = rotation.check_ins.filter((c) => c.status !== "open");

  return (
    <section aria-label={`Check-in rotation for ${rotation.subject_label}`}>
      <h2>Checking in on {rotation.subject_label}</h2>
      <p>
        {rotation.cadence.frequency === "daily"
          ? "Every day"
          : rotation.cadence.frequency === "weekly"
            ? "Weekly"
            : "On set days"}{" "}
        at {rotation.cadence.local_time}, {rotation.cadence.window_hours}h window ·{" "}
        {rotation.member_user_ids.map((id) => names[id] || "Member").join(" → ")}
      </p>

      {open.map((checkIn) => (
        <article key={checkIn.id} aria-label="Current check-in">
          <p>{occurrenceLine(checkIn, names)}</p>
          {rotation.viewer_is_member && (
            <div>
              <button type="button" onClick={() => onComplete?.(checkIn)}>
                Mark checked in
              </button>
              <button type="button" onClick={() => onPass?.(checkIn)}>
                Pass this turn
              </button>
            </div>
          )}
        </article>
      ))}

      <ol aria-label="Check-in history">
        {history.map((checkIn) => (
          <li key={checkIn.id}>{occurrenceLine(checkIn, names)}</li>
        ))}
      </ol>

      {rotation.status !== "active" && <p>This rotation is {rotation.status}.</p>}
    </section>
  );
}
