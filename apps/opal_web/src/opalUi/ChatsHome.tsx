/**
 * COMMUNICATION HOME — Chats (618:271) + Calls Continuity (928:3 CURRENT additive).
 * Chats|Calls mode switch is CURRENT authority (not the forbidden Messages/Calls tabs).
 * Dynamic names/previews from domain; chrome is Brand V4.
 */
import React, { useMemo, useState } from "react";
import {
  FOUNDER_CALLS_CONTINUITY_ROWS,
  type CallsContinuityRow,
} from "./callsContinuitySeed";

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

export type CommSurface = "chats" | "calls";
export type CallsFilter = "all" | "missed";

type Props = {
  rows: ChatsHomeRow[];
  onOpenChat: (id: string) => void;
  onNewChat?: () => void;
  /** Initial surface; defaults to chats (618:271). */
  initialSurface?: CommSurface;
  callRows?: CallsContinuityRow[];
  onOpenCallGraph?: (graphCardId: string) => void;
  onCallBack?: (row: CallsContinuityRow) => void;
  onNewCall?: () => void;
  onOpenCallsContinuityRow?: (row: CallsContinuityRow) => void;
};

function defaultRelLabel(r: ChatsHomeRow): string {
  if (r.relationshipLabel) return r.relationshipLabel;
  if (r.kind === "group") {
    return r.memberCount ? `Connection · Group · ${r.memberCount}` : "Connection · Group";
  }
  return "Following · Direct";
}

