/**
 * Conversation chrome - one clean header row (Paste W4 Phase 3).
 * [‹] [avatar] [Name / relationship] ... [History] [phone] [video]
 * No doubled chevrons, no absolute avatar hit over the back control.
 */
import React, { useEffect, useState } from "react";
import { MutedBell } from "./MutedBell";

type Props = {
  peerName: string;
  peerAvatarSrc?: string;
  peerInitial?: string;
  connectionLabel?: string;
  isGroup?: boolean;
  sharedGraphLine?: string | null;
  /** Subline under Shared Graph (e.g. Waiting on Sam · 3 of 4). */
  sharedGraphWaiting?: string | null;
  /** Tap Shared Graph plate → graph detail. */
  onOpenSharedGraph?: () => void;
  onPlan?: () => void;
  onBack?: () => void;
  /** Group title → Group Info 618:521 (Chats-active). */
  onOpenGroupInfo?: () => void;
  showCallVideo?: boolean;
  callVideoCapable?: boolean;
  onCallVideoGate?: (kind: "call" | "video") => void;
  onCall?: () => void;
  onVideo?: () => void;
  /** Notification mute only. Does not change unread, delivery, or the plan. */
  notificationsMuted?: boolean;
  onSetNotificationsMuted?: (muted: boolean) => void;
  notificationNotice?: string | null;
  /** Past Shared Reality / relationship timeline for me + this person. */
  onOpenEarlierTogether?: () => void;
  earlierTogetherLabel?: string | null;
  /** Contact is currently LIVE - Watch live lives in-thread (not header). */
  isLive?: boolean;
  onWatchLive?: () => void;
  /** Paste W 2.2 - direct avatar opens compact ContactProfile. */
  onOpenContactProfile?: () => void;
};

