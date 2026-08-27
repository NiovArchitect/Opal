/**
 * FINAL JOURNEY  -  Figma 201:9 ambient execution presentation.
 * Deeper behavior remains 145:241 / ReservationExecution / SocialReality.
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

type Props = {
  title: string;
  lede?: string;
  place: string;
  when: string;
  leave?: string;
  arrive?: string;
  /** Truthful reservation slot label - only when real reservation proof exists. */
  reserved?: string;
  /** Canonical reservation kicker - never fake "Reserved" without proof. */
  reservationLabel?: string;
  mediaSrc?: string;
  peerName?: string;
  peerAvatarSrc?: string;
  onImIn?: () => void;
  onChangeTime?: () => void;
  onAddPeople?: () => void;
  onManage?: () => void;
  onCantMakeIt?: () => void;
  commitmentActive?: boolean;
};

export function GraphJourneyCard({
  title,
  lede = "Everything you need. Nothing extra.",
  place,
  when,
  leave,
  arrive,
  reserved,
  reservationLabel,
  mediaSrc,
  peerName,
  peerAvatarSrc,
  onImIn,
  onChangeTime,
  onAddPeople,
  onManage,
  onCantMakeIt,
  commitmentActive,
}: Props) {
  const reserveKicker = reservationLabel || (reserved ? "Reserved" : null);
  const reserveValue = reserved || null;
  const reserveConfirmed = reserveKicker === "Reserved" || reserveKicker === "Confirmed";

  return (
    <article
      className="gjourney"
      data-testid="graph-journey-card"
      data-figma-journey="201:9"
      data-commitment={commitmentActive ? "committed" : "open"}
      data-reservation={reserveKicker || "none"}
    >
      <header className="gjourney-brand">
        <OpalMark size="sm" title="" />
        <OpalWordmark height={18} title="" compact />
      </header>
      <h1 className="gjourney-title">{title}</h1>
      <p className="gjourney-lede">{lede}</p>

      <div className="gjourney-panel">
        {mediaSrc ? (
          <div className="gjourney-media">
            <img src={mediaSrc} alt="" />
            {peerName ? (
              <span className="gjourney-peer-chip">
                {peerAvatarSrc ? (
                  <img src={peerAvatarSrc} alt="" width={22} height={22} />
                ) : null}
                {peerName}
              </span>
            ) : null}
          </div>
        ) : null}
        <h2 className="gjourney-place">{place}</h2>
        <p className="gjourney-when">{when}</p>

        <div className="gjourney-timeline" aria-label="Timing">
          {leave ? (
            <div className="gjourney-node">
              <span className="gjourney-dot" aria-hidden />
              <span className="gjourney-node-k">Leave</span>
              <strong>{leave}</strong>
            </div>
          ) : null}
          {arrive ? (
            <div className="gjourney-node">
              <span className="gjourney-dot" aria-hidden />
              <span className="gjourney-node-k">Arrive</span>
              <strong>{arrive}</strong>
            </div>
          ) : null}
          {reserveKicker && reserveValue ? (
            <div
              className={`gjourney-node ${reserveConfirmed ? "is-confirmed" : "is-pending"}`}
              data-testid="gjourney-reservation"
            >
              <span className="gjourney-dot" aria-hidden />
              <span className="gjourney-node-k">{reserveKicker}</span>
              <strong>{reserveValue}</strong>
            </div>
          ) : null}
        </div>

        <div className="gjourney-ctas">
          {commitmentActive ? (
            <span
              className="gjourney-committed"
              data-testid="gjourney-im-in"
              data-mode="state"
              role="status"
              aria-label="You're in - committed"
            >
              You're in
            </span>
          ) : onImIn ? (
            <button
              type="button"
              className="btn primary"
              data-testid="gjourney-im-in"
              data-mode="active"
              onClick={onImIn}
            >
              I'm in
            </button>
          ) : null}
          {onChangeTime ? (
            <button
              type="button"
              className="btn"
              data-testid="gjourney-change-time"
              onClick={onChangeTime}
            >
              Change time
            </button>
          ) : null}
        </div>
      </div>

      <p className="gjourney-quiet">
        Opal quietly handled the details so you can show up and enjoy.
      </p>

      <footer className="gjourney-foot">
        {onAddPeople ? (
          <button type="button" className="btn ghost" data-testid="gjourney-add-people" onClick={onAddPeople}>
            Add people
          </button>
        ) : null}
        {onManage ? (
          <button type="button" className="btn ghost" data-testid="gjourney-manage" onClick={onManage}>
            Manage
          </button>
        ) : null}
        {onCantMakeIt ? (
          <button type="button" className="btn ghost" data-testid="gjourney-cant" onClick={onCantMakeIt}>
            I can't make it
          </button>
        ) : null}
      </footer>
    </article>
  );
}
