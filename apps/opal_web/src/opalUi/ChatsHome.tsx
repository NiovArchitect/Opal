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
import { MutedBell } from "./MutedBell";
import { formatUnread } from "./dockUnreadDisplay";
import { isTestResidueConversation } from "./realChatPath";

export type PlanPillTone = "dinner" | "activity" | "trip" | "live";

export type ChatsHomeRow = {
  id: string;
  name: string;
  kind: "direct" | "group";
  preview: string;
  previewSender?: string;
  when: string;
  memberCount?: number;
  unread?: number;
  muted?: boolean;
  contextLine?: string;
  /** Separate from the latest human message. Same state words as Graphs. */
  planConsequence?: {
    state: "ready" | "action" | "forming" | "past";
    label: string;
    planId?: string;
    /** Colored plan pill tone (founder screenshot A). */
    tone?: PlanPillTone;
  };
  /**
   * Optional canonical relationship label only when proven (Follow ≠ Connection).
   * Composition alone must never invent Following or Connection.
   */
  relationshipLabel?: string;
  avatarSrc?: string;
  avatarTone?: string;
};

export type CommSurface = "chats" | "calls";
export type CallsFilter = "all" | "missed";

type Props = {
  rows: ChatsHomeRow[];
  onOpenChat: (id: string) => void;
  /** Plan / graph pill tap — opens plan detail, not the chat. */
  onOpenPlan?: (planId: string, row: ChatsHomeRow) => void;
  onNewChat?: () => void;
  /** Initial surface; defaults to chats (618:271). */
  initialSurface?: CommSurface;
  callRows?: CallsContinuityRow[];
  onOpenCallGraph?: (graphCardId: string) => void;
  onCallBack?: (row: CallsContinuityRow) => void;
  onNewCall?: () => void;
  onOpenCallsContinuityRow?: (row: CallsContinuityRow) => void;
  /** One-tap outgoing call from Calls row phone control */
  onQuickCallRow?: (row: CallsContinuityRow) => void;
  /** Story ring tap — only when row.hasStory */
  onOpenStoryFromCalls?: (row: CallsContinuityRow) => void;
  /** Real call list load. Omitted keeps the designed empty copy. */
  callsStatus?: "idle" | "loading" | "ready" | "error";
  /** Refetch when the person opens Calls. */
  onOpenCalls?: () => void;
};

/** Composition-only labels. Never invent Follow or Connection from chat existence. */
function defaultRelLabel(r: ChatsHomeRow): string {
  if (r.relationshipLabel) return r.relationshipLabel;
  if (r.kind === "group") {
    return r.memberCount ? `${r.memberCount} people · Group` : "Group";
  }
  return "Direct connection";
}

