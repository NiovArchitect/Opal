/**
 * FirstRunPromisePage — presentation authority 710:8 over frozen 646:2.
 *
 * Canonical bytes never change:
 * public/brand/opal-graph/opal-promise-exact-941x1672.png
 * SHA-256 20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10
 *
 * 710:8: black stage · full proportional image (no crop of art/copy) · native CTAs.
 * Art frame crops only the baked CTA strip — live buttons sit below in flow.
 */
import React, { useState } from "react";

export const CANONICAL_PROMISE_SHA =
  "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10";

export const CANONICAL_PROMISE_SHA_SHORT = CANONICAL_PROMISE_SHA.slice(0, 16);

export const PROMISE_NATIVE_WIDTH = 941;
export const PROMISE_NATIVE_HEIGHT = 1672;

export const PROMISE_SRC = `/brand/opal-graph/opal-promise-exact-941x1672.png?v=${CANONICAL_PROMISE_SHA_SHORT}`;

type Props = {
  onContinue: () => void;
  onAlreadyAccount: () => void;
  /**
   * Retained for call-site compatibility. Never renders live text over the
   * baked PNG (founder: no overlay copy on Promise).
   */
  showHolyShitHook?: boolean;
};

export function FirstRunPromisePage({
  onContinue,
  onAlreadyAccount,
  showHolyShitHook = false,
}: Props) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  void showHolyShitHook;

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
      data-promise-fit="contain-full-art"
      data-promise-native-w={PROMISE_NATIVE_WIDTH}
      data-promise-native-h={PROMISE_NATIVE_HEIGHT}
      data-holy-shit-hook="0"
      role="main"
      aria-label="Opal Graph promise"
    >
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

      {/* 710:8 / 833:2 — full art+copy; frame aspect excludes baked CTA strip only */}
      <div
        className="first-run-promise-clip"
        data-testid="opal-promise-clip"
        data-figma-node="833:2"
      >
        <img
          className="first-run-promise-img"
          data-testid="opal-promise-exact-img"
          data-figma-node="833:3"
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
        {/* 833:4 — status bar crop within clip */}
        <div
          className="first-run-promise-status-crop"
          data-testid="opal-promise-status-mask"
          data-figma-node="833:4"
          aria-hidden
        />
        {/* Cover residual baked Enter Opal / Sign in at clip bottom — live CTAs only. */}
        <div
          className="first-run-promise-cta-crop"
          data-testid="opal-promise-cta-mask"
          aria-hidden
        />
      </div>

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
    </div>
  );
}

/** @deprecated Alias — critical path uses FirstRunPromisePage only. */
export { FirstRunPromisePage as OpalPromiseScreen };