export function ChatsHome({
  rows,
  onOpenChat,
  onNewChat,
  initialSurface = "chats",
  callRows = FOUNDER_CALLS_CONTINUITY_ROWS,
  onOpenCallGraph,
  onCallBack,
  onNewCall,
  onOpenCallsContinuityRow,
}: Props) {
  const [q, setQ] = useState("");
  const [surface, setSurface] = useState<CommSurface>(initialSurface);
  const [callsFilter, setCallsFilter] = useState<CallsFilter>("all");

  const filteredChats = useMemo(() => {
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

  const filteredCalls = useMemo(() => {
    const base =
      callsFilter === "missed" ? callRows.filter((r) => r.missed) : callRows;
    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.metadata.toLowerCase().includes(s) ||
        (r.signal?.label || "").toLowerCase().includes(s),
    );
  }, [callRows, callsFilter, q]);

  const isCalls = surface === "calls";

  return (
    <div
      className={`chats-home scroll ${isCalls ? "calls-continuity-home" : ""}`}
      data-testid={isCalls ? "calls-continuity-home" : "chats-home"}
      data-figma={isCalls ? "928:3" : "618:271"}
      data-figma-authority={isCalls ? "928:9" : "618:271"}
      data-legacy-figma="476:2"
      data-chats-tabs="none"
      data-comm-surface={surface}
      data-calls-filter={isCalls ? callsFilter : undefined}
    >
      <div className="chats-ambient" aria-hidden data-testid="chats-ambient-field" />

      <header className="chats-home-top chats-home-top-618">
        <div className="chats-home-title-row">
          <h1 className="chats-home-title">{isCalls ? "Calls" : "Chats"}</h1>
          <button
            type="button"
            className="chats-home-new-plus"
            data-testid={isCalls ? "calls-home-new" : "chats-home-new"}
            data-mode="active"
            aria-label={isCalls ? "New call" : "New chat"}
            onClick={() => {
              if (isCalls) onNewCall?.();
              else onNewChat?.();
            }}
          >
            +
          </button>
        </div>
        <p className="chats-home-lede" data-testid="comm-home-subtitle">
          {isCalls
            ? callsFilter === "missed"
              ? "Missed calls, without the clutter."
              : "The people you've been calling."
            : "Messages, calls, and what's taking shape."}
        </p>
      </header>

      {/* CURRENT 928:3 — Chats|Calls mode (not forbidden Messages|Calls) */}
      <div
        className="comm-mode-bar"
        data-testid="comm-mode-bar"
        role="group"
        aria-label="Communication surface"
      >
        <button
          type="button"
          className={`comm-mode-btn ${surface === "chats" ? "is-active" : ""}`}
          data-testid="comm-mode-chats"
          data-active={surface === "chats" ? "true" : "false"}
          onClick={() => setSurface("chats")}
        >
          Chats
        </button>
        <button
          type="button"
          className={`comm-mode-btn ${surface === "calls" ? "is-active" : ""}`}
          data-testid="comm-mode-calls"
          data-active={surface === "calls" ? "true" : "false"}
          onClick={() => setSurface("calls")}
        >
          Calls
        </button>
      </div>

      {isCalls ? (
        <div
          className="calls-filter-bar"
          data-testid="calls-filter-bar"
          role="group"
          aria-label="Calls filter"
        >
          <button
            type="button"
            className={`calls-filter-btn ${callsFilter === "all" ? "is-active" : ""}`}
            data-testid="calls-filter-all"
            data-active={callsFilter === "all" ? "true" : "false"}
            onClick={() => setCallsFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`calls-filter-btn ${callsFilter === "missed" ? "is-active" : ""}`}
            data-testid="calls-filter-missed"
            data-active={callsFilter === "missed" ? "true" : "false"}
            onClick={() => setCallsFilter("missed")}
          >
            Missed
          </button>
        </div>
      ) : null}

      <div className="chats-home-tools chats-home-tools-618">
        <input
          className="chats-home-search"
          data-testid={isCalls ? "calls-home-search" : "chats-home-search"}
          placeholder={
            isCalls ? "Search people or groups" : "Search people or conversations"
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={
            isCalls ? "Search people or groups" : "Search people or conversations"
          }
        />
      </div>

      {isCalls ? (
        <ul className="calls-continuity-list" data-testid="calls-continuity-list">
          <li className="calls-section-label" data-testid="calls-section-label">
            {callsFilter === "missed" ? "Missed" : "Recent"}
          </li>
          {filteredCalls.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="calls-continuity-row"
                data-testid={`calls-row-${r.id}`}
                data-kind={r.kind}
                data-missed={r.missed ? "true" : "false"}
                data-has-signal={r.signal ? "true" : "false"}
                data-signal-kind={r.signal?.kind || "none"}
                onClick={() => onOpenCallsContinuityRow?.(r)}
              >
                <span
                  className="chats-home-avatar"
                  aria-hidden
                  style={r.avatarTone ? { background: r.avatarTone } : undefined}
                >
                  {r.avatarSrc ? <img src={r.avatarSrc} alt="" /> : r.name.slice(0, 1)}
                </span>
                <span className="calls-continuity-copy">
                  <strong className="chats-home-name">{r.name}</strong>
                  <span className="calls-continuity-meta">{r.metadata}</span>
                  {r.signal ? (
                    <span
                      className={`calls-continuity-signal calls-signal-${r.signal.kind}`}
                      data-testid={`calls-signal-${r.id}`}
                    >
                      <span className="calls-signal-mark" aria-hidden>
                        ✦
                      </span>
                      {r.signal.kind === "callback" ? (
                        <button
                          type="button"
                          className="calls-signal-label calls-signal-action"
                          data-testid={`calls-callback-${r.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCallBack?.(r);
                          }}
                        >
                          {r.signal.label}
                        </button>
                      ) : (
                        <span className="calls-signal-label">{r.signal.label}</span>
                      )}
                      {r.signal.kind === "ready" || r.signal.kind === "graph_updated" ? (
                        <button
                          type="button"
                          className="calls-signal-action"
                          data-testid={`calls-open-graph-${r.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const gid =
                              r.signal && "graphCardId" in r.signal
                                ? r.signal.graphCardId
                                : undefined;
                            if (gid) onOpenCallGraph?.(gid);
                          }}
                        >
                          Open Graph →
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
          {!filteredCalls.length ? (
            <li className="gsh-empty" data-testid="calls-home-empty">
              {callsFilter === "missed"
                ? "No missed calls."
                : "No recent calls yet."}
            </li>
          ) : null}
          {callsFilter === "missed" && filteredCalls.length > 0 ? (
            <li className="calls-quiet-rule" data-testid="calls-quiet-rule">
              That&apos;s it. No recap unless something changes what you should do next.
            </li>
          ) : null}
        </ul>
      ) : (
        <ul className="chats-home-list" data-testid="chats-home-list">
          {filteredChats.map((r) => (
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
          {!filteredChats.length ? (
            <li className="gsh-empty" data-testid="chats-home-empty">
              No conversations yet. Start with someone you know.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
