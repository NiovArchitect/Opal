/**
 * FR-18-W4-01a (Walk #4, W4-01) - a new-plan scheduling request in a
 * thread that already has a plan must CREATE the new plan (or ASK
 * with named candidates and write nothing). It must NEVER fold into
 * a change_proposal on the current plan.
 *
 * The founder's exact session (Walk #4, 2026-10-17 23:18 PDT, backend
 * log verified, conversation 9a29fbaa): in the thread with his
 * girlfriend, with an existing 8 PM dinner plan, he sent
 * "Schedule 7 am church at Awaken" - a request for a NEW plan (Sunday
 * 7 AM church at a venue called Awaken). The backend folded it into
 * a change_proposal on the dinner plan ("Suggested 7:00 AM instead";
 * the dinner plan's canonical time stayed untouched because the
 * proposal was never accepted - the misroute itself is the defect).
 *
 * Contract asserted on API output, two distinct sessions:
 *  1. Setup: a two-party thread forms a dinner plan at 8:00 PM.
 *  2. The founder's exact words are sent.
 *  3. Read-back on EVERY surface:
 *     - GET /conversations/:id/alignment (thread): NO change_proposal,
 *       no "Suggested 7:00 AM instead" prompt, dinner exact_time
 *       still 8:00 PM.
 *     - GET /opal/plans for both parties (Graphs / plan payload): a
 *       NEW plan for Church at Awaken at 7:00 AM exists exactly once,
 *       and the dinner plan still reads 8:00 PM. (Or, lawful ASK
 *       outcome: the alignment carries an ask naming BOTH candidates
 *       and no new plan was written.)
 *     - GET /conversations plan_projection (Chats list): still the
 *       dinner plan at 8:00 PM.
 *     - GET /conversations/:id/messages: the church message is stored
 *       exactly once.
 *  4. An unrelated follow-up must not duplicate the new plan or
 *     resurrect a proposal on re-sync.
 *
 * Varied phrasings (real_user_path_acceptance: 3x varied runs of the
 * key flow): the same shape with "Schedule 9 am brunch at The Henry"
 * and "Add soccer Saturday 10 am at the park" against different
 * current plans.
 *
 * Threads are isolated per leg: a fresh group conversation (or the
 * suite dyad as fallback) so no other case's fold state can leak in.
 */
import { allStrings } from "../lib/harness.mjs";

function strings(obj) {
  return allStrings(obj || {});
}

function askNamesBothCandidates(alignment, newNeedles, currentNeedles) {
  const hay = strings(alignment).join(" \n ");
  const promptLike =
    alignment?.prompt || alignment?.clarify || alignment?.intent_ask || "";
  const promptText = typeof promptLike === "string" ? promptLike : JSON.stringify(promptLike);
  const text = `${promptText} ${hay}`;
  return (
    newNeedles.every((n) => text.toLowerCase().includes(n.toLowerCase())) &&
    currentNeedles.every((n) => text.toLowerCase().includes(n.toLowerCase()))
  );
}

