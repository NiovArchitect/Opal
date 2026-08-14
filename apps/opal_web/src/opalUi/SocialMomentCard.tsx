/**
 * V2 SOCIAL MOMENT — media primary (Figma 4:23 grammar).
 * Content first → interest → "Do this with your people" → own Shared Reality.
 * Not Instagram. Not BOOK THIS commerce. Not earn/affiliate UI.
 *
 * Place may carry stable provider IDs internally (Pass 15) while bookability
 * remains unknown and execution remains none.
 */
import React, { useState } from "react";

export type SocialMomentProps = {
  creator: string;
  caption: string;
  place?: string | null;
  /** Stable provider place id when known — not shown as commerce */
  providerPlaceId?: string | null;
  mediaUrl?: string | null;
  /** Start with interest already shown (e.g. after prior tap in session) */
  initiallyInterested?: boolean;
  /** Called when user wants to start a possibility with their people */
  onDoWithPeople?: (meta?: { place?: string | null; providerPlaceId?: string | null }) => void;
};

export function SocialMomentCard({
  creator,
  caption,
  place,
  providerPlaceId,
  mediaUrl,
  initiallyInterested = false,
  onDoWithPeople,
}: SocialMomentProps) {
  const [interested, setInterested] = useState(initiallyInterested);

  return (
    <article
      className="social-moment-card"
      data-testid="social-moment-card"
      data-node-ref="4:23"
      data-provider-place-id={providerPlaceId || undefined}
      data-bookability="unknown"
      data-execution="none"
      data-commerce="false"
    >
      <button
        type="button"
        className="social-moment-media"
        aria-label={`Moment from ${creator}`}
        onClick={() => setInterested(true)}
      >
        {mediaUrl ? (
          <img src={mediaUrl} alt="" className="social-moment-img" />
        ) : (
          <div className="social-moment-media-fallback" aria-hidden data-testid="social-moment-media" />
        )}
      </button>
      <div className="social-moment-body">
        <p className="social-moment-creator">{creator}</p>
        <p className="social-moment-caption">{caption}</p>
        {place ? <p className="social-moment-place">{place}</p> : null}
        {interested ? (
          <button
            type="button"
            className="btn social-moment-cta"
            data-testid="social-moment-do-with-people"
            onClick={() => onDoWithPeople?.({ place, providerPlaceId })}
          >
            Do this with your people
          </button>
        ) : (
          <p className="social-moment-hint">Tap the photo if this speaks to you</p>
        )}
      </div>
    </article>
  );
}
