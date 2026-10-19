/**
 * Repair #19 W13 - EVENT SHARE CARD, recreated in the new design.
 *
 * The card a user shares for a plan, rendered from the plan's real
 * record through the one adapter (shareCardFromDetail). Design notes
 * (Apple discipline, Opal identity): the journey is one glance -
 * state first (the indicator language every other card speaks),
 * then title, when, where, who. Nothing decorative: the FireLine
 * earns its place as the state signal, the orb mark earns its place
 * as the sender's signature. Hierarchy is typographic; the card is
 * quiet in both modes because it is built only from c2 tokens.
 *
 * The share sheet offers ONE real action: Copy details - the exact
 * text lines the card shows. The plan contract carries no share
 * code or URL, so the sheet never invents a link.
 *
 * IDENTITY (founder rider, 2026-10-18 23:52): this card is the object
 * that LEAVES the app and represents it in the world, so it carries
 * Opal's own physics, not a generic event-card layout: the orb sits
 * in orbit position at the card's head (the stone, with its rings,
 * is the sender's signature - present at a size you can feel, not a
 * favicon), the card surface is frosted glass over the state field,
 * and the FireLine runs as the orbit's edge under the state pill.
 * Mistakable for another product's card = fail.
 */
import React, { useState } from "react";
import { PlanStatePillC2 } from "../PlanCardC2";
import { FireLine } from "../../brand/orb/FireLine";
import { OrbMark } from "../../brand/orb/OrbMark";
import { TopLayer } from "../../opalUi/TopLayer";
import type { EventShareCardProjection } from "./projections";

export function EventShareCard({ card }: { card: EventShareCardProjection }) {
  const past = card.stateFamily === "past";
  return (
    <article
      className="c2-plan-card r19-share-card"
      data-plan-state={card.stateFamily}
      data-testid="r19-event-share-card"
    >
      <div className="c2-plan-card-top">
        <PlanStatePillC2 stateFamily={card.stateFamily} stateLabel={card.stateLabel} />
        <span className="r19-share-brand" aria-hidden>
          <OrbMark size={44} />
          <span className="r19-share-wordmark">Opal</span>
        </span>
      </div>
      {!past ? (
        <div style={{ marginTop: 10 }} aria-hidden>
          <FireLine />
        </div>
      ) : null}
      <h3 className="c2-plan-title">{card.title}</h3>
      <p className="c2-plan-when">{card.whenLine}</p>
      {card.whereLine ? <p className="c2-plan-where">{card.whereLine}</p> : null}
      {card.peopleLine ? (
        <p className="c2-plan-where" data-testid="r19-share-people">
          With {card.peopleLine}
        </p>
      ) : null}
      {card.attendanceLine ? <p className="c2-plan-where">{card.attendanceLine}</p> : null}
    </article>
  );
}

export function SharePlanSheet({
  card,
  onClose,
}: {
  card: EventShareCardProjection;
  onClose: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const copy = async () => {
    const text = card.textLines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied. Paste it anywhere to share this plan.");
    } catch {
      setNote("Copy was not available here. The details above are the full card.");
    }
  };
  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          className="c2s-sheet"
          role="dialog"
          aria-label={`Share ${card.title}`}
          data-testid="r19-share-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="c2s-sheet-title">Share this plan</p>
          <EventShareCard card={card} />
          <button
            type="button"
            className="c2s-btn-primary"
            data-testid="r19-share-copy"
            onClick={() => void copy()}
            style={{ marginTop: 12, width: "100%" }}
          >
            Copy details
          </button>
          {note ? (
            <p className="c2s-card-line" data-testid="r19-share-note" role="status">
              {note}
            </p>
          ) : null}
          <button type="button" className="c2s-btn-text" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </TopLayer>
  );
}
