/**
 * TOP-LEVEL Splash — Figma 618:19 / founder P0 walk correction.
 *
 * Lockup + TALK. ALIGN. GO. + Continue / returning account.
 * Single visual authority for Splash 1. No Skip intro (new users always see Splash 2).
 * Only “I already have an account” bypasses to Phone.
 * Baked Splash 2 PNG is owned by FirstRunPromisePage.
 */
import React, { useRef } from "react";
import { BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";

type Props = {
  onTapBegin: () => void;
  onAlreadyAccount: () => void;
};

/** Canonical transparent logo lockup — character + Opal letters. */
const LOCKUP_SRC = BRAND_ASSETS.opalLogo;

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
      data-viewport="390x844"
      data-splash-frame="full"
      data-splash-owner="FirstRunSplashPage"
      data-splash-hold="indefinite"
      data-splash-auto-advance="0"
      data-new-user-skip-splash-2="0"
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
      <p className="fr-splash-mechanic" data-testid="opal-graph-tagline">
        TALK. ALIGN. GO.
      </p>
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
