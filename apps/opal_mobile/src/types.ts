export type LocalDeliveryState =
  | "locally_pending"
  | "accepted"
  | "persisted"
  | "delivered"
  | "failed";

export type ChatMessage = {
  id: string;
  clientMessageId: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  serverSeq: number | null;
  deliveryState: LocalDeliveryState;
  createdAt: string;
};

export type ServerMessage = {
  schema_version: string;
  id: string;
  client_message_id: string;
  conversation_id: string;
  sender_user_id: string;
  message_type: string;
  body: string;
  source_language: string | null;
  created_at: string;
  server_seq: number;
  delivery_state: string;
  ai_processing_state: string;
};
