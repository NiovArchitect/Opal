/**
 * Repair #16 W3 — the live in-flow surface for the Repair #15
 * ProfileGap ask (deferred item B6).
 *
 * QUIET-law contract, enforced here:
 *  - Renders ONLY when the backend assess returns status "ask" with a
 *    payload. `known` and `proceed_without` render nothing — the fact
 *    is used silently or was already asked/skipped.
 *  - In-flow: a plain card inside the surface, never a modal, never a
 *    takeover. `blocking` is false in the payload and nothing here
 *    disables or gates the surrounding flow — the plan continues
 *    whether the user answers, skips, or dismisses.
 *  - No re-ask: the component assesses once per (person, mount). The
 *    durable ledger makes a second server ask impossible, and this
 *    component never invents its own repeat — dismissing hides the
 *    card locally without touching the ledger (the ask stays recorded
 *    as asked, so no later flow re-asks either).
 */
import React, { useEffect, useRef, useState } from "react";
import {
  answerProfileGap,
  assessProfileGap,
  skipProfileGap,
  type ProfileGapAskPayload,
} from "../api/productClient";

type Props = {
  /** The person the fact is about (a user id in the owner's world). */
  personId: string;
  /** Display name used by the backend prompt + Celebrations write. */
  personName: string;
  bearer?: string;
  /** Fired when the card resolves (answered / skipped / dismissed). */
  onResolved?: () => void;
};

export function ProfileGapAsk({ personId, personName, bearer, onResolved }: Props) {
  const [ask, setAsk] = useState<ProfileGapAskPayload | null>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const assessedForRef = useRef<string | null>(null);

  useEffect(() => {
    // One assess per person per mount — the ledger forbids a second
    // ask; the UI must not even ask the server twice for the payload.
    if (assessedForRef.current === personId) return;
    assessedForRef.current = personId;
    let cancelled = false;
    (async () => {
      try {
        const res = await assessProfileGap(personId, personName, bearer);
        if (cancelled) return;
        if (res.profile_gap?.status === "ask" && res.profile_gap.ask) {
          setAsk(res.profile_gap.ask);
        } else {
          // known / proceed_without → render nothing, forever.
          setAsk(null);
          setDone(true);
        }
      } catch {
        // A failed assess is not a wall either: render nothing.
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [personId, personName, bearer]);

  if (done || !ask) return null;

  const finish = () => {
    setDone(true);
    onResolved?.();
  };

  const onAnswer = async () => {
    if (busy) return;
    if (!date) {
      setError("Pick a date, or tap Skip — totally fine either way.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await answerProfileGap(personId, date, personName, bearer);
      finish();
    } catch {
      // Invalid dates store nothing server-side; keep the card open so
      // the user can correct it or skip. Never a dead end.
      setError("That date doesn't work — try another, or tap Skip.");
    } finally {
      setBusy(false);
    }
  };

  const onSkip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await skipProfileGap(personId, bearer);
    } catch {
      // Even if the skip call fails, dismissing must not trap the user;
      // the ledger already holds the ask, so it will never re-fire.
    } finally {
      setBusy(false);
      finish();
    }
  };

  const onDismiss = () => {
    // Dismiss ≠ skip: no endpoint call. The ledger's "asked" row is
    // what guarantees this never nags again.
    finish();
  };

  return (
    <div
      className="profile-gap-ask"
      data-testid="profile-gap-ask"
      data-fact-key={ask.fact_key}
      data-blocking="false"
      role="note"
      aria-label={ask.prompt}
    >
      <p className="profile-gap-ask-prompt" data-testid="profile-gap-ask-prompt">
        {ask.prompt}
      </p>
      <div className="profile-gap-ask-controls">
        <label className="profile-gap-ask-label">
          <span className="sr-only">{`${personName}'s birthday`}</span>
          <input
            type="date"
            className="profile-gap-ask-input"
            data-testid="profile-gap-ask-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          type="button"
          className="profile-gap-ask-answer"
          data-testid="profile-gap-ask-answer"
          onClick={() => void onAnswer()}
          disabled={busy}
        >
          Remember it
        </button>
        <button
          type="button"
          className="profile-gap-ask-skip"
          data-testid="profile-gap-ask-skip"
          onClick={() => void onSkip()}
          disabled={busy}
        >
          {ask.skip_label}
        </button>
        {ask.dismissible ? (
          <button
            type="button"
            className="profile-gap-ask-dismiss"
            data-testid="profile-gap-ask-dismiss"
            aria-label="Dismiss"
            onClick={onDismiss}
            disabled={busy}
          >
            ×
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="profile-gap-ask-error" data-testid="profile-gap-ask-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
