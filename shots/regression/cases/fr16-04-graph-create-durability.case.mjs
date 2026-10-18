/**
 * FR-16-04 - Graph-create completions vanished on navigation
 * (F16-01, F16-02): the write-only-state disease. Contract: a
 * completed graph-create reads back as a durable SharedPlan via the
 * owner plan API; replaying the same graph_create key returns the
 * existing plan, never a second one; cancelled plans drop out.
 */
export default {
  id: "FR-16-04",
  title: "Graph-create completions vanished on navigation - same write-only-state disease as Post",
  theme: "Stories, posts, graph-create durability",
  class: "A",
  surfaces: ["POST /opal/plans/graph-create", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const key = `r18-${ctx.tag}-graphcreate`;
    const attrs = { title: `Graph create ${ctx.tag}`, location: "Oceanside", time_label: "Saturday 6:00 PM", idempotency_key: key };
    const first = await h.createGraphPlan(A, attrs);
    assert.check("POST graph-create", first.status === 201 || first.status === 200, `graph-create must succeed; got ${first.status}`);
    const listed = await h.listPlans(A);
    assert.check("GET /opal/plans (durable read-back)", listed.plans.some((p) => p.id === first.plan?.id),
      "a graph-create completion must read back as a durable plan in the Graphs list, not vanish on navigation");
    const replay = await h.createGraphPlan(A, attrs);
    assert.check("POST graph-create (replay)", (replay.status === 201 || replay.status === 200) && replay.plan?.id === first.plan?.id,
      `replaying the same graph_create key must return the existing plan; got status=${replay.status} id=${replay.plan?.id} vs ${first.plan?.id}`);
    const after = await h.listPlans(A);
    assert.eq("GET /opal/plans (no duplicate)", after.plans.filter((p) => p.id === first.plan?.id).length, 1,
      "the replayed completion must appear exactly once");
  },
};
