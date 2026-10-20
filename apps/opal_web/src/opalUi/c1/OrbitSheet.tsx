/**
 * Repair #19 Orbits — THE ORBIT SHEET. Replaces the plain person
 * index sheet: the same operations (list / open / start-new /
 * remove, with their scoping proofs) inside the anchor's orbit.
 *
 * Opened on intent only — from a person thread's plan-awareness
 * zone, from the Center log's orbit header, or from a scoped Opal
 * chat's anchor chip. Never permanent chrome.
 *
 * Contents: the anchor's PLANS (supplied by the host from the one
 * plan projections it already holds — never re-derived here) and
 * the anchor's Opal CONVERSATIONS (title/recency, openable), plus:
 * - New conversation about this anchor (a real scoped birth).
 * - Archive per conversation — the ONE user archive the overflow
 *   menu also uses (same server write, same state).
 * - Remove per conversation — the real delete, behind a plain
 *   confirmation that states what goes and what never does: the
 *   anchor's person thread and plans are different records and are
 *   untouched (proven in the FR-19-W14 backend cases).
 * - The Opal-chats hide toggle (Polish C naming fix): stores the
 *   orbit_private flag on the viewer's OWN Opal conversations for
 *   this anchor, so Center hides those chats' contents behind the
 *   graph-lock passcode. It is NOT graph privacy: it never hides a
 *   plan or a graph (that is "My private graphs" on Graphs), and
 *   it never touches the person thread. The copy names exactly
 *   that effect so the two can never be mistaken for each other.
 */
import React, { useState } from "react";
import { useDismissableSurface } from "./useDismissable";
import type {
  OpalAnchor,
  OpalConversationContext,
  PersonOpalSessionRow,
} from "./opalChatScope";
import "./OrbitSheet.css";

export type OrbitSheetPlan = { id: string; title: string; line?: string | null };