export function ChatsHome({
  rows,
  onOpenChat,
  onOpenPlan,
  onNewChat,
  initialSurface = "chats",
  callRows = FOUNDER_CALLS_CONTINUITY_ROWS,
  onOpenCallGraph,
  onCallBack,
  onNewCall,
  onOpenCallsContinuityRow,
  onQuickCallRow,
  onOpenStoryFromCalls,
  callsStatus,
  onOpenCalls,
}: Props) {
  const [q, setQ] = useState("");
  const [surface, setSurface] = useState<CommSurface>(initialSurface);
  const [callsFilter, setCallsFilter] = useState<CallsFilter>("all");

  const filteredChats = useMemo(() => {
    const productRows = rows.filter(
      (r) =>
        !isTestResidueConversation({
          id: r.id,
          name: r.name,
          title: r.name,
          preview: r.preview,
        }),
    );
    const s = q.trim().toLowerCase();
    if (!s) return productRows;
    return productRows.filter(
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
      {isCalls ? (
        <div className="calls-ambient-928" aria-hidden data-testid="calls-ambient-field">
          <img className="calls-ambient-cyan" src="/figma-v2/calls/ambient-cyan.svg" alt="" />
          <img className="calls-ambient-violet" src="/figma-v2/calls/ambient-violet.svg" alt="" />
        </div>
      ) : (
        <div className="chats-ambient" aria-hidden data-testid="chats-ambient-field" />
      )}

      {/* 1114:2 — ONE sticky chrome owner (same Midnight plane; no fragmented stickies) */}
      <div
        className="comm-sticky-chrome"
        data-testid="comm-sticky-chrome"
        data-figma-chrome="1114:96"
      >
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
            data-semantic="cyan"
            data-active={surface === "chats" ? "true" : "false"}
            onClick={() => setSurface("chats")}
          >
            Chats
          </button>
          <button
            type="button"
            className={`comm-mode-btn ${surface === "calls" ? "is-active" : ""}`}
            data-testid="comm-mode-calls"
            data-semantic="violet"
            data-active={surface === "calls" ? "true" : "false"}
            onClick={() => {
              setSurface("calls");
              onOpenCalls?.();
            }}
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
              data-semantic="cyan"
              data-active={callsFilter === "all" ? "true" : "false"}
              onClick={() => setCallsFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`calls-filter-btn ${callsFilter === "missed" ? "is-active" : ""}`}
              data-testid="calls-filter-missed"
              data-semantic="coral"
              data-active={callsFilter === "missed" ? "true" : "false"}
              onClick={() => setCallsFilter("missed")}
            >
              Missed{callRows.some((row) => row.missed) ? ` ${callRows.filter((row) => row.missed).length}` : ""}
            </button>
          </div>
        ) : null}
      </div>

      {/* CURRENT 928:9 has no inline search — New Call owns people/groups search */}
      {!isCalls ? (
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
      ) : null}

      {isCalls ? (
        <ul className="calls-continuity-list" data-testid="calls-continuity-list">
          <li className="calls-section-label" data-testid="calls-section-label">
            {callsFilter === "missed" ? "Missed" : "Recent"}
          </li>
          {filteredCalls.length === 0 ? (
            <li className="calls-section-label" data-testid="calls-empty">
              {callsStatus === "error"
                ? "Couldn't load calls."
                : callsStatus === "loading" || callsStatus === "idle"
                  ? "Loading calls…"
                  : "No calls yet"}
            </li>
          ) : null}
          {filteredCalls.map((r) => (
            <li
              key={r.id}
              className="calls-continuity-li"
              data-testid={`calls-row-${r.id}`}
              data-real={r.real ? "true" : "false"}
              data-conversation-id={r.conversationId || undefined}
              data-kind={r.kind}
              data-missed={r.missed ? "true" : "false"}
              data-has-signal={r.signal ? "true" : "false"}
              data-signal-kind={r.signal?.kind || "none"}
              data-has-story={r.hasStory ? "true" : "false"}
            >
              <div
                className={`calls-continuity-row ${r.missed || r.signal?.kind === "callback" ? "is-missed" : ""}`}
              >
                <button
                  type="button"
                  className={`chats-home-avatar calls-row-avatar ${
                    r.hasStory && !r.storyRingInAsset ? "has-story-ring" : ""
                  } ${r.groupAvatarSrcs?.length ? "is-group-mosaic" : ""}`}
                  data-testid={`calls-avatar-${r.id}`}
                  data-story-ring={r.hasStory ? "true" : "false"}
                  aria-label={r.hasStory ? `Open ${r.name} Story` : `${r.name}`}
                  style={r.avatarTone ? { background: r.avatarTone } : undefined}
                  onClick={() => {
                    if (r.hasStory) onOpenStoryFromCalls?.(r);
                    else onOpenCallsContinuityRow?.(r);
                  }}
                >
                  {r.groupAvatarSrcs?.length ? (
                    <span className="calls-group-mosaic" aria-hidden>
                      <img className="calls-group-mosaic-a" src={r.groupAvatarSrcs[0]} alt="" />
                      <img className="calls-group-mosaic-b" src={r.groupAvatarSrcs[1]} alt="" />
                      <img className="calls-group-mosaic-c" src={r.groupAvatarSrcs[2]} alt="" />
                    </span>
                  ) : r.avatarSrc ? (
                    <img src={r.avatarSrc} alt="" />
                  ) : (
                    r.name.slice(0, 1)
                  )}
                </button>
                <button
                  type="button"
                  className="calls-continuity-copy"
                  data-testid={`calls-open-continuity-${r.id}`}
                  onClick={() => onOpenCallsContinuityRow?.(r)}
                >
                  <strong className="chats-home-name">{r.name}</strong>
                  <span
                    className={`calls-continuity-meta ${r.missed ? "is-missed-meta" : ""}`}
                  >
                    {r.metadata}
                  </span>
                  {r.signal ? (
                    <span
                      className={`calls-continuity-signal calls-signal-${r.signal.kind} ${
                        r.signal.kind === "ready" || r.signal.kind === "callback" || r.signal.kind === "needs_you"
                          ? "is-born-reveal"
                          : ""
                      }`}
                      data-testid={
                        r.signal.kind === "ready" || r.signal.kind === "graph_updated"
                          ? `calls-open-graph-${r.id}`
                          : `calls-signal-${r.id}`
                      }
                      role={
                        r.signal.kind === "ready" || r.signal.kind === "graph_updated"
                          ? "link"
                          : undefined
                      }
                      tabIndex={
                        r.signal.kind === "ready" || r.signal.kind === "graph_updated"
                          ? 0
                          : undefined
                      }
                      aria-label={
                        r.signal.kind === "ready" || r.signal.kind === "graph_updated"
                          ? `${r.signal.label}. Open Graph`
                          : r.signal.label
                      }
                      onClick={(e) => {
                        if (r.signal?.kind !== "ready" && r.signal?.kind !== "graph_updated")
                          return;
                        e.stopPropagation();
                        const gid =
                          r.signal && "graphCardId" in r.signal
                            ? r.signal.graphCardId
                            : undefined;
                        if (gid) onOpenCallGraph?.(gid);
                      }}
                      onKeyDown={(e) => {
                        if (r.signal?.kind !== "ready" && r.signal?.kind !== "graph_updated")
                          return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          const gid =
                            r.signal && "graphCardId" in r.signal
                              ? r.signal.graphCardId
                              : undefined;
                          if (gid) onOpenCallGraph?.(gid);
                        }
                      }}
                    >
                      <span className="calls-signal-mark" aria-hidden>
                        ✦
                      </span>
                      <span className="calls-signal-label">{r.signal.label}</span>
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="calls-row-phone"
                  data-testid={`calls-quick-dial-${r.id}`}
                  aria-label={`Call ${r.name}`}
                  onClick={() => {
                    if (r.signal?.kind === "callback") onCallBack?.(r);
                    else onQuickCallRow?.(r);
                  }}
                >
                  <img
                    className="calls-row-phone-shell"
                    src="/figma-v2/calls/callback-shell.svg"
                    alt=""
                    aria-hidden
                  />
                  <img
                    className="calls-row-phone-icon"
                    src="/figma-v2/calls/callback-icon.svg"
                    alt=""
                    width={18}
                    height={18}
                    aria-hidden
                  />
                </button>
              </div>
            </li>
          ))}
          {!filteredCalls.length && (callsStatus === undefined || callsStatus === "ready") ? (
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
          {filteredChats.map((r) => {
            const pill = r.planConsequence;
            const pillTone = pill?.tone;
            const pillId = pill?.planId;
            return (
              <li key={r.id} className="chats-home-item">
                <button
                  type="button"
                  className={`chats-home-row ${r.unread ? "has-unread" : ""}`}
                  data-testid={`chats-row-${r.id}`}
                  data-kind={r.kind}
                  data-unread={r.unread ? String(r.unread) : "0"}
                  data-preview={r.preview}
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
                    <span className="chats-home-top-line">
                      <strong className="chats-home-name">{r.name}</strong>
                      <span className="chats-home-when">{r.when}</span>
                    </span>
                    <span className={`chats-home-preview ${r.unread ? "chats-preview-unread" : ""}`}>
                      {r.kind === "group" && r.previewSender
                        ? `${r.previewSender}: ${r.preview}`
                        : r.preview}
                    </span>
                    <span className="chats-home-meta-row">
                      <span
                        className="chats-home-connection"
                        data-testid="chat-connection-label"
                      >
                        {defaultRelLabel(r)}
                      </span>
                      {pill ? (
                        <span
                          role="link"
                          tabIndex={0}
                          className={`chats-plan-pill is-tone-${pillTone || "dinner"} is-${pill.state}`}
                          data-testid="chat-plan-pill"
                          data-plan-state={pill.state}
                          data-plan-tone={pillTone || "dinner"}
                          data-plan-id={pillId}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (pillId && onOpenPlan) onOpenPlan(pillId, r);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            e.stopPropagation();
                            if (pillId && onOpenPlan) onOpenPlan(pillId, r);
                          }}
                        >
                          {pill.label}
                        </span>
                      ) : null}
                    </span>
                    {r.contextLine ? (
                      <span className="chats-home-context">{r.contextLine}</span>
                    ) : null}
                  </span>
                  <span className="chats-home-trailing">
                    {r.unread ? (
                      <span className="chats-unread-badge" aria-label={`${r.unread} unread`}>
                        {formatUnread(r.unread)}
                      </span>
                    ) : null}
                    {r.muted ? (
                      <span className="chats-muted-bell" data-testid="chat-muted-state" aria-label="Notifications muted">
                        <MutedBell />
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
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
