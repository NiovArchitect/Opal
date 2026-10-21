/**
 * Repair #18 (Walk #4, W4-04) - END-TO-END PLAN EDITING controls.
 *
 * The plan/graph detail surface's edit affordance. Before this, a plan
 * whose title had a typo could never be corrected from any surface.
 *
 * Discipline (mirrors the Division A conversation-rename pattern):
 *  - The affordance renders ONLY when the backend's own authority
 *    field says this viewer may edit (`can_edit` on the plan payload,
 *    from the lead model) - never a local guess.
 *  - Saving calls PATCH /opal/plans/:id and re-renders from the
 *    RETURNED plan payload only - no optimistic local title, no
 *    reload hack.
 *  - In-flight state is honest: inputs and Save disable while saving,
 *    Save reads "Saving...".
 *  - A rejection keeps the editor open with the draft intact and shows
 *    the server's own message inline (the 422 field message when the
 *    server sent one); the stored title stands everywhere.
 *  - The form carries exactly the editable core details - title,
 *    location (hidden for online plans, whose location is "Online" by
 *    model law), caption. Schedule is NOT here: changing when a plan
 *    happens is a revision, and this surface never pretends otherwise.
 */
import React from "react";
import {
  patchOpalPlan,
  opalPlanEditError,
  setPlanResponseWindow,
  etiquetteWriteError,
  type OpalPlanContract,
  type PlanEtiquetteContract,
} from "../api/productClient";
import { ForkAnswerControl } from "./ForkAnswerControl";

/**
 * I2 etiquette wiring - the creator's opt-in response window, in
 * plain words: "Ask for an answer by ..." The control renders ONLY
 * where the machinery supports it, judged entirely from the plan
 * contract's etiquette projection (the backend's one projection):
 *  - only for the requester (the plan's creator - the window gate is
 *    creator-only in the backend, so no one else is shown a control
 *    that could only refuse);
 *  - when a window is already set, it reads back as a finished line;
 *  - when the machinery declares a window unavailable, its own
 *    finished reason renders as a plain line instead of a control;
 *  - a refusal at set time (the relationship gate, the mode gate)
 *    surfaces as the server's plain line inline - never a silent
 *    drop, never a locally invented substitute.
 * Saving re-renders from the RETURNED plan payload only.
 */
export const RESPONSE_WINDOW_OPTIONS: Array<{ seconds: number; label: string }> = [
  { seconds: 24 * 3600, label: "Tomorrow" },
  { seconds: 48 * 3600, label: "In 2 days" },
  { seconds: 72 * 3600, label: "In 3 days" },
  { seconds: 7 * 24 * 3600, label: "In a week" },
];

