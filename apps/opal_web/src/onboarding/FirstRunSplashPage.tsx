/**
 * TOP-LEVEL Splash — Figma 618:19 exact.
 *
 * P0-05.9: same lesson as Promise. Splash is the screen/state — not nested under
 * FirstRunExperience / .fr-void / Motion opacity-0 / technicolor ambient shell.
 *
 * Do NOT redesign. Geometry matches current 618:19 authority.
 */
import React from "react";
import { BRAND_ASSETS, PRODUCT_PUBLIC_NAME } from "../brand/brand";

type Props = {
  onTapBegin: () => void;
  onAlreadyAccount: () => void;
  /** Skip intro still lands on Promise (cannot skip Promise). */
  onSkipIntro?: () => void;
};

const EMBLEM_SRC = `${BRAND_ASSETS.opalGraphEmblemHero}?v=p0-05-9-splash`;

export function FirstRunSplashPage({ onTapBegin, onAlreadyAccount, onSkipIntro }: Props) {
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
      aria-label={`${PRODUCT_PUBLIC_NAME}. Talk. Align. Go.`}
    >
      <div className="fr-splash-aura" aria-hidden data-figma-node="631:2" />
      <div className="fr-splash-mark">
        <img
          className="fr-splash-spectral-emblem"
          src={EMBLEM_SRC}
          alt=""
          width={176}
          height={176}
          draggable={false}
          data-brand-role="emblem-only"
          data-figma-node="631:3"
          data-testid="fr00-splash-emblem"
        />
      </div>
      <h1 className="fr-splash-wordmark" data-testid="fr00-splash-wordmark">
        <span className="opal-graph-word-opal">OPAL</span>
        <span className="opal-graph-word-graph"> GRAPH</span>
      </h1>
      <p className="fr-splash-mechanic" data-testid="opal-graph-tagline">
        TALK. ALIGN. GO.
      </p>
      <div className="fr-splash-actions">
        <button
          type="button"
          className="fr-splash-skip"
          data-testid="fr00-skip-intro"
          onClick={() => (onSkipIntro || onTapBegin)()}
        >
          Skip intro
        </button>
        <button
          type="button"
          className="fr-splash-tap"
          data-testid="fr00-tap-begin"
          onClick={onTapBegin}
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
