/**
 * MediationCard — ActivityDestination For you.
 *
 * Backend delivery is owner_center (GroupCoordinator): Send opens compose /
 * postOpalMessage with the draft. Never claim Opal auto-posted to the group.
 */
import React from "react";
import { BRAND } from "../../brand/brand";
import type { MediationItem } from "../../api/intelligenceClient";
import {
  dismissMediationCard,
  handoffMediationDraftToCenter,
  lockInConsensusPlan,
} from "./mediationActions";

type Props = {
  item: MediationItem;
  bearer?: string;
  onDismissed?: (id: string) => void;
  onSent?: (id: string) => void;
  onPlanCreated?: (id: string) => void;
};

export function MediationCard({
  item,
  bearer,
  onDismissed,
  onSent,
  onPlanCreated,
}: Props) {
  const [draft, setDraft] = React.useState(item.mediation_draft);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState<"send" | "dismiss" | "plan" | null>(
    null,
  );
  const [note, setNote] = React.useState<string | null>(null);

  const isConsensus = item.status === "reached";

  const onSend = async () => {
    if (busy) return;
    setBusy("send");
    setNote(null);
    try {
      await handoffMediationDraftToCenter(item, draft, bearer);
      setNote("Opened in Center — you send to the group.");
      onSent?.(item.id);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not open draft");
    } finally {
      setBusy(null);
    }
  };

  const onDismiss = async () => {
    if (busy) return;
    setBusy("dismiss");
    try {
      await dismissMediationCard(item, bearer);
      onDismissed?.(item.id);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not dismiss");
      setBusy(null);
      return;
    }
    setBusy(null);
  };

  const onCreatePlan = async () => {
    if (busy) return;
    setBusy("plan");
    setNote(null);
    try {
      await lockInConsensusPlan(item, bearer);
      setNote("Asked Opal to create the plan — check Center.");
      onPlanCreated?.(item.id);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not create plan");
    } finally {
      setBusy(null);
    }
  };

  return (
    <article
      className="activity-row intelligence-mediation-card"
      data-testid={`mediation-card-${item.id}`}
      data-mediation-status={item.status}
      data-card-state={item.card_state}
      data-section="needs_you"
      aria-label={
        isConsensus
          ? `Consensus on ${item.topic}`
          : `Mediation needed: ${item.topic}`
      }
    >
      <span
        className="intelligence-mediation-kicker"
        style={{ color: BRAND.palette.opalCyan }}
      >
        Opal noticed · {isConsensus ? "Consensus" : "Mediation"}
      </span>
      <strong data-testid={`mediation-topic-${item.id}`}>{item.topic}</strong>

      {!isConsensus ? (
        <ul
          className="intelligence-mediation-positions"
          data-testid={`mediation-positions-${item.id}`}
        >
          {item.positions.map((p, i) => (
            <li key={i} data-testid={`mediation-position-${item.id}-${i}`}>
              <span className="activity-row-detail">
                {p.proposal}
                {p.supporters.length
                  ? ` — ${p.supporters.join(", ")}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="activity-row-detail" data-testid={`mediation-consensus-${item.id}`}>
          {item.positions[0]?.proposal || "Agreement reached"}
        </span>
      )}

      {item.silent_participants.length > 0 ? (
        <span
          className="activity-row-detail"
          data-testid={`mediation-silent-${item.id}`}
        >
          Quiet: {item.silent_participants.join(", ")}
        </span>
      ) : null}

      {editing ? (
        <textarea
          data-testid={`mediation-draft-edit-${item.id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Edit mediation draft"
          rows={4}
          style={{
            width: "100%",
            maxWidth: 350,
            marginTop: 8,
            background: "transparent",
            color: "inherit",
            border: `1px solid ${BRAND.palette.opalCyan}`,
            borderRadius: 8,
            padding: 8,
          }}
        />
      ) : (
        <blockquote
          className="activity-row-detail"
          data-testid={`mediation-draft-${item.id}`}
          style={{ margin: "8px 0 0", fontStyle: "normal" }}
        >
          {draft}
        </blockquote>
      )}

      <div
        className="intelligence-mediation-actions"
        role="group"
        aria-label="Mediation actions"
      >
        {isConsensus ? (
          <button
            type="button"
            className="intelligence-mediation-cta"
            data-testid={`mediation-create-plan-${item.id}`}
            disabled={busy === "plan"}
            style={{ color: BRAND.palette.electricAqua }}
            onClick={() => void onCreatePlan()}
          >
            Create plan
          </button>
        ) : (
          <>
            <button
              type="button"
              className="intelligence-mediation-cta"
              data-testid={`mediation-send-${item.id}`}
              disabled={busy === "send"}
              style={{ color: BRAND.palette.electricAqua }}
              onClick={() => void onSend()}
            >
              Send
            </button>
            <button
              type="button"
              className="intelligence-mediation-cta"
              data-testid={`mediation-edit-${item.id}`}
              style={{ color: BRAND.palette.opalCyan }}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Done editing" : "Edit"}
            </button>
          </>
        )}
        <button
          type="button"
          className="intelligence-mediation-dismiss"
          data-testid={`mediation-dismiss-${item.id}`}
          disabled={busy === "dismiss"}
          aria-label={`Dismiss mediation for ${item.topic}`}
          onClick={() => void onDismiss()}
        >
          Dismiss
        </button>
      </div>
      {note ? (
        <p
          className="intelligence-mediation-note"
          data-testid={`mediation-note-${item.id}`}
          aria-live="polite"
        >
          {note}
        </p>
      ) : null}
    </article>
  );
}
