import React, { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import type { Socket } from "phoenix";
import { ActivationScreen } from "./src/screens/ActivationScreen";
import { NativeFirstRunSurface } from "./src/shell/NativeFirstRunSurface";
import { ProductWebSurface } from "./src/shell/ProductWebSurface";
import {
  restoreSession,
  signOutProduct,
  type ProductSession,
} from "./src/api/productSession";
import { connectSocketWithSession } from "./src/realtime/opalSocket";
import { PRODUCT_WEB_URL } from "./src/config";

/**
 * R1B+ native host entry.
 * Unauthenticated: Brand V4 first-run/auth via WebView (Figma owners).
 * Authenticated: SecureStore session → ProductWebSurface + Phoenix ticket.
 * Stale AppShell is NOT the product.
 */
export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<ProductSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await restoreSession();
      if (!cancelled) {
        setSession(restored);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Native Phoenix proof: socket_ticket from SecureStore session (not raw user_id).
  useEffect(() => {
    if (!session?.accessToken) return;
    let socket: Socket | null = null;
    let cancelled = false;
    (async () => {
      try {
        const s = await connectSocketWithSession({
          accessToken: session.accessToken,
          deviceId: "OpalMobile",
          appState: "foreground",
          clientVersion: "opal-mobile-r1b-0.1.0",
        });
        if (cancelled) {
          s.disconnect();
          return;
        }
        socket = s;
      } catch {
        /* ticket/connect failure is evidence, not a crash loop */
      }
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [session?.accessToken]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#A78BFA" />
      </View>
    );
  }

  if (!session) {
    // ONE_NATIVE_STAGE: full-bleed Brand V4 first-run (no SafeAreaView double pad).
    if (PRODUCT_WEB_URL) {
      return <NativeFirstRunSurface onAuthenticated={setSession} />;
    }
    return (
      <View style={styles.boot}>
        <StatusBar barStyle="light-content" />
        <ActivationScreen onAuthenticated={setSession} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ProductWebSurface
        accessToken={session.accessToken}
        userId={session.userId}
        displayName={session.displayName}
        onSignOut={async () => {
          await signOutProduct(session.accessToken);
          setSession(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: "#020305",
    justifyContent: "center",
  },
  root: {
    flex: 1,
    backgroundColor: "#020305",
  },
});
