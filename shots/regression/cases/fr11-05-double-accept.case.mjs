/**
 * FR-11-05 - Double-accept / repeated opportunity taps created two
 * plans or re-formed a pending plan (R11 W3, R6 re-walk).
 *
 * Genesis: Repairs #6/#11 - accept paths were not idempotent.
 *
 * Guards:
 *  - Graph-create replay: the same graph_create_key twice returns
 *    the SAME plan (deduplicated), never a second row.
 *  - RSVP race: both parties fire accept-going concurrently, plus a
 *    repeat - the plan stays one row and the attendance count moves
 *    at most once per person.
 *  - Chat double-confirm: confirming an already-consumed revision
 *    twice more never re-forms a pending plan or a duplicate.
 *
 * Pass expectation on the current tip: PASS.
 */
import { extractAttendance } from "../lib/harness.mjs";

export default {
  id: "FR-11-05",
  title: "Double-accept / repeated opportunity taps created two plans or re-formed a pending plan",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["Center", "human thread", "Graphs", "GET /opal/plans", "POST /opal/plans/graph-create"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    // -- Graph-create idempotency -------------------------------------------
    const key = `r18-reg-${ctx.tag}-double-accept`;
    const attrs = {
      title: `DoubleAccept ${ctx.tag}`,
      location: "Nighthawk, Coronado",
      time_label: "Sunday 7:00 PM",
      idempotency_key: key,
      graph_create_key: key,
    };
    const g1 = await h.createGraphPlan(A, attrs);
    const g2 = await h.createGraphPlan(A, attrs);
    assert.check(
      "POST /opal/plans/graph-create",
      (g1.status === 200 || g1.status === 201) && (g2.status === 200 || g2.status === 201),
      `both graph-create calls must answer (got ${g1.status}/${g2.status})`,
    );
    if (g1.plan && g2.plan) {
      assert.eq(
        "POST /opal/plans/graph-create (replay)",
        g2.plan.id,
        g1.plan.id,
        "replaying the same graph_create_key must return the existing plan, never a second one",
      );
    }
    const plansAfterGc = await h.listPlans(A, true);
    const gcRows = plansAfterGc.plans.filter((p) => (p.title || "") === `DoubleAccept ${ctx.tag}`);
    assert.eq(
      "GET /opal/plans (one row)",
      new Set(gcRows.map((p) => p.id)).size,
      1,
      "exactly one plan row may exist for the replayed graph-create",
    );

    // -- Concurrent + repeated accept-going -----------------------------------
    const g = await h.createGroup(A, [ctx.sessions.b.userId], ctx.marker("double accept"));
    const convId = g.conversationId || (await h.ensureDirect(A, ctx.sessions.b.userId)).conversationId;
    const created = await h.createConversationPlan(A, convId, {
      title: `RaceAccept ${ctx.tag}`,
      option_label: "Dinner",
      place: "Dinner",
      time_label: "Saturday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "race setup plan must be created");
    const planId = created.plan?.id;
    const journeyBefore = await B.get(`/journeys/${encodeURIComponent(planId)}`);
    const attBefore = journeyBefore.status === 200 ? extractAttendance(journeyBefore.json) : null;

    const attempts = await Promise.all([
      B.post(`/journeys/${encodeURIComponent(planId)}/accept-going`, {}),
      B.post(`/journeys/${encodeURIComponent(planId)}/accept-going`, {}),
    ]);
    const repeat = await B.post(`/journeys/${encodeURIComponent(planId)}/accept-going`, {});
    assert.check(
      "POST /journeys/:id/accept-going (race)",
      attempts.every((r) => r.status === 200 || r.status === 201 || r.status === 409 || r.status === 422),
      `concurrent accepts must answer honestly, never 500 (got ${attempts.map((r) => r.status).join("/")})`,
    );
    assert.check(
      "POST /journeys/:id/accept-going (repeat)",
      repeat.status === 200 || repeat.status === 201 || repeat.status === 409 || repeat.status === 422,
      `a repeated accept must short-circuit honestly (got ${repeat.status})`,
    );
    const plans = await h.listPlans(A, true);
    assert.eq(
      "GET /opal/plans (race creates no duplicate)",
      plans.plans.filter((p) => p.id === planId).length,
      1,
      "the raced plan must remain exactly one row",
    );
    const journeyAfter = await B.get(`/journeys/${encodeURIComponent(planId)}`);
    const attAfter = journeyAfter.status === 200 ? extractAttendance(journeyAfter.json) : null;
    if (attBefore && attAfter) {
      assert.check(
        "GET /journeys/:id (attendance moves at most once)",
        attAfter.going - attBefore.going <= 1 && attAfter.total === attBefore.total,
        `one person's repeated accepts may move the going count at most once (${attBefore.going} -> ${attAfter.going} of ${attAfter.total})`,
      );
    } else {
      assert.note("journey attendance not carried on this stack; duplicate-row assertions stand");
    }

    // -- Double-confirm never re-forms ----------------------------------------
    await h.postHumanMessage(B, convId, "let's change dinner to 8 PM");
    await h.postHumanMessage(A, convId, "confirm 8 PM");
    await h.postHumanMessage(A, convId, "confirm 8 PM");
    await h.postHumanMessage(B, convId, "confirm");
    const al = await h.getAlignment(A, convId);
    const pending = ["change_proposal", "pending_revision", "pending_change"].filter(
      (k) => al.alignment?.[k] && Object.keys(al.alignment[k]).length > 0,
    );
    assert.eq(
      "GET /conversations/:id/alignment (no re-formed pending)",
      pending.length,
      0,
      "repeated confirms must never re-form a pending plan",
    );
    const finalPlans = await h.listPlans(A, true);
    assert.eq(
      "GET /opal/plans (still one row)",
      finalPlans.plans.filter((p) => (p.title || "") === `RaceAccept ${ctx.tag}`).length,
      1,
      "repeated confirms must never duplicate the plan",
    );
  },
};
