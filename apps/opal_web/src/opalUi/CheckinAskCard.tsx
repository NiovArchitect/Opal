/**
 * Repair #18 B3 — the member's private check-in ask card.
 *
 * Renders the member_view projection from GET /checkins/:id: the
 * server-composed ask copy (answers go only to the organizer), the
 * three light structured fields, the explicit share-area tap, and
 * the decline / pass affordances. The card is the member's own Opal
 * 1:1 surface; nothing here shows any other member's answer, and
 * answering, declining, or passing resolves the card immediately
 * (the server resolves the Needs You item on the same write).
 *
 * Location law: coordinates are sent ONLY from this card's share
 * tap, in this request — never read from any stored location.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  getCheckin,
  respondCheckin,
  withdrawCheckin,
  type CheckinMemberView,
} from "../api/productClient";

type Props = {
  sweepId: string;
  bearer?: string;
  onResolved?: () => void;
};

export function CheckinAskCard({ sweepId, bearer, onResolved }: Props) {
  const [view, setView] = useState<CheckinMemberView | null>(null);
  const [okay, setOkay] = useState<"ok" | "not_ok" | null>(null);
  const [where, setWhere] = useState("");
  const [needs, setNeeds] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Design 5.6: a member may amend or withdraw while the sweep is
  // open. An already-answered member re-opens this card in amend
  // mode (prefilled), never a dead end; declined / passed /
  // withdrawn are settled states and render no card.
  const [amend, setAmend] = useState(false);
  const loadedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedForRef.current === sweepId) return;
    loadedForRef.current = sweepId;
    let cancelled = false;
    (async () => {
      try {
        const res = await getCheckin(sweepId, bearer);
        if (cancelled) return;
        if (res.checkin?.view === "member") {
          const v = res.checkin as CheckinMemberView;
          setView(v);
          if (v.my_response?.status === "answered" && v.sweep.status === "open") {
            setAmend(true);
            if (v.my_response.okay === "ok" || v.my_response.okay === "not_ok") {
              setOkay(v.my_response.okay);
            }
            setWhere(v.my_response.where_text || "");
            setNeeds(v.my_response.needs_text || "");
          } else if (v.my_response && v.my_response.status !== "asked") {
            setDone(true);
          }
        } else {
          setDone(true);
        }
      } catch {
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sweepId, bearer]);

  if (done || !view) return null;
  const ask = view.ask;

  const finish = () => {
    setDone(true);
    onResolved?.();
  };

  const submit = async (attrs: Parameters<typeof respondCheckin>[1]) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await respondCheckin(sweepId, attrs, bearer);
      finish();
    } catch {
      setError("That did not send. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSend = () =>
    submit({
      ...(okay ? { okay } : {}),
      ...(where.trim() ? { where_text: where.trim() } : {}),
      ...(needs.trim() ? { needs_text: needs.trim() } : {}),
    });

  const onShareArea = async () => {
    // The ONLY location path: an explicit tap, a fresh device fix,
    // sent in this request and coarsened server-side.
    if (!("geolocation" in navigator)) {
      setError("Location is not available on this device.");
      return;
    }
    setBusy(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
      );
      await respondCheckin(
        sweepId,
        {
          ...(okay ? { okay } : {}),
          ...(where.trim() ? { where_text: where.trim() } : {}),
          ...(needs.trim() ? { needs_text: needs.trim() } : {}),
          share_area: true,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        },
        bearer,
      );
      finish();
    } catch {
      setError("Could not share your area. You can type where you are instead.");
    } finally {
      setBusy(false);
    }
  };

  const onWithdraw = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await withdrawCheckin(sweepId, bearer);
      finish();
    } catch {
      setError("That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="checkin-ask-card" data-testid="checkin-ask-card">
      <h3 className="checkin-ask-title">{ask.title}</h3>
      <p className="checkin-ask-body">{ask.body}</p>
      {ask.theme_line ? <p className="checkin-ask-theme">{ask.theme_line}</p> : null}

      <fieldset className="checkin-ask-okay">
        <legend>{ask.fields.okay_label}</legend>
        <button
          type="button"
          data-testid="checkin-okay"
          aria-pressed={okay === "ok"}
          onClick={() => setOkay("ok")}
        >
          I am okay
        </button>
        <button
          type="button"
          data-testid="checkin-not-okay"
          aria-pressed={okay === "not_ok"}
          onClick={() => setOkay("not_ok")}
        >
          I am not okay
        </button>
      </fieldset>

      <label className="checkin-ask-field">
        {ask.fields.where_label}
        <input
          type="text"
          data-testid="checkin-where"
          value={where}
          maxLength={280}
          onChange={(e) => setWhere(e.target.value)}
        />
      </label>

      <label className="checkin-ask-field">
        {ask.fields.needs_label}
        <input
          type="text"
          data-testid="checkin-needs"
          value={needs}
          maxLength={280}
          placeholder="Nothing right now"
          onChange={(e) => setNeeds(e.target.value)}
        />
      </label>

      <button type="button" data-testid="checkin-share-area" disabled={busy} onClick={onShareArea}>
        {ask.fields.share_area_label}
      </button>
      <p className="checkin-ask-share-subcopy">{ask.fields.share_area_subcopy}</p>

      {error ? (
        <p className="checkin-ask-error" role="alert">
          {error}
        </p>
      ) : null}

      {amend ? (
        <p className="checkin-ask-amend-note" data-testid="checkin-amend-note">
          You already answered this check-in. You can update your answer or withdraw it while
          the check-in is open.
        </p>
      ) : null}

      <div className="checkin-ask-actions">
        <button type="button" data-testid="checkin-send" disabled={busy} onClick={onSend}>
          {amend ? "Update answer" : "Send"}
        </button>
        {!amend ? (
          <>
            <button
              type="button"
              data-testid="checkin-decline"
              disabled={busy}
              onClick={() => submit({ decline: true })}
            >
              {ask.fields.decline_label}
            </button>
            <button
              type="button"
              data-testid="checkin-pass"
              disabled={busy}
              onClick={() => submit({ pass: true })}
            >
              Not now
            </button>
          </>
        ) : null}
        {amend || (view.my_response && view.my_response.status === "answered") ? (
          <button type="button" data-testid="checkin-withdraw" disabled={busy} onClick={onWithdraw}>
            Withdraw my answer
          </button>
        ) : null}
      </div>
      <p className="checkin-ask-note">You can change or withdraw your answer any time.</p>
    </section>
  );
}
