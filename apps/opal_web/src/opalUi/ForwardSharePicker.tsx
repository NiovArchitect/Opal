/**
 * SOCIAL-03 — FORWARD / SHARE PICKER
 * Figma 437:133
 *
 * Title: "Send to"
 * People grid (not a generic list shell).
 * Modes: Separately | Together
 * Primary: Continue
 * Forward ≠ Repost. Together never silently widens a dyad.
 *
 * Dismiss authority: Figma uses Option B dock Home (no Cancel chrome).
 * Escape + quiet Cancel text affordance exist for a11y / cancel soak —
 * they must be deterministic and must never race Continue into a send.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

export type ForwardCandidate = {
  id: string;
  name: string;
};

type Props = {
  contentId: string;
  candidates: ForwardCandidate[];
  shareUrl?: string;
  onBack: () => void;
  onSendSeparately: (people: ForwardCandidate[]) => void;
  onSendTogether: (people: ForwardCandidate[]) => void;
};

export function ForwardSharePicker({
  contentId,
  candidates,
  shareUrl,
  onBack,
  onSendSeparately,
  onSendTogether,
}: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"separately" | "together">("separately");
  const [submitting, setSubmitting] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const dismissedRef = useRef(false);
  const submittingRef = useRef(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(s));
  }, [candidates, q]);
  const chosen = candidates.filter((c) => selected.has(c.id));

  const dismiss = () => {
    // Deterministic cancel: mark dismissed BEFORE parent teardown so any
    // in-flight Continue / double-click cannot mutate after dismiss.
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    submittingRef.current = false;
    setSubmitting(false);
    setSelected(new Set());
    onBack();
  };

  const continueShare = () => {
    if (dismissedRef.current) return;
    if (submittingRef.current) return;
    if (!chosen.length) return;
    submittingRef.current = true;
    setSubmitting(true);
    const snapshot = chosen.slice();
    const useTogether = mode === "together" && snapshot.length > 1;
    // Snapshot recipients + contentId binding happens in parent via props.contentId.
    if (useTogether) onSendTogether(snapshot);
    else onSendSeparately(snapshot);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset local guards if the same picker remounts for a new contentId.
  useEffect(() => {
    dismissedRef.current = false;
    submittingRef.current = false;
    setSubmitting(false);
    setSelected(new Set());
    setMode("separately");
    setQ("");
  }, [contentId]);

  return (
    <div
      className="forward-share-picker social-dest-437-133"
      data-testid="forward-share-picker"
      data-screen="social-forward"
      data-figma-node="437:133"
      data-figma-social="437:133"
      data-content-id={contentId}
      data-forward-mode={mode}
      data-forward-submitting={submitting ? "true" : "false"}
      data-forward-dismissed={dismissedRef.current ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-label="Send to"
    >
      <header className="social-dest-brand fwd437-head" data-figma-chrome="437:133-brand">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="forward-back"
          aria-label="Back"
          disabled={submitting}
          onClick={dismiss}
        >
          ‹
        </button>
        <div className="gsh-brand">
          <OpalMark size="md" title="" />
          <OpalWordmark height={20} title="" compact />
        </div>
      </header>

      <h1 className="social-dest-title">Share</h1>
      <p className="social-dest-lede">
        Share to a chat, or copy a link — without changing the original audience.
      </p>

      <div className="forward-quick-actions" data-testid="forward-quick-actions">
        <button
          type="button"
          className="forward-copy-link"
          data-testid="forward-copy-link"
          disabled={submitting}
          onClick={async () => {
            const url =
              shareUrl ||
              `${window.location.origin}/?moment=${encodeURIComponent(contentId)}`;
            try {
              await navigator.clipboard.writeText(url);
              setCopyNote("Link copied");
            } catch {
              setCopyNote("Couldn't copy — long-press the address bar instead.");
            }
          }}
        >
          Copy link
        </button>
        {copyNote ? (
          <p className="forward-copy-note" role="status" data-testid="forward-copy-note">
            {copyNote}
          </p>
        ) : null}
      </div>

      <h2 className="forward-section-label">Share to chat</h2>
      <ul className="forward-people-grid" data-testid="forward-list">
        {filtered.map((c) => {
          const on = selected.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`forward-person ${on ? "is-selected" : ""}`}
                data-testid={`forward-person-${c.id}`}
                aria-pressed={on}
                disabled={submitting || dismissedRef.current}
                onClick={() => {
                  if (dismissedRef.current || submittingRef.current) return;
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  });
                }}
              >
                <span className="forward-avatar" aria-hidden>
                  {c.name.slice(0, 1)}
                </span>
                {on ? <span className="forward-check" aria-hidden>✓</span> : null}
                <span className="forward-name">{c.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="forward-mode" role="tablist" aria-label="Share mode">
        <button
          type="button"
          role="tab"
          className={`forward-mode-btn ${mode === "separately" ? "is-on" : ""}`}
          data-testid="forward-mode-separately"
          aria-selected={mode === "separately"}
          disabled={submitting}
          onClick={() => setMode("separately")}
        >
          Separately
        </button>
        <button
          type="button"
          role="tab"
          className={`forward-mode-btn ${mode === "together" ? "is-on" : ""}`}
          data-testid="forward-mode-together"
          aria-selected={mode === "together"}
          disabled={chosen.length < 2 || submitting}
          onClick={() => setMode("together")}
        >
          Together
        </button>
      </div>

      <button
        type="button"
        className="forward-continue"
        data-testid="forward-send-separately"
        data-mode={chosen.length && !submitting ? "active" : "conditional"}
        disabled={!chosen.length || submitting}
        onClick={continueShare}
      >
        {submitting ? "Sending…" : "Continue"}
      </button>

      {/* Compatibility hook — Together path is mode-driven via Continue */}
      <button
        type="button"
        className="forward-hidden-together"
        data-testid="forward-send-together"
        hidden
        disabled={chosen.length < 2 || submitting}
        onClick={() => {
          if (dismissedRef.current || submittingRef.current) return;
          submittingRef.current = true;
          setSubmitting(true);
          onSendTogether(chosen.slice());
        }}
      >
        Together
      </button>

      {/* Quiet Cancel soak hook — Escape + chevron are primary; must not race Continue */}
      <button
        type="button"
        className="forward-cancel social-dest-sr-dismiss"
        data-testid="forward-cancel"
        disabled={submitting}
        onClick={dismiss}
      >
        Cancel
      </button>

      <p className="forward-law">
        Forwarding does not create a Connection, add someone to a Graph or widen the original
        post audience.
      </p>
    </div>
  );
}
