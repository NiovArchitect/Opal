/**
 * WeeklyBriefingCard — Attention For you / ActivityDestination.
 * Proactive threads rely on inbox:message / applyInboxMessage — no special badge.
 */
import React from "react";
import { BRAND } from "../../brand/brand";
import {
  dismissBriefing,
  fetchPastBriefings,
  type WeeklyBriefing,
} from "../../api/intelligenceClient";
import { postOpalMessage } from "../../api/productClient";

type Props = {
  briefing: WeeklyBriefing;
  bearer?: string;
  onDismissed?: (id: string) => void;
  onOpenConversation?: (conversationId: string) => void;
  onOpenPlanCreate?: (prefill: string) => void;
};

export function WeeklyBriefingCard({
  briefing,
  bearer,
  onDismissed,
  onOpenConversation,
  onOpenPlanCreate,
}: Props) {
  const [past, setPast] = React.useState<WeeklyBriefing[] | null>(null);
  const [showPast, setShowPast] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  const loadPast = async () => {
    if (past) {
      setShowPast((v) => !v);
      return;
    }
    const rows = await fetchPastBriefings({ bearer });
    setPast(rows);
    setShowPast(true);
  };

  const onDismissWeek = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await dismissBriefing(briefing.id, { bearer });
      onDismissed?.(briefing.id);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not dismiss");
    } finally {
      setBusy(false);
    }
  };

  const onQuestion = async () => {
    const q = briefing.question;
    if (!q) return;
    const link = q.link;
    if (link?.kind === "conversation" && link.id) {
      onOpenConversation?.(link.id);
      return;
    }
    const prefill = link?.prefill || q.label;
    if (link?.kind === "plan_create") {
      onOpenPlanCreate?.(prefill);
      try {
        await postOpalMessage(prefill, bearer);
        window.dispatchEvent(
          new CustomEvent("opal-open-center", {
            detail: { source: "briefing-question" },
          }),
        );
      } catch {
        /* ignore */
      }
      return;
    }
    setNote(q.label);
  };

  return (
    <article
      className="activity-row intelligence-briefing-card"
      data-testid={`briefing-card-${briefing.id}`}
      data-week-start={briefing.week_start}
      data-section="needs_you"
      aria-label={briefing.header}
    >
      <span
        className="intelligence-briefing-kicker"
        style={{ color: BRAND.palette.opalCyan }}
      >
        Opal noticed · Week
      </span>
      <strong data-testid={`briefing-header-${briefing.id}`}>
        {briefing.header}
      </strong>
      <span className="activity-row-detail">
        {briefing.week_start} → {briefing.week_end}
      </span>

      {briefing.confirmed.length > 0 ? (
        <section data-testid={`briefing-confirmed-${briefing.id}`}>
          <h3 className="intelligence-person-memory-section">
            <span style={{ fontSize: 12, textTransform: "uppercase" }}>
              Confirmed
            </span>
          </h3>
          <ul>
            {briefing.confirmed.map((c, i) => (
              <li key={i} className="activity-row-detail">
                {c.label}
                {c.day ? ` · ${c.day}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {briefing.still_open.length > 0 ? (
        <section data-testid={`briefing-open-${briefing.id}`}>
          <h3>
            <span style={{ fontSize: 12, textTransform: "uppercase" }}>
              Still open
            </span>
          </h3>
          <ul>
            {briefing.still_open.map((o, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="intelligence-briefing-cta"
                  style={{ color: BRAND.palette.electricAqua }}
                  data-testid={`briefing-open-link-${briefing.id}-${i}`}
                  onClick={() => {
                    if (o.link?.kind === "conversation" && o.link.id) {
                      onOpenConversation?.(o.link.id);
                    }
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {briefing.tight_spots.length > 0 ? (
        <section data-testid={`briefing-tight-${briefing.id}`}>
          <h3>
            <span style={{ fontSize: 12, textTransform: "uppercase" }}>
              Tight spots
            </span>
          </h3>
          <ul>
            {briefing.tight_spots.map((t, i) => (
              <li key={i} className="activity-row-detail">
                {t.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {briefing.suggestion ? (
        <p
          className="activity-row-detail"
          data-testid={`briefing-suggestion-${briefing.id}`}
        >
          {briefing.suggestion.label}
        </p>
      ) : null}

      {briefing.question ? (
        <button
          type="button"
          className="intelligence-briefing-cta"
          data-testid={`briefing-question-${briefing.id}`}
          style={{ color: BRAND.palette.electricAqua }}
          onClick={() => void onQuestion()}
        >
          {briefing.question.label}
        </button>
      ) : null}

      <div
        className="intelligence-briefing-actions"
        role="group"
        aria-label="Briefing actions"
      >
        <button
          type="button"
          className="intelligence-briefing-cta"
          data-testid={`briefing-past-${briefing.id}`}
          style={{ color: BRAND.palette.opalCyan }}
          onClick={() => void loadPast()}
        >
          {showPast ? "Hide past weeks" : "Past weeks"}
        </button>
        <button
          type="button"
          className="intelligence-briefing-dismiss"
          data-testid={`briefing-dismiss-${briefing.id}`}
          disabled={busy}
          aria-label="Dismiss briefing for this week"
          onClick={() => void onDismissWeek()}
        >
          Dismiss for week
        </button>
      </div>

      {showPast && past ? (
        <ul data-testid={`briefing-past-list-${briefing.id}`} aria-live="polite">
          {past.map((p) => (
            <li key={p.id} className="activity-row-detail">
              {p.header} · {p.week_start}
            </li>
          ))}
        </ul>
      ) : null}

      {note ? (
        <p
          className="intelligence-briefing-note"
          data-testid={`briefing-note-${briefing.id}`}
          aria-live="polite"
        >
          {note}
        </p>
      ) : null}
    </article>
  );
}
