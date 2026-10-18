/**
 * FR-07-04 - New messages appeared above older ones (FL-R7-005).
 * Contract on GET /conversations/:id/messages (the output the thread
 * renders): chronological order in-session, after re-entry, with the
 * fetched window being the newest page.
 */
export default {
  id: "FR-07-04",
  title: "New messages appeared above older ones in a human thread",
  theme: "Cross-surface consistency and projections",
  class: "A",
  surfaces: ["GET /conversations/:id/messages"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two sessions required");
    const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
    const convId = direct.conversationId;
    const marks = [];
    for (let i = 0; i < 4; i++) {
      const who = i % 2 === 0 ? A : B;
      const text = ctx.marker(`order ${i}`);
      marks.push(text);
      const sent = await h.postHumanMessage(who, convId, text);
      assert.eq("POST /conversations/:id/messages", sent.status, 201, "each send must succeed");
    }
    for (const pass of ["in-session", "after re-entry"]) {
      const read = await h.getHumanMessages(A, convId);
      const bodies = read.messages.map((m) => m.body || "");
      const idx = marks.map((t) => bodies.findIndex((b) => b.includes(t)));
      assert.check(`GET messages (${pass})`, idx.every((i) => i >= 0),
        `all four messages must read back (${pass}); indexes: ${idx.join(",")}`);
      assert.check(`GET messages (${pass})`, idx.every((v, i) => i === 0 || v > idx[i - 1]),
        `messages must be chronological, newest last (${pass}); indexes: ${idx.join(",")}`);
      const stamps = read.messages.map((m) => m.inserted_at || m.created_at || "").filter(Boolean);
      const sorted = [...stamps].sort();
      assert.check(`GET messages (${pass})`, JSON.stringify(stamps) === JSON.stringify(sorted),
        "server timestamps in the rendered window must be non-decreasing");
    }
  },
};
