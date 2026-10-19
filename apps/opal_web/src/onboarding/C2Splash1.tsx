/**
 * Repair #18 - Division C2 - Splash 1, the front door.
 *
 * SPLASH 1 REBUILD (founder order 2026-10-18 13:48 PDT, on the
 * master-vs-splash side-by-sides): the served splash - the orb
 * shrunk into a small medallion on a page panel - "doesn't
 * functionally work for an app." The founder's verdict: the MASTER
 * ITSELF, full-bleed, "is the perfect splash 1," and "the rings I
 * wish moved in an animated way around the orb."
 *
 * So this splash IS the master composition: the full master
 * (ORB_ASSETS.masterFull - the drawn master with its own field,
 * dust and vignette, resize-only derivation) at the top of the
 * screen, its night field continuing seamlessly down the rest of
 * the screen (--orb-night-field is the master's sampled edge
 * field). No page panel, no card, no medallion frame anywhere.
 * COMPOSITION REFINEMENT (founder, 2026-10-18 13:59 PDT): the
 * composition is INSET by a small safe margin - the complete
 * master (rings whole, points of light never cropped) sits inside
 * the margin while the field extends behind it to the screen
 * edges, so the breathing room reads as intentional framing.
 * The gyroscope rings LIVE: OrbLivingRings rides the
 * composition at the measured master geometry - the baked rings
 * stay the structure, the live layer carries traveling points of
 * light and one slow precessing lit arc. The wordmark is stacked
 * beneath the orb (LOCKUP LAW: stacked is the only combined
 * composition), then the headline, then the actions composed on
 * the field: exactly ONE primary action (Continue, paper on the
 * night field) and the account text action beneath it.
 *
 * MODES: the stone's moment is a night moment. This splash carries
 * its own night field in BOTH modes (the --orb-night-* tokens) - the
 * master is never inverted, washed out, or flashed white on entry.
 * That is a presented choice for the founder's verdict, stated in
 * the splash report and the pack README. The app beyond the splash
 * keeps its real light/dark modes untouched.
 *
 * Copy law: the string Enter Opal does NOT appear on Splash 1 at
 * all. Splash 2 owns the single Enter Opal across the pair (the
 * foundation tests pin both). The entry flow - onContinue to
 * Splash 2, onAlreadyAccount to sign-in - is functionally
 * identical to before, double-tap guard included.
 */
import React, { useRef } from "react";
import { OrbWordmark } from "../brand/orb/OrbMark";
import { OrbLivingRings } from "../brand/orb/OrbLivingRings";
import { ORB_ASSETS } from "../brand/orb/orbTokens";

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
      className="c2-splash c2-splash-1 c2-splash-1--fullbleed"
      data-testid="c2-splash1"
      data-shell="c2"
      data-splash-stage="1"
      data-enter-opal-count="0"
      data-splash-field="night-master"
      role="main"
      aria-label="Opal Graph"
    >
      <div className="c2-splash-stage" data-testid="c2-splash1-orb">
        <img
          className="c2-splash-master"
          src={ORB_ASSETS.masterFull}
          alt=""
          role="presentation"
          data-orb-asset="master-full"
          data-orb-master="1"
          draggable={false}
        />
        <OrbLivingRings variant="hero" />
      </div>
      <div className="c2-splash-column">
        <span className="c2-splash-wordmark" data-testid="c2-splash1-wordmark">
          <OrbWordmark width={168} variant="gradient" />
        </span>
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
