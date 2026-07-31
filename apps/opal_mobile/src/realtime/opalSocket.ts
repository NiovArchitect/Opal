import { Socket, Channel } from "phoenix";
import { API_WS_URL } from "../config";
import type { ServerMessage } from "../types";

export type ConnectParams = {
  userId: string;
  deviceId: string;
  appState?: string;
  clientVersion?: string;
};

export function connectSocket(params: ConnectParams): Socket {
  const socket = new Socket(API_WS_URL, {
    params: {
      user_id: params.userId,
      device_id: params.deviceId,
      app_state: params.appState ?? "foreground",
      client_version: params.clientVersion ?? "opal-mobile-0.1.0",
    },
  });
  socket.connect();
  return socket;
}

export function joinConversation(
  socket: Socket,
  conversationId: string,
): Channel {
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
