/**
 * FR-13-01 - Fake success on dead plans: proposing or accepting a
 * change on a cancelled/completed plan "worked"; accepting an old
 * superseded revision silently rolled the plan back
 * (F13-01, F13-02, F12-62).
 *
 * Genesis: Repair #13 sinister suite - dead-plan mutations returned
 * success and stale revision accepts rewound live plans.
 *
 * Guards (two real accounts, the plan's own thread):
 *  - Cancel a plan through the real path; it reads cancelled on both
 *    parties' listings.
 *  - Afterwards, a chat change proposal, a chat confirm, and the
 *    signal-card accept endpoint are ALL refused honestly; the plan
 *    stays cancelled with its original time on every surface.
 *  - Superseded revision: propose rev1 (8 PM), propose rev2 (9 PM);
 *    accepting rev1 by id is refused and the plan keeps its time;
 *    accepting rev2 applies exactly 9:00 PM.
 *
 * Pass expectation on the current tip: PASS.
 */
import { allStrings } from "../lib/harness.mjs";

async function ownThread(ctx, label) {
  // Isolation repair (Repair #18 apifix): a real group needs >= 3
  // people, so the old two-person create 422'd group_too_small and
  // silently fell back to the SHARED A-B direct thread - every
  // scenario in the suite then folded over the same replayed
  // history (and shared one spam-throttle bucket). A third pool
  // member makes each scenario's group real and isolated.
  const third = await ctx.freshClient("+12025550108", "Member Aitch");
  const g = await ctx.h.createGroup(
    ctx.A,
    [ctx.sessions.b.userId, third?.session?.userId],
    label,
  );
  if (g.conversationId) return g.conversationId;
  const d = await ctx.h.ensureDirect(ctx.A, ctx.sessions.b.userId);
  return d.conversationId;
}

async function threadPlan(ctx, convId, title, timeLabel) {
  const created = await ctx.h.createConversationPlan(ctx.A, convId, {
    title,
    option_label: title,
    place: title,
    time_label: timeLabel,
  });
  return created;
}

function planIn(list, id) {
  return list.plans.find((p) => p.id === id);
}

