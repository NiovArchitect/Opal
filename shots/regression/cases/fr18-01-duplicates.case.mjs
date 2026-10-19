/**
 * FR-18-01 - Duplicate forming plans for the same intent (F18-06).
 *
 * Founder symptom: eight duplicate forming plans for the same intent;
 * merely opening a conversation minted a plan.
 *
 * Contract asserted on API output (the surfaces render these outputs):
 *  - Opening a conversation (messages read + alignment read, the exact
 *    reads the client performs on open) creates zero plans.
 *  - The same owner + participants + venue + day intent dedupes to ONE
 *    plan across creation paths (direct Center plan create, Center chat
 *    confirm flow, graph-create with a fresh key).
 *  - The owner plan listing (Graphs) therefore shows one card per intent.
 *
 * Expected on the R17 tip: FAIL - create_tentative_plan_from_center has
 * no dedupe without a decision_id its main caller never supplies, and
 * the alignment fold mints a plan when a seeded conversation opens.
 */
export default {
  id: "FR-18-01",
  title: "Duplicate forming plans for the same intent; opening a conversation mints a plan",
  theme: "duplicates",
  class: "A",
  surfaces: ["Graphs", "Center", "human threads", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const title = `Dinner at Campfire ${ctx.tag}`;

    const before = await h.listPlans(A);
    assert.eq("GET /opal/plans", before.status, 200, "plan listing must load");
    const beforeIds = new Set(before.plans.map((p) => p.id));

    // -- Leg 1: opening conversations creates zero plans ----------------
    const convs = await h.listConversations(A);
    if (convs.conversations.length === 0) {
      assert.note(
        "no human conversations for session A (seed mode off and no prior chats); opening leg is vacuous on this stack",
      );
    }
    for (const c of convs.conversations.slice(0, 8)) {
      await h.getHumanMessages(A, c.id);
      await h.getAlignment(A, c.id);
    }
    const afterOpen = await h.listPlans(A);
    const mintedByOpen = afterOpen.plans.filter((p) => !beforeIds.has(p.id));
    assert.eq(
      "human thread open (messages + alignment read)",
      mintedByOpen.length,
      0,
      "opening a conversation must create zero plans",
    );

    // -- Leg 2: direct Center plan create, same intent twice ------------
    const attrs = {
      title,
      location: "Nighthawk, Coronado",
      time_label: "Sunday 7:00 PM",
    };
    const first = await h.createCenterPlan(A, attrs);
    assert.eq("POST /opal/plans", first.status, 201, "first create must succeed");
    const second = await h.createCenterPlan(A, attrs);
    assert.eq("POST /opal/plans", second.status, 201, "second create must answer, not error");
    if (first.plan && second.plan) {
      assert.eq(
        "POST /opal/plans (dedupe)",
        second.plan.id,
        first.plan.id,
        "re-creating the same intent must return the existing plan, not a second row",
      );
    }

    // -- Leg 3: Center chat, same intent in varied words ----------------
    await h.centerNewChat(A);
    const phrases = [
      `Plan dinner at Nighthawk with Maya on Sunday at 7 PM`,
      `Nighthawk Sunday with Maya for dinner`,
      `Maya, Nighthawk, this Sunday - dinner`,
    ];
    for (const body of phrases) {
      await h.centerSend(A, body);
    }

    // -- Leg 4: graph-create, fresh key, same intent ---------------------
    const gc = await h.createGraphPlan(A, {
      title,
      location: "Nighthawk, Coronado",
      time_label: "Sunday 7:00 PM",
      idempotency_key: `r18-${ctx.tag}-fresh-key`,
    });
    assert.check(
      "POST /opal/plans/graph-create",
      gc.status === 201 || gc.status === 200,
      `graph-create must answer (got ${gc.status})`,
    );

    // -- Read-back: Graphs listing shows ONE plan for this intent -------
    const after = await h.listPlans(A);
    const intentPlans = after.plans.filter(
      (p) =>
        !beforeIds.has(p.id) &&
        ((p.title || "").includes(ctx.tag) ||
          /nighthawk/i.test(p.title || "") ||
          /dinner/i.test(p.title || "")),
    );
    const distinctIds = new Set(intentPlans.map((p) => p.id));
    assert.eq(
      "GET /opal/plans (Graphs read-back)",
      distinctIds.size,
      1,
      `the same dinner intent across all creation paths must be exactly one plan; found ${distinctIds.size}: ${[...distinctIds].join(", ")}`,
    );
  },
};
