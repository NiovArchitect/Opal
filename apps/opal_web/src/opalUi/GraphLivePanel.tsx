/**
 * CURRENT Full Live destination - Figma 863:2
 * SAME REALITY as Home Rare Live 618:211.
 * Media lineage: 618:217 / 863:10 imageHash 1fd39e009e4f6e8f17bcbb4f4bc07e69fccd9190
 * Historical lineage only: 201:8 / 258:117
 *
 * host != broadcaster. LIVE capability gated (no fake stream).
 * Ending Live: at most PRIVATE Memory draft candidate - never auto-publish.
 *
 * Formal geometry: absolute footprint from approved Figma 863:2 (Brand V4).
 */
import React from "react";
import { BRAND_ASSETS } from "../brand/brand";

/** Deterministic Home Live / Full Live media (same hash as Figma 618:217 / 863:10). */
export const FULL_LIVE_MEDIA_SRC = "/figma-v2/home-201/media-live-city-1728.png";
export const FULL_LIVE_MEDIA_FIGMA_HASH = "1fd39e009e4f6e8f17bcbb4f4bc07e69fccd9190";
export const FULL_LIVE_HOME_NODE = "618:211";
export const FULL_LIVE_MEDIA_NODE = "863:10";

export type LiveParticipant = {
  name: string;
  status: string;
  meta?: string;
  avatarSrc?: string;
};

type Props = {
  /** Experience title - current: Rooftop jazz */
  place: string;
  /** Location line - current: Downtown */
  area?: string;
  /** Host authority (not broadcaster) - current: Jordan */
  host: string;
  /** Broadcast attribution - current: Sabrina */
  broadcaster: string;
  /** Same Reality media as Home 618:217 */
  mediaSrc?: string;
  videoLive?: boolean;
  hereLine?: string;
  etaLine?: string;
  tableReadyLabel?: string;
  onOnMyWay?: () => void;
  onMyWayActive?: boolean;
  /** Optional Dock is owned by parent member chrome when Graphs-active */
  showInlineDock?: boolean;
};

export function GraphLivePanel({
  place,
  area = "Downtown",
  host,
  broadcaster,
  mediaSrc = FULL_LIVE_MEDIA_SRC,
  videoLive = true,
  hereLine = "Sadeil + 3 are here",
  etaLine = "Maya is on the way · 8 min",
  tableReadyLabel = "Table ready · Great news",
  onOnMyWay,
  onMyWayActive,
}: Props) {
  return (
    <div
      className="full-live-863"
      data-testid="graph-live-panel"
      data-figma-live="863:2"
      data-figma-node="863:2"
      data-same-reality-home-live={FULL_LIVE_HOME_NODE}
      data-live-media-node={FULL_LIVE_MEDIA_NODE}
      data-live-media-hash={FULL_LIVE_MEDIA_FIGMA_HASH}
      data-live-capability="gated"
      data-host-ne-broadcaster="true"
      data-broadcaster={broadcaster}
      data-host={host}
    >
      {/* 863:57 / 863:58 Brand V4 emblem 39.2 + wordmark (legacy auth geometry) */}
      <header className="full-live-brand" data-testid="full-live-brand" data-figma-nodes="863:57,863:58">
        <img
          className="full-live-brand-emblem"
          src={BRAND_ASSETS.opalGraphEmblemHero}
          alt=""
          width={39}
          height={39}
          draggable={false}
          data-figma-node="863:57"
        />
        <span className="full-live-brand-wordmark" data-figma-node="863:58" aria-label="Opal Graph">
          <span className="full-live-wm-opal">Opal</span>
          <span className="full-live-wm-graph"> Graph</span>
        </span>
      </header>

      <p className="full-live-pill" data-testid="full-live-pill" data-figma-node="863:7">
        LIVE
      </p>
      <h1 className="full-live-title" data-testid="full-live-title" data-figma-node="863:8">
        {place}
      </h1>
      {area ? (
        <p className="full-live-area" data-testid="full-live-area" data-figma-node="863:9">
          {area}
        </p>
      ) : null}

      <div className="full-live-media" data-testid="full-live-media" data-figma-node="863:10">
        <img
          src={mediaSrc}
          alt=""
          draggable={false}
          data-figma-media={FULL_LIVE_MEDIA_NODE}
          data-media-hash={FULL_LIVE_MEDIA_FIGMA_HASH}
        />
        {videoLive ? (
          <span className="full-live-video-badge" data-testid="full-live-video-badge" data-figma-node="863:11">
            VIDEO LIVE
          </span>
        ) : null}
      </div>

      <p className="full-live-attribution" data-testid="glive-seed-label" data-figma-node="863:13">
        Live by {broadcaster} · hosted by {host}
      </p>

      <section
        className="full-live-state"
        aria-label="Live state"
        data-testid="full-live-state"
        data-figma-node="863:14"
      >
        <p className="full-live-here" data-figma-node="863:15">
          {hereLine}
        </p>
        {etaLine ? (
          <p className="full-live-eta" data-figma-node="863:16">
            {etaLine}
          </p>
        ) : null}
        {tableReadyLabel ? (
          <p className="full-live-ready" role="status" data-figma-node="863:17">
            {tableReadyLabel}
          </p>
        ) : null}
      </section>

      {onOnMyWay ? (
        <button
          type="button"
          className={`full-live-onway${onMyWayActive ? " is-active" : ""}`}
          data-testid="glive-on-my-way"
          data-figma-node="863:18"
          aria-pressed={!!onMyWayActive}
          onClick={onOnMyWay}
        >
          {onMyWayActive ? "You're on your way" : "I'm on my way"}
        </button>
      ) : null}

      <p className="full-live-disclosure" data-testid="full-live-disclosure" data-figma-node="863:20">
        Uses your location for ETA and arrival only after you allow it.
      </p>
    </div>
  );
}
