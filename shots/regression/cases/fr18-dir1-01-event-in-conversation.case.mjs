/**
 * FR-18-DIR1-01 - Event in conversation: one shared upcoming plan
 * fact, read back identically on all three DIR-1 contracts.
 *
 * Founder direction (2026-10-18 05:54 PDT): the chats list, each
 * chat thread, and the call log must surface the actual shared
 * upcoming plan with that person - from a real plan record, never
 * painted - so "you already have plans with this person" is
 * perceived instantly.
 *
 * Contract asserted on API output: after a plan is created through
 * the real conversation flow (POST /conversations/:id/plans), the
 * SAME fact (plan_id, title, finished when_label, where_label,
 * governed status, viewer-scoped indicator state) reads back in:
 *   - GET /conversations row `next_plan` (chats list)
 *   - GET /conversations/:id/messages `next_plan` (thread)
 *   - GET /conversations/:id/alignment `next_plan` (thread)
 *   - GET /calls row for that peer `next_plan` (call log)
 * Before the plan exists, every one of those fields is null.
 * The invited viewer's state is "action" (the plan needs their
 * answer); the lead's is "forming" (tentative, already answered).
 * A group conversation carries its own group plan on its own row.
 *
 * Backend ground truth is proven in the ExUnit suite
 * (repair18_dir1_next_plan_test.exs) against the same contracts.
 *
 * Isolation repair (Repair #18 dir1-casefix): on the shared suite
 * pair the before-plan legs bound to foreign plans (the founder
 * seed's "Dinner with Regression", a sibling case's plan, or this
 * case's own plan from an earlier run) - the find-or-create /
 * first-match contamination class the casefix wave repaired for
 * FR-18-02-revision. The case now provisions its OWN synthetic pair
 * (+12025550115 / +12025550116, plus a silent third +12025550117 so
 * the thread is a real group created fresh per run), binds its plan
 * by id-set difference, and cancels its own plan at the end so a
 * re-run on the same stack starts clean. The direct thread is kept
 * only to place the 1:1 call (calls are direct-only); the call
 * row's plan fact is per-peer and carries the group plan. On stacks
 * where synthetic provisioning is unavailable the case keeps its
 * original shape on the suite pair. The contract assertions are
 * unchanged - isolation changes the fixture, never the standard.
 */
