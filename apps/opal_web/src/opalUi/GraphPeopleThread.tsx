/**
 * Conversation chrome - dated Direct 618:348 / Group 618:451.
 * Exact geometry: avatar 20,78 52×52 · Call 250/292 · Video · Plan 334 (Direct).
 * Group Call≈292 · Video≈334 · Shared Graph plate 20,142 350×66.
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
};

export function GraphPeopleThreadHeader({
  peerName,
  peerAvatarSrc,
  peerInitial,
  connectionLabel = "",
  isGroup = false,
  sharedGraphLine,
  onPlan,
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

  return (
    <>
      <header
        className={`gpt-header gpt-header-618 ${isGroup ? "gpt-header-group" : "gpt-header-direct"}`}
        data-testid="graph-people-header"
        data-figma-people={isGroup ? "618:451" : "618:348"}
        data-legacy-figma-people="201:7"
        data-notification-state={notificationsMuted ? "muted" : "unmuted"}
      >
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
          peerAvatarSrc ? (
            <img
              className="gpt-avatar"
              data-testid="gpt-avatar"
              src={peerAvatarSrc}
              alt=""
              width={52}
              height={52}
            />
          ) : (
            <span className="gpt-avatar gpt-avatar-fallback" data-testid="gpt-avatar">
              {initial}
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
        <div className="gpt-actions">
          {showCallVideo ? (
            <>
              <button
                type="button"
                className="gpt-action-pill"
                aria-label="Call"
                data-testid="gpt-call"
                data-mode={callVideoCapable ? "active" : "dependency"}
                onClick={() => {
                  if (callVideoCapable) onCall?.();
                  else if (onCall) onCall();
                  else onCallVideoGate?.("call");
                }}
              >
                <span className="gpt-action-glyph" aria-hidden>
                  ☎
                </span>
              </button>
              <button
                type="button"
                className="gpt-action-pill"
                aria-label="Video"
                data-testid="gpt-video"
                data-mode={callVideoCapable ? "active" : "dependency"}
                onClick={() => {
                  if (callVideoCapable) onVideo?.();
                  else if (onVideo) onVideo();
                  else onCallVideoGate?.("video");
                }}
              >
                <span className="gpt-action-glyph" aria-hidden>
                  ▣
                </span>
              </button>
            </>
          ) : null}
          {onPlan && !isGroup ? (
            <button
              type="button"
              className="gpt-action-pill gpt-plan-pill"
              data-testid="gpt-plan"
              data-who-skip="true"
              aria-label="Plan"
              onClick={onPlan}
            >
              <span className="gpt-action-glyph" aria-hidden>
                ◇
              </span>
            </button>
          ) : null}
        </div>
      </header>
      {isGroup && sharedGraphLine ? (
        <div className="gpt-shared-graph-plate" data-testid="gpt-shared-graph">
          <p className="gpt-shared-graph-label">Shared Graph</p>
          <p className="gpt-shared-graph-value">{sharedGraphLine}</p>
        </div>
      ) : null}
    </>
  );
}
