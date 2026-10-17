/**
 * FR-18-04 - Attendance disagreed with itself (F18-01).
 *
 * Founder symptom: graph said 4 of 4 going, chat said 3 of 4, and the
 * chat never updated.
 *
 * Contract asserted on API output: ONE backend participation count
 * exists and every surface's API output carries that same pair
 * { going, total }:
 *   - GET /opal/plans entry (Graphs surface)
 *   - GET /conversations row plan_projection (Chats list surface)
 *   - GET /conversations/:id/alignment (thread surface)
 *   - GET /journeys/:id (graph detail / journey surface)
 * Then one member's RSVP flips through the real path
 * (POST /journeys/:id/accept-going) and every surface must read back
 * the NEW count with no other action in between.
 *
 * Ground truth comes from a response that does carry real participant
 * rows: the founder graph commitment seed payload (seed mode) or the
 * conversation plan create response participants array (two-session
 * mode). A surface whose output carries no attendance at all fails by
 * name - a count with no rows behind it must be impossible.
 *
 * Expected on the R17 tip: FAIL - HomeProjection, the plan contract
 * and the alignment output carry no attendance fields; the only real
 * counter (JourneyAuthority.participation_counts) is wired to none of
 * these surfaces (track-attendance.md H1/H2).
 */
import { extractAttendance } from "../lib/harness.mjs";

export default {
  id: "FR-18-04",
  title: "Attendance disagreed with itself: graph 4 of 4, chat 3 of 4, chat never updated",
  theme: "attendance",
  class: "A",
  surfaces: [
    "GET /opal/plans",
    "GET /conversations (plan_projection)",
    "GET /conversations/:id/alignment",
    "GET /journeys/:id",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;

    let planId = null;
    let conversationId = null;
    let truth = null; // { going, total }

    // -- Setup: a plan with real PlanParticipant rows --------------------
    if (ctx.seed?.graph?.json?.shared_plan_id) {
      const seed = ctx.seed.graph.json;
      planId = seed.shared_plan_id;
      conversationId = seed.conversation_id;
      const going = seed.going_count;
      const interested = seed.interested_count;
      if (typeof going === "number" && typeof interested === "number") {
        truth = { going, total: going + interested };
      }
      assert.note(
        `setup via founder graph commitment seed: plan=${planId} going=${going} interested=${interested}`,
      );
    } else if (B) {
      const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
      assert.check(
        "POST /conversations/direct",
        !!direct.conversationId,
        "two-session setup needs a direct conversation",
      );
      conversationId = direct.conversationId;
      const created = await h.createConversationPlan(A, conversationId, {
        title: `Attendance plan ${ctx.tag}`,
        option_label: "Dinner",
        place: "Juniper and Ivy",
        time_label: "Saturday 7:30 PM",
      });
      assert.eq(
        "POST /conversations/:id/plans",
        created.status,
        201,
        "conversation plan create must succeed",
      );
      planId = created.plan?.id || null;
      if (created.participants.length > 0) {
        truth = {
          going: created.participants.filter(
            (p) => p.response_state === "accepted",
          ).length,
          total: created.participants.length,
        };
      }
      assert.note(
        `setup via conversation plan: plan=${planId} participants=${created.participants.length}`,
      );
    }

    if (!planId || !truth) {
      throw new Error(
        "setup failed: need OPAL_SEED_MODE=1 (graph commitment seed) or a second session (OPAL_TOKEN_B / synthetic B) to build a plan with participants",
      );
    }

    // -- Read every surface and demand the same count ---------------------
    async function readSurfaces(label) {
      const out = {};

      const plans = await h.listPlans(A);
      const entry = plans.plans.find((p) => p.id === planId);
      out["GET /opal/plans (Graphs)"] = entry ? extractAttendance(entry) : null;

      const convs = await h.listConversations(A);
      const row = convs.conversations.find((c) => c.id === conversationId);
      out["GET /conversations plan_projection (Chats list)"] = row
        ? extractAttendance(row)
        : null;

      if (conversationId) {
        const al = await h.getAlignment(A, conversationId);
        out["GET /conversations/:id/alignment (thread)"] = al.alignment
          ? extractAttendance(al.alignment)
          : null;
      }

      const journey = await A.get(`/journeys/${encodeURIComponent(planId)}`);
      out["GET /journeys/:id (graph detail)"] =
        journey.status === 200 ? extractAttendance(journey.json) : null;
      if (journey.status !== 200) {
        assert.note(`journey show returned ${journey.status} in ${label} pass`);
      }

      for (const [surface, got] of Object.entries(out)) {
        assert.check(
          surface,
          !!got,
          `${label}: surface output carries no attendance count at all (backend ground truth is ${truth.going} of ${truth.total})`,
        );
        if (got) {
          assert.check(
            surface,
            got.going === truth.going && got.total === truth.total,
            `${label}: surface reads ${got.going} of ${got.total} going, backend ground truth is ${truth.going} of ${truth.total}`,
          );
        }
      }
      return out;
    }

    await readSurfaces("before RSVP change");

    // -- Flip one RSVP through the real path; all surfaces must move -----
    const viewerWasGoing = ctx.seed?.graph?.json?.viewer_response_state === "accepted";
    if (!viewerWasGoing) {
      const flip = await A.post(`/journeys/${encodeURIComponent(planId)}/accept-going`, {});
      assert.check(
        "POST /journeys/:id/accept-going",
        flip.status === 200 || flip.status === 201,
        `accept-going must succeed through the real path (got ${flip.status}: ${JSON.stringify(flip.json).slice(0, 160)})`,
      );
      if (flip.status === 200 || flip.status === 201) {
        truth = { going: truth.going + 1, total: truth.total };
        await readSurfaces("after RSVP change");
      }
    } else {
      assert.note(
        "viewer already accepted on this plan from a previous run; RSVP-flip leg skipped (seed is stateful) - run against a fresh stack for the flip leg",
      );
    }
  },
};