export default {
  id: "FR-18-W4-01a",
  title:
    "W4-01a: 'Schedule 7 am church at Awaken' in a dinner thread creates a new plan (or ASKs) - never a change_proposal on dinner",
  theme: "send-intent",
  class: "A",
  surfaces: [
    "GET /conversations/:id/alignment",
    "GET /opal/plans",
    "GET /conversations (plan_projection)",
    "GET /conversations/:id/messages",
    "GET /calendar/today",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) {
      throw new Error("two distinct sessions are required (sender + partner)");
    }

    // Isolated thread factory: fresh group conversation with a third
    // synthetic member when provisioning allows; the suite dyad
    // otherwise (first leg only - later legs note the fallback).
    let thirdPool = ["+12025550103", "+12025550105", "+12025550107"];
    async function newThread(label) {
      const phone = thirdPool.shift();
      if (phone) {
        const C = await ctx.freshClient(phone, `W4 third ${label}`);
        if (C) {
          const g = await h.createGroup(A, [B.session.userId, C.session.userId], `w4-01a ${label}`);
          if (g.conversationId) return g.conversationId;
        }
      }
      const direct = await h.ensureDirect(A, B.session.userId);
      return direct.conversationId;
    }

    async function leg({ label, setup, send, expect }) {
      const convId = await newThread(label);
      assert.check("thread setup", !!convId, `${label}: an isolated thread is required`);
      if (!convId) return;

      for (const [who, body] of setup) {
        const r = await h.postHumanMessage(who === "A" ? A : B, convId, body);
        assert.eq("POST /conversations/:id/messages (setup)", r.status, 201, `${label}: setup send must be accepted: ${body}`);
      }
      await h.getAlignment(A, convId);

      let plans = await h.listPlans(A);
      const dinner = plans.plans.find(
        (p) => p.conversation_id === convId && (p.time_label || "").includes(expect.currentTime),
      );
      assert.check(
        "GET /opal/plans (setup)",
        !!dinner,
        `${label}: the current plan must exist reading ${expect.currentTime}; got ${JSON.stringify(plans.plans.filter((p) => p.conversation_id === convId).map((p) => [p.title, p.time_label]))}`,
      );
      if (!dinner) return;
      const dinnerId = dinner.id;

      const sent = await h.postHumanMessage(A, convId, send);
      assert.eq("POST /conversations/:id/messages", sent.status, 201, `${label}: the new-plan send must be accepted`);

      const alRes = await h.getAlignment(A, convId);
      const al = alRes.alignment || {};

      // The misroute itself: no change proposal on the current plan,
      // in any representation, and no "Suggested ... instead" copy.
      assert.check(
        "GET /conversations/:id/alignment (no change_proposal)",
        !al.change_proposal,
        `${label}: NO change_proposal may appear on the current plan; got ${JSON.stringify(al.change_proposal)}`,
      );
      assert.check(
        "GET /conversations/:id/alignment (no suggested-instead copy)",
        !strings(al).some((s) => /suggested .* instead/i.test(s)),
        `${label}: the thread must not present the new plan as a suggested change to the current plan`,
      );
      assert.check(
        "GET /conversations/:id/alignment (current time intact)",
        (al.exact_time?.value || "").includes(expect.currentTime),
        `${label}: the current plan's exact_time must still read ${expect.currentTime}; got ${JSON.stringify(al.exact_time)}`,
      );

      plans = await h.listPlans(A);
      const mine = plans.plans.filter((p) => p.conversation_id === convId);
      const dinnerAfter = mine.find((p) => p.id === dinnerId);
      assert.check(
        "GET /opal/plans (current plan intact)",
        !!dinnerAfter && (dinnerAfter.time_label || "").includes(expect.currentTime) && !(dinnerAfter.time_label || "").includes(expect.newTime),
        `${label}: the dinner plan must still read ${expect.currentTime}; got ${JSON.stringify(dinnerAfter?.time_label)}`,
      );

      const created = mine.filter(
        (p) =>
          p.id !== dinnerId &&
          expect.newTitleNeedles.every((n) => (p.title || "").toLowerCase().includes(n.toLowerCase()) || (p.location || "").toLowerCase().includes(n.toLowerCase())),
      );
      const asked =
        !created.length &&
        askNamesBothCandidates(al, expect.newTitleNeedles, [expect.currentName]);

      assert.check(
        "GET /opal/plans (new plan created) OR alignment ASK",
        created.length === 1 || asked,
        `${label}: exactly one NEW plan (${expect.newTitleNeedles.join(" + ")}) must be created, or an ASK naming both candidates returned; created=${created.length}, asked=${asked}`,
      );
      if (created.length === 1) {
        assert.check(
          "GET /opal/plans (new plan time)",
          (created[0].time_label || "").includes(expect.newTime),
          `${label}: the new plan must read ${expect.newTime}; got ${JSON.stringify(created[0].time_label)}`,
        );
        // Partner read-back: the new plan is shared truth, not local.
        const plansB = await h.listPlans(B);
        assert.check(
          "GET /opal/plans (partner read-back)",
          plansB.plans.some((p) => p.id === created[0].id),
          `${label}: the partner's plan listing must include the new plan`,
        );
      }

      // Chats list still projects the thread's current plan.
      const convs = await h.listConversations(A);
      const row = convs.conversations.find((c) => c.id === convId);
      assert.check(
        "GET /conversations plan_projection (Chats list)",
        !!row && strings(row.plan_projection || {}).some((s) => s.includes(expect.currentTime)),
        `${label}: the chats-list projection must still read ${expect.currentTime}`,
      );

      // The send is stored exactly once.
      const msgs = await h.getHumanMessages(A, convId);
      const copies = msgs.messages.filter((m) => m.body === send);
      assert.eq("GET /conversations/:id/messages (stored once)", copies.length, 1, `${label}: the new-plan message must be stored exactly once`);

      // Re-sync after an unrelated message: no duplicate new plan,
      // no resurrecting proposal, dinner untouched.
      const follow = await h.postHumanMessage(B, convId, "Thanks!");
      assert.eq("POST /conversations/:id/messages (follow-up)", follow.status, 201, `${label}: follow-up must be accepted`);
      await h.getAlignment(A, convId);
      const plans2 = await h.listPlans(A);
      const mine2 = plans2.plans.filter((p) => p.conversation_id === convId);
      const created2 = mine2.filter(
        (p) =>
          p.id !== dinnerId &&
          expect.newTitleNeedles.every((n) => (p.title || "").toLowerCase().includes(n.toLowerCase()) || (p.location || "").toLowerCase().includes(n.toLowerCase())),
      );
      assert.check(
        "GET /opal/plans (no duplicate after re-sync)",
        created2.length === created.length,
        `${label}: re-sync must not duplicate the new plan (was ${created.length}, now ${created2.length})`,
      );
      const al2 = (await h.getAlignment(A, convId)).alignment || {};
      assert.check(
        "GET /conversations/:id/alignment (no resurrection)",
        !al2.change_proposal,
        `${label}: no change_proposal may resurrect after an unrelated message`,
      );

      const today = await h.calendarToday(A);
      assert.note(`${label}: calendar/today carries ${today.events.length} event(s); Thursday/Sunday plans outside the today window are noted, not asserted`);
    }

    // The founder's exact session, transcribed word for word.
    await leg({
      label: "founder exact",
      setup: [
        ["A", "Let's do dinner at Juniper and Ivy on Thursday at 8 PM"],
        ["B", "Sounds good, 8 PM works for me"],
      ],
      send: "Schedule 7 am church at Awaken",
      expect: {
        currentTime: "8:00 PM",
        currentName: "Dinner",
        newTime: "7:00 AM",
        newTitleNeedles: ["church", "awaken"],
      },
    });

    // Varied phrasing 2: different activity, venue, time; current plan
    // is a Friday dinner.
    await leg({
      label: "varied brunch",
      setup: [
        ["A", "Let's do dinner at Harbor Table on Friday at 7 PM"],
        ["B", "Sounds good, 7 PM works for me"],
      ],
      send: "Schedule 9 am brunch at The Henry",
      expect: {
        currentTime: "7:00 PM",
        currentName: "Dinner",
        newTime: "9:00 AM",
        newTitleNeedles: ["brunch", "henry"],
      },
    });

    // Varied phrasing 3: "Add ..." with a weekday, no shared words
    // with the current plan at all.
    await leg({
      label: "varied soccer",
      setup: [
        ["A", "Let's do dinner on Saturday at 6 PM"],
        ["B", "Sounds good, 6 PM works for me"],
      ],
      send: "Add soccer Saturday 10 am at the park",
      expect: {
        currentTime: "6:00 PM",
        currentName: "Dinner",
        newTime: "10:00 AM",
        newTitleNeedles: ["soccer"],
      },
    });
  },
};
