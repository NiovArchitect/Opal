/**
 * CHATS HOME — exact current authority 618:271
 * NO Messages/Calls tabs. Dynamic names/previews from domain; chrome is Brand V4.
 */
import React, { useMemo, useState } from "react";

export type ChatsHomeRow = {
  id: string;
  name: string;
  kind: "direct" | "group";
  preview: string;
  previewSender?: string;
  when: string;
  memberCount?: number;
  unread?: number;
  contextLine?: string;
  /** Relationship / social-context label (Following · Direct, Connection · Group, …) */
  relationshipLabel?: string;
  avatarSrc?: string;
  avatarTone?: string;
};

type Props = {
  rows: ChatsHomeRow[];
  onOpenChat: (id: string) => void;
  onNewChat?: () => void;
  onOpenCallsGate?: () => void;
};

function defaultRelLabel(r: ChatsHomeRow): string {
  if (r.relationshipLabel) return r.relationshipLabel;
  if (r.kind === "group") {
    return r.memberCount ? `Connection · Group · ${r.memberCount}` : "Connection · Group";
  }
  return "Following · Direct";
}

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
        (r.contextLine || "").toLowerCase().includes(s) ||
        defaultRelLabel(r).toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div
      className="chats-home scroll"
      data-testid="chats-home"
      data-figma="618:271"
      data-figma-authority="618:271"
      data-legacy-figma="476:2"
      data-chats-tabs="none"
    >
      <div className="chats-ambient" aria-hidden data-testid="chats-ambient-field" />

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
              <span
                className="chats-home-avatar"
                aria-hidden
                style={r.avatarTone ? { background: r.avatarTone } : undefined}
              >
                {r.avatarSrc ? (
                  <img src={r.avatarSrc} alt="" />
                ) : (
                  r.name.slice(0, 1)
                )}
              </span>
              <span className="chats-home-copy">
                <strong className="chats-home-name">{r.name}</strong>
                <span className="chats-home-rel">{defaultRelLabel(r)}</span>
                <span className={`chats-home-preview ${r.unread ? "chats-preview-unread" : ""}`}>
                  {r.kind === "group" && r.previewSender
                    ? `${r.previewSender}: ${r.preview}`
                    : r.preview}
                </span>
                {r.contextLine ? (
                  <span className="chats-home-context">{r.contextLine}</span>
                ) : null}
              </span>
              <span className="chats-home-trailing">
                <span className="chats-home-when">{r.when}</span>
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
