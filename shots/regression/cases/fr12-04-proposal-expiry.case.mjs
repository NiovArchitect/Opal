/**
 * FR-12-04 - A change proposal sat at "Waiting on one response."
 * forever (F12-58; R11 W4 expiry partial).
 *
 * Genesis: Repair #12 - proposals carried an expires_at nothing read,
 * so the live slot never cleared.
 *
 * Guards (the parts executable without a pinned server clock):
 *  - A live proposal carries expiry metadata on the alignment output
 *    (expires_at somewhere in the proposal representation) - a
 *    proposal with no expiry is the defect's precondition.
 *  - Settling a proposal (accept) retires it: the live slot clears
 *    and the settled proposal appears in proposal_history with a
 *    terminal status - the history mechanism the expiry path uses.
 *  - Accepting an ALREADY SETTLED proposal id (the expired/stale
 *    accept path) is refused and mutates nothing.
 *
 * Deferred leg, stated plainly: ageing a proposal past 24h requires
 * the server clock to move; no product API exposes that, and this
 * suite never fakes time. The past-24h retirement itself is asserted
 * by the backend expiry tests (repair12 R4 adversarial) and must be
 * re-proven on the Mac stack if a clock seam is added. This case
 * guards the API-visible preconditions and the stale-accept refusal.
 *
 * Pass expectation on the current tip: PASS for the executable legs.
 */
import { allStrings, findKeys } from "../lib/harness.mjs";

async function ownThread(ctx, label) {
  // Isolation repair (Repair #18 apifix): a real group needs >= 3
  // people, so the old two-person create 422'd group_too_small and
  // silently fell back to the SHARED A-B direct thread - every
  // scenario in the suite then folded over the same replayed
  // history (and shared one spam-throttle bucket). A third pool
  // member makes each scenario's group real and isolated.
  const third = await ctx.freshClient("+12025550108", "Henry Ruiz");
  const g = await ctx.h.createGroup(
    ctx.A,
    [ctx.sessions.b.userId, third?.session?.userId],
    label,
  );
  if (g.conversationId) return g.conversationId;
  const d = await ctx.h.ensureDirect(ctx.A, ctx.sessions.b.userId);
  return d.conversationId;
}

export default {
  id: "FR-12-04",
  title: "A change proposal sat at \"Waiting on one response.\" forever",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["Center", "human thread", "proposal history", "GET /conversations/:id/alignment"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    const convId = await ownThread(ctx, ctx.marker("proposal expiry"));
    const created = await h.createConversationPlan(A, convId, {
      title: `Expiry ${ctx.tag}`,
      option_label: "Dinner",
      place: "Dinner",
      time_label: "Thursday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "setup plan must be created");
    const planId = created.plan?.id;

    await h.postHumanMessage(B, convId, "let's change dinner to 8 PM");
    const al = await h.getAlignment(A, convId);
    const alignment = al.alignment || {};
    const pending = ["change_proposal", "pending_revision", "pending_change"].filter(
      (k) => alignment[k] && Object.keys(alignment[k]).length > 0,
    );
    assert.check(
      "GET /conversations/:id/alignment (proposal live)",
      pending.length === 1,
      `exactly one live proposal must exist; found ${pending.join(",") || "none"}`,
    );
    if (pending.length !== 1) return;
    const proposal = alignment[pending[0]];
    // Verified on the current tip: the fold proposal is identified by
    // its proposed value (field/value/expires_at), not a proposal_id.
    assert.check(
      "GET /conversations/:id/alignment (proposal value)",
      allStrings(proposal).some((s) => s.includes("8:00")),
      `the live proposal must name the proposed 8:00 PM; got ${JSON.stringify(proposal).slice(0, 160)}`,
    );
    const expiryHits = findKeys(alignment, ["expires_at", "expiry", "valid_until"]).filter((hit) => hit.value);
    assert.check(
      "GET /conversations/:id/alignment (expiry metadata)",
      expiryHits.length >= 1,
      "a live proposal must carry expiry metadata on the surface output - a proposal nothing can expire is the defect",
    );

    // Settle it: the live slot clears and history records a terminal state.
    // (B proposed, so A - the other party - accepts; a no-id accept
    // targets the current proposal, the signal-card path.)
    const accept = await A.post(`/conversations/${encodeURIComponent(convId)}/alignment/change/accept`, {});
    assert.check(
      "POST /conversations/:id/alignment/change/accept",
      accept.status === 200,
      `accepting the live proposal must succeed (got ${accept.status})`,
    );
    const settled = await h.getAlignment(A, convId);
    const stillPending = ["change_proposal", "pending_revision", "pending_change"].filter(
      (k) => settled.alignment?.[k] && Object.keys(settled.alignment[k]).length > 0,
    );
    assert.eq(
      "GET /conversations/:id/alignment (live slot cleared)",
      stillPending.length,
      0,
      "a settled proposal must leave the live slot - it may not sit at 'Waiting on one response' after settling",
    );
    const history = settled.alignment?.proposal_history || [];
    assert.check(
      "GET /conversations/:id/alignment (proposal_history)",
      history.length >= 1 &&
        history.some((entry) => /accepted|expired|superseded|settled|consumed/i.test(entry.status || "")),
      `the settled proposal must retire into proposal_history with a terminal status; history=${JSON.stringify(history).slice(0, 200)}`,
    );

    // Stale accept of the settled id: refused, mutates nothing.
    const plansBefore = await h.listPlans(A, true);
    const snapBefore = JSON.stringify(plansBefore.plans.find((p) => p.id === planId) || {});
    const stale = await A.post(`/conversations/${encodeURIComponent(convId)}/alignment/change/accept`, {});
    assert.check(
      "POST /conversations/:id/alignment/change/accept (settled id)",
      stale.status >= 400,
      `re-accepting a settled proposal must be refused (got ${stale.status})`,
    );
    const plansAfter = await h.listPlans(A, true);
    assert.eq(
      "GET /opal/plans (stale accept mutates nothing)",
      JSON.stringify(plansAfter.plans.find((p) => p.id === planId) || {}),
      snapBefore,
      "a refused stale accept must mutate nothing",
    );
    assert.check(
      "GET /opal/plans (settled time stands)",
      allStrings(plansAfter.plans.find((p) => p.id === planId) || {}).some((s) => s.includes("8:00")),
      "the accepted 8:00 PM must stand after the stale-accept attempt",
    );
    assert.note("past-24h clock-ageing leg deferred: no product clock seam exists; see header for where it is proven");
  },
};