/** Clock-rewind glyph: relationship History (repurposed former calendar slot). */
function HistoryIcon() {
  return (
    <svg
      className="gpt-history-icon"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 12a9 9 0 1 0 3-6.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M3 4v5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GraphPeopleThreadHeader({
  peerName,
  peerAvatarSrc,
  peerInitial,
  connectionLabel = "",
  isGroup = false,
  sharedGraphLine,
  sharedGraphWaiting = null,
  onOpenSharedGraph,
  onPlan: _onPlan,
  onBack,
  onOpenGroupInfo,
  showCallVideo = true,
  callVideoCapable = false,
  onCallVideoGate,
  onCall,
  onVideo,
  notificationsMuted = false,
  onSetNotificationsMuted,
  notificationNotice,
  onOpenEarlierTogether,
  earlierTogetherLabel: _earlierTogetherLabel,
  isLive: _isLive = false,
  onWatchLive: _onWatchLive,
  onOpenContactProfile,
}: Props) {
  const initial = peerInitial || peerName.slice(0, 1).toUpperCase();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const actionLabel = notificationsMuted ? "Unmute notifications" : "Mute notifications";

  useEffect(() => {
    if (!optionsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOptionsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [optionsOpen]);

  const nameRow = (
    <span className="gpt-name-row">
      <h1 className="gpt-name" data-testid="gpt-name">
        {peerName}
      </h1>
      {notificationsMuted ? (
        <span className="gpt-muted-bell" data-testid="muted-state" aria-label="Notifications muted">
          <MutedBell />
        </span>
      ) : null}
    </span>
  );

  const avatar = peerAvatarSrc ? (
    <img className="gpt-avatar" src={peerAvatarSrc} alt="" width={44} height={44} />
  ) : (
    <span className="gpt-avatar gpt-avatar-fallback">{initial}</span>
  );

  return (
    <>
      <header
        className={`gpt-header gpt-header-618 ${isGroup ? "gpt-header-group" : "gpt-header-direct"}`}
        data-testid="graph-people-header"
        data-figma-people={isGroup ? "618:451" : "618:348"}
        data-legacy-figma-people="201:7"
        data-notification-state={notificationsMuted ? "muted" : "unmuted"}
        data-header-layout="clean-row"
      >
        <div className="gpt-header-row" data-testid="gpt-header-row">
          {onBack ? (
            <button
              type="button"
              className="opal-nav-chevron gpt-back"
              onClick={onBack}
              aria-label="Back"
              data-testid="gpt-back"
            >
              ‹
            </button>
          ) : null}

          {!isGroup ? (
            onOpenContactProfile ? (
              <button
                type="button"
                className="gpt-avatar-hit"
                data-testid="gpt-avatar"
                aria-label={`${peerName} contact`}
                onClick={onOpenContactProfile}
              >
                {avatar}
              </button>
            ) : (
              <span className="gpt-avatar-hit gpt-avatar-hit-static" data-testid="gpt-avatar">
                {avatar}
              </span>
            )
          ) : null}

          {isGroup && onOpenGroupInfo ? (
            <button
              type="button"
              className="gpt-identity-copy gpt-identity-open-info"
              data-testid="gpt-open-group-info"
              aria-label={`${peerName} group info`}
              onClick={onOpenGroupInfo}
            >
              {nameRow}
              {connectionLabel ? (
                <p className="gpt-conn" data-testid="gpt-conn">
                  {connectionLabel}
                </p>
              ) : null}
            </button>
          ) : (
            <div className="gpt-identity-copy">
              {nameRow}
              {connectionLabel ? (
                <p className="gpt-conn" data-testid="gpt-conn">
                  {connectionLabel}
                </p>
              ) : null}
            </div>
          )}

          <div className="gpt-actions">
            {!isGroup && onOpenEarlierTogether ? (
              <button
                type="button"
                className="gpt-action-pill gpt-history"
                data-testid="gpt-history"
                title="History"
                aria-label="History"
                onClick={onOpenEarlierTogether}
              >
                <HistoryIcon />
              </button>
            ) : null}
            {showCallVideo ? (
              <>
                <button
                  type="button"
                  className="gpt-action-pill"
                  aria-label={`Call ${peerName}`}
                  data-testid="gpt-call"
                  data-mode={callVideoCapable ? "active" : "dependency"}
                  onClick={() => {
                    if (callVideoCapable) onCall?.();
                    else onCallVideoGate?.("call");
                  }}
                >
                  <img
                    className="gpt-call-icon"
                    src="/figma-v2/person/icon-call.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                </button>
                <button
                  type="button"
                  className="gpt-action-pill"
                  aria-label={`Video call ${peerName}`}
                  data-testid="gpt-video"
                  data-mode={callVideoCapable ? "active" : "dependency"}
                  onClick={() => {
                    if (callVideoCapable) onVideo?.();
                    else onCallVideoGate?.("video");
                  }}
                >
                  <img
                    className="gpt-call-icon"
                    src="/figma-v2/person/icon-video.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                </button>
              </>
            ) : null}
            {onSetNotificationsMuted ? (
              <button
                type="button"
                className="gpt-more"
                data-testid="conversation-options"
                aria-label="Conversation options"
                aria-expanded={optionsOpen}
                onClick={() => setOptionsOpen((open) => !open)}
              >
                <span aria-hidden>···</span>
              </button>
            ) : null}
          </div>
        </div>

        {optionsOpen ? (
          <div className="gpt-notify-menu" role="menu" data-testid="conversation-options-menu">
            <button
              type="button"
              role="menuitem"
              data-testid="conversation-notification-action"
              onClick={() => {
                setOptionsOpen(false);
                onSetNotificationsMuted?.(!notificationsMuted);
              }}
            >
              {actionLabel}
            </button>
            <p>
              {notificationsMuted ? "Notifications are muted" : "Until you turn it back on"}
            </p>
          </div>
        ) : null}
        {notificationNotice ? (
          <p className="gpt-notify-confirm" role="status" data-testid="notification-confirm">
            {notificationNotice}
          </p>
        ) : null}

        {isGroup && sharedGraphLine ? (
          onOpenSharedGraph ? (
            <button
              type="button"
              className="gpt-shared-graph-plate gpt-shared-graph-tappable"
              data-testid="gpt-shared-graph"
              data-locked={/locked/i.test(sharedGraphLine) ? "true" : undefined}
              aria-label={`Open shared graph: ${sharedGraphLine}`}
              onClick={onOpenSharedGraph}
            >
              <p className="gpt-shared-graph-label">Shared Graph</p>
              <p className="gpt-shared-graph-value">{sharedGraphLine}</p>
              {sharedGraphWaiting ? (
                <p className="gpt-shared-graph-waiting" data-testid="gpt-shared-graph-waiting">
                  {sharedGraphWaiting}
                </p>
              ) : null}
            </button>
          ) : (
            <div
              className="gpt-shared-graph-plate"
              data-testid="gpt-shared-graph"
              data-locked={/locked/i.test(sharedGraphLine) ? "true" : undefined}
            >
              <p className="gpt-shared-graph-label">Shared Graph</p>
              <p className="gpt-shared-graph-value">{sharedGraphLine}</p>
              {sharedGraphWaiting ? (
                <p className="gpt-shared-graph-waiting" data-testid="gpt-shared-graph-waiting">
                  {sharedGraphWaiting}
                </p>
              ) : null}
            </div>
          )
        ) : null}
      </header>
    </>
  );
}
