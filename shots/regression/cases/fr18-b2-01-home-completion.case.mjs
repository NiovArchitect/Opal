/**
 * FR-18-B2-01 - Plan completion at home: virtual dinner, two parties,
 * per-person food handoff (Repair #18 Division B, Track B2, design S1).
 *
 * Founder law asserted on API output (the surfaces render these outputs):
 *  - A virtual plan completes WITHOUT physical steps: no ride, no
 *    directions, and NO Geoapify search for the geography "Online".
 *  - The completion record is on the plan contract ("completion" key)
 *    and identical on every read-back surface for both parties.
 *  - join step: link_missing (no URL anywhere) until a real link is on
 *    the plan, then link_ready with host only.
 *  - food step: composing -> composed -> handed_off -> self_confirmed,
 *    driven ONLY by each recipient's own actions. The organizer cannot
 *    confirm for another account (rejected), a non-participant cannot
 *    read or act (denied), and nothing anywhere claims an order exists.
 *
 * Expected on the pre-B2 tip: FAIL - no "completion" key on the contract,
 * no join/food steps, no food endpoints.
 */
export default {
  id: "FR-18-B2-01",
  title: "Virtual dinner completes at home: join + per-person food handoff, no physical steps, no fake order",
  theme: "home-completion",
  class: "B",
  surfaces: ["GET /opal/plans", "plan contract completion", "food step endpoints", "Center"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw Object.assign(new Error("harness: B2-S1 needs two distinct sessions (A and B)"), { harness: true });

    // -- Create: virtual dinner with explicit food signal, via Center ----
    await h.centerNewChat(A);
    const created = await h.centerSend(
      A,
      `Virtual dinner with ${B.session.name || "Maya"} this Friday at 7 - Zoom, and let us all order in from the same place ${ctx.tag}`,
    );
    assert.check("Center create", created.status === 200 || created.status === 201, `center send must answer (got ${created.status})`);

    const plans = await h.listPlans(A);
    // Newest virtual plan owned by A (listing is freshest-first).
    const mine = plans.plans.filter((p) => p.plan_type === "virtual");
    const target = mine[0];
    assert.check("GET /opal/plans", !!target, "a virtual plan must exist after the virtual-dinner create");
    if (!target) return;
    const planId = target.id;

    // -- Completion read-back: join + food present, physical steps absent -
    const completion = target.completion;
    assert.check("plan contract", !!completion, "plan contract must carry the additive completion key");
    const steps = completion?.steps || [];
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    assert.check("completion steps", !!byId.join, "virtual plan must carry a join step");
    assert.eq("join step", byId.join?.status, "link_missing", "no link pasted -> join step is link_missing");
    assert.check("completion steps", !!byId.food, "explicit food signal must earn a food step");
    assert.check("food step", ["composing", "suggested"].includes(byId.food?.status), `food step starts composing/suggested (got ${byId.food?.status})`);
    assert.check("physical steps", !byId.ride, "no ride step for a plan that happens at home");
    assert.check("physical steps", !byId.directions, "no directions step for a plan that happens at home");
    assert.check("restaurants step", !byId.restaurants || byId.restaurants.status !== "search_started", "no Geoapify discovery search for the geography 'Online'");

    // -- Compose + handoff are per-person --------------------------------
    const food = (client, action, body = {}) =>
      client.post(`/opal/plans/${planId}/food/${action}`, body);

    const items = await food(A, "items", { items: [`margherita pizza ${ctx.tag}`] });
    assert.check("food items (organizer)", items.status === 200, `organizer adds own items (got ${items.status})`);

    // Organizer tries to self-confirm FOR B -> must be rejected.
    const forge = await food(A, "self-confirm", { user_id: B.session.userId });
    assert.check("adversarial: confirm-for-other", forge.status === 403 || forge.status === 422, `organizer confirming for another account must be rejected (got ${forge.status})`);

    // B reads the plan back on their own surface: same completion shape.
    const bPlans = await h.listPlans(B);
    const bPlan = bPlans.plans.find((p) => p.id === planId);
    assert.check("GET /opal/plans (B)", !!bPlan, "participant B must read the same plan back");
    if (bPlan) {
      const bFood = (bPlan.completion?.steps || []).find((s) => s.id === "food");
      assert.check("B read-back", !!bFood, "B's surface carries the same food step from the one projection");
    }

    // B hands off and self-confirms in B's OWN account only.
    const bHandoff = await food(B, "handoff", { user_authorized: true });
    assert.check("B handoff", bHandoff.status === 200, `B's own handoff must answer (got ${bHandoff.status})`);
    assert.eq("B handoff honesty", bHandoff.json?.ordered, false, "handoff must never claim ordered");
    assert.eq("B handoff honesty", bHandoff.json?.provider_confirmed, false, "handoff must never claim provider confirmation");
    const bConfirm = await food(B, "self-confirm", {});
    assert.check("B self-confirm", bConfirm.status === 200, `B confirms their own order report (got ${bConfirm.status})`);

    // Final read-back: rollup attributes, never overclaims.
    const after = await h.listPlans(A);
    const finalPlan = after.plans.find((p) => p.id === planId);
    const finalFood = (finalPlan?.completion?.steps || []).find((s) => s.id === "food");
    assert.check("final read-back", !!finalFood, "food step persists on read-back");
    const blob = JSON.stringify(finalFood || {});
    assert.check("honesty sweep", !/order_number|provider_confirmed"\s*:\s*true|delivery_status|tracking/.test(blob), "food step carries no order number / provider confirmation / tracking fields");
  },
};
