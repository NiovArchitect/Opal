/**
 * Repair #17 W5 — Opal chat sessions drawer.
 *
 * Lists the user's real Opal chat sessions (backend conversations) and
 * switches between them. Every row is a server-returned session via
 * listOpalChatSessions — nothing here paints a session the API did not
 * return. States are honest: loading, failed (with retry), and empty
 * are distinct renders; there is no fixture fallback.
 *
 * Quiet law: no badges, no counts-as-pressure, no prompts — just the
 * chats, newest first, with the current one marked in plain words.
 */
import React from "react";
import type { OpalChatSessionSummary } from "../api/productClient";

type Props = {
  open: boolean;
  /** null = still loading (or never loaded). */
  sessions: OpalChatSessionSummary[] | null;
  loadFailed: boolean;
  activeSessionId: string | null;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onRetry: () => void;
};

/** Plain-language label for a session row — title, else its own words, else untitled. */
export function sessionRowLabel(s: OpalChatSessionSummary): string {
  const title = (s.title || "").trim();
  if (title) return title;
  const preview = (s.last_message_preview || "").trim();
  if (preview) return preview;
  return "New chat";
}

/** Date-based fallback for a session with no title and no messages. */
export function sessionFallbackTitle(s: OpalChatSessionSummary): string {
  const iso = s.inserted_at || s.updated_at;
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      try {
        const day = new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
        }).format(d);
        return `Chat on ${day}`;
      } catch {
        /* fall through to the generic label */
      }
    }
  }
  return "New chat";
}

function sessionFallbackTitleWithTime(s: OpalChatSessionSummary): string {
  const base = sessionFallbackTitle(s);
  if (base === "New chat") return base;
  const iso = s.inserted_at || s.updated_at;
  if (!iso) return base;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return base;
  try {
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
    return `${base} at ${time}`;
  } catch {
    return base;
  }
}

/**
 * Repair #18 (G-IA6) - a label for EVERY session in the list, distinct
 * within that list. Title wins, then the session's own last-message
 * preview, then a creation-date fallback. Identical labels get a time
 * suffix, then a short id suffix, so no two rows ever read the same.
 * Used by the chat list and by the open chat's header title.
 */
export function distinctSessionLabels(
  sessions: OpalChatSessionSummary[],
): Map<string, string> {
  const labels = new Map<string, string>();
  const used = new Map<string, number>();
  for (const s of sessions) {
    let label = sessionRowLabel(s);
    if (label === "New chat") label = sessionFallbackTitle(s);
    const seen = used.get(label) ?? 0;
    used.set(label, seen + 1);
    if (seen > 0) {
      const withTime =
        label === sessionFallbackTitle(s) || label === "New chat"
          ? sessionFallbackTitleWithTime(s)
          : label;
      label =
        withTime !== label && !used.has(withTime)
          ? withTime
          : `${label} (${s.id.slice(0, 4)})`;
      used.set(label, (used.get(label) ?? 0) + 1);
    }
    labels.set(s.id, label);
  }
  return labels;
}

/** Short local date/time for a session row; empty string when unknown. */
export function sessionRowTime(s: OpalChatSessionSummary): string {
  const iso = s.updated_at || s.inserted_at;
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const today = new Date();
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    return sameDay
      ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d)
      : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
  } catch {
    return "";
  }
}

export function OpalChatSessionsDrawer({
  open,
  sessions,
  loadFailed,
  activeSessionId,
  onClose,
  onSelect,
  onNewChat,
  onRetry,
}: Props) {
  if (!open) return null;
  const rows = sessions ? [...sessions] : [];
  rows.sort((a, b) => {
    const ta = Date.parse(a.updated_at || a.inserted_at || "") || 0;
    const tb = Date.parse(b.updated_at || b.inserted_at || "") || 0;
    return tb - ta;
  });
  const labels = distinctSessionLabels(rows);

  return (
    <div
      className="opal-center-sessions"
      data-testid="opal-center-sessions"
      role="dialog"
      aria-modal="true"
      aria-label="Your Opal chats"
    >
      <div className="opal-center-sessions-card">
        <header className="opal-center-sessions-top">
          <h2>Chats</h2>
          <button
            type="button"
            data-testid="opal-center-sessions-close"
            aria-label="Close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <button
          type="button"
          className="opal-center-v2-primary opal-center-sessions-new"
          data-testid="opal-center-sessions-new"
          onClick={onNewChat}
        >
          New chat
        </button>
        <p className="opal-center-sessions-note" data-testid="opal-center-sessions-keep-note">
          Your current chat stays in the list.
        </p>

        {sessions === null && !loadFailed ? (
          <p className="opal-center-sessions-note" data-testid="opal-center-sessions-loading" role="status">
            Loading your chats…
          </p>
        ) : null}

        {loadFailed ? (
          <div className="opal-center-sessions-note" data-testid="opal-center-sessions-error">
            <p>Couldn&apos;t load your chats.</p>
            <button
              type="button"
              className="opal-center-v2-chip"
              data-testid="opal-center-sessions-retry"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        ) : null}

        {sessions !== null && !loadFailed && rows.length === 0 ? (
          <p className="opal-center-sessions-note" data-testid="opal-center-sessions-empty" role="status">
            No chats yet. Start a new one above.
          </p>
        ) : null}

        {rows.length > 0 ? (
          <ul className="opal-center-sessions-list">
            {rows.map((s) => {
              const isActive = s.id === activeSessionId;
              const time = sessionRowTime(s);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`opal-center-sessions-row${isActive ? " is-active" : ""}`}
                    data-testid={`opal-center-session-${s.id}`}
                    data-active={isActive ? "true" : undefined}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => onSelect(s.id)}
                  >
                    <span className="opal-center-sessions-row-label">
                      {labels.get(s.id) || sessionRowLabel(s)}
                    </span>
                    {time ? (
                      <span className="opal-center-sessions-row-time">{time}</span>
                    ) : null}
                    {isActive ? (
                      <span className="opal-center-sessions-row-current">Current chat</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
