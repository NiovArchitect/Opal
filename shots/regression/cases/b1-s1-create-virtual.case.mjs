/**
 * B1-S1 - Create a virtual plan end to end (design section 5, S1 + S1b).
 *
 * A plan's place is an explicit type. Creating a virtual plan through
 * each real create path (conversation, Center, graph) must persist
 * plan_type "virtual" on the row contract, render location "Online",
 * carry the ONE explicit place projection (kind "virtual"), keep a
 * pasted link verbatim with its provider label, strip a javascript:
 * link to nil, and NEVER run physical machinery for it: no restaurant
 * discovery against the geography "Online", no ride, no directions.
 *
 * Read-back surfaces: create response, GET /opal/plans (Graphs/Center
 * list), GET /journeys/:id (graph detail), GET /conversations list
 * plan_projection (Chats list), GET /conversations/:id/alignment
 * (thread).
 *
 * Expected before B1: FAIL - no "place" object exists in any contract,
 * graph create hard-codes in_person (the live F14-04 drop), and the
 * Center/graph completion drive starts a restaurant search for
 * "Online".
 */
import { extractPlace } from "../lib/place.mjs";
import { allStrings } from "../lib/harness.mjs";

export default {
  id: "B1-S1",
  title: "Create virtual plan end to end: explicit place type, honest join, no physical machinery",
  theme: "virtual-place",
  class: "B",
  surfaces: [
    "POST /conversations/:id/plans",
    "POST /opal/plans",
    "POST /opal/plans/graph-create",
    "GET /opal/plans",
    "GET /journeys/:id",
    "GET /conversations (plan_projection)",
    "GET /conversations/:id/alignment",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("B1-S1 needs a second session (OPAL_TOKEN_B / synthetic B)");

    // Suite citizenship: never leave plans in the shared A<->B
    // walk-pair thread (FR cases adopt its first plan). Work in a
    // fresh group thread instead.
    const third = await h.freshDirectConversation(A, "+12025550105", "Regression Fifth");
    assert.check("setup third member", !!third?.userId, "group setup needs a third synthetic user");
    const group = await h.createGroup(A, [ctx.sessions.b.userId, third.userId], `B1 S1 create ${ctx.tag}`);
    assert.check("POST /conversations/group", !!group.conversationId, "setup needs a group conversation");
    const conversationId = group.conversationId;

    // -- Variant 1 (S1b): conversation create with a pasted Zoom link ---
    const zoom = await h.createConversationPlan(A, conversationId, {
      title: `Video dinner ${ctx.tag}`,
      option_label: "Dinner",
      time_label: "Tuesday 7:00 PM",
      plan_type: "virtual",
      meeting_link: "https://zoom.us/j/5551234",
    });
    assert.eq("POST /conversations/:id/plans (virtual, pasted link)", zoom.status, 201, "virtual conversation create must succeed");
    const zp = zoom.plan || {};
    assert.eq("create response plan_type", zp.plan_type, "virtual", "row contract must carry plan_type virtual");
    assert.eq("create response location", zp.location, "Online", "virtual plan location is Online");
    assert.eq("create response meeting_link", zp.meeting_link, "https://zoom.us/j/5551234", "pasted link stored verbatim, never rewritten");
    const zPlace = extractPlace(zp);
    assert.check("create response place object", !!zPlace, "create response carries no explicit place projection");
    if (zPlace) {
      assert.eq("place.kind", zPlace.kind, "virtual", "place projection kind is virtual");
      assert.eq("place.label", zPlace.label, "Online", "place projection label is Online");
      assert.eq("place.meeting_provider", zPlace.meeting_provider, "zoom", "provider label derives from the link host");
      assert.eq("place.join_available", zPlace.join_available, true, "join is available when a link exists");
      assert.eq("place.directions_available", zPlace.directions_available, false, "a virtual plan never offers directions");
    }

    // Read back the same plan on every surface that shows it.
    if (zp.id) {
      const plans = await h.listPlans(A);
      const entry = plans.plans.find((p) => p.id === zp.id);
      assert.check("GET /opal/plans", !!entry, "virtual plan missing from the plans list");
      if (entry) {
        assert.eq("GET /opal/plans plan_type", entry.plan_type, "virtual", "plans list disagrees on plan_type");
        const lp = extractPlace(entry);
        assert.check("GET /opal/plans place object", !!lp && lp.kind === "virtual" && lp.join_available === true, `plans list place projection wrong: ${JSON.stringify(lp)}`);
        assert.eq("GET /opal/plans meeting_link", entry.meeting_link, "https://zoom.us/j/5551234", "plans list lost the meeting link");
      }
      // The journey surface serves agreed plans. Birth one through
      // the real activate path in a fresh group thread and read the
      // journey back: it must carry the same virtual truth.
      const fresh = await h.freshDirectConversation(A, "+12025550104", "Regression Third");
      assert.check("setup fresh conversation", !!fresh?.conversationId, "journey leg needs a fresh plan-free conversation (synthetic provisioning)");
      const act = await h.activateJourney(A, {
        conversation_id: fresh.conversationId,
        title: `Video dinner journey ${ctx.tag}`,
        plan_type: "virtual",
        meeting_link: "https://zoom.us/j/5551234",
        time_label: "Tuesday 7:00 PM",
      });
      assert.eq("POST /journeys/activate (virtual)", act.status, 200, "virtual journey activation must succeed");
      const journeyPlanId = act.journey?.plan_id;
      assert.check("activate journey plan_id", !!journeyPlanId, "activate must return the journey plan id");
      const journey = journeyPlanId ? await h.getJourney(A, journeyPlanId) : { status: 0, journey: null };
      assert.eq("GET /journeys/:id", journey.status, 200, "journey projection must load for a virtual plan");
      if (journey.status === 200) {
        const j = journey.journey;
        const jp = extractPlace(j);
        assert.check("GET /journeys/:id place object", !!jp && jp.kind === "virtual", `journey place projection wrong: ${JSON.stringify(jp)}`);
        assert.check("GET /journeys/:id leave", j.leave && j.leave.available === false && j.leave.reason === "virtual_no_travel", `virtual journey must not compute leave-by (got ${JSON.stringify(j.leave)})`);
        assert.check("GET /journeys/:id navigation", j.navigation && j.navigation.available === false, `virtual journey must not offer maps navigation (got ${JSON.stringify(j.navigation)})`);
        assert.check("GET /journeys/:id join block", !!j.join && j.join.url === "https://zoom.us/j/5551234", "journey join block must carry the plan's real link");
        const strings = allStrings(j).join(" ");
        assert.check("GET /journeys/:id no maps-to-Online", !/maps\.[a-z.]*\/[^ ]*Online|daddr=Online|destination=Online/.test(strings), "a maps URL to the literal string Online leaked into the journey payload");
      }
      const convs = await h.listConversations(A);
      const row = convs.conversations.find((c) => c.id === conversationId);
      assert.check("GET /conversations row", !!row, "conversation row missing from chats list");
      if (row) {
        const rp = extractPlace(row.plan_projection || row);
        assert.check("GET /conversations plan_projection place", !!rp && rp.kind === "virtual", `chats-list projection place wrong: ${JSON.stringify(rp)}`);
      }
      const al = await h.getAlignment(A, conversationId);
      assert.check("GET /conversations/:id/alignment", !!al.alignment, "thread alignment must load");
    }

    // -- Variant 2 (S1): Center create, no link pasted ------------------
    const center = await h.createCenterPlan(A, {
      title: `Online game night ${ctx.tag}`,
      time_label: "Friday 8:00 PM",
      plan_type: "virtual",
    });
    assert.eq("POST /opal/plans (virtual, no link)", center.status, 201, "virtual Center create must succeed");
    const cp = center.plan || {};
    assert.eq("Center create plan_type", cp.plan_type, "virtual", "Center create dropped plan_type");
    assert.eq("Center create location", cp.location, "Online", "Center virtual plan location is Online");
    assert.check("Center create meeting_link nil", cp.meeting_link == null, "no link was pasted and none may be invented");
    const cPlace = extractPlace(cp);
    assert.check("Center create place object", !!cPlace && cPlace.kind === "virtual" && cPlace.join_available === false, `Center place projection wrong: ${JSON.stringify(cPlace)}`);
    const steps = center.json?.completion?.steps || [];
    const restaurants = steps.find((s) => s.id === "restaurants");
    assert.check("Center completion restaurants step", !!restaurants && restaurants.status === "skipped_virtual", `virtual completion must skip restaurant discovery, got ${JSON.stringify(restaurants)}`);
    assert.check("Center completion no ride/directions", !steps.some((s) => s.id === "ride" || s.id === "directions"), `virtual completion emitted ride/directions steps: ${JSON.stringify(steps.map((s) => s.id))}`);
    const joinStep = steps.find((s) => s.id === "join");
    assert.check("Center completion join step", !!joinStep && joinStep.status === "link_missing", `link-less virtual plan needs an honest join step, got ${JSON.stringify(joinStep)}`);

    // -- Variant 3: graph create with plan_type (the live F14-04 drop) --
    const graph = await h.createGraphPlan(A, {
      title: `Virtual watch party ${ctx.tag}`,
      time_label: "Saturday 6:00 PM",
      plan_type: "virtual",
      meeting_link: "https://meet.google.com/abc-defg-hij",
    });
    assert.eq("POST /opal/plans/graph-create (virtual)", graph.status, 201, "virtual graph create must succeed");
    const gp = graph.plan || {};
    assert.eq("graph create plan_type", gp.plan_type, "virtual", "graph create hard-coded in_person (F14-04 class)");
    assert.eq("graph create location", gp.location, "Online", "graph virtual plan location is Online");
    assert.eq("graph create meeting_link", gp.meeting_link, "https://meet.google.com/abc-defg-hij", "graph create dropped the meeting link");
    const gPlace = extractPlace(gp);
    assert.check("graph create place object", !!gPlace && gPlace.kind === "virtual" && gPlace.meeting_provider === "google_meet", `graph place projection wrong: ${JSON.stringify(gPlace)}`);

    // -- Variant 4 (S1b honesty): a javascript: link is stripped --------
    const bad = await h.createConversationPlan(A, conversationId, {
      title: `Video call ${ctx.tag} bad link`,
      option_label: "Call",
      time_label: "Wednesday 5:00 PM",
      plan_type: "virtual",
      meeting_link: "javascript:alert(1)",
    });
    assert.eq("POST /conversations/:id/plans (javascript link)", bad.status, 201, "create with an unsafe link still creates the plan");
    if (bad.plan) {
      assert.check("javascript link stripped", bad.plan.meeting_link == null, `unsafe link must be stripped to nil, got ${JSON.stringify(bad.plan.meeting_link)}`);
      const bp = extractPlace(bad.plan);
      assert.check("bad-link place join_available false", !!bp && bp.join_available === false, "a stripped link must not read as joinable");
    }
  },
};
