/**
 * App / session lifecycle for release readiness.
 * Pure state machine — no blank-screen infinite spin paths.
 */

export type SessionState =
  | "cold_start"
  | "warming"
  | "signed_out"
  | "signed_in"
  | "session_expired"
  | "device_revoked"
  | "safe_account"
  | "offline_cached"
  | "recoverable_error"
  | "corrupted_cache";

export type LifecycleEvent =
  | { type: "BOOT" }
  | { type: "SHELL_READY" }
  | { type: "SIGN_IN" }
  | { type: "SIGN_OUT" }
  | { type: "SESSION_EXPIRED" }
  | { type: "DEVICE_REVOKED" }
  | { type: "NETWORK_LOST" }
  | { type: "NETWORK_RESTORED" }
  | { type: "CACHE_CORRUPT" }
  | { type: "CLEAR_CACHE" }
  | { type: "SAFE_ACCOUNT" }
  | { type: "RETRY" };

export type LifecycleContext = {
  state: SessionState;
  draftPreserved: boolean;
  crossAccountFlash: boolean;
  blankScreen: boolean;
  infiniteSpinner: boolean;
  userMessage: string | null;
};

export function initialLifecycle(): LifecycleContext {
  return {
    state: "cold_start",
    draftPreserved: true,
    crossAccountFlash: false,
    blankScreen: false,
    infiniteSpinner: false,
    userMessage: null,
  };
}

export function reduceLifecycle(
  ctx: LifecycleContext,
  event: LifecycleEvent,
): LifecycleContext {
  switch (event.type) {
    case "BOOT":
      return {
        ...ctx,
        state: "warming",
        blankScreen: false,
        infiniteSpinner: false,
        userMessage: "Starting Opal…",
      };
    case "SHELL_READY":
      return {
        ...ctx,
        state: ctx.state === "signed_in" ? "signed_in" : "signed_out",
        blankScreen: false,
        infiniteSpinner: false,
        userMessage: null,
      };
    case "SIGN_IN":
      return {
        ...ctx,
        state: "signed_in",
        crossAccountFlash: false,
        blankScreen: false,
        infiniteSpinner: false,
        userMessage: null,
      };
    case "SIGN_OUT":
      return {
        ...ctx,
        state: "signed_out",
        crossAccountFlash: false,
        draftPreserved: false,
        userMessage: null,
      };
    case "SESSION_EXPIRED":
      return {
        ...ctx,
        state: "session_expired",
        infiniteSpinner: false,
        blankScreen: false,
        userMessage: "Your session ended. Sign in again to continue.",
      };
    case "DEVICE_REVOKED":
      return {
        ...ctx,
        state: "device_revoked",
        draftPreserved: false,
        infiniteSpinner: false,
        blankScreen: false,
        userMessage: "This device is no longer authorized.",
      };
    case "NETWORK_LOST":
      if (ctx.state === "signed_in" || ctx.state === "offline_cached") {
        return {
          ...ctx,
          state: "offline_cached",
          infiniteSpinner: false,
          userMessage: "You’re offline. Changes will sync when you reconnect.",
        };
      }
      return { ...ctx, infiniteSpinner: false };
    case "NETWORK_RESTORED":
      if (ctx.state === "offline_cached") {
        return {
          ...ctx,
          state: "signed_in",
          userMessage: null,
        };
      }
      return ctx;
    case "CACHE_CORRUPT":
      return {
        ...ctx,
        state: "corrupted_cache",
        blankScreen: false,
        infiniteSpinner: false,
        userMessage: "Local data needs a refresh. You can continue safely.",
      };
    case "CLEAR_CACHE":
      return {
        ...ctx,
        state: "signed_out",
        blankScreen: false,
        infiniteSpinner: false,
        userMessage: null,
      };
    case "SAFE_ACCOUNT":
      return {
        ...ctx,
        state: "safe_account",
        blankScreen: false,
        infiniteSpinner: false,
        userMessage: "Account is in a limited safe state.",
      };
    case "RETRY":
      return {
        ...ctx,
        state: "warming",
        blankScreen: false,
        infiniteSpinner: false,
        userMessage: "Retrying…",
      };
    default:
      return ctx;
  }
}

/** High-risk actions must not report success when session is invalid. */
export function mayCompleteHighRiskAction(state: SessionState): boolean {
  return state === "signed_in" || state === "offline_cached";
}
