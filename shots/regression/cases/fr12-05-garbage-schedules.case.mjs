/**
 * FR-12-05 - Garbage or invented schedules persisted: labels with no
 * time signal stored verbatim; "Saturday after 10" invented PM;
 * parse defaults invented (F12-54, F12-49, F13-06).
 *
 * Genesis: Repairs #12/#13 adversarial batteries.
 *
 * Guards:
 *  - Meridiem-less change requests ("Saturday after 10", "around 8",
 *    "make it 8") against a live plan: the plan's stored time NEVER
 *    gains an invented meridiem - no "10:00 PM", no "8:00 PM" appears
 *    as the plan's current time unless the user stated PM.
 *  - Garbage change requests (emoji-only, content-free tokens,
 *    SQL-ish text) mutate nothing: plan title/time/status identical
 *    after each, no 500s.
 *  - Explicit-meridiem control: "change dinner to 7 PM" DOES apply/
 *    propose 7:00 PM - the refusal path must not swallow real times.
 *  - A direct create whose time_label carries no time signal must
 *    not read back with an invented clock time attached.
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
  id: "FR-12-05",
  title: "Garbage or invented schedules persisted; 'Saturday after 10' invented PM",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["Center", "human thread", "plan cards", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");
    const find = (list, id) => list.plans.find((p) => p.id === id);

    const convId = await ownThread(ctx, ctx.marker("garbage schedules"));
    const created = await h.createConversationPlan(A, convId, {
      title: `Garbage ${ctx.tag}`,
      option_label: "Dinner",
      place: "Dinner",
      time_label: "Thursday 6:30 PM",
    });
    assert.eq("POST /conversations/:id/plans", created.status, 201, "setup plan must be created");
    const planId = created.plan?.id;
    const snap = async () => {
      const plans = await h.listPlans(A, true);
      const e = find(plans, planId);
      return e ? `${e.title}|${e.time_label}|${e.status}` : "missing";
    };
    const baseline = await snap();
    assert.check("setup", baseline.includes("6:30"), `baseline must read 6:30 PM; got ${baseline}`);

    // -- Meridiem-less battery: no invented PM may become current ----------
    const meridiemLess = [
      { body: "move dinner to Saturday after 10", invented: "10:00 PM" },
      { body: "around 8 works", invented: "8:00 PM" },
      { body: "make it 8", invented: "8:00 PM" },
    ];
    for (const { body, invented } of meridiemLess) {
      const sent = await h.postHumanMessage(B, convId, body);
      assert.check(
        "POST /conversations/:id/messages",
        sent.status === 201 || sent.status === 200 || sent.status === 429,
        `"${body}": must be answered or honestly throttled, never 500 (got ${sent.status})`,
      );
      if (sent.status === 429) continue;
      // Settle any pending the utterance created so the next leg is clean,
      // but only via keep (never confirm an invented time into the plan).
      await A.post(`/conversations/${encodeURIComponent(convId)}/alignment/change/keep`, {}).catch(() => {});
      const now = await snap();
      const entry = find(await h.listPlans(A, true), planId);
      assert.check(
        "GET /opal/plans (no invented meridiem)",
        !(entry?.time_label || "").includes(invented),
        `"${body}": the plan must not read ${invented} - no meridiem was stated; got time=${entry?.time_label} (snapshot ${now})`,
      );
    }

    // -- Garbage battery: nothing mutates, nothing 500s ----------------------
    const garbage = ["🍕🍕🍕", "asdf qwer zxcv", "'; DROP TABLE plans; --", "   "];
    for (const body of garbage) {
      if (body.trim() === "") continue;
      const sent = await h.postHumanMessage(B, convId, body);
      assert.check(
        "POST /conversations/:id/messages (garbage)",
        sent.status < 500,
        `"${body.slice(0, 20)}": garbage input must never produce a 500 (got ${sent.status})`,
      );
    }
    assert.eq(
      "GET /opal/plans (garbage mutates nothing)",
      await snap(),
      baseline,
      "garbage utterances must leave the plan byte-identical",
    );

    // -- Explicit-meridiem control: a real time DOES move --------------------
    const ctrl = await h.postHumanMessage(B, convId, "change dinner to 7 PM");
    assert.check(
      "POST /conversations/:id/messages (control)",
      ctrl.status === 201 || ctrl.status === 200,
      `the explicit-time control send must be accepted (got ${ctrl.status})`,
    );
    const al = await h.getAlignment(A, convId);
    const plans = await h.listPlans(A, true);
    const entry = find(plans, planId);
    const proposedOrApplied =
      (entry && (entry.time_label || "").includes("7:00")) ||
      allStrings(al.alignment || {}).some((s) => s.includes("7:00"));
    assert.check(
      "GET /conversations/:id/alignment (explicit time honored)",
      proposedOrApplied,
      "an explicit '7 PM' must propose or apply 7:00 PM - the honesty path must not swallow real times",
    );

    // -- Create with a signal-free label invents no clock ---------------------
    const weird = await h.createCenterPlan(A, {
      title: `NoSignal ${ctx.tag}`,
      location: "Somewhere",
      time_label: "whenever works",
    });
    if (weird.status === 201 && weird.plan) {
      assert.check(
        "POST /opal/plans (signal-free label)",
        !/\d{1,2}:\d{2}\s?(AM|PM)/i.test(weird.plan.time_label || ""),
        `a signal-free label must not gain an invented clock time; got time_label=${JSON.stringify(weird.plan.time_label)}`,
      );
    } else {
      assert.note(`signal-free create answered ${weird.status} (an honest refusal is lawful)`);
    }
  },
};
