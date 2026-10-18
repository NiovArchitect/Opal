/**
 * FR-17-08 - Center header strip showed fixture times "3:30 / 7:30"
 * instead of his real day (F17-12). Contract on GET /calendar/today
 * (the strip's API output): events trace to real plans; with no
 * plans the output is honestly empty - no fixture times ever.
 */
export default {
  id: "FR-17-08",
  title: "The Center header strip showed fixture times \"3:30 / 7:30\" instead of his real day",
  theme: "Cross-surface consistency and projections",
  class: "A",
  surfaces: ["GET /calendar/today"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const fresh = await ctx.freshClient("+12025550104", "Regression Strip");
    const client = fresh || A;
    const today = await h.calendarToday(client);
    assert.eq("GET /calendar/today", today.status, 200, "strip projection must load");
    if (fresh) {
      assert.eq("GET /calendar/today (fresh account)", today.events.length, 0,
        `a fresh account with no plans today must get an honestly empty strip, never fixture events; got ${today.events.length}: ${JSON.stringify(today.events).slice(0, 200)}`);
    }
    const plans = await h.listPlans(client, true);
    const planIds = new Set(plans.plans.map((p) => p.id));
    for (const e of today.events) {
      const pid = e.plan_id || e.id;
      assert.check("GET /calendar/today (provenance)", !pid || planIds.has(pid) || !!e.calendar_event_id || e.source === "calendar",
        `every strip event must trace to a real plan or calendar row; got plan_id=${pid}`);
    }
  },
};
