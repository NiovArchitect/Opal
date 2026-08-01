import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import { AppShell } from "./src/shell/AppShell";

/**
 * Social Flow 11 — conversation-native product shell.
 * Home · Chats · Plans · You. Synthetic development fixtures only.
 */
export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F14" }}>
      <StatusBar barStyle="light-content" />
      <AppShell displayName="Alex" />
    </SafeAreaView>
  );
}
