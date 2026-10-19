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
import type { NextPlanFact, RevealItem } from "../../api/productClient";
import { PlanCard, PlanDetailSheet } from "./PlanCard";
import { ListenButton } from "./ListenButton";
import { PlanAwareness } from "./PlanAwareness";
import { RevealCard, RevealListLine } from "./RevealCard";
import type { PlanProjection } from "./planProjection";

/* ---------------- Presence (spec 8: real signals only) ---------------- */

export type PresenceState = "idle" | "listening" | "thinking" | "responding";

export const PRESENCE_COPY: Record<PresenceState, string> = {
  idle: "Here with you.",
  listening: "Listening.",
  thinking: "Thinking.",
  responding: "Got it.",
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

export function CenterSessionList({
  sessions,
  onNewChat,
  onOpen,
}: {
  sessions: CenterSessionSummary[];
  onNewChat?: () => void;
  onOpen?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const rows = sessions.filter(
    (s) =>
      !query ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.preview.toLowerCase().includes(query.toLowerCase()),
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
      <p className="c1-sublabel">Your current chat stays in the list.</p>
      <input
        className="c1-search"
        placeholder="Search your chats"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search your chats"
      />
      {rows.length === 0 ? (
        <div className="c1-empty c1-facet-field">
          <PresenceMark state="idle" size={56} />
          <p className="c1-empty-title">No chats yet.</p>
          <p className="c1-empty-line">Start your first chat.</p>
        </div>
      ) : (
        <div className="c1-rows">
          {rows.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`c1-session-row${s.isActive ? " c1-session-row-active" : ""}`}
              data-testid="center-session-row"
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
          ))}
        </div>
      )}
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
}: {
  messages: ThreadMsg[];
  plansById: Map<string, PlanProjection>;
  onOpenPlan?: (plan: PlanProjection) => void;
  /** ST-H: sender-only transcript correction, wired by the host. */
  onCorrectTranscript?: (messageId: string, text: string) => Promise<void>;
  /** Harmony2: a holding chip tap routes to its named surface. */
  onHoldingLink?: (target: string) => void;
}) {
  return (
    <div className="c1-flow">
      {messages.map((m) => {
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
              <div className={`c1-bubble-row${m.own ? " c1-bubble-own" : ""}`}>
                <div className={`c1-bubble${m.authorKind === "opal" ? " c1-bubble-opal" : ""}`}>
                  {m.authorKind === "opal" ? (
                    <span className="c1-opal-dot" aria-hidden="true" />
                  ) : null}
                  <span>{m.body}</span>
                  {m.authorKind === "opal" ? <ListenButton text={m.body} /> : null}
                </div>
              </div>
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
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="c1-surface c1-thread" data-testid="center-chat">
      <header className="c1-header c1-thread-header">
        <button type="button" className="c1-back" aria-label="Back to chats" onClick={onBack}>
          ‹
        </button>
        <PresenceMark state={presence} size={36} />
        <span className="c1-thread-titles">
          <span className="c1-thread-name" data-testid="center-chat-title">
            {title}
          </span>
          <span className="c1-thread-sub">{PRESENCE_COPY[presence]}</span>
        </span>
        {onToggleVoice ? (
          <button type="button" className="c1-header-action" onClick={onToggleVoice}>
            {voiceOn ? "Voice on" : "Voice off"}
          </button>
        ) : null}
      </header>
      <MessageFlow messages={messages} plansById={plansById} onOpenPlan={onOpenPlan} onHoldingLink={onHoldingLink} />
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
  /** DIR-4: a P1 reveal about this conversation's people, from the
   *  ONE derivation. When present it takes over the row's plan line
   *  (entry 7: same slot, never a fourth line). */
  reveal?: RevealItem | null;
  onDismissReveal?: (item: RevealItem) => void;
};

export function PeopleChatsList({
  chats,
  onNewChat,
  onOpen,
}: {
  chats: PeopleChatSummary[];
  onNewChat?: () => void;
  onOpen?: (id: string) => void;
}) {
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
        <span>Calls</span>
      </div>
      <input className="c1-search" placeholder="Search people or conversations" aria-label="Search people or conversations" />
      {chats.length === 0 ? (
        <div className="c1-empty">
          <p className="c1-empty-title">No chats yet.</p>
          <p className="c1-empty-line">Start a chat.</p>
        </div>
      ) : (
        <div className="c1-rows">
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              className="c1-chat-row"
              data-testid="chats-row"
              onClick={() => onOpen?.(c.id)}
            >
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
                </span>
                <span className="c1-session-preview">{c.preview}</span>
                {c.reveal ? (
                  <RevealListLine item={c.reveal} onDismiss={c.onDismissReveal} />
                ) : c.nextPlan ? (
                  <PlanAwareness fact={c.nextPlan} entityTint={c.entityTint} variant="row" />
                ) : c.plan ? (
                  <PlanCard plan={c.plan} size="row" />
                ) : null}
              </span>
              <span className="c1-session-time">{c.timeLabel}</span>
            </button>
          ))}
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
        className="c1-listen-btn"
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
        className="c1-listen-btn"
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
        <span className="c1-avatar c1-avatar-sm">{initials}</span>
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
          </div>
        ) : nextPlan ? (
          <NextTogetherStrip plan={nextPlan} onOpen={open} />
        ) : null}
        <MessageFlow messages={messages} plansById={plansById} onOpenPlan={open} onCorrectTranscript={onCorrectTranscript} />
        {reveals && reveals.length > 0 ? (
          <div data-testid="reveal-thread">
            <RevealCard
              item={reveals[0]}
              surface="thread"
              onDismiss={onDismissReveal}
              onAction={onRevealAction}
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
