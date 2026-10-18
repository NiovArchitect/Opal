/**
 * FR-06-02 - Generic Friday dinner inherited Maya; birthday inherited
 * Coronado + Night Hawk (R6 re-walk, FL-R8-01, R5 stale-WHO).
 * Contract: in one continuous Center session, who/venue/when slots of a
 * NEW intent are empty unless the current utterance supplies them.
 */
export default {
  id: "FR-06-02",
  title: "A generic Friday dinner inherited Maya; a birthday inherited Coronado and Night Hawk",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    // Prime sticky context: exact venue + person work first.
    await h.centerSend(A, "Find Nighthawk in Coronado for dinner with Maya");
    const before = await h.listPlans(A);
    const beforeIds = new Set(before.plans.map((p) => p.id));

    // Generic Friday dinner - supplies neither who nor venue.
    const r1 = await h.centerSend(A, "Plan a dinner for Friday night");
    const b1 = r1.opal?.body || "";
    assert.check("Center reply (generic Friday dinner)", !/maya/i.test(b1) || /no (one|who)|who (is|should)|invite/i.test(b1),
      `a generic Friday dinner must not silently inherit Maya; reply: ${b1.slice(0, 200)}`);
    assert.check("Center reply (generic Friday dinner)", !/nighthawk|night hawk/i.test(b1),
      `a generic Friday dinner must not inherit Night Hawk; reply: ${b1.slice(0, 200)}`);

    // Birthday - supplies neither place nor venue.
    const r2 = await h.centerSend(A, "Plan a birthday party for Saturday");
    const b2 = r2.opal?.body || "";
    assert.check("Center reply (birthday)", !/coronado/i.test(b2) || /where|which (city|place)/i.test(b2),
      `a birthday must not inherit Coronado; reply: ${b2.slice(0, 200)}`);
    assert.check("Center reply (birthday)", !/nighthawk|night hawk/i.test(b2),
      `a birthday must not inherit Night Hawk; reply: ${b2.slice(0, 200)}`);

    // Any plan minted by these turns must not carry the stale slots.
    const after = await h.listPlans(A);
    for (const p of after.plans.filter((p) => !beforeIds.has(p.id))) {
      const blob = `${p.title || ""} ${p.location || ""}`;
      assert.check("GET /opal/plans (new plans)", !/nighthawk|night hawk/i.test(blob),
        `a plan created from a generic utterance must not carry Night Hawk; got: ${blob}`);
    }
  },
};
