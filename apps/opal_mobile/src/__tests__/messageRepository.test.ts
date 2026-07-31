import { MessageRepository } from "../storage/messageRepository";
import { MemorySqlDriver } from "../storage/sqlDriver";
import type { ChatMessage } from "../types";

function repo(): MessageRepository {
  const db = new MemorySqlDriver();
  const r = new MessageRepository(db);
  r.migrate();
  return r;
}

const base = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "local-1",
  clientMessageId: "cm-1",
  conversationId: "conv-1",
  senderUserId: "user-1",
  body: "hello",
  serverSeq: null,
  deliveryState: "locally_pending",
  createdAt: "2026-07-31T00:00:00.000Z",
  ...over,
});

describe("MessageRepository SQLite-backed durability", () => {
  test("persists pending message and lists by conversation", () => {
    const r = repo();
    r.upsert(base());
    const list = r.list("conv-1");
    expect(list).toHaveLength(1);
    expect(list[0].deliveryState).toBe("locally_pending");
  });

  test("reconciles by client_message_id without duplicates", () => {
    const r = repo();
    r.upsert(base());
    r.enqueueOutbound({
      id: "q1",
      conversationId: "conv-1",
      clientMessageId: "cm-1",
      body: "hello",
    });
    r.reconcileFromServer(
      base({
        id: "server-uuid",
        serverSeq: 4,
        deliveryState: "accepted",
      }),
    );
    const list = r.list("conv-1");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("server-uuid");
    expect(list[0].serverSeq).toBe(4);
    expect(list[0].deliveryState).toBe("accepted");
    expect(r.listOutbound()).toHaveLength(0);
  });

  test("does not move delivery state backward", () => {
    const r = repo();
    r.upsert(base({ deliveryState: "delivered", id: "s1", serverSeq: 1 }));
    r.reconcileFromServer(base({ id: "s1", serverSeq: 1, deliveryState: "accepted" }));
    expect(r.list("conv-1")[0].deliveryState).toBe("delivered");
  });

  test("outbound queue retry bump", () => {
    const r = repo();
    r.enqueueOutbound({
      id: "q1",
      conversationId: "conv-1",
      clientMessageId: "cm-2",
      body: "retry",
    });
    r.bumpOutboundAttempt("cm-2", 2, "2026-07-31T01:00:00.000Z");
    const q = r.listOutbound();
    expect(q[0].attempts).toBe(2);
  });

  test("orders by server_seq", () => {
    const r = repo();
    r.upsert(base({ clientMessageId: "b", id: "2", serverSeq: 2, body: "second" }));
    r.upsert(base({ clientMessageId: "a", id: "1", serverSeq: 1, body: "first" }));
    const bodies = r.list("conv-1").map((m) => m.body);
    expect(bodies).toEqual(["first", "second"]);
  });
});
