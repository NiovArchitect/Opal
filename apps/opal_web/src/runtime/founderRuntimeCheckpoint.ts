/**
 * Founder runtime checkpoint URL law (P0-05.9 follow-on).
 *
 * Hard-refresh must NOT be a founder responsibility.
 * Use a checkpoint-specific query so the browser requests a distinct session:
 *
 *   /?opal_reset_first_run=1&opal_founder_seed=1&runtime=73f0462
 *
 * When `runtime=` changes vs the last applied checkpoint:
 *   1. clear first-run / profile session state
 *   2. force sticky first-run
 *   3. one-shot full reload (fresh module graph from current Vite)
 *   4. KEEP `runtime` in the URL (do not strip)
 *
 * Ambient/background rendering is never proof that a screen rendered.
 */

export const RUNTIME_CHECKPOINT_KEY = "opal.runtime_checkpoint";
export const RUNTIME_RELOAD_PREFIX = "opal.runtime_reload.";
export const FORCED_FIRST_RUN_KEY = "opal.forcedFirstRun";

/** Storage keys that can leave a noon/stale founder tab in the wrong stage. */
const BUST_LOCAL_KEYS = [
  "opal.firstRun.v14.completed",
  "opal.product.profile.v17",
];

const BUST_SESSION_KEYS = [
  "opal_reset_first_run",
  "opal.forcedFirstRun",
  "opal.founder_seed.opt_in.v1",
];

export function readRuntimeParam(href = typeof window !== "undefined" ? window.location.href : ""): string | null {
  try {
    const v = new URL(href).searchParams.get("runtime");
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function clearStaleFounderState(): void {
  try {
    for (const k of BUST_LOCAL_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  try {
    for (const k of BUST_SESSION_KEYS) sessionStorage.removeItem(k);
    sessionStorage.setItem(FORCED_FIRST_RUN_KEY, "1");
    sessionStorage.setItem("opal_reset_first_run", "1");
  } catch {
    /* ignore */
  }
}

/**
 * Apply checkpoint from URL. Safe to call once at boot (main.tsx) before React.
 * Returns { runtime, reloading } — if reloading, caller must not mount the app.
 */
export function applyFounderRuntimeCheckpoint(href = window.location.href): {
  runtime: string | null;
  bustApplied: boolean;
  reloading: boolean;
} {
  if (typeof window === "undefined") {
    return { runtime: null, bustApplied: false, reloading: false };
  }

  const runtime = readRuntimeParam(href);
  if (!runtime) {
    return { runtime: null, bustApplied: false, reloading: false };
  }

  let prev: string | null = null;
  try {
    prev = sessionStorage.getItem(RUNTIME_CHECKPOINT_KEY);
  } catch {
    prev = null;
  }

  const mismatch = prev !== runtime;
  if (mismatch) {
    clearStaleFounderState();
    try {
      sessionStorage.setItem(RUNTIME_CHECKPOINT_KEY, runtime);
    } catch {
      /* ignore */
    }
  }

  try {
    document.documentElement.setAttribute("data-runtime-checkpoint", runtime);
    document.documentElement.setAttribute("data-runtime-bust", mismatch ? "1" : "0");
  } catch {
    /* ignore */
  }

  // One-shot reload only when checkpoint just changed — guarantees fresh Vite modules
  // for a tab that may still hold a noon/HMR graph. Do not loop.
  if (mismatch) {
    const reloadKey = `${RUNTIME_RELOAD_PREFIX}${runtime}`;
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(reloadKey) === "1";
    } catch {
      alreadyReloaded = false;
    }
    if (!alreadyReloaded) {
      try {
        sessionStorage.setItem(reloadKey, "1");
      } catch {
        /* ignore */
      }
      window.location.reload();
      return { runtime, bustApplied: true, reloading: true };
    }
  }

  return { runtime, bustApplied: mismatch, reloading: false };
}
