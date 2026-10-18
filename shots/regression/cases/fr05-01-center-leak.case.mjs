/**
 * FR-05-01 - Center send leaked into a human chat; Center plan bounced
 * him into Chats.
 *
 * Genesis: Repair #5 walk - confirming a plan in Center wrote into a
 * human thread and navigated the founder out of Center into Chats.
 * Catalog: Group A, "No scripted responders, no seed impersonation,
 * no fake success".
 *
 * Guards (API output = what the surfaces render):
 *  - A Center plan request naming a real person creates at most one
 *    plan, readable back in GET /opal/plans (Graphs).
 *  - The named person's human thread gains NO message from the Center
 *    send (message count and ids identical before/after).
 *  - The Chats list gains no invented/seed-chat row for that person
 *    beyond the real direct conversation.
 *  - The Center conversation itself remains readable and holds the
 *    exchange (the founder stays in Center).
 *
 * Pass expectation on the current tip: PASS (Division A / R17 seed
 * kill). A failure here is a real finding.
 */
export default {
  id: "FR-05-01",
  title: "Center send leaked into a human chat; Center plan bounced him into Chats",
  theme: "No scripted responders, no seed impersonation, no fake success",
  class: "A",
  surfaces: ["Center", "human thread", "Graphs", "GET /opal/plans", "GET /conversations"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required (planner + named person)");

    const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
    assert.check("POST /conversations/direct", !!direct.conversationId, "a real direct conversation with the named person is required");
    const convId = direct.conversationId;
    const peerName = ctx.sessions.b.name || "Regression B";

    const msgsBefore = await h.getHumanMessages(A, convId);
    const idsBefore = (msgsBefore.messages || []).map((m) => m.id).join(",");
    const convsBefore = await h.listConversations(A);
    const plansBefore = await h.listPlans(A);
    const beforeIds = new Set(plansBefore.plans.map((p) => p.id));

    await h.centerNewChat(A);
    const phrases = [
      `Plan dinner with ${peerName} on Saturday at 7 PM`,
      `Set up dinner with ${peerName} this Saturday 7 PM`,
    ];
    for (const body of phrases) await h.centerSend(A, body);

    // Human thread untouched by the Center sends.
    const msgsAfter = await h.getHumanMessages(A, convId);
    const idsAfter = (msgsAfter.messages || []).map((m) => m.id).join(",");
    assert.eq(
      "GET /conversations/:id/messages (human thread)",
      idsAfter,
      idsBefore,
      "a Center send must never write into the person's human thread",
    );

    // No invented chat row appears in Chats.
    const convsAfter = await h.listConversations(A);
    assert.eq(
      "GET /conversations (Chats list)",
      convsAfter.conversations.length,
      convsBefore.conversations.length,
      "a Center plan flow must not invent a new Chats row",
    );

    // At most one new plan, and it reads back in Graphs.
    const plansAfter = await h.listPlans(A);
    const fresh = plansAfter.plans.filter((p) => !beforeIds.has(p.id));
    assert.check(
      "GET /opal/plans (Graphs read-back)",
      fresh.length <= 1,
      `the Center plan flow may create at most one plan; created ${fresh.length}`,
    );

    // The founder stays in Center: the Center conversation holds the exchange.
    const center = await h.centerConversation(A);
    assert.check(
      "GET /opal/conversation (Center)",
      !!center.conversation && (center.conversation.messages || []).length > 0,
      "the Center conversation must remain readable with the exchange stored in Center",
    );
  },
};
