import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage } from "../types";

const keyFor = (conversationId: string) => `opal:messages:${conversationId}`;

export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(keyFor(conversationId));
  if (!raw) return [];
  return JSON.parse(raw) as ChatMessage[];
}

export async function saveMessages(
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  await AsyncStorage.setItem(keyFor(conversationId), JSON.stringify(messages));
}

export function upsertMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const byClient = list.findIndex((m) => m.clientMessageId === message.clientMessageId);
  if (byClient >= 0) {
    const next = [...list];
    next[byClient] = { ...next[byClient], ...message };
    return next;
  }
  const byId = list.findIndex((m) => m.id === message.id && message.id !== "");
  if (byId >= 0) {
    const next = [...list];
    next[byId] = { ...next[byId], ...message };
    return next;
  }
  return [...list, message].sort((a, b) => (a.serverSeq ?? 1e12) - (b.serverSeq ?? 1e12));
}
