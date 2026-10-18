/**
 * FR-12-14 - Dateless plans bucketed to "next week"; a missing graph
 * rendered a hollow sheet; load errors showed raw exception text
 * (F12-47, F12-46, F12-44). Contract: nonexistent graph = honest
 * 404 with human copy; dateless plan never carries a next-week
 * bucket; error payloads never leak exception internals.
 */
export default {
  id: "FR-12-14",
  title: "Dateless plans bucketed to \"next week\"; missing graph a hollow sheet; raw exception text",
  theme: "Clock, bucketing, misc rendering truth",
  class: "A",
  surfaces: ["GET /journeys/:id", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const missing = await A.get("/journeys/00000000-0000-0000-0000-000000000000");
    assert.eq("GET /journeys/:id (missing)", missing.status, 404,
      "a missing graph must be an honest not-found, never a hollow 200 sheet");
    assert.check("GET /journeys/:id (error copy)", !/Ecto\.|Phoenix\.|\(elixir|stacktrace/i.test(JSON.stringify(missing.json)),
      "error output must be human copy, never raw exception text");
    const dateless = await h.createCenterPlan(A, { title: `Bucket ${ctx.tag}`, location: "Oceanside" });
    if (dateless.plan) {
      const plans = await h.listPlans(A, true);
      const entry = plans.plans.find((p) => p.id === dateless.plan.id);
      assert.check("GET /opal/plans (dateless bucket)", !!entry && !/next_week|next week/i.test(JSON.stringify(entry)),
        "a dateless plan must render under someday/no bucket, never next week");
    } else {
      assert.note(`dateless create answered ${dateless.status}; bucket leg not assertable`);
    }
  },
};
