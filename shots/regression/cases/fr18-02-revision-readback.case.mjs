/**
 * FR-18-02-revision (coordinator ruling: companion leg of the F18-02 family) - Revision read-back on every
 * surface. Catalog anchor: FR-12-02 / track-revision.md Tests 1 + 3
 * (the F18-02 finding: a confirmed "change dinner to 8 PM" reverted to
 * "Dinner Thursday 7:30" on the surfaces the founder reads).
 *
 * NOTE on naming: the catalog's own FR-18-06 row is the story-composer
 * reachability case (F18-04). That case is registered in CASE_INDEX.md
 * and plugs in as a web-level case in Division B/C. This file carries
 * the revision read-back case the coordinator assigned as FR-18-06 for
 * the F18 executable set; the catalog case it proves is FR-12-02.
 *
 * Contract asserted on API output, two distinct sessions (proposer,
 * confirmer), the founder's exact session shape:
 *  1. The proposer sends "let's change dinner to 8 PM" in the plan's
 *     human thread. The thread alignment output shows exactly ONE
 *     pending change representation naming 8:00 PM (not a PlanRevision
 *     AND a fold change_proposal both pending), and the plan still
 *     reads 7:30 PM on the listing until the other party confirms.
 *  2. The confirmer replies "confirm 8 PM" in the same thread.
 *  3. Read-back on EVERY surface that shows the plan's time:
 *     - GET /opal/plans for both parties (Graphs)
 *     - GET /conversations/:id/alignment (thread)
 *     - GET /conversations plan_projection (Chats list, both parties)
 *     - GET /conversations/:id/messages signals + chronology (the
 *       bottom-of-screen copy must not keep presenting 7:30 as the
 *       plan's current time)
 *     - GET /calendar/today (Center Now strip) when the plan projects
 *       into the window
 *     Every one must read 8:00 PM; a surface still reading 7:30 PM
 *     fails by name.
 *  4. An unrelated follow-up message (fold re-sync) must not revert
 *     any surface to 7:30 PM, and no new pending change may appear.
 *
 * Throttle variant (from FR-12-02): on the seeded walk account the
 * founder seed itself consumes the viewer's non-contact spam bucket
 * (10 hits during provisioning), so the proposer's first send can be
 * throttled. A throttled send must be an honest, retryable 429 - never
 * silently swallowed - and the flow then re-runs on a fresh account
 * pair when the suite can provision one (local/dev synthetic mode),
 * or waits out the retry window on the walk sessions.
 *
 * Expected on the R17 tip: FAIL - the R17 flow is proven only through
 * module calls on a harness plan; the real thread path runs through
 * the alignment fold, and the stored-alignment projection, the frozen
 * plan_set_event and the first-match presentation layer keep printing
 * 7:30 (track-revision.md H1/H2/H7).
 */
import { allStrings } from "../lib/harness.mjs";

const OLD_TIME = "7:30";
const NEW_TIME = "8:00";

