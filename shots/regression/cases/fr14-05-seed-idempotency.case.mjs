/**
 * FR-14-05 - The founder seed itself was corrupt (F14-05): transposed
 * stable ids renamed Alex to "Nina"; seed re-runs re-fired repeatedly
 * (F18 Mac evidence: 5 seed POSTs in one walk). Contract: re-running
 * provisioning in seed mode changes nothing the second time - same
 * conversations, same plans, no renames, no duplicates.
 */
export default {
  id: "FR-14-05",
  title: "The founder seed itself was corrupt: transposed ids renamed Alex to \"Nina\"; re-runs re-fired",
  theme: "Person-agnostic behavior, hardcodes, gyroscope",
  class: "A",
  surfaces: ["POST /dev/founder-communication-seed", "POST /dev/founder-graph-commitment-seed", "GET /conversations", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    if (!ctx.seed) { assert.note("seed mode off (OPAL_SEED_MODE != 1): seed idempotency legs require seed mode; skipping with name, not silently"); return; }
    const convs1 = await h.listConversations(A);
    const plans1 = await h.listPlans(A, true);
    const { runFounderSeed } = await import("../lib/harness.mjs");
    const again = await runFounderSeed(A);
    assert.check("seed re-run", again.comm.status < 400 && again.graph.status < 400,
      `a seed re-run must answer cleanly; got comm=${again.comm.status} graph=${again.graph.status}`);
    const convs2 = await h.listConversations(A);
    const plans2 = await h.listPlans(A, true);
    assert.eq("GET /conversations (seed re-run)", convs2.conversations.length, convs1.conversations.length,
      "re-running the seed must create zero new conversations - one effective provisioning per session");
    assert.eq("GET /opal/plans (seed re-run)", plans2.plans.length, plans1.plans.length,
      "re-running the seed must create zero new plans");
    const blob = JSON.stringify(convs2.conversations);
    assert.check("seed identities", !/"Nina"/.test(blob) || /"Alex"/.test(blob),
      "seed identities must be stable - no transposed rename (Alex -> Nina) may appear");
  },
};
