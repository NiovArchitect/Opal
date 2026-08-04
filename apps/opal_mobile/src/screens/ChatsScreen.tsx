import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export type ChatListItem = {
  conversationId: string;
  title: string;
  safetyState?: "ok" | "blocked";
  subtitle?: string;
};

type Props = {
  chats: ChatListItem[];
  onOpen: (conversationId: string) => void;
  onFindPeople?: () => void;
};

export function ChatsScreen({ chats, onOpen, onFindPeople }: Props) {
  return (
    <View style={styles.root} accessibilityLabel="Chats">
      <Text style={styles.header} accessibilityRole="header">
        Chats
      </Text>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.conversationId}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => onOpen(item.conversationId)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}${item.safetyState === "blocked" ? ", blocked" : ""}`}
            hitSlop={4}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>
              {item.safetyState === "blocked"
                ? "Messaging unavailable"
                : item.subtitle ?? "Conversation"}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap} testID="empty-people">
            <Text style={styles.emptyTitle}>Your people will show up here</Text>
            <Text style={styles.empty}>Invite someone you know to begin.</Text>
            {onFindPeople ? (
              <Pressable
                style={styles.cta}
                onPress={onFindPeople}
                accessibilityRole="button"
                accessibilityLabel="Find people you know"
              >
                <Text style={styles.ctaText}>Find people you know</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F14" },
  header: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    minHeight: 56,
  },
  title: { color: "#F8FAFC", fontSize: 16, fontWeight: "600" },
  sub: { color: "#94A3B8", fontSize: 13, marginTop: 4 },
  emptyWrap: { margin: 16, gap: 8 },
  emptyTitle: { color: "#F8FAFC", fontSize: 17, fontWeight: "600" },
  empty: { color: "#CBD5E1", fontSize: 15, lineHeight: 22 },
  cta: {
    marginTop: 8,
    backgroundColor: "#1C8FA3",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  ctaText: { color: "#fff", fontWeight: "600" },
});
