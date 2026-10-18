/**
 * FR-14-01 - "Any upcoming plans?" created a plan instead of
 * answering (F14-02; noted unfixed in R13).
 *
 * Genesis: Repair #14 - status questions were classified as creates.
 *
 * Guards: five status-question shapes in Center must each be
 * answered FROM the real plan rows: zero plans created, zero
 * proposals created (the plan set is byte-identical before/after),
 * and every reply is a non-empty answer (not a creation prompt).
 *
 * Pass expectation on the current tip: PASS.
 */
export default {
  id: "FR-14-01",
  title: "\"Any upcoming plans?\" created a plan instead of answering",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);

    const before = await h.listPlans(A, true);
    const snapshot = before.plans.map((p) => `${p.id}|${p.status}|${p.time_label}`).sort().join(";");

    const questions = [
      "Any upcoming plans?",
      "What plans do I have coming up?",
      "Do I have anything scheduled this week?",
      "What's on my calendar?",
      "Show me my upcoming plans",
    ];
    for (const q of questions) {
      const sent = await h.centerSend(A, q);
      assert.eq("POST /opal/conversation/messages", sent.status, 201, `status question must be answered: ${q}`);
      assert.check(
        "Center reply (status answer)",
        !!sent.opal && (sent.opal.body || "").trim().length > 0,
        `"${q}" must receive an answer, not silence or a creation prompt`,
      );
      assert.check(
        "Center reply (status answer)",
        !/what (day|time|place|restaurant).*(plan|dinner|book)|tell me (the|a) (day|time|place) (and|to) (plan|book|create)/i.test(sent.opal?.body || ""),
        `"${q}" must be answered from real rows, not turned into a creation interview; got: ${(sent.opal?.body || "").slice(0, 140)}`,
      );
    }

    const after = await h.listPlans(A, true);
    const afterSnap = after.plans.map((p) => `${p.id}|${p.status}|${p.time_label}`).sort().join(";");
    assert.eq(
      "GET /opal/plans (status questions mutate nothing)",
      afterSnap,
      snapshot,
      "status questions must create zero plans and zero proposals - the plan set must be identical",
    );
  },
};
