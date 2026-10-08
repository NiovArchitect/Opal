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

  // Phase 2 — host injects opal-incoming-call from Expo notification payload.
  window.addEventListener("opal-incoming-call", ((event: Event) => {
    const detail = (event as CustomEvent).detail as Record<string, unknown>;
    void import("./realtime/incomingCallHandler").then(({ handleIncomingCallPush }) => {
      const nativeHost =
        window.sessionStorage?.getItem("opal_native_host") === "1" ||
        new URLSearchParams(window.location.search).get("opal_native_host") === "1";
      handleIncomingCallPush(detail || {}, {
        appState: document.visibilityState === "visible" ? "foreground" : "background",
        nativeHost,
      });
    });
  }) as EventListener);
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

/* ─── Phase OC-6 — speech recognition / TTS bridge (minimal) ─────────────── */

export type NativeSpeechResult =
  | { status: "ok"; text: string }
  | { status: "empty" }
  | { status: "denied" }
  | { status: "offline" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string };

type PendingSpeech = {
  resolve: (value: NativeSpeechResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

const pendingSpeech = new Map<string, PendingSpeech>();
let speechListenerInstalled = false;

function ensureSpeechListener(): void {
  if (speechListenerInstalled || typeof window === "undefined") return;
  speechListenerInstalled = true;
  window.addEventListener("opal-native-speech", ((event: Event) => {
    deliverSpeechDetail((event as CustomEvent).detail);
  }) as EventListener);
  (
    window as unknown as { __opalNativeSpeechDeliver?: (d: unknown) => void }
  ).__opalNativeSpeechDeliver = deliverSpeechDetail;
}

function deliverSpeechDetail(detail: unknown): void {
  if (!detail || typeof detail !== "object") return;
  const msg = detail as Record<string, unknown>;
  const request_id = typeof msg.request_id === "string" ? msg.request_id : "";
  if (!request_id) return;
  const pending = pendingSpeech.get(request_id);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingSpeech.delete(request_id);

  if (msg.type === "opal_native_speech_result") {
    const text = typeof msg.text === "string" ? msg.text.trim() : "";
    if (text) pending.resolve({ status: "ok", text });
    else pending.resolve({ status: "empty" });
    return;
  }
  if (msg.type === "opal_native_speech_error") {
    const code = typeof msg.code === "string" ? msg.code : "error";
    if (code === "permission_denied" || code === "denied") {
      pending.resolve({ status: "denied" });
      return;
    }
    if (code === "empty" || code === "no-speech") {
      pending.resolve({ status: "empty" });
      return;
    }
    if (code === "unavailable") {
      pending.resolve({
        status: "unavailable",
        message:
          typeof msg.message === "string"
            ? msg.message
            : "Voice input isn’t available on this build yet — type instead.",
      });
      return;
    }
    pending.resolve({
      status: "error",
      message:
        typeof msg.message === "string"
          ? msg.message
          : "I didn't catch that. Try again or type instead.",
    });
  }
}

/**
 * Ask the native host to run platform STT (iOS Speech framework).
 * Resolves with transcribed text or a structured error.
 */
export function startNativeSpeechRecognition(): Promise<NativeSpeechResult> {
  ensureSpeechListener();
  if (!shouldUseNativeMediaBridge()) {
    return Promise.resolve({
      status: "unavailable",
      message: "Voice isn’t set up on this build — type instead.",
    });
  }
  const request_id = newRequestId().replace(/^media-/, "speech-");
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!pendingSpeech.has(request_id)) return;
      pendingSpeech.delete(request_id);
      resolve({
        status: "unavailable",
        message: "Voice input timed out. Try again or type instead.",
      });
    }, 60_000);
    pendingSpeech.set(request_id, { resolve, timer });
    postToNative({
      type: "opal_native_start_speech",
      request_id,
    });
  });
}

/** Ask the native host to speak plain text (AVSpeechSynthesizer / system TTS). */
export function speakNativeText(text: string): Promise<void> {
  const clipped = (text || "").trim();
  if (!clipped) return Promise.resolve();
  if (!shouldUseNativeMediaBridge()) return Promise.resolve();
  const request_id = newRequestId().replace(/^media-/, "tts-");
  return new Promise((resolve) => {
    const onDone = ((event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { request_id?: string }
        | undefined;
      if (detail?.request_id && detail.request_id !== request_id) return;
      window.removeEventListener("opal-native-tts-done", onDone as EventListener);
      resolve();
    }) as EventListener;
    window.addEventListener("opal-native-tts-done", onDone);
    setTimeout(() => {
      window.removeEventListener("opal-native-tts-done", onDone);
      resolve();
    }, 32_000);
    postToNative({
      type: "opal_native_speak_text",
      request_id,
      text: clipped.slice(0, 800),
    });
  });
}

