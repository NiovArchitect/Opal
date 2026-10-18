/**
 * FR-07-03 - Chat - plan - Back landed on Graphs instead of back in
 * the chat (FL-R7-004). Navigation itself is a client behavior; the
 * automatable API contract asserted here: the plan/journey output
 * carries its source conversation id, so every entry point can
 * return to its origin. The tap-level Back behavior plugs into this
 * file on the staging web stack (noted, not silently dropped).
 */
export default {
  id: "FR-07-03",
  title: "Chat - plan - Back landed on Graphs instead of back in the chat",
  theme: "Cross-surface consistency and projections",
  class: "A",
  surfaces: ["GET /journeys/:id", "GET /conversations/:id/alignment"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    assert.note("tap-level Back behavior is a web-client leg for the staging stack; this file proves the return-address contract it depends on");
    // The graph-detail surface serves journey plans (a non-journey
    // SharedPlan lawfully answers 409 not_journey). The founder's
    // specimen is the seeded journey + its thread; fall back to a
    // conversation plan only when seed mode is off.
    let planId = ctx.seed?.graph?.json?.shared_plan_id || null;
    let convId = ctx.seed?.graph?.json?.conversation_id || null;
    if (!planId) {
      if (!B) throw new Error("two sessions required when seed mode is off");
      const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
      convId = direct.conversationId;
      const created = await h.createConversationPlan(A, convId, {
        title: `Back nav ${ctx.tag}`, option_label: "Dinner", place: "Oceanside", time_label: "Saturday 7:00 PM",
      });
      assert.eq("setup", created.status, 201, "setup plan must be created");
      planId = created.plan?.id;
    }
    const j = await A.get(`/journeys/${encodeURIComponent(planId)}`);
    assert.eq("GET /journeys/:id", j.status, 200, "plan detail must load");
    const blob = JSON.stringify(j.json);
    assert.check("GET /journeys/:id (return address)", blob.includes(convId),
      "the plan detail output must carry its source conversation id so Back can return to that exact thread");
  },
};
