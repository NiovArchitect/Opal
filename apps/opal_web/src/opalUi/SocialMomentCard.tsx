/**
 * V2 SOCIAL MOMENT — media primary (Figma 4:23 grammar).
 * Pass 28: Make this mine / Do this too / Join this — not commerce.
 *
 * Hierarchy: MEDIA → HUMAN → EXPERIENCE → CONTEXT → POSSIBILITY → ACTION
 */
import React, { useState } from "react";

export type MomentRelationship = "friend" | "following" | "open_event";

export type SocialMomentProps = {
  creator: string;
  caption: string;
  place?: string | null;
  /** Stable provider place id when known — not shown as commerce */
  providerPlaceId?: string | null;
  mediaUrl?: string | null;
  /** friend | following (creator I follow) | open_event */
  relationship?: MomentRelationship;
  /** Optional soft social proof — never identities of bookers */
  inspiredCount?: number | null;
  /** Start with interest already shown (e.g. after prior tap in session) */
  initiallyInterested?: boolean;
  /** Called when user wants to start a possibility with their people */
  onDoWithPeople?: (meta?: { place?: string | null; providerPlaceId?: string | null }) => void;
  /** Pass 28: Make this mine → solo/people chooser */
  onMakeMine?: (meta?: { place?: string | null; providerPlaceId?: string | null }) => void;
  /** Explicit open event join — not replication */
  onJoin?: (meta?: { place?: string | null; providerPlaceId?: string | null }) => void;
};

function primaryCta(relationship: MomentRelationship): {
  label: string;
  testId: string;
  kind: "make_mine" | "with_people" | "join";
} {
  if (relationship === "open_event") {
    return { label: "Join this", testId: "social-moment-join", kind: "join" };
  }
  if (relationship === "following") {
    return { label: "Make this mine", testId: "social-moment-make-mine", kind: "make_mine" };
  }
  // friend Moment: do this too / with people — not "join them"
  return {
    label: "Do this with your people",
    testId: "social-moment-do-with-people",
    kind: "with_people",
  };
}

export function SocialMomentCard({
  creator,
  caption,
  place,
  providerPlaceId,
  mediaUrl,
  relationship = "following",
  inspiredCount = null,
  initiallyInterested = false,
  onDoWithPeople,
  onMakeMine,
  onJoin,
}: SocialMomentProps) {
  const [interested, setInterested] = useState(initiallyInterested);
  const cta = primaryCta(relationship);

  const fire = () => {
    const meta = { place, providerPlaceId };
    if (cta.kind === "join") onJoin?.(meta);
    else if (cta.kind === "make_mine") onMakeMine?.(meta);
    else onDoWithPeople?.(meta);
  };

  return (
    <article
      className="social-moment-card"
      data-testid="social-moment-card"
      data-node-ref="4:23"
      data-relationship={relationship}
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
        <div className="social-moment-meta-row">
          <p className="social-moment-creator">{creator}</p>
          {relationship === "following" ? (
            <span className="social-moment-rel" data-testid="social-moment-rel-following">
              Following
            </span>
          ) : null}
          {relationship === "open_event" ? (
            <span className="social-moment-rel is-event" data-testid="social-moment-rel-event">
              Open
            </span>
          ) : null}
        </div>
        <p className="social-moment-caption">{caption}</p>
        {place ? <p className="social-moment-place">{place}</p> : null}
        {typeof inspiredCount === "number" && inspiredCount > 0 ? (
          <p className="social-moment-inspired" data-testid="social-moment-inspired">
            Inspired {inspiredCount} experiences
          </p>
        ) : null}
        {interested ? (
          <button
            type="button"
            className="btn social-moment-cta"
            data-testid={cta.testId}
            data-cta-kind={cta.kind}
            onClick={fire}
          >
            {cta.label}
          </button>
        ) : (
          <p className="social-moment-hint">Tap the photo if this speaks to you</p>
        )}
      </div>
    </article>
  );
}