export function stopNativeSpeaking(): void {
  if (!shouldUseNativeMediaBridge()) return;
  postToNative({ type: "opal_native_stop_speak" });
}

export function __testOnly_resetSpeechBridge(): void {
  for (const p of pendingSpeech.values()) clearTimeout(p.timer);
  pendingSpeech.clear();
}

export function __testOnly_deliverSpeech(detail: unknown): void {
  ensureSpeechListener();
  deliverSpeechDetail(detail);
}

/* ─── Native contacts (first-run / Find People) ───────────────────────────
 * TRUST: only contacts the user explicitly selects leave the device.
 * Search/list payloads stay in the WebView until the user taps a row;
 * product invite APIs receive that single selected snapshot only.
 */

export type NativeContactRow = {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
  organization?: string;
};

export type NativeContactsResult =
  | {
      status: "ok";
      permission: string;
      contacts: NativeContactRow[];
      mode: "search" | "pick";
    }
  | { status: "denied"; permission: string; message?: string }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string };

type PendingContacts = {
  resolve: (value: NativeContactsResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

const pendingContacts = new Map<string, PendingContacts>();
let contactsListenerInstalled = false;

export function shouldUseNativeContactsBridge(): boolean {
  return isNativeHost() && hasReactNativeWebView();
}

function ensureContactsListener(): void {
  if (contactsListenerInstalled || typeof window === "undefined") return;
  contactsListenerInstalled = true;
  window.addEventListener("opal-native-contacts", ((event: Event) => {
    deliverContactsDetail((event as CustomEvent).detail);
  }) as EventListener);
  (
    window as unknown as { __opalNativeContactsDeliver?: (d: unknown) => void }
  ).__opalNativeContactsDeliver = deliverContactsDetail;
}

function deliverContactsDetail(detail: unknown): void {
  if (!detail || typeof detail !== "object") return;
  const msg = detail as Record<string, unknown>;
  const request_id = typeof msg.request_id === "string" ? msg.request_id : "";
  if (!request_id) return;
  const pending = pendingContacts.get(request_id);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingContacts.delete(request_id);

  if (msg.type === "opal_native_contacts_denied") {
    pending.resolve({
      status: "denied",
      permission: typeof msg.permission === "string" ? msg.permission : "denied",
      message: typeof msg.message === "string" ? msg.message : undefined,
    });
    return;
  }
  if (msg.type === "opal_native_contacts_error") {
    const code = typeof msg.code === "string" ? msg.code : "error";
    if (code === "unavailable") {
      pending.resolve({
        status: "unavailable",
        message:
          typeof msg.message === "string"
            ? msg.message
            : "Contacts aren’t available on this build.",
      });
      return;
    }
    pending.resolve({
      status: "error",
      message:
        typeof msg.message === "string" ? msg.message : "Couldn’t read contacts.",
    });
    return;
  }
  if (msg.type === "opal_native_contacts_result") {
    const contacts = Array.isArray(msg.contacts)
      ? (msg.contacts as NativeContactRow[])
      : [];
    pending.resolve({
      status: "ok",
      permission: typeof msg.permission === "string" ? msg.permission : "granted",
      contacts,
      mode: msg.mode === "pick" ? "pick" : "search",
    });
  }
}

function newContactsRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `contacts-${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through */
  }
  return `contacts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ask the native host for contacts (search or full pick list).
 * Only selected rows should later be posted to invite APIs.
 */
export function requestNativeContacts(opts: {
  mode: "search" | "pick";
  query?: string;
  limit?: number;
  timeout_ms?: number;
}): Promise<NativeContactsResult> {
  ensureContactsListener();
  if (!shouldUseNativeContactsBridge()) {
    return Promise.resolve({
      status: "unavailable",
      message: "Native contacts bridge not available.",
    });
  }
  const request_id = newContactsRequestId();
  const timeout_ms = opts.timeout_ms ?? 20_000;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingContacts.delete(request_id);
      resolve({
        status: "error",
        message: "Contacts request timed out.",
      });
    }, timeout_ms);
    pendingContacts.set(request_id, { resolve, timer });
    postToNative({
      type: "opal_native_request_contacts",
      request_id,
      mode: opts.mode,
      query: opts.query,
      limit: opts.limit,
    });
  });
}

export function __testOnly_resetContactsBridge(): void {
  for (const p of pendingContacts.values()) clearTimeout(p.timer);
  pendingContacts.clear();
}

export function __testOnly_deliverContacts(detail: unknown): void {
  ensureContactsListener();
  deliverContactsDetail(detail);
}
