/**
 * FR-12-07 - Plans created in Center were invisible in Graphs,
 * Timeline and the peer's chat (F12-06, F12-07). Contract: a
 * conversation-less Center plan appears in the owner listing for the
 * owner only; cancelled plans are excluded from the default listing.
 */
export default {
  id: "FR-12-07",
  title: "Plans created in Center were invisible in Graphs, Timeline and the peer's chat",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center", "GET /opal/plans", "GET /calendar/today"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    const created = await h.createCenterPlan(A, {
      title: `Center visibility ${ctx.tag}`, location: "Oceanside Pier", time_label: "Saturday 6:00 PM",
    });
    assert.eq("POST /opal/plans", created.status, 201, "Center plan create must succeed");
    const mine = await h.listPlans(A);
    assert.check("GET /opal/plans (owner)", mine.plans.some((p) => p.id === created.plan?.id),
      "a Center-created plan must read back in the owner listing (Graphs/Timeline projection)");
    if (B) {
      const theirs = await h.listPlans(B);
      assert.check("GET /opal/plans (other account)", !theirs.plans.some((p) => p.id === created.plan?.id),
        "a Center plan must be absent for every other account");
    } else {
      assert.note("no session B: cross-account absence leg not run");
    }
  },
};
