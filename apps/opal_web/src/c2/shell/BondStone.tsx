/**
 * Repair #21 (W-12) - THE BOND SURFACE: the shared stone.
 *
 * Tapping a person lands here - the pair's own place. What is on
 * the stone is only what both parties share: our chapters
 * (done-and-loved stones), our next together, our Know Me? pair
 * score, and the shape of our overlap as felt objects (place
 * stones, never prose). Laws, from the founder's endorsement:
 *  (a) FELT, NOT TOLD - almost no prose; an element that cannot
 *      be felt is not on the stone.
 *  (b) MUTUAL - the projection is built only from shared records
 *      (see bondFromPair); private sides stay in each person's
 *      Orbit. The bond is the social face, Orbit the private
 *      room - complementary, never merged.
 *  (c) Doors out: to the pair's Orbit, to the shared plan in
 *      Graphs, and to start a plan together.
 * A pair with almost no shared history gets the sparse stone:
 * the person, the tie, and the door to begin - a promise, not a
 * fabrication. Nothing is invented to fill it.
 */
import React from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { Avatar, IconClose } from "./bits";
import type { BondProjection } from "./projections";

export function BondStone({
  bond,
  onClose,
  onOpenOrbit,
  onOpenGraph,
  onStartPlan,
}: {
  bond: BondProjection;
  onClose: () => void;
  /** The pair's Orbit (the private room) - supplied by the shell
   *  only when it can open the scoped Opal conversation. */
  onOpenOrbit?: (personId: string, name: string) => void;
  /** Open a shared plan's graph detail. */
  onOpenGraph?: (planId: string) => void;
  /** Start a plan with this person (the real create flow). */
  onStartPlan?: (personId: string, name: string) => void;
}) {
  const sparse = bond.sharedPlanCount === 0 && !bond.pairScore;
  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          className="c2s-sheet c2s-bond"
          role="dialog"
          aria-modal="true"
          aria-label={`You and ${bond.name}`}
          data-testid="c2-bond-stone"
          data-sparse={sparse ? "1" : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="c2s-bond-head">
            <Avatar avatar={bond.avatar} size={56} />
            <div style={{ flex: 1 }}>
              <p className="c2s-bond-name" data-testid="c2-bond-name">
                {bond.name}
              </p>
              {bond.relationshipLabel ? (
                <p className="c2s-card-line" data-testid="c2-bond-tie">
                  {bond.relationshipLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="c2s-icon-btn"
              aria-label="Close"
              data-testid="c2-bond-close"
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>

          {bond.nextTogether ? (
            <button
              type="button"
              className="c2s-bond-next"
              data-testid="c2-bond-next"
              data-plan-state={bond.nextTogether.stateFamily}
              onClick={() => onOpenGraph?.(bond.nextTogether!.planId)}
            >
              <span className="c2s-bond-next-title">{bond.nextTogether.title}</span>
              <span className="c2s-card-line">
                {bond.nextTogether.stateLabel} - {bond.nextTogether.whenLine}
              </span>
            </button>
          ) : null}

          {bond.chapters.length > 0 ? (
            <div className="c2s-bond-chapters" data-testid="c2-bond-chapters">
              {bond.chapters.map((chapter) => (
                <button
                  key={chapter.planId}
                  type="button"
                  className="c2s-bond-chapter"
                  data-testid="c2-bond-chapter"
                  onClick={() => onOpenGraph?.(chapter.planId)}
                >
                  <span className="c2s-bond-chapter-title">{chapter.title}</span>
                  <span className="c2s-card-line">
                    {chapter.whenLine}
                    {chapter.placeLabel ? ` - ${chapter.placeLabel}` : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {bond.sharedPlaces.length > 0 || bond.pairScore ? (
            <div className="c2s-bond-overlap" data-testid="c2-bond-overlap">
              {bond.sharedPlaces.map((place) => (
                <span key={place} className="c2s-bond-place" data-testid="c2-bond-place">
                  {place}
                </span>
              ))}
              {bond.pairScore ? (
                <span className="c2s-bond-score" data-testid="c2-bond-score">
                  Know Me? {bond.pairScore.points} - {bond.pairScore.confirmed} confirmed
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="c2s-bond-doors">
            {onStartPlan ? (
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-bond-start-plan"
                onClick={() => onStartPlan(bond.personId, bond.name)}
              >
                Start a plan
              </button>
            ) : null}
            {onOpenOrbit ? (
              <button
                type="button"
                className="c2s-btn-text"
                data-testid="c2-bond-orbit"
                onClick={() => onOpenOrbit(bond.personId, bond.name)}
              >
                Orbit
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </TopLayer>
  );
}
