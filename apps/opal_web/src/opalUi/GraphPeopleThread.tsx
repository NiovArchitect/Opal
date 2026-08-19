/**
 * FINAL PEOPLE  -  Figma 201:7 relationship-first conversation chrome.
 * Messages / realtime stay owned by OpalApp; this is presentation.
 */
import React from "react";
import { OpalMark } from "../brand/OpalLogo";

type Props = {
  peerName: string;
  peerAvatarSrc?: string;
  peerInitial?: string;
  connectionLabel?: string;
  onPlan?: () => void;
  onBack?: () => void;
  /** Call/Video only when real capability exists */
  showCallVideo?: boolean;
};

export function GraphPeopleThreadHeader({
  peerName,
  peerAvatarSrc,
  peerInitial,
  connectionLabel = "Direct connection",
  onPlan,
  onBack,
  showCallVideo = false,
}: Props) {
  const initial = peerInitial || peerName.slice(0, 1).toUpperCase();
  return (
    <header
      className="gpt-header"
      data-testid="graph-people-header"
      data-figma-people="201:7"
    >
      {onBack ? (
        <button type="button" className="btn ghost gpt-back" onClick={onBack} aria-label="Back">
          Back
        </button>
      ) : (
        <OpalMark size="sm" title="" />
      )}
      <div className="gpt-identity">
        {peerAvatarSrc ? (
          <img className="gpt-avatar" src={peerAvatarSrc} alt="" width={52} height={52} />
        ) : (
          <span className="gpt-avatar gpt-avatar-fallback">{initial}</span>
        )}
        <div>
          <h1 className="gpt-name">{peerName}</h1>
          <p className="gpt-conn">{connectionLabel}</p>
        </div>
      </div>
      <div className="gpt-actions">
        {showCallVideo ? (
          <>
            <button type="button" className="gpt-icon-btn" aria-label="Call">
              Call
            </button>
            <button type="button" className="gpt-icon-btn" aria-label="Video">
              Video
            </button>
          </>
        ) : null}
        {onPlan ? (
          <button
            type="button"
            className="btn primary gpt-plan"
            data-testid="gpt-plan"
            data-who-skip="true"
            onClick={onPlan}
          >
            Plan
          </button>
        ) : null}
      </div>
    </header>
  );
}
