/**
 * Repair #19 polish P12 - the preparation spine view.
 *
 * Renders ONE projected spine (density.ts spineFromPlan, carried on
 * the GraphDetailProjection): INTENT -> PREPARATION -> THE EVENT ->
 * SETTLING INTO MEMORY. Each item shows its state and its owner in
 * the projection's finished words. This component derives nothing:
 * no state, no owner, no position is computed here. The integrator
 * mounts it on the plan detail (see C2GraphDetail, additive section
 * under the plan card) - it is equally mountable anywhere a detail
 * projection is held.
 *
 * Repair #20 (F-13) - interactivity: an item the projection stamped
 * with a real action surface (item.action) renders as a button and
 * tapping it opens exactly that surface through onAction. An item
 * with no action - Opal-owned machinery, another person's answer -
 * stays a static row: a tap that opens nothing real is a defect,
 * so there is nothing to tap.
 */
import React from "react";
import type { SpineItem } from "./density";

/** R20A CF (R-5): the marker on each item row names its state in
 *  plain words, so no bare dot has to carry meaning a reader
 *  cannot decode.
 *  Repair #28 (W28-4): the marker no longer repeats the PHASE -
 *  the row's own title already names the step ("Settles into
 *  memory" beside a marker reading "Settling into memory -
 *  waiting" said the same thing twice on one line). The marker
 *  says only what the title doesn't: the state, in human words. */
const STATE_LABEL: Record<SpineItem["state"], string> = {
  done: "Done",
  working: "Working",
  "needs-you": "Needs you",
  waiting: "Waiting",
  declared: "Closed",
};

export function PreparationSpine({
  spine,
  onAction,
}: {
  spine: SpineItem[];
  /** Opens the item's stamped action surface. Absent handler =
   *  every item renders static (no dead controls, ever). */
  onAction?: (item: SpineItem) => void;
}) {
  if (spine.length === 0) return null;
  return (
    <div data-testid="c2-preparation-spine">
      <p className="c2s-detail-kicker">How this plan comes together</p>
      {/* R20A CF (R-5): the bare arc dots that used to sit under
       * this kicker are REMOVED. They were 8px circles in one
       * forming hue for every phase, differing only in opacity,
       * positioned by arc fraction (two phases sit 0.05 apart and
       * the end nodes half-overflowed the row): no label, no
       * pattern, no per-phase meaning a reader could decode - the
       * founder's unexplained dots. Each item's state now rides
       * its own row as a labeled marker (phase word + state word
       * in plain text), so the state a dot only hinted at is
       * legible beside the item it describes. */}
      {spine.map((item) => {
        const body = (
          <>
            <p className="c2s-card-title" style={{ fontSize: 15 }}>
              {item.label}{" "}
              <span
                className="c2s-spine-marker"
                data-testid="c2-spine-marker"
                data-spine-state={item.state}
                data-spine-phase={item.phase}
              >
                {STATE_LABEL[item.state]}
              </span>
            </p>
            {/* Repair #28 (W28-4): the state line stands alone as
                one clear sentence. The owner fragment that used to
                be jammed onto its end in grey ("...on the graph.
                Yours to do", "...theirs to give Theirs to answer",
                "...quietly. Opal") is gone - ownership is phrased
                inside the sentence or not at all. */}
            <p className="c2s-card-line">{item.stateLine}</p>
          </>
        );
        const tappable = Boolean(item.action && onAction);
        return tappable ? (
          <button
            key={item.id}
            type="button"
            data-testid="c2-spine-item"
            data-spine-state={item.state}
            data-spine-owner={item.owner}
            data-spine-phase={item.phase}
            data-spine-action={item.action!.kind}
            aria-label={`${item.label} - open`}
            onClick={() => onAction!(item)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              padding: 0,
              marginBottom: 8,
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
            }}
          >
            {body}
          </button>
        ) : (
          <div
            key={item.id}
            data-testid="c2-spine-item"
            data-spine-state={item.state}
            data-spine-owner={item.owner}
            data-spine-phase={item.phase}
            style={{ marginBottom: 8 }}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
