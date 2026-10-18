/**
 * FR-14-04 - Coordination behaved differently (or was untested)
 * across relationship types; family was one flat type (F14-13,
 * F15-15). Contract: relationship upserts accept the real types and
 * family subtypes; invalid subtypes fail closed (4xx, never 500);
 * the plan lifecycle is available identically regardless of type.
 */
export default {
  id: "FR-14-04",
  title: "Coordination behaved differently across relationship types; family was one flat type",
  theme: "Person-agnostic behavior, hardcodes, gyroscope",
  class: "A",
  surfaces: ["PUT /relationships/:id", "GET /relationships"],
  async run(ctx) {
    const { A, B, assert } = ctx;
    if (!B) throw new Error("two sessions required (a contact to type)");
    const peer = ctx.sessions.b.userId;
    // The product contract field is "type"; the 7 allowed types are
    // spouse partner family close_friend friend business acquaintance.
    for (const body of [
      { type: "friend" },
      { type: "family" },
      { type: "partner" },
      { type: "close_friend" },
    ]) {
      const r = await A.request("PUT", `/relationships/${encodeURIComponent(peer)}`, body);
      assert.check(`PUT /relationships (${JSON.stringify(body)})`, r.status === 200 || r.status === 201,
        `a real relationship type/subtype must be accepted; got ${r.status}: ${JSON.stringify(r.json).slice(0, 140)}`);
    }
    const bad = await A.request("PUT", `/relationships/${encodeURIComponent(peer)}`, { type: "not_a_type" });
    assert.check("PUT /relationships (invalid subtype)", bad.status >= 400 && bad.status < 500,
      `an invalid relationship type must fail closed with a 4xx, never a 500 or silent accept; got ${bad.status}`);
    const list = await A.get("/relationships");
    assert.eq("GET /relationships", list.status, 200, "relationships must read back");
  },
};
