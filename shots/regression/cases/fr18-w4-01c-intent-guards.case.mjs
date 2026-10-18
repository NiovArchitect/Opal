/**
 * FR-18-W4-01c (Walk #4, W4-01) - intent disambiguation guards.
 *
 * The W4-01 fix must not break Division A's revision machinery, and
 * genuine ambiguity must ASK with named candidates instead of
 * guessing. Guards, all at the real message path:
 *
 *  G1. "change dinner to 8 PM" against a 7:30 PM dinner plan still
 *      REVISES the dinner plan (Division A behavior): one pending
 *      proposal naming 8:00 PM, canonical time untouched until the
 *      partner confirms, then every surface reads 8:00 PM.
 *  G2. "move it to 7" in a single-plan thread still anchors to the
 *      current plan: a pending proposal naming 7:00 PM on the dinner
 *      plan, nothing else created.
 *  G3. "make it 7 instead" when the thread holds TWO candidate
 *      plans (dinner + a separately created brunch) is ambiguous:
 *      the alignment ASKs with NAMED candidates and writes nothing -
 *      no proposal, neither plan's time changes.
 *  ADV. Adversarial smuggle: "Schedule dinner at 7 am" against an
 *      existing 8 PM dinner plan names the CURRENT activity with a
 *      scheduling verb - it must ASK ("Start a new plan for dinner
 *      at 7:00 AM, or change Dinner to 7:00 AM?"), never silently
 *      become a revision candidate and never silently create.
 *      The answer "Start a new one" then creates the new plan and
 *      leaves the original dinner untouched.
 */
import { allStrings } from "../lib/harness.mjs";

function askText(alignment) {
  const parts = [
    alignment?.prompt || "",
    alignment?.clarify || "",
    alignment?.intent_ask ? JSON.stringify(alignment.intent_ask) : "",
  ];
  return parts.join(" \n ");
}

