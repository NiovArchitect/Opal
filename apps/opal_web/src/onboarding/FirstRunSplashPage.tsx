/**
 * TOP-LEVEL Splash — Founder Reality Repair #2.
 *
 * SINGLE approved identity: animated Opal character on Midnight.
 * No side-by-side character+wordmark collage. No second logo. No tagline layer.
 * NEW_USER_SKIP_SPLASH_2 = 0 — only “I already have an account” bypasses to Phone.
 */
import React, { useRef } from "react";
import { BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";

type Props = {
  onTapBegin: () => void;
  onAlreadyAccount: () => void;
};

/** Character-only splash identity — never the bad side-by-side opal-logo collage. */
const SPLASH_IDENTITY_SRC = `${BRAND_ASSETS.opalCharacter}?v=founder-reality-repair-2`;

export function FirstRunSplashPage({ onTapBegin, onAlreadyAccount }: Props) {
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
      data-viewport="fluid"
      data-splash-frame="full"
      data-splash-owner="FirstRunSplashPage"
      data-splash-hold="indefinite"
      data-splash-auto-advance="0"
      data-new-user-skip-splash-2="0"
      data-splash-logo-count="1"
      data-double-composition="0"
      data-splash-runtime-asset="single_source"
      data-splash-identity="opal-character"
      aria-label={PRODUCT_PUBLIC_NAME}
    >
      <div className="fr-splash-aura" aria-hidden data-figma-node="631:2" />
      <div className="fr-splash-hero">
        <div className="fr-splash-mark fr-splash-mark-character">
          <img
            className="fr-splash-spectral-emblem fr-splash-character-lockup"
            src={SPLASH_IDENTITY_SRC}
            alt=""
            width={210}
            height={210}
            draggable={false}
            data-brand-role="character-lockup"
            data-brand-source="opal-character"
            data-figma-node="631:3"
            data-testid="fr00-splash-emblem"
          />
        </div>
      </div>
      <div className="fr-splash-actions">
        <button
          type="button"
          className="fr-splash-tap"
          data-testid="fr00-tap-begin"
          onClick={() => advance(onTapBegin)}
        >
          Continue
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
