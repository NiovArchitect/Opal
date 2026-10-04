/**
 * R1B+ native host bridge — Opal owns every pixel; SecureStore lives on the host.
 * When first-run/auth completes inside the WebView, notify React Native so the
 * host can persist the product session (never put tokens in the URL).
 *
 * Tranche #1: additive media acquisition (camera / photo_library / document)
 * via request_id-routed promises. Unknown native ops are never requested.
 *
 * Phase 2C: listen for host→FE `opal_push_token` and POST device token once
 * (localStorage dedupe — no spam on every app start).
 */

import { registerDevicePushToken } from "./api/productClient";

const PUSH_TOKEN_STORAGE_KEY = "opal_last_expo_push_token";

export type NativeSessionPayload = {
  type: "opal_native_session";
  access_token: string;
  user_id: string;
  display_name?: string;
  handle?: string;
  session_id?: string;
};

export type MediaSource = "camera" | "photo_library" | "document";
export type InitiatingSurface =
  | "center"
  | "story"
  | "graph_create"
  | "first_run"
  | "unknown";

export type MediaAsset = {
  mime_type: string;
  filename?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  byte_size?: number;
  preview_url: string;
};

export type MediaRequestOptions = {
  source: MediaSource;
  initiating_surface: InitiatingSurface;
  media_types?: Array<"image" | "video">;
  accepted_mime_types?: string[];
  allows_editing?: boolean;
  /** Default 120s */
  timeout_ms?: number;
};

export type MediaOk = {
  status: "ok";
  request_id: string;
  source: MediaSource;
  initiating_surface: InitiatingSurface;
  asset: MediaAsset;
};

export type MediaCancelled = {
  status: "cancelled";
  request_id: string;
  source: MediaSource;
  initiating_surface: InitiatingSurface;
};

export type MediaErr = {
  status: "error";
  request_id: string;
  source?: MediaSource;
  initiating_surface?: InitiatingSurface;
  code: string;
  message: string;
};

export type MediaAcquisitionResult = MediaOk | MediaCancelled | MediaErr;

type Pending = {
  resolve: (value: MediaAcquisitionResult) => void;
  source: MediaSource;
  initiating_surface: InitiatingSurface;
  timer: ReturnType<typeof setTimeout>;
};

const pendingMedia = new Map<string, Pending>();
let listenerInstalled = false;
let pushListenerInstalled = false;

export function isNativeHost(): boolean {
  try {
    return (
      new URLSearchParams(window.location.search).get("opal_native_host") === "1" ||
      window.sessionStorage?.getItem("opal_native_host") === "1"
    );
  } catch {
    return false;
  }
}

function postToNative(payload: unknown): void {
  try {
    const rn = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (msg: string) => void };
      }
    ).ReactNativeWebView;
    rn?.postMessage(JSON.stringify(payload));
  } catch {
    /* host may be absent in browser */
  }
}

function hasReactNativeWebView(): boolean {
  try {
    return Boolean(
      (window as unknown as { ReactNativeWebView?: { postMessage?: unknown } })
        .ReactNativeWebView?.postMessage,
    );
  } catch {
    return false;
  }
}

/** True when product UI should prefer the native media bridge over HTML inputs. */
export function shouldUseNativeMediaBridge(): boolean {
  return isNativeHost() && hasReactNativeWebView();
}

function deliverMediaDetail(detail: unknown): void {
  if (!detail || typeof detail !== "object") return;
  const msg = detail as Record<string, unknown>;
  const request_id = typeof msg.request_id === "string" ? msg.request_id : "";
  if (!request_id) return;
  const pending = pendingMedia.get(request_id);
  if (!pending) {
    /* Stale / unknown request id — drop (do not attach to wrong surface). */
    return;
  }
  clearTimeout(pending.timer);
  pendingMedia.delete(request_id);

  if (msg.type === "opal_native_media_cancelled") {
    pending.resolve({
      status: "cancelled",
      request_id,
      source: pending.source,
      initiating_surface: pending.initiating_surface,
    });
    return;
  }
  if (msg.type === "opal_native_media_error") {
    pending.resolve({
      status: "error",
      request_id,
      source: pending.source,
      initiating_surface: pending.initiating_surface,
      code: typeof msg.code === "string" ? msg.code : "unavailable",
      message:
        typeof msg.message === "string"
          ? msg.message
          : "Media isn’t available right now.",
    });
    return;
  }
  if (msg.type === "opal_native_media_result") {
    const asset = msg.asset as MediaAsset | undefined;
    if (!asset?.preview_url || !asset.mime_type) {
      pending.resolve({
        status: "error",
        request_id,
        source: pending.source,
        initiating_surface: pending.initiating_surface,
        code: "read_failed",
        message: "Couldn’t use that media. Try again.",
      });
      return;
    }
    pending.resolve({
      status: "ok",
      request_id,
      source: pending.source,
      initiating_surface: pending.initiating_surface,
      asset,
    });
  }
}

