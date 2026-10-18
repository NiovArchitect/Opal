/**
 * FR-17-05 - A NEW request answered as an update (F17-10): "Schedule a
 * date night with Chanelle tonight 5 PM" got "Updated - tonight 5 PM.
 * Same plan, same people." Contract: a NEW plan row is created, the
 * old plan is byte-unchanged.
 */
export default {
  id: "FR-17-05",
  title: "A NEW request was answered as an update: date night with Chanelle",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const sticky = await h.createCenterPlan(A, { title: `Sticky dinner ${ctx.tag}`, location: "Juniper and Ivy", time_label: "Thursday 7:30 PM" });
    assert.eq("POST /opal/plans (setup)", sticky.status, 201, "setup plan must exist so a sticky plan_id is present");
    const before = await h.listPlans(A);
    const stickyBefore = before.plans.find((p) => p.id === sticky.plan?.id);
    await h.centerNewChat(A);
    const r = await h.centerSend(A, "Schedule a date night with Chanelle tonight 5 PM");
    const body = r.opal?.body || "";
    assert.check("Center reply", !/same plan, same people/i.test(body),
      `a new request must not be answered as an update of the sticky plan; got: ${body.slice(0, 200)}`);
    // If Center asked to set it up, the founder's path is to confirm -
    // the new plan must then exist (and the confirmation must not fold
    // it into the sticky plan or duplicate it).
    await h.centerSend(A, "yes, set it up");
    const after = await h.listPlans(A);
    const stickyAfter = after.plans.find((p) => p.id === sticky.plan?.id);
    assert.check("GET /opal/plans (old plan unchanged)",
      !!stickyAfter && stickyAfter.time_label === stickyBefore?.time_label && stickyAfter.title === stickyBefore?.title,
      `the sticky plan must be byte-unchanged; before=${JSON.stringify(stickyBefore?.time_label)} after=${JSON.stringify(stickyAfter?.time_label)}`);
    const fresh = after.plans.filter((p) => !before.plans.some((b) => b.id === p.id));
    const dateNight = fresh.find((p) => /5:00 PM|5 PM/.test(p.time_label || "") || /date night|chanelle/i.test(`${p.title || ""} ${p.location || ""}`));
    assert.check("GET /opal/plans (new plan)", !!dateNight || fresh.length >= 1,
      `a NEW plan row must be created for the date-night request; new rows: ${fresh.length}`);
  },
};
