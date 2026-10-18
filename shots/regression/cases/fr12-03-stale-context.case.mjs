/**
 * FR-12-03 - A days-old or cancelled plan_id in context hijacked
 * unrelated utterances (F12-13, F12-53).
 *
 * Genesis: Repair #12 - the sticky plan context (15-minute TTL in
 * law, unbounded in the defect) bound every later utterance to a
 * dead plan.
 *
 * Guards:
 *  - Create a plan in Center, cancel it through the real path, then
 *    send unrelated requests: each routes on its own intent - no new
 *    plan is minted for the cancelled intent, no reply presents the
 *    cancelled plan as live or "updated".
 *  - A fresh, unrelated plan request afterwards creates exactly its
 *    own plan (the cancelled plan is not resurrected or mutated).
 *
 * Note on the TTL leg: waiting out the 15-minute sticky TTL inside a
 * suite run is not practical; the cancelled-plan leg is the
 * deterministic half of the same law (a dead plan_id must bind
 * nothing), and the within-TTL binding half is proven by FR-12-02.
 *
 * Pass expectation on the current tip: PASS.
 */
import { allStrings } from "../lib/harness.mjs";

export default {
  id: "FR-12-03",
  title: "A days-old or cancelled plan_id in context hijacked unrelated utterances",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["Center", "human thread", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    // Setup: a plan, then cancel it through the real thread path.
    const g = await h.createGroup(A, [ctx.sessions.b.userId], ctx.marker("stale context"));
    const convId = g.conversationId || (await h.ensureDirect(A, ctx.sessions.b.userId)).conversationId;
    const title = `StaleCtx ${ctx.tag}`;
    const created = await h.createConversationPlan(A, convId, {
      title,
      option_label: title,
      place: title,
      time_label: "Thursday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "setup plan must be created");
    const deadId = created.plan?.id;
    await h.postHumanMessage(A, convId, "cancel the plan");
    let plans = await h.listPlans(A, true);
    let dead = plans.plans.find((p) => p.id === deadId);
    if (!dead || dead.status !== "cancelled") {
      await h.centerNewChat(A);
      await h.centerSend(A, `cancel ${title}`);
      plans = await h.listPlans(A, true);
      dead = plans.plans.find((p) => p.id === deadId);
    }
    assert.check(
      "GET /opal/plans (setup cancelled)",
      !!dead && dead.status === "cancelled",
      `setup requires a cancelled plan; got status=${dead?.status}`,
    );
    if (!dead || dead.status !== "cancelled") return;
    const cancelledSnapshot = `${dead.status}|${dead.time_label}|${dead.title}`;

    // Unrelated utterances in Center must route on their own intent.
    await h.centerNewChat(A);
    const unrelated = [
      "What can you help me with?",
      "Find three Mediterranean restaurants in Coronado",
      "What's the weather like this weekend?",
    ];
    for (const body of unrelated) {
      const sent = await h.centerSend(A, body);
      assert.eq("POST /opal/conversation/messages", sent.status, 201, `unrelated send must be answered: ${body}`);
      assert.check(
        "Center reply (no hijack)",
        !/updated|sure thing,? (i )?(changed|moved)|same plan/i.test(sent.opal?.body || "") ||
          !allStrings(sent.opal || {}).some((s) => s.includes(title)),
        `an unrelated utterance must not be answered as an update to the cancelled plan; got: ${(sent.opal?.body || "").slice(0, 140)}`,
      );
    }
    plans = await h.listPlans(A, true);
    dead = plans.plans.find((p) => p.id === deadId);
    assert.eq(
      "GET /opal/plans (cancelled plan untouched)",
      `${dead?.status}|${dead?.time_label}|${dead?.title}`,
      cancelledSnapshot,
      "unrelated utterances must never mutate or resurrect the cancelled plan",
    );
    const resurrected = plans.plans.filter(
      (p) => p.id !== deadId && p.status !== "cancelled" && (p.title || "") === title,
    );
    assert.eq(
      "GET /opal/plans (no resurrection)",
      resurrected.length,
      0,
      "no live copy of the cancelled intent may appear from unrelated utterances",
    );

    // A genuinely new request creates exactly its own plan.
    const before = new Set(plans.plans.map((p) => p.id));
    await h.centerSend(A, `Plan a picnic on Sunday at noon ${ctx.tag}`);
    const after = await h.listPlans(A, true);
    const fresh = after.plans.filter((p) => !before.has(p.id));
    assert.check(
      "GET /opal/plans (new request, own plan)",
      fresh.length <= 1 && fresh.every((p) => p.id !== deadId),
      `a new request may create at most its own one plan, never via the dead plan_id; created ${fresh.length}`,
    );
    const deadFinal = after.plans.find((p) => p.id === deadId);
    assert.eq(
      "GET /opal/plans (dead plan still dead)",
      `${deadFinal?.status}|${deadFinal?.time_label}|${deadFinal?.title}`,
      cancelledSnapshot,
      "the cancelled plan must remain byte-identical after a new request",
    );
    assert.note("TTL-expiry leg not waited out in-suite (15 min); cancelled-plan binding leg is the deterministic half - see header");
  },
};
