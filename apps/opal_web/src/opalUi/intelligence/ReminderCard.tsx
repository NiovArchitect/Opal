/**
 * ReminderCard — temporal / celebration attention row for ActivityDestination.
 * Composes activity-row patterns; brand accent from BRAND.palette.opalCyan.
 *
 * Realtime: intelligence:nudge / intelligence:commitment_reminder land via
 * intelligenceChoreography (Phase 5) → attention store refresh. Foreground
 * fallback: ActivityDestination still loads via fetchAttention on mount /
 * inbox:attention invalidation when the choreography channel is offline.
 */
import React from "react";
import { BRAND } from "../../brand/brand";
import {
  postOpalMessage,
  resolveAttentionItem,
} from "../../api/productClient";
import {
  planSomethingPrefill,
  type ReminderLifecycle,
  type ReminderProjection,
} from "./reminderLifecycle";

type Props = {
  reminder: ReminderProjection;
  bearer?: string;
  /** When true, Plan something posts to Center; mock seed may omit real attention id. */
  onPlanned?: (reminder: ReminderProjection) => void;
  onDismissed?: (reminder: ReminderProjection) => void;
  onOpenPlan?: (planId: string) => void;
};

function lifecycleLabel(lifecycle: ReminderLifecycle): string {
  switch (lifecycle) {
    case "day_of":
      return "Today";
    case "passed_unplanned":
      return "Passed";
    case "planned":
      return "Planned";
    default:
      return "Upcoming";
  }
}

export function ReminderCard({
  reminder,
  bearer,
  onPlanned,
  onDismissed,
  onOpenPlan,
}: Props) {
  const [busy, setBusy] = React.useState<"plan" | "dismiss" | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  const daysLabel =
    reminder.daysUntil == null
      ? null
      : reminder.daysUntil === 0
        ? "Today"
        : reminder.daysUntil === 1
          ? "1 day"
          : reminder.daysUntil > 1
            ? `${reminder.daysUntil} days`
            : `${Math.abs(reminder.daysUntil)}d ago`;

  const onPlan = async () => {
    if (busy) return;
    setBusy("plan");
    setNote(null);
    const body = planSomethingPrefill(reminder);
    try {
      await postOpalMessage(body, bearer);
      setNote("Asked Opal — check Center.");
      onPlanned?.(reminder);
      try {
        window.dispatchEvent(
          new CustomEvent("opal-open-center", {
            detail: { source: "reminder-plan", person_id: reminder.personId },
          }),
        );
      } catch {
        /* ignore */
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not ask Opal");
    } finally {
      setBusy(null);
    }
  };

  const onDismiss = async () => {
    if (busy) return;
    setBusy("dismiss");
    setNote(null);
    try {
      if (reminder.attentionId && !reminder.attentionId.startsWith("mock-")) {
        await resolveAttentionItem(reminder.attentionId, bearer);
      }
      onDismissed?.(reminder);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not dismiss");
      setBusy(null);
      return;
    }
    setBusy(null);
  };

  return (
    <article
      className="activity-row intelligence-reminder-card"
      data-testid={`reminder-card-${reminder.attentionId}`}
      data-reminder-lifecycle={reminder.lifecycle}
      data-reminder-person={reminder.personId || undefined}
      data-plan-status={reminder.planStatus}
      data-section="needs_you"
      data-needs-you="true"
      aria-label={reminder.headline}
    >
      <div className="intelligence-reminder-main">
        <span
          className="intelligence-reminder-kicker"
          style={{ color: BRAND.palette.opalCyan }}
          data-testid={`reminder-kicker-${reminder.attentionId}`}
        >
          Opal noticed · {lifecycleLabel(reminder.lifecycle)}
        </span>
        <strong data-testid={`reminder-headline-${reminder.attentionId}`}>
          {reminder.headline}
        </strong>
        <span
          className="activity-row-detail"
          data-testid={`reminder-detail-${reminder.attentionId}`}
        >
          {[daysLabel, reminder.detail].filter(Boolean).join(" · ") ||
            (reminder.planStatus === "planned"
              ? reminder.planSummary || "Plan ready"
              : "Nothing planned yet")}
        </span>
      </div>

      <div
        className="intelligence-reminder-actions"
        role="group"
        aria-label="Reminder actions"
      >
        {reminder.lifecycle === "planned" && reminder.planId ? (
          <button
            type="button"
            className="intelligence-reminder-cta"
            data-testid={`reminder-open-plan-${reminder.attentionId}`}
            style={{ color: BRAND.palette.electricAqua }}
            onClick={() => onOpenPlan?.(reminder.planId!)}
          >
            View plan
          </button>
        ) : (
          <button
            type="button"
            className="intelligence-reminder-cta"
            data-testid={`reminder-plan-${reminder.attentionId}`}
            disabled={busy === "plan"}
            style={{ color: BRAND.palette.electricAqua }}
            onClick={() => void onPlan()}
          >
            Plan something
          </button>
        )}
        <button
          type="button"
          className="intelligence-reminder-dismiss"
          data-testid={`reminder-dismiss-${reminder.attentionId}`}
          disabled={busy === "dismiss"}
          aria-label={`Dismiss reminder for ${reminder.personName}`}
          onClick={() => void onDismiss()}
        >
          Dismiss
        </button>
      </div>
      {note ? (
        <p
          className="intelligence-reminder-note"
          data-testid={`reminder-note-${reminder.attentionId}`}
          aria-live="polite"
        >
          {note}
        </p>
      ) : null}
    </article>
  );
}
