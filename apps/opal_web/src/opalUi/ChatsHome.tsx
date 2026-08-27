/**
 * CHATS HOME — dated authority 618:271
 * Chats title, search, new chat, relationship rows.
 * NO Messages/Calls tabs (invented legacy — founder rejected).
 * Hydrates from conversation/relationship truth passed by OpalApp.
 */
import React, { useMemo, useState } from "react";

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
  /** Optional secondary social consequence context (dynamic; never fabricated). */
  contextLine?: string;
};

type Props = {
  rows: ChatsHomeRow[];
  onOpenChat: (id: string) => void;
  onNewChat?: () => void;
  /** @deprecated Calls are not a Chats Home tab. Kept optional for callers; unused. */
  onOpenCallsGate?: () => void;
};

export function ChatsHome({ rows, onOpenChat, onNewChat }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.preview.toLowerCase().includes(s) ||
        (r.previewSender || "").toLowerCase().includes(s) ||
        (r.contextLine || "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div
      className="chats-home scroll"
      data-testid="chats-home"
      data-figma="618:271"
      data-legacy-figma="476:2"
      data-chats-tabs="none"
    >
      <header className="chats-home-top chats-home-top-618">
        <div className="chats-home-title-row">
          <h1 className="chats-home-title">Chats</h1>
          <button
            type="button"
            className="chats-home-new-plus"
            data-testid="chats-home-new"
            data-mode="active"
            aria-label="New chat"
            onClick={onNewChat}
          >
            +
          </button>
        </div>
        <p className="chats-home-lede">Messages, calls, and what&apos;s taking shape.</p>
      </header>

      <div className="chats-home-tools chats-home-tools-618">
        <input
          className="chats-home-search"
          data-testid="chats-home-search"
          placeholder="Search people or conversations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search people or conversations"
        />
      </div>

      {/* 618:271 — no Messages/Calls segmented tabs */}

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
                {r.contextLine ? (
                  <span className="chats-home-context gsh-meta">{r.contextLine}</span>
                ) : null}
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
