/**
 * Repair #18 Division C1 - surfaces: Center rest + chat, people chats,
 * thread (spec sections 3, 5, 7, 8).
 *
 * Every surface is a pure render of its spec section 2 projection plus
 * local ephemeral UI state (drafts, scroll) that carries no product
 * meaning. Liked compositions are EVOLVED, not flattened (founder
 * verdict law W4-06): the Center stays the calm host surface, the
 * chats list keeps its labeled structure, the thread keeps its
 * composition - all in the new First Light language, both modes.
 */
import React, { useEffect, useRef, useState } from "react";
import type { CallStateFact, NextPlanFact, RevealItem } from "../../api/productClient";
import { PLAN_STATE_HEX, planStateFamily } from "../../theme/planStateColors";
import { PlanCard, PlanDetailSheet } from "./PlanCard";
import { ReadAloudButton } from "./ReadAloudButton";
import { PlanAwareness, PATTERN_BY_STATE } from "./PlanAwareness";
import { RevealCard, RevealListLine } from "./RevealCard";
import {
  ORBITS_NAME,
  anchorKey,
  buildOrbitLog,
  messagesForSurface,
  type ConversationSurface,
  type OpalAnchor,
  type OpalConversationContext,
  type PersonOpalSessionRow,
} from "./opalChatScope";
import type { PlanProjection } from "./planProjection";
import { useDismissableSurface } from "./useDismissable";
import "./CallLog.css";

/* ---------------- Presence (spec 8: real signals only) ---------------- */

export type PresenceState = "idle" | "listening" | "thinking" | "responding";

/**
 * R19 W6 - founder law: "Opal doesn't listen - it graphs. That's
 * our thing." Presence copy is graph language, never a listening
 * frame. The internal "listening" signal name means only that a
 * real voice-input capture is open (a real signal, per the honesty
 * law in the header of this section); its VISIBLE copy names that
 * capture plainly, it never casts Opal as listening to you.
 */
export const PRESENCE_COPY: Record<PresenceState, string> = {
  idle: "Your plans, graphed.",
  listening: "Voice input is on.",
  thinking: "Working on it.",
  responding: "Opal answered.",
};

/**
 * PresenceMark - C2 character art is a sibling deliverable; per spec
 * 8 build uses a neutral iris ring placeholder with the same geometry
 * and state behavior. It NEVER falls back to the old creature asset.
 */
export function PresenceMark({ state, size = 88 }: { state: PresenceState; size?: number }) {
  return (
    <div
      className={`c1-presence c1-presence-${state}`}
      data-testid="presence-mark"
      data-presence={state}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="c1-presence-core" />
    </div>
  );
}

/* ---------------- Now strip (spec 7) ---------------- */

export type NowNodeData = {
  id: string;
  timeLabel: string; // "Now" or a projection-built clock label
  title: string;
  detail?: string | null; // "with {names} - {place}", parts omitted when unknown
  live?: boolean;
  plan?: PlanProjection | null;
};

