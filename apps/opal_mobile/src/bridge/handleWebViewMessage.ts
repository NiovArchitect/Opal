/**
 * Whitelisted WebView → native message router.
 * Auth (session / sign-out) + media requests only.
 */
import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import {
  buildMediaInjectScript,
  isAllowedInboundType,
  MEDIA_INBOUND_TYPE,
  parseMediaRequest,
  type MediaErrorMessage,
} from "./mediaBridgeContract";
import { acquireNativeMedia } from "./nativeMediaAcquisition";

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
  }
}
