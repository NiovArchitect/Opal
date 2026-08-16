/**
 * Pass 30R2 — private creator impact (Figma 124:33).
 * Private only. No public Inspired N. No analytics/leaderboard/philosophy.
 */
import React from "react";

export function PrivateCreatorImpact({
  sentence = "Your weekend in Little Italy inspired 12 experiences.",
  mediaUrl = "/demo/moments/food.jpg",
}: {
  sentence?: string;
  mediaUrl?: string | null;
}) {
  return (
    <section
      className="private-creator-impact"
      data-testid="private-creator-impact"
      data-node-ref="124:33"
      data-public="false"
      aria-label="For you"
    >
      {mediaUrl ? (
        <div className="private-creator-impact-wash" aria-hidden>
          <img src={mediaUrl} alt="" />
        </div>
      ) : null}
      <p className="private-creator-impact-kicker">For you</p>
      <p className="private-creator-impact-sentence">{sentence}</p>
    </section>
  );
}
