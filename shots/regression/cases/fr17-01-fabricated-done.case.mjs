/**
 * FR-17-01 - Center painted "Done. X is on your Graph." replies that
 * were fabricated, even when the send failed (F17-01 second responder).
 *
 * Genesis: Repair #17 - a client-side second responder painted Done
 * claims locally; the claims existed in no backend record and were
 * painted even on failed sends.
 *
 * Guards (stored-message law):
 *  - Every Opal reply the client can paint is a persisted backend
 *    message: the POST response's opal message id must be found,
 *    byte-identical, in GET /opal/conversation read-back.
 *  - No reply claims a plan is "on your Graph" / "set up" / "Done"
 *    for an intent unless a matching plan actually reads back in
 *    GET /opal/plans.
 *  - An unfulfillable request (a person who does not exist in the
 *    account) produces no Done/set-up claim and creates no plan.
 *
 * Pass expectation on the current tip: PASS (R17 seed-kill + Division
 * A honest Center). A failure here is a real finding.
 */
import { allStrings } from "../lib/harness.mjs";

const DONE_CLAIM = /\bdone\b|on your graph|is set up|locked in|all set/i;

export default {
  id: "FR-17-01",
  title: "Center painted fabricated 'Done. X is on your Graph.' replies, even when the send failed",
  theme: "No scripted responders, no seed impersonation, no fake success",
  class: "A",
  surfaces: ["Center", "GET /opal/conversation", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;

    async function sendAndVerifyStored(body) {
      const sent = await h.centerSend(A, body);
      assert.eq("POST /opal/conversation/messages", sent.status, 201, `Center send must succeed for: ${body.slice(0, 60)}`);
      if (!sent.opal) return null;
      const read = await h.centerConversation(A);
      const stored = (read.conversation?.messages || []).find((m) => m.id === sent.opal.id);
      assert.check(
        "GET /opal/conversation (stored reply)",
        !!stored && stored.body === sent.opal.body,
        "every painted Opal reply must be a persisted backend message, byte-identical on read-back - a reply that only exists in the POST response is a second responder",
      );
      return sent.opal;
    }

    await h.centerNewChat(A);
    const plansBefore = await h.listPlans(A);
    const beforeIds = new Set(plansBefore.plans.map((p) => p.id));

    // Leg 1: an ordinary plan request - any Done claim must read back.
    const reply1 = await sendAndVerifyStored(`Plan dinner at Nighthawk on Sunday at 7 PM ${ctx.tag}`);
    if (reply1 && DONE_CLAIM.test(reply1.body || "")) {
      const plans = await h.listPlans(A);
      const fresh = plans.plans.filter((p) => !beforeIds.has(p.id));
      assert.check(
        "GET /opal/plans (Done claim read-back)",
        fresh.length >= 1,
        `reply claimed completion ("${(reply1.body || "").slice(0, 100)}") but no plan reads back in Graphs`,
      );
    } else {
      assert.note("plan request produced no Done claim; claim read-back leg vacuous");
    }

    // Leg 2: unfulfillable - a person who is not in this account.
    const ghost = `Zzqnonexistent${ctx.tag.replace(/[^a-z0-9]/gi, "")}`;
    const reply2 = await sendAndVerifyStored(`Plan dinner with ${ghost} tomorrow at 7 PM`);
    if (reply2) {
      assert.check(
        "Center reply (nonexistent person)",
        !DONE_CLAIM.test(reply2.body || ""),
        `an unfulfillable request must never produce a Done/set-up claim; got: ${(reply2.body || "").slice(0, 140)}`,
      );
    }
    const plansAfter = await h.listPlans(A);
    const ghostPlans = plansAfter.plans.filter(
      (p) => !beforeIds.has(p.id) && allStrings(p).some((s) => s.includes(ghost)),
    );
    assert.eq(
      "GET /opal/plans (nonexistent person)",
      ghostPlans.length,
      0,
      "no plan may be created for a person who does not exist in the account",
    );
  },
};
