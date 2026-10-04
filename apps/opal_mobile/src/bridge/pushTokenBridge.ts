/**
 * Phase 2C — Expo push token acquisition + host→FE inject.
 * Permission once after auth. Denied → silent (no nag).
 */
import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import {
  PUSH_TOKEN_OUTBOUND_TYPE,
  buildPushTokenInjectScript,
  isAllowedOutboundType,
} from "./mediaBridgeContract";

export type PushNotificationsModule = {
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (opts?: {
    projectId?: string;
  }) => Promise<{ data: string }>;
};

function loadNotifications(): PushNotificationsModule | null {
  try {
    // Lazy require — native module may be absent until a rebuild with the plugin.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as PushNotificationsModule;
  } catch {
    return null;
  }
}

function resolveProjectId(): string | undefined {
  try {
    // Lazy require — keeps Jest from parsing ESM expo-constants at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants")?.default ?? require("expo-constants");
    const extra = Constants?.expoConfig?.extra as
      | { eas?: { projectId?: string } }
      | undefined;
    return (
      extra?.eas?.projectId ||
      (Constants as { easConfig?: { projectId?: string } })?.easConfig?.projectId
    );
  } catch {
    return undefined;
  }
}

/**
 * Request notification permission (once). If granted, return Expo push token.
 * Denied / unavailable → null (silent).
 */
export async function acquireExpoPushToken(
  notifications: PushNotificationsModule | null = loadNotifications(),
): Promise<string | null> {
  if (!notifications) return null;

  try {
    const existing = await notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const asked = await notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return null;

    const projectId = resolveProjectId();
    const tokenResult = projectId
      ? await notifications.getExpoPushTokenAsync({ projectId })
      : await notifications.getExpoPushTokenAsync();
    const token = tokenResult?.data;
    if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function deliverPushToken(
  webRef: RefObject<WebView | null>,
  expoPushToken: string,
): boolean {
  if (!isAllowedOutboundType(PUSH_TOKEN_OUTBOUND_TYPE)) return false;
  const script = buildPushTokenInjectScript({
    type: PUSH_TOKEN_OUTBOUND_TYPE,
    expo_push_token: expoPushToken,
  });
  try {
    webRef.current?.injectJavaScript(script);
    return true;
  } catch {
    return false;
  }
}

/**
 * Post-auth: acquire token and inject into the product WebView.
 * Never throws into the product surface.
 */
export async function bridgeExpoPushTokenAfterAuth(
  webRef: RefObject<WebView | null>,
  notifications?: PushNotificationsModule | null,
): Promise<{ bridged: boolean; token: string | null }> {
  const token = await acquireExpoPushToken(
    notifications === undefined ? loadNotifications() : notifications,
  );
  if (!token) return { bridged: false, token: null };
  const bridged = deliverPushToken(webRef, token);
  return { bridged, token };
}
