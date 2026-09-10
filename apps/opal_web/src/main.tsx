import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { applyFounderRuntimeCheckpoint } from "./runtime/founderRuntimeCheckpoint";
import { App } from "./App";
import { FirstRunSplashPage } from "./onboarding/FirstRunSplashPage";
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

/**
 * Checkpoint-specific founder URL law:
 *   ?opal_reset_first_run=1&opal_founder_seed=1&runtime=<HEAD>
 * Must run before React. May one-shot reload — do not mount if reloading.
 */
const __runtimeCheckpoint = applyFounderRuntimeCheckpoint();

/** Native host (Expo WebView): edge-to-edge — no 390px card letterboxing. */
try {
  const q = new URLSearchParams(window.location.search);
  if (
    q.get("opal_native_host") === "1" ||
    window.sessionStorage?.getItem("opal_native_host") === "1"
  ) {
    document.documentElement.classList.add("opal-native-host");
    window.sessionStorage?.setItem("opal_native_host", "1");
  }
} catch {
  /* ignore */
}

/** Injected at Vite process start from `git rev-parse` — must equal founder `runtime=` when tree is clean. */
declare const __OPAL_GIT_HEAD__: string;
declare const __OPAL_GIT_HEAD_FULL__: string;
const OPAL_GIT_HEAD =
  typeof __OPAL_GIT_HEAD__ !== "undefined" ? __OPAL_GIT_HEAD__ : "unknown";
const OPAL_GIT_HEAD_FULL =
  typeof __OPAL_GIT_HEAD_FULL__ !== "undefined" ? __OPAL_GIT_HEAD_FULL__ : "unknown";

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
  `git=${OPAL_GIT_HEAD}`,
  __runtimeCheckpoint.runtime ? `runtime=${__runtimeCheckpoint.runtime}` : "runtime=none",
  `built=${Date.now()}`,
].join(";");

function readPromiseIsolationFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("promise_isolation") === "1";
  } catch {
    return false;
  }
}

function readSplashIsolationFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("opal_force_splash") === "1";
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

function SplashIsolationProbe() {
  return (
    <div
      className="app-first-run-splash"
      data-testid="splash-isolation-probe"
      data-splash-isolation="1"
      style={{ position: "fixed", inset: 0, background: "#020305", zIndex: 2147483646 }}
    >
      <FirstRunSplashPage
        onTapBegin={() => {
          window.location.href = "/?opal_force_promise=1";
        }}
        onAlreadyAccount={() => {
          const rt = __runtimeCheckpoint.runtime;
          window.location.href = rt
            ? `/?opal_reset_first_run=1&runtime=${encodeURIComponent(rt)}`
            : "/?opal_reset_first_run=1";
        }}
      />
    </div>
  );
}

// Checkpoint mismatch triggers one-shot reload — do not mount a stale tree.
if (!__runtimeCheckpoint.reloading) {
  root.setAttribute("data-runtime-build", BUILD_ID);
  root.setAttribute("data-coherence-lock", "570:7");
  root.setAttribute("data-recovery-lock", "562:162");
  root.setAttribute("data-brand-board", "528:25");
  root.setAttribute("data-promise-sha", PROMISE_ASSET_SHA);
  root.setAttribute("data-git-head", OPAL_GIT_HEAD);
  root.setAttribute("data-git-head-full", OPAL_GIT_HEAD_FULL);
  document.documentElement.setAttribute("data-git-head", OPAL_GIT_HEAD);
  document.documentElement.setAttribute("data-git-head-full", OPAL_GIT_HEAD_FULL);
  if (__runtimeCheckpoint.runtime) {
    root.setAttribute("data-runtime-checkpoint", __runtimeCheckpoint.runtime);
    document.documentElement.setAttribute(
      "data-runtime-checkpoint",
      __runtimeCheckpoint.runtime,
    );
  }
  document.documentElement.setAttribute("data-runtime-build", BUILD_ID);

  console.info("[OPAL_RUNTIME]", {
    build: BUILD_ID,
    promise_sha: PROMISE_ASSET_SHA,
    promise_url: PROMISE_ASSET_URL,
    git_head: OPAL_GIT_HEAD,
    git_head_full: OPAL_GIT_HEAD_FULL,
    runtime_checkpoint: __runtimeCheckpoint.runtime,
    identity_match:
      !__runtimeCheckpoint.runtime || __runtimeCheckpoint.runtime === OPAL_GIT_HEAD,
    vite_pid_marker: "p0-05-9a-runtime-identity",
    isolation: readPromiseIsolationFlag() || readSplashIsolationFlag(),
  });

  createRoot(root).render(
    <React.StrictMode>
      <OpalErrorBoundary>
        {readPromiseIsolationFlag() ? (
          <PromiseIsolationProbe />
        ) : readSplashIsolationFlag() ? (
          <SplashIsolationProbe />
        ) : (
          <App />
        )}
      </OpalErrorBoundary>
    </React.StrictMode>,
  );
}
