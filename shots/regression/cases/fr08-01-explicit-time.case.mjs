/**
 * FR-08-01 - Explicit time softened: "The Henry, Sunday 10 AM" became
 * 7:30 (FL-R8-02). Contract: the stored/displayed time is exactly the
 * explicit one on every surface; soft defaults fire only with no
 * explicit time in the utterance.
 */
export default {
  id: "FR-08-01",
  title: "An explicit time was softened: \"The Henry, Sunday 10 AM\" became 7:30",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    // An earlier 7:30 plan exists so a soft default could leak.
    await h.createCenterPlan(A, { title: `Earlier dinner ${ctx.tag}`, location: "Juniper and Ivy", time_label: "Friday 7:30 PM" });
    const before = await h.listPlans(A);
    const beforeIds = new Set(before.plans.map((p) => p.id));
    await h.centerSend(A, `Plan brunch at The Henry in Coronado on Sunday at 10 AM ${ctx.tag}`);
    const after = await h.listPlans(A);
    const fresh = after.plans.filter((p) => !beforeIds.has(p.id));
    const henry = fresh.find((p) => /henry/i.test(`${p.title || ""} ${p.location || ""}`)) || fresh[0];
    if (henry) {
      assert.check("GET /opal/plans", /10:00 AM|10 AM/.test(henry.time_label || ""),
        `the explicit 10 AM must be stored exactly; got time_label=${JSON.stringify(henry.time_label)}`);
      assert.check("GET /opal/plans", !/7:30/.test(henry.time_label || ""),
        "the explicit time must not be softened to 7:30");
    } else {
      // Chat path may hold the plan as a proposal; the reply must still
      // carry the explicit time, never 7:30.
      const conv = await h.centerConversation(A);
      const msgs = conv.conversation?.messages || [];
      const last = [...msgs].reverse().find((m) => m.role === "opal");
      assert.check("Center reply", /10(:00)?\s*AM/i.test(last?.body || "") && !/7:30/.test(last?.body || ""),
        `with no plan row yet, the Center reply must carry the explicit 10 AM; got: ${(last?.body || "").slice(0, 200)}`);
    }
  },
};
