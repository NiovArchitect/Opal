/**
 * Product realtime boundary (SF17).
 * Owns socket ticket, Phoenix Socket, conversation Channel join/leave,
 * reconnect, and history reconciliation. Does not own messaging authority.
 */

import { Socket, type Channel } from "phoenix";
import { fetchSocketTicket, runtimeConfig } from "../api/productClient";
import {
  IntelligenceChoreography,
  type IntelligenceStoreSnapshot,
} from "./intelligenceChoreography";

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
type AvailabilityEventHandler = (
  event: "shared" | "revoked" | "overlap",
  payload: unknown,
) => void;
export type CallInboxEvent = {
  event: "ringing" | "answered" | "ended";
  call_id?: string;
  from_user_id?: string;
  by_user_id?: string;
  reason?: string;
  [key: string]: unknown;
};
type CallInboxHandler = (ev: CallInboxEvent) => void;

export type InboxMessageEvent = {
  event_id?: string;
  conversation_id: string;
  message_id: string;
  server_seq: number;
  sender_user_id: string;
  preview: string;
  last_message_at?: string;
  unread_count: number;
  acceptance?: string;
  in_app?: boolean;
  visibility?: string;
};

export type InboxReadEvent = {
  conversation_id: string;
  reader_user_id?: string;
  last_read_server_seq?: number;
  unread_count?: number;
  peer_visible?: boolean;
  self?: boolean;
};

export type MessageDeliveredEvent = {
  conversation_id: string;
  message_id: string;
  server_seq: number;
  recipient_user_id?: string;
};

export type InboxPlanEvent = {
  conversation_id: string;
  visibility?: string;
  projection: Record<string, unknown> | null;
};

export type InboxAttentionEvent = {
  event?: string;
  user_id?: string;
  actionable_count?: number;
};

type InboxHandler = (ev: InboxMessageEvent) => void;
type InboxReadHandler = (ev: InboxReadEvent) => void;
type InboxPlanHandler = (ev: InboxPlanEvent) => void;
type InboxAttentionHandler = (ev: InboxAttentionEvent) => void;
type MessageDeliveredHandler = (ev: MessageDeliveredEvent) => void;

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

/** Raw socket lifetime metrics — UI debounce does not prove thrash is gone. */
export type SocketDiagnostics = {
  rawState: ConnectionState;
  projectedState: ConnectionState;
  /** Successful open() transitions since start() */
  connectCount: number;
  /** scheduleReconnect invocations (raw thrash indicator) */
  reconnectScheduleCount: number;
  /** onClose while not intentional (raw thrash indicator) */
  closeCount: number;
  /** onError after settled open */
  errorCount: number;
  /** ms since last successful open; null if never connected */
  connectedLifetimeMs: number | null;
  lastConnectedAt: number | null;
  reconnectAttempt: number;
  /** Conversation channel IDs currently joined (empty until openChat joins). */
  joinedChannels: string[];
  /** Last observed server_seq per conversation (for catch-up checks). */
  lastServerSeqByConversation: Record<string, number>;
  /** Pass 26 evidence-only join/auth trail (not product UI). */
  lastJoinAttempt?: {
    conversationId: string;
    topic: string;
    result: "ok" | "denied" | "error" | "timeout" | "socket_down";
    at: number;
    reason?: string;
  } | null;
  socketAuthSuccess?: boolean;
  lastSocketError?: string | null;
  channelJoinAttemptCount?: number;
  channelJoinOkCount?: number;
  channelJoinErrorCount?: number;
};

