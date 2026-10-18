/**
 * FR-13-03 - "Who's coming?" and "Where is dinner?" dead-ended at
 * "Tell me more" (F13-11; F12-04a; F12-31). Contract: answers come
 * from the real plan rows; a proper-noun venue question stays a venue
 * question.
 */
export default {
  id: "FR-13-03",
  title: "\"Who's coming?\" and \"Where is dinner?\" dead-ended at \"Tell me more\"",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two sessions required to build a plan with participants");
    const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
    const convId = direct.conversationId;
    assert.check("setup", !!convId, "a direct conversation is required");
    const created = await h.createConversationPlan(A, convId, {
      title: `Dinner ${ctx.tag}`, option_label: "Dinner", place: "Juniper and Ivy", time_label: "Saturday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "setup plan must be created");
    await h.centerNewChat(A);
    await h.centerSend(A, `About dinner ${ctx.tag} at Juniper and Ivy on Saturday at 7:30 PM`);
    for (const q of ["Who's coming to dinner?", "Where is dinner?"]) {
      const r = await h.centerSend(A, q);
      const body = r.opal?.body || "";
      assert.check(`Center reply (${q})`, !/^tell me more/i.test(body.trim()),
        `"${q}" must not dead-end at "Tell me more"; got: ${body.slice(0, 200)}`);
    }
    const where = await h.centerSend(A, "Where is dinner?");
    assert.check("Center reply (where)", /juniper/i.test(where.opal?.body || ""),
      `the where answer must name the real venue from the plan row; got: ${(where.opal?.body || "").slice(0, 200)}`);
    const venueQ = await h.centerSend(A, "Where is The Henry in Coronado?");
    const vb = venueQ.opal?.body || "";
    assert.check("Center reply (venue question)", !/juniper/i.test(vb),
      `a proper-noun venue question must stay a venue question, not a plan-place answer; got: ${vb.slice(0, 200)}`);
  },
};