function surfaceReadsTime(surfaceObj, needle) {
  return allStrings(surfaceObj).some((s) => s.includes(needle));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  id: "FR-18-02-revision",
  title: "Revision read-back: a confirmed change to 8 PM must read 8 PM on every surface",
  theme: "revision",
  class: "A",
  surfaces: [
    "GET /opal/plans",
    "GET /conversations/:id/alignment",
    "GET /conversations (plan_projection)",
    "GET /conversations/:id/messages (signals, chronology)",
    "GET /calendar/today",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) {
      throw new Error(
        "two distinct sessions are required (proposer + confirmer); provide session B via minted file, OPAL_TOKEN_B, or synthetic provisioning",
      );
    }

    // The full flow, parameterized by the session pair so it can re-run
    // on fresh accounts after a throttled first attempt. Returns true
    // when the proposer's change message was accepted (201).
    async function flow(P, C, peerIdOfC, label) {
      const direct = await h.ensureDirect(P, peerIdOfC);
      assert.check(
        "POST /conversations/direct",
        !!direct.conversationId,
        `${label}: a direct conversation between the two parties is required`,
      );
      const convId = direct.conversationId;

      await h.postHumanMessage(P, convId, "Let's do dinner at Juniper and Ivy on Thursday at 7:30 PM");
      await h.postHumanMessage(C, convId, "Sounds good, 7:30 works for me");

      let plans = await h.listPlans(P);
      let plan = plans.plans.find((p) => p.conversation_id === convId);
      if (!plan) {
        const created = await h.createConversationPlan(P, convId, {
          title: "Juniper and Ivy",
          option_label: "Juniper and Ivy",
          place: "Juniper and Ivy",
          time_label: "Thursday 7:30 PM",
        });
        assert.eq(
          "POST /conversations/:id/plans",
          created.status,
          201,
          `${label}: plan creation through the thread path must succeed`,
        );
        plan = created.plan;
      }
      assert.check("setup", !!plan, `${label}: a shared plan must exist in the thread`);
      if (!plan) return false;
      const planId = plan.id;
      assert.note(`${label}: plan under test: ${planId} (${plan.title} / ${plan.time_label})`);
      const planOf = (list) => list.find((p) => p.id === planId);

      // -- Propose, founder's exact words --------------------------------
      let propose = await h.postHumanMessage(P, convId, "let's change dinner to 8 PM");
      if (propose.status === 429) {
        const honest =
          propose.json?.error_code === "rate_limited" ||
          /wait|try again|rate/i.test(JSON.stringify(propose.json));
        assert.check(
          "POST /conversations/:id/messages (throttled send)",
          honest,
          `${label}: a throttled first send must return an honest, retryable error - never be silently swallowed; got ${JSON.stringify(propose.json).slice(0, 160)}`,
        );
        assert.note(
          `${label}: proposer's change send was throttled (429) - the throttle variant; flow cannot proceed on this account pair`,
        );
        return false;
      }
      assert.eq(
        "POST /conversations/:id/messages",
        propose.status,
        201,
        `${label}: the change message must be accepted`,
      );

      const alignmentAfterPropose = await h.getAlignment(P, convId);
      const al = alignmentAfterPropose.alignment || {};
      const pendingKeys = ["change_proposal", "pending_revision", "pending_change"].filter(
        (k) => al[k] && typeof al[k] === "object" && Object.keys(al[k]).length > 0,
      );
      assert.check(
        "GET /conversations/:id/alignment (pending state)",
        pendingKeys.length >= 1,
        `${label}: a visible pending change must exist on the thread alignment output; pending keys found: ${pendingKeys.join(", ") || "none"}`,
      );
      assert.check(
        "GET /conversations/:id/alignment (pending state)",
        pendingKeys.length <= 1,
        `${label}: exactly ONE pending change representation may be live; found ${pendingKeys.length}: ${pendingKeys.join(", ")}`,
      );
      if (pendingKeys.length >= 1) {
        assert.check(
          "GET /conversations/:id/alignment (pending state)",
          surfaceReadsTime(al[pendingKeys[0]], NEW_TIME),
          `${label}: the pending change must name ${NEW_TIME} PM`,
        );
      }
      const plansPending = await h.listPlans(P);
      const pendingPlan = planOf(plansPending.plans);
      assert.check(
        "GET /opal/plans (before confirm)",
        !!pendingPlan && (pendingPlan.time_label || "").includes(OLD_TIME),
        `${label}: until the other party confirms, the plan must still read ${OLD_TIME} PM on the listing; got time_label=${JSON.stringify(pendingPlan?.time_label)}`,
      );

      // -- Confirm ---------------------------------------------------------
      const confirm = await h.postHumanMessage(C, convId, "confirm 8 PM");
      assert.eq(
        "POST /conversations/:id/messages",
        confirm.status,
        201,
        `${label}: the confirm message must be accepted`,
      );

      // -- Read back on every surface ---------------------------------------
      async function readBackAll(phase) {
        const plansP = await h.listPlans(P);
        const pP = planOf(plansP.plans);
        assert.check(
          "GET /opal/plans (proposer, Graphs)",
          !!pP && (pP.time_label || "").includes(NEW_TIME),
          `${label} ${phase}: proposer's plan listing must read ${NEW_TIME} PM; got time_label=${JSON.stringify(pP?.time_label)}`,
        );
        assert.check(
          "GET /opal/plans (proposer, Graphs)",
          !!pP && !(pP.time_label || "").includes(OLD_TIME),
          `${label} ${phase}: proposer's plan listing must not still read ${OLD_TIME} PM`,
        );

        const plansC = await h.listPlans(C);
        const pC = planOf(plansC.plans);
        assert.check(
          "GET /opal/plans (confirmer, Graphs)",
          !!pC && (pC.time_label || "").includes(NEW_TIME),
          `${label} ${phase}: confirmer's plan listing must read ${NEW_TIME} PM; got time_label=${JSON.stringify(pC?.time_label)}`,
        );

        const alR = await h.getAlignment(P, convId);
        assert.check(
          "GET /conversations/:id/alignment (thread)",
          surfaceReadsTime(alR.alignment || {}, NEW_TIME),
          `${label} ${phase}: the thread alignment output must read ${NEW_TIME} PM somewhere in its plan state`,
        );

        for (const [who, client] of [["proposer", P], ["confirmer", C]]) {
          const convs = await h.listConversations(client);
          const row = convs.conversations.find((c) => c.id === convId);
          assert.check(
            `GET /conversations plan_projection (${who}, Chats list)`,
            !!row && surfaceReadsTime(row.plan_projection || {}, NEW_TIME),
            `${label} ${phase}: ${who}'s chats-list projection must read ${NEW_TIME} PM`,
          );
          assert.check(
            `GET /conversations plan_projection (${who}, Chats list)`,
            !!row && !surfaceReadsTime(row.plan_projection || {}, OLD_TIME),
            `${label} ${phase}: ${who}'s chats-list projection must not still read ${OLD_TIME} PM`,
          );
        }

        const msgs = await h.getHumanMessages(P, convId);
        const liveCopy = {
          signals: msgs.json.signals || [],
          chronology: msgs.json.chronology || [],
        };
        assert.check(
          "GET /conversations/:id/messages (signals + chronology)",
          !surfaceReadsTime(liveCopy, OLD_TIME),
          `${label} ${phase}: thread signals/chronology (the bottom-of-screen copy) must not present ${OLD_TIME} PM as the plan's current time`,
        );

        const today = await h.calendarToday(P);
        const ev = today.events.find((e) => e.plan_id === planId || e.id === planId);
        if (ev) {
          assert.check(
            "GET /calendar/today (Center Now strip)",
            (ev.time_label || "").includes(NEW_TIME) || surfaceReadsTime(ev, NEW_TIME),
            `${label} ${phase}: the Now strip event for this plan must read ${NEW_TIME} PM; got time_label=${JSON.stringify(ev.time_label)}`,
          );
        } else {
          assert.note(
            `${label} ${phase}: plan does not project into the calendar/today window on this stack; Now strip leg not assertable for a Thursday-labelled plan outside the window`,
          );
        }
      }

      await readBackAll("after confirm");

      // -- Unrelated message must not revert anything -----------------------
      const follow = await h.postHumanMessage(P, convId, "Thanks, see you there");
      assert.eq(
        "POST /conversations/:id/messages",
        follow.status,
        201,
        `${label}: the follow-up message must be accepted`,
      );
      const alAfter = await h.getAlignment(P, convId);
      const al2 = alAfter.alignment || {};
      const stillPending = ["change_proposal", "pending_revision", "pending_change"].filter(
        (k) => al2[k] && typeof al2[k] === "object" && Object.keys(al2[k]).length > 0,
      );
      assert.check(
        "GET /conversations/:id/alignment (after unrelated message)",
        stillPending.length === 0,
        `${label}: no pending change may resurrect after an unrelated message; found: ${stillPending.join(", ") || "none"}`,
      );
      await readBackAll("after unrelated message");
      return true;
    }

    // Primary pair: the suite's two sessions (on staging, the walk pair).
    const done = await flow(A, B, ctx.sessions.b.userId, "walk pair");
    if (done) return;

    // Throttled on the primary pair: re-run on fresh accounts when the
    // suite can provision them (local/dev synthetic mode).
    const C = await ctx.freshClient("+12025550105", "Regression C");
    const D = await ctx.freshClient("+12025550106", "Regression D");
    if (C && D) {
      assert.note("re-running the flow on a fresh account pair (seed/throttle isolation)");
      const doneFresh = await flow(C, D, D.session.userId, "fresh pair");
      assert.check(
        "fresh pair flow",
        doneFresh,
        "the flow must complete on a fresh account pair",
      );
      return;
    }

    // No fresh pair available: wait out the retry window once and retry.
    assert.note("no fresh pair available; waiting 65s for the throttle window and retrying once");
    await sleep(65000);
    const retried = await flow(A, B, ctx.sessions.b.userId, "walk pair retry");
    assert.check(
      "walk pair retry",
      retried,
      "the proposer's send must succeed after the throttle window",
    );
  },
};
