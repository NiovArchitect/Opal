/**
 * Conversation chrome — dated Direct 618:348 / Group 618:451.
 * Exact geometry: avatar 20,78 52×52 · Call 250/292 · Video · Plan 334 (Direct).
 * Group Call≈292 · Video≈334 · Shared Graph plate 20,142 350×66.
 */
import React from "react";

type Props = {
  peerName: string;
  peerAvatarSrc?: string;
  peerInitial?: string;
  connectionLabel?: string;
  isGroup?: boolean;
  sharedGraphLine?: string | null;
  onPlan?: () => void;
  onBack?: () => void;
  showCallVideo?: boolean;
  callVideoCapable?: boolean;
  onCallVideoGate?: (kind: "call" | "video") => void;
  onCall?: () => void;
  onVideo?: () => void;
};

export function GraphPeopleThreadHeader({
  peerName,
  peerAvatarSrc,
  peerInitial,
  connectionLabel = "Direct connection",
  isGroup = false,
  sharedGraphLine,
  onPlan,
  onBack,
  showCallVideo = true,
  callVideoCapable = false,
  onCallVideoGate,
  onCall,
  onVideo,
}: Props) {
  const initial = peerInitial || peerName.slice(0, 1).toUpperCase();
  return (
    <>
      <header
        className={`gpt-header gpt-header-618 ${isGroup ? "gpt-header-group" : "gpt-header-direct"}`}
        data-testid="graph-people-header"
        data-figma-people={isGroup ? "618:451" : "618:348"}
        data-legacy-figma-people="201:7"
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
        <div className="gpt-identity-copy">
          <h1 className="gpt-name" data-testid="gpt-name">
            {peerName}
          </h1>
          <p className="gpt-conn" data-testid="gpt-conn">
            {connectionLabel}
          </p>
        </div>
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
