/**
 * Repair #18 - Division C2 - Splash 2, the promise evolved (track-c2
 * section 5). The convergence story the founder approved, rebuilt
 * entirely from live components in C2 tokens. Baked UI is retired:
 * every word and button on this screen is live text. The old baked
 * PNG stays in the repo for the fallback only.
 *
 * Exactly-once law: the words Enter Opal appear exactly once, as the
 * one live primary button. Nowhere else - not in the card, not in the
 * headline, not in any image (there are no images with text here).
 *
 * The plan moment card is a fixed illustration fixture, declared as
 * such (data-illustration="1"): Splash 2 runs before any account or
 * data exists. It never reads or mimics the user projections.
 */
import React, { useRef } from "react";
import { OrbMark } from "../brand/orb/OrbMark";
import { C2PatternLines } from "../c2/C2PatternLines";
import { PlanCardC2 } from "../c2/PlanCardC2";

type Props = {
  onEnter: () => void;
  onAlreadyAccount: () => void;
};

const CHIPS = [
  { text: "Anyone free tonight?", initials: "JM", tint: "var(--person-tint-1)", style: { left: "0%", top: 0 } },
  { text: "Count me in", initials: "RK", tint: "var(--person-tint-3)", style: { right: "0%", top: 38 } },
  { text: "Rooftop sounds perfect", initials: "AS", tint: "var(--person-tint-5)", style: { left: "10%", top: 76 } },
] as const;

export function C2Splash2({ onEnter, onAlreadyAccount }: Props) {
  const advanced = useRef(false);
  const advance = (fn: () => void) => {
    if (advanced.current) return;
    advanced.current = true;
    fn();
  };
  return (
    <div
      className="c2-splash c2-splash-2"
      data-testid="c2-splash2"
      data-shell="c2"
      data-splash-stage="2"
      data-enter-opal-count="1"
      role="main"
      aria-label="Opal Graph promise"
    >
      <C2PatternLines convergenceY={88} heightPct={43} />
      <div className="c2-splash-column">
        <div className="c2-chip-row" aria-hidden>
          {CHIPS.map((chip) => (
            <span key={chip.text} className="c2-chip" style={chip.style as React.CSSProperties}>
              <span
                className="c2-chip-avatar"
                style={{ background: `color-mix(in srgb, ${chip.tint} 22%, transparent)` }}
              >
                {chip.initials}
              </span>
              {chip.text}
            </span>
          ))}
        </div>
        <div className="c2-convergence" aria-hidden>
          <span className="c2-happening-ring">
            <OrbMark size={28} />
          </span>
        </div>
        <div className="c2-splash-card-wrap" data-illustration="1" data-testid="c2-splash2-illustration-card">
          <PlanCardC2
            input={{
              stateFamily: "happening",
              stateLabel: "Happening",
              title: "Rooftop Jazz",
              whenLine: "Tonight at 8 PM",
              whereLine: "Zilker Park Rooftop",
              attendanceLine: "12 going",
              primaryActionLabel: null,
            }}
          />
        </div>
        <h1 className="c2-splash-gradient-headline">Your social life, already in motion.</h1>
        <p className="c2-kicker">TALK. ALIGN. GO.</p>
        <div className="c2-splash-lines">
          <p>Opal turns talk into a time, a place, and your people.</p>
          <p>Less coordinating. More living.</p>
        </div>
        <div className="c2-splash-actions">
          <button
            type="button"
            className="c2-btn-primary"
            data-testid="c2-splash2-enter"
            aria-label="Enter Opal"
            onClick={() => advance(onEnter)}
          >
            Enter Opal
          </button>
          <button
            type="button"
            className="c2-btn-text"
            data-testid="c2-splash2-already"
            onClick={() => advance(onAlreadyAccount)}
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
}
