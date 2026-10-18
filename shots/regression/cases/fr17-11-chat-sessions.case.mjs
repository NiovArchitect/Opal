/**
 * FR-17-11 - "How come clear chat is not clearing - we should have
 * new chats the same way Muse has" (F17-13; FL-R9-07). Contract:
 * New chat archives + retains; list shows all sessions; Clear is
 * server-first (re-read proves messages gone on the backend);
 * durable plans untouched; cross-account session access is 404.
 */
export default {
  id: "FR-17-11",
  title: "\"If I wanted to clear the chat with Opal how come it's not clearing\"",
  theme: "Chat sessions, Center IA, account isolation",
  class: "A",
  surfaces: ["POST /opal/conversation/new", "POST /opal/conversation/clear", "GET /opal/conversations", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    await h.centerNewChat(A);
    await h.centerSend(A, ctx.marker("to be cleared"));
    const plansBefore = await h.listPlans(A);
    const cleared = await A.post("/opal/conversation/clear", {});
    assert.check("POST /opal/conversation/clear", cleared.status === 200 || cleared.status === 201,
      `clear must succeed server-first; got ${cleared.status}`);
    const after = await h.centerConversation(A);
    const msgs = after.conversation?.messages || [];
    assert.eq("GET /opal/conversation (after clear)", msgs.filter((m) => (m.body || "").includes("to be cleared")).length, 0,
      "cleared messages must be gone on the backend, not just hidden client-side");
    const plansAfter = await h.listPlans(A);
    assert.eq("GET /opal/plans (clear safety)", plansAfter.plans.length, plansBefore.plans.length,
      "clearing a chat must never touch durable plans");
    const sessions = await h.centerSessions(A);
    assert.check("GET /opal/conversations", sessions.sessions.length >= 1,
      "the sessions list must show the user's chats with real previews");
    if (B && sessions.sessions.length > 0) {
      const target = sessions.sessions[0].id;
      const x = await B.post(`/opal/conversations/${encodeURIComponent(target)}/switch`, {});
      assert.eq("cross-account switch", x.status, 404,
        "another account requesting this session id must get 404 on every route");
    }
  },
};
