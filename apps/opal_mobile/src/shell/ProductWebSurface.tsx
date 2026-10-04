/**
 * R1B — post-auth product surface.
 * Renders CURRENT opal_web authority inside native host (one product).
 * Stale RN AppShell screens are not used here.
 * Tranche #1: additive media bridge (camera / library / document) on same channel.
 * Phase 2C: after auth + WebView load, bridge Expo push token once (permission silent if denied).
 */
import React, { useMemo, useRef } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { handleWebViewMessage } from "../bridge/handleWebViewMessage";
import { bridgeExpoPushTokenAfterAuth } from "../bridge/pushTokenBridge";
import { PRODUCT_WEB_URL } from "../config";
// Pressable/Text retained for missing-URL fallback Sign out control.

type Props = {
  accessToken: string;
  userId: string;
  displayName?: string;
  onSignOut: () => void | Promise<void>;
};

export function ProductWebSurface({ accessToken, userId, displayName, onSignOut }: Props) {
  const webRef = useRef<WebView>(null);
  const pushBridgedRef = useRef(false);

  const uri = useMemo(() => {
    const base = (PRODUCT_WEB_URL || "").replace(/\/$/, "");
    // Never put token in URL — inject via JS after load.
    return `${base}/?opal_native_host=1`;
  }, []);

  // Runtime proof (no product UI): native logs + window binding for Web Inspector.
  // EXPO_PUBLIC_* is bake-time; force-quit cannot change PRODUCT_WEB_URL.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[OpalHost] PRODUCT_WEB_URL=", PRODUCT_WEB_URL, "webview.uri=", uri);
  }

  const injected = useMemo(() => {
    // Minimal bridge: hand session to web memory token helper if present.
    const payload = JSON.stringify({
      access_token: accessToken,
      user_id: userId,
      display_name: displayName || "",
      platform: Platform.OS,
    });
    const hostUrl = JSON.stringify(PRODUCT_WEB_URL || "");
    const hostUri = JSON.stringify(uri);
    return `
      (function() {
        try {
          document.documentElement.classList.add('opal-native-host');
          window.__OPAL_HOST_WEB_URL__ = ${hostUrl};
          window.__OPAL_HOST_WEB_URI__ = ${hostUri};
          document.documentElement.setAttribute('data-opal-host-web-url', ${hostUrl});
          var raw = ${payload};
          window.__OPAL_NATIVE_SESSION__ = raw;
          window.dispatchEvent(new CustomEvent('opal-native-session', { detail: raw }));
          try {
            sessionStorage.setItem('opal_native_host', '1');
            sessionStorage.setItem('opal_host_web_url', ${hostUrl});
          } catch (e) {}
        } catch (e) {}
        true;
      })();
    `;
  }, [accessToken, userId, displayName, uri]);

  if (!PRODUCT_WEB_URL) {
    return (
      <View style={styles.center} testID="product-web-missing-url">
        <Text style={styles.warn}>
          Set EXPO_PUBLIC_OPAL_WEB_URL to the current Opal web product (LAN HTTPS/HTTP for device).
        </Text>
        <Pressable onPress={() => void onSignOut()} style={styles.btn} accessibilityRole="button">
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="product-web-surface">
      {/* ONE_NATIVE_STAGE: no host chrome bar — Brand V4 member shell owns the pixels.
          Sign-out remains available via web You / Account; host also accepts
          `opal_native_sign_out` postMessage for revoke proofs. */}
      <WebView
        ref={webRef}
        source={{ uri }}
        style={styles.web}
        startInLoadingState
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color="#A78BFA" />
          </View>
        )}
        injectedJavaScriptBeforeContentLoaded={injected}
        injectedJavaScript={injected}
        onLoadEnd={() => {
          webRef.current?.injectJavaScript(injected);
          // Phase 2C — post-auth only (this surface mounts after session). Once per mount.
          if (!pushBridgedRef.current) {
            pushBridgedRef.current = true;
            void bridgeExpoPushTokenAfterAuth(webRef).then((result) => {
              if (__DEV__ && result.bridged) {
                // eslint-disable-next-line no-console
                console.log("[OpalHost] expo push token bridged");
              }
            });
          }
        }}
        onMessage={(event) => {
          void handleWebViewMessage(event.nativeEvent.data, webRef, {
            onSignOut,
          });
        }}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        {...(Platform.OS === "ios"
          ? { allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false }
          : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05060A" },
  topBar: {
    height: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(167,139,250,0.35)",
  },
  brand: { color: "#F5F3FF", fontWeight: "700", fontSize: 15, flex: 1, marginRight: 8 },
  web: { flex: 1, backgroundColor: "#05060A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  warn: { color: "#E9D5FF", textAlign: "center", marginBottom: 16 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(139,92,246,0.35)",
  },
  btnText: { color: "#F5F3FF", fontWeight: "600", fontSize: 13 },
});
