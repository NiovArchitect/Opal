/**
 * Repair #18 - Division C2 - Splash 1, the new front door (track-c2
 * section 4). One implementation on the C2 shell path; the R17
 * FirstRunSplashPage stays untouched for the fallback.
 *
 * Mode-native: in Dark it sits on canvas-stage true-dark under the
 * night budget with the paper-fill primary; in Light on the pearl
 * stage with the accent primary. Tokens decide - this component never
 * branches on mode. The boot ground already matches the resolved
 * mode, so there is no flash of the other mode before this paints.
 *
 * Copy law: the string Enter Opal does NOT appear on Splash 1 at all.
 * Splash 2 owns the single Enter Opal across the pair.
 */
import React, { useRef } from "react";
import { C2_ASSETS } from "../brand/c2Identity";
import { LoopCharacter } from "../c2/LoopCharacter";
import { C2PatternLines } from "../c2/C2PatternLines";

type Props = {
  onContinue: () => void;
  onAlreadyAccount: () => void;
};

export function C2Splash1({ onContinue, onAlreadyAccount }: Props) {
  const advanced = useRef(false);
  const advance = (fn: () => void) => {
    if (advanced.current) return;
    advanced.current = true;
    fn();
  };
  return (
    <div
      className="c2-splash c2-splash-1"
      data-testid="c2-splash1"
      data-shell="c2"
      data-splash-stage="1"
      data-enter-opal-count="0"
      role="main"
      aria-label="Opal Graph"
    >
      <C2PatternLines convergenceY={96} heightPct={52} />
      <div className="c2-splash-column">
        <div className="c2-splash-hero">
          <LoopCharacter expression="rest" size={168} hero title="" />
          <img
            className="c2-splash-wordmark"
            src={C2_ASSETS.wordmarkGradient}
            width={132}
            alt="Opal Graph"
            data-c2-asset="wordmark-gradient"
            data-testid="c2-splash1-wordmark"
            draggable={false}
          />
        </div>
        <h1 className="c2-splash-headline">REAL PEOPLE. REAL PLANS.</h1>
        <p className="c2-splash-subline">Your people. Your plans. One place.</p>
        <div className="c2-splash-actions">
          <button
            type="button"
            className="c2-btn-primary"
            data-testid="c2-splash1-continue"
            onClick={() => advance(onContinue)}
          >
            Continue
          </button>
          <button
            type="button"
            className="c2-btn-text"
            data-testid="c2-splash1-already"
            onClick={() => advance(onAlreadyAccount)}
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
}
