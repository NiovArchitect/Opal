/**
 * FR-14-02 - The product only understood HIS circle and HIS places
 * (F14-06, F14-07): person extraction knew only Maya/Jordan/
 * Chanelle/Alex, place extraction only 7 venues. Contract: on fresh
 * accounts with randomized names never in the founder's circle,
 * plan creation and recall behave identically in shape.
 */
export default {
  id: "FR-14-02",
  title: "The product only understood HIS circle and HIS places: extraction knew only founder names",
  theme: "Person-agnostic behavior, hardcodes, gyroscope",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const names = [`Zelda ${ctx.tag}`, `Quentin ${ctx.tag}`];
    await h.centerNewChat(A);
    for (const n of names) {
      const before = await h.listPlans(A);
      const r = await h.centerSend(A, `Plan coffee with ${n} on Saturday at 9 AM`);
      const body = r.opal?.body || "";
      assert.check(`Center reply (${n})`, !/don'?t know|who is (that|this)|never heard/i.test(body) || /add|invite|contact/i.test(body),
        `an arbitrary new name must be handled by the generic path (plan or honest invite ask), never "unknown person" hardcode failure; got: ${body.slice(0, 200)}`);
      const after = await h.listPlans(A);
      assert.note(`${n}: plans ${before.plans.length} -> ${after.plans.length}`);
    }
    const venue = await h.centerSend(A, `Find a bakery called Crumb And Craft ${ctx.tag} in Oceanside`);
    assert.check("Center reply (arbitrary venue)", !/don'?t know that place|not a known venue/i.test(venue.opal?.body || ""),
      "an arbitrary venue name must go through generic venue grammar, not a 7-venue allowlist");
  },
};
