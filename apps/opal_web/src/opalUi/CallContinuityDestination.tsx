/**
 * CALL CONTINUITY — CURRENT additive authority
 * Person: 928:158 · Group: 928:221
 * Call / Video / Chat + current signal + recent history.
 */
import React from "react";

export type CallContinuityKind = "person" | "group";

export type RecentCallEvent = {
  id: string;
  typeLabel: string;
  whenLabel: string;
};

type Props = {
  kind: CallContinuityKind;
  name: string;
  meta: string;
  avatarSrc?: string;
  avatarTone?: string;
  /** Story ring only when a real Story exists — no false affordance */
  hasStory?: boolean;
  signalEyebrow?: string;
  signalLabel?: string;
  signalGraphId?: string;
  recent: RecentCallEvent[];
  onBack: () => void;
  onCall: () => void;
  onVideo: () => void;
  onChat: () => void;
  onOpenGraph?: (graphId: string) => void;
  onOpenStory?: () => void;
};

const PERSON_RECENT: RecentCallEvent[] = [
  { id: "rc1", typeLabel: "Outgoing audio", whenLabel: "12m ago · 14m" },
  { id: "rc2", typeLabel: "Video", whenLabel: "Yesterday · 36m" },
  { id: "rc3", typeLabel: "Incoming audio", whenLabel: "Fri · 8m" },
  { id: "rc4", typeLabel: "Missed audio", whenLabel: "Thu · 6:42 PM" },
];

const GROUP_RECENT: RecentCallEvent[] = [
  { id: "rg1", typeLabel: "Missed group call", whenLabel: "28m ago" },
  { id: "rg2", typeLabel: "Group audio", whenLabel: "Sunday · 22m" },
  { id: "rg3", typeLabel: "Group video", whenLabel: "Aug 26 · 18m" },
];

export function defaultPersonRecent() {
  return PERSON_RECENT;
}
export function defaultGroupRecent() {
  return GROUP_RECENT;
}

export function CallContinuityDestination({
  kind,
  name,
  meta,
  avatarSrc,
  avatarTone,
  hasStory = false,
  signalEyebrow,
  signalLabel,
  signalGraphId,
  recent,
  onBack,
  onCall,
  onVideo,
  onChat,
  onOpenGraph,
  onOpenStory,
}: Props) {
  const isGroup = kind === "group";
  return (
    <div
      className="call-continuity-dest"
      data-testid="call-continuity-destination"
      data-figma={isGroup ? "928:221" : "928:158"}
      data-figma-authority={isGroup ? "928:221" : "928:158"}
      data-kind={kind}
      data-has-story={hasStory ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} call continuity`}
    >
      <header className="call-cont-top">
        <button
          type="button"
          className="call-cont-back"
          data-testid="call-cont-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
        <div className="call-cont-identity">
          <button
            type="button"
            className={`call-cont-avatar ${hasStory ? "has-story-ring" : ""}`}
            data-testid="call-cont-avatar"
            data-story-ring={hasStory ? "true" : "false"}
            aria-label={hasStory ? `Open ${name} Story` : `${name} avatar`}
            onClick={() => {
              if (hasStory) onOpenStory?.();
            }}
            style={avatarTone ? { background: avatarTone } : undefined}
          >
            {avatarSrc ? <img src={avatarSrc} alt="" /> : name.slice(0, 1)}
          </button>
          <div>
            <h1 className="call-cont-name">{name}</h1>
            <p className="call-cont-meta">{meta}</p>
          </div>
        </div>
      </header>

      <div className="call-cont-actions" data-testid="call-cont-actions">
        <button
          type="button"
          className="call-cont-action"
          data-testid="call-cont-call"
          onClick={onCall}
        >
          Call
        </button>
        <button
          type="button"
          className="call-cont-action"
          data-testid="call-cont-video"
          onClick={onVideo}
        >
          Video
        </button>
        <button
          type="button"
          className="call-cont-action"
          data-testid="call-cont-chat"
          onClick={onChat}
        >
          Chat
        </button>
      </div>

      {signalLabel ? (
        <section
          className="call-cont-signal"
          data-testid="call-cont-signal"
          data-signal-kind={isGroup ? "shared" : "current"}
        >
          <p className="call-cont-signal-eyebrow">
            {signalEyebrow || (isGroup ? "SHARED SIGNAL" : "CURRENT SIGNAL")}
          </p>
          <p className="call-cont-signal-label">{signalLabel}</p>
          {signalGraphId ? (
            <button
              type="button"
              className="call-cont-signal-action"
              data-testid="call-cont-open-graph"
              onClick={() => onOpenGraph?.(signalGraphId)}
            >
              Open Graph →
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="call-cont-recent" data-testid="call-cont-recent">
        <h2 className="call-cont-recent-title">
          {isGroup ? "Recent group calls" : "Recent calls"}
        </h2>
        <ul className="call-cont-recent-list">
          {recent.map((ev) => (
            <li
              key={ev.id}
              className="call-cont-recent-row"
              data-affordance="info"
              data-testid={`call-cont-recent-${ev.id}`}
            >
              <div>
                <strong>{ev.typeLabel}</strong>
                <span>{ev.whenLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="call-cont-law" data-testid="call-cont-law">
        {isGroup
          ? "Leaving a call never leaves the group, Graph or Journey."
          : "Calls stay calls. Chat is one tap away, not mixed into the log."}
      </p>
    </div>
  );
}
