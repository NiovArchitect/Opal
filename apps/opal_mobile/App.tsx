import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, View } from "react-native";
import type { Socket } from "phoenix";
import { ActivationScreen } from "./src/screens/ActivationScreen";
import { ProductWebSurface } from "./src/shell/ProductWebSurface";
import {
  restoreSession,
  signOutProduct,
  type ProductSession,
} from "./src/api/productSession";
import { connectSocketWithSession } from "./src/realtime/opalSocket";

/**
 * R1B — native host entry.
 * Secure session restore → R1A activation → current Opal web product surface.
 * Stale AppShell (Home/Chats/Plans/You) is NOT the authenticated product.
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
        // Ticket/connect failure is evidence, not a crash loop.
      }
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [session?.accessToken]);

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#05060A", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#A78BFA" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#05060A" }}>
        <StatusBar barStyle="light-content" />
        <ActivationScreen onAuthenticated={setSession} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#05060A" }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
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
    </SafeAreaView>
  );
}
