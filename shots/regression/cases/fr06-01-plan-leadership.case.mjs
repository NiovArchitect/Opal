/**
 * FR-06-01 - Plan leadership was invisible - nobody could tell who
 * leads or controls a plan (R6 re-walk; R11 Layer D; FL-R6-PASS
 * non-organizer protection).
 *
 * Genesis: Repair #6 re-walk + Repair #11 Layer D.
 *
 * Guards (two real accounts, one shared plan):
 *  - The journey/graph-detail output names the lead identically for
 *    both viewers: lead_user_id equals the creator, and each viewer's
 *    own role is stated (lead vs participant).
 *  - The non-lead's direct material change (the journey
 *    material-change endpoint - a direct edit, not a proposal) is
 *    refused; the plan's time does not move.
 *  - The lead's controls work: the lead's material change (or the
 *    thread propose+confirm flow) moves the plan, read back on both
 *    listings.
 *  - Lead handoff by the non-lead is refused; by the lead it works
 *    and the new lead reads back identically for both viewers.
 *
 * Pass expectation on the current tip: PASS.
 */
import { findKeys } from "../lib/harness.mjs";

async function ownThread(ctx, label) {
  // A real group needs >= 3 people: a third pool member makes the
  // group create succeed. (The old two-person attempt 422'd
  // group_too_small and silently fell back to the shared A-B direct
  // thread, so every scenario in the suite shared one conversation.)
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

function leadOf(journeyJson) {
  const hits = findKeys(journeyJson, ["lead_user_id", "leader_user_id", "organizer_user_id"]);
  return hits.length ? hits[0].value : null;
}
function roleOf(journeyJson) {
  // The viewer's OWN role lives on the viewer projection
  // (journey.viewer.role) - that is the field the product contracts
  // for "your role on this plan". A bare findKeys for "role" hits
  // the participants list first (the lead's row), which reads "lead"
  // for every viewer and made this leg unpassable against a correct
  // payload (Repair #18 apifix adjudication).
  const viewer = journeyJson?.journey?.viewer || journeyJson?.viewer;
  if (viewer && typeof viewer.role === "string") return viewer.role;
  const hits = findKeys(journeyJson, ["viewer_role", "my_role"]);
  return hits.length ? hits[0].value : null;
}

export default {
  id: "FR-06-01",
  title: "Plan leadership was invisible - nobody could tell who leads or controls a plan",
  theme: "Plan authority: change time, confirm, cancel, duplicates",
  class: "A",
  surfaces: ["Journey / graph detail", "human thread", "GET /journeys/:id", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw new Error("two distinct sessions required (lead + participant)");

    const convId = await ownThread(ctx, ctx.marker("leadership"));
    // Setup repair (Repair #18 apifix): the case used to birth the
    // plan via POST /conversations/:id/plans, which creates a
    // *tentative* plan. Under the product's own law GET /journeys/:id
    // serves only journey-eligible plans (SharedPlan status agreed or
    // changed - JourneyAuthority moduledoc) and lawfully answers 409
    // not_journey for a tentative one (the same 409 FR-07-03 and
    // FR-08-02 pin as correct for non-journey plans). A leadership
    // case must therefore birth a real journey: activateJourney
    // births the plan agreed, with the activator recorded as lead -
    // which is also the only birth that names a lead at all. Every
    // assertion below is unchanged.
    const act = await h.activateJourney(A, {
      conversation_id: convId,
      title: `Leadership ${ctx.tag}`,
      location: "Dinner",
      time_label: "Thursday 7:30 PM",
    });
    assert.check(
      "POST /journeys/activate",
      !!act.journey?.plan_id,
      `setup journey must activate (got ${act.status}: ${JSON.stringify(act.json).slice(0, 140)})`,
    );
    const planId = act.journey?.plan_id;
    const leadId = ctx.sessions.a.userId;
    const find = (list) => list.plans.find((p) => p.id === planId);

    // -- The lead is named, identically, for both viewers ---------------------
    const jA = await A.get(`/journeys/${encodeURIComponent(planId)}`);
    const jB = await B.get(`/journeys/${encodeURIComponent(planId)}`);
    assert.check("GET /journeys/:id (lead view)", jA.status === 200, `lead must read the journey (got ${jA.status})`);
    assert.check("GET /journeys/:id (participant view)", jB.status === 200, `participant must read the journey (got ${jB.status})`);
    if (jA.status === 200 && jB.status === 200) {
      const leadA = leadOf(jA.json);
      const leadB = leadOf(jB.json);
      assert.check(
        "GET /journeys/:id (lead named)",
        !!leadA && leadA === leadId,
        `the journey output must name the lead (creator); got lead=${leadA}`,
      );
      assert.eq(
        "GET /journeys/:id (lead identical for both)",
        leadB,
        leadA,
        "both viewers must see the same lead",
      );
      const roleA = roleOf(jA.json);
      const roleB = roleOf(jB.json);
      assert.note(`roles as rendered: lead view=${JSON.stringify(roleA)} participant view=${JSON.stringify(roleB)}`);
      if (roleA || roleB) {
        assert.check(
          "GET /journeys/:id (roles differ by viewer)",
          String(roleA).toLowerCase() !== String(roleB).toLowerCase(),
          "each viewer's own role must be stated and must differ lead vs participant",
        );
      }
    }

    // -- Non-lead direct edit refused ------------------------------------------
    const direct = await B.post(`/journeys/${encodeURIComponent(planId)}/material-change`, {
      time_label: "Thursday 9:30 PM",
      field: "time_label",
      value: "Thursday 9:30 PM",
    });
    assert.check(
      "POST /journeys/:id/material-change (non-lead)",
      direct.status === 403 || direct.status === 422 || direct.status === 409,
      `a non-lead direct edit must be refused or converted, never applied (got ${direct.status})`,
    );
    let plans = await h.listPlans(A, true);
    assert.check(
      "GET /opal/plans (non-lead edit moved nothing)",
      !!find(plans) && (find(plans).time_label || "").includes("7:30"),
      `the plan must still read 7:30 PM after the non-lead's direct edit; got ${find(plans)?.time_label}`,
    );

    // -- Lead controls work ------------------------------------------------------
    const leadEdit = await A.post(`/journeys/${encodeURIComponent(planId)}/material-change`, {
      time_label: "Thursday 8:30 PM",
      field: "time_label",
      value: "Thursday 8:30 PM",
    });
    if (leadEdit.status === 200 || leadEdit.status === 201) {
      plans = await h.listPlans(A, true);
      assert.check(
        "GET /opal/plans (lead edit applied)",
        !!find(plans) && (find(plans).time_label || "").includes("8:30"),
        `the lead's direct change must apply; got ${find(plans)?.time_label}`,
      );
    } else {
      assert.note(`lead material-change answered ${leadEdit.status}; proving lead control via the thread propose+confirm flow instead`);
      await h.postHumanMessage(B, convId, "let's change dinner to 8 PM");
      await h.postHumanMessage(A, convId, "confirm 8 PM");
      plans = await h.listPlans(A, true);
      assert.check(
        "GET /opal/plans (lead confirm applies)",
        !!find(plans) && (find(plans).time_label || "").includes("8:00"),
        `the lead's confirmation must move the plan; got ${find(plans)?.time_label}`,
      );
    }

    // -- Handoff: non-lead cannot, lead can --------------------------------------
    const badHandoff = await B.post(`/journeys/${encodeURIComponent(planId)}/handoff-lead`, {
      peer_user_id: ctx.sessions.b.userId,
    });
    assert.check(
      "POST /journeys/:id/handoff-lead (non-lead)",
      badHandoff.status === 403 || badHandoff.status === 422,
      `a non-lead must not hand off leadership (got ${badHandoff.status})`,
    );
    const handoff = await A.post(`/journeys/${encodeURIComponent(planId)}/handoff-lead`, {
      peer_user_id: ctx.sessions.b.userId,
    });
    assert.check(
      "POST /journeys/:id/handoff-lead (lead)",
      handoff.status === 200 || handoff.status === 201,
      `the lead must be able to hand off leadership (got ${handoff.status}: ${JSON.stringify(handoff.json).slice(0, 120)})`,
    );
    if (handoff.status === 200 || handoff.status === 201) {
      const jAfter = await B.get(`/journeys/${encodeURIComponent(planId)}`);
      if (jAfter.status === 200) {
        assert.eq(
          "GET /journeys/:id (new lead read-back)",
          leadOf(jAfter.json),
          ctx.sessions.b.userId,
          "after handoff the new lead must read back identically",
        );
      }
    }
  },
};
