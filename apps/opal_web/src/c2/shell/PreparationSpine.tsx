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
      <div className="c2s-spine-arc" aria-hidden style={{ position: "relative", height: 4, margin: "6px 0 10px" }}>
        {spine.map((item) => (
          <span
            key={item.id}
            data-testid="c2-spine-node"
            data-spine-phase={item.phase}
            style={{
              position: "absolute",
              left: `${Math.round(item.arcPosition * 100)}%`,
              width: 8,
              height: 8,
              borderRadius: 8,
              background: "var(--state-forming)",
              opacity: item.state === "done" ? 1 : 0.45,
            }}
          />
        ))}
      </div>
      {spine.map((item) => {
        const body = (
          <>
            <p className="c2s-card-title" style={{ fontSize: 15 }}>
              {item.label}
            </p>
            <p className="c2s-card-line">
              {item.stateLine} <span style={{ color: "var(--ink-3)" }}>{item.ownerLine}</span>
            </p>
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
