/**
 * Conversation message ordering / duplicate torture (client reconciliation model).
 */

export type LocalMessage = {
  id: string;
  clientMessageId: string;
  serverSeq: number | null;
  body: string;
  deliveryState: "queued" | "accepted" | "persisted" | "delivered";
};

export class ConversationStore {
  private byClient = new Map<string, LocalMessage>();
  private byId = new Map<string, LocalMessage>();

  upsertOptimistic(clientMessageId: string, body: string): LocalMessage {
    const existing = this.byClient.get(clientMessageId);
    if (existing) return existing;
    const msg: LocalMessage = {
      id: `local-${clientMessageId}`,
      clientMessageId,
      serverSeq: null,
      body,
      deliveryState: "queued",
    };
    this.byClient.set(clientMessageId, msg);
    this.byId.set(msg.id, msg);
    return msg;
  }

  reconcileServer(payload: {
    id: string;
    client_message_id: string;
    server_seq: number;
    body: string;
    delivery_state: "accepted" | "persisted" | "delivered";
  }): void {
    const prior = this.byClient.get(payload.client_message_id);
    if (prior) {
      this.byId.delete(prior.id);
    }
    const msg: LocalMessage = {
      id: payload.id,
      clientMessageId: payload.client_message_id,
      serverSeq: payload.server_seq,
      body: payload.body,
      deliveryState: payload.delivery_state,
    };
    this.byClient.set(msg.clientMessageId, msg);
    this.byId.set(msg.id, msg);
  }

  /** Apply out-of-order server events safely. */
  applyBatch(
    events: Array<{
      id: string;
      client_message_id: string;
      server_seq: number;
      body: string;
      delivery_state: "accepted" | "persisted" | "delivered";
    }>,
  ): void {
    // Sort by server_seq for authoritative order; still idempotent by id
    const sorted = [...events].sort((a, b) => a.server_seq - b.server_seq);
    for (const e of sorted) {
      this.reconcileServer(e);
    }
  }

  listOrdered(): LocalMessage[] {
    return [...this.byId.values()].sort((a, b) => {
      if (a.serverSeq == null && b.serverSeq == null) {
        return a.clientMessageId.localeCompare(b.clientMessageId);
      }
      if (a.serverSeq == null) return 1;
      if (b.serverSeq == null) return -1;
      return a.serverSeq - b.serverSeq;
    });
  }

  count(): number {
    return this.byId.size;
  }
}

export function conversationTorture(): {
  messageCount: number;
  ordered: boolean;
  noDuplicates: boolean;
} {
  const store = new ConversationStore();
  // optimistic sends
  for (let i = 0; i < 20; i++) {
    store.upsertOptimistic(`c${i}`, `body ${i}`);
  }
  // duplicate optimistic
  store.upsertOptimistic("c5", "body 5 again");

  // out-of-order + duplicate server events
  const events = [];
  for (let i = 19; i >= 0; i--) {
    events.push({
      id: `s${i}`,
      client_message_id: `c${i}`,
      server_seq: i + 1,
      body: `body ${i}`,
      delivery_state: "persisted" as const,
    });
  }
  // inject duplicates
  events.push(events[0], events[5]);
  store.applyBatch(events);

  const list = store.listOrdered();
  const seqs = list.map((m) => m.serverSeq).filter((s): s is number => s != null);
  const ordered = seqs.every((s, idx) => idx === 0 || s >= seqs[idx - 1]!);
  const ids = list.map((m) => m.id);
  const noDuplicates = new Set(ids).size === ids.length;

  return { messageCount: store.count(), ordered, noDuplicates };
}
