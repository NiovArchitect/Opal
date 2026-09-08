/**
 * R1B Phoenix connectivity — socket_ticket auth (R1A), not raw user_id.
 */
import { Socket, Channel } from "phoenix";
import { API_WS_URL } from "../config";
import { fetchSocketTicket } from "../api/productSession";
import type { ServerMessage } from "../types";

export type TicketConnectParams = {
  accessToken: string;
  deviceId: string;
  appState?: string;
  clientVersion?: string;
};

/** Authenticated socket using short-lived product socket ticket. */
export async function connectSocketWithSession(
  params: TicketConnectParams,
): Promise<Socket> {
  const { ticket } = await fetchSocketTicket(params.accessToken);
  const socket = new Socket(API_WS_URL, {
    params: {
      socket_ticket: ticket,
      device_id: params.deviceId,
      app_state: params.appState ?? "foreground",
      client_version: params.clientVersion ?? "opal-mobile-r1b-0.1.0",
    },
    // Native host re-tickets explicitly; avoid silent stale reconnect loops.
    reconnectAfterMs: (_tries: number) => null as unknown as number,
  });
  socket.connect();
  return socket;
}

/** @deprecated Pre-R1A helper — do not use for product auth. */
export function connectSocket(_params: {
  userId: string;
  deviceId: string;
  appState?: string;
  clientVersion?: string;
}): Socket {
  throw new Error("connectSocket(user_id) removed — use connectSocketWithSession");
}

export function joinConversation(socket: Socket, conversationId: string): Channel {
  const channel = socket.channel(`conversation:${conversationId}`, {});
  channel.join();
  return channel;
}

export function sendText(
  channel: Channel,
  args: {
    clientMessageId: string;
    conversationId: string;
    body: string;
    traceId: string;
  },
): Promise<{ message: ServerMessage; origin: string }> {
  return new Promise((resolve, reject) => {
    channel
      .push("message:send", {
        schema_version: "0.1.0",
        client_message_id: args.clientMessageId,
        conversation_id: args.conversationId,
        body: args.body,
        trace_id: args.traceId,
      })
      .receive("ok", (resp: { message: ServerMessage; origin: string }) => resolve(resp))
      .receive("error", (err: unknown) => reject(err))
      .receive("timeout", () => reject(new Error("timeout")));
  });
}

export function ackDelivered(
  channel: Channel,
  messageId: string,
  traceId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    channel
      .push("message:ack_delivered", { message_id: messageId, trace_id: traceId })
      .receive("ok", () => resolve())
      .receive("error", (err: unknown) => reject(err))
      .receive("timeout", () => reject(new Error("timeout")));
  });
}

export function syncHistory(
  channel: Channel,
  afterServerSeq: number,
): Promise<ServerMessage[]> {
  return new Promise((resolve, reject) => {
    channel
      .push("history:sync", { after_server_seq: afterServerSeq })
      .receive("ok", (resp: { messages: ServerMessage[] }) => resolve(resp.messages))
      .receive("error", (err: unknown) => reject(err))
      .receive("timeout", () => reject(new Error("timeout")));
  });
}
