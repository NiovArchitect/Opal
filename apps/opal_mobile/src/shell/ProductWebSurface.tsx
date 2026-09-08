/**
 * R1B — post-auth product surface.
 * Renders CURRENT opal_web authority inside native host (one product).
 * Stale RN AppShell screens are not used here.
 */
import React, { useMemo, useRef } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { PRODUCT_WEB_URL } from "../config";

type Props = {
  accessToken: string;
  userId: string;
  displayName?: string;
  onSignOut: () => void | Promise<void>;
};

export function ProductWebSurface({ accessToken, userId, displayName, onSignOut }: Props) {
  const webRef = useRef<WebView>(null);

  const uri = useMemo(() => {
    const base = (PRODUCT_WEB_URL || "").replace(/\/$/, "");
    // Never put token in URL — inject via JS after load.
    return `${base}/?opal_native_host=1`;
  }, []);

  const injected = useMemo(() => {
    // Minimal bridge: hand session to web memory token helper if present.
    const payload = JSON.stringify({
      access_token: accessToken,
      user_id: userId,
      display_name: displayName || "",
      platform: Platform.OS,
    });
    return `
      (function() {
        try {
          var raw = ${payload};
          window.__OPAL_NATIVE_SESSION__ = raw;
          window.dispatchEvent(new CustomEvent('opal-native-session', { detail: raw }));
          try {
            sessionStorage.setItem('opal_native_host', '1');
          } catch (e) {}
        } catch (e) {}
        true;
      })();
    `;
  }, [accessToken, userId, displayName]);

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
      <View style={styles.topBar}>
        <Text style={styles.brand} numberOfLines={1}>
          Opal Graph
        </Text>
        <Pressable
          onPress={() => void onSignOut()}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          testID="native-sign-out"
          style={styles.btn}
        >
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
      </View>
      <WebView
        ref={webRef}
        source={{ uri }}
        style={styles.web}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color="#A78BFA" />
          </View>
        )}
        injectedJavaScriptBeforeContentLoaded={injected}
        injectedJavaScript={injected}
        onLoadEnd={() => {
          webRef.current?.injectJavaScript(injected);
        }}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        // Device must reach API with TLS as configured; no broad cleartext exceptions here.
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
