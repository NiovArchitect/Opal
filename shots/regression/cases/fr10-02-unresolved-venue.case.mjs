/**
 * FR-10-02 - Unresolved venues (FL-R10-04, FL-R9-03 partial, F15-11):
 * the product must stay honest, keep the requested identity, and
 * never fabricate a match. Executable locally by design - honesty
 * behavior needs no provider credential.
 */
export default {
  id: "FR-10-02",
  title: "Unresolved venues: stay honest, keep the requested identity, never fabricate a match",
  theme: "Venue search and provider honesty",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const fakeName = `Zqxwv Unicorn Bistro ${ctx.tag}`;
    await h.centerNewChat(A);
    const r = await h.centerSend(A, `Find ${fakeName} in Coronado`);
    const body = r.opal?.body || "";
    assert.check("Center reply", !/found it|here it is|located at \d/i.test(body),
      `an unresolvable venue must never be announced as found with a fabricated address; got: ${body.slice(0, 240)}`);
    assert.check("Center reply", /couldn'?t|not found|no match|unresolved|unable|don'?t see|can'?t find/i.test(body) || body.includes(ctx.tag) || /Zqxwv/.test(body),
      `the reply must honestly name the attempted venue or its unresolved state; got: ${body.slice(0, 240)}`);
    const plans = await h.listPlans(A);
    const p = plans.plans.find((x) => /Zqxwv/.test(`${x.title || ""} ${x.location || ""}`));
    if (p) {
      assert.check("GET /opal/plans (identity preserved)", /Zqxwv/.test(p.location || p.title || ""),
        "the requested venue identity must be preserved on the plan, never replaced by a substitute");
    }
  },
};
