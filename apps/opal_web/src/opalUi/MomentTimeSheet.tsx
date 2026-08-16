/**
 * Pass 31 P0-31-02 — select WHEN on the same Moment-seeded Reality.
 * Not a separate scheduling product. Taps must call onSelect with a label.
 */
import React from "react";
import { MOMENT_TIME_OPTIONS } from "./liveSocialMomentLoop";

export function MomentTimeSheet({
  placeLabel,
  whatLabel,
  selectedWhen,
  onSelect,
  onClose,
}: {
  placeLabel?: string | null;
  whatLabel?: string | null;
  selectedWhen?: string | null;
  onSelect: (label: string, slotId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="moment-people-sheet moment-time-sheet"
      data-testid="moment-time-sheet"
      role="dialog"
      aria-label="Choose a time"
    >
      <div className="moment-people-sheet-panel">
        <p className="private-opal-kicker">Only you</p>
        <p className="curate-kicker">When</p>
        {(placeLabel || whatLabel) && (
          <p className="curate-truth" data-testid="moment-time-context">
            {[whatLabel, placeLabel].filter(Boolean).join(" · ")}
          </p>
        )}
        <ul className="extend-options" data-testid="moment-time-options">
          {MOMENT_TIME_OPTIONS.map((opt) => {
            const on = selectedWhen === opt.label;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  className={
                    on ? "moment-people-option is-active" : "moment-people-option"
                  }
                  data-testid={`moment-time-slot-${opt.id}`}
                  data-slot-id={opt.id}
                  data-selected={on ? "true" : "false"}
                  aria-pressed={on}
                  onClick={() => onSelect(opt.label, opt.id)}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="moment-people-cancel"
          data-testid="moment-time-close"
          onClick={onClose}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
