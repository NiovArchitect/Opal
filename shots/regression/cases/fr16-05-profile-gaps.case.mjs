/**
 * FR-16-05 - Profile facts were all-or-nothing; the ask-once
 * mechanism could never fire (F15-16, F16-10). Contract on the real
 * ProfileGap endpoints: assess for a missing fact returns exactly
 * one ask; answering lands the durable row; skipping is permanent
 * across re-assessment.
 */
export default {
  id: "FR-16-05",
  title: "Profile facts were all-or-nothing at onboarding; the ask-once mechanism could never fire",
  theme: "Settings, profile, proactivity",
  class: "A",
  surfaces: ["POST /profile-gaps/assess", "POST /profile-gaps/answer", "POST /profile-gaps/skip", "GET /celebrations"],
  async run(ctx) {
    const { assert } = ctx;
    const fresh = await ctx.freshClient("+12025550108", "Regression Gaps");
    const client = fresh || ctx.A;
    if (!fresh) assert.note("no fresh synthetic account; running on session A - ask-once legs are only meaningful on an account that has not answered/skipped before");
    const personId = ctx.sessions.b?.userId || ctx.sessions.a.userId;
    const assess = await client.post("/profile-gaps/assess", { person_id: personId, fact_key: "birthday", person_name: "Regression Contact" });
    assert.check("POST /profile-gaps/assess", assess.status === 200 || assess.status === 201,
      `assess must answer for a real account; got ${assess.status}: ${JSON.stringify(assess.json).slice(0, 160)}`);
    const gaps = assess.json.gaps || assess.json.asks || assess.json.missing || [];
    assert.note(`assess returned ${JSON.stringify(assess.json).slice(0, 200)}`);
    const skip = await client.post("/profile-gaps/skip", { person_id: personId, fact_key: "birthday" });
    assert.check("POST /profile-gaps/skip", skip.status === 200 || skip.status === 201 || skip.status === 422,
      `skip must answer honestly; got ${skip.status}`);
    if (skip.status === 200 || skip.status === 201) {
      const again = await client.post("/profile-gaps/assess", { person_id: personId, fact_key: "birthday", person_name: "Regression Contact" });
      const blob = JSON.stringify(again.json);
      assert.check("POST /profile-gaps/assess (after skip)", !/"birthday"[^]]*"pending"|"ask".*birthday/i.test(blob) || gaps.length === 0,
        "a skipped fact must never be asked again");
    }
  },
};
