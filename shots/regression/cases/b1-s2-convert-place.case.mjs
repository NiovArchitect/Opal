/**
 * B1-S2 - Convert a physical dinner to virtual, and back (design
 * section 5, S2 + S2b - the lockdown day-one scenario).
 *
 * Shared shape: the lead proposes the conversion; NOTHING about the
 * plan's place changes on any surface until the other participant
 * accepts. After accept: same plan id, same people, same time;
 * plan_type virtual everywhere; Journey leave/navigation honestly
 * unavailable with a join block instead; no maps URL to "Online"
 * anywhere. Convert back restores the venue from the suspended-place
 * stash, the stored meeting link stays on the row but disappears from
 * every projection, and no duplicate plan appears.
 *
 * Solo shape: a Center plan converts directly (born-accepted revision).
 *
 * Expected before B1: FAIL - no conversion writer or endpoint exists
 * at all (the design's headline gap).
 */
import { extractPlace } from "../lib/place.mjs";
import { allStrings } from "../lib/harness.mjs";

export default {
  id: "B1-S2",
  title: "Convert physical dinner to virtual (propose, hold, accept) and back, venue restored",
  theme: "virtual-place",
  class: "B",
  surfaces: [
    "POST /journeys/:id/convert-place-type",
    "POST /journeys/:id/revisions/:revision_id/respond",
    "GET /opal/plans",
    "GET /journeys/:id",
    "GET /conversations (plan_projection)",
    "GET /conversations/:id/alignment",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("B1-S2 needs a second session (OPAL_TOKEN_B / synthetic B)");

    // Suite citizenship: the shared A<->B walk-pair thread belongs to
    // the FR cases (FR-18-02-revision adopts its first plan). B1 runs
    // its shared-plan work in a fresh group thread (A + B + a third
    // synthetic member) - which also makes the conversion a genuine
    // multi-approver propose/hold/accept.
    const third = await h.freshDirectConversation(A, "+12025550105", "Regression Fifth");
    assert.check("setup third member", !!third?.userId, "group setup needs a third synthetic user");
    const C = third.client;
    const group = await h.createGroup(A, [ctx.sessions.b.userId, third.userId], `B1 S2 convert ${ctx.tag}`);
    const conversationId = group.conversationId;
    assert.check("setup conversation", !!conversationId, "two-session setup needs a group conversation");

    const created = await h.createConversationPlan(A, conversationId, {
      title: `Convert dinner ${ctx.tag}`,
      option_label: "Dinner",
      place: "Juniper and Ivy",
      time_label: "Thursday 7:30 PM",
    });
    assert.eq("setup physical create", created.status, 201, "physical dinner must create");
    const planId = created.plan?.id;
    assert.check("setup plan id", !!planId, "no plan id from create");
    if (!planId) return;
    assert.eq("setup plan_type", created.plan.plan_type, "in_person", "setup plan starts physical");

    async function readEverywhere(client, label) {
      const plans = await h.listPlans(client);
      const entry = plans.plans.find((p) => p.id === planId) || null;
      const journey = await h.getJourney(client, planId);
      const convs = await h.listConversations(client);
      const row = convs.conversations.find((c) => c.id === conversationId) || null;
      return { entry, journey: journey.journey, row };
    }

    // -- Propose: the plan must NOT move yet ----------------------------
    const propose = await h.convertPlaceType(A, planId, {
      to_plan_type: "virtual",
      meeting_link: "https://zoom.us/j/convert1",
    });
    assert.check("POST convert-place-type (propose)", propose.status === 200 || propose.status === 201, `conversion propose must succeed (got ${propose.status}: ${JSON.stringify(propose.json).slice(0, 200)})`);
    assert.eq("propose applied flag", propose.applied, false, "a shared conversion must wait for the other participant");
    const revisionId = propose.revision?.id;
    assert.check("propose revision", !!revisionId, "propose must return the revision the other party answers");

    const held = await readEverywhere(B, "after propose");
    assert.check("held: B plans list still physical", !!held.entry && held.entry.plan_type === "in_person", `after propose, B's list must still read in_person (got ${held.entry?.plan_type})`);
    assert.check("held: B journey still physical place", !!held.journey && held.journey.place !== "Online", "after propose, B's journey place already flipped");

    // A third party cannot accept someone else's conversion.
    // (B is the required approver; A re-accepting their own proposal
    // must not apply it.)
    if (revisionId) {
      const selfAccept = await h.respondRevision(A, planId, revisionId, "accept");
      assert.check("proposer self-accept refused", selfAccept.status >= 400, `the proposer must not be able to accept their own conversion (got ${selfAccept.status})`);
    }

    // -- Accept: BOTH other participants must accept --------------------
    const acceptB = await h.respondRevision(B, planId, revisionId, "accept");
    assert.check("POST respond (accept B)", acceptB.status === 200 || acceptB.status === 201, `a participant's accept must succeed (got ${acceptB.status}: ${JSON.stringify(acceptB.json).slice(0, 200)})`);
    const stillHeld = await readEverywhere(A, "after B accept only");
    assert.check("held until all approve", !!stillHeld.entry && stillHeld.entry.plan_type === "in_person", "one of two required approvals applied the conversion early");
    const accept = await h.respondRevision(C, planId, revisionId, "accept");
    assert.check("POST respond (accept C)", accept.status === 200 || accept.status === 201, `the final participant's accept must succeed (got ${accept.status}: ${JSON.stringify(accept.json).slice(0, 200)})`);

    for (const [who, client] of [["A", A], ["B", B]]) {
      const after = await readEverywhere(client, `after accept (${who})`);
      assert.check(`${who} plans list virtual`, !!after.entry && after.entry.plan_type === "virtual", `${who}: plans list did not convert (got ${after.entry?.plan_type})`);
      if (after.entry) {
        assert.eq(`${who} plans list location`, after.entry.location, "Online", `${who}: converted plan location must read Online`);
        assert.eq(`${who} plans list time preserved`, after.entry.time_label, created.plan.time_label, `${who}: conversion must preserve the time exactly`);
        const p = extractPlace(after.entry);
        assert.check(`${who} plans list place object`, !!p && p.kind === "virtual" && p.join_available === true, `${who}: place projection wrong after conversion: ${JSON.stringify(p)}`);
      }
      if (after.journey) {
        assert.check(`${who} journey leave virtual`, after.journey.leave && after.journey.leave.available === false && after.journey.leave.reason === "virtual_no_travel", `${who}: journey still computes travel for a virtual plan`);
        assert.check(`${who} journey navigation off`, after.journey.navigation && after.journey.navigation.available === false, `${who}: journey still offers directions to a virtual plan`);
        assert.check(`${who} journey join`, !!after.journey.join && after.journey.join.url === "https://zoom.us/j/convert1", `${who}: journey join block missing the conversion link`);
        const strings = allStrings(after.journey).join(" ");
        assert.check(`${who} journey no maps-to-Online`, !/daddr=Online|destination=Online/.test(strings), `${who}: a maps URL to Online leaked after conversion`);
      }
      if (after.row) {
        const rp = extractPlace(after.row.plan_projection || after.row);
        assert.check(`${who} chats list place`, !!rp && rp.kind === "virtual", `${who}: chats-list projection did not convert: ${JSON.stringify(rp)}`);
      }
    }

    // -- Convert back: venue restored, link dormant ---------------------
    const back = await h.convertPlaceType(A, planId, { to_plan_type: "in_person" });
    assert.check("POST convert back (propose)", (back.status === 200 || back.status === 201) && back.applied === false && !!back.revision?.id, `convert-back propose failed (${back.status})`);
    const backAcceptB = await h.respondRevision(B, planId, back.revision?.id, "accept");
    assert.check("POST respond (convert back accept B)", backAcceptB.status === 200 || backAcceptB.status === 201, `convert-back accept by B failed (${backAcceptB.status})`);
    const backAccept = await h.respondRevision(C, planId, back.revision?.id, "accept");
    assert.check("POST respond (convert back accept C)", backAccept.status === 200 || backAccept.status === 201, `convert-back accept failed (${backAccept.status})`);

    const restored = await readEverywhere(A, "after convert back");
    assert.check("restored physical", !!restored.entry && restored.entry.plan_type === "in_person", `convert-back did not restore in_person (got ${restored.entry?.plan_type})`);
    if (restored.entry) {
      assert.check("restored venue", typeof restored.entry.location === "string" && restored.entry.location.includes("Juniper"), `convert-back must restore the suspended venue, got location=${JSON.stringify(restored.entry.location)}`);
      assert.check("restored link dormant", restored.entry.meeting_link == null, "the stored link must be absent from projections while the plan is physical");
      const p = extractPlace(restored.entry);
      assert.check("restored place object", !!p && p.kind === "physical" && p.directions_available === true, `restored place projection wrong: ${JSON.stringify(p)}`);
    }
    const allPlans = await h.listPlans(A, true);
    const sameTitle = allPlans.plans.filter((p) => p.title === created.plan.title);
    assert.eq("no duplicate plan after round trip", sameTitle.length, 1, "conversion must never mint a second plan");

    // -- Solo shape: Center plan converts directly ----------------------
    const solo = await h.createCenterPlan(A, {
      title: `Solo convert ${ctx.tag}`,
      time_label: "Monday 6:00 PM",
    });
    assert.eq("solo setup create", solo.status, 201, "solo Center plan must create");
    if (solo.plan?.id) {
      const directConvert = await h.convertPlaceType(A, solo.plan.id, { to_plan_type: "virtual" });
      assert.check("solo convert succeeds", directConvert.status === 200 || directConvert.status === 201, `solo conversion failed (${directConvert.status}: ${JSON.stringify(directConvert.json).slice(0, 160)})`);
      assert.eq("solo convert applied immediately", directConvert.applied, true, "a solo plan has nobody to wait for - conversion applies directly");
      assert.eq("solo convert plan_type", directConvert.plan?.plan_type, "virtual", "solo conversion did not flip the returned plan");
      // Double-tap: converting to the current type is an idempotent no-op.
      const again = await h.convertPlaceType(A, solo.plan.id, { to_plan_type: "virtual" });
      assert.check("solo convert idempotent", (again.status === 200 || again.status === 201) && again.plan?.id === solo.plan.id, "repeating the same conversion must be a safe no-op on the same plan");
    }
  },
};
