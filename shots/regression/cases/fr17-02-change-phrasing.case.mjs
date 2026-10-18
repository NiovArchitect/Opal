/**
 * FR-17-02 - Change-time phrasing failed silently: a verb not
 * immediately followed by the clock matched nothing; "8pm" normalized
 * to "8: PM" (F17-07 sub-defects).
 *
 * Genesis: Repair #17 walk item F17-07.
 *
 * Guards - the paraphrase battery at the real thread path. Each
 * shape, on a fresh plan in its own thread, must end in exactly one
 * of two honest states:
 *   (a) a pending proposal (or an applied change, for the lead) whose
 *       label is the correctly normalized "8:00 PM", or
 *   (b) an explicit no-time-found / clarification signal on the
 *       thread - never a silent no-op.
 * And on NO surface may the mangled label "8: PM" ever appear.
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

const PHRASES = [
  "change the time for dinner at 8pm",
  "let's change dinner to 8 PM",
  "change dinner to 8pm",
  "move dinner to 8 PM",
  "make it 8 PM",
  "can we change the time to 8pm?",
  "move it to 8 PM please",
  "let's do 8 PM instead",
  "change the time at 8pm for dinner",
  "dinner at 8pm works better",
];

export default {
  id: "FR-17-02",
  title: "Change-time phrasing failed silently; '8pm' normalized to '8: PM'",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["human thread", "Center", "GET /conversations/:id/alignment", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required");

    for (let i = 0; i < PHRASES.length; i++) {
      const phrase = PHRASES[i];
      const convId = await ownThread(ctx, ctx.marker(`phrase ${i}`));
      const created = await h.createConversationPlan(A, convId, {
        title: `Phrase${i} ${ctx.tag}`,
        option_label: "Dinner",
        place: "Dinner",
        time_label: "Thursday 7:30 PM",
      });
      assert.eq("POST /conversations/:id/plans", created.status, 201, `"${phrase}": setup plan`);
      const planId = created.plan?.id;

      const sent = await h.postHumanMessage(B, convId, phrase);
      assert.check(
        "POST /conversations/:id/messages",
        sent.status === 201 || sent.status === 200 || sent.status === 429,
        `"${phrase}": send must be accepted or honestly throttled (got ${sent.status})`,
      );
      if (sent.status === 429) {
        assert.note(`"${phrase}": throttled on this account; battery leg degraded`);
        continue;
      }

      const al = await h.getAlignment(A, convId);
      const plans = await h.listPlans(A, true);
      const entry = plans.plans.find((p) => p.id === planId);
      const msgs = await h.getHumanMessages(A, convId);
      const everywhere = {
        alignment: al.alignment || {},
        plan: entry || {},
        signals: msgs.json.signals || [],
        chronology: msgs.json.chronology || [],
      };

      // The mangled label must never appear anywhere.
      assert.check(
        "all surfaces (mangled label)",
        !allStrings(everywhere).some((s) => s.includes("8: PM")),
        `"${phrase}": the mangled label "8: PM" must never be produced`,
      );

      const pending = ["change_proposal", "pending_revision", "pending_change"].filter(
        (k) => al.alignment?.[k] && Object.keys(al.alignment[k]).length > 0,
      );
      const proposed = pending.length >= 1 && allStrings(al.alignment[pending[0]]).some((s) => s.includes("8:00"));
      const applied = !!entry && (entry.time_label || "").includes("8:00");
      const explained =
        allStrings({ signals: msgs.json.signals || [], chronology: msgs.json.chronology || [] }).some((s) =>
          /no time|what time|which time|not sure.*time|clarify/i.test(s),
        ) || pending.length >= 1;
      assert.check(
        "GET /conversations/:id/alignment (phrase outcome)",
        proposed || applied || explained,
        `"${phrase}": must propose/apply a correctly normalized 8:00 PM or honestly say no time was found - a silent no-op is the defect (pending=${pending.join(",") || "none"}, plan time=${entry?.time_label})`,
      );
      if (pending.length >= 1) {
        assert.check(
          "GET /conversations/:id/alignment (normalized label)",
          proposed,
          `"${phrase}": a live pending change must name the normalized "8:00 PM"`,
        );
      }
    }
  },
};
