import { upsertMessage } from "../storage/messageStore";
import type { ChatMessage } from "../types";

describe("upsertMessage", () => {
  const base: ChatMessage = {
    id: "local-1",
    clientMessageId: "cm-1",
    conversationId: "c1",
    senderUserId: "u1",
    body: "hi",
    serverSeq: null,
    deliveryState: "locally_pending",
    createdAt: "2026-07-31T00:00:00Z",
  };

  test("adds pending then reconciles by clientMessageId", () => {
    const pending = [base];
    const accepted: ChatMessage = {
      ...base,
      id: "server-uuid",
      serverSeq: 3,
      deliveryState: "accepted",
    };
    const next = upsertMessage(pending, accepted);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("server-uuid");
    expect(next[0].serverSeq).toBe(3);
    expect(next[0].deliveryState).toBe("accepted");
  });
});
