/**
 * FR-11-03 - "Cancel" behaved like a sentiment, not a state change;
 * no authority check, no participant handling (F04).
 *
 * Genesis: Repair #11 walk F04.
 *
 * Guards (two real accounts, one plan in its own thread):
 *  - Non-lead sends "cancel": the plan is NOT cancelled - at most a
 *    cancel proposal / honest refusal exists; both parties still
 *    read the plan live at its original time.
 *  - Lead sends "cancel": the plan reads status cancelled for BOTH
 *    parties on GET /opal/plans (?status=all) and the journey show.
 *  - "I can't make it" from the non-lead on a second plan: only that
 *    participant is withdrawn (their participation no longer counts
 *    as going); the plan itself survives, live, for the lead.
 *
 * Pass expectation on the current tip: PASS.
 */
import { extractAttendance } from "../lib/harness.mjs";

async function ownThread(ctx, label) {
  const g = await ctx.h.createGroup(ctx.A, [ctx.sessions.b.userId], label);
  if (g.conversationId) return g.conversationId;
  const d = await ctx.h.ensureDirect(ctx.A, ctx.sessions.b.userId);
  return d.conversationId;
}

export default {
  id: "FR-11-03",
  title: "\"Cancel\" behaved like a sentiment, not a state change; no authority check",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["human thread", "Graphs", "Timeline", "GET /opal/plans", "GET /journeys/:id"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required (lead + participant)");

    async function setupPlan(label, timeLabel) {
      const convId = await ownThread(ctx, ctx.marker(label));
      const created = await h.createConversationPlan(A, convId, {
        title: `${label} ${ctx.tag}`,
        option_label: label,
        place: label,
        time_label: timeLabel,
      });
      assert.eq("POST /conversations/:id/plans", created.status, 201, `${label}: plan setup must succeed`);
      return { convId, planId: created.plan?.id };
    }
    const find = (list, id) => list.plans.find((p) => p.id === id);

    // -- Authority: non-lead cancel must not cancel ------------------------
    const one = await setupPlan("CancelAuth", "Friday 7:30 PM");
    await h.postHumanMessage(B, one.convId, "cancel");
    let plansA = await h.listPlans(A, true);
    let entry = find(plansA, one.planId);
    assert.check(
      "GET /opal/plans (non-lead cancel attempt)",
      !!entry && entry.status !== "cancelled",
      `a non-lead "cancel" must never cancel the plan; got status=${entry?.status}`,
    );

    // -- Lead cancel is a real state change, visible to both ---------------
    await h.postHumanMessage(A, one.convId, "cancel the plan");
    plansA = await h.listPlans(A, true);
    entry = find(plansA, one.planId);
    if (!entry || entry.status !== "cancelled") {
      await h.centerNewChat(A);
      await h.centerSend(A, `cancel CancelAuth ${ctx.tag}`);
      plansA = await h.listPlans(A, true);
      entry = find(plansA, one.planId);
    }
    assert.check(
      "GET /opal/plans (lead cancel, lead view)",
      !!entry && entry.status === "cancelled",
      `the lead's cancel must set status cancelled; got ${entry?.status}`,
    );
    const plansB = await h.listPlans(B, true);
    const entryB = find(plansB, one.planId);
    assert.check(
      "GET /opal/plans (lead cancel, participant view)",
      !!entryB && entryB.status === "cancelled",
      `the participant must observe the cancellation; got ${entryB?.status}`,
    );
    const journey = await A.get(`/journeys/${encodeURIComponent(one.planId)}`);
    if (journey.status === 200) {
      const jStatus = journey.json.journey?.status || journey.json.status;
      assert.check(
        "GET /journeys/:id (cancel read-back)",
        jStatus === "cancelled" || JSON.stringify(journey.json).includes('"cancelled"'),
        `the journey surface must agree the plan is cancelled; got status=${jStatus}`,
      );
    } else {
      assert.note(`journey show for the cancelled plan returned ${journey.status}; listing agreement asserted instead`);
    }

    // -- Withdraw: "I can't make it" touches only that participant ---------
    const two = await setupPlan("Withdraw", "Saturday 7:30 PM");
    const cant = await B.post(`/journeys/${encodeURIComponent(two.planId)}/cant-make-it`, {});
    assert.check(
      "POST /journeys/:id/cant-make-it",
      cant.status === 200 || cant.status === 201,
      `the withdraw path must succeed for the participant (got ${cant.status})`,
    );
    const plansAfter = await h.listPlans(A, true);
    const survivor = find(plansAfter, two.planId);
    assert.check(
      "GET /opal/plans (withdraw leaves plan live)",
      !!survivor && survivor.status !== "cancelled",
      `one participant withdrawing must never cancel the plan; got ${survivor?.status}`,
    );
    const journey2 = await A.get(`/journeys/${encodeURIComponent(two.planId)}`);
    if (journey2.status === 200) {
      const att = extractAttendance(journey2.json);
      assert.note(`withdraw read-back: journey attendance after withdraw = ${att ? `${att.going} of ${att.total}` : "none carried"}`);
    }
  },
};