export function ResponseWindowControl({
  planId,
  etiquette,
  bearer,
  onUpdated,
}: {
  planId: string;
  etiquette?: PlanEtiquetteContract | null;
  bearer?: string;
  /** Called with the RETURNED plan payload after a successful set. */
  onUpdated?: (plan: OpalPlanContract) => void;
}) {
  const [choice, setChoice] = React.useState(RESPONSE_WINDOW_OPTIONS[1].seconds);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<PlanEtiquetteContract | null>(null);
  const current = saved ?? etiquette ?? null;

  if (!current || current.viewer_role !== "requester") return null;
  const win = current.window;
  const recipientId = current.recipient_user_id ?? null;

  if (win.set) {
    const closes = win.closes_at ? new Date(win.closes_at) : null;
    const closesLabel =
      closes && !Number.isNaN(closes.getTime())
        ? closes.toLocaleString("en-US", {
            weekday: "long",
            hour: "numeric",
            minute: "2-digit",
          })
        : null;
    return (
      <div className="response-window" data-testid="response-window" data-window-set="true">
        <p className="response-window-line" data-testid="response-window-set-line">
          {closesLabel
            ? `You asked for an answer by ${closesLabel}.`
            : "You asked for an answer by a set time."}
        </p>
      </div>
    );
  }

  if (!win.available) {
    // The machinery's own honest declaration, as a plain line.
    return win.unavailable_reason ? (
      <div className="response-window" data-testid="response-window" data-window-set="false">
        <p className="response-window-line" data-testid="response-window-unavailable">
          {win.unavailable_reason}
        </p>
      </div>
    ) : null;
  }

  if (!recipientId) return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await setPlanResponseWindow(planId, recipientId, choice, bearer);
      if (res.plan?.etiquette) setSaved(res.plan.etiquette);
      if (res.plan) onUpdated?.(res.plan);
    } catch (err) {
      // The gate's refusal, in the server's own plain words.
      setError(
        etiquetteWriteError(err) ?? "That didn't go through. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="response-window" data-testid="response-window" data-window-set="false">
      <label className="response-window-field">
        <span>Ask for an answer by</span>
        <select
          data-testid="response-window-select"
          value={choice}
          disabled={busy}
          onChange={(e) => setChoice(Number(e.target.value))}
        >
          {RESPONSE_WINDOW_OPTIONS.map((option) => (
            <option key={option.seconds} value={option.seconds}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="response-window-set"
        data-testid="response-window-set"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "Asking..." : "Ask"}
      </button>
      {error ? (
        <p className="response-window-error" data-testid="response-window-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type PlanEditControlsProps = {
  planId: string;
  title: string;
  location?: string | null;
  caption?: string | null;
  online?: boolean;
  canEdit: boolean;
  bearer?: string;
  /** Called with the RETURNED plan payload after a successful save. */
  onEdited?: (plan: OpalPlanContract) => void;
  /** I2: the plan contract's per-viewer etiquette projection, when
   *  the durable payload carries one. Drives the response-window
   *  control (ResponseWindowControl) - absent = no window surface. */
  etiquette?: PlanEtiquetteContract | null;
};

function firstServerMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const errors = (error as { errors?: unknown }).errors;
    if (errors && typeof errors === "object") {
      for (const field of ["title", "location", "caption"]) {
        const list = (errors as Record<string, unknown>)[field];
        if (Array.isArray(list)) {
          const first = list.find((t): t is string => typeof t === "string" && t !== "");
          if (first) return first;
        }
      }
    }
  }
  return (
    opalPlanEditError(error) || "Could not save those changes. Try again."
  );
}

export function PlanEditControls({
  planId,
  title,
  location,
  caption,
  online = false,
  canEdit,
  bearer,
  onEdited,
  etiquette,
}: PlanEditControlsProps) {
  // Displayed values come from the plan payload (props) or, after a
  // save, from the returned payload - never from the draft.
  const [savedTitle, setSavedTitle] = React.useState(title);
  const [savedLocation, setSavedLocation] = React.useState(location || "");
  const [savedCaption, setSavedCaption] = React.useState(caption || "");
  const [editing, setEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftLocation, setDraftLocation] = React.useState("");
  const [draftCaption, setDraftCaption] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSavedTitle(title);
    setSavedLocation(location || "");
    setSavedCaption(caption || "");
  }, [title, location, caption, planId]);

  if (!canEdit && !editing) {
    return (
      <div className="plan-edit" data-testid="plan-edit-controls" data-can-edit="false">
        <p className="plan-edit-title" data-testid="plan-edit-title">
          {savedTitle}
        </p>
        <ResponseWindowControl
          planId={planId}
          etiquette={etiquette}
          bearer={bearer}
          onUpdated={onEdited}
        />
        {/* Repair #21 (W-5a): the fork-answer control on the plan
            detail - the recipient's home for the fork's two answers,
            beside the creator's window control above. Each applies
            its own projection gate; only one ever renders. */}
        <ForkAnswerControl
          planId={planId}
          etiquette={etiquette}
          bearer={bearer}
          onUpdated={onEdited}
        />
      </div>
    );
  }

  const startEdit = () => {
    setDraftTitle(savedTitle);
    setDraftLocation(savedLocation);
    setDraftCaption(savedCaption);
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    // Nothing was written: the stored values stand, draft discarded.
    setEditing(false);
    setError(null);
  };

  const saveEdit = async () => {
    if (saving) return;
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      // Blocked client-side too; the editor stays open, words intact.
      // The server remains the authority and would 422 the same way.
      setError("Title can't be blank");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const changes: { title?: string; location?: string; caption?: string } = {
        title: trimmedTitle,
      };
      if (!online && draftLocation.trim() !== savedLocation) {
        changes.location = draftLocation.trim();
      }
      if (draftCaption.trim() !== savedCaption) {
        changes.caption = draftCaption.trim();
      }
      const res = await patchOpalPlan(planId, changes, bearer);
      const returned = res.plan;
      if (returned && returned.id) {
        // Re-render from the RETURNED payload only.
        setSavedTitle(returned.title);
        setSavedLocation(returned.location || "");
        setSavedCaption(returned.caption || "");
        onEdited?.(returned);
      }
      setEditing(false);
    } catch (err) {
      setError(firstServerMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="plan-edit" data-testid="plan-edit-controls" data-can-edit="true">
      {!editing ? (
        <>
          <p className="plan-edit-title" data-testid="plan-edit-title">
            {savedTitle}
          </p>
          <button
            type="button"
            className="plan-edit-open"
            data-testid="plan-edit-open"
            onClick={startEdit}
          >
            Edit details
          </button>
        </>
      ) : (
        <div className="plan-edit-form" data-testid="plan-edit-form">
          <label className="plan-edit-field">
            <span>Title</span>
            <input
              type="text"
              data-testid="plan-edit-title-input"
              value={draftTitle}
              disabled={saving}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
          </label>
          {!online ? (
            <label className="plan-edit-field">
              <span>Place</span>
              <input
                type="text"
                data-testid="plan-edit-location-input"
                value={draftLocation}
                disabled={saving}
                onChange={(e) => setDraftLocation(e.target.value)}
              />
            </label>
          ) : null}
          <label className="plan-edit-field">
            <span>Caption</span>
            <input
              type="text"
              data-testid="plan-edit-caption-input"
              value={draftCaption}
              disabled={saving}
              onChange={(e) => setDraftCaption(e.target.value)}
            />
          </label>
          {error ? (
            <p className="plan-edit-error" data-testid="plan-edit-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="plan-edit-actions">
            <button
              type="button"
              className="btn primary plan-edit-save"
              data-testid="plan-edit-save"
              disabled={saving}
              onClick={() => void saveEdit()}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="btn ghost plan-edit-cancel"
              data-testid="plan-edit-cancel"
              disabled={saving}
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!editing ? (
        <ResponseWindowControl
          planId={planId}
          etiquette={etiquette}
          bearer={bearer}
          onUpdated={onEdited}
        />
      ) : null}
      {!editing ? (
        <ForkAnswerControl
          planId={planId}
          etiquette={etiquette}
          bearer={bearer}
          onUpdated={onEdited}
        />
      ) : null}
    </div>
  );
}
