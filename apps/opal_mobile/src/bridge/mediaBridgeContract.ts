/**
 * Tranche #1 — WebView ↔ native media bridge contract.
 * Whitelisted message types only. Shared conceptual schema with opal_web.
 */

export const MEDIA_INBOUND_TYPE = "opal_native_request_media" as const;
export const MEDIA_RESULT_TYPE = "opal_native_media_result" as const;
export const MEDIA_CANCELLED_TYPE = "opal_native_media_cancelled" as const;
export const MEDIA_ERROR_TYPE = "opal_native_media_error" as const;

/** Phase 2C — host → FE push token (outbound whitelist). */
export const PUSH_TOKEN_OUTBOUND_TYPE = "opal_push_token" as const;

/** Existing auth bridge types — must remain accepted. */
export const AUTH_INBOUND_TYPES = [
  "opal_native_session",
  "opal_native_sign_out",
] as const;

/** Phase OC-6 — speech STT/TTS inbound (minimal; no full audio framework). */
export const SPEECH_START_INBOUND_TYPE = "opal_native_start_speech" as const;
export const SPEECH_SPEAK_INBOUND_TYPE = "opal_native_speak_text" as const;
export const SPEECH_STOP_INBOUND_TYPE = "opal_native_stop_speak" as const;

export const SPEECH_INBOUND_TYPES = [
  SPEECH_START_INBOUND_TYPE,
  SPEECH_SPEAK_INBOUND_TYPE,
  SPEECH_STOP_INBOUND_TYPE,
] as const;

export const SPEECH_RESULT_OUTBOUND_TYPE = "opal_native_speech_result" as const;
export const SPEECH_ERROR_OUTBOUND_TYPE = "opal_native_speech_error" as const;
export const SPEECH_TTS_DONE_OUTBOUND_TYPE = "opal_native_tts_done" as const;

export const ALLOWED_INBOUND_TYPES = [
  ...AUTH_INBOUND_TYPES,
  MEDIA_INBOUND_TYPE,
  ...SPEECH_INBOUND_TYPES,
] as const;

/** Host → FE message types (injectJavaScript). */
export const ALLOWED_OUTBOUND_TYPES = [
  MEDIA_RESULT_TYPE,
  MEDIA_CANCELLED_TYPE,
  MEDIA_ERROR_TYPE,
  PUSH_TOKEN_OUTBOUND_TYPE,
  SPEECH_RESULT_OUTBOUND_TYPE,
  SPEECH_ERROR_OUTBOUND_TYPE,
  SPEECH_TTS_DONE_OUTBOUND_TYPE,
] as const;

export type MediaSource = "camera" | "photo_library" | "document";
export type InitiatingSurface =
  | "center"
  | "story"
  | "graph_create"
  | "first_run"
  | "unknown";

export type MediaErrorCode =
  | "permission_denied"
  | "unavailable"
  | "invalid_request"
  | "read_failed"
  | "unsupported_type"
  | "too_large"
  | "cancelled_internal";

export type MediaRequestMessage = {
  type: typeof MEDIA_INBOUND_TYPE;
  request_id: string;
  source: MediaSource;
  initiating_surface: InitiatingSurface;
  media_types?: Array<"image" | "video">;
  accepted_mime_types?: string[];
  allows_editing?: boolean;
};

export type MediaAssetPayload = {
  mime_type: string;
  filename?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  byte_size?: number;
  /** data: URL safe for WebView preview / handoff (no raw filesystem path). */
  preview_url: string;
};

export type MediaResultMessage = {
  type: typeof MEDIA_RESULT_TYPE;
  request_id: string;
  source: MediaSource;
  initiating_surface: InitiatingSurface;
  asset: MediaAssetPayload;
};

export type MediaCancelledMessage = {
  type: typeof MEDIA_CANCELLED_TYPE;
  request_id: string;
  source: MediaSource;
  initiating_surface: InitiatingSurface;
};

export type MediaErrorMessage = {
  type: typeof MEDIA_ERROR_TYPE;
  request_id: string;
  source?: MediaSource;
  initiating_surface?: InitiatingSurface;
  code: MediaErrorCode;
  message: string;
};

export type MediaOutboundMessage =
  | MediaResultMessage
  | MediaCancelledMessage
  | MediaErrorMessage;

/** ~6 MB binary ≈ ~8 MB base64 — keep injectJavaScript payloads bounded. */
export const MAX_MEDIA_BYTES = 6 * 1024 * 1024;

const SOURCES: MediaSource[] = ["camera", "photo_library", "document"];
const SURFACES: InitiatingSurface[] = [
  "center",
  "story",
  "graph_create",
  "first_run",
  "unknown",
];

export function isAllowedInboundType(type: unknown): boolean {
  return (
    typeof type === "string" &&
    (ALLOWED_INBOUND_TYPES as readonly string[]).includes(type)
  );
}

export function isAllowedOutboundType(type: unknown): boolean {
  return (
    typeof type === "string" &&
    (ALLOWED_OUTBOUND_TYPES as readonly string[]).includes(type)
  );
}

export type PushTokenOutboundMessage = {
  type: typeof PUSH_TOKEN_OUTBOUND_TYPE;
  expo_push_token: string;
};

