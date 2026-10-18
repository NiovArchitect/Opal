/**
 * FR-17-04 - A bare "yes" resurrected a dead flow (F17-09; R5 double
 * "set this up?"; F13-07 "yes" twice made two plans). Contract: a yes
 * with no live ask creates nothing and claims nothing; yes twice to
 * one live ask creates at most one plan.
 */
export default {
  id: "FR-17-04",
  title: "A bare \"yes\" resurrected a dead flow: \"Done. Nighthawk with Maya is set up\"",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    await h.centerSend(A, "What is the weather like in San Diego?");
    const before = await h.listPlans(A);
    const r = await h.centerSend(A, "yes");
    const body = r.opal?.body || "";
    assert.check("Center reply (bare yes)", !/set up|is set|locked in|done\./i.test(body) || /nothing|no .*pending|what/i.test(body),
      `a bare yes with no live ask must not claim a set-up; got: ${body.slice(0, 200)}`);
    assert.check("Center reply (bare yes)", !/nighthawk/i.test(body),
      `a bare yes must not resurrect Nighthawk; got: ${body.slice(0, 200)}`);
    const after = await h.listPlans(A);
    assert.eq("GET /opal/plans", after.plans.length, before.plans.length,
      "a bare yes with no live ask must create zero plans");

    // Yes twice to one live ask: at most one new plan.
    await h.centerNewChat(A);
    await h.centerSend(A, `Plan dinner at Nighthawk in Coronado on Sunday at 7 PM ${ctx.tag}`);
    const mid = await h.listPlans(A);
    await h.centerSend(A, "yes");
    await h.centerSend(A, "yes");
    const end = await h.listPlans(A);
    assert.check("GET /opal/plans", end.plans.length - mid.plans.length <= 1,
      `answering yes twice to one ask must create at most one plan; created ${end.plans.length - mid.plans.length}`);
  },
};
