/**
 * TOP-LEVEL Splash — Figma 618:19 / Paste W7.
 *
 * Lockup + TALK. ALIGN. GO. + actions. No redundant "OPAL GRAPH" text line.
 * Holds ≥2s before auto-advance to Phone. Skip intro stays tappable.
 * Baked Splash 2 PNG is owned elsewhere and is not touched here.
 */
import React, { useEffect, useRef } from "react";
import { BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";

type Props = {
  onTapBegin: () => void;
  onAlreadyAccount: () => void;
  /** Skip intro advances with Tap to begin (Phone). */
  onSkipIntro?: () => void;
};

/** Canonical transparent logo lockup — character + Opal letters. */
const LOCKUP_SRC = BRAND_ASSETS.opalLogo;
/** Minimum hold before auto-advance (W7 Phase 1b). */
const SPLASH_AUTO_MS = 2000;

export function FirstRunSplashPage({ onTapBegin, onAlreadyAccount, onSkipIntro }: Props) {
  const advanced = useRef(false);
  const mountedAt = useRef(Date.now());
  const goBegin = () => {
    if (advanced.current) return;
    // Never flash-and-skip: enforce min hold even if Tap fires early via remount races.
    const elapsed = Date.now() - mountedAt.current;
    if (elapsed < SPLASH_AUTO_MS) {
      window.setTimeout(goBegin, SPLASH_AUTO_MS - elapsed);
      return;
    }
    advanced.current = true;
    onTapBegin();
  };

  useEffect(() => {
    mountedAt.current = Date.now();
    const t = window.setTimeout(goBegin, SPLASH_AUTO_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto advance
  }, []);

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
      data-splash-hold-ms={String(SPLASH_AUTO_MS)}
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
          onClick={() => {
            if (advanced.current) return;
            advanced.current = true;
            (onSkipIntro || onTapBegin)();
          }}
        >
          Skip intro
        </button>
        <button
          type="button"
          className="fr-splash-tap"
          data-testid="fr00-tap-begin"
          onClick={() => {
            if (advanced.current) return;
            advanced.current = true;
            onTapBegin();
          }}
        >
          Tap to begin
        </button>
        <button
          type="button"
          className="fr-splash-returning"
          data-testid="fr00-already-account"
          onClick={onAlreadyAccount}
        >
          I already have an account
        </button>
      </div>
    </div>
  );
}
