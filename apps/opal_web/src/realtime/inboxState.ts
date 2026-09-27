/**
 * Chats list reducer for user-inbox events.
 * The conversation channel is not required. Server sequence and unread
 * stay authoritative; a lower sequence cannot replace a newer preview.
 */

export type InboxMessageEvent = {
  conversation_id: string;
  message_id?: string;
  server_seq: number;
  sender_user_id: string;
  preview: string;
  last_message_at?: string;
  unread_count: number;
  in_app?: boolean;
};

export type InboxChatRow = {
  id: string;
  name?: string;
  preview: string;
  time: string;
  unread?: number;
  muted?: boolean;
  updatedAt?: string;
  latestServerSeq?: number;
};

export type InboxApplyResult<T> = {
  chats: T[];
  missing: boolean;
  notify: boolean;
  duplicate: boolean;
};

export function applyInboxMessage<T extends InboxChatRow>(
  chats: T[],
  event: InboxMessageEvent,
  opts: {
    viewingId: string | null;
    selfId: string | null;
    formatTime: (iso?: string | null) => string;
    seenMessageIds?: Set<string>;
  },
): InboxApplyResult<T> {
  if (event.message_id && opts.seenMessageIds?.has(event.message_id)) {
    return { chats, missing: false, notify: false, duplicate: true };
  }
  if (event.message_id) opts.seenMessageIds?.add(event.message_id);

  const index = chats.findIndex((chat) => chat.id === event.conversation_id);
  if (index < 0) {
    return { chats, missing: true, notify: false, duplicate: false };
  }

  const current = chats[index];
  if ((current.latestServerSeq || 0) > event.server_seq) {
    return { chats, missing: false, notify: false, duplicate: false };
  }

  const viewing = opts.viewingId === event.conversation_id;
  const mine = !!opts.selfId && event.sender_user_id === opts.selfId;
  const unread = viewing || mine ? 0 : event.unread_count;
  const next: T = {
    ...current,
    preview: event.preview || current.preview,
    time: event.last_message_at ? opts.formatTime(event.last_message_at) : current.time,
    updatedAt: event.last_message_at || current.updatedAt,
    latestServerSeq: event.server_seq,
    unread,
  };
  const rest = chats.filter((chat) => chat.id !== event.conversation_id);
  const ordered = [next, ...rest].sort(
    (a, b) => timeValue(b.updatedAt) - timeValue(a.updatedAt),
  );

  return {
    chats: ordered,
    missing: false,
    notify: !viewing && !mine && !current.muted && event.in_app !== false && unread > 0,
    duplicate: false,
  };
}

export function mergeConversationList<T extends InboxChatRow>(previous: T[], incoming: T[]): T[] {
  const prevById = new Map(previous.map((chat) => [chat.id, chat]));
  const merged = incoming.map((row) => {
    const prev = prevById.get(row.id);
    if (prev && (prev.latestServerSeq || 0) > (row.latestServerSeq || 0)) return prev;
    return row;
  });
  return merged.sort((a, b) => timeValue(b.updatedAt) - timeValue(a.updatedAt));
}

/** Dock badge includes muted conversations. Mute does not hide unread. */
export function dockUnreadCount(
  chats: { id: string; unread?: number; muted?: boolean }[],
  openId: string | null,
): number {
  return chats.reduce((sum, chat) => {
    if (chat.id === openId) return sum;
    return sum + (chat.unread || 0);
  }, 0);
}

export function planWhoLine(mode: string | undefined, peerName: string | undefined): string {
  if (mode === "solo") return "Your plan";
  if (mode === "group") return peerName?.trim() || "Your group";
  const peer = peerName?.trim();
  return peer ? `You + ${peer}` : "You";
}

function timeValue(iso?: string): number {
  if (!iso) return 0;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
}