export class RealtimeClient {
  private socket: Socket | null = null;
  private channels = new Map<string, Channel>();
  private messageHandlers = new Set<MessageHandler>();
  private stateHandlers = new Set<StateHandler>();
  private availabilityHandlers = new Set<AvailabilityEventHandler>();
  private alignmentHandlers = new Set<(conversationId: string) => void>();
  private callInboxHandlers = new Set<CallInboxHandler>();
  private inboxHandlers = new Set<InboxHandler>();
  private inboxReadHandlers = new Set<InboxReadHandler>();
  private inboxPlanHandlers = new Set<InboxPlanHandler>();
  private inboxAttentionHandlers = new Set<InboxAttentionHandler>();
  private messageDeliveredHandlers = new Set<MessageDeliveredHandler>();
  private userChannel: Channel | null = null;
  private userId: string | null = null;
  private connectionState: ConnectionState = "offline";
  /** UX projection: only escalate to "reconnecting" after sustained outage. */
  private projectedState: ConnectionState = "offline";
  private outageTimer: ReturnType<typeof setTimeout> | null = null;
  private bearer: string | undefined;
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private ticketExpiresAt = 0;
  private lastSeqByConversation = new Map<string, number>();
  private connectInFlight: Promise<void> | null = null;
  /** Raw metrics — measure lifetime / thrash, not just quiet UI. */
  private connectCount = 0;
  private reconnectScheduleCount = 0;
  private closeCount = 0;
  private errorCount = 0;
  private lastConnectedAt: number | null = null;
  /** Evidence-only join trail (Pass 26). Never rendered in product UI. */
  private lastJoinAttempt: SocketDiagnostics["lastJoinAttempt"] = null;
  private socketAuthSuccess = false;
  private lastSocketError: string | null = null;
  private channelJoinAttemptCount = 0;
  private channelJoinOkCount = 0;
  private channelJoinErrorCount = 0;
  /** Paste B CHANNEL_CONTRACT intelligence events — store-first choreography. */
  private intelligence = new IntelligenceChoreography({ accountId: null });
  private intelligenceUnsubs: Array<() => void> = [];
  private intelligenceHandlers = new Set<(snap: IntelligenceStoreSnapshot) => void>();

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    // Project human-facing state (debounced outage), not raw socket thrash.
    handler(this.projectedState);
    return () => this.stateHandlers.delete(handler);
  }

  /** Shared alignment card changed. Payload is a conversation id, never a private constraint. */
  onAlignment(handler: (conversationId: string) => void): () => void {
    this.alignmentHandlers.add(handler);
    return () => this.alignmentHandlers.delete(handler);
  }

  /** Shared-safe availability share/revoke/overlap — never raw private windows. */
  onAvailability(handler: AvailabilityEventHandler): () => void {
    this.availabilityHandlers.add(handler);
    return () => this.availabilityHandlers.delete(handler);
  }

  /** New message for this user, including when the thread is closed. */
  onInbox(handler: InboxHandler): () => void {
    this.inboxHandlers.add(handler);
    return () => this.inboxHandlers.delete(handler);
  }

  /** Internal unread change, or a peer-visible receipt when that preference is on. */
  onInboxRead(handler: InboxReadHandler): () => void {
    this.inboxReadHandlers.add(handler);
    return () => this.inboxReadHandlers.delete(handler);
  }

  /** Participant-scoped plan continuity. Null projection clears the Home card. */
  onInboxPlan(handler: InboxPlanHandler): () => void {
    this.inboxPlanHandlers.add(handler);
    return () => this.inboxPlanHandlers.delete(handler);
  }

  /** Attention Center invalidation — refetch canonical projection; no per-feature spam. */
  onInboxAttention(handler: InboxAttentionHandler): () => void {
    this.inboxAttentionHandlers.add(handler);
    return () => this.inboxAttentionHandlers.delete(handler);
  }

  /** Peer device acked delivery — promote Sent → Delivered. */
  onMessageDelivered(handler: MessageDeliveredHandler): () => void {
    this.messageDeliveredHandlers.add(handler);
    return () => this.messageDeliveredHandlers.delete(handler);
  }

  /** Recipient acks a message as delivered on this device. */
  ackDelivered(conversationId: string, messageId: string): void {
    const ch = this.channels.get(conversationId);
    if (!ch || ch.state !== "joined") return;
    try {
      ch.push("message:ack_delivered", {
        message_id: messageId,
        device_id: deviceId(),
        trace_id: `trace-ack-web-${Date.now()}`,
      });
    } catch {
      /* best-effort */
    }
  }

  /** Incoming call lifecycle on user:<id> inbox (IDs/status only). */
  onCallInbox(handler: CallInboxHandler): () => void {
    this.callInboxHandlers.add(handler);
    return () => this.callInboxHandlers.delete(handler);
  }

  /** CHANNEL_CONTRACT intelligence choreography store updates. */
  onIntelligence(handler: (snap: IntelligenceStoreSnapshot) => void): () => void {
    this.intelligenceHandlers.add(handler);
    return () => this.intelligenceHandlers.delete(handler);
  }

  getIntelligence(): IntelligenceChoreography {
    return this.intelligence;
  }

  /** Phoenix socket for CallClient channel joins — null if offline. */
  getSocket(): Socket | null {
    return this.socket;
  }

  getState(): ConnectionState {
    return this.projectedState;
  }

  /** Raw socket state for diagnostics (not UI). */
  getRawState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Socket lifetime / reconnect counters.
   * Debounced UX can stay quiet while this shows reconnect thrash —
   * founder gate: measure actual reconnects, not only UI silence.
   */
  getDiagnostics(): SocketDiagnostics {
    const joinedChannels: string[] = [];
    for (const [id, ch] of this.channels) {
      if (ch.state === "joined") joinedChannels.push(id);
    }
    const lastServerSeqByConversation: Record<string, number> = {};
    for (const [id, seq] of this.lastSeqByConversation) {
      lastServerSeqByConversation[id] = seq;
    }
    return {
      rawState: this.connectionState,
      projectedState: this.projectedState,
      connectCount: this.connectCount,
      reconnectScheduleCount: this.reconnectScheduleCount,
      closeCount: this.closeCount,
      errorCount: this.errorCount,
      connectedLifetimeMs:
        this.lastConnectedAt != null && this.connectionState === "connected"
          ? Date.now() - this.lastConnectedAt
          : null,
      lastConnectedAt: this.lastConnectedAt,
      reconnectAttempt: this.reconnectAttempt,
      joinedChannels,
      lastServerSeqByConversation,
      lastJoinAttempt: this.lastJoinAttempt,
      socketAuthSuccess: this.socketAuthSuccess,
      lastSocketError: this.lastSocketError,
      channelJoinAttemptCount: this.channelJoinAttemptCount,
      channelJoinOkCount: this.channelJoinOkCount,
      channelJoinErrorCount: this.channelJoinErrorCount,
    };
  }

  /** Reset counters (tests / founder review harness). */
  resetDiagnostics(): void {
    this.connectCount = 0;
    this.reconnectScheduleCount = 0;
    this.closeCount = 0;
    this.errorCount = 0;
    this.lastConnectedAt = null;
    this.lastJoinAttempt = null;
    this.socketAuthSuccess = false;
    this.lastSocketError = null;
    this.channelJoinAttemptCount = 0;
    this.channelJoinOkCount = 0;
    this.channelJoinErrorCount = 0;
  }

  noteServerSeq(conversationId: string, seq: number | undefined): void {
    if (typeof seq !== "number" || Number.isNaN(seq)) return;
    const prev = this.lastSeqByConversation.get(conversationId) ?? 0;
    if (seq > prev) this.lastSeqByConversation.set(conversationId, seq);
  }

  async start(bearer?: string, opts?: { userId?: string }): Promise<void> {
    this.bearer = bearer;
    this.userId = opts?.userId ?? this.userId;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.resetDiagnostics();
    await this.connectWithTicket();
    await this.joinUserInbox();
  }

  stop(): void {
    this.intentionalClose = true;
    this.reconnectAttempt = 0;
    if (this.outageTimer) {
      clearTimeout(this.outageTimer);
      this.outageTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.userChannel) {
      try {
        this.userChannel.leave();
      } catch {
        /* ignore */
      }
      this.userChannel = null;
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
    // Smoke-found: setState was never defined (React-style name). Use project + raw.
    this.setRawState("offline");
    this.projectState("offline");
  }

  /** Join user:<id> for incoming call + material time nudges. */
  async joinUserInbox(userId?: string): Promise<"ok" | "error"> {
    const uid = userId ?? this.userId;
    if (!uid || !this.socket) return "error";
    this.userId = uid;

    if (this.userChannel) {
      try {
        this.userChannel.leave();
      } catch {
        /* ignore */
      }
      this.userChannel = null;
    }

    const ch = this.socket.channel(`user:${uid}`, {});
    this.userChannel = ch;
    for (const unsub of this.intelligenceUnsubs) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    this.intelligence = new IntelligenceChoreography({
      accountId: uid,
      onStoreChange: (snap) => {
        this.intelligenceHandlers.forEach((h) => h(snap));
      },
    });
    this.intelligenceUnsubs = [this.intelligence.bindChannel(ch)];

    const emitCall = (event: CallInboxEvent["event"], payload: Record<string, unknown>) => {
      const ev: CallInboxEvent = {
        event,
        call_id: typeof payload.call_id === "string" ? payload.call_id : undefined,
        from_user_id:
          typeof payload.from_user_id === "string" ? payload.from_user_id : undefined,
        by_user_id: typeof payload.by_user_id === "string" ? payload.by_user_id : undefined,
        reason: typeof payload.reason === "string" ? payload.reason : undefined,
        ...payload,
      };
      this.callInboxHandlers.forEach((h) => h(ev));
    };

    ch.on("call:ringing", (payload: unknown) =>
      emitCall("ringing", (payload || {}) as Record<string, unknown>),
    );
    ch.on("call:answered", (payload: unknown) =>
      emitCall("answered", (payload || {}) as Record<string, unknown>),
    );
    ch.on("call:ended", (payload: unknown) =>
      emitCall("ended", (payload || {}) as Record<string, unknown>),
    );
    ch.on("time:material", (payload: unknown) => {
      // Material leave-by / shared-now — reuse availability handlers as quiet nudge path
      this.availabilityHandlers.forEach((h) => h("overlap", payload));
    });
    ch.on("inbox:message", (payload: unknown) => {
      const event = normalizeInboxMessage(payload);
      if (!event) return;
      this.noteServerSeq(event.conversation_id, event.server_seq);
      this.inboxHandlers.forEach((handler) => handler(event));
    });
    ch.on("inbox:read", (payload: unknown) => {
      const event = normalizeInboxRead(payload);
      if (!event) return;
      this.inboxReadHandlers.forEach((handler) => handler(event));
    });
    ch.on("inbox:plan", (payload: unknown) => {
      const event = normalizeInboxPlan(payload);
      if (!event) return;
      this.inboxPlanHandlers.forEach((handler) => handler(event));
    });
    ch.on("inbox:attention", (payload: unknown) => {
      const event = normalizeInboxAttention(payload);
      if (!event) return;
      // Interim mediation/briefing/temporal may arrive via attention invalidation.
      this.intelligence.markReconnectRefresh();
      this.inboxAttentionHandlers.forEach((handler) => handler(event));
    });

    return new Promise((resolve) => {
      ch.join()
        .receive("ok", () => resolve("ok"))
        .receive("error", () => {
          this.userChannel = null;
          resolve("error");
        })
        .receive("timeout", () => {
          this.userChannel = null;
          resolve("error");
        });
    });
  }

  async joinConversation(conversationId: string): Promise<"ok" | "denied" | "error"> {
    const topic = `conversation:${conversationId}`;
    this.channelJoinAttemptCount += 1;

    if (!this.socket || !this.socket.isConnected()) {
      try {
        await this.connectWithTicket();
      } catch {
        this.channelJoinErrorCount += 1;
        this.lastJoinAttempt = {
          conversationId,
          topic,
          result: "socket_down",
          at: Date.now(),
          reason: "connect_failed",
        };
        return "error";
      }
    }
    if (!this.socket) {
      this.channelJoinErrorCount += 1;
      this.lastJoinAttempt = {
        conversationId,
        topic,
        result: "socket_down",
        at: Date.now(),
        reason: "no_socket",
      };
      return "error";
    }

    const existing = this.channels.get(conversationId);
    if (existing && existing.state === "joined") {
      this.lastJoinAttempt = {
        conversationId,
        topic,
        result: "ok",
        at: Date.now(),
        reason: "already_joined",
      };
      return "ok";
    }
    if (existing) {
      try {
        existing.leave();
      } catch {
        /* ignore */
      }
      this.channels.delete(conversationId);
    }

    const channel = this.socket.channel(topic, {});
    this.channels.set(conversationId, channel);

    channel.on("message:new", (payload: unknown) => {
      const msg = normalizeMessage(payload);
      if (msg) {
        this.noteServerSeq(msg.conversation_id, msg.server_seq);
        this.messageHandlers.forEach((h) => h(msg));
        // Recipient device ack — promotes sender receipt to Delivered.
        if (this.userId && msg.sender_user_id !== this.userId) {
          this.ackDelivered(msg.conversation_id, msg.id);
        }
      }
    });

    channel.on("message:delivered", (payload: unknown) => {
      const ev = normalizeDelivered(payload, conversationId);
      if (ev) this.messageDeliveredHandlers.forEach((h) => h(ev));
    });

    channel.on("alignment:updated", (payload: unknown) => {
      const id =
        payload && typeof payload === "object" && "conversation_id" in payload
          ? String((payload as { conversation_id?: string }).conversation_id || conversationId)
          : conversationId;
      this.alignmentHandlers.forEach((handler) => handler(id));
    });

    channel.on("availability:shared", (payload: unknown) => {
      this.availabilityHandlers.forEach((h) => h("shared", payload));
    });
    channel.on("availability:revoked", (payload: unknown) => {
      this.availabilityHandlers.forEach((h) => h("revoked", payload));
    });
    channel.on("availability:overlap", (payload: unknown) => {
      this.availabilityHandlers.forEach((h) => h("overlap", payload));
    });

    // Conversation-scoped CHANNEL_CONTRACT: conflict_alert + plan_update_suggestion
    this.intelligenceUnsubs.push(this.intelligence.bindChannel(channel));

    return new Promise((resolve) => {
      channel
        .join()
        .receive("ok", () => {
          this.channelJoinOkCount += 1;
          this.lastJoinAttempt = {
            conversationId,
            topic,
            result: "ok",
            at: Date.now(),
          };
          void this.syncHistory(conversationId);
          resolve("ok");
        })
        .receive("error", (resp: unknown) => {
          this.channels.delete(conversationId);
          this.channelJoinErrorCount += 1;
          const reason =
            resp && typeof resp === "object" && "reason" in resp
              ? String((resp as { reason?: string }).reason)
              : "error";
          const result = reason === "unauthorized" ? "denied" : "error";
          this.lastJoinAttempt = {
            conversationId,
            topic,
            result,
            at: Date.now(),
            reason,
          };
          resolve(result);
        })
        .receive("timeout", () => {
          this.channels.delete(conversationId);
          this.channelJoinErrorCount += 1;
          this.lastJoinAttempt = {
            conversationId,
            topic,
            result: "timeout",
            at: Date.now(),
            reason: "join_timeout",
          };
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

  /**
   * LiveExperience arrival_state via conversation channel
   * (`social_flow:experience_arrival`).
   */
  pushExperienceArrival(
    conversationId: string,
    payload: {
      experience_id?: string;
      arrival_state: string;
      visibility?: string;
    },
  ): Promise<"ok" | "error"> {
    const ch = this.channels.get(conversationId);
    if (!ch || ch.state !== "joined") return Promise.resolve("error");
    return new Promise((resolve) => {
      ch.push("social_flow:experience_arrival", {
        experience_id: payload.experience_id || conversationId,
        arrival_state: payload.arrival_state,
        visibility: payload.visibility || "group",
      })
        .receive("ok", () => resolve("ok"))
        .receive("error", () => resolve("error"))
        .receive("timeout", () => resolve("error"));
    });
  }

  /**
   * LiveExperience ETA share via conversation channel
   * (`social_flow:experience_eta`).
   */
  pushExperienceEta(
    conversationId: string,
    payload: {
      experience_id?: string;
      arrival_window_label: string;
      visibility_scope?: string;
      precision_class?: string;
      idempotency_key?: string;
    },
  ): Promise<"ok" | "error"> {
    const ch = this.channels.get(conversationId);
    if (!ch || ch.state !== "joined") return Promise.resolve("error");
    return new Promise((resolve) => {
      ch.push("social_flow:experience_eta", {
        experience_id: payload.experience_id || conversationId,
        arrival_window_label: payload.arrival_window_label,
        visibility_scope: payload.visibility_scope || "group",
        precision_class: payload.precision_class || "approximate_window",
        idempotency_key:
          payload.idempotency_key ||
          `eta-${conversationId}-${Date.now()}`,
      })
        .receive("ok", () => resolve("ok"))
        .receive("error", () => resolve("error"))
        .receive("timeout", () => resolve("error"));
    });
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
    // Coalesce concurrent connects (StrictMode / remount storms).
    if (this.connectInFlight) return this.connectInFlight;
    this.connectInFlight = this.connectWithTicketInner().finally(() => {
      this.connectInFlight = null;
    });
    return this.connectInFlight;
  }

  private async connectWithTicketInner(): Promise<void> {
    // Stay projected "connected" during brief re-ticket; only mark raw state.
    this.setRawState(this.socket ? "reconnecting" : "connecting");
    let ticket: string;
    let expiresIn: number;
    try {
      const data = await fetchSocketTicket(this.bearer);
      ticket = data.ticket;
      expiresIn = data.expires_in ?? 120;
    } catch (e) {
      this.socketAuthSuccess = false;
      this.lastSocketError = e instanceof Error ? e.message : "socket_ticket_failed";
      this.setRawState("session_expired");
      this.projectState("session_expired");
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
      // Disable Phoenix auto-reconnect with a stale ticket; we re-ticket ourselves.
      reconnectAfterMs: (_tries: number) => null as unknown as number,
      heartbeatIntervalMs: 30000,
    });

    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      socket.onOpen(() => {
        if (settled) return;
        settled = true;
        this.reconnectAttempt = 0;
        this.connectCount += 1;
        this.lastConnectedAt = Date.now();
        this.socketAuthSuccess = true;
        this.lastSocketError = null;
        this.setRawState("connected");
        this.projectState("connected");
        // Degraded reconnect: refresh Center + thread list + open thread only.
        if (this.connectCount > 1) {
          this.intelligence.markReconnectRefresh();
        }
        resolve();
      });
      socket.onError(() => {
        if (!settled) {
          settled = true;
          this.socketAuthSuccess = false;
          this.lastSocketError = "socket_error_before_open";
          this.setRawState("failed");
          reject(new Error("socket_error"));
        } else if (!this.intentionalClose) {
          this.errorCount += 1;
          this.lastSocketError = "socket_error_after_open";
          this.scheduleReconnect();
        }
      });
      socket.onClose(() => {
        if (this.intentionalClose) {
          this.setRawState("offline");
          this.projectState("offline");
          return;
        }
        // Do not immediately project "reconnecting" - brief closes are normal.
        this.closeCount += 1;
        this.setRawState("reconnecting");
        this.notePossibleOutage();
        this.scheduleReconnect();
      });
      socket.connect();
      setTimeout(() => {
        if (!settled) {
          settled = true;
          this.setRawState("failed");
          reject(new Error("socket_timeout"));
        }
      }, 12000);
    });

    // Rejoin the user inbox and any open thread. Missed socket events are
    // recovered by history:sync plus a canonical list refetch in the app.
    await this.joinUserInbox();
    const ids = [...this.channels.keys()];
    this.channels.clear();
    for (const id of ids) {
      await this.joinConversation(id);
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.reconnectTimer) return;
    this.reconnectScheduleCount += 1;
    this.setRawState("reconnecting");
    this.notePossibleOutage();
    this.reconnectAttempt += 1;
    // Backoff: 2s, 4s, 8s, max 20s - reduces thrash loops.
    const delay = Math.min(20000, 2000 * Math.pow(2, Math.min(this.reconnectAttempt - 1, 3)));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectWithTicket().catch(() => {
        this.scheduleReconnect();
      });
    }, delay);
  }

  private setRawState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
  }

  /** Only surface outage after ~4s of sustained disconnect. */
  private notePossibleOutage(): void {
    if (this.intentionalClose || this.outageTimer) return;
    if (this.projectedState === "reconnecting" || this.projectedState === "failed") return;
    this.outageTimer = setTimeout(() => {
      this.outageTimer = null;
      if (
        this.intentionalClose ||
        this.connectionState === "connected" ||
        this.connectionState === "offline"
      ) {
        return;
      }
      this.projectState("reconnecting");
    }, 4000);
  }

  private projectState(state: ConnectionState): void {
    if (state === "connected" || state === "offline" || state === "session_expired") {
      if (this.outageTimer) {
        clearTimeout(this.outageTimer);
        this.outageTimer = null;
      }
    }
    if (this.projectedState === state) return;
    this.projectedState = state;
    this.stateHandlers.forEach((h) => h(state));
  }
}