function ensureMediaListener(): void {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  window.addEventListener("opal-native-media", ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    deliverMediaDetail(detail);
  }) as EventListener);
  (
    window as unknown as { __opalNativeMediaDeliver?: (d: unknown) => void }
  ).__opalNativeMediaDeliver = deliverMediaDetail;
}

function newRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `media-${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through */
  }
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ask the native host to open camera / library / document picker.
 * Resolves with ok | cancelled | error. Stale ids are ignored by the router.
 */
export function requestNativeMedia(
  opts: MediaRequestOptions,
): Promise<MediaAcquisitionResult> {
  ensureMediaListener();
  const request_id = newRequestId();
  const timeout_ms = opts.timeout_ms ?? 120_000;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!pendingMedia.has(request_id)) return;
      pendingMedia.delete(request_id);
      resolve({
        status: "error",
        request_id,
        source: opts.source,
        initiating_surface: opts.initiating_surface,
        code: "unavailable",
        message: "Media request timed out. Try again.",
      });
    }, timeout_ms);

    pendingMedia.set(request_id, {
      resolve,
      source: opts.source,
      initiating_surface: opts.initiating_surface,
      timer,
    });

    postToNative({
      type: "opal_native_request_media",
      request_id,
      source: opts.source,
      initiating_surface: opts.initiating_surface,
      media_types: opts.media_types,
      accepted_mime_types: opts.accepted_mime_types,
      allows_editing: opts.allows_editing === true,
    });
  });
}

function readLastSentPushToken(): string | null {
  try {
    return window.localStorage?.getItem(PUSH_TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function writeLastSentPushToken(token: string): void {
  try {
    window.localStorage?.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  } catch {
    /* private mode / blocked storage */
  }
}

async function registerExpoPushToken(token: string): Promise<void> {
  if (!token.startsWith("ExponentPushToken[")) return;
  if (readLastSentPushToken() === token) return;

  try {
    await registerDevicePushToken({
      platform: "ios",
      token,
      env: "production",
    });
    writeLastSentPushToken(token);
  } catch {
    /* network / auth — retry next bridge inject */
  }
}

function deliverPushTokenDetail(detail: unknown): void {
  if (!detail || typeof detail !== "object") return;
  const msg = detail as Record<string, unknown>;
  if (msg.type !== "opal_push_token") return;
  const token =
    typeof msg.expo_push_token === "string" ? msg.expo_push_token.trim() : "";
  if (!token) return;
  void registerExpoPushToken(token);
}

/**
 * Install host→FE push-token listener. Safe to call at boot on native host.
 * Idempotent.
 */
export function installNativePushTokenListener(): void {
  if (pushListenerInstalled || typeof window === "undefined") return;
  pushListenerInstalled = true;
  window.addEventListener("opal-push-token", ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    deliverPushTokenDetail(detail);
  }) as EventListener);
  (
    window as unknown as { __opalPushTokenDeliver?: (d: unknown) => void }
  ).__opalPushTokenDeliver = deliverPushTokenDetail;
}

/** Test-only: clear pending map + simulate native delivery. */
export function __testOnly_resetMediaBridge(): void {
  for (const p of pendingMedia.values()) clearTimeout(p.timer);
  pendingMedia.clear();
}

export function __testOnly_deliverMedia(detail: unknown): void {
  ensureMediaListener();
  deliverMediaDetail(detail);
}

export function __testOnly_pendingCount(): number {
  return pendingMedia.size;
}

export function __testOnly_resetPushTokenBridge(): void {
  pushListenerInstalled = false;
  try {
    window.localStorage?.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  delete (window as unknown as { __opalPushTokenDeliver?: unknown })
    .__opalPushTokenDeliver;
}

export function __testOnly_deliverPushToken(detail: unknown): void {
  installNativePushTokenListener();
  deliverPushTokenDetail(detail);
}

export function __testOnly_lastSentPushToken(): string | null {
  return readLastSentPushToken();
}

export function notifyNativeHostSession(session: {
  access_token?: string;
  user_id: string;
  display_name?: string;
  handle?: string;
  session_id?: string;
}): void {
  if (!isNativeHost()) return;
  const token = session.access_token;
  if (!token) return;

  const payload: NativeSessionPayload = {
    type: "opal_native_session",
    access_token: token,
    user_id: session.user_id,
    display_name: session.display_name,
    handle: session.handle,
    session_id: session.session_id,
  };

  postToNative(payload);

  try {
    window.dispatchEvent(new CustomEvent("opal-native-session-ready", { detail: payload }));
  } catch {
    /* ignore */
  }
}

/** Ask native host to clear SecureStore + return to Brand V4 first-run. */
export function notifyNativeHostSignOut(): void {
  if (!isNativeHost()) return;
  postToNative({ type: "opal_native_sign_out" });
}