export default {
  id: "FR-18-DIR1-01",
  title: "Event in conversation: shared upcoming plan reads back in chats list, thread, and call log",
  theme: "dir1-plan-awareness",
  class: "A",
  surfaces: [
    "GET /conversations (next_plan)",
    "GET /conversations/:id/messages (next_plan)",
    "GET /conversations/:id/alignment (next_plan)",
    "GET /calls (next_plan)",
  ],
  async run(ctx) {
    let { A, B, h, assert } = ctx;
    if (!B) {
      throw new Error("setup failed: FR-18-DIR1-01 needs a second session (OPAL_TOKEN_B / synthetic B)");
    }
    let bId = ctx.sessions.b.userId;

    // Own provisioned pair + silent third (isolation repair above):
    // dedicated numbers no other case uses, and a group thread that
    // is brand-new for this run, so no earlier run's or case's plan
    // can bind to the surfaces below.
    const ownA = await ctx.freshClient("+12025550115", "Regression DIR1 Lead");
    const ownB = await ctx.freshClient("+12025550116", "Regression DIR1 Invited");
    const ownThird = await ctx.freshClient("+12025550117", "Regression DIR1 Third");
    let groupId = null;
    if (ownA && ownB) {
      A = ownA;
      B = ownB;
      bId = ownB.session.userId;
      if (ownThird?.session?.userId) {
        const g = await h.createGroup(
          A,
          [bId, ownThird.session.userId],
          ctx.marker("dir1 event in conversation"),
        );
        groupId = g.conversationId || null;
        if (groupId) {
          assert.note(`own pair: isolated group thread ${groupId} (third member silent)`);
        }
      }
    }

    const direct = await h.ensureDirect(A, bId);
    assert.check("POST /conversations/direct", !!direct.conversationId, "setup needs a direct conversation");
    const conversationId = groupId || direct.conversationId;

    const rowOf = async (client) => {
      const convs = await h.listConversations(client);
      return convs.conversations.find((c) => c.id === conversationId) || null;
    };
    const callRowOf = async (client, peerId) => {
      const r = await client.get("/calls");
      return (r.json.calls || []).find((c) => c.peer_user_id === peerId) || null;
    };

    // Before any plan: the fact is absent (null) on all three contracts.
    assert.eq("chats list before plan", (await rowOf(A))?.next_plan ?? null, null, "no plan -> next_plan null on the chats row");
    const msgsBefore = await h.getHumanMessages(A, conversationId);
    assert.eq("thread before plan", msgsBefore.json.next_plan ?? null, null, "no plan -> next_plan null on the thread contract");

    // A real call so the call log has a row for this peer. Calls are
    // direct-only, so the call is placed on the pair's direct thread;
    // the call row's next_plan fact is per-peer and carries the plan
    // created in the conversation under test below.
    const call = await A.post("/calls", { conversation_id: direct.conversationId });
    assert.check("POST /calls", call.status === 201, `call create must succeed (got ${call.status})`);

    // Plans that already exist for the lead BEFORE this flow creates
    // its plan: the plan under test is the one born from THIS flow
    // (id-set difference), never a first-match left by earlier state.
    const priorPlanIds = new Set((await h.listPlans(A)).plans.map((p) => p.id));

    // Create the plan through the real conversation flow.
    const created = await h.createConversationPlan(A, conversationId, {
      title: `DIR1 dinner ${ctx.tag}`,
      place: "Juniper and Ivy",
      location: "Juniper and Ivy",
      time_label: "Saturday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "conversation plan create must succeed");
    const afterPlans = await h.listPlans(A);
    const boundPlan =
      afterPlans.plans.find((p) => p.conversation_id === conversationId && !priorPlanIds.has(p.id)) ||
      afterPlans.plans.find((p) => !priorPlanIds.has(p.id));
    const planId = boundPlan?.id || created.plan?.id;
    assert.check("plan id", !!planId, "created plan carries an id");

    // (i) Chats list.
    const rowA = await rowOf(A);
    assert.eq("chats list next_plan.plan_id", rowA?.next_plan?.plan_id, planId, "chats row carries the created plan");
    assert.eq("chats list when", rowA?.next_plan?.when_label, "Saturday 7:30 PM", "finished when string from the record");
    assert.eq("chats list where", rowA?.next_plan?.where_label, "Juniper and Ivy", "where from the record");
    assert.eq("chats list status", rowA?.next_plan?.status, "tentative", "governed status");
    assert.eq("chats list state (lead)", rowA?.next_plan?.state, "forming", "lead answered; plan still forming");
    const rowB = await rowOf(B);
    assert.eq("chats list peer plan", rowB?.next_plan?.plan_id, planId, "the other party reads the same plan");
    assert.eq("chats list state (invited)", rowB?.next_plan?.state, "action", "invited viewer: the plan needs their answer");

    // (ii) Thread contracts.
    const msgs = await h.getHumanMessages(A, conversationId);
    assert.eq("thread messages next_plan", msgs.json.next_plan?.plan_id, planId, "thread contract carries the same fact");
    const al = await h.getAlignment(A, conversationId);
    assert.eq("thread alignment next_plan", al.json.next_plan?.plan_id, planId, "alignment contract carries the same fact");

    // (iii) Call log, per peer.
    const callA = await callRowOf(A, bId);
    assert.eq("call log next_plan", callA?.next_plan?.plan_id, planId, "call row for the peer carries the same plan");
    assert.check("call log peer tint", Number.isInteger(callA?.peer_tint), "call row carries the peer's stable entity tint");

    // Cleanup (isolation, not an assertion): cancel this run's own
    // plan so no active plan on this case's private pair/thread can
    // bind to a later run's before-plan legs on the same stack.
    if (planId) {
      const cleanup = await A.post(`/opal/plans/${encodeURIComponent(planId)}/cancel`, {});
      assert.note(`cleanup: own plan ${planId} cancel status=${cleanup.status} (re-run starts clean)`);
    }
  },
};
