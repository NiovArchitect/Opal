/**
 * FR-18-DIR1-02 - Plan-awareness scope and exit legs (DIR-1).
 *
 * Negative legs of the same contract as FR-18-DIR1-01:
 *   - a plan with a third person does NOT surface in a different
 *     person's chats row, thread, or call-log row (scope law: a
 *     plan surfaces only to its parties, in their own rows);
 *   - a cancelled plan's fact exits on all three contracts the
 *     moment the cancel lands (L8 presence discipline - a past or
 *     cancelled plan never lingers as debris).
 *
 * Backend ground truth (including the past-plan exit leg, which a
 * live stack cannot time-travel) is proven in the ExUnit suite
 * (repair18_dir1_next_plan_test.exs) against the same contracts.
 *
 * Isolation repair (Repair #18 dir1-casefix): on the shared suite
 * pair every "stays empty" / "after cancel" leg bound to a sibling
 * case's leftover plan (FR-18-DIR1-01's plan on the shared A-B
 * thread) - the find-or-create / first-match contamination class
 * the casefix wave repaired for FR-18-02-revision. The case now
 * provisions its OWN synthetic trio (+12025550118 / +12025550119 /
 * +12025550120, plus silent thirds +12025550121 / +12025550122 so
 * both the A-B and the A-C threads are real group threads created
 * fresh per run), binds each plan by id-set difference, and cancels
 * its own A-C plan at the end so a re-run on the same stack starts
 * clean. The pair's direct thread is kept only to place the 1:1
 * call (calls are direct-only); the call row's plan fact is
 * per-peer. Where synthetic provisioning is unavailable the case
 * keeps its original shape. The contract assertions are unchanged
 * - isolation changes the fixture, never the standard.
 */
