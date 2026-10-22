/**
 * Repair #22 (WS-5) - THE PLACE VIEW: one tap from the place stone.
 *
 * The place itself, in felt objects first (the BondStone pattern):
 * what is happening here now, what is forming and coming, and what
 * your people have lived here - every row a record the stone's own
 * projection already carries (PlaceStoneProjection, finished by
 * placeStonesFromGraph). The view makes no read and derives
 * nothing; it holds nothing the stone did not carry.
 *
 * Doors out, each one real:
 *  - every plan row opens that plan's graph detail;
 *  - "Start a plan here" rides the projection's pre-composed seed
 *    (the flows2 seed machinery) into the real graph-create flow.
 *    It renders only when the builder composed one - a live-only
 *    place carries none (declared D-P4 in the design record).
 * Moments carry no door: no moment detail surface exists today,
 * and this view does not fake one.
 */
import React from "react";
import { TopLayer } from "../../opalUi/TopLayer";
import { IconClose } from "./bits";
import type { PlaceStoneProjection } from "./projections";

export function PlaceStoneView({
  place,
  onClose,
  onOpenGraph,
  onStartPlan,
}: {
  place: PlaceStoneProjection;
  onClose: () => void;
  /** Open a plan's graph detail (the shell's real detail path). */
  onOpenGraph?: (planId: string) => void;
  /** Start a plan at this place, carrying the builder's seed. */
  onStartPlan?: (place: PlaceStoneProjection) => void;
}) {
  const hasNow = place.livesHere.length > 0 || place.happeningPlans.length > 0;
  const hasMemory = place.memoryPlans.length > 0 || place.momentsHere.length > 0;
  return (
    <TopLayer band="sheet">
      <div className="c2s-scrim" onClick={onClose}>
        <div
          className="c2s-sheet c2s-place-view"
          role="dialog"
          aria-modal="true"
          aria-label={place.name}
          data-testid="c2-place-view"
          data-energy-level={place.energyLevel}
          data-energy-family={place.energyFamily}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="c2s-place-view-head">
            <span className="c2s-place-fire" aria-hidden />
            <div style={{ flex: 1 }}>
              <p className="c2s-place-view-name" data-testid="c2-place-view-name">
                {place.name}
              </p>
              <p className="c2s-card-line" data-testid="c2-place-view-energy">
                {place.energyLine}
              </p>
            </div>
            <button
              type="button"
              className="c2s-icon-btn"
              aria-label="Close"
              data-testid="c2-place-view-close"
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>

          {hasNow ? (
            <div className="c2s-place-group" data-testid="c2-place-now">
              {place.livesHere.map((live) => (
                <div key={live.liveId} className="c2s-place-live-row" data-testid="c2-place-live-row">
                  <span
                    className="c2s-live-light"
                    data-testid="c2-place-live-light"
                    role="img"
                    aria-label={live.hostName ? `${live.hostName} is here` : "Live here"}
                  />
                  <span className="c2s-place-row-title">{live.title}</span>
                  {live.hostName ? (
                    <span className="c2s-card-line">{live.hostName} is live here</span>
                  ) : null}
                </div>
              ))}
              {place.happeningPlans.map((plan) => (
                <button
                  key={plan.planId}
                  type="button"
                  className="c2s-place-plan-row"
                  data-testid="c2-place-plan-row"
                  data-plan-state="happening"
                  onClick={() => onOpenGraph?.(plan.planId)}
                >
                  <span className="c2s-place-row-title">{plan.title}</span>
                  <span className="c2s-card-line">Happening - {plan.whenLine}</span>
                </button>
              ))}
            </div>
          ) : null}

          {place.comingPlans.length > 0 ? (
            <div className="c2s-place-group" data-testid="c2-place-coming">
              {place.comingPlans.map((plan) => (
                <button
                  key={plan.planId}
                  type="button"
                  className="c2s-place-plan-row"
                  data-testid="c2-place-plan-row"
                  data-plan-state={plan.stateFamily}
                  onClick={() => onOpenGraph?.(plan.planId)}
                >
                  <span className="c2s-place-row-title">{plan.title}</span>
                  <span className="c2s-card-line">
                    {plan.stateLabel} - {plan.whenLine}
                    {plan.attendanceLine ? ` - ${plan.attendanceLine}` : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {hasMemory ? (
            <div className="c2s-place-group" data-testid="c2-place-memory">
              {place.memoryPlans.map((plan) => (
                <button
                  key={plan.planId}
                  type="button"
                  className="c2s-place-plan-row"
                  data-testid="c2-place-memory-row"
                  data-plan-state="past"
                  onClick={() => onOpenGraph?.(plan.planId)}
                >
                  <span className="c2s-place-row-title">{plan.title}</span>
                  <span className="c2s-card-line">{plan.whenLine}</span>
                </button>
              ))}
              {place.momentsHere.map((moment) => (
                <div key={moment.momentId} className="c2s-place-moment" data-testid="c2-place-moment">
                  <span className="c2s-place-row-title">{moment.caption}</span>
                  <span className="c2s-card-line">{moment.authorName}</span>
                </div>
              ))}
            </div>
          ) : null}

          {place.startSeed && onStartPlan ? (
            <div className="c2s-place-doors">
              <button
                type="button"
                className="c2s-btn-primary"
                data-testid="c2-place-start-plan"
                onClick={() => onStartPlan(place)}
              >
                Start a plan here
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </TopLayer>
  );
}
