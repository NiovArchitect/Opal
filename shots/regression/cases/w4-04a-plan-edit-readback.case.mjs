/**
 * W4-04a - END-TO-END PLAN EDITING: title typo fix read back on every
 * surface, in BOTH parties' sessions (Walk #4, W4-04 "NOTHING EDITABLE").
 *
 * Founder symptom: a plan whose title has a typo can never be corrected -
 * there was NO edit path for a plan's title or core details from any
 * surface. The founder is stuck with wrong names forever.
 *
 * Contract asserted on API output (the surfaces render these outputs):
 *  - PATCH /opal/plans/:id (the plan-detail edit path) corrects the title
 *    and returns the plan payload carrying the corrected title.
 *  - After the edit, EVERY title-bearing surface reads the corrected
 *    title from the same projection source, for the editor (A) AND the
 *    other participant (B):
 *      * plan detail / plans list / Graphs list + graph detail source:
 *        GET /opal/plans entry for the plan
 *      * chats-list projection + thread plan projection:
 *        GET /conversations entry's plan_projection.title
 *      * thread alignment read: GET /conversations/:id/alignment must not
 *        resurrect the typo anywhere in its payload
 *      * home / NowStrip: GET /calendar/today plan event title when the
 *        plan projects into today's window (asserted when present; the
 *        deterministic NowStrip read-back is proven in backend tests)
 *  - The typo title appears NOWHERE in any of those outputs afterwards.
 *
 * 3x varied shapes run in this one case: a typo fix, a full rename, and
 * a person-name correction - three separate plans, three separate edits.
 *
 * Expected before the W4-04 fix: FAIL - PATCH /opal/plans/:id does not
 * exist (404) and the chats-list projection carries no plan title at all.
 */
import { allStrings } from "../lib/harness.mjs";

const SHAPES = [
  {
    label: "typo fix",
    typo: "Diner at Juniper & Ivy",
    fixed: "Dinner at Juniper & Ivy",
    location: "Juniper & Ivy",
    time_label: "Friday 7:30 PM",
  },
  {
    label: "full rename",
    typo: "Saturday plans",
    fixed: "Saturday Crew Hike",
    location: "Torrey Pines",
    time_label: "Saturday 9:00 AM",
  },
  {
    label: "person-name correction",
    typo: "Dinner with Chanell",
    fixed: "Dinner with Chanelle",
    location: "Nighthawk, Coronado",
    time_label: "Sunday 7:00 PM",
  },
];

async function assertSurfaces(ctx, client, who, conversationId, planId, fixed, typo) {
  const { h, assert } = ctx;

  const list = await h.listPlans(client);
  assert.eq(`${who} GET /opal/plans`, list.status, 200, "plan listing must load");
  const entry = list.plans.find((p) => p.id === planId);
  assert.check(
    `${who} plan detail / plans list / Graphs list`,
    !!entry,
    `edited plan ${planId} must appear in the listing`,
  );
  if (entry) {
    assert.eq(
      `${who} plan detail / plans list / Graphs list`,
      entry.title,
      fixed,
      "listing entry must carry the corrected title",
    );
  }

  const convs = await h.listConversations(client);
  assert.eq(`${who} GET /conversations`, convs.status, 200, "chats list must load");
  const conv = convs.conversations.find((c) => c.id === conversationId);
  assert.check(
    `${who} chats-list projection`,
    !!conv,
    "the plan's conversation must appear in the chats list",
  );
  if (conv) {
    assert.eq(
      `${who} chats-list projection (plan_projection.title)`,
      conv.plan_projection?.title,
      fixed,
      "chats-list plan projection must carry the corrected title from the plan row",
    );
    const strings = allStrings(conv);
    assert.check(
      `${who} chats-list projection (typo absent)`,
      !strings.some((s) => s.includes(typo)),
      `the typo title "${typo}" must appear nowhere in the chats-list entry`,
    );
  }

  const alignment = await h.getAlignment(client, conversationId);
  assert.eq(
    `${who} GET /conversations/:id/alignment`,
    alignment.status,
    200,
    "thread alignment must load",
  );
  const alignStrings = allStrings(alignment.json);
  assert.check(
    `${who} thread alignment card (typo absent)`,
    !alignStrings.some((s) => s.includes(typo)),
    `the typo title "${typo}" must appear nowhere in the thread alignment payload`,
  );

  const today = await h.calendarToday(client);
  const event = (today.events || []).find((e) => e.plan_id === planId || e.id === planId);
  if (event) {
    assert.eq(
      `${who} home / NowStrip (GET /calendar/today)`,
      event.title,
      fixed,
      "NowStrip plan event must carry the corrected title",
    );
  } else {
    assert.note(
      `${who} NowStrip: plan ${planId} does not project into today's window on this stack; ` +
        "NowStrip read-back is proven deterministically in backend tests (it reads the plan row title)",
    );
  }
}

export default {
  id: "W4-04a",
  title: "Plan title edit read back on every surface in both parties' sessions (3 varied shapes)",
  theme: "plan-editing",
  class: "A",
  surfaces: [
    "PATCH /opal/plans/:id",
    "GET /opal/plans (plan detail / plans list / Graphs)",
    "GET /conversations (chats-list projection)",
    "GET /conversations/:id/alignment (thread)",
    "GET /calendar/today (home / NowStrip)",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("harness: W4-04a requires two distinct sessions (A and B)");

    for (const shape of SHAPES) {
      const typoTitle = `${shape.typo} ${ctx.tag}`;
      const fixedTitle = `${shape.fixed} ${ctx.tag}`;

      // A and B share a direct conversation; A creates the plan there
      // (A is lead, B is a participant) through the real conversation
      // plan path - the same create the thread UI performs.
      const direct = await h.ensureDirect(A, ctx.sessions.b.userId);
      assert.check(
        "POST /conversations/direct",
        direct.status === 200 || direct.status === 201,
        `direct conversation must open (got ${direct.status})`,
      );
      const conversationId = direct.conversationId;
      if (!conversationId) continue;

      const created = await h.createConversationPlan(A, conversationId, {
        title: typoTitle,
        location: shape.location,
        time_label: shape.time_label,
      });
      assert.eq(
        `POST /conversations/:id/plans (${shape.label})`,
        created.status,
        201,
        "plan with typo title must be created",
      );
      if (!created.plan) continue;
      const planId = created.plan.id;
      assert.eq(
        `created plan title (${shape.label})`,
        created.plan.title,
        typoTitle,
        "created plan carries the typo title (precondition)",
      );

      // The edit itself - from the plan detail path.
      const edited = await A.patch(`/opal/plans/${planId}`, { title: fixedTitle });
      assert.eq(
        `PATCH /opal/plans/:id (${shape.label})`,
        edited.status,
        200,
        "the lead's title edit must succeed",
      );
      assert.eq(
        `PATCH /opal/plans/:id response (${shape.label})`,
        edited.json.plan?.title,
        fixedTitle,
        "the edit response plan payload must carry the corrected title",
      );

      // Read-back on every surface, editor first, then the OTHER party.
      await assertSurfaces(ctx, A, `A (${shape.label})`, conversationId, planId, fixedTitle, typoTitle);
      await assertSurfaces(ctx, B, `B (${shape.label})`, conversationId, planId, fixedTitle, typoTitle);
    }
  },
};
