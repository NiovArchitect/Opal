/**
 * FR-B3-03 - Circle check-in sweep, Scenario C HTTP legs (design
 * section 6): plan participant source. The sweep targets the plan's
 * participant set (RSVP state irrelevant - welfare, not attendance),
 * the summary label is the frozen plan title, and one open sweep per
 * circle holds for plans too.
 *
 * The fold-born zero-participant fallback (rule R4), the declined-
 * RSVP inclusion proof with a participant outside the conversation,
 * and the full proactive suggestion matrix (opt-in on/off, opt-out
 * wins, quiet hours, dismissal permanence) run in the backend suite
 * (checkin_test.exs / checkin_suggestion_test.exs) where participants,
 * family rows and the clock can be set up exactly; those shapes
 * cannot be produced through the product HTTP surface today. This
 * case does not claim them.
 */
import { freshSyntheticClient } from "../lib/harness.mjs";

export default {
  id: "FR-B3-03",
  title: "Check-in sweep: plan participants source, frozen plan label, one open sweep per plan",
  theme: "checkin-sweep",
  class: "B",
  surfaces: [
    "POST /conversations/:id/plans",
    "POST /checkins (plan source)",
    "GET /checkins/:id (organizer summary)",
    "POST /checkins/:id/respond",
    "GET /checkins/for-source (plan)",
  ],
  async run(ctx) {
    const { A, B, h, assert, config } = ctx;
    if (!B) throw new Error("FR-B3-03 needs session B");

    const C = await freshSyntheticClient(config, "+12025550103", "Celia Ruiz");
    if (!C) throw new Error("FR-B3-03 needs OPAL_SESSION_PROVISION=synthetic");

    const direct = await h.ensureDirect(A, B.session.userId);
    assert.check("POST /conversations/direct", !!direct.conversationId, "direct conversation for plan setup");
    const created = await h.createConversationPlan(A, direct.conversationId, {
      title: `Lockdown dinner ${ctx.tag}`,
      option_label: "Dinner",
      place: "Home",
      time_label: "Saturday 7:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "plan created");
    const plan = created.plan;
    assert.check("plan", !!plan?.id, "plan id present");
    assert.note(`plan participants from create: ${created.participants.length}`);

    const sweepRes = await A.post("/checkins", {
      source_kind: "plan",
      source_ref_id: plan.id,
      idempotency_key: `b3c-${ctx.tag}`,
    });
    assert.check(
      "POST /checkins (plan)",
      sweepRes.status === 201 || sweepRes.status === 422,
      `plan sweep responds deterministically (got ${sweepRes.status}: ${JSON.stringify(sweepRes.json).slice(0, 200)})`,
    );
    if (sweepRes.status === 422) {
      // A plan born from a dyad fold may carry zero participant rows
      // and its conversation is a dyad whose only other member is the
      // peer - that IS a lawful 1-target sweep, so a 422 here means
      // the setup shape differs; name it rather than passing silently.
      throw new Error(
        `plan sweep setup shape not sweepable via HTTP: ${JSON.stringify(sweepRes.json)}`,
      );
    }
    const sweep = sweepRes.json.checkin;
    const sweepId = sweep.sweep.id;
    assert.eq("plan label", sweep.sweep.circle_label, plan.title, "summary label is the frozen plan title");
    assert.check(
      "plan targets",
      sweep.counts.asked_total >= 1,
      "at least the plan peer is a target",
    );

    // One open sweep per circle: re-create returns the same sweep.
    const again = await A.post("/checkins", {
      source_kind: "plan",
      source_ref_id: plan.id,
      idempotency_key: `b3c-again-${ctx.tag}`,
    });
    assert.eq("one open per plan", again.json.checkin.sweep.id, sweepId, "same open sweep returned");

    // A target answers; the organizer summary moves.
    const target = sweep.members[0];
    const targetClient = target.user_id === B.session.userId ? B : C;
    const r = await targetClient.post(`/checkins/${sweepId}/respond`, {
      okay: "ok",
      needs_text: "Nothing right now",
    });
    assert.eq("respond", r.status, 200, "plan participant can answer");
    const s = (await A.get(`/checkins/${sweepId}`)).json.checkin;
    assert.eq("summary", s.counts.answered, 1, "answer rolls into the plan sweep summary");

    const fs = await A.get(
      `/checkins/for-source?source_kind=plan&source_ref_id=${plan.id}`,
    );
    assert.eq("for-source (plan)", fs.json.checkin?.sweep?.id, sweepId, "plan surface row reads the same sweep");
  },
};
