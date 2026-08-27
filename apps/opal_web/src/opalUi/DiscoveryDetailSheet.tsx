/**
 * SOCIAL-04 - DISCOVERY DETAIL
 * Figma 437:200
 *
 * Title = experience name.
 * Media + distance + why + Save idea / Graph this.
 * Follow ≠ Connection (FollowGraph only).
 * Brand header only - dismiss via Cancel/Close or Home root.
 */
import React from "react";
import { OpalMark, OpalWordmark } from "../brand/OpalLogo";
import type { FounderFeedCard } from "./founderGraphSeed";

type Props = {
  card: FounderFeedCard;
  following?: boolean;
  onBack: () => void;
  onFollow?: () => void;
  onSaveIdea?: () => void;
  onGraphThis?: () => void;
};

export function DiscoveryDetailSheet({
  card,
  following,
  onBack,
  onFollow,
  onSaveIdea,
  onGraphThis,
}: Props) {
  return (
    <div
      className="discovery-detail-sheet social-dest-437-200"
      data-testid="discovery-detail-sheet"
      data-screen="social-discovery-detail"
      data-figma-node="437:200"
      data-figma-social="437:200"
      data-follow-not-connection="true"
      data-content-id={card.id}
      role="dialog"
      aria-modal="true"
      aria-label="Discovery"
    >
      <header className="social-dest-brand dx437-head" data-figma-chrome="437:200-brand">
        <button
          type="button"
          className="opal-nav-chevron"
          data-testid="discovery-detail-back"
          aria-label="Back"
          onClick={onBack}
        >
          ‹
        </button>
        <div className="gsh-brand">
          <OpalMark size="md" title="" />
          <OpalWordmark height={20} title="" compact />
        </div>
      </header>

      <h1 className="dx437-title" data-testid="discovery-title">
        {card.title}
      </h1>
      <p className="dx437-lede">Nearby experience</p>

      {card.mediaSrc ? (
        <div className="dx437-media" data-testid="discovery-media">
          <img src={card.mediaSrc} alt="" />
        </div>
      ) : (
        <div className="dx437-media dx437-media-empty" data-testid="discovery-media" />
      )}

      <p className="dx437-distance" data-testid="discovery-distance">
        {card.detail || card.placeLine || "Nearby"}
      </p>
      <p className="dx437-detail">
        {card.meta || card.placeLine || `${card.person} · nearby`}
      </p>
      <p className="dx437-why">
        Suggested because it fits your evening, location and recent interest - not because you
        follow {card.person}.
      </p>

      <div className="dx437-ctas">
        <button
          type="button"
          className="dx437-save"
          data-testid="discovery-save-idea"
          data-mode="active"
          onClick={onSaveIdea}
        >
          Save this idea
        </button>
        <button
          type="button"
          className="dx437-graph"
          data-testid="discovery-graph-this"
          data-mode="active"
          onClick={onGraphThis}
        >
          Graph this
        </button>
      </div>

      {onFollow ? (
        <button
          type="button"
          className="dx437-follow-visible"
          data-testid="discovery-follow"
          data-mode="active"
          disabled={!!following}
          onClick={onFollow}
        >
          {following ? `Following ${card.person}` : `Follow ${card.person}`}
        </button>
      ) : null}

      <p className="dx437-law">
        Graph this creates a draft/seed only. No booking, invitation or attendance is implied until
        explicitly resolved.
      </p>
    </div>
  );
}
