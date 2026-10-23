/**
 * Repair #18 B3 — organizer check-in summary (and member self-view).
 *
 * Division C interface law: this component renders the ONE server
 * projection (Checkin.summary_for) and derives NOTHING — counts,
 * headline copy, the still-waiting line, and every member row come
 * from the payload verbatim. A member who has not answered appears
 * as a named row in status "asked": visible, never folded into a
 * count-only remainder, never marked answered.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  getCheckin,
  type CheckinMemberView,
  type CheckinOrganizerSummary,
  type CheckinProjection,
} from "../api/productClient";

/**
 * Loader for the Center summary card: the OpalMessage in the thread
 * carries only metadata (source checkin_sweep, kind summary_ref,
 * sweep_id); the card renders the live projection for that sweep.
 */
export function CheckinSummaryCard({
  sweepId,
  bearer,
}: {
  sweepId: string;
  bearer?: string;
}) {
  const [projection, setProjection] = useState<CheckinProjection | null>(null);
  const loadedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedForRef.current === sweepId) return;
    loadedForRef.current = sweepId;
    let cancelled = false;
    (async () => {
      try {
        const res = await getCheckin(sweepId, bearer);
        if (!cancelled && res.checkin) setProjection(res.checkin);
      } catch {
        // No card is better than a stale invented one.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sweepId, bearer]);

  if (!projection) return null;
  return <CheckinSummary checkin={projection} />;
}

function statusLabel(row: CheckinOrganizerSummary["members"][number]): string {
  switch (row.response_status) {
    case "answered":
      return row.okay === "not_ok"
        ? "Not okay"
        : row.okay === "ok"
          ? "Okay"
          : "Replied in words";
    case "declined":
    case "passed":
      return "Chose not to answer";
    case "withdrawn":
      return "Withdrew their answer";
    default:
      return "Still waiting";
  }
}

export function CheckinSummary({ checkin }: { checkin: CheckinProjection }) {
  if (checkin.view === "member") {
    return <CheckinMemberSelfView view={checkin} />;
  }
  return <CheckinOrganizerSummaryView summary={checkin} />;
}

function CheckinOrganizerSummaryView({ summary }: { summary: CheckinOrganizerSummary }) {
  const { sweep, members, copy } = summary;
  return (
    <section className="checkin-summary" data-testid="checkin-summary">
      <h3 className="checkin-summary-title">
        Check-in: {sweep.circle_label}
      </h3>
      <p className="checkin-summary-headline" data-testid="checkin-summary-headline">
        {copy.headline}
      </p>
      {/* Repair #28 (W28-3): the locally derived counts paragraph
          that used to sit here stated the same tallies a second
          time (and could disagree with the headline's numerator).
          The headline is the one tally statement; the member rows
          below carry the per-person truth; the waiting line names
          who is still outstanding. Nothing is stated twice. */}
      {sweep.source_fallback ? (
        <p className="checkin-summary-fallback" data-testid="checkin-summary-fallback">
          Asked the plan's conversation members (the plan had no participant list).
        </p>
      ) : null}
      <ul className="checkin-summary-members">
        {members.map((row) => (
          <li
            key={row.user_id}
            className="checkin-summary-member"
            data-testid={`checkin-member-${row.user_id}`}
            data-status={row.response_status}
          >
            <span className="checkin-summary-member-name">{row.display_name || "Member"}</span>
            <span className="checkin-summary-member-status">{statusLabel(row)}</span>
            {row.response_status === "answered" ? (
              <>
                {row.where_text ? (
                  <span className="checkin-summary-member-where">{row.where_text}</span>
                ) : null}
                {row.needs_text ? (
                  <span className="checkin-summary-member-needs">{row.needs_text}</span>
                ) : null}
                {row.free_text ? (
                  <span className="checkin-summary-member-free">{row.free_text}</span>
                ) : null}
                {row.shared_area?.label ? (
                  <span className="checkin-summary-member-area">{row.shared_area.label}</span>
                ) : null}
              </>
            ) : null}
            {row.delivery_state === "undeliverable" ? (
              <span className="checkin-summary-member-note">no active Opal account yet</span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="checkin-summary-waiting" data-testid="checkin-summary-waiting">
        {copy.still_waiting_line}
      </p>
      {summary.not_askable_note ? (
        <p className="checkin-summary-not-askable">{summary.not_askable_note}</p>
      ) : null}
      {summary.minor_note ? (
        <p className="checkin-summary-minors">{summary.minor_note}</p>
      ) : null}
      {sweep.next_sweep_allowed_at ? (
        <p className="checkin-summary-next" data-testid="checkin-summary-next">
          Next check-in available after {sweep.next_sweep_allowed_at}
        </p>
      ) : null}
    </section>
  );
}

function CheckinMemberSelfView({ view }: { view: CheckinMemberView }) {
  const mine = view.my_response;
  return (
    <section className="checkin-summary checkin-self" data-testid="checkin-self-view">
      <h3 className="checkin-summary-title">{view.ask.title}</h3>
      {mine ? (
        <p data-testid="checkin-self-status">
          {mine.status === "answered"
            ? "You answered this check-in."
            : mine.status === "withdrawn"
              ? "You withdrew your answer."
              : "You chose not to answer."}
        </p>
      ) : (
        <p data-testid="checkin-self-status">You have not answered yet.</p>
      )}
      {view.closed_copy ? <p>{view.closed_copy}</p> : null}
    </section>
  );
}
