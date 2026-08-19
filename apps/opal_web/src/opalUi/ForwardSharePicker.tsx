/**
 * SOCIAL-03 — Forward / share picker
 * Figma 437:133
 * One person → private forward.
 * Multiple → SEND SEPARATELY vs TOGETHER (never silent group widen).
 */
import React, { useMemo, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

export type ForwardCandidate = {
  id: string;
  name: string;
};

type Props = {
  contentId: string;
  candidates: ForwardCandidate[];
  onBack: () => void;
  onSendSeparately: (people: ForwardCandidate[]) => void;
  onSendTogether: (people: ForwardCandidate[]) => void;
};

export function ForwardSharePicker({
  contentId,
  candidates,
  onBack,
  onSendSeparately,
  onSendTogether,
}: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(s));
  }, [candidates, q]);
  const chosen = candidates.filter((c) => selected.has(c.id));

  return (
    <div
      className="forward-share-picker"
      data-testid="forward-share-picker"
      data-figma-social="437:133"
      data-content-id={contentId}
      role="dialog"
      aria-modal="true"
      aria-label="Forward"
    >
      <header className="graph-create-head">
        <button type="button" className="btn ghost" data-testid="forward-back" onClick={onBack}>
          Back
        </button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <h1 className="chats-home-title">Forward</h1>
      <p className="gsh-meta">Forwarding never changes the original audience or ownership.</p>
      <input
        className="chats-home-search"
        data-testid="forward-search"
        placeholder="Search people"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="new-chat-list" data-testid="forward-list">
        {filtered.map((c) => {
          const on = selected.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`chats-home-row ${on ? "is-selected" : ""}`}
                data-testid={`forward-person-${c.id}`}
                aria-pressed={on}
                onClick={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  })
                }
              >
                <span className="chats-home-avatar">{c.name.slice(0, 1)}</span>
                <strong>{c.name}</strong>
                <span className="gsh-meta">{on ? "Selected" : "Tap"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="new-chat-actions">
        <button
          type="button"
          className="btn primary"
          data-testid="forward-send-separately"
          data-mode={chosen.length ? "active" : "conditional"}
          disabled={!chosen.length}
          onClick={() => onSendSeparately(chosen)}
        >
          {chosen.length <= 1 ? "Send" : "Send separately"}
        </button>
        {chosen.length > 1 ? (
          <button
            type="button"
            className="btn"
            data-testid="forward-send-together"
            data-mode="active"
            onClick={() => onSendTogether(chosen)}
          >
            Together ({chosen.length})
          </button>
        ) : null}
      </div>
      <p className="gsh-meta">Together is explicit shared context — never a silent new group relationship.</p>
    </div>
  );
}
