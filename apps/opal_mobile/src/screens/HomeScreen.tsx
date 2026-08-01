import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { buildHomeSnapshot, completeNeedsYouItem, NEEDS_YOU_EMPTY } from "../shell/homeModel";
import { UnifiedSignalCard } from "../shell/UnifiedSignalCard";
import type { ComingUpItem, NeedsYouItem } from "../shell/types";

type Props = {
  displayName: string;
  initialNeedsYou: NeedsYouItem[];
  comingUp: ComingUpItem[];
  onOpenChat?: (conversationId?: string | null) => void;
  offline?: boolean;
};

export function HomeScreen({
  displayName,
  initialNeedsYou,
  comingUp,
  onOpenChat,
  offline,
}: Props) {
  const [needs, setNeeds] = useState(initialNeedsYou);
  const home = useMemo(
    () =>
      buildHomeSnapshot({
        displayName,
        needsYou: needs,
        comingUp,
        connectionState: offline ? "offline" : "online",
      }),
    [displayName, needs, comingUp, offline],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      accessibilityLabel="Home"
    >
      <Text style={styles.greeting} accessibilityRole="header">
        {home.greeting}
      </Text>
      {offline ? (
        <Text style={styles.offline} accessibilityLiveRegion="polite">
          You’re offline. Changes will sync when you reconnect.
        </Text>
      ) : null}

      <Text style={styles.section}>Needs you</Text>
      {home.needs_you.length === 0 ? (
        <Text style={styles.empty} accessibilityLiveRegion="polite">
          {home.needs_you_empty_copy ?? NEEDS_YOU_EMPTY}
        </Text>
      ) : (
        home.needs_you.map((item) => (
          <UnifiedSignalCard
            key={item.id}
            sourceType={item.source_type}
            title={item.title}
            explanation={item.explanation}
            primaryAction={item.primary_action}
            privacyClass={item.privacy_class}
            onPrimary={() => {
              setNeeds((prev) => completeNeedsYouItem(prev, item.id));
              onOpenChat?.(item.conversation_id);
            }}
            testID={`needs-you-${item.id}`}
          />
        ))
      )}

      <Text style={styles.section}>Coming up</Text>
      {home.coming_up.length === 0 ? (
        <Text style={styles.empty}>No upcoming plans.</Text>
      ) : (
        home.coming_up.map((p) => (
          <Pressable
            key={p.id}
            style={styles.planCard}
            onPress={() => onOpenChat?.(p.conversation_id)}
            accessibilityRole="button"
            accessibilityLabel={`${p.title}. ${p.when_label ?? ""}`}
          >
            <Text style={styles.planTitle}>{p.title}</Text>
            {p.when_label ? <Text style={styles.planMeta}>{p.when_label}</Text> : null}
            {p.who_label ? <Text style={styles.planMeta}>With {p.who_label}</Text> : null}
            {p.where_label ? <Text style={styles.planMeta}>{p.where_label}</Text> : null}
          </Pressable>
        ))
      )}

      {home.recent_changes.length > 0 ? (
        <>
          <Text style={styles.section}>Recent changes</Text>
          {home.recent_changes.map((c) => (
            <View key={c.id} style={styles.change}>
              <Text style={styles.planTitle}>{c.title}</Text>
              <Text style={styles.planMeta}>{c.explanation}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F14" },
  content: { paddingBottom: 32 },
  greeting: {
    marginTop: 16,
    marginHorizontal: 16,
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  offline: {
    marginHorizontal: 16,
    marginTop: 8,
    color: "#FBBF24",
    fontSize: 13,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  empty: {
    marginHorizontal: 16,
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
  },
  planCard: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#121A24",
    borderWidth: 1,
    borderColor: "#2A3544",
    minHeight: 44,
  },
  planTitle: { color: "#F8FAFC", fontSize: 16, fontWeight: "600" },
  planMeta: { color: "#94A3B8", fontSize: 14, marginTop: 4 },
  change: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
});