export function NowStrip({
  nodes,
  onOpenPlan,
}: {
  nodes: NowNodeData[];
  onOpenPlan?: (plan: PlanProjection) => void;
}) {
  if (nodes.length === 0) {
    return (
      <p className="c1-now-empty" data-testid="now-strip-empty">
        Nothing on today. It is all yours.
      </p>
    );
  }
  return (
    <div className="c1-now-strip" data-testid="now-strip" role="list" aria-label="Today">
      <span className="c1-kicker">NOW</span>
      <div className="c1-now-nodes">
        {nodes.slice(0, 3).map((n) => (
          <button
            key={n.id}
            type="button"
            className="c1-now-node"
            data-testid="now-node"
            role="listitem"
            onClick={() => n.plan && onOpenPlan?.(n.plan)}
          >
            <span className="c1-now-time">
              {n.live ? <span className="c1-live-dot" aria-hidden="true" /> : null}
              {n.timeLabel}
            </span>
            <span className="c1-now-title">{n.title}</span>
            {n.detail ? <span className="c1-now-detail">{n.detail}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Center (spec 3) ---------------- */

export type CenterSessionSummary = {
  id: string;
  title: string;
  preview: string;
  timeLabel: string;
  isActive: boolean;
};

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

export function CenterRest({
  greeting,
  nudge,
  nowNodes,
  presence = "idle",
  destinationLabel = "New chat",
  suggestions = [],
  onOpenChats,
  onOpenPlan,
  onSend,
  onChip,
  onDestinationTap,
  onVoice,
}: {
  greeting: string;
  nudge?: string | null;
  nowNodes: NowNodeData[];
  presence?: PresenceState;
  destinationLabel?: string;
  suggestions?: string[];
  onOpenChats?: () => void;
  onOpenPlan?: (plan: PlanProjection) => void;
  onSend?: (text: string) => void;
  onChip?: (text: string) => void;
  onDestinationTap?: () => void;
  /** Voice input is rendered only when a host wires a real voice path
   *  (integration wiring rule: no dead controls). */
  onVoice?: () => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="c1-surface c1-center-rest" data-testid="center-rest">
      <header className="c1-header">
        <span className="c1-mark" aria-hidden="true" />
        <span className="c1-wordmark">Opal</span>
        <button
          type="button"
          className="c1-header-action"
          data-testid="center-chats-button"
          onClick={onOpenChats}
        >
          Chats
        </button>
      </header>
      <NowStrip nodes={nowNodes} onOpenPlan={onOpenPlan} />
      <div className="c1-hero c1-facet-field">
        <PresenceMark state={presence} size={88} />
        <h1 className="c1-greeting">{greeting}</h1>
        {nudge ? <p className="c1-nudge">{nudge}</p> : null}
        <p className="c1-presence-line">{PRESENCE_COPY[presence]}</p>
      </div>
      <div className="c1-rest-composer-zone">
        <button
          type="button"
          className="c1-destination-pill"
          data-testid="center-destination-pill"
          onClick={onDestinationTap}
        >
          {destinationLabel === "New chat" ? "New chat" : `In: ${destinationLabel}`}
        </button>
        <div className="c1-composer">
          <input
            className="c1-composer-input"
            data-testid="center-composer-input"
            placeholder="Talk to Opal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                onSend?.(draft.trim());
                setDraft("");
              }
            }}
          />
          {draft.trim() ? (
            <button
              type="button"
              className="c1-send"
              aria-label="Send"
              onClick={() => {
                onSend?.(draft.trim());
                setDraft("");
              }}
            >
              ↑
            </button>
          ) : onVoice ? (
            <button type="button" className="c1-mic" aria-label="Voice input" onClick={onVoice}>
              ●
            </button>
          ) : null}
        </div>
        {suggestions.length > 0 ? (
          <div className="c1-chips">
            {suggestions.slice(0, 3).map((s) => (
              <button
                key={s}
                type="button"
                className="c1-chip"
                data-testid="center-suggestion-chip"
                onClick={() => onChip?.(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The Center conversation LOG (Repair #19 Orbits) — the identity
 * surface of this wave. A conversation list is the most standard
 * function in software; here it files by MEANING, not time: the
 * live conversation pinned at top (CONTINUING), a Pinned zone,
 * then orbit groups around their anchors — COLLAPSED BY DEFAULT
 * (collapsed is the quiet mechanism) — a quiet recency list of free
 * conversations below, and archived conversations in their own
 * section at the end. Search crosses everything (orbits,
 * unanchored, facets); a group holding a match opens for the search.
 *
 * The navigator RAIL renders this exact component inside a drawer —
 * one truth, two presentations, never a second list.
 *
 * Privacy seam: a private orbit whose gate is locked renders its
 * header ONLY (anchor name + "Private") — no latest line, no count,
 * no contents — until the gate's isUnlocked says otherwise.
 */
export type OrbitGate = {
  isUnlocked: (key: string) => boolean;
  requestUnlock: (key: string) => void;
};

function anchorDiscLabel(anchor: OpalAnchor): string {
  const label = (anchor.label ?? "").trim();
  if (label) {
    return label
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return anchor.type === "plan" ? "PL" : anchor.type === "place" ? "PIN" : "OP";
}

export function CenterSessionList({
  sessions,
  onNewChat,
  onOpen,
  onOpenOrbit,
  onUnarchive,
  orbitGate,
}: {
  sessions: PersonOpalSessionRow[];
  onNewChat?: () => void;
  onOpen?: (id: string) => void;
  /** Open the orbit sheet for an anchor (from its expanded group). */
  onOpenOrbit?: (anchor: OpalAnchor, context: OpalConversationContext | null) => void;
  onUnarchive?: (id: string) => void;
  orbitGate?: OrbitGate;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [archivedOpen, setArchivedOpen] = useState(false);
  const log = buildOrbitLog(sessions, query);
  const searching = query.trim() !== "";
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const row = (s: PersonOpalSessionRow) => (
    <button
      key={s.id}
      type="button"
      className={`c1-session-row${s.isActive ? " c1-session-row-active" : ""}`}
      data-testid="center-session-row"
      data-session-id={s.id}
      data-active={s.isActive ? "true" : "false"}
      onClick={() => onOpen?.(s.id)}
    >
      <span className="c1-session-main">
        <span className="c1-session-title">{s.title}</span>
        <span className="c1-session-preview">{s.preview}</span>
      </span>
      <span className="c1-session-side">
        <span className="c1-session-time">{s.timeLabel}</span>
        {s.isActive ? <span className="c1-kicker">CURRENT</span> : null}
      </span>
    </button>
  );

  return (
    <div className="c1-surface" data-testid="center-session-list">
      <div className="c1-list-head">
        <h1 className="c1-display">Chats</h1>
        <button
          type="button"
          className="c1-primary-btn"
          data-testid="center-new-chat"
          onClick={onNewChat}
        >
          New chat
        </button>
      </div>
      <p className="c1-sublabel">Filed by what they are about. Your current chat stays at the top.</p>
      <input
        className="c1-search"
        placeholder="Search your chats"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search your chats"
      />
      {sessions.length === 0 ? (
        <div className="c1-empty c1-facet-field">
          <PresenceMark state="idle" size={56} />
          <p className="c1-empty-title">No chats yet.</p>
          <p className="c1-empty-line">Start your first chat.</p>
        </div>
      ) : (
        <div className="c1-rows">
          {log.continuing ? (
            <div data-testid="center-log-continuing">
              <span className="c1-kicker">CONTINUING</span>
              {row(log.continuing)}
            </div>
          ) : null}
          {log.pinned.length > 0 ? (
            <div data-testid="center-log-pinned">
              <span className="c1-kicker">PINNED</span>
              {log.pinned.map(row)}
            </div>
          ) : null}
          {log.groups.length > 0 ? (
            <div data-testid="center-log-orbits">
              <span className="c1-kicker">{ORBITS_NAME.toUpperCase()}</span>
              {log.groups.map((g) => {
                const key = anchorKey(g.anchor);
                // W21 (F6a): "Private" is asserted only when the
                // privacy fact is KNOWN and true. An unknown state
                // renders the group's ordinary subtitle — a loading
                // or scope-implied anchor never claims Private.
                const locked =
                  g.privateKnown && g.private && !(orbitGate?.isUnlocked(key) ?? false);
                const open = !locked && (searching || expanded.has(key));
                return (
                  <div
                    key={key}
                    className="c1-orbit-group"
                    data-testid="orbit-group"
                    data-anchor-key={key}
                    data-anchor-type={g.anchor.type}
                    data-expanded={open ? "true" : "false"}
                    data-private={g.private ? "true" : "false"}
                    data-private-known={g.privateKnown ? "true" : "false"}
                  >
                    <button
                      type="button"
                      className="c1-orbit-header"
                      data-testid="orbit-group-header"
                      aria-expanded={open}
                      onClick={() => (locked ? orbitGate?.requestUnlock(key) : toggle(key))}
                    >
                      <span className="c1-orbit-disc" aria-hidden="true">
                        {anchorDiscLabel(g.anchor)}
                      </span>
                      <span className="c1-session-main">
                        <span className="c1-session-title">{g.anchor.label ?? "Untitled anchor"}</span>
                        {locked ? (
                          <span className="c1-session-preview">Private</span>
                        ) : (
                          <span className="c1-session-preview">{g.latestPreview}</span>
                        )}
                      </span>
                      {locked ? null : (
                        <span className="c1-session-side">
                          <span className="c1-session-time">{g.sessions.length}</span>
                        </span>
                      )}
                    </button>
                    {open ? (
                      <div className="c1-orbit-rows">
                        {g.sessions.map(row)}
                        {onOpenOrbit ? (
                          <button
                            type="button"
                            className="c1-orbit-open-sheet"
                            data-testid="orbit-open-sheet"
                            onClick={() =>
                              onOpenOrbit(g.anchor, g.sessions[0]?.context ?? null)
                            }
                          >
                            {`Open this ${g.anchor.type === "person" ? "person" : g.anchor.type}'s orbit`}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {log.unanchored.length > 0 ? (
            <div data-testid="center-log-unanchored">
              <span className="c1-kicker">EARLIER</span>
              {log.unanchored.map(row)}
            </div>
          ) : null}
          {log.archived.length > 0 ? (
            <div data-testid="center-log-archived">
              <button
                type="button"
                className="c1-orbit-header"
                data-testid="center-log-archived-toggle"
                aria-expanded={archivedOpen}
                onClick={() => setArchivedOpen((v) => !v)}
              >
                <span className="c1-session-main">
                  <span className="c1-session-title">Archived</span>
                </span>
                <span className="c1-session-side">
                  <span className="c1-session-time">{log.archived.length}</span>
                </span>
              </button>
              {archivedOpen
                ? log.archived.map((s) => (
                    <div key={s.id} className="c1-orbit-rows">
                      {row(s)}
                      {onUnarchive ? (
                        <button
                          type="button"
                          className="c1-orbit-open-sheet"
                          data-testid="center-log-unarchive"
                          onClick={() => onUnarchive(s.id)}
                        >
                          Unarchive
                        </button>
                      ) : null}
                    </div>
                  ))
                : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * The conversation RAIL (Repair #19 chrome): the navigator drawer's
 * presentation of the SAME log component over the SAME sessions —
 * one gesture from any open Opal conversation to the whole orbit
 * structure. It holds no list logic of its own.
 */
export function ConversationRail({
  sessions,
  onNewChat,
  onOpen,
  onOpenOrbit,
  onUnarchive,
  orbitGate,
  onClose,
}: {
  sessions: PersonOpalSessionRow[];
  onNewChat?: () => void;
  onOpen?: (id: string) => void;
  onOpenOrbit?: (anchor: OpalAnchor, context: OpalConversationContext | null) => void;
  onUnarchive?: (id: string) => void;
  orbitGate?: OrbitGate;
  onClose: () => void;
}) {
  // BS-08: Escape closes the rail, focus lands inside on open and
  // returns to the invoking control on close (useDismissableSurface).
  const panelRef = useDismissableSurface<HTMLDivElement>({ open: true, onClose });
  return (
    <div className="c1-rail-scrim" data-testid="conversation-rail" onClick={onClose}>
      <div
        ref={panelRef}
        className="c1-rail-panel c1-glass"
        role="dialog"
        aria-modal="true"
        aria-label="Your Opal conversations"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="c1-rail-close" data-testid="conversation-rail-close" onClick={onClose}>
          Close
        </button>
        <CenterSessionList
          sessions={sessions}
          onNewChat={onNewChat}
          onOpen={onOpen}
          onOpenOrbit={onOpenOrbit}
          onUnarchive={onUnarchive}
          orbitGate={orbitGate}
        />
      </div>
    </div>
  );
}

/* ---------------- Shared thread pieces ---------------- */

/** Harmony2 completion (adopt1 4.C1's named missing leg): one
 * figure of the holding answer, parsed from the message's
 * metadata.holding by the host - the label is a finished string and
 * the target is the surface key the backend's links map named. */
export type HoldingFigure = { key: string; label: string; target: string };

export type ThreadMsg = {
  id: string;
  authorKind: "person" | "opal" | "system";
  authorName?: string;
  own?: boolean;
  body: string;
  planId?: string | null;
  /** The holding answer's per-figure links, when this message is
   * the holding answer. Absent on every other message. */
  holdingFigures?: HoldingFigure[] | null;
  /** ST-H: voice-note audio (same stored audio for every participant). */
  audioUrl?: string | null;
  durationMs?: number | null;
  messageType?: string;
};

function MessageFlow({
  messages,
  plansById,
  onOpenPlan,
  onCorrectTranscript,
  onHoldingLink,
  surface,
}: {
  messages: ThreadMsg[];
  plansById: Map<string, PlanProjection>;
  onOpenPlan?: (plan: PlanProjection) => void;
  /** ST-H: sender-only transcript correction, wired by the host. */
  onCorrectTranscript?: (messageId: string, text: string) => Promise<void>;
  /** Harmony2: a holding chip tap routes to its named surface. */
  onHoldingLink?: (target: string) => void;
  /**
   * Repair #19 W14 — SEPARATION: one conversation type per surface.
   * The flow renders only the message kinds that belong to this
   * surface (person thread: person + system; Opal conversation:
   * person + opal). A blended kind renders nothing at all.
   */
  surface: ConversationSurface;
}) {
  const visible = messagesForSurface(surface, messages);
  return (
    <div className="c1-flow">
      {visible.map((m) => {
        if (m.authorKind === "system") {
          return (
            <p key={m.id} className="c1-system-line">
              {m.body}
            </p>
          );
        }
        const plan = m.planId ? plansById.get(m.planId) : undefined;
        if (m.audioUrl) {
          // ST-H voice note: the player is the message; the transcript
          // (when the real transcription path produced one) is its
          // caption. No transcript - no caption, no claim.
          return (
            <React.Fragment key={m.id}>
              <div className={`c1-bubble-row${m.own ? " c1-bubble-own" : ""}`}>
                <div className="c1-bubble c1-voice-note" data-testid="voice-note">
                  <audio controls src={m.audioUrl} data-testid="voice-note-player" />
                  {m.body ? (
                    <span className="c1-voice-transcript" data-testid="voice-note-transcript">
                      {m.body}
                    </span>
                  ) : null}
                  {m.own && onCorrectTranscript ? (
                    <VoiceTranscriptCorrection
                      messageId={m.id}
                      current={m.body}
                      onCorrect={onCorrectTranscript}
                    />
                  ) : null}
                </div>
              </div>
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={m.id}>
            {m.body ? (
              <>
                <div className={`c1-bubble-row${m.own ? " c1-bubble-own" : ""}`}>
                  <div className={`c1-bubble${m.authorKind === "opal" ? " c1-bubble-opal" : ""}`}>
                    {m.authorKind === "opal" ? (
                      <span className="c1-opal-dot" aria-hidden="true" />
                    ) : null}
                    <span>{m.body}</span>
                  </div>
                </div>
                {/* R19 W6: the old Listen rail lived INSIDE this
                    bubble and wrapped letter-by-letter down its side.
                    The real function (TTS playback of Opal's exact
                    words) is re-homed as Read aloud, in its own
                    horizontal action row BELOW the bubble - never
                    inside it, never a rail. It renders nothing at
                    all when no TTS provider is configured. */}
                {m.authorKind === "opal" ? (
                  <div className="c1-message-actions">
                    <ReadAloudButton text={m.body} />
                  </div>
                ) : null}
              </>
            ) : null}
            {m.holdingFigures && m.holdingFigures.length > 0 ? (
              <div className="c1-holding-chips" data-testid="holding-chips">
                {m.holdingFigures.map((figure) => (
                  <button
                    key={figure.key}
                    type="button"
                    className="c1-holding-chip"
                    data-testid={`holding-chip-${figure.key}`}
                    onClick={() => onHoldingLink?.(figure.target)}
                  >
                    {figure.label}
                  </button>
                ))}
              </div>
            ) : null}
            {plan ? (
              <PlanCard plan={plan} size="thread" onOpen={(p) => onOpenPlan?.(p)} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Repair #19 — everything the open Opal conversation's chrome can
 * do. Each action is a real host operation (rename/pin/archive/
 * share/delete are server writes or the platform share path; the
 * anchor actions are the proposal accept/redirect/split/undo writes).
 */
export type CenterChatChrome = {
  /** Opens the conversation rail (the orbit log in a drawer). */
  onOpenRail?: () => void;
  pinned?: boolean;
  userArchived?: boolean;
  onRename?: (title: string) => void;
  onTogglePin?: () => void;
  onToggleArchive?: () => void;
  /** The platform share path for this conversation (host-wired). */
  onShare?: () => void;
  /** The delete clear-out (host-wired; confirm lives in the menu). */
  onDelete?: () => void;
  /** A proposed anchor for this conversation (offer only). */
  anchorProposal?: import("./opalChatScope").AnchorProposal | null;
  onAcceptAnchor?: (proposal: import("./opalChatScope").AnchorProposal) => void;
  /** Redirect candidates (people + plans the account really has). */
  anchorCandidates?: OpalAnchor[];
  onPickAnchor?: (anchor: OpalAnchor | null) => void;
  /** A drift split offer (never a silent move). */
  splitProposal?: import("./opalChatScope").AnchorProposal | null;
  onSplit?: (proposal: import("./opalChatScope").AnchorProposal) => void;
  onDismissSplit?: () => void;
  /** One-line notice after an anchor action, with its one-tap undo. */
  anchorNotice?: string | null;
  onUndoAnchor?: () => void;
  onDismissAnchorNotice?: () => void;
};

export function CenterChat({
  title,
  presence = "idle",
  voiceOn = false,
  messages,
  plansById,
  onBack,
  onOpenPlan,
  onSend,
  onToggleVoice,
  onHoldingLink,
  context,
  onOpenPersonThread,
  onOpenOpalChats,
  chrome,
}: {
  title: string;
  presence?: PresenceState;
  voiceOn?: boolean;
  messages: ThreadMsg[];
  plansById: Map<string, PlanProjection>;
  onBack?: () => void;
  onOpenPlan?: (plan: PlanProjection) => void;
  onSend?: (text: string) => void;
  /** The voice toggle renders only when a host wires the real toggle. */
  onToggleVoice?: () => void;
  /** Harmony2: holding chip taps route to their named surfaces. */
  onHoldingLink?: (target: string) => void;
  /**
   * Repair #19 chrome + Orbits — the conversation's own management
   * surface, supplied by the host only when every action behind it
   * is real. Absent handlers remove their menu item (no dead items).
   */
  chrome?: CenterChatChrome;
  /**
   * Repair #19 W14 — the scope this Opal conversation carries, when
   * it was opened through a thread doorway or the person index. The
   * context is VISIBLE: a chip naming the plan + person, and the
   * chip is a two-way door (back to the person thread; to this
   * person's Opal-chats index). Unscoped chats render no chip.
   */
  context?: OpalConversationContext | null;
  onOpenPersonThread?: (context: OpalConversationContext) => void;
  onOpenOpalChats?: (context: OpalConversationContext) => void;
}) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [redirectOpen, setRedirectOpen] = useState(false);
  const hasMenu = !!(
    chrome &&
    (chrome.onRename || chrome.onTogglePin || chrome.onToggleArchive || chrome.onShare || chrome.onDelete)
  );
  const closeMenu = () => {
    setMenuOpen(false);
    setRenaming(false);
    setDeleteConfirm(false);
  };
  // BS-08: the overflow menu dismisses the standard way — Escape or
  // an outside pointer-down closes it, focus lands in the menu on
  // open and returns to the overflow button on close.
  const overflowBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useDismissableSurface<HTMLDivElement>({
    open: menuOpen,
    onClose: closeMenu,
    closeOnOutsidePointer: true,
    triggerRef: overflowBtnRef,
  });
  return (
    <div className="c1-surface c1-thread" data-testid="center-chat">
      <header className="c1-header c1-thread-header">
        {chrome?.onOpenRail ? (
          <button
            type="button"
            className="c1-nav-btn c1-glass"
            data-testid="center-chat-navigator"
            aria-label="All conversations"
            onClick={chrome.onOpenRail}
          >
            ☰
          </button>
        ) : null}
        <button type="button" className="c1-back" aria-label="Back to chats" onClick={onBack}>
          ‹
        </button>
        <PresenceMark state={presence} size={36} />
        <span className="c1-thread-titles">
          <span className="c1-thread-name" data-testid="center-chat-title">
            {title}
          </span>
          {/* R19 W6 self-evidence: the header names the surface for
              what it is - a chat with Opal (surface map entry 5) -
              not the old listening frame. A non-idle
              presence is a real signal only, stated in graph
              language via PRESENCE_COPY. A conversation whose title
              mentions a meeting is still this chat: meeting content
              enters Opal only as an ingested transcript/summary
              record inside a conversation, never as its own page. */}
          <span className="c1-thread-sub">
            {presence === "idle" ? "Chat with Opal" : PRESENCE_COPY[presence]}
          </span>
        </span>
        {onToggleVoice ? (
          <button type="button" className="c1-header-action" onClick={onToggleVoice}>
            {voiceOn ? "Voice on" : "Voice off"}
          </button>
        ) : null}
        {hasMenu ? (
          <button
            ref={overflowBtnRef}
            type="button"
            className="c1-overflow-btn c1-glass"
            data-testid="center-chat-overflow"
            aria-label="Conversation actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          >
            •••
          </button>
        ) : null}
      </header>
      {menuOpen && chrome ? (
        <div ref={menuRef} className="c1-overflow-menu c1-glass" data-testid="center-chat-overflow-menu" role="menu" aria-label="Conversation actions">
          {renaming ? (
            <form
              data-testid="center-chat-rename-form"
              onSubmit={(e) => {
                e.preventDefault();
                const next = renameDraft.trim();
                if (next) {
                  chrome.onRename?.(next);
                  closeMenu();
                }
              }}
            >
              <input
                aria-label="Conversation title"
                data-testid="center-chat-rename-input"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
              />
              <button type="submit" data-testid="center-chat-rename-save" onClick={(e) => {
                // The form submit above is the keyboard path; this
                // click path keeps the same single write.
                e.preventDefault();
                const next = renameDraft.trim();
                if (next) {
                  chrome.onRename?.(next);
                  closeMenu();
                }
              }}>
                Save
              </button>
              <button type="button" onClick={() => setRenaming(false)}>
                Cancel
              </button>
            </form>
          ) : deleteConfirm ? (
            <div data-testid="center-chat-delete-confirm">
              <p>
                Delete this conversation with Opal? Its messages are deleted and it leaves
                every list. Any person thread and any plans stay exactly as they are.
              </p>
              <button
                type="button"
                data-testid="center-chat-delete-confirm-btn"
                onClick={() => {
                  chrome.onDelete?.();
                  closeMenu();
                }}
              >
                Delete this chat
              </button>
              <button type="button" onClick={() => setDeleteConfirm(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <>
              {chrome.onRename ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="center-chat-menu-rename"
                  onClick={() => {
                    setRenameDraft(title);
                    setRenaming(true);
                  }}
                >
                  Rename
                </button>
              ) : null}
              {chrome.onTogglePin ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="center-chat-menu-pin"
                  onClick={() => {
                    chrome.onTogglePin?.();
                    closeMenu();
                  }}
                >
                  {chrome.pinned ? "Unpin" : "Pin"}
                </button>
              ) : null}
              {chrome.onToggleArchive ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="center-chat-menu-archive"
                  onClick={() => {
                    chrome.onToggleArchive?.();
                    closeMenu();
                  }}
                >
                  {chrome.userArchived ? "Unarchive" : "Archive"}
                </button>
              ) : null}
              {chrome.onShare ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="center-chat-menu-share"
                  onClick={() => {
                    chrome.onShare?.();
                    closeMenu();
                  }}
                >
                  Share
                </button>
              ) : null}
              {chrome.onDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="center-chat-menu-delete"
                  onClick={() => setDeleteConfirm(true)}
                >
                  Delete
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {chrome?.anchorNotice ? (
        <div className="c1-anchor-notice" data-testid="anchor-notice">
          <span>{chrome.anchorNotice}</span>
          {chrome.onUndoAnchor ? (
            <button type="button" data-testid="anchor-undo" onClick={chrome.onUndoAnchor}>
              Undo
            </button>
          ) : null}
          <button type="button" data-testid="anchor-notice-dismiss" onClick={chrome.onDismissAnchorNotice}>
            Dismiss
          </button>
        </div>
      ) : null}
      {chrome?.anchorProposal && chrome.onAcceptAnchor ? (
        <div className="c1-anchor-proposal" data-testid="anchor-proposal">
          <span>{`About ${chrome.anchorProposal.anchor.label ?? "this"}?`}</span>
          <button
            type="button"
            data-testid="anchor-proposal-accept"
            onClick={() => chrome.onAcceptAnchor?.(chrome!.anchorProposal!)}
          >
            Yes
          </button>
          {chrome.onPickAnchor ? (
            <button type="button" data-testid="anchor-proposal-redirect" onClick={() => setRedirectOpen((v) => !v)}>
              Choose different
            </button>
          ) : null}
        </div>
      ) : null}
      {redirectOpen && chrome?.onPickAnchor ? (
        <div className="c1-anchor-picker" data-testid="anchor-picker">
          {(chrome.anchorCandidates ?? []).map((a) => (
            <button
              key={`${a.type}:${a.id}`}
              type="button"
              data-testid="anchor-picker-option"
              data-anchor-key={`${a.type}:${a.id}`}
              onClick={() => {
                chrome.onPickAnchor?.(a);
                setRedirectOpen(false);
              }}
            >
              {a.label ?? a.id}
            </button>
          ))}
          <button
            type="button"
            data-testid="anchor-picker-unanchored"
            onClick={() => {
              chrome.onPickAnchor?.(null);
              setRedirectOpen(false);
            }}
          >
            Leave unanchored
          </button>
        </div>
      ) : null}
      {chrome?.splitProposal && chrome.onSplit ? (
        <div className="c1-anchor-proposal" data-testid="split-proposal">
          <span>
            {`This is moving toward ${chrome.splitProposal.anchor.label ?? "someone new"}. Start a new chat about them? This chat stays where it is.`}
          </span>
          <button
            type="button"
            data-testid="split-proposal-accept"
            onClick={() => chrome.onSplit?.(chrome!.splitProposal!)}
          >
            Start new chat
          </button>
          <button type="button" data-testid="split-proposal-dismiss" onClick={chrome.onDismissSplit}>
            Not now
          </button>
        </div>
      ) : null}
      {context ? (
        <div
          className="c1-context-chip"
          data-testid="opal-context-chip"
          data-person-id={context.personId}
          data-plan-id={context.planId ?? ""}
          data-conversation-id={context.conversationId ?? ""}
        >
          <span className="c1-context-chip-text">
            {context.planTitle
              ? `${context.planTitle} - with ${context.personName}`
              : `About ${context.personName}`}
          </span>
          {context.conversationId && onOpenPersonThread ? (
            <button
              type="button"
              className="c1-context-chip-action"
              data-testid="opal-context-open-thread"
              onClick={() => onOpenPersonThread(context)}
            >
              {`Back to your chat with ${context.personName}`}
            </button>
          ) : null}
          {onOpenOpalChats ? (
            <button
              type="button"
              className="c1-context-chip-action"
              data-testid="opal-context-open-index"
              onClick={() => onOpenOpalChats(context)}
            >
              {`Opal chats about ${context.personName}`}
            </button>
          ) : null}
        </div>
      ) : null}
      <MessageFlow surface="opal-chat" messages={messages} plansById={plansById} onOpenPlan={onOpenPlan} onHoldingLink={onHoldingLink} />
      <div className="c1-composer-bar">
        <span className="c1-destination-pill c1-destination-compact">{title}</span>
        <div className="c1-composer">
          <input
            className="c1-composer-input"
            placeholder="Talk to Opal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                onSend?.(draft.trim());
                setDraft("");
              }
            }}
          />
          {draft.trim() ? (
            <button
              type="button"
              className="c1-send"
              aria-label="Send"
              onClick={() => {
                onSend?.(draft.trim());
                setDraft("");
              }}
            >
              ↑
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------- People chats + thread (spec 5) ---------------- */

export type PeopleChatSummary = {
  id: string;
  name: string;
  initials: string;
  preview: string;
  timeLabel: string;
  unread: boolean;
  plan: PlanProjection | null;
  /** DIR-1: the backend's shared upcoming plan fact for this row.
   *  When present it is the row's ONE plan-awareness element (it
   *  replaces the row pill - presence discipline: one per row). */
  nextPlan?: NextPlanFact | null;
  /** DIR-1: the conversation entity's stable tint (L9). */
  entityTint?: number | null;
  /** Repair #19 W24 (DL-03) — a quiet tie cue beside the person's
   *  name ("Chanelle Brooks · Family - Sister"), finished by the
   *  host adapter from the relationship rows. Absent = no cue; the
   *  row grammar (two lines + plan slot) is unchanged. */
  tieLabel?: string | null;
  /** DIR-4: a P1 reveal about this conversation's people, from the
   *  ONE derivation. When present it takes over the row's plan line
   *  (entry 7: same slot, never a fourth line). */
  reveal?: RevealItem | null;
  onDismissReveal?: (item: RevealItem) => void;
  /** Polish Cluster A (P1): enter the existing change-proposal flow
   *  for the row reveal's plan. Absent = no lane button on the row. */
  onRequestChangeReveal?: (item: RevealItem) => void;
};

export function PeopleChatsList({
  chats,
  onNewChat,
  onOpen,
  onShowCalls,
}: {
  chats: PeopleChatSummary[];
  onNewChat?: () => void;
  onOpen?: (id: string) => void;
  /** Repair #19: the Calls segment is a real tab when a host wires
   *  the C2 call log (ChatsHost does). Absent = the segment stays
   *  words only, exactly as before (review surfaces). */
  onShowCalls?: () => void;
}) {
  /* R19 W25 (FA-01): the search field is WIRED — it filters the
   * list in place, the exact pattern the Calls log below and the
   * Center log already prove (query state in the component, rows
   * derived from it). It was rendered with no value/onChange and
   * filtered nothing (W22 J4, charged). The needle matches the
   * row's own finished text only: the person's name, the preview,
   * the tie cue, and the plan text the row itself carries (the
   * DIR-4 reveal, the DIR-1 next-plan fact, or the plan
   * projection) — never a fact the row does not show. */
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? chats.filter((c) => {
        const haystack = [
          c.name,
          c.preview,
          c.tieLabel ?? "",
          c.reveal?.title ?? "",
          c.reveal?.substance ?? "",
          c.nextPlan?.title ?? "",
          c.nextPlan?.when_label ?? "",
          c.nextPlan?.where_label ?? "",
          c.plan?.title ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
    : chats;
  return (
    <div className="c1-surface" data-testid="people-chats-list">
      <div className="c1-list-head">
        <h1 className="c1-display">Chats</h1>
        {onNewChat ? (
          <button
            type="button"
            className="c1-primary-btn c1-primary-outline"
            data-testid="chats-new-chat"
            onClick={onNewChat}
          >
            + New
          </button>
        ) : null}
      </div>
      <div className="c1-segment" role="tablist" aria-label="Chats or calls">
        <span className="c1-segment-active">Chats</span>
        {onShowCalls ? (
          <button
            type="button"
            role="tab"
            data-testid="chats-segment-calls"
            onClick={onShowCalls}
          >
            Calls
          </button>
        ) : (
          <span>Calls</span>
        )}
      </div>
      <input
        className="c1-search"
        placeholder="Search people or conversations"
        aria-label="Search people or conversations"
        data-testid="chats-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {chats.length === 0 ? (
        <div className="c1-empty">
          <p className="c1-empty-title">No chats yet.</p>
          <p className="c1-empty-line">Start a chat.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="c1-empty" data-testid="chats-search-empty">
          <p className="c1-empty-line">No chat matches that search.</p>
        </div>
      ) : (
        <div className="c1-rows">
          {visible.map((c) => {
            /* R19 W5-06: the row's plan state comes ONLY from the
             * row's existing single-source plan facts, in the order
             * the row already renders them (the DIR-4 reveal that
             * took the plan line, else the DIR-1 next_plan fact,
             * else the plan projection). No new derivation: each
             * source already carries its state family (normalized
             * through the one planStateFamily). A row with no plan
             * carries NO data-plan-state and wears no state border
             * (presence discipline; theme/unifyChats.css paints the
             * ambient border only under [data-plan-state]). */
            const rowState = c.reveal?.plan_state
              ? planStateFamily(c.reveal.plan_state)
              : c.nextPlan
                ? planStateFamily(c.nextPlan.state)
                : (c.plan?.state ?? null);
            return (
              /* The row is a div with button semantics, not a
               * <button>: the in-row mini-card carries a real
               * Dismiss <button>, and a button inside a button is
               * invalid nesting whose flex children collapse to
               * min-content in the row (the W5-06 squeeze). */
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className="c1-chat-row"
                data-testid="chats-row"
                data-plan-state={rowState ?? undefined}
                onClick={() => onOpen?.(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen?.(c.id);
                  }
                }}
              >
                {/* R19 W20 (JA-03): the row is a two-line
                 * composition — the identity line (avatar + title/
                 * preview + time) on top, and the in-row plan card
                 * BELOW it spanning the row's full content width.
                 * The card used to live inside the main column,
                 * where the 48px avatar and the long-form timestamp
                 * starved it to ~142px at served breadth (the card
                 * was full-width of a starved column). The card's
                 * designed width is the row's content width
                 * (W5-06 grammar); pinned at served breadth by
                 * ja03ChatsRowBreadth.test.tsx. */}
                <span className="c1-chat-row-top">
                  <span
                    className="c1-avatar"
                    style={
                      c.entityTint
                        ? {
                            boxShadow: `inset 0 0 0 2px var(--person-tint-${c.entityTint})`,
                          }
                        : undefined
                    }
                  >
                    {c.initials}
                    {c.unread ? <span className="c1-unread-dot" aria-label="Unread" /> : null}
                  </span>
                  <span className="c1-session-main">
                    <span className={`c1-session-title${c.unread ? " c1-unread-name" : ""}`}>
                      {c.name}
                      {c.tieLabel ? (
                        <span className="c1-session-tie" data-testid="chats-row-tie">
                          {` · ${c.tieLabel}`}
                        </span>
                      ) : null}
                    </span>
                    <span className="c1-session-preview">{c.preview}</span>
                  </span>
                  <span className="c1-session-time">{c.timeLabel}</span>
                </span>
                {c.reveal ? (
                  <RevealListLine item={c.reveal} onDismiss={c.onDismissReveal} onRequestChange={c.onRequestChangeReveal} />
                ) : c.nextPlan ? (
                  <PlanAwareness fact={c.nextPlan} entityTint={c.entityTint} variant="row" />
                ) : c.plan ? (
                  <PlanCard plan={c.plan} size="row" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- People calls (Repair #19: the call log, in the
 * C2 shell, in the design) ----------------
 *
 * The call log's C2 place: the Chats surface's Calls tab (the
 * product's own Chats/Calls pairing - surface-map F-GAP-9, closed
 * here). Every row is a REAL call record from GET /calls, rendered
 * verbatim: the peer name and the finished history line are the
 * server's, the plan-awareness element is the row's DIR-1 fact, and
 * the row's AMBIENT BORDER is the row's call-state fact
 * (call_state, derived once in the service layer - Calls.CallState):
 * the border's color comes ONLY from the one token source
 * (PLAN_STATE_HEX, via the --call-state custom property, at the
 * unify wave's ambient mixes in CallLog.css) and its pattern is the
 * indicator pattern for that family. This component derives no
 * state: no fact, no state border (a contract without call_state
 * renders the quiet default edge). When the call's state changes
 * server-side, the next read carries the new fact and the border
 * changes with it - it is a live derivation, not a paint.
 */

export type PeopleCallSummary = {
  id: string;
  name: string;
  initials: string;
  /** Finished metadata line (callHistoryLine over the server's
   *  history label + instant) - built by the host adapter. */
  metadata: string;
  /** The conversation this call belongs to, when the host can open
   *  it for real; absent = the row offers no open action. */
  conversationId?: string | null;
  /** DIR-1: the backend's shared upcoming plan fact for this peer. */
  nextPlan?: NextPlanFact | null;
  /** DIR-1: the peer's stable entity tint. */
  entityTint?: number | null;
  /** Repair #19: the backend's call-state fact for this row. */
  callState?: CallStateFact | null;
};

export function PeopleCallsList({
  calls,
  status = "ready",
  onShowChats,
  onOpenConversation,
  onCallBack,
}: {
  calls: PeopleCallSummary[];
  status?: "loading" | "ready" | "error";
  onShowChats?: () => void;
  onOpenConversation?: (call: PeopleCallSummary) => void;
  /** Real call placement (the host POSTs the conversation call).
   *  Offered only on rows carrying a conversation to call in. */
  onCallBack?: (call: PeopleCallSummary) => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? calls.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.metadata.toLowerCase().includes(needle),
      )
    : calls;
  return (
    <div className="c1-surface" data-testid="people-calls-list">
      <div className="c1-list-head">
        <h1 className="c1-display">Calls</h1>
      </div>
      <div className="c1-segment" role="tablist" aria-label="Chats or calls">
        {onShowChats ? (
          <button
            type="button"
            role="tab"
            data-testid="calls-segment-chats"
            onClick={onShowChats}
          >
            Chats
          </button>
        ) : (
          <span>Chats</span>
        )}
        <span className="c1-segment-active">Calls</span>
      </div>
      <input
        className="c1-search"
        placeholder="Search calls"
        aria-label="Search calls"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {status === "error" ? (
        <div className="c1-empty" data-testid="calls-empty-error">
          <p className="c1-empty-title">Couldn&apos;t load calls.</p>
          <p className="c1-empty-line">Check your connection and try again.</p>
        </div>
      ) : status === "loading" && calls.length === 0 ? (
        <div className="c1-empty" data-testid="calls-loading">
          <p className="c1-empty-line">Loading calls…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="c1-empty" data-testid="calls-empty">
          <p className="c1-empty-title">No calls yet.</p>
          <p className="c1-empty-line">
            {needle
              ? "No call matches that search."
              : "Calls you make and receive will show up here."}
          </p>
        </div>
      ) : (
        <div className="c1-rows">
          {visible.map((c) => {
            const family = c.callState ? planStateFamily(c.callState.state) : null;
            const canOpen = Boolean(onOpenConversation && c.conversationId);
            const canCall = Boolean(onCallBack && c.conversationId);
            const main = (
              <>
                <span
                  className="c1-avatar"
                  style={
                    c.entityTint
                      ? {
                          boxShadow: `inset 0 0 0 2px var(--person-tint-${c.entityTint})`,
                        }
                      : undefined
                  }
                >
                  {c.initials}
                </span>
                <span className="c1-session-main">
                  <span className="c1-session-title">{c.name}</span>
                  <span className="c1-session-preview">{c.metadata}</span>
                </span>
                {c.callState ? (
                  <span
                    className="c1-call-state-label"
                    data-testid="call-state-label"
                  >
                    {family === "happening" ? (
                      <span className="c1-call-live-dot" aria-hidden="true" />
                    ) : null}
                    {c.callState.label}
                  </span>
                ) : null}
                {/* W21 (F3): the plan-awareness pill is a full-width
                    second line of the row's main (the mini-card
                    grammar), not a tenant of the name column — in
                    the column it was squeezed to ~74px at 390px and
                    its text spilled past the pill border. */}
                {c.nextPlan ? (
                  <PlanAwareness
                    fact={c.nextPlan}
                    entityTint={c.entityTint}
                    variant="call"
                  />
                ) : null}
              </>
            );
            return (
              <div
                key={c.id}
                className="c1-call-row"
                data-testid="calls-row"
                data-call-id={c.id}
                data-call-state={family ?? undefined}
                data-call-state-reason={c.callState?.reason ?? undefined}
                data-pattern={
                  family ? (PATTERN_BY_STATE[family] ?? "solid") : undefined
                }
                style={
                  family
                    ? ({ "--call-state": PLAN_STATE_HEX[family] } as React.CSSProperties)
                    : undefined
                }
              >
                {canOpen ? (
                  <button
                    type="button"
                    className="c1-call-main"
                    data-testid={`calls-open-conversation-${c.id}`}
                    aria-label={`Open conversation with ${c.name}`}
                    onClick={() => onOpenConversation?.(c)}
                  >
                    {main}
                  </button>
                ) : (
                  <div className="c1-call-main">{main}</div>
                )}
                {canCall ? (
                  <button
                    type="button"
                    className="c1-call-back"
                    data-testid={`calls-call-back-${c.id}`}
                    aria-label={
                      c.callState?.reason === "missed_unresolved"
                        ? `Call back ${c.name}`
                        : `Call ${c.name}`
                    }
                    onClick={() => onCallBack?.(c)}
                  >
                    ✆
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The ONE Next Together strip (spec 5.3). The duplicate hidden strip is deleted, not hidden. */
export function NextTogetherStrip({
  plan,
  onOpen,
}: {
  plan: PlanProjection;
  onOpen?: (plan: PlanProjection) => void;
}) {
  return (
    <div className="c1-next-strip" data-testid="next-together-strip">
      <span className="c1-kicker">NEXT TOGETHER</span>
      <PlanCard plan={plan} size="strip" onOpen={onOpen} />
    </div>
  );
}

/** ST-H: the sender corrects the stored transcript; the correction
 *  replaces it - it is the text every later read (and ingestion) sees. */
function VoiceTranscriptCorrection({
  messageId,
  current,
  onCorrect,
}: {
  messageId: string;
  current: string;
  onCorrect: (messageId: string, text: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [error, setError] = useState<string | null>(null);
  if (!editing) {
    return (
      <button
        type="button"
        className="c1-inline-action-btn"
        data-testid="voice-note-correct"
        onClick={() => {
          setDraft(current);
          setEditing(true);
        }}
      >
        {current ? "Correct transcript" : "Add transcript"}
      </button>
    );
  }
  return (
    <span className="c1-voice-correction">
      <input
        aria-label="Corrected transcript"
        data-testid="voice-note-correction-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button
        type="button"
        className="c1-inline-action-btn"
        data-testid="voice-note-correction-save"
        onClick={() => {
          void onCorrect(messageId, draft)
            .then(() => setEditing(false))
            .catch(() => setError("That correction did not save. Try again."));
        }}
      >
        Save
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </span>
  );
}

export function ThreadShell({
  name,
  initials,
  sharedLine,
  nextPlan,
  nextPlanFact,
  entityTint,
  reveals,
  onDismissReveal,
  onRevealAction,
  onRequestChangeReveal,
  messages,
  plansById,
  contextualChip,
  privateGuidance,
  composerPlaceholder,
  onBack,
  onOpenPlan,
  onSend,
  onCall,
  onCorrectTranscript,
  onOpenProfile,
  opalDoorway,
  onTalkToOpal,
  personContext,
  onOpenOpalChats,
}: {
  name: string;
  initials: string;
  sharedLine?: string | null;
  nextPlan?: PlanProjection | null;
  /** DIR-1: the backend's shared upcoming plan fact for this thread.
   *  When present, the Next Together strip at its designed place is
   *  fed by this fact (the same fact the chats row and call log
   *  render) instead of a PlanProjection. */
  nextPlanFact?: NextPlanFact | null;
  entityTint?: number | null;
  /** DIR-4: this thread's reveal items from the ONE derivation, in
   *  the derivation's priority order. At most the first renders
   *  (entry 8 / spec 5.4: one unanswered reveal per thread). */
  reveals?: RevealItem[];
  onDismissReveal?: (item: RevealItem) => void;
  onRevealAction?: (item: RevealItem) => void;
  /** Polish Cluster A (P1): enter the existing change-proposal flow
   *  for the thread reveal's plan. Absent = no lane button. */
  onRequestChangeReveal?: (item: RevealItem) => void;
  messages: ThreadMsg[];
  plansById: Map<string, PlanProjection>;
  contextualChip?: string | null;
  privateGuidance?: string | null;
  composerPlaceholder: string;
  onBack?: () => void;
  onOpenPlan?: (plan: PlanProjection) => void;
  /** Composer send. Absent = the composer renders read-only (no fake
   *  send path); hosts on a live thread always supply it. */
  onSend?: (text: string) => void;
  /** Call controls render only when a host wires the real call path. */
  onCall?: (kind: "video" | "voice") => void;
  onCorrectTranscript?: (messageId: string, text: string) => Promise<void>;
  /** Repair #19 W13: tap the thread identity to open the person profile (new design). */
  onOpenProfile?: () => void;
  /**
   * Repair #19 W14 — THE DOORWAY: the scoped context the host derived
   * from this thread's own DIR-1 fact + DIR-4 reveals (opalDoorway
   * Context in opalChatScope). Non-null ONLY when the plan is
   * discussable; null renders no doorway at all. The button lives
   * inside the Next Together strip, attached to the plan-awareness
   * element it discusses.
   */
  opalDoorway?: OpalConversationContext | null;
  onTalkToOpal?: (context: OpalConversationContext) => void;
  /**
   * Repair #19 Addition A — the person context of this thread, for
   * the Opal-chats index doorway. The person is always here, so this
   * doorway's discipline is placement: one quiet text button in the
   * plan-awareness zone (the strip when it renders, else a slim zone
   * under the header), never permanent chrome elsewhere.
   */
  personContext?: OpalConversationContext | null;
  onOpenOpalChats?: (context: OpalConversationContext) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fn = () => setScrolled(el.scrollTop > 120);
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);
  const [sheetPlan, setSheetPlan] = useState<PlanProjection | null>(null);
  const [draft, setDraft] = useState("");
  const open = (p: PlanProjection) => {
    setSheetPlan(p);
    onOpenPlan?.(p);
  };
  return (
    <div className="c1-surface c1-thread" data-testid="thread-shell">
      <header className="c1-header c1-thread-header">
        <button type="button" className="c1-back" aria-label="Back" onClick={onBack}>
          ‹
        </button>
        {onOpenProfile ? (
          <button
            type="button"
            className="c1-avatar c1-avatar-sm c1-avatar-btn"
            data-testid="thread-header-avatar"
            aria-label={`${name} profile`}
            onClick={onOpenProfile}
          >
            {initials}
          </button>
        ) : (
          <span className="c1-avatar c1-avatar-sm">{initials}</span>
        )}
        <span className="c1-thread-titles">
          <span className="c1-thread-name" data-testid="thread-header-name">
            {name}
          </span>
          {scrolled && nextPlanFact ? (
            <span className="c1-thread-sub">
              {nextPlanFact.title} - {nextPlanFact.when_label ?? "Time not set yet."}
            </span>
          ) : scrolled && nextPlan ? (
            <span className="c1-thread-sub">
              {nextPlan.title} - {nextPlan.when.kind === "canonical" ? nextPlan.when.label : "Time not set yet."}
            </span>
          ) : sharedLine ? (
            <span className="c1-thread-sub">{sharedLine}</span>
          ) : null}
        </span>
        {onCall ? (
          <span className="c1-call-actions">
            <button type="button" className="c1-call-btn" aria-label="Video call" onClick={() => onCall("video")}>
              ▣
            </button>
            <button type="button" className="c1-call-btn" aria-label="Voice call" onClick={() => onCall("voice")}>
              ✆
            </button>
          </span>
        ) : null}
      </header>
      <div className="c1-scroll" ref={scrollRef}>
        {nextPlanFact ? (
          <div className="c1-next-strip" data-testid="next-together-strip">
            <span className="c1-kicker">NEXT TOGETHER</span>
            <PlanAwareness fact={nextPlanFact} entityTint={entityTint} variant="strip" />
            {/* Repair #19 W14 — the doorway, additive inside the strip:
                one quiet button, only when the host's derivation
                (opalChatScope) earned it. Plus Addition A: the same
                zone carries the person's Opal-chats index doorway. */}
            {opalDoorway && onTalkToOpal ? (
              <button
                type="button"
                className="c1-opal-doorway"
                data-testid="opal-doorway"
                data-plan-id={opalDoorway.planId ?? ""}
                data-person-id={opalDoorway.personId}
                onClick={() => onTalkToOpal(opalDoorway)}
              >
                {`Talk to Opal about this plan${opalDoorway.planTitle ? ` - ${opalDoorway.planTitle}` : ""}`}
              </button>
            ) : null}
            {personContext && onOpenOpalChats ? (
              <button
                type="button"
                className="c1-opal-doorway c1-opal-doorway-quiet"
                data-testid="opal-chats-index-open"
                data-person-id={personContext.personId}
                onClick={() => onOpenOpalChats(personContext)}
              >
                {`Opal chats about ${personContext.personName}`}
              </button>
            ) : null}
          </div>
        ) : nextPlan ? (
          <NextTogetherStrip plan={nextPlan} onOpen={open} />
        ) : personContext && onOpenOpalChats ? (
          <div className="c1-next-strip" data-testid="thread-opal-zone">
            <button
              type="button"
              className="c1-opal-doorway c1-opal-doorway-quiet"
              data-testid="opal-chats-index-open"
              data-person-id={personContext.personId}
              onClick={() => onOpenOpalChats(personContext)}
            >
              {`Opal chats about ${personContext.personName}`}
            </button>
          </div>
        ) : null}
        <MessageFlow surface="person-thread" messages={messages} plansById={plansById} onOpenPlan={open} onCorrectTranscript={onCorrectTranscript} />
        {reveals && reveals.length > 0 ? (
          <div data-testid="reveal-thread">
            <RevealCard
              item={reveals[0]}
              surface="thread"
              onDismiss={onDismissReveal}
              onAction={onRevealAction}
              onRequestChange={onRequestChangeReveal}
            />
          </div>
        ) : null}
      </div>
      {privateGuidance ? (
        <div className="c1-private-guidance" data-testid="private-guidance">
          <span className="c1-kicker">ONLY YOU</span>
          <span>{privateGuidance}</span>
        </div>
      ) : null}
      {contextualChip ? (
        <div className="c1-chip-row">
          <button type="button" className="c1-chip">
            {contextualChip}
          </button>
        </div>
      ) : null}
      <div className="c1-composer-bar">
        <div className="c1-composer">
          <input
            className="c1-composer-input"
            placeholder={composerPlaceholder}
            value={draft}
            readOnly={!onSend}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSend && draft.trim()) {
                onSend(draft.trim());
                setDraft("");
              }
            }}
          />
          {onSend && draft.trim() ? (
            <button
              type="button"
              className="c1-send"
              aria-label="Send"
              onClick={() => {
                onSend(draft.trim());
                setDraft("");
              }}
            >
              ↑
            </button>
          ) : null}
        </div>
      </div>
      {sheetPlan ? (
        <PlanDetailSheet plan={sheetPlan} onClose={() => setSheetPlan(null)} />
      ) : null}
    </div>
  );
}
