/**
 * Product realtime boundary (SF17).
 * Owns socket ticket, Phoenix Socket, conversation Channel join/leave,
 * reconnect, and history reconciliation. Does not own messaging authority.
 */

import { Socket, type Channel } from "phoenix";
import { fetchSocketTicket, runtimeConfig } from "../api/productClient";

export type ConnectionState =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
  | "session_expired";

export type ChannelMessage = {
  id: string;
  client_message_id?: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  server_seq: number;
  created_at?: string;
  message_type?: string;
};

type MessageHandler = (msg: ChannelMessage) => void;
type StateHandler = (state: ConnectionState) => void;

const DEVICE_KEY = "opal.product.device_id.v17";

function deviceId(): string {
  try {
    const existing = sessionStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = `web-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    sessionStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return `web-ephemeral-${Date.now()}`;
  }
}

function socketUrl(): string {
  const { socketBase } = runtimeConfig();
  // Phoenix Socket expects host without trailing path; it appends /websocket
  return `${socketBase}/socket`;
}

export class RealtimeClient {
  private socket: Socket | null = null;
  private channels = new Map<string, Channel>();
  private messageHandlers = new Set<MessageHandler>();
  private stateHandlers = new Set<StateHandler>();
  private connectionState: ConnectionState = "offline";
  private bearer: string | undefined;
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private ticketExpiresAt = 0;
  private lastSeqByConversation = new Map<string, number>();

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.connectionState);
    return () => this.stateHandlers.delete(handler);
  }

  getState(): ConnectionState {
    return this.connectionState;
  }

  noteServerSeq(conversationId: string, seq: number | undefined): void {
    if (typeof seq !== "number" || Number.isNaN(seq)) return;
    const prev = this.lastSeqByConversation.get(conversationId) ?? 0;
    if (seq > prev) this.lastSeqByConversation.set(conversationId, seq);
  }

  async start(bearer?: string): Promise<void> {
    this.bearer = bearer;
    this.intentionalClose = false;
    await this.connectWithTicket();
  }

  stop(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const [id, ch] of this.channels) {
      try {
        ch.leave();
      } catch {
        /* ignore */
      }
      this.channels.delete(id);
    }
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.setState("offline");
  }

  async joinConversation(conversationId: string): Promise<"ok" | "denied" | "error"> {
    if (!this.socket || !this.socket.isConnected()) {
      try {
        await this.connectWithTicket();
      } catch {
        return "error";
      }
    }
    if (!this.socket) return "error";

    const existing = this.channels.get(conversationId);
    if (existing && existing.state === "joined") return "ok";
    if (existing) {
      try {
        existing.leave();
      } catch {
        /* ignore */
      }
      this.channels.delete(conversationId);
    }

    const channel = this.socket.channel(`conversation:${conversationId}`, {});
    this.channels.set(conversationId, channel);

    channel.on("message:new", (payload: unknown) => {
      const msg = normalizeMessage(payload);
      if (msg) {
        this.noteServerSeq(msg.conversation_id, msg.server_seq);
        this.messageHandlers.forEach((h) => h(msg));
      }
    });

    return new Promise((resolve) => {
      channel
        .join()
        .receive("ok", () => {
          void this.syncHistory(conversationId);
          resolve("ok");
        })
        .receive("error", (resp: unknown) => {
          this.channels.delete(conversationId);
          const reason =
            resp && typeof resp === "object" && "reason" in resp
              ? String((resp as { reason?: string }).reason)
              : "";
          resolve(reason === "unauthorized" ? "denied" : "error");
        })
        .receive("timeout", () => {
          this.channels.delete(conversationId);
          resolve("error");
        });
    });
  }

  leaveConversation(conversationId: string): void {
    const ch = this.channels.get(conversationId);
    if (!ch) return;
    try {
      ch.leave();
    } catch {
      /* ignore */
    }
    this.channels.delete(conversationId);
  }

  private async syncHistory(conversationId: string): Promise<void> {
    const ch = this.channels.get(conversationId);
    if (!ch || ch.state !== "joined") return;
    const after = this.lastSeqByConversation.get(conversationId) ?? 0;
    ch.push("history:sync", { after_server_seq: after })
      .receive("ok", (resp: unknown) => {
        const messages =
          resp && typeof resp === "object" && "messages" in resp
            ? ((resp as { messages?: unknown[] }).messages ?? [])
            : [];
        for (const raw of messages) {
          const msg = normalizeMessage({ message: raw });
          if (msg) {
            this.noteServerSeq(msg.conversation_id, msg.server_seq);
            this.messageHandlers.forEach((h) => h(msg));
          }
        }
      })
      .receive("error", () => {
        /* history remains HTTP-loaded */
      });
  }

  private async connectWithTicket(): Promise<void> {
    this.setState(this.socket ? "reconnecting" : "connecting");
    let ticket: string;
    let expiresIn: number;
    try {
      const data = await fetchSocketTicket(this.bearer);
      ticket = data.ticket;
      expiresIn = data.expires_in ?? 120;
    } catch {
      this.setState("session_expired");
      throw new Error("socket_ticket_failed");
    }

    // Ticket is memory-only; never localStorage / URL history.
    this.ticketExpiresAt = Date.now() + Math.max(30, expiresIn - 15) * 1000;

    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }

    const socket = new Socket(socketUrl(), {
      params: {
        socket_ticket: ticket,
        device_id: deviceId(),
        app_state: "foreground",
        client_version: "sf17-web-0.1.0",
      },
      // Phoenix reconnects the transport; we re-ticket on error/close.
      reconnectAfterMs: () => 2000,
    });

    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      socket.onOpen(() => {
        if (settled) return;
        settled = true;
        this.setState("connected");
        resolve();
      });
      socket.onError(() => {
        if (!settled) {
          settled = true;
          this.setState("failed");
          reject(new Error("socket_error"));
        } else if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      });
      socket.onClose(() => {
        if (this.intentionalClose) {
          this.setState("offline");
          return;
        }
        this.setState("reconnecting");
        this.scheduleReconnect();
      });
      socket.connect();
      setTimeout(() => {
        if (!settled) {
          settled = true;
          this.setState("failed");
          reject(new Error("socket_timeout"));
        }
      }, 12000);
    });

    // Rejoin active conversations after a fresh socket.
    const ids = [...this.channels.keys()];
    this.channels.clear();
    for (const id of ids) {
      await this.joinConversation(id);
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.reconnectTimer) return;
    this.setState("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectWithTicket().catch(() => {
        this.scheduleReconnect();
      });
    }, 1500);
  }

  private setState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.stateHandlers.forEach((h) => h(state));
  }
}

function normalizeMessage(payload: unknown): ChannelMessage | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const m = (root.message && typeof root.message === "object"
    ? root.message
    : root) as Record<string, unknown>;
  if (typeof m.id !== "string" || typeof m.body !== "string") return null;
  const conversation_id =
    typeof m.conversation_id === "string"
      ? m.conversation_id
      : typeof root.conversation_id === "string"
        ? root.conversation_id
        : "";
  if (!conversation_id) return null;
  return {
    id: m.id,
    client_message_id:
      typeof m.client_message_id === "string" ? m.client_message_id : undefined,
    conversation_id,
    sender_user_id: typeof m.sender_user_id === "string" ? m.sender_user_id : "",
    body: m.body,
    server_seq: typeof m.server_seq === "number" ? m.server_seq : 0,
    created_at: typeof m.created_at === "string" ? m.created_at : undefined,
    message_type: typeof m.message_type === "string" ? m.message_type : "text",
  };
}

/** Singleton product realtime client for the tab. */
export const productRealtime = new RealtimeClient();