export default {
  id: "FR-18-DIR1-02",
  title: "Plan awareness: a third person's plan never leaks; a cancelled plan exits everywhere",
  theme: "dir1-plan-awareness",
  class: "A",
  surfaces: [
    "GET /conversations (next_plan)",
    "GET /conversations/:id/messages (next_plan)",
    "GET /calls (next_plan)",
    "POST /opal/plans/:id/cancel",
  ],
  async run(ctx) {
    let { A, B, h, assert } = ctx;
    if (!B) {
      throw new Error("setup failed: FR-18-DIR1-02 needs a second session (OPAL_TOKEN_B / synthetic B)");
    }
    let bId = ctx.sessions.b.userId;

    // Own provisioned trio + silent thirds (isolation repair above):
    // dedicated numbers no other case uses, so the A-B and A-C
    // threads, plans and call rows below are private to this case.
    const ownA = await ctx.freshClient("+12025550118", "Regression DIR1 Scope A");
    const ownB = await ctx.freshClient("+12025550119", "Regression DIR1 Scope B");
    const ownC = await ctx.freshClient("+12025550120", "Regression DIR1 Scope C");
    const silentAB = await ctx.freshClient("+12025550121", "Regression DIR1 Scope Silent AB");
    const silentAC = await ctx.freshClient("+12025550122", "Regression DIR1 Scope Silent AC");
    if (ownA && ownB) {
      A = ownA;
      B = ownB;
      bId = ownB.session.userId;
    }

    // A fresh third person with their own conversation with A: a
    // group thread created fresh for this run when the case's own
    // silent A-C third is available, else the third person's direct
    // conversation (the original shape).
    let third = null;
    let convAC = null;
    if (ownC?.session?.userId) {
      third = { conversationId: null, client: ownC, userId: ownC.session.userId };
      if (silentAC?.session?.userId) {
        const gAC = await h.createGroup(
          A,
          [ownC.session.userId, silentAC.session.userId],
          ctx.marker("dir1 scope a-c"),
        );
        convAC = gAC.conversationId || null;
      }
      if (!convAC) {
        const dAC = await h.ensureDirect(A, ownC.session.userId);
        convAC = dAC.conversationId || null;
      }
      third.conversationId = convAC;
    } else {
      third = await h.freshDirectConversation(A, "+12025550107", "Regression DIR1 Third");
      convAC = third?.conversationId || null;
    }
    assert.check("fresh third person", !!third?.conversationId, "setup needs synthetic provisioning for the third person");

    const direct = await h.ensureDirect(A, bId);
    let convAB = null;
    if (silentAB?.session?.userId) {
      const gAB = await h.createGroup(
        A,
        [bId, silentAB.session.userId],
        ctx.marker("dir1 scope a-b"),
      );
      convAB = gAB.conversationId || null;
      if (convAB) {
        assert.note(`own trio: isolated group threads A-C ${convAC} / A-B ${convAB} (silent thirds)`);
      }
    }
    if (!convAB) convAB = direct.conversationId;
    assert.check("direct A-B", !!convAB, "setup needs the A-B conversation");

    const rowOf = async (client, id) => {
      const convs = await h.listConversations(client);
      return convs.conversations.find((c) => c.id === id) || null;
    };
    const callRowOf = async (client, peerId) => {
      const r = await client.get("/calls");
      return (r.json.calls || []).find((c) => c.peer_user_id === peerId) || null;
    };

    // A call A -> B so both call logs have the peer row. Calls are
    // direct-only, so the call is placed on the pair's direct thread;
    // the call row's next_plan fact is per-peer, independent of
    // which thread placed the call.
    const call = await A.post("/calls", { conversation_id: direct.conversationId });
    assert.check("POST /calls", call.status === 201, `call create must succeed (got ${call.status})`);

    // The A-C plan: surfaces in the A-C row only. Bound by id-set
    // difference (snapshot before, the new id after), never by
    // first-match against earlier state on a reused account.
    const priorACPlanIds = new Set((await h.listPlans(A)).plans.map((p) => p.id));
    let createdAC = await h.createConversationPlan(A, convAC, {
      title: `DIR1 coffee ${ctx.tag}`,
      place: "Bird Rock Coffee",
      location: "Bird Rock Coffee",
      time_label: "Friday 8:00 AM",
    });
    assert.eq("create A-C plan", createdAC.status, 201, "A-C plan create must succeed");
    const acPlansAfter = await h.listPlans(A);
    const boundAC =
      acPlansAfter.plans.find((p) => p.conversation_id === convAC && !priorACPlanIds.has(p.id)) ||
      acPlansAfter.plans.find((p) => !priorACPlanIds.has(p.id));
    if (boundAC) createdAC = { ...createdAC, plan: boundAC };
    assert.eq("A-C row carries it", (await rowOf(A, convAC))?.next_plan?.plan_id, createdAC.plan?.id, "the plan surfaces in its own row");
    assert.eq("A-B row stays empty", (await rowOf(A, convAB))?.next_plan ?? null, null, "a plan with C must not surface in B's row");
    const msgsAB = await h.getHumanMessages(A, convAB);
    assert.eq("A-B thread stays empty", msgsAB.json.next_plan ?? null, null, "a plan with C must not surface in the A-B thread");
    assert.eq("A-B call row stays empty", (await callRowOf(A, bId))?.next_plan ?? null, null, "a plan with C must not surface in the A-B call log");

    // Cancellation exits the fact everywhere. Bound by id-set
    // difference against the snapshot taken before its creation
    // (which already contains the A-C plan), as for the A-C plan.
    const priorABPlanIds = new Set((await h.listPlans(A)).plans.map((p) => p.id));
    let createdAB = await h.createConversationPlan(A, convAB, {
      title: `DIR1 cancelled ${ctx.tag}`,
      place: "Fort Oak",
      location: "Fort Oak",
      time_label: "Thursday 6:00 PM",
    });
    assert.eq("create A-B plan", createdAB.status, 201, "A-B plan create must succeed");
    const abPlansAfter = await h.listPlans(A);
    const boundAB =
      abPlansAfter.plans.find((p) => p.conversation_id === convAB && !priorABPlanIds.has(p.id)) ||
      abPlansAfter.plans.find((p) => !priorABPlanIds.has(p.id));
    if (boundAB) createdAB = { ...createdAB, plan: boundAB };
    assert.eq("A-B row carries it", (await rowOf(A, convAB))?.next_plan?.plan_id, createdAB.plan?.id, "pre-cancel: the row carries the plan");

    const cancel = await A.post(`/opal/plans/${encodeURIComponent(createdAB.plan.id)}/cancel`, {});
    assert.check("POST /opal/plans/:id/cancel", cancel.status === 200, `cancel must succeed (got ${cancel.status})`);

    assert.eq("chats row after cancel", (await rowOf(A, convAB))?.next_plan ?? null, null, "cancelled plan exits the chats row");
    const msgsAfter = await h.getHumanMessages(A, convAB);
    assert.eq("thread after cancel", msgsAfter.json.next_plan ?? null, null, "cancelled plan exits the thread");
    assert.eq("call log after cancel", (await callRowOf(A, bId))?.next_plan ?? null, null, "cancelled plan exits the call log");

    // Cleanup (isolation, not an assertion): cancel this run's own
    // A-C plan (the A-B plan is already cancelled above) so no
    // active plan on this case's private trio/threads can bind to a
    // later run's legs on the same stack.
    if (createdAC.plan?.id) {
      const cleanup = await A.post(`/opal/plans/${encodeURIComponent(createdAC.plan.id)}/cancel`, {});
      assert.note(`cleanup: own A-C plan ${createdAC.plan.id} cancel status=${cleanup.status} (re-run starts clean)`);
    }
  },
};
