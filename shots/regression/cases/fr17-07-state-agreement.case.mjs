/**
 * FR-17-07 (automatable part) - "All the colors are the same"; the
 * chat-log color did not change when status changed (F17-05, F18-07).
 * The API half asserted here: ONE state value per plan, identical on
 * every surface's output (plans list, chats projection, thread
 * alignment, journey) - the single derivation the colors render from.
 * The color/visual half stays on the phone checklist by name
 * (catalog class A+P); the canon hex pin is a Division C decision
 * (catalog ambiguous item 5) and is deliberately NOT re-pinned here.
 */
import { allStrings } from "../lib/harness.mjs";
export default {
  id: "FR-17-07",
  title: "\"All the colors are the same\" - state must agree on every surface (automatable part)",
  theme: "Cross-surface consistency and projections",
  class: "A+P",
  surfaces: ["GET /opal/plans", "GET /conversations (plan_projection)", "GET /conversations/:id/alignment", "GET /journeys/:id"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    assert.note("phone/visual leg (canon colors per state) stays on the founder phone checklist; this file proves the automatable state-agreement half");
    let planId = ctx.seed?.graph?.json?.shared_plan_id || null;
    let convId = ctx.seed?.graph?.json?.conversation_id || null;
    if (!planId) {
      const c = await h.createCenterPlan(A, { title: `State agreement ${ctx.tag}`, location: "Oceanside", time_label: "Saturday 6:00 PM" });
      planId = c.plan?.id;
    }
    assert.check("setup", !!planId, "a plan under test is required");
    if (!planId) return;
    const stateOf = (obj) => obj?.surface_state || obj?.state || obj?.status || null;
    const plans = await h.listPlans(A, true);
    const entry = plans.plans.find((p) => p.id === planId);
    const sPlans = stateOf(entry) || stateOf(entry?.plan_projection);
    assert.check("GET /opal/plans", !!sPlans, "the plans entry must carry an explicit state value (no surface may derive state from label text)");
    if (convId) {
      const al = await h.getAlignment(A, convId);
      const sThread = stateOf(al.alignment) || stateOf(al.alignment?.plan_projection) ||
        (allStrings(al.alignment || {}).length ? stateOf(al.json) : null);
      if (sThread && sPlans) assert.eq("GET /conversations/:id/alignment", sThread, sPlans, "thread state must equal the plans-list state for the same plan");
      const convs = await h.listConversations(A);
      const row = convs.conversations.find((c) => c.id === convId);
      const sChats = stateOf(row?.plan_projection) || stateOf(row);
      if (sChats && sPlans) assert.eq("GET /conversations plan_projection", sChats, sPlans, "chats-list state must equal the plans-list state");
    } else {
      assert.note("no seeded conversation for this plan; thread/chats state legs not assertable on this stack");
    }
    const j = await A.get(`/journeys/${encodeURIComponent(planId)}`);
    if (j.status === 200) {
      const sJ = stateOf(j.json) || stateOf(j.json.journey) || stateOf(j.json.plan);
      if (sJ && sPlans) assert.eq("GET /journeys/:id", sJ, sPlans, "journey state must equal the plans-list state");
    }
  },
};
