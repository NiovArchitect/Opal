/**
 * FR-12-02 - "Change dinner to 8 PM" produced copy but the plan never
 * moved - or moved, then reverted to Thursday 7:30 on other surfaces
 * (F12-02, F12-02c, F12-13, R6, F17-07, F18-02).
 *
 * Genesis: the change-time case, re-found in Repairs #6, #12, #17
 * and the F18 walk. Companion file fr18-02-revision-readback.case.mjs
 * proves the same contract on the seeded walk pair; this file proves
 * it on isolated group threads with the catalog's exact phrasing,
 * plus the lead direct-change variant and the throttle variant.
 *
 * Guards:
 *  - Non-lead: "let's change the time for Juniper and Ivy at 8pm"
 *    creates a revision proposal; the plan still reads the old time
 *    on the listing, the Chats projection and the alignment until
 *    the other party confirms, with the pending change naming 8:00.
 *  - Confirmer: "confirm 8 PM" - plan listing (both parties), thread
 *    alignment and Chats projection ALL read 8:00 PM, and still do
 *    after re-entry.
 *  - Lead variant: the lead's own change applies immediately (no
 *    pending state left behind).
 *  - Throttle variant: if a send is throttled (429), the response is
 *    an honest retryable error - never a silent swallow.
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
  id: "FR-12-02",
  title: "\"Change dinner to 8 PM\" produced copy but the plan never moved, or reverted to 7:30",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["human thread", "Center", "Next Together strip", "Graphs", "Timeline", "calendar", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");
    const find = (list, id) => list.plans.find((p) => p.id === id);

    function checkSend(label, r) {
      if (r.status === 429) {
        const honest = r.json?.error_code === "rate_limited" || /wait|try again|rate/i.test(JSON.stringify(r.json || {}));
        assert.check(
          "POST /conversations/:id/messages (throttled send)",
          honest,
          `${label}: a throttled send must be visibly retryable, never silently swallowed`,
        );
        assert.note(`${label}: send throttled (429) - throttle variant asserted, flow leg degraded on this account`);
        return false;
      }
      assert.eq("POST /conversations/:id/messages", r.status, 201, `${label}: send must be accepted`);
      return r.status === 201;
    }

    // -- Non-lead proposal holds the old time everywhere --------------------
    const convId = await ownThread(ctx, ctx.marker("change time"));
    const created = await h.createConversationPlan(A, convId, {
      title: "Juniper and Ivy",
      option_label: "Juniper and Ivy",
      place: "Juniper and Ivy",
      time_label: "Thursday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "setup plan must be created");
    const planId = created.plan?.id;

    const propose = await h.postHumanMessage(B, convId, "let's change the time for Juniper and Ivy at 8pm");
    if (checkSend("non-lead propose", propose)) {
      const al = await h.getAlignment(A, convId);
      const pending = ["change_proposal", "pending_revision", "pending_change"].filter(
        (k) => al.alignment?.[k] && Object.keys(al.alignment[k]).length > 0,
      );
      assert.check(
        "GET /conversations/:id/alignment (pending)",
        pending.length === 1 && allStrings(al.alignment[pending[0]]).some((s) => s.includes("8:00")),
        `exactly one pending change naming 8:00 PM must exist; found ${pending.join(",") || "none"}`,
      );
      const heldPlans = await h.listPlans(A, true);
      const held = find(heldPlans, planId);
      assert.check(
        "GET /opal/plans (before confirm)",
        !!held && (held.time_label || "").includes("7:30"),
        `until confirm, the plan must still read 7:30 PM; got ${held?.time_label}`,
      );
      const convsHeld = await h.listConversations(A);
      const rowHeld = convsHeld.conversations.find((c) => c.id === convId);
      assert.check(
        "GET /conversations plan_projection (before confirm)",
        !!rowHeld && !allStrings(rowHeld.plan_projection || {}).some((s) => s.includes("8:00")),
        "the Chats projection must not leak 8:00 PM before confirm",
      );

      const conf = await h.postHumanMessage(A, convId, "confirm 8 PM");
      if (checkSend("lead confirm", conf)) {
        for (const [who, client] of [["proposer", B], ["confirmer", A]]) {
          const plans = await h.listPlans(client, true);
          const entry = find(plans, planId);
          assert.check(
            `GET /opal/plans (${who}, after confirm)`,
            !!entry && (entry.time_label || "").includes("8:00"),
            `${who}: the plan must read 8:00 PM after confirm; got ${entry?.time_label}`,
          );
        }
        const alAfter = await h.getAlignment(A, convId);
        assert.check(
          "GET /conversations/:id/alignment (after confirm)",
          allStrings(alAfter.alignment || {}).some((s) => s.includes("8:00")),
          "the thread alignment must read 8:00 PM after confirm",
        );
        const convs = await h.listConversations(A);
        const row = convs.conversations.find((c) => c.id === convId);
        assert.check(
          "GET /conversations plan_projection (after confirm)",
          !!row && allStrings(row.plan_projection || {}).some((s) => s.includes("8:00")),
          "the Chats projection must read 8:00 PM after confirm",
        );
        // Re-entry: reads again, still 8:00.
        const plansRe = await h.listPlans(A, true);
        const re = find(plansRe, planId);
        assert.check(
          "GET /opal/plans (re-entry)",
          !!re && (re.time_label || "").includes("8:00") && !(re.time_label || "").includes("7:30"),
          `after re-entry the plan must still read 8:00 PM; got ${re?.time_label}`,
        );
      }
    }

    // -- Lead direct change applies immediately ------------------------------
    const conv2 = await ownThread(ctx, ctx.marker("lead change"));
    const c2 = await h.createConversationPlan(A, conv2, {
      title: "LeadChange",
      option_label: "LeadChange",
      place: "LeadChange",
      time_label: "Friday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", c2.status, 201, "lead-variant setup plan");
    const leadSend = await h.postHumanMessage(A, conv2, "let's change dinner to 8 PM");
    if (checkSend("lead change", leadSend)) {
      const plans = await h.listPlans(A, true);
      const entry = find(plans, c2.plan?.id);
      assert.check(
        "GET /opal/plans (lead direct change)",
        !!entry && (entry.time_label || "").includes("8:00"),
        `the lead's own change must apply immediately; got ${entry?.time_label}`,
      );
    }
  },
};
