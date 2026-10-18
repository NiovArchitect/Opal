/**
 * FR-12-06 - Extraction invented people and places (F12-30, F12-40,
 * F12-42, F12-43): Henry/Coronado/"AM" surfaced as people, "Los
 * Angeles" truncated to "Los", case variants ran the search twice.
 * Contract: participant lists contain only real people, locality is
 * the full multi-word name, one request = one plan/job.
 */
export default {
  id: "FR-12-06",
  title: "Extraction invented people and places: Henry, Coronado and \"AM\" as people; \"Los Angeles\" truncated",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center", "GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    const before = await h.listPlans(A);
    const beforeIds = new Set(before.plans.map((p) => p.id));
    await h.centerSend(A, "Plan brunch at The Henry in Coronado on Sunday at 10 AM");
    await h.centerSend(A, "plan brunch at the henry in coronado on sunday at 10 am");
    await h.centerSend(A, "Plan a trip to Los Angeles next weekend");
    const after = await h.listPlans(A);
    const fresh = after.plans.filter((p) => !beforeIds.has(p.id));
    for (const p of fresh) {
      const names = (p.participants || []).map((x) => x.name || x.display_name || "");
      for (const bad of ["Henry", "Coronado", "AM"]) {
        assert.check("GET /opal/plans (participants)", !names.some((n) => n.trim() === bad),
          `"${bad}" must never surface as a participant; participants: ${JSON.stringify(names)}`);
      }
      const blob = `${p.title || ""} ${p.location || ""}`;
      assert.check("GET /opal/plans (locality)", !/\bLos\b(?! Angeles)/.test(blob),
        `multi-word locality must not truncate to "Los"; got: ${blob}`);
    }
    const henryPlans = fresh.filter((p) => /henry/i.test(`${p.title || ""} ${p.location || ""}`));
    assert.check("GET /opal/plans (dedupe)", henryPlans.length <= 1,
      `case variants of one request must create one plan, not ${henryPlans.length}`);
  },
};
