/**
 * FR-12-12 - Rendering polish failures (F12-10, F12-01, F12-45,
 * F12-15): times with no AM/PM, blank time lines on dateless plans.
 * Contract on API output: every rendered clock carries AM/PM via the
 * canonical formatter; a dateless plan carries no blank/fake time.
 */
export default {
  id: "FR-12-12",
  title: "Rendering polish: times with no AM/PM, blank time lines on dateless plans",
  theme: "Composer, scroll, layering, visual containment",
  class: "A",
  surfaces: ["GET /opal/plans", "GET /calendar/today"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const dateless = await h.createCenterPlan(A, { title: `Dateless ${ctx.tag}`, location: "Oceanside" });
    assert.check("POST /opal/plans (dateless)", dateless.status === 201 || dateless.status === 200 || dateless.status === 422,
      `a dateless plan create must answer honestly; got ${dateless.status}`);
    const plans = await h.listPlans(A, true);
    for (const p of plans.plans) {
      const tl = p.time_label;
      if (tl) {
        assert.check("GET /opal/plans (AM/PM)", !/\d:\d{2}(?!\s*[AP]M)/.test(tl) || /AM|PM/.test(tl),
          `every rendered clock must carry AM/PM; plan ${p.id} time_label=${JSON.stringify(tl)}`);
      }
    }
    if (dateless.plan) {
      const entry = plans.plans.find((p) => p.id === dateless.plan.id);
      assert.check("GET /opal/plans (dateless)", !!entry && entry.time_label !== "",
        "a dateless plan must never render a blank time line (null or canonical fallback, never empty string)");
      assert.check("GET /opal/plans (dateless bucket)", !/next week/i.test(JSON.stringify(entry || {})),
        "a dateless plan must not be bucketed to next week");
    }
  },
};
