/**
 * Repair #18 B3 — the circle-surface check-in row.
 *
 * One row on the surface that already represents the circle (group
 * info, plan card, people surface). It renders the for-source
 * projection: the server headline when a sweep exists, the S2
 * in-context suggestion when the gate stack offers one, and the
 * create action — disabled honestly from the contract's
 * next_sweep_allowed_at instead of letting the user tap into an
 * error. Creating goes through the same POST /checkins as every
 * other entry point (one creation path).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createCheckin,
  dismissCheckinSuggestion,
  getCheckinForSource,
  type CheckinOrganizerSummary,
  type CheckinSource,
  type CheckinSuggestion,
} from "../api/productClient";

type Props = {
  source: CheckinSource;
  bearer?: string;
  onOpenSummary?: (sweepId: string) => void;
};

/**
 * Hunt-fix B-18: the cooldown instant is finished HERE, in human
 * words — the raw ISO string from the API never reaches the screen.
 * An unparseable value renders no line at all, never the raw text.
 */
export function cooldownLabel(nextAllowed: string | null): string | null {
  if (!nextAllowed) return null;
  const when = new Date(nextAllowed);
  if (Number.isNaN(when.getTime())) return null;
  const formatted = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(when);
  return `Next check-in available ${formatted}`;
}

export function CheckinCircleRow({ source, bearer, onOpenSummary }: Props) {
  const [checkin, setCheckin] = useState<CheckinOrganizerSummary | null>(null);
  const [suggestion, setSuggestion] = useState<CheckinSuggestion | null>(null);
  const [nextAllowed, setNextAllowed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const keyRef = useRef<string>("");

  const sourceKey = `${source.source_kind}:${source.source_ref_id || ""}:${JSON.stringify(source.source_filter || {})}`;

  const load = useCallback(async () => {
    try {
      const res = await getCheckinForSource(source, bearer);
      setCheckin(res.checkin);
      setSuggestion(res.suggestion);
      setNextAllowed(
        res.checkin?.sweep?.next_sweep_allowed_at || res.next_sweep_allowed_at || null,
      );
    } catch {
      // A failed load renders the plain action row; creating still
      // goes through the server, which enforces every rule.
    } finally {
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, bearer]);

  useEffect(() => {
    if (keyRef.current === sourceKey) return;
    keyRef.current = sourceKey;
    void load();
  }, [sourceKey, load]);

  if (!loaded) return null;

  const sweepOpen = checkin?.sweep?.status === "open";
  const cooldownActive =
    !sweepOpen && nextAllowed != null && new Date(nextAllowed).getTime() > Date.now();

  const onCreate = async () => {
    if (busy || cooldownActive) return;
    setBusy(true);
    setCreateError(null);
    try {
      const res = await createCheckin(
        source,
        { idempotencyKey: `checkin-${sourceKey}-${Date.now()}` },
        bearer,
      );
      setCheckin(res.checkin);
      onOpenSummary?.(res.checkin.sweep.id);
    } catch {
      // Hunt-fix B-18: a refused or failed create is a plain line
      // with the retry the button already offers — never a silent
      // reload that reads as a button that does nothing.
      setCreateError("That check-in didn't start. Check your connection and try again.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onDismissSuggestion = async () => {
    setSuggestion(null);
    try {
      await dismissCheckinSuggestion(source, bearer);
    } catch {
      // Dismissal is recorded server-side; a failed write means the
      // suggestion may return on the next load - honest, not hidden.
    }
  };

  return (
    <div className="checkin-circle-row" data-testid="checkin-circle-row">
      {suggestion ? (
        <div className="checkin-suggestion" data-testid="checkin-suggestion">
          <p>{suggestion.copy}</p>
          <button type="button" data-testid="checkin-suggestion-action" onClick={onCreate} disabled={busy}>
            {suggestion.action_label}
          </button>
          <button type="button" data-testid="checkin-suggestion-dismiss" onClick={onDismissSuggestion}>
            Dismiss
          </button>
        </div>
      ) : null}

      {checkin ? (
        <button
          type="button"
          className="checkin-circle-summary"
          data-testid="checkin-circle-summary"
          onClick={() => onOpenSummary?.(checkin.sweep.id)}
        >
          <span>{checkin.copy.headline}</span>
          <span>
            {checkin.counts.still_waiting} still waiting · {checkin.counts.not_ok} need something
          </span>
        </button>
      ) : null}

      {!sweepOpen ? (
        <button
          type="button"
          data-testid="checkin-circle-start"
          onClick={onCreate}
          disabled={busy || cooldownActive}
        >
          Check in with everyone
        </button>
      ) : null}

      {cooldownActive && cooldownLabel(nextAllowed) ? (
        <p className="checkin-circle-cooldown" data-testid="checkin-circle-cooldown">
          {cooldownLabel(nextAllowed)}
        </p>
      ) : null}

      {createError ? (
        <p className="checkin-circle-error" data-testid="checkin-circle-error" role="alert">
          {createError}
        </p>
      ) : null}
    </div>
  );
}
