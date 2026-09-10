/**
 * POST-R1B visual parity — unauthenticated native host stage.
 *
 * Loads CURRENT Brand V4 / Figma first-run + auth owners from opal_web
 * (Splash 618:19 → Promise → Phone 773:27 → OTP 773:52).
 * Twilio is transport only; Opal owns every pixel.
 *
 * On auth success, web posts `opal_native_session` → SecureStore on host.
 */
import React, { useMemo, useRef } from "react";
import { ActivityIndicator, Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { PRODUCT_WEB_URL } from "../config";
import { saveProductSession, type ProductSession } from "../api/productSession";

type Props = {
  onAuthenticated: (session: ProductSession) => void;
};

export function NativeFirstRunSurface({ onAuthenticated }: Props) {
  const webRef = useRef<WebView>(null);
  const handedOff = useRef(false);

  const uri = useMemo(() => {
    const base = (PRODUCT_WEB_URL || "").replace(/\/$/, "");
    // Full Brand V4 first-run progression; never put tokens in the URL.
    return `${base}/?opal_native_host=1&opal_reset_first_run=1`;
  }, []);

  const bootInject = useMemo(
    () => `
      (function() {
        try {
          document.documentElement.classList.add('opal-native-host');
          sessionStorage.setItem('opal_native_host', '1');
          sessionStorage.setItem('opal_reset_first_run', '1');
        } catch (e) {}
        true;
      })();
    `,
    [],
  );

  const onMessage = async (event: WebViewMessageEvent) => {
    if (handedOff.current) return;
    let data: unknown;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    const msg = data as {
      type?: string;
      access_token?: string;
      user_id?: string;
      display_name?: string;
      handle?: string;
      session_id?: string;
    };
    if (msg?.type !== "opal_native_session") return;
    if (!msg.access_token || !msg.user_id) return;

    handedOff.current = true;
    const session: ProductSession = {
      accessToken: msg.access_token,
      userId: msg.user_id,
      displayName: msg.display_name || "Opal",
      handle: msg.handle,
      sessionId: msg.session_id,
    };
    await saveProductSession(session);
    onAuthenticated(session);
  };

  if (!PRODUCT_WEB_URL) {
    return (
      <View style={styles.missing} testID="native-first-run-missing-url">
        <Text style={styles.warn}>
          Set EXPO_PUBLIC_OPAL_WEB_URL so native host can load Brand V4 first-run.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="native-first-run-surface">
      <StatusBar barStyle="light-content" />
      <WebView
        ref={webRef}
        source={{ uri }}
        style={styles.web}
        originWhitelist={["*"]}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#A78BFA" />
          </View>
        )}
        injectedJavaScriptBeforeContentLoaded={bootInject}
        onMessage={(e) => {
          void onMessage(e);
        }}
        // iOS WKWebView: allow LAN HTTP to local Vite in development.
        {...(Platform.OS === "ios"
          ? { allowsInlineMediaPlayback: true }
          : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020305",
  },
  web: {
    flex: 1,
    backgroundColor: "#020305",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020305",
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#020305",
  },
  warn: { color: "#E9D5FF", textAlign: "center" },
});
