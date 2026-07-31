/**
 * Minimal SQL driver abstraction.
 * React Native uses expo-sqlite; unit tests use an in-memory driver.
 */

export type SqlRow = Record<string, unknown>;

export interface SqlDriver {
  exec(sql: string): void;
  run(sql: string, params?: unknown[]): void;
  all<T extends SqlRow = SqlRow>(sql: string, params?: unknown[]): T[];
  get<T extends SqlRow = SqlRow>(sql: string, params?: unknown[]): T | undefined;
}

/** Pure in-memory SQLite-like store for tests and Node validation. */
export class MemorySqlDriver implements SqlDriver {
  private messages: SqlRow[] = [];
  private queue: SqlRow[] = [];
  private meta: Record<string, string> = {};

  exec(sql: string): void {
    // schema bootstrap is no-op; tables are implicit
    void sql;
  }

  run(sql: string, params: unknown[] = []): void {
    const s = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (s.startsWith("insert into messages")) {
      const row = {
        id: params[0],
        client_message_id: params[1],
        conversation_id: params[2],
        sender_user_id: params[3],
        body: params[4],
        server_seq: params[5],
        delivery_state: params[6],
        created_at: params[7],
      };
      const idx = this.messages.findIndex(
        (m) =>
          m.client_message_id === row.client_message_id &&
          m.conversation_id === row.conversation_id,
      );
      if (idx >= 0) this.messages[idx] = { ...this.messages[idx], ...row };
      else this.messages.push(row);
      return;
    }
    if (s.startsWith("update messages set delivery_state")) {
      const [state, id] = params;
      this.messages = this.messages.map((m) =>
        m.id === id ? { ...m, delivery_state: state } : m,
      );
      return;
    }
    if (s.startsWith("insert into outbound_queue")) {
      this.queue.push({
        id: params[0],
        conversation_id: params[1],
        client_message_id: params[2],
        body: params[3],
        attempts: params[4],
        next_attempt_at: params[5],
        created_at: params[6],
      });
      return;
    }
    if (s.startsWith("delete from outbound_queue")) {
      const clientId = params[0];
      this.queue = this.queue.filter((q) => q.client_message_id !== clientId);
      return;
    }
    if (s.startsWith("update outbound_queue set attempts")) {
      const [attempts, next, clientId] = params;
      this.queue = this.queue.map((q) =>
        q.client_message_id === clientId
          ? { ...q, attempts, next_attempt_at: next }
          : q,
      );
      return;
    }
    if (s.startsWith("insert or replace into meta")) {
      this.meta[String(params[0])] = String(params[1]);
    }
  }

  all<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []): T[] {
    const s = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (s.includes("from messages") && s.includes("conversation_id")) {
      return this.messages
        .filter((m) => m.conversation_id === params[0])
        .sort(
          (a, b) =>
            Number(a.server_seq ?? 1e12) - Number(b.server_seq ?? 1e12),
        ) as T[];
    }
    if (s.includes("from outbound_queue")) {
      return [...this.queue] as T[];
    }
    return [];
  }

  get<T extends SqlRow = SqlRow>(sql: string, params: unknown[] = []): T | undefined {
    const s = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (s.includes("from messages") && s.includes("client_message_id")) {
      return this.messages.find(
        (m) =>
          m.conversation_id === params[0] && m.client_message_id === params[1],
      ) as T | undefined;
    }
    if (s.includes("from meta")) {
      const v = this.meta[String(params[0])];
      return v === undefined ? undefined : ({ value: v } as unknown as T);
    }
    return undefined;
  }
}

export const MESSAGE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT NOT NULL,
  client_message_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  server_seq INTEGER,
  delivery_state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, client_message_id)
);
CREATE TABLE IF NOT EXISTS outbound_queue (
  id TEXT NOT NULL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  client_message_id TEXT NOT NULL,
  body TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  next_attempt_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;