export function normalizeInboxMessage(payload: unknown): InboxMessageEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (typeof row.conversation_id !== "string" || typeof row.message_id !== "string") return null;
  if (typeof row.server_seq !== "number" || typeof row.sender_user_id !== "string") return null;
  return {
    event_id: typeof row.event_id === "string" ? row.event_id : undefined,
    conversation_id: row.conversation_id,
    message_id: row.message_id,
    server_seq: row.server_seq,
    sender_user_id: row.sender_user_id,
    preview: typeof row.preview === "string" ? row.preview : "",
    last_message_at: typeof row.last_message_at === "string" ? row.last_message_at : undefined,
    unread_count: typeof row.unread_count === "number" ? row.unread_count : 0,
    acceptance: typeof row.acceptance === "string" ? row.acceptance : undefined,
    in_app: typeof row.in_app === "boolean" ? row.in_app : undefined,
    visibility: typeof row.visibility === "string" ? row.visibility : undefined,
  };
}

export function normalizeInboxRead(payload: unknown): InboxReadEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (typeof row.conversation_id !== "string") return null;
  return {
    conversation_id: row.conversation_id,
    reader_user_id: typeof row.reader_user_id === "string" ? row.reader_user_id : undefined,
    last_read_server_seq:
      typeof row.last_read_server_seq === "number" ? row.last_read_server_seq : undefined,
    unread_count: typeof row.unread_count === "number" ? row.unread_count : undefined,
    peer_visible: row.peer_visible === true,
    self: row.self === true,
  };
}

