import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import { ConversationScreen } from "./src/screens/ConversationScreen";
import { SYNTHETIC } from "./src/config";

/**
 * Thin Slice 2 shell — conversation only.
 * Synthetic development identity; no phone auth.
 */
export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F14" }}>
      <StatusBar barStyle="light-content" />
      <ConversationScreen
        userId={SYNTHETIC.alexUserId}
        peerLabel="Jordan (synthetic)"
        conversationId={SYNTHETIC.alexJordanConversationId}
        deviceId="mobile-alex-1"
      />
    </SafeAreaView>
  );
}
