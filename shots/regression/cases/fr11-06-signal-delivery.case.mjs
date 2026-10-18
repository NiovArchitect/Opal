/**
 * FR-11-06 - Plan signals never arrived (R11 H1 channel filter);
 * broadcasts could fire before commit, painting ghost plans (R11
 * W2). API contract asserted here: after A proposes, B's read-back
 * surfaces show the signal state; a rolled-back/invalid create
 * leaves NO plan visible to anyone (no ghost). The live channel
 * push leg (Phoenix socket) plugs into this file on the staging
 * stack - noted, not silently dropped.
 */
export default {
  id: "FR-11-06",
  title: "Plan signals never arrived: broadcasts dropped; pre-commit broadcasts painted ghost plans",
  theme: "Cross-surface consistency and projections",
  class: "A",
  surfaces: ["GET /conversations/:id/alignment", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    assert.note("live Phoenix-channel push leg plugs into this file on the staging stack; read-back + ghost legs execute here");
    if (!B) throw new Error("two sessions required");
    const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
    const convId = direct.conversationId;
    const created = await h.createConversationPlan(A, convId, {
      title: `Signal ${ctx.tag}`, option_label: "Dinner", place: "Oceanside", time_label: "Saturday 7:30 PM",
    });
    assert.eq("setup", created.status, 201, "setup plan must be created");
    const bPlans = await h.listPlans(B, true);
    assert.check("GET /opal/plans (participant B)", bPlans.plans.some((p) => p.id === created.plan?.id),
      "the participant's surfaces must receive the plan - a dropped signal leaves B with nothing");
    const bAl = await h.getAlignment(B, convId);
    assert.check("GET alignment (B)", bAl.status === 200 && !!bAl.alignment,
      "B's thread alignment must carry the plan state");
    // Ghost leg: an invalid create must leave nothing behind.
    const beforeA = await h.listPlans(A, true);
    const bad = await A.post(`/conversations/${encodeURIComponent(convId)}/plans`, { title: "", time_label: "Saturday 25:99 XM" });
    assert.check("POST invalid plan", bad.status >= 400, `an invalid plan create must be refused, got ${bad.status}`);
    const afterA = await h.listPlans(A, true);
    assert.eq("GET /opal/plans (no ghost)", afterA.plans.length, beforeA.plans.length,
      "a refused create must paint no ghost plan on any surface");
  },
};
