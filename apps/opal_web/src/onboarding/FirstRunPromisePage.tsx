/**
 * FirstRunPromisePage — flex immersion over canonical network visualization.
 *
 * Canonical asset (background only — never change bytes):
 * public/brand/opal-graph/opal-promise-exact-941x1672.png
 * SHA-256 20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10
 *
 * Layout: flex column + space-between. Live headline / sub / CTA / tagline.
 * No absolute content geometry. Cyan→purple Enter Opal border preserved.
 */
import React, { useState } from "react";
import { HOLY_SHIT_COPY } from "./holyShitCopy";

export const CANONICAL_PROMISE_SHA =
  "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10";

export const CANONICAL_PROMISE_SHA_SHORT = CANONICAL_PROMISE_SHA.slice(0, 16);

export const PROMISE_NATIVE_WIDTH = 941;
export const PROMISE_NATIVE_HEIGHT = 1672;

export const PROMISE_SRC = `/brand/opal-graph/opal-promise-exact-941x1672.png?v=${CANONICAL_PROMISE_SHA_SHORT}`;

export const PROMISE_HEADLINE = "Your social life, already in motion.";
export const PROMISE_SUB =
  "Opal turns conversation into a shared point in time, place, and people.";

type Props = {
  onContinue: () => void;
  onAlreadyAccount: () => void;
  /** Holy Shit Moment 1 — show landing tagline (gated). */
  showHolyShitHook?: boolean;
};

export function FirstRunPromisePage({
  onContinue,
  onAlreadyAccount,
  showHolyShitHook = false,
}: Props) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const tagline = showHolyShitHook
    ? HOLY_SHIT_COPY.landingHook
    : "Tell Opal who matters. Watch what happens.";

  return (
    <div
      className="first-run-promise-page"
      data-testid="first-run-promise-page"
      data-first-run-stage="promise"
      data-promise-sha={CANONICAL_PROMISE_SHA_SHORT}
      data-first-run-authority="canonical-founder-promise"
      data-figma-presentation="710:8"
      data-figma-canonical="646:2"
      data-promise-load={loadState}
      data-promise-fit="background-flex"
      data-promise-native-w={PROMISE_NATIVE_WIDTH}
      data-promise-native-h={PROMISE_NATIVE_HEIGHT}
      data-holy-shit-hook={showHolyShitHook ? "1" : "0"}
      role="main"
      aria-label="Opal Graph promise"
    >
      {/* Atmosphere: network visualization as full-bleed background only */}
      <div className="first-run-promise-atmosphere" aria-hidden data-testid="opal-promise-atmosphere">
        <img
          className="first-run-promise-img"
          data-testid="opal-promise-exact-img"
          src={PROMISE_SRC}
          alt=""
          width={PROMISE_NATIVE_WIDTH}
          height={PROMISE_NATIVE_HEIGHT}
          decoding="async"
          draggable={false}
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth > 0 && el.naturalHeight > 0) setLoadState("ready");
            else setLoadState("failed");
          }}
          onError={() => setLoadState("failed")}
        />
        <div className="first-run-promise-scrim" />
      </div>

      {loadState === "loading" ? (
        <p className="first-run-promise-loading" data-testid="opal-promise-loading" aria-live="polite">
          Loading…
        </p>
      ) : null}
      {loadState === "failed" ? (
        <p className="first-run-promise-load-error" data-testid="opal-promise-load-error" role="alert">
          PROMISE_ASSET_LOAD_FAILED
        </p>
      ) : null}

      <div className="first-run-promise-content" data-testid="opal-promise-content">
        <header className="first-run-promise-hero" data-testid="opal-promise-hero">
          <h1 className="first-run-promise-headline" data-testid="opal-promise-headline">
            {PROMISE_HEADLINE}
          </h1>
          <p className="first-run-promise-sub" data-testid="opal-promise-sub">
            {PROMISE_SUB}
          </p>
        </header>

        <div className="first-run-promise-cta" data-testid="opal-promise-cta" data-figma-node="710:8">
          <button
            type="button"
            className="first-run-promise-enter"
            data-testid="opal-promise-enter"
            data-figma-node="813:6"
            aria-label="Enter Opal"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContinue();
            }}
          >
            Enter Opal
          </button>
          <button
            type="button"
            className="first-run-promise-signin"
            data-testid="opal-promise-already"
            data-figma-node="813:8"
            aria-label="I already have an account"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAlreadyAccount();
            }}
          >
            I already have an account
          </button>
        </div>

        <p
          className="first-run-promise-tagline"
          data-testid={showHolyShitHook ? "opal-promise-holy-hook" : "opal-promise-tagline"}
          data-hs-moment={showHolyShitHook ? "1" : undefined}
        >
          {tagline}
        </p>
      </div>
    </div>
  );
}

/** @deprecated Alias — critical path uses FirstRunPromisePage only. */
export { FirstRunPromisePage as OpalPromiseScreen };
