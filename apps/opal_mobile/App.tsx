import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, View } from "react-native";
import { AppShell } from "./src/shell/AppShell";
import { ActivationScreen } from "./src/screens/ActivationScreen";
import {
  createInvitation,
  restoreSession,
  signOutProduct,
  type ProductSession,
} from "./src/api/productSession";

/**
 * Social Flow 18 — product entry.
 * Real API session when available; empty people-first shell after auth.
 * Synthetic fixture activation only. No DevAuth.
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
        <ActivityIndicator color="#1C8FA3" />
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
        <AppShell
          displayName={session.displayName}
          userId={session.userId}
          emptyPeopleStart
          onInvitePeople={async (people) => {
            for (const p of people) {
              await createInvitation(
                session.accessToken,
                p.phone,
                p.label,
                p.invite_source === "manual" ? "manual" : "selected_contact",
              );
            }
          }}
          onSignOut={async () => {
            await signOutProduct(session.accessToken);
            setSession(null);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
