/**
 * Whitelisted WebView → native message router.
 * Auth (session / sign-out) + media + OC-6 speech requests.
 */
import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import {
  buildMediaInjectScript,
  buildNativeStopSpeakInjectScript,
  buildNativeTtsInjectScript,
  buildSpeechInjectScript,
  isAllowedInboundType,
  MEDIA_INBOUND_TYPE,
  parseMediaRequest,
  SPEECH_SPEAK_INBOUND_TYPE,
  SPEECH_START_INBOUND_TYPE,
  SPEECH_STOP_INBOUND_TYPE,
  type MediaErrorMessage,
} from "./mediaBridgeContract";
import { acquireNativeMedia } from "./nativeMediaAcquisition";
import {
  acquireNativeSpeech,
  speakNativeUtterance,
  stopNativeUtterance,
} from "./nativeSpeechAcquisition";
import {
  CONTACTS_INBOUND_TYPE,
  acquireNativeContacts,
  buildContactsInjectScript,
  parseContactsRequest,
} from "./nativeContactsAcquisition";

export type WebViewMessageHandlers = {
  onSignOut?: () => void | Promise<void>;
  onSession?: (msg: {
    access_token: string;
    user_id: string;
    display_name?: string;
    handle?: string;
    session_id?: string;
  }) => void | Promise<void>;
};

function deliver(
  webRef: RefObject<WebView | null>,
  script: string,
): void {
  try {
    webRef.current?.injectJavaScript(script);
  } catch {
    /* WebView may be unmounted */
  }
}

function injectError(
  webRef: RefObject<WebView | null>,
  error: MediaErrorMessage,
): void {
  deliver(webRef, buildMediaInjectScript(error));
}

/**
 * Parse + dispatch a single WebView onMessage payload.
 * Unknown types are ignored (never executed as commands).
 */
export async function handleWebViewMessage(
  rawData: string,
  webRef: RefObject<WebView | null>,
  handlers: WebViewMessageHandlers,
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object") return;
  const type = (parsed as { type?: unknown }).type;
  if (!isAllowedInboundType(type)) {
    return;
  }

  if (type === "opal_native_sign_out") {
    await handlers.onSignOut?.();
    return;
  }

  if (type === "opal_native_session") {
    const msg = parsed as {
      access_token?: string;
      user_id?: string;
      display_name?: string;
      handle?: string;
      session_id?: string;
    };
    if (!msg.access_token || !msg.user_id) return;
    await handlers.onSession?.({
      access_token: msg.access_token,
      user_id: msg.user_id,
      display_name: msg.display_name,
      handle: msg.handle,
      session_id: msg.session_id,
    });
    return;
  }

  if (type === MEDIA_INBOUND_TYPE) {
    const parsedReq = parseMediaRequest(parsed);
    if (!parsedReq.ok) {
      if (parsedReq.request_id) {
        injectError(webRef, {
          type: "opal_native_media_error",
          request_id: parsedReq.request_id,
          code: parsedReq.code,
          message: parsedReq.message,
        });
      }
      return;
    }
    const outbound = await acquireNativeMedia(parsedReq.request);
    deliver(webRef, buildMediaInjectScript(outbound));
    return;
  }

  // Phase OC-6 / P0 — real native STT (expo-speech-recognition) + TTS (expo-speech).
  // Falls back to WebView speechSynthesis inject when expo-speech is missing.
  if (type === SPEECH_START_INBOUND_TYPE) {
    const msg = parsed as { request_id?: string };
    const request_id =
      typeof msg.request_id === "string" ? msg.request_id.trim() : "";
    if (!request_id) return;
    const outbound = await acquireNativeSpeech(request_id);
    deliver(webRef, buildSpeechInjectScript(outbound));
    return;
  }

  if (type === SPEECH_SPEAK_INBOUND_TYPE) {
    const msg = parsed as { request_id?: string; text?: string };
    const request_id =
      typeof msg.request_id === "string" ? msg.request_id.trim() : "";
    const text = typeof msg.text === "string" ? msg.text : "";
    if (!request_id) return;
    const spoken = await speakNativeUtterance(request_id, text);
    if (spoken.via === "fallback") {
      // Pre-rebuild / missing expo-speech — WebView speechSynthesis.
      deliver(webRef, buildNativeTtsInjectScript(request_id, text));
    } else {
      deliver(webRef, buildSpeechInjectScript(spoken.message));
    }
    return;
  }

  if (type === SPEECH_STOP_INBOUND_TYPE) {
    stopNativeUtterance();
    deliver(webRef, buildNativeStopSpeakInjectScript());
    return;
  }

  if (type === CONTACTS_INBOUND_TYPE) {
    const parsedReq = parseContactsRequest(parsed);
    if (!parsedReq.ok) {
      if (parsedReq.request_id) {
        deliver(
          webRef,
          buildContactsInjectScript({
            type: "opal_native_contacts_error",
            request_id: parsedReq.request_id,
            code: parsedReq.code,
            message: parsedReq.message,
          }),
        );
      }
      return;
    }
    const outbound = await acquireNativeContacts(parsedReq.request);
    deliver(webRef, buildContactsInjectScript(outbound));
  }
}
