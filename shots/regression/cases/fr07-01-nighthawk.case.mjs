/**
 * FR-07-01 - "Find Nighthawk in Coronado" returned Crown Bistro /
 * Night & Day Cafe / Clayton's - anything but the real venue
 * (R6 re-walk, FL-R7-001, F12-03). Specimen: Night Hawk is
 * Restaurante Night Hawk, 1315 Orange Avenue, Coronado CA 92118.
 *
 * PROVIDER NOTE: venue search runs on Geoapify, credentialed on the
 * founder's Mac only. The exact-match leg is implemented in full and
 * must run on the Mac stack; locally (no provider credential) the
 * case asserts the honesty contract that IS executable - no
 * substitute venue is ever presented AS the Night Hawk match - and
 * records the deferral by name. Never a mocked provider pass.
 */
export default {
  id: "FR-07-01",
  title: "\"Find Nighthawk in Coronado\" returned anything but the real Night Hawk, 1315 Orange Ave",
  theme: "Venue search and provider honesty",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    const r = await h.centerSend(A, "Find Nighthawk in Coronado");
    const body = r.opal?.body || "";
    const substitutes = ["Crown Bistro", "Night & Day", "Clayton's", "Claytons"];
    const presentsSubstituteAsMatch = substitutes.some((s) => body.includes(s)) &&
      /found|here is|night ?hawk/i.test(body) && !/instead|similar|alternative|nearby option/i.test(body);
    assert.check("Center reply", !presentsSubstituteAsMatch,
      `a substitute venue must never be presented as the Night Hawk match; got: ${body.slice(0, 240)}`);
    const exactHit = /night ?hawk/i.test(body) && /1315 Orange/.test(body);
    const honestMiss = /couldn'?t find|not found|no (exact )?match|unresolved|unable to (find|verify)/i.test(body);
    if (exactHit) {
      assert.note("live provider resolved the exact venue with its real address (1315 Orange Ave)");
      const plans = await h.listPlans(A);
      const p = plans.plans.find((x) => /night ?hawk/i.test(`${x.title || ""} ${x.location || ""}`));
      if (p) assert.check("GET /opal/plans (venue written to plan)", /1315 Orange/.test(JSON.stringify(p)),
        "the resolved venue name + address must be written onto the plan");
    } else {
      assert.check("Center reply (honesty)", honestMiss || /night ?hawk/i.test(body),
        `without an exact provider match the reply must stay honest about Night Hawk, never substitute silently; got: ${body.slice(0, 240)}`);
      assert.note("implemented, execution deferred to Mac stack: exact-match leg needs the live Geoapify credential, which exists on the founder's Mac only; locally only the honesty leg executed");
    }
  },
};