export default {
  id: "FR-13-01",
  title: "Fake success on dead plans; superseded revision acceptance rolled the plan back",
  theme: "No scripted responders, no seed impersonation, no fake success",
  class: "A",
  surfaces: ["human thread", "Center", "signal cards", "GET /opal/plans", "GET /conversations/:id/alignment"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    // -- Part 1: dead (cancelled) plan refuses every mutation ------------
    const conv1 = await ownThread(ctx, ctx.marker("dead plan thread"));
    const c1 = await threadPlan(ctx, conv1, `DeadPlan ${ctx.tag}`, "Thursday 7:30 PM");
    assert.eq("POST /conversations/:id/plans", c1.status, 201, "setup plan must be created");
    const deadId = c1.plan?.id;
    assert.check("setup", !!deadId, "setup plan id required");

    await h.postHumanMessage(A, conv1, "cancel the plan");
    let plans = await h.listPlans(A, true);
    let dead = planIn(plans, deadId);
    if (!dead || dead.status !== "cancelled") {
      // Second real path: Center cancel naming the plan.
      await h.centerNewChat(A);
      await h.centerSend(A, `cancel the plan ${`DeadPlan ${ctx.tag}`}`);
      plans = await h.listPlans(A, true);
      dead = planIn(plans, deadId);
    }
    assert.check(
      "GET /opal/plans (cancel read-back)",
      !!dead && dead.status === "cancelled",
      `the plan must read cancelled after the lead cancels it; got status=${JSON.stringify(dead?.status)}`,
    );
    if (dead && dead.status === "cancelled") {
      // Chat propose on the dead plan.
      await h.postHumanMessage(A, conv1, "let's change dinner to 8 PM");
      const al = await h.getAlignment(A, conv1);
      const pending = ["change_proposal", "pending_revision", "pending_change"].filter(
        (k) => al.alignment?.[k] && Object.keys(al.alignment[k]).length > 0,
      );
      assert.eq(
        "GET /conversations/:id/alignment (dead plan propose)",
        pending.length,
        0,
        "no live pending change may exist on a cancelled plan",
      );
      // Signal-card accept endpoint on the dead plan's conversation.
      const accept = await A.post(`/conversations/${encodeURIComponent(conv1)}/alignment/change/accept`, {});
      assert.check(
        "POST /conversations/:id/alignment/change/accept (dead plan)",
        accept.status >= 400,
        `accepting a change on a cancelled plan must be refused (got ${accept.status})`,
      );
      // Chat confirm on the dead plan.
      await h.postHumanMessage(B, conv1, "confirm 8 PM");
      const after = await h.listPlans(A, true);
      const still = planIn(after, deadId);
      assert.check(
        "GET /opal/plans (dead plan after all attempts)",
        !!still && still.status === "cancelled" && (still.time_label || "").includes("7:30"),
        `the cancelled plan must stay cancelled at its original time; got status=${still?.status} time=${still?.time_label}`,
      );
    }

    // -- Part 2: superseded revision cannot roll the plan back -----------
    const conv2 = await ownThread(ctx, ctx.marker("revision thread"));
    const c2 = await threadPlan(ctx, conv2, `RevPlan ${ctx.tag}`, "Thursday 7:30 PM");
    assert.eq("POST /conversations/:id/plans", c2.status, 201, "revision setup plan must be created");
    const planId = c2.plan?.id;

    // Ground truth (verified on the current tip): the fold's
    // change_proposal carries field/value/expires_at/proposed_by -
    // revisions are identified by their proposed VALUE, and the
    // accept endpoint refuses any proposal_id that is not the
    // current proposal's (stale_proposal). A superseded revision is
    // therefore attacked two ways: by a stale id, and by value.
    async function currentProposal(client) {
      const al = await h.getAlignment(client, conv2);
      const cp = al.alignment?.change_proposal || al.alignment?.pending_revision || null;
      return { al: al.alignment, proposal: cp, value: cp?.value || null };
    }

    await h.postHumanMessage(A, conv2, "let's change dinner to 8 PM");
    const rev1 = await currentProposal(A);
    assert.check(
      "GET /conversations/:id/alignment (rev1)",
      !!rev1.proposal && allStrings(rev1.proposal).some((s) => s.includes("8:00")),
      `the first proposal must be live and name 8:00 PM; got ${JSON.stringify(rev1.proposal).slice(0, 160)}`,
    );
    await h.postHumanMessage(A, conv2, "actually let's change dinner to 9 PM");
    const rev2 = await currentProposal(A);
    assert.check(
      "GET /conversations/:id/alignment (rev2 supersedes rev1)",
      !!rev2.proposal && rev2.value !== rev1.value && allStrings(rev2.proposal).some((s) => s.includes("9:00")),
      `the second proposal must supersede the first (current value must be 9:00 PM); got value=${rev2.value}`,
    );

    if (rev1.proposal && rev2.proposal && rev2.value !== rev1.value) {
      const stale = await B.post(`/conversations/${encodeURIComponent(conv2)}/alignment/change/accept`, {
        proposal_id: `superseded-rev1-${ctx.tag}`,
      });
      assert.check(
        "POST /conversations/:id/alignment/change/accept (superseded rev1)",
        stale.status >= 400,
        `accepting a superseded revision must be refused (got ${stale.status})`,
      );
      const midPlans = await h.listPlans(A, true);
      const mid = planIn(midPlans, planId);
      assert.check(
        "GET /opal/plans (after stale accept attempt)",
        !!mid && !(mid.time_label || "").includes("8:00") && !(mid.time_label || "").includes("9:00"),
        `the plan must stay at its confirmed time after a stale accept attempt - no rollback, no jump; got time=${mid?.time_label}`,
      );
      const good = await B.post(`/conversations/${encodeURIComponent(conv2)}/alignment/change/accept`, {});
      assert.check(
        "POST /conversations/:id/alignment/change/accept (current rev2)",
        good.status === 200,
        `accepting the current revision must succeed (got ${good.status}: ${JSON.stringify(good.json).slice(0, 140)})`,
      );
      const endPlans = await h.listPlans(A, true);
      const end = planIn(endPlans, planId);
      assert.check(
        "GET /opal/plans (rev2 read-back)",
        !!end && (end.time_label || "").includes("9:00"),
        `after rev2 acceptance the plan must read 9:00 PM; got time=${end?.time_label}`,
      );
      assert.check(
        "GET /opal/plans (rev2 read-back)",
        !!end && !allStrings(end).some((s) => s === "Thursday 7:30 PM"),
        "the superseded original label must not remain the plan's current label",
      );
    }
  },
};
