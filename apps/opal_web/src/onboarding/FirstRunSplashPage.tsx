/**
 * TOP-LEVEL Splash — Founder Reality Repair #2, amended Repair #17 (W7).
 *
 * SINGLE approved identity: the canon Opal logo lockup on Midnight
 * (BRAND_ASSETS.opalLogo = shots/brand/opal-logo.png — character +
 * bubble-letter "Opal" as ONE canon asset; that bubble-letter text is
 * the logo text the founder asked for). The lockup is a single asset,
 * not a composed collage: never pair it with a separate character,
 * wordmark, rendered text logo, or tagline layer. Logo count stays 1.
 * NEW_USER_SKIP_SPLASH_2 = 0 — only “I already have an account” bypasses to Phone.
 */
import React, { useRef } from "react";
import { BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";

type Props = {
  onTapBegin: () => void;
  onAlreadyAccount: () => void;
};

/** Canon logo lockup only — one asset, never a composed character+wordmark collage. */
const SPLASH_IDENTITY_SRC = `${BRAND_ASSETS.opalLogo}?v=repair17-canon-lockup`;

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
      data-splash-identity="opal-logo-lockup"
      aria-label={PRODUCT_PUBLIC_NAME}
    >
      <div className="fr-splash-aura" aria-hidden data-figma-node="631:2" />
      <div className="fr-splash-hero">
        <div className="fr-splash-mark fr-splash-mark-logo">
          <img
            className="fr-splash-spectral-emblem fr-splash-logo-lockup"
            src={SPLASH_IDENTITY_SRC}
            alt=""
            width={300}
            height={200}
            draggable={false}
            data-brand-role="logo-lockup"
            data-brand-source="opal-logo"
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