export function OrbitSheet({
  tieLabel,
  anchor,
  context,
  plans = [],
  sessions,
  onOpenPlan,
  onOpen,
  onStartNew,
  onRemove,
  onArchive,
  onTogglePrivate,
  onOpenAnchorThread,
  onClose,
}: {
  /** Repair #19 W24 (DL-03) — the viewer's finished tie to the
   *  anchor person ("Family - Sister"), beside their name. Only
   *  person anchors carry one; absent renders nothing. */
  tieLabel?: string | null;
  anchor: OpalAnchor;
  context?: OpalConversationContext | null;
  plans?: OrbitSheetPlan[];
  sessions: PersonOpalSessionRow[];
  onOpenPlan?: (planId: string) => void;
  onOpen: (sessionId: string) => void;
  onStartNew: () => void;
  onRemove: (sessionId: string) => void;
  onArchive?: (sessionId: string, archived: boolean) => void;
  onTogglePrivate?: (isPrivate: boolean) => void;
  /** Quick-draw back to the anchor's own thread (person anchors). */
  onOpenAnchorThread?: () => void;
  onClose: () => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // Amendment A1: no make-private ROW on this sheet. The orbit-hide
  // (Opal chats only - see the naming note in the header comment)
  // lives behind the sheet's own options affordance, opened on tap.
  const [optionsOpen, setOptionsOpen] = useState(false);
  // BS-08: Escape closes the sheet, focus lands inside on open and
  // returns to the invoking control on close (useDismissableSurface).
  const panelRef = useDismissableSurface<HTMLDivElement>({ open: true, onClose });
  const confirming = sessions.find((s) => s.id === confirmingId) ?? null;
  const anchorName = anchor.label ?? context?.personName ?? "This anchor";
  const sorted = [...sessions].sort((a, b) =>
    a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1,
  );
  return (
    <div className="orbit-sheet-scrim" data-testid="orbit-sheet" onClick={onClose}>
      <div
        ref={panelRef}
        className="orbit-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${anchorName} orbit`}
        data-anchor-key={`${anchor.type}:${anchor.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="orbit-sheet-title">
          {anchorName}
          {tieLabel ? (
            <span className="orbit-sheet-tie" data-testid="orbit-sheet-tie">
              {` · ${tieLabel}`}
            </span>
          ) : null}
        </p>
        <p className="orbit-sheet-sub" data-testid="orbit-sheet-purpose">
          {anchor.type === "person"
            ? `Everything Opal keeps together about ${anchorName}: your plans with them, and your chats with Opal about them.`
            : anchor.type === "plan"
              ? "This plan, and your chats with Opal filed under it."
              : "This place, and your chats with Opal filed under it."}
        </p>
        {onOpenAnchorThread ? (
          <button
            type="button"
            className="orbit-sheet-thread-link"
            data-testid="orbit-sheet-open-thread"
            onClick={onOpenAnchorThread}
          >
            {`Open your chat with ${anchorName}`}
          </button>
        ) : null}
        {plans.length > 0 ? (
          <div data-testid="orbit-sheet-plans">
            <p className="orbit-sheet-section">PLANS</p>
            <p className="orbit-sheet-section-note" data-testid="orbit-sheet-plans-note">
              {anchor.type === "person"
                ? `Plans you share with ${anchorName}. Tap one to open it.`
                : "Tap a plan to open it."}
            </p>
            {plans.map((p) =>
              onOpenPlan ? (
                <button
                  key={p.id}
                  type="button"
                  className="orbit-sheet-plan-row"
                  data-testid="orbit-sheet-plan-row"
                  data-plan-id={p.id}
                  onClick={() => onOpenPlan(p.id)}
                >
                  <span className="orbit-sheet-row-title">{p.title}</span>
                  {p.line ? <span className="orbit-sheet-row-preview">{p.line}</span> : null}
                </button>
              ) : (
                <div key={p.id} className="orbit-sheet-plan-row" data-testid="orbit-sheet-plan-row" data-plan-id={p.id}>
                  <span className="orbit-sheet-row-title">{p.title}</span>
                  {p.line ? <span className="orbit-sheet-row-preview">{p.line}</span> : null}
                </div>
              ),
            )}
          </div>
        ) : null}
        <p className="orbit-sheet-section">YOUR CHATS WITH OPAL</p>
        <p className="orbit-sheet-section-note" data-testid="orbit-sheet-chats-note">
          {anchor.type === "person"
            ? `Chats between you and Opal about ${anchorName} - never messages to ${anchorName}.`
            : "Chats between you and Opal in this orbit."}
        </p>
        {sorted.length === 0 ? (
          <p className="orbit-sheet-empty" data-testid="orbit-sheet-empty">
            No Opal chats in this orbit yet.
          </p>
        ) : (
          <div className="orbit-sheet-rows">
            {sorted.map((s) => (
              <div key={s.id} className="orbit-sheet-row" data-testid="orbit-sheet-row" data-session-id={s.id}>
                <button
                  type="button"
                  className="orbit-sheet-open"
                  data-testid="orbit-sheet-open-row"
                  onClick={() => onOpen(s.id)}
                >
                  <span className="orbit-sheet-row-main">
                    <span className="orbit-sheet-row-title">{s.title}</span>
                    <span className="orbit-sheet-row-preview">{s.preview}</span>
                  </span>
                  <span className="orbit-sheet-row-time">{s.timeLabel}</span>
                </button>
                {s.pinned ? (
                  <span className="orbit-sheet-pinned" data-testid="orbit-sheet-pinned">
                    Pinned
                  </span>
                ) : null}
                {onArchive ? (
                  <button
                    type="button"
                    className="orbit-sheet-row-action"
                    data-testid="orbit-sheet-archive"
                    onClick={() => onArchive(s.id, !s.userArchived)}
                  >
                    {s.userArchived ? "Unarchive" : "Archive"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="orbit-sheet-row-action"
                  data-testid="orbit-sheet-remove"
                  onClick={() => setConfirmingId(s.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {confirming ? (
          <div className="orbit-sheet-confirm" data-testid="orbit-sheet-confirm" role="alertdialog" aria-label="Remove this Opal chat">
            <p>{`Remove "${confirming.title}"?`}</p>
            <p>
              This deletes this conversation with Opal, including its messages. It cannot
              be undone. The person thread and any plans stay exactly as they are.
            </p>
            <div className="orbit-sheet-confirm-actions">
              <button
                type="button"
                data-testid="orbit-sheet-confirm-remove"
                onClick={() => {
                  onRemove(confirming.id);
                  setConfirmingId(null);
                }}
              >
                Remove this chat
              </button>
              <button type="button" onClick={() => setConfirmingId(null)}>
                Keep it
              </button>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="orbit-sheet-new"
          data-testid="orbit-sheet-new"
          onClick={onStartNew}
        >
          {anchor.type === "person"
            ? `Start a new Opal chat about ${anchorName}`
            : "Start a new Opal chat in this orbit"}
        </button>
        {onTogglePrivate ? (
          <>
            <button
              type="button"
              className="orbit-sheet-private"
              data-testid="orbit-sheet-options"
              aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen((v) => !v)}
            >
              Orbit options
            </button>
            {optionsOpen ? (
              <>
                <button
                  type="button"
                  className="orbit-sheet-private"
                  data-testid="orbit-sheet-private-toggle"
                  aria-pressed={anchor.private === true}
                  onClick={() => onTogglePrivate(!(anchor.private === true))}
                >
                  {anchor.private
                    ? "Stop hiding these Opal chats behind my passcode"
                    : "Hide these Opal chats behind my passcode"}
                </button>
                <p className="orbit-sheet-section-note" data-testid="orbit-sheet-private-note">
                  This hides only your chats with Opal in Center. It never hides a plan
                  or a graph - plans you want hidden live in My private graphs on the
                  Graphs tab.
                </p>
              </>
            ) : null}
          </>
        ) : null}
        <button type="button" className="orbit-sheet-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
