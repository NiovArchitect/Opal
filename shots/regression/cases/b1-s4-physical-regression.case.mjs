/**
 * B1-S4 - Physical plan regression (design section 5, S4).
 *
 * Existing physical plans are unchanged in behavior: creating a
 * physical dinner in conversation, Center and graph (with NO
 * plan_type params on the graph path) births in_person plans with a
 * nil link; the Journey projection still computes leave-by inputs and
 * maps links; PlanCompletion still emits the restaurant/ride/
 * directions machinery for physical plans. The only contract change
 * is additive: the explicit place object rides along.
 *
 * Expected before B1: FAIL on the additive place object only - every
 * physical behavior assertion passes on the pre-B1 tip, which is the
 * point: this case pins the physical floor B1 must not regress.
 * (Journey reads use the activate path: a journey only exists for an
 * agreed/changed plan, on the pre-B1 tip and after alike.)
 */
import { extractPlace } from "../lib/place.mjs";

export default {
  id: "B1-S4",
  title: "Physical plans unchanged: in_person defaults, maps/leave intact, completion machinery intact, plus the additive place object",
  theme: "virtual-place",
  class: "B",
  surfaces: [
    "POST /conversations/:id/plans",
    "POST /opal/plans",
    "POST /opal/plans/graph-create",
    "GET /journeys/:id",
    "GET /opal/plans",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("B1-S4 needs a second session (OPAL_TOKEN_B / synthetic B)");

    // Suite citizenship: no plans in the shared A<->B walk-pair
    // thread - a fresh group thread hosts this case's plan.
    const third0 = await h.freshDirectConversation(A, "+12025550105", "Regression Fifth");
    assert.check("setup third member", !!third0?.userId, "group setup needs a third synthetic user");
    const mainGroup = await h.createGroup(A, [ctx.sessions.b.userId, third0.userId], `B1 S4 physical ${ctx.tag}`);
    assert.check("setup group conversation", !!mainGroup.conversationId, "setup needs a group conversation");
    const conversationId = mainGroup.conversationId;

    const conv = await h.createConversationPlan(A, conversationId, {
      title: `Physical dinner ${ctx.tag}`,
      option_label: "Dinner",
      place: "Juniper and Ivy",
      time_label: "Saturday 7:30 PM",
    });
    assert.eq("conversation physical create", conv.status, 201, "physical conversation create must succeed");
    if (conv.plan) {
      assert.eq("conversation plan_type default", conv.plan.plan_type, "in_person", "physical default changed");
      assert.check("conversation link nil", conv.plan.meeting_link == null, "a physical plan must not carry a live meeting link in its projection");
      assert.check("conversation location kept", typeof conv.plan.location === "string" && conv.plan.location.includes("Juniper"), `physical location was rewritten: ${JSON.stringify(conv.plan.location)}`);
      const p = extractPlace(conv.plan);
      assert.check("conversation place object", !!p && p.kind === "physical" && p.join_available === false && p.directions_available === true, `physical place projection wrong: ${JSON.stringify(p)}`);

      // Journey leg: birth the agreed journey plan for this venue
      // through the real activate path in a fresh group thread.
      const fresh = await h.freshDirectConversation(A, "+12025550108", "Regression Third");
      assert.check("setup fresh conversation", !!fresh?.conversationId, "journey leg needs a fresh plan-free conversation (synthetic provisioning)");
      const act = await h.activateJourney(A, {
        conversation_id: fresh.conversationId,
        title: `Physical dinner journey ${ctx.tag}`,
        place: "Juniper and Ivy",
        time_label: "Saturday 7:30 PM",
      });
      assert.eq("POST /journeys/activate (physical)", act.status, 200, "physical journey activation must succeed");
      const journey = act.journey?.plan_id ? await h.getJourney(A, act.journey.plan_id) : { status: 0, journey: null };
      assert.eq("physical journey loads", journey.status, 200, "physical journey must load");
      if (journey.status === 200) {
        assert.check("physical journey maps", journey.journey.navigation?.available === true && typeof journey.journey.navigation?.primary_url === "string", "physical plan lost its maps links");
        assert.check("physical journey no join block", !journey.journey.join, "a physical plan must not grow a join block");
        assert.check("physical journey leave shape", !!journey.journey.leave && journey.journey.leave.reason !== "virtual_no_travel", "physical leave-by was virtual-gated by mistake");
      }
    }

    const center = await h.createCenterPlan(A, {
      title: `Physical center ${ctx.tag}`,
      location: "Coronado",
      time_label: "Sunday 10:00 AM",
    });
    assert.eq("Center physical create", center.status, 201, "physical Center create must succeed");
    if (center.plan) {
      assert.eq("Center plan_type default", center.plan.plan_type, "in_person", "Center physical default changed");
      const steps = center.json?.completion?.steps || [];
      assert.check("Center physical completion not virtual-skipped", !steps.some((s) => s.status === "skipped_virtual"), `physical completion was virtual-gated: ${JSON.stringify(steps)}`);
      assert.check("Center physical no join step", !steps.some((s) => s.id === "join"), "a physical plan must not gain a join completion step");
    }

    // Graph create with NO plan_type params: byte-shape of the old
    // contract plus the additive place object.
    const graph = await h.createGraphPlan(A, {
      title: `Physical graph ${ctx.tag}`,
      location: "Balboa Park",
      time_label: "Sunday 2:00 PM",
    });
    assert.eq("graph physical create", graph.status, 201, "physical graph create must succeed");
    if (graph.plan) {
      assert.eq("graph plan_type default", graph.plan.plan_type, "in_person", "graph create without plan_type must stay in_person");
      assert.check("graph link nil", graph.plan.meeting_link == null, "graph physical plan carries a link");
      assert.eq("graph location kept", graph.plan.location, "Balboa Park", "graph physical location changed");
      const p = extractPlace(graph.plan);
      assert.check("graph place object", !!p && p.kind === "physical", `graph physical place projection wrong: ${JSON.stringify(p)}`);
    }
  },
};
