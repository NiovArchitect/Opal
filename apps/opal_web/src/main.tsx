import React from "react";
import { createRoot } from "react-dom/client";
import { applyFounderRuntimeCheckpoint } from "./runtime/founderRuntimeCheckpoint";
import { installRuntimeAuthority } from "./runtime/runtimeAuthority";
import { OpalErrorBoundary } from "./runtime/OpalErrorBoundary";
import { persistFounderSeedFromUrl } from "./opalUi/founderGraphSeed";
import { App } from "./App";
import { FirstRunSplashPage } from "./onboarding/FirstRunSplashPage";
import {
  applyStoredAppearanceTheme,
  installAppearanceSystemListener,
} from "./theme/appearanceTheme";
/* Repair #18: the layer registry loads FIRST - every other stylesheet
 * references its --layer-* tokens and defines no z-index values. */
import "./theme/layerTokens.css";
/* Repair #18 Division C: new design tokens + C1 surfaces. Every rule is
 * scoped under [data-design="r18"], so the R17 fallback face is untouched
 * when the design flag is off (C1 section 10 reversibility). */
import "./theme/c2Tokens.css";
import "./opalUi/c1/c1.css";
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
/** Paste W: shared Opal composer + plan-state tokens (after Brand V4 cascade). */
import "./theme/opalComposerTokens.css";
/**
 * Repair #18 C2: the global token system (@layer c2). Its semantic names
 * are new, so the R17 face is untouched unless the C2 shell flag mounts
 * C2 surfaces; data-mode is stamped pre-paint by public/c2-boot.js on
 * the plain entry path (W21 F7: unconditional, like the shell).
 */
import "./theme/c2Tokens.css";
import "./c2/c2.css";
/* Repair #18 Orb System: sampled orb tokens + the indicator language
 * (@layer c2; after the C2 tokens, before the Layout Contract). */
import "./theme/orbTokens.css";
import { applyStoredC2Mode, installC2ModeSystemListener } from "./theme/c2Mode";
import { notifyNativeMode } from "./nativeHostBridge";
import { ORB_ASSETS } from "./brand/orb/orbTokens";
/* Repair #18 / Walk #4: THE LAYOUT CONTRACT loads LAST - its containment,
 * thread-composition, and chrome-band rules win over every earlier sheet.
 * (Integration ruling: the contract is the integrated law; the C2 token
 * layer loads immediately before it.) */
import "./theme/layoutContract.css";
/* Repair #18 THEME UNIFICATION (muse/r18-unify): ChatsHome family +
 * Home state treatments into the orb theme - scoped treatment rules
 * that must win over every sheet above on their named surfaces. */
import "./theme/unifyChats.css";

/** Appearance before React paint — data-theme + color-scheme on <html>. */
applyStoredAppearanceTheme();
installAppearanceSystemListener();

/**
 * W21 (F7): C2 mode + icon slots run UNCONDITIONALLY. App.tsx
 * renders the C2 shell unconditionally (W15), so mode setup —
 * data-mode stamping from the stored/system preference — is part
 * of the plain entry path, not a flag-gated extra: a build made
 * without VITE_OPAL_SHELL=c2 previously served an always-light
 * first paint because this block was flag-gated while the shell
 * was not. Disposition of the flag: isC2ShellEnabled() still
 * exists for OpalApp's legacy splash-owner branches, but OpalApp
 * is not mounted by App.tsx, so NO served behavior is gated on
 * the flag anymore; VITE_OPAL_SHELL is dead as a mode/shell gate
 * (kept only as a build marker in vite define + c2Shell.ts docs).
 */
document.documentElement.setAttribute("data-shell", "c2");
applyStoredC2Mode();
installC2ModeSystemListener();
{
  // W27-16: keep the native host's status bar readable over the
  // web ground - report the resolved mode now and on every later
  // flip (Settings toggle, system change). Web owns the mode; the
  // host only mirrors. No-op in a browser.
  try {
    const rootEl = document.documentElement;
    const report = () => {
      const m = rootEl.getAttribute("data-mode");
      if (m === "light" || m === "dark") notifyNativeMode(m);
    };
    report();
    new MutationObserver(report).observe(rootEl, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });
    // Repair #28 (W28-6): the initial post is a single shot, and
    // postToNative silently no-ops if window.ReactNativeWebView
    // is not ready at bundle eval - a lost initial DARK report was
    // never recovered until the user toggled. Re-report on the
    // lifecycle moments when the bridge provably exists or the
    // app returns to the front (event-driven, never a poll): the
    // WebView's load completion and the page becoming visible /
    // focused again.
    window.addEventListener("load", report);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") report();
    });
    window.addEventListener("focus", report);
  } catch {
    /* bridge reporting must never break boot */
  }
}
{
  try {
    const swapIcon = (selector: string, href: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("href", href);
    };
    // The icon slots already serve the orb-derived raster (harmony2
    // icon pass: index.html + site.webmanifest point at files
    // generated from the orb master); the runtime swap re-asserts
    // the orb icon master so no cached interim href survives.
    swapIcon('link[rel="apple-touch-icon"]', ORB_ASSETS.icon1024);
    swapIcon('link[rel="icon"][sizes="48x48"]', ORB_ASSETS.icon1024);
  } catch {
    /* icon swap is cosmetic; never block boot */
  }
}

/**
 * Checkpoint-specific founder URL law:
 *   ?opal_reset_first_run=1&opal_founder_seed=1&runtime=<HEAD>
 * Must run before React. May one-shot reload — do not mount if reloading.
 */
/** Persist seed BEFORE checkpoint bust/reload so reset cannot race the opt-in away. */
persistFounderSeedFromUrl();
const __runtimeCheckpoint = applyFounderRuntimeCheckpoint();
/** Re-apply after checkpoint in case URL still carries the flag post-reload. */
persistFounderSeedFromUrl();
/** DEV provenance: window.__opalRuntimeAuthority (Vite SHA + /api/dev/runtime-authority). */
installRuntimeAuthority();

/** Native host (Expo WebView): edge-to-edge — no 390px card letterboxing. */
try {
  const q = new URLSearchParams(window.location.search);
  if (
    q.get("opal_native_host") === "1" ||
    window.sessionStorage?.getItem("opal_native_host") === "1"
  ) {
    document.documentElement.classList.add("opal-native-host");
    window.sessionStorage?.setItem("opal_native_host", "1");
    // Phase 2C — ready for host→FE Expo push token inject (post-auth).
    void import("./nativeHostBridge").then(({ installNativePushTokenListener }) => {
      installNativePushTokenListener();
    });
    void import("./realtime/incomingCallHandler").then(({ installIncomingCallHandler }) => {
      installIncomingCallHandler({
        present: (presentation) => {
          window.dispatchEvent(
            new CustomEvent("opal-incoming-call-ui", { detail: presentation }),
          );
        },
      });
    });
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