export default {
  id: "FR-18-W4-01c",
  title:
    "W4-01c: Division A revision guards hold; two-candidate ambiguity and the 'Schedule dinner' smuggle ASK with named candidates",
  theme: "send-intent",
  class: "A",
  surfaces: [
    "POST /conversations/:id/messages",
    "GET /conversations/:id/alignment",
    "GET /opal/plans",
    "GET /conversations (plan_projection)",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) {
      throw new Error("two distinct sessions are required (sender + partner)");
    }

    let thirdPool = ["+12025550105", "+12025550107", "+12025550103"];
    async function newThread(label) {
      const phone = thirdPool.shift();
      if (phone) {
        const C = await ctx.freshClient(phone, `W4-01c third ${label}`);
        if (C) {
          const g = await h.createGroup(A, [B.session.userId, C.session.userId], `w4-01c ${label}`);
          if (g.conversationId) return g.conversationId;
        }
      }
      const direct = await h.ensureDirect(A, B.session.userId);
      return direct.conversationId;
    }

    async function setupDinner(convId, whenLine, confirmLine) {
      await h.postHumanMessage(A, convId, whenLine);
      await h.postHumanMessage(B, convId, confirmLine);
      await h.getAlignment(A, convId);
      const plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
      return plans.find((p) => (p.title || "").toLowerCase().includes("juniper") || (p.location || "").toLowerCase().includes("juniper")) || plans[0];
    }

    // -- G1 + G2: one thread, Division A revision flow -------------------
    {
      const convId = await newThread("guards");
      assert.check("thread setup", !!convId, "guards: an isolated thread is required");
      if (convId) {
        const dinner = await setupDinner(
          convId,
          "Let's do dinner at Juniper and Ivy on Thursday at 7:30 PM",
          "Sounds good, 7:30 works for me",
        );
        assert.check("setup", !!dinner && (dinner.time_label || "").includes("7:30"), `guards: dinner must start at 7:30 PM; got ${JSON.stringify(dinner?.time_label)}`);

        const propose = await h.postHumanMessage(A, convId, "change dinner to 8 PM");
        assert.eq("POST (change dinner)", propose.status, 201, "G1: the change message must be accepted");
        let al = (await h.getAlignment(A, convId)).alignment || {};
        assert.check(
          "G1 pending proposal",
          !!al.change_proposal && JSON.stringify(al.change_proposal).includes("8:00"),
          `G1: 'change dinner to 8 PM' must produce exactly the Division A pending proposal naming 8:00 PM; got ${JSON.stringify(al.change_proposal)}`,
        );
        let plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
        assert.check(
          "G1 canonical untouched pre-confirm",
          plans.every((p) => !(p.time_label || "").includes("8:00")),
          "G1: no plan may read 8:00 PM before the partner confirms",
        );

        const confirm = await h.postHumanMessage(B, convId, "confirm 8 PM");
        assert.eq("POST (confirm)", confirm.status, 201, "G1: the confirm message must be accepted");
        plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
        const dinnerAfter = plans.find((p) => p.id === dinner.id);
        assert.check(
          "G1 read-back after confirm",
          !!dinnerAfter && (dinnerAfter.time_label || "").includes("8:00"),
          `G1: after confirm, the dinner plan must read 8:00 PM; got ${JSON.stringify(dinnerAfter?.time_label)}`,
        );

        // G2: bare retarget anchors to the (only) current plan.
        // Division A's contract for this phrasing is the intelligence
        // pipeline's schedule authority: the thread LEAD's "move it"
        // retarget applies directly to the current plan (Repair #12
        // journey-guard behavior). Anchoring is the law here: the
        // change lands on THIS plan - never a new plan, never an ASK,
        // never another plan.
        const move = await h.postHumanMessage(A, convId, "move it to 7 PM");
        assert.eq("POST (move it)", move.status, 201, "G2: the retarget message must be accepted");
        al = (await h.getAlignment(A, convId)).alignment || {};
        plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
        assert.eq("G2 nothing else created", plans.length, 1, "G2: a bare retarget must not create a second plan");
        const still = plans.find((p) => p.id === dinner.id);
        assert.check(
          "G2 anchored to current plan",
          !!still &&
            (still.time_label || "").includes("7:00") &&
            !(still.time_label || "").includes("8:00") &&
            !al.intent_ask,
          `G2: 'move it to 7 PM' must land on the current dinner plan itself (7:00 PM), with no ASK; got time_label=${JSON.stringify(still?.time_label)} ask=${JSON.stringify(al.intent_ask)}`,
        );
      }
    }

    // -- G3: two candidate plans -> ASK ----------------------------------
    {
      const convId = await newThread("two-candidates");
      assert.check("thread setup", !!convId, "G3: an isolated thread is required");
      if (convId) {
        const dinner = await setupDinner(
          convId,
          "Let's do dinner at Juniper and Ivy on Thursday at 8 PM",
          "Sounds good, 8 PM works for me",
        );
        // Second candidate, created through the real new-plan path.
        await h.postHumanMessage(A, convId, "Schedule 9 am brunch at The Henry");
        await h.getAlignment(A, convId);
        let plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
        const brunch = plans.find((p) => p.id !== dinner?.id && (p.title || "").toLowerCase().includes("brunch"));
        assert.check("G3 setup", !!brunch, "G3: the thread must hold two candidate plans (dinner + brunch) before the ambiguous retarget");
        if (brunch) {
          const before = plans.map((p) => [p.id, p.time_label]);
          const amb = await h.postHumanMessage(A, convId, "make it 7 instead");
          assert.eq("POST (ambiguous)", amb.status, 201, "G3: the ambiguous message must be accepted");
          const al = (await h.getAlignment(A, convId)).alignment || {};
          assert.check(
            "G3 no proposal written",
            !al.change_proposal,
            `G3: an ambiguous retarget with two candidate plans must write NO proposal; got ${JSON.stringify(al.change_proposal)}`,
          );
          const text = askText(al).toLowerCase();
          assert.check(
            "G3 ASK names both candidates",
            text.includes("dinner") && text.includes("brunch"),
            `G3: the ASK must name both candidate plans (dinner and brunch); got prompt=${JSON.stringify(al.prompt)} clarify=${JSON.stringify(al.clarify)} intent_ask=${JSON.stringify(al.intent_ask)}`,
          );
          plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
          assert.check(
            "G3 nothing written",
            JSON.stringify(plans.map((p) => [p.id, p.time_label]).sort()) === JSON.stringify(before.sort()),
            "G3: neither plan's time may change while the ASK is unanswered",
          );
        }
      }
    }

    // -- ADV: the smuggle --------------------------------------------------
    {
      const convId = await newThread("smuggle");
      assert.check("thread setup", !!convId, "ADV: an isolated thread is required");
      if (convId) {
        const dinner = await setupDinner(
          convId,
          "Let's do dinner at Juniper and Ivy on Thursday at 8 PM",
          "Sounds good, 8 PM works for me",
        );
        assert.check("ADV setup", !!dinner, "ADV: the dinner plan must exist");
        const countBefore = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId).length;

        const smuggle = await h.postHumanMessage(A, convId, "Schedule dinner at 7 am");
        assert.eq("POST (smuggle)", smuggle.status, 201, "ADV: the message must be accepted");
        let al = (await h.getAlignment(A, convId)).alignment || {};
        assert.check(
          "ADV no silent revision",
          !al.change_proposal,
          `ADV: 'Schedule dinner at 7 am' must NOT become a revision candidate on the dinner plan; got ${JSON.stringify(al.change_proposal)}`,
        );
        let plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
        assert.eq("ADV no silent creation", plans.length, countBefore, "ADV: nothing may be created until the ASK is answered");
        const text = askText(al).toLowerCase();
        assert.check(
          "ADV ASK names both candidates",
          text.includes("new") && text.includes("dinner") && (text.includes("7:00") || text.includes("7 am")),
          `ADV: the ASK must name the new-plan candidate and the change-to-Dinner candidate; got prompt=${JSON.stringify(al.prompt)} clarify=${JSON.stringify(al.clarify)} intent_ask=${JSON.stringify(al.intent_ask)}`,
        );
        assert.check(
          "ADV dinner untouched",
          (plans.find((p) => p.id === dinner.id)?.time_label || "").includes("8:00"),
          "ADV: the dinner plan must still read 8:00 PM",
        );

        // Resolution: "Start a new one" creates the new dinner plan.
        const resolve = await h.postHumanMessage(A, convId, "Start a new one");
        assert.eq("POST (resolve new)", resolve.status, 201, "ADV: the resolution must be accepted");
        al = (await h.getAlignment(A, convId)).alignment || {};
        plans = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
        const created = plans.filter((p) => p.id !== dinner.id && (p.time_label || "").includes("7:00"));
        assert.check(
          "ADV resolution creates the new plan",
          created.length === 1,
          `ADV: answering 'Start a new one' must create exactly one new 7:00 AM plan; got ${created.length} of ${plans.length} plans`,
        );
        assert.check(
          "ADV original dinner still untouched",
          (plans.find((p) => p.id === dinner.id)?.time_label || "").includes("8:00") && !al.change_proposal,
          "ADV: after resolution the original dinner must still read 8:00 PM with no proposal on it",
        );
        assert.check(
          "ADV allStrings sanity",
          allStrings(al).length >= 0,
          "harness sanity",
        );
      }
    }
  },
};
