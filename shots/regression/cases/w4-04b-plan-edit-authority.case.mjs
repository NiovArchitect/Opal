/**
 * W4-04b - PLAN EDIT AUTHORITY (Walk #4, W4-04).
 *
 * The authority model for direct plan edits is the codebase's existing
 * direct-edit model (cancel_plan / change_plan_schedule): the plan LEAD
 * (PlanParticipant role lead/co_lead, falling back to created_by_user_id)
 * edits directly; everyone else is refused. That model was ambiguous
 * for non-schedule label edits - W4-04 tightens it and this case pins
 * the tightened behavior:
 *
 *  - A non-participant (no access to the plan at all) editing attempt is
 *    rejected (404 - the plan is not visible to them, mirroring the
 *    conversation-rename precedent for foreign ids) and the title is
 *    unchanged on every read-back.
 *  - A participant WITHOUT lead rights is rejected with 403
 *    not_authorized: a title is the lead's label for the plan (like a
 *    schedule, which non-leads may only PROPOSE through revisions); the
 *    revision machinery carries schedule fields only, so there is no
 *    silent participant edit path for labels. The title is unchanged.
 *  - A co_lead (lead role) CAN edit - asserted when a co_lead exists;
 *    the conversation-plan shape here has exactly one lead, so this leg
 *    is covered by backend tests and noted, not faked, here.
 *  - Cross-account probe: session B's token with session A's plan id
 *    where B is not a participant is the non-participant leg above;
 *    additionally a fabricated plan id returns 404, never a mutation.
 */
export default {
  id: "W4-04b",
  title: "Plan edit authority: non-participant and non-lead participant edits rejected, title unchanged",
  theme: "plan-editing",
  class: "A",
  surfaces: ["PATCH /opal/plans/:id", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("harness: W4-04b requires two distinct sessions (A and B)");

    const title = `Authority dinner ${ctx.tag}`;
    const attackTitle = `Hijacked title ${ctx.tag}`;

    // A's SOLO Center plan: B is not a participant in any way.
    const solo = await h.createCenterPlan(A, {
      title,
      location: "Juniper & Ivy",
      time_label: "Friday 7:30 PM",
    });
    assert.eq("POST /opal/plans (solo)", solo.status, 201, "A's solo plan must be created");
    if (!solo.plan) return;
    const soloId = solo.plan.id;

    // -- Non-participant edit attempt (B on A's solo plan) ---------------
    const outsider = await B.patch(`/opal/plans/${soloId}`, { title: attackTitle });
    assert.check(
      "PATCH /opal/plans/:id (non-participant)",
      outsider.status === 403 || outsider.status === 404,
      `a non-participant edit must be rejected with 403/404 (got ${outsider.status})`,
    );
    const soloAfter = await h.listPlans(A);
    const soloEntry = soloAfter.plans.find((p) => p.id === soloId);
    assert.eq(
      "GET /opal/plans after non-participant attempt",
      soloEntry?.title,
      title,
      "title must be unchanged after a non-participant edit attempt",
    );
    const bList = await h.listPlans(B);
    assert.check(
      "GET /opal/plans (B's listing)",
      !bList.plans.some((p) => p.id === soloId),
      "A's solo plan must never appear in the non-participant's listing",
    );

    // -- Participant without lead rights ----------------------------------
    const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
    const conversationId = direct.conversationId;
    assert.check(
      "POST /conversations/direct",
      !!conversationId,
      "direct conversation must open",
    );
    if (!conversationId) return;

    const sharedTitle = `Shared dinner ${ctx.tag}`;
    const shared = await h.createConversationPlan(A, conversationId, {
      title: sharedTitle,
      location: "The Henry, Coronado",
      time_label: "Saturday 6:00 PM",
    });
    assert.eq(
      "POST /conversations/:id/plans (shared)",
      shared.status,
      201,
      "shared plan must be created (A lead, B participant)",
    );
    if (!shared.plan) return;
    const sharedId = shared.plan.id;

    const participantAttempt = await B.patch(`/opal/plans/${sharedId}`, {
      title: attackTitle,
    });
    assert.eq(
      "PATCH /opal/plans/:id (participant, not lead)",
      participantAttempt.status,
      403,
      "a participant without lead rights must be refused (lead-only direct edit)",
    );
    assert.eq(
      "PATCH /opal/plans/:id (participant, not lead) error_code",
      participantAttempt.json.error_code,
      "not_authorized",
      "the refusal must name the authority failure honestly",
    );

    // Title unchanged in BOTH parties' listings after the refusal.
    for (const [who, client] of [["A", A], ["B", B]]) {
      const list = await h.listPlans(client);
      const entry = list.plans.find((p) => p.id === sharedId);
      assert.eq(
        `${who} GET /opal/plans after participant attempt`,
        entry?.title,
        sharedTitle,
        "title must be unchanged after a refused participant edit",
      );
    }

    // -- Fabricated plan id -------------------------------------------------
    const ghost = await A.patch(`/opal/plans/00000000-0000-4000-8000-000000000000`, {
      title: attackTitle,
    });
    assert.eq(
      "PATCH /opal/plans/:id (fabricated id)",
      ghost.status,
      404,
      "editing a plan that does not exist must be a 404, never a mutation",
    );

    assert.note(
      "co_lead edit leg: the conversation-plan shape mints exactly one lead; " +
        "co_lead authority (role in lead/co_lead) is asserted in backend tests for edit_plan_details",
    );
  },
};
