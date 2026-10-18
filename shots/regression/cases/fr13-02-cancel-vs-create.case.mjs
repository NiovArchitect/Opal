/**
 * FR-13-02 - "Cancel the dinner plan" and "cancel all plans" started
 * a creation flow; "move dinner to Saturday" dead-ended
 * (F13-05, F13-08).
 *
 * Genesis: Repair #13 W4 chat suite - modify utterances were
 * classified as creates, minting new plans instead of acting on the
 * existing one.
 *
 * Guards:
 *  - In Center, with one real dinner plan live: "Cancel the dinner
 *    plan" creates ZERO new plans and the existing plan ends
 *    cancelled (or a cancel proposal exists) - never a creation flow.
 *  - "cancel all plans" likewise creates zero plans.
 *  - In the plan's thread, "move dinner to Saturday" never dead-ends:
 *    it produces a pending change / applied day change naming
 *    Saturday, or one disambiguating/honest question - and creates
 *    no duplicate plan.
 *
 * Pass expectation on the current tip: PASS.
 */
import { allStrings } from "../lib/harness.mjs";

async function ownThread(ctx, label) {
  const g = await ctx.h.createGroup(ctx.A, [ctx.sessions.b.userId], label);
  if (g.conversationId) return g.conversationId;
  const d = await ctx.h.ensureDirect(ctx.A, ctx.sessions.b.userId);
  return d.conversationId;
}

export default {
  id: "FR-13-02",
  title: "\"Cancel the dinner plan\" and \"cancel all plans\" started a creation flow; \"move dinner to Saturday\" dead-ended",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["Center", "human thread", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    const convId = await ownThread(ctx, ctx.marker("cancel vs create"));
    const created = await h.createConversationPlan(A, convId, {
      title: `Dinner ${ctx.tag}`,
      option_label: "Dinner",
      place: "Dinner",
      time_label: "Thursday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "setup plan must be created");
    const planId = created.plan?.id;

    const countBefore = (await h.listPlans(A, true)).plans.length;

    // -- Move first (needs a live plan): never a dead end, never a dupe ----
    const move = await h.postHumanMessage(B, convId, "move dinner to Saturday");
    assert.check(
      "POST /conversations/:id/messages (move)",
      move.status === 201 || move.status === 200 || move.status === 429,
      `the move send must be answered (got ${move.status})`,
    );
    if (move.status !== 429) {
      const al = await h.getAlignment(A, convId);
      const plansMid = await h.listPlans(A, true);
      const entry = plansMid.plans.find((p) => p.id === planId);
      const pending = ["change_proposal", "pending_revision", "pending_change"].filter(
        (k) => al.alignment?.[k] && Object.keys(al.alignment[k]).length > 0,
      );
      const movedOrProposed =
        (entry && /saturday/i.test(entry.time_label || "")) ||
        (pending.length >= 1 && allStrings(al.alignment[pending[0]]).some((s) => /saturday/i.test(s)));
      const msgs = await h.getHumanMessages(A, convId);
      const asked = allStrings({ signals: msgs.json.signals || [], chronology: msgs.json.chronology || [] }).some(
        (s) => /\?/.test(s) || /which|what time|confirm/i.test(s),
      );
      assert.check(
        "GET /conversations/:id/alignment (move outcome)",
        movedOrProposed || asked,
        "\"move dinner to Saturday\" must resolve the plan (proposal/applied/clarifying question) - a dead end is the defect",
      );
      assert.eq(
        "GET /opal/plans (move creates no duplicate)",
        plansMid.plans.filter((p) => p.id !== planId && (p.title || "").includes(ctx.tag)).length,
        0,
        "a move utterance must never mint a second plan",
      );
      // Settle any pending move so the cancel legs see a clean plan.
      if (pending.length >= 1) await h.postHumanMessage(A, convId, "confirm");
    }

    // -- Cancel utterances in Center: modify, never create ------------------
    await h.centerNewChat(A);
    const c1 = await h.centerSend(A, "Cancel the dinner plan");
    assert.eq("POST /opal/conversation/messages", c1.status, 201, "Center cancel must be answered");
    let plans = await h.listPlans(A, true);
    assert.check(
      "GET /opal/plans (cancel creates nothing)",
      plans.plans.length <= countBefore,
      `"Cancel the dinner plan" must never start a creation flow (plans ${countBefore} -> ${plans.plans.length})`,
    );
    let entry = plans.plans.find((p) => p.id === planId);
    const cancelledOrProposed =
      (entry && entry.status === "cancelled") ||
      allStrings(c1.json || {}).some((s) => /cancel/i.test(s));
    assert.check(
      "Center reply (cancel classification)",
      cancelledOrProposed,
      "the cancel utterance must be handled as a modify/cancel, with the outcome readable",
    );

    const c2 = await h.centerSend(A, "cancel all plans");
    assert.eq("POST /opal/conversation/messages", c2.status, 201, "cancel-all must be answered");
    plans = await h.listPlans(A, true);
    assert.check(
      "GET /opal/plans (cancel-all creates nothing)",
      plans.plans.length <= countBefore,
      `"cancel all plans" must never create plans (plans now ${plans.plans.length})`,
    );
    entry = plans.plans.find((p) => p.id === planId);
    assert.note(`after Center cancels: target plan status=${entry?.status} time=${entry?.time_label}`);
  },
};
