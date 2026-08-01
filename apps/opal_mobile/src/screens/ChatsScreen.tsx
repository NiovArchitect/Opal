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
};

export function ChatsScreen({ chats, onOpen }: Props) {
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
          <Text style={styles.empty}>Connect with someone to start a conversation.</Text>
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
  empty: { margin: 16, color: "#CBD5E1", fontSize: 15 },
});
