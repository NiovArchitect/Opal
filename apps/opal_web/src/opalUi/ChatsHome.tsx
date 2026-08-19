/**
 * CHATS-00 — Relationships / Messages / Calls
 * Figma 476:2 — Chats tab lands HERE (not a random thread).
 * Hydrates from conversation/relationship truth passed by OpalApp.
 */
import React, { useMemo, useState } from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

export type ChatsHomeRow = {
  id: string;
  name: string;
  kind: "direct" | "group";
  preview: string;
  /** Latest-message sender — required clarity for groups; optional for direct. */
  previewSender?: string;
  when: string;
  memberCount?: number;
  unread?: number;
};

type Props = {
  rows: ChatsHomeRow[];
  onOpenChat: (id: string) => void;
  onNewChat?: () => void;
  onOpenCallsGate?: () => void;
};

export function ChatsHome({ rows, onOpenChat, onNewChat, onOpenCallsGate }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.preview.toLowerCase().includes(s) ||
        (r.previewSender || "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div className="chats-home scroll" data-testid="chats-home" data-figma="476:2">
      <header className="chats-home-top">
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
        <h1 className="chats-home-title">Chats</h1>
        <p className="gsh-meta">Relationships · messages · calls</p>
      </header>

      <div className="chats-home-tools">
        <input
          className="chats-home-search"
          data-testid="chats-home-search"
          placeholder="Search people or groups"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search chats"
        />
        <button
          type="button"
          className="btn primary chats-home-new"
          data-testid="chats-home-new"
          data-mode="active"
          onClick={onNewChat}
        >
          New
        </button>
      </div>

      <div className="chats-home-segment" role="tablist" aria-label="Chats mode">
        <button type="button" className="chats-seg is-active" role="tab" aria-selected>
          Messages
        </button>
        <button
          type="button"
          className="chats-seg"
          role="tab"
          aria-selected={false}
          data-testid="chats-home-calls"
          data-mode="dependency"
          onClick={onOpenCallsGate}
        >
          Calls
        </button>
      </div>

      <ul className="chats-home-list" data-testid="chats-home-list">
        {filtered.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={`chats-home-row ${r.unread ? "has-unread" : ""}`}
              data-testid={`chats-row-${r.id}`}
              data-kind={r.kind}
              data-unread={r.unread ? String(r.unread) : "0"}
              onClick={() => onOpenChat(r.id)}
            >
              <span className="chats-home-avatar" aria-hidden>
                {r.name.slice(0, 1)}
              </span>
              <span className="chats-home-copy">
                <strong>
                  {r.name}
                  {r.kind === "group" ? (
                    <span className="gsh-meta">
                      {" "}
                      · Group{r.memberCount ? ` · ${r.memberCount}` : ""}
                    </span>
                  ) : (
                    <span className="gsh-meta"> · Direct</span>
                  )}
                </strong>
                <span className={`gsh-meta ${r.unread ? "chats-preview-unread" : ""}`}>
                  {r.kind === "group" && r.previewSender
                    ? `${r.previewSender}: ${r.preview}`
                    : r.preview}
                </span>
              </span>
              <span className="chats-home-trailing">
                <span className="gsh-meta chats-home-when">{r.when}</span>
                {r.unread ? (
                  <span className="chats-unread-badge" aria-label={`${r.unread} unread`}>
                    {r.unread > 9 ? "9+" : r.unread}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
        {!filtered.length ? (
          <li className="gsh-empty" data-testid="chats-home-empty">
            No conversations yet. Start with someone you know.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
