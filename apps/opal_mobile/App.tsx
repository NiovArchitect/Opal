import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, View } from "react-native";
import { ActivationScreen } from "./src/screens/ActivationScreen";
import { ProductWebSurface } from "./src/shell/ProductWebSurface";
import {
  restoreSession,
  signOutProduct,
  type ProductSession,
} from "./src/api/productSession";

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
