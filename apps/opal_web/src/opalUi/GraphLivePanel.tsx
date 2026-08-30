/**
 * CURRENT Full Live destination - Figma 863:2.
 * Historical lineage: 201:8 / 258:117 (not current authority).
 * Visual fixture OK for founder seed. LIVE capability remains gated.
 * host != broadcaster. Grounded ETA only. Location only after permission.
 * When Live ends: at most PRIVATE Memory draft candidate - never auto-publish.
 */
import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";

export type LiveParticipant = {
  name: string;
  status: string;
  meta?: string;
  avatarSrc?: string;
};

type Props = {
  place: string;
  area?: string;
  ledBy?: string;
  ledByAvatarSrc?: string;
  participants?: LiveParticipant[];
  tableReady?: boolean;
  tableReadyLabel?: string;
  etaLine?: string;
  onOnMyWay?: () => void;
  onMyWayActive?: boolean;
  seedLabel?: string;
};

export function GraphLivePanel({
  place,
  area,
  ledBy,
  ledByAvatarSrc,
  participants = [],
  tableReady,
  tableReadyLabel = "Table ready · Great news",
  etaLine,
  onOnMyWay,
  onMyWayActive,
  seedLabel,
}: Props) {
  const reduce = !!useReducedMotion();
  return (
    <div
      className="glive scroll"
      data-testid="graph-live-panel"
      data-figma-live="863:2"
      data-figma-node="863:2"
      data-live-capability="gated"
      data-host-ne-broadcaster="true"
    >
      <header className="glive-brand">
        <OpalMark size="sm" title="" />
        <OpalWordmark height={18} title="" compact />
      </header>
      <h1 className="glive-title">Live</h1>
      <p className="glive-lede">Same Reality · grounded arrival only</p>
      {seedLabel ? (
        <p className="glive-seed" data-testid="glive-seed-label">
          {seedLabel}
        </p>
      ) : null}

      <article className="glive-panel">
        <div className="glive-badges">
          <motion.span
            className="glive-pill"
            initial={reduce ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3 }}
          >
            LIVE
          </motion.span>
          <span className="glive-now">HAPPENING NOW</span>
        </div>
        <div className="glive-hero">
          <div>
            <h2 className="glive-place">{place}</h2>
            {area ? <p className="glive-area">{area}</p> : null}
          </div>
          {ledBy ? (
            <div className="glive-lead">
              {ledByAvatarSrc ? (
                <img src={ledByAvatarSrc} alt="" width={78} height={78} />
              ) : (
                <span className="glive-lead-fallback">{ledBy.slice(0, 1)}</span>
              )}
              <span>Led by {ledBy}</span>
            </div>
          ) : null}
        </div>

        <ul className="glive-feed">
          {participants.map((p, i) => (
            <motion.li
              key={`${p.name}-${i}`}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reduce ? { duration: 0 } : { delay: 0.12 * i, duration: 0.3 }}
            >
              <span className="glive-p-av" aria-hidden>
                {p.name.slice(0, 1)}
              </span>
              <div>
                <strong>{p.status}</strong>
                {p.meta ? <p>{p.meta}</p> : null}
              </div>
            </motion.li>
          ))}
        </ul>

        {tableReady ? (
          <div className="glive-truth is-confirmed" role="status">
            {tableReadyLabel}
          </div>
        ) : null}
        {etaLine ? <div className="glive-truth">{etaLine}</div> : null}

        {onOnMyWay ? (
          <button
            type="button"
            className={`btn primary glive-onway ${onMyWayActive ? "is-active" : ""}`}
            data-testid="glive-on-my-way"
            aria-pressed={!!onMyWayActive}
            onClick={onOnMyWay}
          >
            {onMyWayActive ? "You're on your way" : "I'm on my way"}
          </button>
        ) : null}
      </article>
      <p className="glive-foot">The best part is off screen.</p>
    </div>
  );
}
