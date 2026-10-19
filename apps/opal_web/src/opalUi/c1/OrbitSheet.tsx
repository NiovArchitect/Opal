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
 * - The orbit-private toggle: stores the orbit's private flag
 *   (item-9 gate seam — verification is wired at integration; this
 *   surface claims nothing about a gate it does not run).
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
        <p className="orbit-sheet-title">{anchorName}</p>
        <p className="orbit-sheet-sub">
          {anchor.type === "person"
            ? "Plans and Opal conversations about this person. Opal chats live here, never in your chat thread with them."
            : anchor.type === "plan"
              ? "The plan and the Opal conversations filed under it."
              : "The place and the Opal conversations filed under it."}
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
        <p className="orbit-sheet-section">OPAL CONVERSATIONS</p>
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
          <button
            type="button"
            className="orbit-sheet-private"
            data-testid="orbit-sheet-private-toggle"
            aria-pressed={anchor.private === true}
            onClick={() => onTogglePrivate(!(anchor.private === true))}
          >
            {anchor.private ? "Make this orbit not private" : "Make this orbit private"}
          </button>
        ) : null}
        <button type="button" className="orbit-sheet-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
