/**
 * FR-11-01 - Messages appeared, moved, then vanished after leaving and
 * re-entering a thread; Opal suggestions vanished too (F01, F02).
 *
 * Genesis: Repair #11 walk findings F01/F02 - rendered replies in
 * seeded human threads were not persisted backend messages, so
 * re-entry dropped, reordered or duplicated them.
 *
 * Guards:
 *  - Every message rendered in a human thread is a persisted backend
 *    message (carries a server id).
 *  - Leave + re-enter 3x (the exact reads the client performs): the
 *    message id sequence is byte-identical every time - nothing
 *    added, dropped, or reordered.
 *  - Same law in Center: a stored Opal reply survives re-reads of
 *    GET /opal/conversation with the same id and body.
 *
 * Pass expectation on the current tip: PASS.
 */
export default {
  id: "FR-11-01",
  title: "Messages appeared, moved, then vanished after leaving and re-entering a thread",
  theme: "No scripted responders, no seed impersonation, no fake success",
  class: "A",
  surfaces: ["human threads", "GET /conversations/:id/messages", "GET /opal/conversation"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
    const convId = direct.conversationId;
    assert.check("POST /conversations/direct", !!convId, "direct conversation required");

    const bodies = [
      ctx.marker("persistence one"),
      ctx.marker("persistence two"),
      ctx.marker("persistence three"),
    ];
    const senders = [A, B, A];
    for (let i = 0; i < bodies.length; i++) {
      const r = await h.postHumanMessage(senders[i], convId, bodies[i]);
      assert.check(
        "POST /conversations/:id/messages",
        r.status === 201 || r.status === 200 || r.status === 429,
        `send ${i + 1} must be accepted or honestly throttled (got ${r.status})`,
      );
    }

    async function snapshot(client) {
      const r = await h.getHumanMessages(client, convId);
      return (r.messages || []).filter((m) => (m.body || "").includes(ctx.tag));
    }

    const first = await snapshot(A);
    assert.check(
      "GET /conversations/:id/messages",
      first.length >= 1,
      "at least one sent message must read back as a persisted backend message",
    );
    assert.check(
      "GET /conversations/:id/messages (server ids)",
      first.every((m) => typeof m.id === "string" && m.id.length > 0),
      "every rendered message must carry a server id - an id-less row is a scripted/local row",
    );
    const seq0 = first.map((m) => m.id).join(",");
    for (let round = 1; round <= 3; round++) {
      const again = await snapshot(A);
      assert.eq(
        `GET /conversations/:id/messages (re-entry ${round})`,
        again.map((m) => m.id).join(","),
        seq0,
        "re-entering a thread must return identical messages in identical order",
      );
      const peerView = await snapshot(B);
      assert.eq(
        `GET /conversations/:id/messages (peer view, re-entry ${round})`,
        peerView.map((m) => m.id).join(","),
        seq0,
        "the other party must see the same persisted sequence",
      );
    }

    // Center leg: stored Opal reply persists across re-reads.
    await h.centerNewChat(A);
    const sent = await h.centerSend(A, ctx.marker("center persistence question - what can you help with?"));
    const read1 = await h.centerConversation(A);
    const read2 = await h.centerConversation(A);
    const findStored = (c) =>
      (c?.messages || []).find((m) => m.id && m.id === sent.opal?.id) ||
      [...(c?.messages || [])].reverse().find((m) => m.role === "opal");
    const s1 = findStored(read1.conversation);
    const s2 = findStored(read2.conversation);
    assert.check(
      "GET /opal/conversation (Center persistence)",
      !!s1 && !!s2 && s1.id === s2.id && s1.body === s2.body,
      "the stored Center reply must be identical across re-reads (no vanishing suggestions)",
    );
  },
};
