import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Channel, Socket } from "phoenix";
import {
  ackDelivered,
  connectSocket,
  joinConversation,
  sendText,
  syncHistory,
} from "../realtime/opalSocket";
import { loadMessages, saveMessages, upsertMessage } from "../storage/messageStore";
import type { ChatMessage, ServerMessage } from "../types";

type Props = {
  userId: string;
  conversationId: string;
  deviceId: string;
  peerLabel: string;
};

function fromServer(m: ServerMessage, fallback?: ChatMessage): ChatMessage {
  return {
    id: m.id,
    clientMessageId: m.client_message_id,
    conversationId: m.conversation_id,
    senderUserId: m.sender_user_id,
    body: m.body,
    serverSeq: m.server_seq,
    deliveryState:
      m.delivery_state === "delivered"
        ? "delivered"
        : m.delivery_state === "persisted"
          ? "persisted"
          : "accepted",
    createdAt: m.created_at ?? fallback?.createdAt ?? new Date().toISOString(),
  };
}

export function ConversationScreen({
  userId,
  conversationId,
  deviceId,
  peerLabel,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("connecting");
  const channelRef = React.useRef<Channel | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  const persist = useCallback(
    async (next: ChatMessage[]) => {
      setMessages(next);
      await saveMessages(conversationId, next);
    },
    [conversationId],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await loadMessages(conversationId);
      if (!cancelled) setMessages(cached);

      const socket = connectSocket({ userId, deviceId });
      socketRef.current = socket;
      const channel = joinConversation(socket, conversationId);
      channelRef.current = channel;

      channel.on("message:new", async (payload: { message: ServerMessage }) => {
        const msg = fromServer(payload.message);
        setMessages((prev) => {
          const next = upsertMessage(prev, msg);
          void saveMessages(conversationId, next);
          return next;
        });
        if (msg.senderUserId !== userId) {
          try {
            await ackDelivered(channel, msg.id, `trace-ack-${Date.now()}`);
          } catch {
            // non-fatal for shell
          }
        }
      });

      channel.on("message:delivered", (payload: { message_id: string }) => {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === payload.message_id ? { ...m, deliveryState: "delivered" as const } : m,
          );
          void saveMessages(conversationId, next);
          return next;
        });
      });

      channel.on("presence:state", () => setStatus("connected"));

      channel
        .join()
        .receive("ok", async () => {
          setStatus("connected");
          const maxSeq = cached.reduce((acc, m) => Math.max(acc, m.serverSeq ?? 0), 0);
          try {
            const history = await syncHistory(channel, maxSeq);
            setMessages((prev) => {
              let next = prev;
              for (const m of history) next = upsertMessage(next, fromServer(m));
              void saveMessages(conversationId, next);
              return next;
            });
          } catch {
            // ignore
          }
        })
        .receive("error", () => setStatus("error"))
        .receive("timeout", () => setStatus("timeout"));
    })();

    return () => {
      cancelled = true;
      channelRef.current?.leave();
      socketRef.current?.disconnect();
    };
  }, [conversationId, deviceId, userId]);

  const onSend = async () => {
    const body = text.trim();
    if (!body || !channelRef.current) return;
    const clientMessageId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const pending: ChatMessage = {
      id: clientMessageId,
      clientMessageId,
      conversationId,
      senderUserId: userId,
      body,
      serverSeq: null,
      deliveryState: "locally_pending",
      createdAt: new Date().toISOString(),
    };
    await persist(upsertMessage(messages, pending));
    setText("");

    try {
      const { message, origin } = await sendText(channelRef.current, {
        clientMessageId,
        conversationId,
        body,
        traceId: `trace-mobile-${Date.now()}`,
      });
      const accepted = fromServer(message, pending);
      accepted.deliveryState = origin === "idempotent" ? accepted.deliveryState : "accepted";
      setMessages((prev) => {
        const next = upsertMessage(prev, accepted);
        void saveMessages(conversationId, next);
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, deliveryState: "failed" as const }
            : m,
        );
        void saveMessages(conversationId, next);
        return next;
      });
    }
  };

  const data = useMemo(
    () => [...messages].sort((a, b) => (a.serverSeq ?? 1e12) - (b.serverSeq ?? 1e12)),
    [messages],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Opal · {peerLabel}</Text>
      <Text style={styles.meta}>status: {status}</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.clientMessageId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderUserId === userId ? styles.mine : styles.theirs,
            ]}
          >
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>
              {item.deliveryState}
              {item.serverSeq != null ? ` · #${item.serverSeq}` : ""}
            </Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor="#6B7280"
        />
        <Pressable style={styles.send} onPress={onSend}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, backgroundColor: "#0B0F14" },
  title: { color: "#F9FAFB", fontSize: 18, fontWeight: "600", marginBottom: 4 },
  meta: { color: "#9CA3AF", fontSize: 12 },
  list: { paddingVertical: 12, gap: 8 },
  bubble: { padding: 12, borderRadius: 12, maxWidth: "85%", marginBottom: 8 },
  mine: { alignSelf: "flex-end", backgroundColor: "#1D4ED8" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#1F2937" },
  body: { color: "#F9FAFB", fontSize: 16 },
  composer: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
  },
  send: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendText: { color: "#fff", fontWeight: "600" },
});
