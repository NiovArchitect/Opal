/**
 * B1-S3 - Mixed-surface coherence (design section 5, S3).
 *
 * One virtual plan and one physical plan at the same lifecycle stage,
 * same participants. Every surface must agree on (a) place type,
 * (b) place label, (c) status - the two plans differ ONLY in place
 * affordance (Join vs Directions), never in state. The column and the
 * alignment mirror must agree: the chats-list/thread projection
 * (mirror-fed) and the plans list / journey (column-fed) read the
 * same type for the same plan.
 *
 * Expected before B1: FAIL - no place object exists, and the mirror
 * and the column are written by different hands, so surfaces cannot
 * be shown to agree on one authority.
 */
import { extractPlace } from "../lib/place.mjs";

export default {
  id: "B1-S3",
  title: "Virtual and physical plans at the same stage agree on every surface; only the affordance differs",
  theme: "virtual-place",
  class: "B",
  surfaces: [
    "GET /opal/plans",
    "GET /journeys/:id",
    "GET /conversations (plan_projection)",
    "GET /conversations/:id/alignment",
    "GET /calendar/today (NowStrip)",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("B1-S3 needs a second session (OPAL_TOKEN_B / synthetic B)");

    // Suite citizenship: no plans in the shared A<->B walk-pair
    // thread - a fresh group thread hosts this case's pair.
    const third0 = await h.freshDirectConversation(A, "+12025550105", "Owen Parker");
    assert.check("setup third member", !!third0?.userId, "group setup needs a third synthetic user");
    const mainGroup = await h.createGroup(A, [ctx.sessions.b.userId, third0.userId], `B1 S3 pair ${ctx.tag}`);
    assert.check("setup group conversation", !!mainGroup.conversationId, "setup needs a group conversation");
    const conversationId = mainGroup.conversationId;

    const virt = await h.createConversationPlan(A, conversationId, {
      title: `Coherence virtual ${ctx.tag}`,
      option_label: "Dinner",
      time_label: "Sunday 7:00 PM",
      plan_type: "virtual",
      meeting_link: "https://teams.microsoft.com/l/meetup-join/coherence",
    });
    const phys = await h.createConversationPlan(A, conversationId, {
      title: `Coherence physical ${ctx.tag}`,
      option_label: "Dinner",
      place: "The Henry",
      time_label: "Sunday 7:00 PM",
    });
    assert.eq("virtual setup", virt.status, 201, "virtual plan must create");
    assert.eq("physical setup", phys.status, 201, "physical plan must create");
    if (!virt.plan?.id || !phys.plan?.id) return;

    const plans = await h.listPlans(A);
    const vEntry = plans.plans.find((p) => p.id === virt.plan.id);
    const pEntry = plans.plans.find((p) => p.id === phys.plan.id);
    assert.check("both plans listed", !!vEntry && !!pEntry, "both plans must appear in the plans list");
    if (vEntry && pEntry) {
      assert.eq("same lifecycle status", vEntry.status, pEntry.status, "virtual and physical plans at the same stage must carry the same status (state is place-blind)");
      const vp = extractPlace(vEntry);
      const pp = extractPlace(pEntry);
      assert.check("virtual place object", !!vp && vp.kind === "virtual" && vp.label === "Online" && vp.meeting_provider === "teams", `virtual place wrong: ${JSON.stringify(vp)}`);
      assert.check("physical place object", !!pp && pp.kind === "physical" && pp.directions_available === true && pp.join_available === false, `physical place wrong: ${JSON.stringify(pp)}`);
      assert.check("affordance split only", !!vp && !!pp && vp.join_available !== pp.join_available && vp.directions_available !== pp.directions_available, "the two plans must differ in affordance (join vs directions) and nothing else structural");
    }

    // Journey legs: journeys serve agreed plans, so birth one of
    // each kind through the real activate path in fresh group
    // threads and read them back as the OTHER participant.
    const journeyIds = {};
    const third = await h.freshDirectConversation(A, "+12025550104", "Clara Jensen");
    assert.check("setup third user", !!third?.userId, "journey legs need a third synthetic user for group threads");
    for (const [label, attrs] of [
      ["virtual", { plan_type: "virtual", meeting_link: "https://teams.microsoft.com/l/meetup-join/coherence", time_label: "Sunday 7:00 PM", title: `Coherence virtual journey ${ctx.tag}` }],
      ["physical", { place: "The Henry", time_label: "Sunday 7:00 PM", title: `Coherence physical journey ${ctx.tag}` }],
    ]) {
      const g = await h.createGroup(A, [ctx.sessions.b.userId, third.userId], `B1 S3 ${label} ${ctx.tag}`);
      assert.check(`setup group (${label})`, !!g.conversationId, "journey leg needs a fresh conversation");
      const act = await h.activateJourney(A, { conversation_id: g.conversationId, ...attrs });
      assert.eq(`POST /journeys/activate (${label})`, act.status, 200, "journey activation must succeed");
      journeyIds[label] = act.journey?.plan_id;
      assert.check(`activate plan_id (${label})`, !!journeyIds[label], "activate must return the journey plan id");
    }

    for (const [label, id, kind] of [["virtual", journeyIds.virtual, "virtual"], ["physical", journeyIds.physical, "physical"]]) {
      const journey = await h.getJourney(B, id);
      assert.eq(`journey (${label}) loads for B`, journey.status, 200, "journey must load for the other participant");
      if (journey.status === 200) {
        const jp = extractPlace(journey.journey);
        assert.check(`journey (${label}) place kind`, !!jp && jp.kind === kind, `B's journey disagrees on place kind for the ${label} plan: ${JSON.stringify(jp)}`);
        if (kind === "virtual") {
          assert.check("journey (virtual) no travel", journey.journey.leave?.available === false && journey.journey.navigation?.available === false, "B's virtual journey still carries travel affordances");
        } else {
          assert.check("journey (physical) maps", journey.journey.navigation?.available === true, "B's physical journey lost its maps affordance");
        }
      }
    }

    // Mirror-fed surfaces (chats list + thread) must name the same
    // authority type as the column-fed list above.
    const convs = await h.listConversations(A);
    const row = convs.conversations.find((c) => c.id === conversationId);
    assert.check("chats row present", !!row, "conversation missing from chats list");
    if (row) {
      const rp = extractPlace(row.plan_projection || row);
      assert.check("chats projection place present", !!rp, "chats-list projection carries no explicit place object - it would have to re-derive from the location string");
      if (rp) {
        assert.check("chats projection kind is a real type", rp.kind === "virtual" || rp.kind === "physical", `chats projection kind is not a place type: ${JSON.stringify(rp.kind)}`);
      }
    }
    const al = await h.getAlignment(A, conversationId);
    assert.check("thread alignment loads", !!al.alignment, "thread alignment must load");
    if (al.alignment) {
      const ap = extractPlace(al.alignment);
      assert.check("thread alignment place present", !!ap, "thread alignment carries no explicit place object");
    }
  },
};
