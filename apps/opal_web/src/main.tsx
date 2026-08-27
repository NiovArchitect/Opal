import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./theme/technicolorProduction.css";
/**
 * BRAND V4 CASCADE LAW (570:7 / 528:25 / 562:162):
 * 1) styles.css — base product + layout (geometry preserved)
 * 2) technicolorProduction.css — Living Void / motion compatibility
 * 3) spectralTokens.css — LAST: Brand V4 palette + semantic accents only
 * Future CSS must not import after spectralTokens without an explicit brand layer.
 * INVALID: 539:* / 540:* / 541:8 / 554:5 as screen authorities.
 */
import "./theme/spectralTokens.css";

/** Must match public/brand/opal-graph/opal-promise-exact-941x1672.png SHA (canonical founder Promise) */
const PROMISE_ASSET_SHA = "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10";
const PROMISE_ASSET_URL = `/brand/opal-graph/opal-promise-exact-941x1672.png?v=${PROMISE_ASSET_SHA.slice(0, 16)}`;

const BUILD_ID = [
  "worktree=opal-grok-real-people",
  "branch=build/v2-coded-experience-closure",
  "brandV4=528:25",
  "coherence=570:7",
  "recovery=562:162",
  `promise-${PROMISE_ASSET_SHA.slice(0, 12)}`,
  `built=${Date.now()}`,
].join(";");

function readPromiseIsolationFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("promise_isolation") === "1";
  } catch {
    return false;
  }
}

/**
 * TEMPORARY P0 diagnostic: raw Promise image only.
 * No first-run shell, frost, ambient, CTA, auth, dock, or transition wrappers.
 */
function PromiseIsolationProbe() {
  return (
    <div
      data-testid="promise-isolation-probe"
      data-promise-isolation="1"
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2147483647,
      }}
    >
      <img
        data-testid="promise-isolation-img"
        src={PROMISE_ASSET_URL}
        alt="Promise isolation diagnostic"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: 1,
          visibility: "visible",
          display: "block",
        }}
      />
    </div>
  );
}

class OpalErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[opal-runtime-boundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="app app-futura app-premember"
          data-testid="runtime-error-boundary"
          style={{
            minHeight: "100dvh",
            background: "#050816",
            color: "#f4f7fb",
            padding: "48px 24px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p role="alert" style={{ fontSize: 18, marginBottom: 12 }}>
            Something interrupted Opal.
          </p>
          <p style={{ opacity: 0.72, marginBottom: 24, maxWidth: 420 }}>
            The product should never stay on a blank screen. You can retry without
            losing the design system.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.href = "/?opal_reset_first_run=1";
            }}
            style={{
              background: "#00e5ff",
              color: "#050816",
              border: 0,
              borderRadius: 999,
              padding: "12px 20px",
              fontWeight: 600,
            }}
          >
            Restart first run
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}
root.setAttribute("data-runtime-build", BUILD_ID);
root.setAttribute("data-coherence-lock", "570:7");
root.setAttribute("data-recovery-lock", "562:162");
root.setAttribute("data-brand-board", "528:25");
root.setAttribute("data-promise-sha", PROMISE_ASSET_SHA);
document.documentElement.setAttribute("data-runtime-build", BUILD_ID);

console.info("[OPAL_RUNTIME]", {
  build: BUILD_ID,
  promise_sha: PROMISE_ASSET_SHA,
  promise_url: PROMISE_ASSET_URL,
  vite_pid_marker: "41343-restart-family",
  isolation: readPromiseIsolationFlag(),
});

createRoot(root).render(
  <React.StrictMode>
    <OpalErrorBoundary>
      {readPromiseIsolationFlag() ? <PromiseIsolationProbe /> : <App />}
    </OpalErrorBoundary>
  </React.StrictMode>,
);
