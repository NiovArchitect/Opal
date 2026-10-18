/**
 * FR-12-08 - "Near me" never worked (F07, FL-R10-06, F12-11 a-f,
 * F12-41, F12-63): coords 422'd or were silently dropped, and a
 * hardcoded travel_minutes: 18 was persisted as if computed.
 * Contract: a coarse grant is accepted and honored per-user; a send
 * carrying location never fails on location; garbage is refused
 * honestly; no travel_minutes exists that was not computed.
 */
export default {
  id: "FR-12-08",
  title: "\"Near me\" never worked: coords dropped, hardcoded travel_minutes: 18 persisted",
  theme: "Location",
  class: "A",
  surfaces: ["Center", "POST /opal/location", "GET /opal/plans"],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    const grant = await h.grantLocation(A, 32.716, -117.161);
    assert.eq("POST /opal/location", grant.status, 200, "a coarse device grant must be accepted, not 422");
    const bad = await A.post("/opal/location", { lat: 999, lng: 999, origin_source: "device" });
    assert.check("POST /opal/location (garbage)", bad.status >= 400 && bad.status < 500,
      `garbage coords must be refused honestly with a 4xx, got ${bad.status} (a 5xx or silent 200 both fail)`);
    const send = await h.centerSend(A, "What is near me right now?");
    assert.check("POST /opal/conversation/messages", send.status === 201 || send.status === 200,
      `a Center send after a location grant must not fail on location; got ${send.status}`);
    const plans = await h.listPlans(A, true);
    for (const p of plans.plans) {
      const tm = p.travel_minutes;
      assert.check("GET /opal/plans (travel_minutes)", tm !== 18 || !!p.origin_source || !!p.distance_km || !!p.distance_miles,
        `travel_minutes: 18 with no computed-distance provenance is the hardcoded defect; plan ${p.id}`);
    }
    if (B) {
      const bSend = await h.centerSend(B, "what city am I currently in?");
      assert.check("Center reply (account isolation)", !/san diego/i.test(bSend.opal?.body || "") || /don'?t|unknown|share your location/i.test(bSend.opal?.body || ""),
        "account A's granted location must never leak into account B's answers");
    }
  },
};
