/**
 * Repair #21 (W-5a) - THE FORK-ANSWER SURFACE.
 *
 * Repair #20 declaration #4: the NonResponseEtiquette fork's two
 * answers (decline / ask for another time) existed at the respond
 * endpoint and in the web client, and the fork PRESENTATION (the
 * limbo treatment + copy) rendered on both parties' plan cards -
 * but the answer CONTROLS had no rendered home anywhere on the C2
 * shell. This is that home: a small control that lives where the
 * fork presentation lives (the plan card, the plan detail), wired
 * to the EXISTING respond endpoint through the EXISTING client
 * function (`respondPlanEtiquette`). No parallel path: the single
 * PlanTransition / etiquette machinery stays the only decider.
 *
 * Rendering law - judged ONLY from the plan contract's etiquette
 * projection (the backend's one per-viewer projection), never
 * re-derived locally:
 *  - the viewer is the fork's actual recipient
 *    (`viewer_role === "recipient"`), AND
 *  - the lifecycle is open, AND
 *  - the machinery says the fork is available to them
 *    (`fork_available` - recipient role + a nudged/forked stage).
 * The sender never sees answer controls on their own fork (their
 * projection's fork_available is false), a bystander never does,
 * and once the fork resolves the returned plan's projection stops
 * offering it, so the control disappears - state-driven presence,
 * in both directions.
 *
 * Copy is the standing plain deck: "Let it go" (the R20 V-5 decline
 * word) and "Ask for another time". A refusal surfaces as the
 * server's own plain line - never a silent drop.
 */
import React from "react";
import {
  etiquetteWriteError,
  respondPlanEtiquette,
  type OpalPlanContract,
  type PlanEtiquetteContract,
} from "../api/productClient";

export type ForkAnswerAction = "decline" | "ask_another_time";

/** The one gate, exported for pins: true ONLY for the fork's actual
 *  recipient while the fork is live on their projection. */
export function forkAnswerVisible(
  etiquette?: PlanEtiquetteContract | null,
): boolean {
  if (!etiquette) return false;
  return (
    etiquette.viewer_role === "recipient" &&
    etiquette.lifecycle_open === true &&
    etiquette.fork_available === true
  );
}

export function ForkAnswerControl({
  planId,
  etiquette,
  bearer,
  onUpdated,
}: {
  planId: string;
  etiquette?: PlanEtiquetteContract | null;
  bearer?: string;
  /** Called with the RETURNED plan payload after a successful answer. */
  onUpdated?: (plan: OpalPlanContract) => void;
}) {
  const [busy, setBusy] = React.useState<ForkAnswerAction | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [answered, setAnswered] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<PlanEtiquetteContract | null>(null);
  const current = saved ?? etiquette ?? null;

  if (answered) {
    return (
      <div className="fork-answer" data-testid="fork-answer" data-answered="true">
        <p className="fork-answer-done" data-testid="fork-answer-done" role="status">
          {answered}
        </p>
      </div>
    );
  }

  if (!forkAnswerVisible(current)) return null;

  const answer = async (action: ForkAnswerAction) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      const res = await respondPlanEtiquette(planId, action, bearer);
      if (res.plan?.etiquette) setSaved(res.plan.etiquette);
      if (res.plan) onUpdated?.(res.plan);
      // The returned projection no longer offers the fork; say what
      // happened in one plain line and let the control stand down.
      setAnswered(
        action === "decline"
          ? "You let this one go."
          : "You asked if another time could work.",
      );
    } catch (err) {
      // The machinery's refusal, in its own plain words.
      setError(
        etiquetteWriteError(err) ?? "That didn't go through. Try again in a moment.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fork-answer" data-testid="fork-answer">
      <div className="fork-answer-actions">
        <button
          type="button"
          className="fork-answer-decline"
          data-testid="fork-answer-decline"
          disabled={busy !== null}
          onClick={(e) => {
            e.stopPropagation();
            void answer("decline");
          }}
        >
          {busy === "decline" ? "Letting go..." : "Let it go"}
        </button>
        <button
          type="button"
          className="fork-answer-another-time"
          data-testid="fork-answer-another-time"
          disabled={busy !== null}
          onClick={(e) => {
            e.stopPropagation();
            void answer("ask_another_time");
          }}
        >
          {busy === "ask_another_time" ? "Asking..." : "Ask for another time"}
        </button>
      </div>
      {error ? (
        <p className="fork-answer-error" data-testid="fork-answer-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