export function normalizeDelivered(
  payload: unknown,
  fallbackConversationId: string,
): MessageDeliveredEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const message_id = typeof row.message_id === "string" ? row.message_id : null;
  const server_seq = typeof row.server_seq === "number" ? row.server_seq : null;
  if (!message_id || server_seq == null) return null;
  return {
    conversation_id:
      typeof row.conversation_id === "string" ? row.conversation_id : fallbackConversationId,
    message_id,
    server_seq,
    recipient_user_id:
      typeof row.recipient_user_id === "string" ? row.recipient_user_id : undefined,
  };
}

export function normalizeInboxPlan(payload: unknown): InboxPlanEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (typeof row.conversation_id !== "string") return null;
  const projection =
    row.projection && typeof row.projection === "object"
      ? (row.projection as Record<string, unknown>)
      : null;
  return {
    conversation_id: row.conversation_id,
    visibility: typeof row.visibility === "string" ? row.visibility : undefined,
    projection,
  };
}

export function normalizeInboxAttention(payload: unknown): InboxAttentionEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  return {
    event: typeof row.event === "string" ? row.event : undefined,
    user_id: typeof row.user_id === "string" ? row.user_id : undefined,
    actionable_count:
      typeof row.actionable_count === "number" ? row.actionable_count : undefined,
  };
}

export function normalizeMessage(payload: unknown): ChannelMessage | null {
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

/** Deduplicate by id / client_message_id; order by server_seq (not by text). */
export function reconcileMessages(
  existing: ChannelMessage[],
  incoming: ChannelMessage[],
): ChannelMessage[] {
  const byId = new Map<string, ChannelMessage>();
  const byClient = new Map<string, string>();

  const put = (m: ChannelMessage) => {
    if (byId.has(m.id)) return;
    if (m.client_message_id && byClient.has(m.client_message_id)) return;
    byId.set(m.id, m);
    if (m.client_message_id) byClient.set(m.client_message_id, m.id);
  };

  for (const m of existing) put(m);
  for (const m of incoming) put(m);

  return [...byId.values()].sort((a, b) => a.server_seq - b.server_seq);
}

/** Singleton product realtime client for the tab. */
export const productRealtime = new RealtimeClient();
