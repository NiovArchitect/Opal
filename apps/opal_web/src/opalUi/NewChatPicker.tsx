/**
 * CHATS-00 New chat — people search/picker over known relationships.
 * One person → ensure_direct exact dyad.
 * Multiple → explicit group-create intent (never silently widen a dyad).
 * Does not create a second messaging backend.
 */
import React, { useMemo, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

export type NewChatCandidate = {
  peerUserId: string;
  displayName: string;
  handle?: string;
  /** Existing direct conversation if known — prefer open over recreate. */
  conversationId?: string;
};

type Props = {
  open: boolean;
  candidates: NewChatCandidate[];
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  /** Exactly one peer — open/ensure direct dyad. */
  onEnsureDirect: (peer: NewChatCandidate) => void | Promise<void>;
  /** Two or more — explicit group create. */
  onCreateGroup: (peers: NewChatCandidate[]) => void | Promise<void>;
  /** Invite someone not yet in Graph — optional escape hatch. */
  onInviteFallback?: () => void;
  /**
   * Slice #1 — message an existing Opal user by phone (resolve → ensureDirect).
   * Only succeeds when the number matches another account; never fakes a peer.
   */
  onMessageByPhone?: (phone: string) => void | Promise<void>;
};

export function NewChatPicker({
  open,
  candidates,
  busy,
  error,
  onClose,
  onEnsureDirect,
  onCreateGroup,
  onInviteFallback,
  onMessageByPhone,
}: Props) {
  const [q, setQ] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter(
      (c) =>
        c.displayName.toLowerCase().includes(s) ||
        (c.handle || "").toLowerCase().includes(s),
    );
  }, [candidates, q]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chosen = candidates.filter((c) => selected.has(c.peerUserId));

  const confirm = () => {
    if (!chosen.length || busy) return;
    if (chosen.length === 1) {
      void onEnsureDirect(chosen[0]!);
      return;
    }
    void onCreateGroup(chosen);
  };

  return (
    <div
      className="new-chat-picker"
      data-testid="new-chat-picker"
      data-figma-chats="476:2"
      role="dialog"
      aria-modal="true"
      aria-label="New chat"
    >
      <header className="graph-create-head">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="new-chat-back"
          aria-label="Back"
          onClick={() => {
            setQ("");
            setSelected(new Set());
            onClose();
          }}
        >
          ‹
        </button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>

      <h1 className="chats-home-title">New chat</h1>
      <p className="gsh-meta">
        One person opens a direct. Multiple people create an explicit group — never widens a dyad.
      </p>

      <input
        className="chats-home-search"
        data-testid="new-chat-search"
        placeholder="Search people"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search people"
      />

      {onMessageByPhone ? (
        <div className="new-chat-phone-row" data-testid="new-chat-phone-row">
          <input
            className="chats-home-search"
            data-testid="new-chat-phone"
            placeholder="Phone number on Opal"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            aria-label="Phone number of someone on Opal"
          />
          <button
            type="button"
            className="btn primary"
            data-testid="new-chat-message-by-phone"
            disabled={busy || phone.trim().length < 7}
            onClick={() => {
              if (!phone.trim() || busy) return;
              void onMessageByPhone(phone.trim());
            }}
          >
            Message
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="gsh-gate-note" role="alert" data-testid="new-chat-error">
          {error}
        </p>
      ) : null}

      <ul className="new-chat-list" data-testid="new-chat-list">
        {filtered.map((c) => {
          const on = selected.has(c.peerUserId);
          return (
            <li key={c.peerUserId}>
              <button
                type="button"
                className={`chats-home-row ${on ? "is-selected" : ""}`}
                data-testid={`new-chat-person-${c.peerUserId}`}
                data-selected={on ? "true" : "false"}
                aria-pressed={on}
                onClick={() => toggle(c.peerUserId)}
              >
                <span className="chats-home-avatar" aria-hidden>
                  {c.displayName.slice(0, 1)}
                </span>
                <span className="chats-home-copy">
                  <strong>{c.displayName}</strong>
                  <span className="gsh-meta">
                    {c.conversationId ? "Direct exists" : "New direct possible"}
                    {c.handle ? ` · @${c.handle}` : ""}
                  </span>
                </span>
                <span className="gsh-meta">{on ? "Selected" : "Tap"}</span>
              </button>
            </li>
          );
        })}
        {!filtered.length && q.trim() ? (
          <li className="gsh-empty" data-testid="new-chat-empty">
            No matching people in your Graph yet.
          </li>
        ) : null}
      </ul>

      <div className="new-chat-actions">
        {chosen.length ? (
        <button
          type="button"
          className="btn primary"
          data-testid="new-chat-confirm"
          data-mode="active"
          disabled={!!busy}
          onClick={confirm}
        >
          {busy
            ? "Opening…"
            : chosen.length <= 1
              ? "Open direct"
              : `Create group (${chosen.length})`}
        </button>
        ) : null}
        {onInviteFallback ? (
          <button
            type="button"
            className="btn ghost"
            data-testid="new-chat-invite"
            onClick={onInviteFallback}
          >
            Invite someone new
          </button>
        ) : null}
      </div>
    </div>
  );
}
