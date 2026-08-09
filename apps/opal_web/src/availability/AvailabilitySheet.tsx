/**
 * Find a time — private windows + selective share sheet.
 * Reuses FindPeople overlay pattern. Not a calendar product.
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
  const [sheetOverlap, setSheetOverlap] = useState<AvailabilityOverlap | null>(null);

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
      if (overlap?.overlap_status === "overlap_found") {
        setStatus(overlap.label);
      } else if (overlap?.label) {
        setStatus(overlap.label);
      } else {
        setStatus("Shared.");
      }
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
      className="find-people-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="availability-title"
      data-testid="availability-sheet"
    >
      <div className="find-people-sheet lumen-card">
        <header className="find-people-header">
          <h2 id="availability-title">
            {step === "yours" ? "When could you meet?" : `Share into ${conversationName}`}
          </h2>
          <button type="button" className="btn ghost" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

        <div className="find-people-body">
          <div className="availability-steps" role="tablist" aria-label="Find a time steps">
            <button
              type="button"
              role="tab"
              aria-selected={step === "yours"}
              className={`btn ghost${step === "yours" ? " is-active" : ""}`}
              onClick={() => setStep("yours")}
            >
              Your times
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === "share"}
              className={`btn ghost${step === "share" ? " is-active" : ""}`}
              onClick={() => setStep("share")}
            >
              Share
            </button>
          </div>

          {step === "yours" ? (
            <>
              <p className="permission-line">Only you can see this list.</p>
              <ul className="availability-list" data-testid="private-windows">
                {windows.map((w) => (
                  <li key={w.id} className="availability-row">
                    <span>
                      {formatOverlapRange(w.start_at, w.end_at) || `${w.start_at} – ${w.end_at}`}
                    </span>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ minHeight: 44 }}
                      onClick={() => void removeWindow(w.id)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {windows.length === 0 ? (
                  <li className="muted-lede">Add a time that could work.</li>
                ) : null}
              </ul>

              <div className="field">
                <label htmlFor="av-start">Start</label>
                <input
                  id="av-start"
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="av-end">End</label>
                <input
                  id="av-end"
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                />
              </div>
              <div className="find-people-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void addTime()}
                  disabled={busy || !startLocal || !endLocal}
                >
                  Add a time
                </button>
                <button type="button" className="btn" onClick={() => setStep("share")}>
                  Share these times
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="permission-line">Only shared here, in this conversation.</p>
              <ul className="availability-list" data-testid="share-picker">
                {windows.map((w) => (
                  <li key={w.id} className="availability-row">
                    <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(w.id)}
                        onChange={() => toggle(w.id)}
                      />
                      <span>
                        {formatOverlapRange(w.start_at, w.end_at) || `${w.start_at} – ${w.end_at}`}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="find-people-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void shareSelected()}
                  disabled={busy || selected.size === 0}
                  data-testid="share-times"
                >
                  Share
                </button>
              </div>

              {sheetOverlap ? (
                <p className="lede" data-testid="sheet-overlap-label">
                  {sheetOverlap.label}
                </p>
              ) : null}

              {shared.length > 0 ? (
                <div className="availability-shared" data-testid="shared-in-chat">
                  <p className="muted-lede">Shared into this chat</p>
                  <ul className="availability-list">
                    {shared.map((s) => (
                      <li key={s.share_id} className="availability-row">
                        <span>
                          {formatOverlapRange(s.display_start, s.display_end)}
                        </span>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ minHeight: 44 }}
                          onClick={() => void revoke(s.share_id)}
                          disabled={busy}
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          {status ? (
            <p className="muted-lede" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
