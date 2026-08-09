/**
 * Find a time — private windows + selective share.
 * PRIVATE OPAL FIELD: same material world as shared Opal, folded inward (violet).
 * Not a calendar product. Not a settings form.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  createAvailabilityWindow,
  deleteAvailabilityWindow,
  listMyAvailabilityWindows,
  listSharedAvailability,
  shareAvailabilityWindows,
  revokeAvailabilityShare,
  type AvailabilityOverlap,
  type AvailabilitySharedSafe,
  type AvailabilityWindowOwner,
} from "../api/productClient";
import { formatOverlapRange, localInputToIso, viewerTimezone } from "./formatRange";

type Props = {
  conversationId: string;
  conversationName: string;
  onClose: () => void;
  onOverlap: (overlap: AvailabilityOverlap | null) => void;
  bearer?: string;
};

export function AvailabilitySheet({
  conversationId,
  conversationName,
  onClose,
  onOverlap,
  bearer,
}: Props) {
  const [step, setStep] = useState<"yours" | "share">("yours");
  const [windows, setWindows] = useState<AvailabilityWindowOwner[]>([]);
  const [shared, setShared] = useState<AvailabilitySharedSafe[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sheetOverlap, setSheetOverlap] = useState<AvailabilityOverlap | null>(
    null,
  );
  const [exiting, setExiting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([
        listMyAvailabilityWindows(bearer),
        listSharedAvailability(conversationId, bearer),
      ]);
      setWindows(w.windows ?? []);
      setShared(s.shared ?? []);
    } catch (e) {
      setStatus((e as Error).message || "Could not load times");
    }
  }, [bearer, conversationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addTime() {
    const start_at = localInputToIso(startLocal);
    const end_at = localInputToIso(endLocal);
    if (!start_at || !end_at) {
      setStatus("Choose a start and end time.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await createAvailabilityWindow(
        { start_at, end_at, timezone: viewerTimezone() },
        bearer,
      );
      setStartLocal("");
      setEndLocal("");
      await refresh();
    } catch (e) {
      setStatus((e as Error).message || "Could not save that time");
    } finally {
      setBusy(false);
    }
  }

  async function removeWindow(id: string) {
    setBusy(true);
    try {
      await deleteAvailabilityWindow(id, bearer);
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      await refresh();
    } catch (e) {
      setStatus((e as Error).message || "Could not remove that time");
    } finally {
      setBusy(false);
    }
  }

  async function shareSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await shareAvailabilityWindows(
        conversationId,
        Array.from(selected),
        bearer,
      );
      const overlap = res.overlap ?? null;
      setSheetOverlap(overlap);
      onOverlap(overlap);
      await refresh();
      // Inward close → shared flow resumes (private raw times never fly out).
      setExiting(true);
      window.setTimeout(() => {
        onClose();
      }, 380);
    } catch (e) {
      setStatus((e as Error).message || "Could not share");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(shareId: string) {
    setBusy(true);
    try {
      await revokeAvailabilityShare(conversationId, shareId, bearer);
      await refresh();
      onOverlap(null);
    } catch (e) {
      setStatus((e as Error).message || "Could not update that share");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div
      className={`opal-private-overlay${exiting ? " is-exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="availability-title"
      data-testid="availability-sheet"
      data-private="true"
    >
      <div className="opal-private-field" data-testid="opal-private-field">
        <div className="opal-private-field-ambient" aria-hidden />

        <header className="opal-private-field-header">
          <div className="opal-private-field-title-row">
            <span className="opal-private-mark" aria-hidden>
              ◆
            </span>
            <h2 id="availability-title">
              {step === "yours" ? "When could work?" : "Share only what you choose"}
            </h2>
          </div>
          <button
            type="button"
            className="opal-private-close"
            onClick={onClose}
            aria-label="Close"
          >
            Done
          </button>
        </header>

        <p className="opal-private-hint-line">Only you can see this</p>

        <div className="opal-private-step-trace" role="tablist" aria-label="Find a time steps">
          <button
            type="button"
            role="tab"
            aria-selected={step === "yours"}
            className={`opal-private-step${step === "yours" ? " is-active" : ""}`}
            onClick={() => setStep("yours")}
          >
            Your times
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={step === "share"}
            className={`opal-private-step${step === "share" ? " is-active" : ""}`}
            onClick={() => setStep("share")}
          >
            Share
          </button>
        </div>

        <div className="opal-private-field-body">
          {step === "yours" ? (
            <>
              <ul className="opal-private-possibilities" data-testid="private-windows">
                {windows.map((w) => {
                  const label =
                    formatOverlapRange(w.start_at, w.end_at) ||
                    `${w.start_at} – ${w.end_at}`;
                  return (
                    <li key={w.id}>
                      <div className="opal-private-possibility is-mine">
                        <span className="opal-private-possibility-contour" aria-hidden />
                        <span className="opal-private-possibility-label">
                          <span className="opal-private-mark" aria-hidden>
                            ◆
                          </span>
                          {label}
                        </span>
                        <button
                          type="button"
                          className="opal-private-text-action"
                          onClick={() => void removeWindow(w.id)}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
                {windows.length === 0 ? (
                  <li className="opal-private-empty">Add a time that could work.</li>
                ) : null}
              </ul>

              <div className="opal-private-add">
                <p className="opal-private-add-label">Another time?</p>
                <div className="opal-private-inputs">
                  <label className="opal-private-input-wrap" htmlFor="av-start">
                    <span>From</span>
                    <input
                      id="av-start"
                      type="datetime-local"
                      value={startLocal}
                      onChange={(e) => setStartLocal(e.target.value)}
                    />
                  </label>
                  <label className="opal-private-input-wrap" htmlFor="av-end">
                    <span>Until</span>
                    <input
                      id="av-end"
                      type="datetime-local"
                      value={endLocal}
                      onChange={(e) => setEndLocal(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="opal-private-action soft"
                  onClick={() => void addTime()}
                  disabled={busy || !startLocal || !endLocal}
                >
                  Save this time
                </button>
              </div>

              <button
                type="button"
                className="opal-private-action exit"
                onClick={() => setStep("share")}
                disabled={windows.length === 0}
              >
                Share these times
                <span className="opal-private-action-cue" aria-hidden>
                  →
                </span>
              </button>
            </>
          ) : (
            <>
              <p className="opal-private-share-context">
                Into {conversationName} · only what you pick
              </p>
              <ul className="opal-private-possibilities" data-testid="share-picker">
                {windows.map((w) => {
                  const label =
                    formatOverlapRange(w.start_at, w.end_at) ||
                    `${w.start_at} – ${w.end_at}`;
                  const on = selected.has(w.id);
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        className={`opal-private-possibility${on ? " is-selected" : ""}`}
                        aria-pressed={on}
                        onClick={() => toggle(w.id)}
                      >
                        <span className="opal-private-possibility-contour" aria-hidden />
                        <span className="opal-private-possibility-label">
                          <span className="opal-private-mark" aria-hidden>
                            ◆
                          </span>
                          {label}
                        </span>
                        <span className="opal-private-select-mark" aria-hidden>
                          {on ? "●" : "○"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                className="opal-private-action exit"
                onClick={() => void shareSelected()}
                disabled={busy || selected.size === 0}
                data-testid="share-times"
              >
                Share these times
                <span className="opal-private-action-cue" aria-hidden>
                  →
                </span>
              </button>

              {sheetOverlap ? (
                <p className="opal-private-status" data-testid="sheet-overlap-label">
                  {sheetOverlap.label}
                </p>
              ) : null}

              {shared.length > 0 ? (
                <div className="opal-private-shared-block" data-testid="shared-in-chat">
                  <p className="opal-private-add-label">Already shared here</p>
                  <ul className="opal-private-possibilities">
                    {shared.map((s) => (
                      <li key={s.share_id}>
                        <div className="opal-private-possibility is-shared-out">
                          <span className="opal-private-possibility-contour" aria-hidden />
                          <span className="opal-private-possibility-label">
                            {formatOverlapRange(s.display_start, s.display_end)}
                          </span>
                          <button
                            type="button"
                            className="opal-private-text-action"
                            onClick={() => void revoke(s.share_id)}
                            disabled={busy}
                          >
                            Revoke
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          {status ? (
            <p className="opal-private-status" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
