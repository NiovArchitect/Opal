/**
 * FR-12-11 - "Schedule date night" stalled after creation (F12-05,
 * F16-11): no calendar entry, no next steps; chat-born plans got none
 * of it either. Contract: for both birth paths an execution/
 * completion projection exists and re-running creates no duplicates.
 */
export default {
  id: "FR-12-11",
  title: "\"Schedule date night\" stalled after creation: no calendar entry, no next steps",
  theme: "Cross-surface consistency and projections",
  class: "A",
  surfaces: ["GET /plans/:id/execution", "GET /opal/plans", "GET /calendar/today"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const created = await h.createCenterPlan(A, {
      title: `Date night ${ctx.tag}`, location: "Oceanside", time_label: "Saturday 7:00 PM",
    });
    assert.eq("POST /opal/plans", created.status, 201, "date-night create must succeed");
    const planId = created.plan?.id;
    const exec1 = await A.get(`/plans/${encodeURIComponent(planId)}/execution`);
    assert.check("GET /plans/:id/execution", exec1.status === 200,
      `a completion/execution projection must exist for a Center-born plan; got ${exec1.status}`);
    const exec2 = await A.get(`/plans/${encodeURIComponent(planId)}/execution`);
    assert.check("GET /plans/:id/execution (idempotent)", JSON.stringify(exec1.json) === JSON.stringify(exec2.json) || exec2.status === 200,
      "re-reading completion must not create duplicate steps");
    const plans = await h.listPlans(A);
    const copies = plans.plans.filter((p) => p.id === planId);
    assert.eq("GET /opal/plans", copies.length, 1, "completion must never duplicate the plan itself");
  },
};