export function parseMediaRequest(raw: unknown):
  | { ok: true; request: MediaRequestMessage }
  | { ok: false; code: MediaErrorCode; message: string; request_id?: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "invalid_request", message: "Invalid media request." };
  }
  const msg = raw as Record<string, unknown>;
  if (msg.type !== MEDIA_INBOUND_TYPE) {
    return { ok: false, code: "invalid_request", message: "Unknown media message." };
  }
  const request_id = typeof msg.request_id === "string" ? msg.request_id.trim() : "";
  if (!request_id || request_id.length > 128) {
    return {
      ok: false,
      code: "invalid_request",
      message: "Media request is missing a valid request id.",
    };
  }
  const source = msg.source;
  if (typeof source !== "string" || !SOURCES.includes(source as MediaSource)) {
    return {
      ok: false,
      code: "invalid_request",
      message: "Unsupported media source.",
      request_id,
    };
  }
  let initiating_surface: InitiatingSurface = "unknown";
  if (
    typeof msg.initiating_surface === "string" &&
    SURFACES.includes(msg.initiating_surface as InitiatingSurface)
  ) {
    initiating_surface = msg.initiating_surface as InitiatingSurface;
  }

  const media_types = Array.isArray(msg.media_types)
    ? (msg.media_types.filter((t) => t === "image" || t === "video") as Array<
        "image" | "video"
      >)
    : undefined;
  const accepted_mime_types = Array.isArray(msg.accepted_mime_types)
    ? msg.accepted_mime_types.filter((t): t is string => typeof t === "string").slice(0, 32)
    : undefined;

  return {
    ok: true,
    request: {
      type: MEDIA_INBOUND_TYPE,
      request_id,
      source: source as MediaSource,
      initiating_surface,
      media_types: media_types?.length ? media_types : undefined,
      accepted_mime_types,
      allows_editing: msg.allows_editing === true,
    },
  };
}

export function userSafePermissionDenied(source: MediaSource): string {
  if (source === "camera") {
    return "Camera access is off. Enable Camera for Opal Graph in iOS Settings to capture photos or video.";
  }
  if (source === "photo_library") {
    return "Photo access is off. Enable Photos for Opal Graph in iOS Settings to choose a library item.";
  }
  return "This document picker isn’t available right now.";
}

/** Escape payload for injectJavaScript — JSON then wrap in JS. */
export function buildMediaInjectScript(message: MediaOutboundMessage): string {
  const json = JSON.stringify(message);
  const safe = json.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `
    (function() {
      try {
        var detail = ${safe};
        window.dispatchEvent(new CustomEvent('opal-native-media', { detail: detail }));
        if (typeof window.__opalNativeMediaDeliver === 'function') {
          window.__opalNativeMediaDeliver(detail);
        }
      } catch (e) {}
      true;
    })();
  `;
}

/** Phase 2C — inject Expo push token into the product WebView. */
export function buildPushTokenInjectScript(
  message: PushTokenOutboundMessage,
): string {
  const json = JSON.stringify(message);
  const safe = json.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `
    (function() {
      try {
        var detail = ${safe};
        window.dispatchEvent(new CustomEvent('opal-push-token', { detail: detail }));
        if (typeof window.__opalPushTokenDeliver === 'function') {
          window.__opalPushTokenDeliver(detail);
        }
      } catch (e) {}
      true;
    })();
  `;
}

export type SpeechOutboundMessage =
  | {
      type: typeof SPEECH_RESULT_OUTBOUND_TYPE;
      request_id: string;
      text: string;
    }
  | {
      type: typeof SPEECH_ERROR_OUTBOUND_TYPE;
      request_id: string;
      code: string;
      message?: string;
    }
  | {
      type: typeof SPEECH_TTS_DONE_OUTBOUND_TYPE;
      request_id: string;
    };

/** Phase OC-6 — deliver STT/TTS bridge events into the product WebView. */
export function buildSpeechInjectScript(message: SpeechOutboundMessage): string {
  const json = JSON.stringify(message);
  const safe = json.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const eventName =
    message.type === SPEECH_TTS_DONE_OUTBOUND_TYPE
      ? "opal-native-tts-done"
      : "opal-native-speech";
  return `
    (function() {
      try {
        var detail = ${safe};
        window.dispatchEvent(new CustomEvent('${eventName}', { detail: detail }));
        if (typeof window.__opalNativeSpeechDeliver === 'function' && detail.type !== 'opal_native_tts_done') {
          window.__opalNativeSpeechDeliver(detail);
        }
      } catch (e) {}
      true;
    })();
  `;
}

/**
 * Speak via the WebView's platform speechSynthesis (WKWebView / Chrome).
 * Caps utterance and signals completion back to the FE bridge.
 */
export function buildNativeTtsInjectScript(
  request_id: string,
  text: string,
): string {
  const payload = JSON.stringify({
    request_id,
    text: String(text || "").slice(0, 800),
  });
  const safe = payload.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `
    (function() {
      try {
        var p = ${safe};
        var done = function() {
          try {
            var detail = { type: 'opal_native_tts_done', request_id: p.request_id };
            window.dispatchEvent(new CustomEvent('opal-native-tts-done', { detail: detail }));
          } catch (e) {}
        };
        if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
          done();
          return;
        }
        try { window.speechSynthesis.cancel(); } catch (e) {}
        var u = new SpeechSynthesisUtterance(p.text || '');
        var settled = false;
        var finish = function() {
          if (settled) return;
          settled = true;
          try { clearTimeout(hard); } catch (e) {}
          done();
        };
        var hard = setTimeout(function() {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          finish();
        }, 30000);
        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.speak(u);
      } catch (e) {
        try {
          window.dispatchEvent(new CustomEvent('opal-native-tts-done', {
            detail: { type: 'opal_native_tts_done', request_id: ${JSON.stringify(request_id)} }
          }));
        } catch (e2) {}
      }
      true;
    })();
  `;
}

export function buildNativeStopSpeakInjectScript(): string {
  return `
    (function() {
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {}
      true;
    })();
  `;
}
