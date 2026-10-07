/**
 * Phase 2/3 — Expo notification → incoming_call → CallKit or WebView inject.
 *
 * Sound: Expo `sound: "default"` from backend. CallKit provides the native
 * ringtone when displayIncomingCall succeeds; otherwise the full-screen
 * in-app fallback plays the system notification sound.
 */
import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import {
  displayIncomingCall,
  endCallKeep,
  isCallKeepAvailable,
  type IncomingCallKitPayload,
} from "./callKeepBridge";

export type ExpoNotificationsLike = {
  addNotificationReceivedListener: (
    listener: (notification: { request: { content: { data?: Record<string, unknown> } } }) => void,
  ) => { remove: () => void };
  addNotificationResponseReceivedListener: (
    listener: (response: {
      notification: { request: { content: { data?: Record<string, unknown> } } };
    }) => void,
  ) => { remove: () => void };
  setNotificationHandler?: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => void;
};

function loadNotifications(): ExpoNotificationsLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as ExpoNotificationsLike;
  } catch {
    return null;
  }
}

function asIncoming(data: Record<string, unknown> | undefined): IncomingCallKitPayload | null {
  if (!data || data.type !== "incoming_call") return null;
  if (typeof data.call_id !== "string" || !data.call_id) return null;
  return {
    call_id: data.call_id,
    caller_id: String(data.caller_id || ""),
    caller_name: String(data.caller_name || "Incoming call"),
    caller_avatar_url: typeof data.caller_avatar_url === "string" ? data.caller_avatar_url : "",
    call_type: data.call_type === "video" ? "video" : "audio",
    conversation_id: typeof data.conversation_id === "string" ? data.conversation_id : null,
    timestamp: typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString(),
  };
}

function injectIncomingCall(webRef: RefObject<WebView | null>, payload: IncomingCallKitPayload) {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const script = `
    (function(){
      try {
        window.dispatchEvent(new CustomEvent("opal-incoming-call", { detail: ${json} }));
      } catch (e) {}
      true;
    })();
  `;
  try {
    webRef.current?.injectJavaScript(script);
  } catch {
    /* ignore */
  }
}

export type IncomingCallPushSubscriptions = {
  remove: () => void;
};

/**
 * Subscribe to Expo notification events. On incoming_call:
 * 1) Try CallKit display within 2s
 * 2) Always inject into WebView so FE IncomingCallHandler can route
 */
export function installIncomingCallPushListeners(
  webRef: RefObject<WebView | null>,
  notifications: ExpoNotificationsLike | null = loadNotifications(),
): IncomingCallPushSubscriptions {
  if (!notifications) {
    return { remove: () => undefined };
  }

  notifications.setNotificationHandler?.({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const onPayload = (data: Record<string, unknown> | undefined) => {
    const receivedAt = Date.now();
    const payload = asIncoming(data);
    if (!payload) return;

    const pushTs = payload.timestamp ? Date.parse(payload.timestamp) : NaN;
    const lagMs = Number.isFinite(pushTs) ? receivedAt - pushTs : null;
    console.info("[opal-call] native push incoming_call", {
      call_id: payload.call_id,
      lag_ms: lagMs,
      callkeep: isCallKeepAvailable(),
    });

    const kitStarted = Date.now();
    void displayIncomingCall(payload).then((ok) => {
      console.info("[opal-call] CallKit present timing", {
        call_id: payload.call_id,
        ok,
        present_ms: Date.now() - kitStarted,
      });
    });

    injectIncomingCall(webRef, payload);
  };

  const sub1 = notifications.addNotificationReceivedListener((n) => {
    onPayload(n?.request?.content?.data);
  });
  const sub2 = notifications.addNotificationResponseReceivedListener((r) => {
    onPayload(r?.notification?.request?.content?.data);
  });

  return {
    remove: () => {
      try {
        sub1.remove();
        sub2.remove();
      } catch {
        /* ignore */
      }
    },
  };
}

export function hangupNativeCall(callId: string) {
  void endCallKeep(callId);
}
