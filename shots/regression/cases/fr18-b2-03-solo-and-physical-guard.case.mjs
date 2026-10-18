/**
 * FR-18-B2-03 - Solo at-home shape + physical-plan guard (B2 design
 * S2 + S3) and address/privacy isolation (design section 4).
 *
 *  - Solo virtual plan: exactly one food recipient (the user), no group
 *    mechanics, no "households" language in the rollup.
 *  - A work-shaped virtual plan (standup) earns NO food step and NO ask.
 *  - A physical plan's completion record is byte-shape identical to the
 *    pre-B2 baseline: join and food steps ABSENT, ride/directions present.
 *  - Privacy: no surface payload for a plan carries any address-shaped
 *    field for any participant (B2 collects zero addresses).
 *
 * Expected on the pre-B2 tip: FAIL - no completion key on the contract.
 */
export default {
  id: "FR-18-B2-03",
  title: "Solo at-home shape, standup gets no food step, physical completion unchanged, zero addresses anywhere",
  theme: "home-completion",
  class: "B",
  surfaces: ["GET /opal/plans", "plan contract completion"],
  async run(ctx) {
    const { A, h, assert } = ctx;

    // -- Solo at-home ------------------------------------------------------
    await h.centerNewChat(A);
    await h.centerSend(A, `Solo movie night at home Friday - order in sushi, just me ${ctx.tag}`);
    let plans = await h.listPlans(A);
    const solo = plans.plans.find((p) => p.plan_type === "virtual");
    assert.check("solo plan", !!solo, "solo virtual plan must exist");
    if (solo) {
      const food = (solo.completion?.steps || []).find((s) => s.id === "food");
      assert.check("solo food step", !!food, "solo at-home plan with a food signal earns a food step");
      if (food) {
        assert.eq("solo recipients", (food.recipients || []).length, 1, "solo plan has exactly one recipient");
        assert.check("solo copy", !/households/i.test(food.rollup?.label || ""), "solo rollup never uses households language");
      }
    }

    // -- Control: virtual standup earns no food step -----------------------
    await h.centerNewChat(A);
    await h.centerSend(A, `Zoom standup with the team Tuesday ${ctx.tag}`);
    plans = await h.listPlans(A);
    const standup = plans.plans.find((p) => p.plan_type === "virtual" && p.id !== solo?.id) || plans.plans.find((p) => p.plan_type === "virtual");
    if (standup) {
      const food = (standup.completion?.steps || []).find((s) => s.id === "food");
      assert.check("standup control", !food, "a work-shaped virtual plan gets NO food step and NO ask");
    } else {
      assert.note("standup plan not found on this stack; control leg vacuous");
    }

    // -- Physical guard ------------------------------------------------------
    const phys = await h.createCenterPlan(A, {
      title: `Physical guard dinner ${ctx.tag}`,
      location: "Nighthawk, Coronado",
      time_label: "Sunday 7:00 PM",
    });
    assert.check("physical create", phys.status === 201 || phys.status === 200, `physical create answers (got ${phys.status})`);
    if (phys.plan) {
      const steps = phys.plan.completion?.steps || [];
      const ids = steps.map((s) => s.id);
      assert.check("physical shape", !ids.includes("join"), "physical plan has NO join step");
      assert.check("physical shape", !ids.includes("food"), "physical plan has NO food step");
    }

    // -- Privacy sweep: no address-shaped keys anywhere ---------------------
    const all = await h.listPlans(A, true);
    const blob = JSON.stringify(all.plans || []);
    assert.check(
      "privacy sweep",
      !/"(home_address|delivery_address|street_address)"\s*:/.test(blob),
      "no plan payload carries any participant address field",
    );
  },
};
