/**
 * FR-18-B2-02 - Food-step HONESTY case (Repair #18 B2, design 5.2 + 3.4).
 *
 * Absolute law: no code path in the food step may produce an order
 * confirmation / status string without a real provider response. B2 has
 * NO provider ordering integration, so the only lawful outputs are:
 * a composed group list, a handoff (open a real URL / honest no-rail
 * fact), and a person's own self-report ("I placed my order").
 *
 * Asserts on API output:
 *  - The capability matrix declares handoff-only truth.
 *  - Every food-step payload is free of banned claim strings and of any
 *    confirmation-shaped field (order number, ETA, tracking, totals).
 *  - A handoff with no rail held returns the honest no-rail fact, not a
 *    fabricated provider/store URL (no slug-guessed store links).
 *  - Returning / re-reading after a handoff does NOT promote state:
 *    handed_off stays handed_off until the person themselves confirms.
 *
 * Expected on the pre-B2 tip: FAIL - no food capability/handoff surface.
 */
const BANNED = [
  "order placed",
  "order confirmed",
  "confirmed order",
  "on its way",
  "out for delivery",
  "order #",
  "we ordered",
  "opal ordered",
];

export default {
  id: "FR-18-B2-02",
  title: "Food step honesty: handoff only, no fabricated order/confirmation/status, no slug-guessed store URL",
  theme: "home-completion-honesty",
  class: "B",
  surfaces: ["food capability matrix", "food handoff endpoint", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;

    const cap = await A.get("/opal/food/capability");
    assert.eq("GET /opal/food/capability", cap.status, 200, "food capability matrix must be readable");
    if (cap.status === 200) {
      assert.eq("capability", cap.json.claims_ordered_on_handoff, false, "capability must declare claims_ordered_on_handoff=false");
      assert.eq("capability", cap.json.default_mode, "handoff", "default mode is handoff");
      assert.eq("capability", cap.json.payment_handled_by, "provider_only", "payment is the provider's rail only");
      assert.eq("capability", cap.json.address_handled_by, "provider_only", "addresses live on the provider side only");
    }

    // A virtual dinner plan to exercise the handoff shape.
    await h.centerNewChat(A);
    await h.centerSend(A, `Video call dinner Saturday night at home, food delivered to each of us ${ctx.tag}`);
    const plans = await h.listPlans(A);
    const plan = plans.plans.find((p) => p.plan_type === "virtual");
    assert.check("GET /opal/plans", !!plan, "virtual plan must exist");
    if (!plan) return;

    const handoff = await A.post(`/opal/plans/${plan.id}/food/handoff`, { user_authorized: true });
    assert.check("handoff", handoff.status === 200 || handoff.status === 422, `handoff answers honestly (got ${handoff.status})`);
    const blob = JSON.stringify(handoff.json || {}).toLowerCase();
    for (const banned of BANNED) {
      assert.check("banned strings", !blob.includes(banned), `handoff payload must not contain "${banned}"`);
    }
    assert.check(
      "handoff shape",
      handoff.json?.ordered !== true && handoff.json?.provider_confirmed !== true,
      "handoff never sets ordered/provider_confirmed true",
    );
    const url = handoff.json?.handoff_url || handoff.json?.target_url || null;
    if (url) {
      assert.check("handoff URL", /^https:\/\//.test(url), "a handoff URL, when present, is a real held URL");
      assert.check("handoff URL", !/doordash\.com\/store|ubereats\.com\/store|grubhub\.com\/restaurant/.test(url), "never a slug-guessed provider store URL");
    } else {
      assert.check("no-rail honesty", typeof handoff.json?.no_rail_reason === "string" || handoff.status === 422, "with no rail held, the step says so instead of inventing a link");
    }

    // Re-read: a handoff alone must not promote anyone to self-confirmed.
    const after = await h.listPlans(A);
    const p2 = after.plans.find((p) => p.id === plan.id);
    const food = (p2?.completion?.steps || []).find((s) => s.id === "food");
    if (food) {
      const states = (food.recipients || []).map((r) => r.handoff_state);
      assert.check("no return-inference", !states.includes("self_confirmed_done"), "opening a handoff never self-confirms anyone");
      const stepBlob = JSON.stringify(food).toLowerCase();
      for (const banned of BANNED) {
        assert.check("banned strings (step)", !stepBlob.includes(banned), `food step must not contain "${banned}"`);
      }
    }
  },
};
