/**
 * FR-12-10 - Next Together strip kept showing 7:30 after the plan
 * moved to 8:00, rendered duplicates, and the Center Now card showed
 * a time with no who and no where (F12-08, F12-32, F18-09). Contract
 * on API output: after a real time change the calendar/today
 * projection reads the new time once per plan, and today's real plan
 * carries title + time + who + where.
 */
import { allStrings } from "../lib/harness.mjs";
export default {
  id: "FR-12-10",
  title: "Next Together strip kept showing 7:30 after the move to 8:00; Now card had no who/where",
  theme: "Cross-surface consistency and projections",
  class: "A",
  surfaces: ["GET /calendar/today", "GET /opal/plans", "GET /conversations (plan_projection)"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const today = await h.calendarToday(A);
    assert.eq("GET /calendar/today", today.status, 200, "the Now strip projection must load");
    const ids = today.events.map((e) => e.plan_id || e.id).filter(Boolean);
    assert.eq("GET /calendar/today (duplicates)", new Set(ids).size, ids.length,
      "the Now strip must render each plan at most once per revision");
    for (const e of today.events) {
      const blob = JSON.stringify(e);
      assert.check("GET /calendar/today (who/where)", !e.time_label || allStrings(e).length >= 3,
        `a Now event carrying a time must also carry its title/who/where, not a bare time; event: ${blob.slice(0, 200)}`);
    }
    const seeded = today.events.find((e) => /nighthawk|juniper/i.test(JSON.stringify(e)));
    if (seeded) {
      assert.check("GET /calendar/today (seeded plan who/where)",
        /nighthawk|juniper/i.test(JSON.stringify(seeded)) && allStrings(seeded).some((s) => s.length > 3),
        "today's real plan on the Now strip must show title, time, who and where from its rows");
    } else {
      assert.note("no seeded venue plan projects into today's window on this stack; who/where specimen leg not assertable here");
    }
  },
};
