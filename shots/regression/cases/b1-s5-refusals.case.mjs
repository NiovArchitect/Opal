/**
 * B1-S5 - Refusals, honesty and adversarial probes (design section 5,
 * S5 + the adversarial pass).
 *
 * - A plan cannot be both: creating with a physical venue string AND
 *   plan_type virtual yields ONE coherent virtual record on every
 *   surface (location Online, kind virtual) - never a split record
 *   whose title/alignment claim a venue while the row claims Online.
 * - Converting a cancelled plan is refused and writes nothing.
 * - A user with no access to a plan cannot convert it (cross-account
 *   probe with a fresh third account).
 * - Converting to a bogus type is refused.
 * - A virtual plan with no link, read at every surface, shows the
 *   honest Add-link state: join_available false, no fabricated URL
 *   anywhere in any payload, no directions, no leave-by.
 *
 * Expected before B1: FAIL - the conversion endpoint does not exist,
 * and no surface carries the explicit place object these probes read.
 */
import { extractPlace } from "../lib/place.mjs";
import { allStrings, freshSyntheticClient } from "../lib/harness.mjs";

export default {
  id: "B1-S5",
  title: "Refusals and honesty: no split physical+virtual record, terminal/cross-account/bogus conversions refused, no fabricated URL",
  theme: "virtual-place",
  class: "B",
  surfaces: [
    "POST /conversations/:id/plans",
    "POST /journeys/:id/convert-place-type",
    "GET /opal/plans",
    "POST /journeys/activate",
    "GET /journeys/:id",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("B1-S5 needs a second session (OPAL_TOKEN_B / synthetic B)");

    // Suite citizenship: no plans in the shared A<->B walk-pair
    // thread - a fresh group thread hosts this case's probes.
    const third0 = await h.freshDirectConversation(A, "+12025550105", "Regression Fifth");
    assert.check("setup third member", !!third0?.userId, "group setup needs a third synthetic user");
    const mainGroup = await h.createGroup(A, [ctx.sessions.b.userId, third0.userId], `B1 S5 probes ${ctx.tag}`);
    assert.check("setup group conversation", !!mainGroup.conversationId, "setup needs a group conversation");
    const conversationId = mainGroup.conversationId;

    // -- Both-at-once probe: venue string + virtual type ---------------
    const both = await h.createConversationPlan(A, conversationId, {
      title: `Split probe ${ctx.tag}`,
      option_label: "Dinner",
      place: "Juniper and Ivy",
      location: "Juniper and Ivy, San Diego",
      time_label: "Friday 7:00 PM",
      plan_type: "virtual",
      meeting_link: "https://zoom.us/j/splitprobe",
    });
    assert.eq("both-at-once create", both.status, 201, "create must succeed as one coherent record");
    if (both.plan) {
      assert.eq("both-at-once type wins", both.plan.plan_type, "virtual", "the explicit type must win over the venue string");
      assert.eq("both-at-once location", both.plan.location, "Online", "a virtual plan must not keep a physical venue as its location");
      const p = extractPlace(both.plan);
      assert.check("both-at-once place object", !!p && p.kind === "virtual" && p.directions_available === false, `split record: ${JSON.stringify(p)}`);
      // Journey leg: the same both-at-once input through the
      // born-agreed activate path must also resolve to ONE virtual
      // record (type wins over the venue string).
      const fresh1 = await h.freshDirectConversation(A, "+12025550106", "Regression Third");
      assert.check("both-at-once fresh conversation", !!fresh1?.conversationId, "journey leg needs a fresh plan-free conversation (synthetic provisioning)");
      const act1 = await h.activateJourney(A, {
        conversation_id: fresh1.conversationId,
        title: `Split probe journey ${ctx.tag}`,
        place: "Juniper and Ivy",
        plan_type: "virtual",
        meeting_link: "https://zoom.us/j/splitprobe",
        time_label: "Friday 7:00 PM",
      });
      assert.eq("both-at-once activate", act1.status, 200, "activate must succeed");
      if (act1.journey) {
        assert.check("both-at-once activate journey virtual", act1.journey.place_projection?.kind === "virtual" && act1.journey.join?.url === "https://zoom.us/j/splitprobe", `activate split the record: ${JSON.stringify(act1.journey.place_projection)}`);
      }
      const journey = act1.journey?.plan_id ? await h.getJourney(A, act1.journey.plan_id) : { status: 0, journey: null };
      assert.eq("both-at-once journey loads", journey.status, 200, "agreed both-at-once plan must have a journey");
      if (journey.status === 200) {
        assert.check("both-at-once journey no directions to venue", journey.journey.navigation?.available === false, "journey offered directions for a plan whose place is a room");
      }
    }

    // -- Link-less virtual honesty --------------------------------------
    const linkless = await h.createConversationPlan(A, conversationId, {
      title: `Linkless virtual ${ctx.tag}`,
      option_label: "Call",
      time_label: "Friday 9:00 PM",
      plan_type: "virtual",
    });
    assert.eq("linkless create", linkless.status, 201, "link-less virtual create must succeed");
    if (linkless.plan?.id) {
      const plans = await h.listPlans(A);
      const entry = plans.plans.find((p) => p.id === linkless.plan.id);
      const p = entry ? extractPlace(entry) : null;
      assert.check("linkless join_available false", !!p && p.join_available === false && p.meeting_link == null, `link-less plan reads as joinable: ${JSON.stringify(p)}`);
      const fresh2 = await h.freshDirectConversation(A, "+12025550107", "Regression Fourth");
      assert.check("linkless fresh conversation", !!fresh2?.conversationId, "journey leg needs a fresh plan-free conversation (synthetic provisioning)");
      const act2 = await h.activateJourney(A, {
        conversation_id: fresh2.conversationId,
        title: `Linkless virtual journey ${ctx.tag}`,
        plan_type: "virtual",
        time_label: "Friday 9:00 PM",
      });
      assert.eq("linkless activate", act2.status, 200, "activate must succeed");
      const journey = act2.journey?.plan_id ? await h.getJourney(A, act2.journey.plan_id) : { status: 0, journey: null };
      assert.eq("linkless journey loads", journey.status, 200, "agreed link-less plan must have a journey");
      if (journey.status === 200) {
        assert.check("linkless journey join block honest", !!journey.journey.join && journey.journey.join.url == null && journey.journey.join.available === false, `link-less journey join block must be an add-link state, got ${JSON.stringify(journey.journey.join)}`);
        const placeStrings = allStrings({ join: journey.journey.join, place: journey.journey.place_projection }).join(" ");
        assert.check("linkless no fabricated URL", !/https?:\/\//.test(placeStrings), "a URL appeared in the join/place fields of a plan that has no link (fabrication)");
        assert.check("linkless no leave-by", journey.journey.leave?.available === false, "link-less virtual plan still got a leave-by");
      }
    }

    // -- Bogus type conversion refused ----------------------------------
    const solo = await h.createCenterPlan(A, { title: `Refusal target ${ctx.tag}`, time_label: "Monday 7:00 PM" });
    assert.eq("refusal setup", solo.status, 201, "setup plan must create");
    if (solo.plan?.id) {
      const bogus = await h.convertPlaceType(A, solo.plan.id, { to_plan_type: "hologram" });
      assert.check("bogus type refused", bogus.status >= 400, `converting to a bogus type must be refused (got ${bogus.status})`);
      const after = await h.listPlans(A);
      const entry = after.plans.find((p) => p.id === solo.plan.id);
      assert.eq("bogus type wrote nothing", entry?.plan_type, "in_person", "a refused conversion changed the plan");

      // -- Cross-account probe -----------------------------------------
      const stranger = await freshSyntheticClient(ctx.config, "+12025550103", "Regression Stranger");
      if (stranger) {
        const probe = await h.convertPlaceType(stranger, solo.plan.id, { to_plan_type: "virtual" });
        assert.check("cross-account conversion refused", probe.status === 403 || probe.status === 404, `a stranger converted someone else's plan (got ${probe.status})`);
        const after2 = await h.listPlans(A);
        assert.eq("cross-account wrote nothing", after2.plans.find((p) => p.id === solo.plan.id)?.plan_type, "in_person", "the stranger's probe changed the plan");
      } else {
        assert.note("cross-account leg skipped: synthetic provisioning not in use in this run");
      }
    }

    // -- Missing plan conversion refused --------------------------------
    // NOTE: there is no plan-cancel HTTP endpoint in the product today,
    // so the cancelled-plan conversion refusal is proven at the writer
    // level in virtual_place_b1_test.exs; here the HTTP layer
    // must at least refuse a missing plan cleanly (no 500, no write).
    const ghost = await h.convertPlaceType(A, "00000000-0000-4000-8000-000000000000", { to_plan_type: "virtual" });
    assert.check("ghost plan conversion refused honestly", ghost.status === 404 || ghost.status === 422, `converting a missing plan must be a clean refusal, got ${ghost.status}`);
  },
};
