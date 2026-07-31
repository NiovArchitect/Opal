import type { ChatMessage, LocalDeliveryState } from "../types";
import { MESSAGE_SCHEMA_SQL, type SqlDriver } from "./sqlDriver";

export class MessageRepository {
  constructor(private readonly db: SqlDriver) {}

  migrate(): void {
    for (const stmt of MESSAGE_SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
      this.db.exec(stmt);
    }
  }

  upsert(message: ChatMessage): void {
    this.db.run(
      `INSERT INTO messages (id, client_message_id, conversation_id, sender_user_id, body, server_seq, delivery_state, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.clientMessageId,
        message.conversationId,
        message.senderUserId,
        message.body,
        message.serverSeq,
        message.deliveryState,
        message.createdAt,
      ],
    );
  }

  list(conversationId: string): ChatMessage[] {
    const rows = this.db.all(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY COALESCE(server_seq, 1000000000) ASC`,
      [conversationId],
    );
    return rows.map(rowToMessage);
  }

  getByClientId(conversationId: string, clientMessageId: string): ChatMessage | undefined {
    const row = this.db.get(
      `SELECT * FROM messages WHERE conversation_id = ? AND client_message_id = ?`,
      [conversationId, clientMessageId],
    );
    return row ? rowToMessage(row) : undefined;
  }

  setDeliveryState(id: string, state: LocalDeliveryState): void {
    this.db.run(`UPDATE messages SET delivery_state = ? WHERE id = ?`, [state, id]);
  }

  enqueueOutbound(item: {
    id: string;
    conversationId: string;
    clientMessageId: string;
    body: string;
    attempts?: number;
    nextAttemptAt?: string;
    createdAt?: string;
  }): void {
    this.db.run(
      `INSERT INTO outbound_queue (id, conversation_id, client_message_id, body, attempts, next_attempt_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.conversationId,
        item.clientMessageId,
        item.body,
        item.attempts ?? 0,
        item.nextAttemptAt ?? new Date().toISOString(),
        item.createdAt ?? new Date().toISOString(),
      ],
    );
  }

  listOutbound(): Array<{
    id: string;
    conversationId: string;
    clientMessageId: string;
    body: string;
    attempts: number;
  }> {
    return this.db.all(`SELECT * FROM outbound_queue ORDER BY created_at ASC`).map((r) => ({
      id: String(r.id),
      conversationId: String(r.conversation_id),
      clientMessageId: String(r.client_message_id),
      body: String(r.body),
      attempts: Number(r.attempts),
    }));
  }

  dequeueOutbound(clientMessageId: string): void {
    this.db.run(`DELETE FROM outbound_queue WHERE client_message_id = ?`, [clientMessageId]);
  }

  bumpOutboundAttempt(clientMessageId: string, attempts: number, nextAttemptAt: string): void {
    this.db.run(
      `UPDATE outbound_queue SET attempts = ?, next_attempt_at = ? WHERE client_message_id = ?`,
      [attempts, nextAttemptAt, clientMessageId],
    );
  }

  /** Reconcile server message onto local pending by client_message_id. */
  reconcileFromServer(server: ChatMessage): ChatMessage {
    const existing = this.getByClientId(server.conversationId, server.clientMessageId);
    const merged: ChatMessage = {
      ...(existing ?? server),
      ...server,
      deliveryState: promoteState(existing?.deliveryState, server.deliveryState),
    };
    this.upsert(merged);
    this.dequeueOutbound(server.clientMessageId);
    return merged;
  }
}

function promoteState(
  current: LocalDeliveryState | undefined,
  incoming: LocalDeliveryState,
): LocalDeliveryState {
  const rank: Record<LocalDeliveryState, number> = {
    locally_pending: 0,
    failed: 1,
    accepted: 2,
    persisted: 3,
    delivered: 4,
  };
  if (!current) return incoming;
  return rank[incoming] >= rank[current] ? incoming : current;
}

function rowToMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    clientMessageId: String(row.client_message_id),
    conversationId: String(row.conversation_id),
    senderUserId: String(row.sender_user_id),
    body: String(row.body),
    serverSeq: row.server_seq === null || row.server_seq === undefined ? null : Number(row.server_seq),
    deliveryState: row.delivery_state as ChatMessage["deliveryState"],
    createdAt: String(row.created_at),
  };
}
