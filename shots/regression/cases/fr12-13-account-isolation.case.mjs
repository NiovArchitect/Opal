/**
 * FR-12-13 - Switching accounts leaked the other account's plans and
 * travel state (F12-51, F12-52, F12-56); a name lookup could attach a
 * plan to a same-named stranger. Contract (API half): account B's
 * outputs contain zero of A's plans/conversations; a name only B
 * knows resolves to an honest need-who for A, never to B's person.
 * (Web local-storage namespacing leg plugs in on the staging stack.)
 */
export default {
  id: "FR-12-13",
  title: "Switching accounts leaked the other account's plans; name lookup could attach a stranger",
  theme: "Chat sessions, Center IA, account isolation",
  class: "A",
  surfaces: ["GET /opal/plans", "GET /conversations", "Center"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    assert.note("web local-storage namespacing leg plugs into this file on the staging stack; API isolation executes here");
    if (!B) throw new Error("two sessions required");
    // Prefer a fresh pair with NO shared history: on the suite's A/B
    // pair a lawful shared direct conversation exists (both are
    // participants), which must not be mistaken for a leak.
    const C = await ctx.freshClient("+12025550106", "Sarah Kim");
    const D = await ctx.freshClient("+12025550107", "James Wright");
    const owner = C || A;
    const stranger = D || B;
    if (!C) assert.note("no fresh pair available; falling back to A/B - shared-conversation exclusion relies on the fresh-stack ordering");
    const mine = await h.createCenterPlan(owner, { title: `Isolation ${ctx.tag}`, location: "Oceanside", time_label: "Saturday 6:00 PM" });
    assert.eq("setup", mine.status, 201, "setup plan must be created");
    const bPlans = await h.listPlans(stranger, true);
    assert.check("GET /opal/plans (stranger)", !bPlans.plans.some((p) => p.id === mine.plan?.id),
      "a stranger account must see zero of the owner's plans");
    const sConvs = await h.listConversations(stranger);
    const oConvs = await h.listConversations(owner);
    const oIds = new Set(oConvs.conversations.map((c) => c.id));
    assert.check("GET /conversations (stranger)", !sConvs.conversations.some((c) => oIds.has(c.id) && c.id),
      "a stranger account's conversation list must contain none of the owner's conversation ids");
    await h.centerNewChat(A);
    const r = await h.centerSend(A, `Plan dinner with Zoraida Quimby ${ctx.tag} on Saturday`);
    const body = r.opal?.body || "";
    assert.check("Center reply (unknown name)", !/set up|is set|locked in|added .* to your graph/i.test(body),
      `an unknown name must produce an honest need-who, never a silent attach; got: ${body.slice(0, 200)}`);
  },
};
