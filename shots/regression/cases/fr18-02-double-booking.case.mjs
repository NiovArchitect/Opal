/**
 * FR-18-02 - Double-booking never flagged; ambiguous change target
 * picked silently (F18-03).
 *
 * Contract asserted on API output:
 *  - Creating a plan that overlaps an existing plan surfaces a
 *    double-booking flag IN THE CREATE RESPONSE and ON the plan
 *    listing entries (the surfaces the user is looking at), naming or
 *    referencing the conflicting plan - not only a background alert.
 *  - A change request ("change dinner to 8 PM") with more than one
 *    candidate plan mutates NOTHING and asks ONE disambiguating
 *    question.
 *
 * Expected on the R17 tip: FAIL - no overlap check exists on any plan
 * create or revise path (track-revision.md F18-03 audit).
 */
import { findKeys } from "../lib/harness.mjs";

const CONFLICT_KEYS = [
  "conflict",
  "conflicts",
  "double_booking",
  "double_booked",
  "overlap",
  "overlaps",
  "conflict_warning",
  "warnings",
];

export default {
  id: "FR-18-02",
  title: "Double-booking never flagged; change with several candidates picks one silently",
  theme: "double-booking",
  class: "A",
  surfaces: ["Center", "human thread", "Graphs", "calendar", "POST /opal/plans", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const when = "Saturday 7:30 PM";

    const one = await h.createCenterPlan(A, {
      title: `Dinner Alpha ${ctx.tag}`,
      location: "Juniper and Ivy",
      time_label: when,
    });
    assert.eq("POST /opal/plans", one.status, 201, "first plan create must succeed");

    const two = await h.createCenterPlan(A, {
      title: `Dinner Beta ${ctx.tag}`,
      location: "Nighthawk, Coronado",
      time_label: when,
    });
    assert.eq("POST /opal/plans", two.status, 201, "overlapping create must answer, not hard-error");

    // -- Flag on the creating surface (the create response itself) -----
    const createHits = findKeys(two.json, CONFLICT_KEYS).filter(
      (hit) => hit.value !== false && hit.value != null && hit.value !== "",
    );
    assert.check(
      "POST /opal/plans response",
      createHits.length > 0,
      "creating an overlapping plan must surface a double-booking flag in the create response",
    );

    // -- Flag on the listing both plans render from ---------------------
    const listed = await h.listPlans(A);
    for (const [label, created] of [
      ["Alpha", one.plan],
      ["Beta", two.plan],
    ]) {
      if (!created) continue;
      const entry = listed.plans.find((p) => p.id === created.id);
      assert.check(
        "GET /opal/plans",
        !!entry,
        `${label} plan must read back in the owner listing`,
      );
      if (entry) {
        const hits = findKeys(entry, CONFLICT_KEYS).filter(
          (hit) => hit.value !== false && hit.value != null && hit.value !== "",
        );
        assert.check(
          "GET /opal/plans (Graphs surface)",
          hits.length > 0,
          `${label} plan entry must carry the double-booking flag on the listing surface`,
        );
      }
    }

    // -- Disambiguation: change with two candidates mutates nothing ----
    const plansBefore = await h.listPlans(A);
    const snapshot = new Map(
      plansBefore.plans.map((p) => [p.id, `${p.title}|${p.time_label}|${p.status}`]),
    );
    await h.centerNewChat(A);
    const reply = await h.centerSend(A, "change dinner to 8 PM");
    const body = reply.opal?.body || "";
    const asks = /\bwhich\b[^?]*\?|which (one|dinner|plan)|did you mean/i.test(body);
    assert.check(
      "Center reply",
      asks,
      `a change with more than one candidate must ask one disambiguating question; reply was: ${body.slice(0, 160)}`,
    );
    const plansAfter = await h.listPlans(A);
    let mutated = [];
    for (const p of plansAfter.plans) {
      const prev = snapshot.get(p.id);
      if (prev && prev !== `${p.title}|${p.time_label}|${p.status}`) {
        mutated.push(p.id);
      }
    }
    assert.eq(
      "GET /opal/plans (mutation check)",
      mutated.length,
      0,
      "no plan may mutate before the disambiguating question is answered",
    );
  },
};
