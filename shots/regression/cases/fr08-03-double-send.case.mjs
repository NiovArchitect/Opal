/**
 * FR-08-03 - Center blocked after the first send; double-tapping
 * Send duplicated the message and re-ran the pipeline (FL-R8-04,
 * F13-09). Contract: rapid sends all land in causal order; a replay
 * with the same client_message_id produces exactly one message row.
 */
export default {
  id: "FR-08-03",
  title: "Center blocked after the first send; double-tapping Send duplicated the message",
  theme: "Chat sessions, Center IA, account isolation",
  class: "A",
  surfaces: ["POST /opal/conversation/messages", "GET /opal/conversation"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    const cmid = `r18-${ctx.tag}-doubletap`;
    const text = ctx.marker("double tap");
    const first = await h.centerSend(A, text, { clientMessageId: cmid });
    assert.check("POST messages (first)", first.status === 201 || first.status === 200, `first send must succeed; got ${first.status}`);
    const replay = await h.centerSend(A, text, { clientMessageId: cmid });
    assert.check("POST messages (replay)", replay.status === 201 || replay.status === 200 || replay.status === 409,
      `a replayed send must answer (winner result or honest conflict), got ${replay.status}`);
    const conv = await h.centerConversation(A);
    const copies = (conv.conversation?.messages || []).filter((m) => (m.body || "") === text);
    assert.eq("GET /opal/conversation (dedupe)", copies.length, 1,
      "the same client_message_id must produce exactly one message row, however many times it is replayed");
    // Rapid succession: three sends, none may lock the composer path.
    for (let i = 0; i < 3; i++) {
      const s = await h.centerSend(A, ctx.marker(`rapid ${i}`));
      assert.check("POST messages (rapid)", s.status === 201 || s.status === 200,
        `rapid send ${i} must not be blocked by the previous send; got ${s.status}`);
    }
  },
};
