/**
 * FR-11-04 - Confirming repeatedly dead-ended; the plan never
 * advanced and the UI kept asking (F05, H2).
 *
 * Genesis: Repair #11 walk F05 + the H2 confirm audit.
 *
 * Guards (two real accounts):
 *  - A change proposal is confirmed by the other party with varied
 *    phrasings ("I confirm", "confirm", "confirm 8 PM", "yes
 *    confirm") across separate proposals: each applies exactly once
 *    and the revision is consumed (no pending representation left).
 *  - A second confirm after consumption returns an honest
 *    nothing-pending outcome - no error storm, no re-application,
 *    plan unchanged.
 *  - Self-confirmation: the proposer confirming their own proposal
 *    does not apply it.
 *  - Cross-conversation: a confirm in conversation B never touches
 *    a pending revision in conversation A.
 *
 * Pass expectation on the current tip: PASS.
 */
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

export default {
  id: "FR-11-04",
  title: "Confirming repeatedly dead-ended; the plan never advanced",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["human thread", "Center", "signal cards", "GET /opal/plans", "GET /conversations/:id/alignment"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    async function pendingKeys(client, convId) {
      const al = await h.getAlignment(client, convId);
      return ["change_proposal", "pending_revision", "pending_change"].filter(
        (k) => al.alignment?.[k] && Object.keys(al.alignment[k]).length > 0,
      );
    }
    const find = (list, id) => list.plans.find((p) => p.id === id);

    // -- Varied confirm phrasings, one fresh proposal each -----------------
    const phrases = ["I confirm", "confirm", "confirm 8 PM", "yes confirm"];
    for (let i = 0; i < phrases.length; i++) {
      const convId = await ownThread(ctx, ctx.marker(`confirm ${i}`));
      const created = await h.createConversationPlan(A, convId, {
        title: `ConfirmCase${i} ${ctx.tag}`,
        option_label: "Dinner",
        place: "Dinner",
        time_label: "Thursday 7:30 PM",
      });
      assert.eq("POST /conversations/:id/plans", created.status, 201, `phrase ${i}: setup plan`);
      const planId = created.plan?.id;
      await h.postHumanMessage(A, convId, "let's change dinner to 8 PM");
      const pending = await pendingKeys(A, convId);
      assert.check(
        "GET /conversations/:id/alignment (proposal live)",
        pending.length >= 1,
        `phrase "${phrases[i]}": a pending proposal must exist before the confirm`,
      );
      const conf = await h.postHumanMessage(B, convId, phrases[i]);
      assert.check(
        "POST /conversations/:id/messages (confirm)",
        conf.status === 201 || conf.status === 200,
        `phrase "${phrases[i]}": the confirm send must be accepted (got ${conf.status})`,
      );
      const plans = await h.listPlans(A, true);
      const entry = find(plans, planId);
      assert.check(
        "GET /opal/plans (confirm applied)",
        !!entry && (entry.time_label || "").includes("8:00"),
        `phrase "${phrases[i]}": after confirm the plan must read 8:00 PM; got ${entry?.time_label}`,
      );
      const after = await pendingKeys(A, convId);
      assert.eq(
        "GET /conversations/:id/alignment (revision consumed)",
        after.length,
        0,
        `phrase "${phrases[i]}": the revision must be consumed - the UI must stop asking`,
      );

      // Second confirm: honest nothing-pending, plan unchanged.
      const again = await h.postHumanMessage(B, convId, "confirm");
      assert.check(
        "POST /conversations/:id/messages (second confirm)",
        again.status === 201 || again.status === 200,
        `phrase "${phrases[i]}": a repeat confirm must be answered, not dead-end (got ${again.status})`,
      );
      const plans2 = await h.listPlans(A, true);
      const entry2 = find(plans2, planId);
      assert.check(
        "GET /opal/plans (second confirm is a no-op)",
        !!entry2 && (entry2.time_label || "").includes("8:00"),
        `phrase "${phrases[i]}": a repeat confirm must not move the plan again; got ${entry2?.time_label}`,
      );
    }

    // -- Self-confirmation refused ------------------------------------------
    const convSelf = await ownThread(ctx, ctx.marker("self confirm"));
    const cSelf = await h.createConversationPlan(A, convSelf, {
      title: `SelfConfirm ${ctx.tag}`,
      option_label: "Dinner",
      place: "Dinner",
      time_label: "Thursday 7:30 PM",
    });
    await h.postHumanMessage(A, convSelf, "let's change dinner to 8 PM");
    await h.postHumanMessage(A, convSelf, "confirm 8 PM");
    const selfPlans = await h.listPlans(A, true);
    const selfEntry = find(selfPlans, cSelf.plan?.id);
    assert.check(
      "GET /opal/plans (self-confirm refused)",
      !!selfEntry && (selfEntry.time_label || "").includes("7:30"),
      `a proposer must not confirm their own proposal; got time=${selfEntry?.time_label}`,
    );

    // -- Cross-conversation isolation ---------------------------------------
    const convA = await ownThread(ctx, ctx.marker("cross A"));
    const cA = await h.createConversationPlan(A, convA, {
      title: `CrossA ${ctx.tag}`,
      option_label: "Dinner",
      place: "Dinner",
      time_label: "Thursday 7:30 PM",
    });
    await h.postHumanMessage(A, convA, "let's change dinner to 8 PM");
    const convB = await ownThread(ctx, ctx.marker("cross B"));
    await h.postHumanMessage(B, convB, "confirm 8 PM");
    const crossPlans = await h.listPlans(A, true);
    const crossEntry = find(crossPlans, cA.plan?.id);
    assert.check(
      "GET /opal/plans (cross-conversation confirm)",
      !!crossEntry && (crossEntry.time_label || "").includes("7:30"),
      `a confirm in another conversation must never touch this pending revision; got ${crossEntry?.time_label}`,
    );
  },
};
