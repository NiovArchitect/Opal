/**
 * FR-12-09 - "Three things near me" without permission must ask
 * honestly; with coords it must actually search (F07 residual,
 * F12-11d, F12-11e). Contract: no coords = honest gate copy, zero
 * fabricated results or distances; with coords = a real search runs.
 * The no-permission leg executes locally; the with-coords search
 * content leg needs the live provider on the Mac stack.
 */
export default {
  id: "FR-12-09",
  title: "\"Three things near me\" without permission must ask honestly; with coords it must actually search",
  theme: "Location",
  class: "A",
  surfaces: ["Center", "POST /opal/location"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const fresh = await ctx.freshClient("+12025550103", "Regression NearMe");
    const client = fresh || A;
    if (!fresh) assert.note("no fresh synthetic account available; running the no-permission leg on session A (valid only if A holds no grant on this stack)");
    await h.centerNewChat(client);
    const r = await h.centerSend(client, "Find three things near me");
    const body = r.opal?.body || "";
    assert.check("Center reply (no permission)", /location|near you|share|turn on|where are you/i.test(body),
      `without location permission the answer must ask honestly; got: ${body.slice(0, 240)}`);
    assert.check("Center reply (no permission)", !/\d+(\.\d+)?\s*(mi|miles|km) away/i.test(body),
      `without coords no distance may be fabricated; got: ${body.slice(0, 240)}`);
    const grant = await h.grantLocation(client, 32.716, -117.161);
    assert.eq("POST /opal/location", grant.status, 200, "grant must be accepted");
    const r2 = await h.centerSend(client, "Find three things near me");
    const b2 = r2.opal?.body || "";
    assert.check("Center reply (with coords)", b2.length > 0 && !/turn on location|share your location to/i.test(b2),
      `with coords granted the search must run instead of re-asking for location; got: ${b2.slice(0, 240)}`);
  },
};
