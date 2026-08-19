/**
 * SOCIAL-04 — Discovery detail
 * Figma 437:200
 * Follow → FollowGraph only. Follow ≠ Connection.
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import type { FounderFeedCard } from "./founderGraphSeed";

type Props = {
  card: FounderFeedCard;
  following?: boolean;
  onBack: () => void;
  onFollow?: () => void;
};

export function DiscoveryDetailSheet({ card, following, onBack, onFollow }: Props) {
  return (
    <div
      className="discovery-detail-sheet"
      data-testid="discovery-detail-sheet"
      data-figma-social="437:200"
      data-follow-not-connection="true"
      role="dialog"
      aria-modal="true"
      aria-label="Discovery"
    >
      <header className="graph-create-head">
        <button type="button" className="btn ghost" data-testid="discovery-detail-back" onClick={onBack}>
          Back
        </button>
        <div className="gsh-brand">
          <OpalMark size="sm" title="" />
          <OpalWordmark height={18} title="" compact />
        </div>
      </header>
      <p className="gsh-near-kicker">Discovery</p>
      <h1 className="chats-home-title">{card.title}</h1>
      <p className="gsh-meta">{card.detail}</p>
      <p className="gsh-meta">{card.person}</p>
      <p className="gsh-meta">Nearby discovery respects location permission — exact location never leaks.</p>
      {onFollow ? (
        <button
          type="button"
          className="btn primary"
          data-testid="discovery-follow"
          data-mode="active"
          disabled={!!following}
          onClick={onFollow}
        >
          {following ? "Following" : "Follow"}
        </button>
      ) : null}
      <p className="gsh-meta">Follow ≠ Connection</p>
    </div>
  );
}
