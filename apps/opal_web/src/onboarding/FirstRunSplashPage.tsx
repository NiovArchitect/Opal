/**
 * TOP-LEVEL Splash — Figma 618:19 / Paste W8.
 *
 * Lockup + TALK. ALIGN. GO. + actions. No redundant "OPAL GRAPH" text line.
 * Holds indefinitely until an explicit tap (Tap to begin / Skip intro /
 * I already have an account). No timer auto-advance.
 * Baked Splash 2 PNG is owned elsewhere and is not touched here.
 */
import React, { useRef } from "react";
import { BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";

type Props = {
  onTapBegin: () => void;
  onAlreadyAccount: () => void;
  /** Skip intro advances with Tap to begin (Phone). */
  onSkipIntro?: () => void;
};

/** Canonical transparent logo lockup — character + Opal letters. */
const LOCKUP_SRC = BRAND_ASSETS.opalLogo;

export function FirstRunSplashPage({ onTapBegin, onAlreadyAccount, onSkipIntro }: Props) {
  const advanced = useRef(false);
  const advance = (fn: () => void) => {
    if (advanced.current) return;
    advanced.current = true;
    fn();
  };

  return (
    <div
      className="fr-splash fr-splash-toplevel"
      data-testid="fr00-splash"
      data-figma-dated="618:19"
      data-figma-authority="618:19"
      data-figma-node="618:19"
      data-viewport="390x844"
      data-splash-frame="full"
      data-splash-owner="FirstRunSplashPage"
      data-splash-hold="indefinite"
      data-splash-auto-advance="0"
      aria-label={`${PRODUCT_PUBLIC_NAME}. Talk. Align. Go.`}
    >
      <div className="fr-splash-aura" aria-hidden data-figma-node="631:2" />
      <div className="fr-splash-mark">
        <img
          className="fr-splash-spectral-emblem fr-splash-logo-lockup"
          src={LOCKUP_SRC}
          alt=""
          width={210}
          height={140}
          draggable={false}
          data-brand-role="logo-lockup"
          data-brand-source="opal-logo"
          data-figma-node="631:3"
          data-testid="fr00-splash-emblem"
        />
      </div>
      {/* W7 Phase 1a — redundant OPAL GRAPH gradient text removed; lockup already says Opal. */}
      <p className="fr-splash-mechanic" data-testid="opal-graph-tagline">
        TALK. ALIGN. GO.
      </p>
      <div className="fr-splash-actions">
        <button
          type="button"
          className="fr-splash-skip"
          data-testid="fr00-skip-intro"
          onClick={() => advance(() => (onSkipIntro || onTapBegin)())}
        >
          Skip intro
        </button>
        <button
          type="button"
          className="fr-splash-tap"
          data-testid="fr00-tap-begin"
          onClick={() => advance(onTapBegin)}
        >
          Tap to begin
        </button>
        <button
          type="button"
          className="fr-splash-returning"
          data-testid="fr00-already-account"
          onClick={() => advance(onAlreadyAccount)}
        >
          I already have an account
        </button>
      </div>
    </div>
  );
}
