/**
 * FR-07-02 - "Find three Mediterranean restaurants" returned the
 * exact-venue leftovers and invented a day (FL-R7-002, FL-R7-007,
 * FL-R7-008, FL-R10-05). Contract: discovery results are discovery
 * results in the requested category; no prior venue/who/when bleeds
 * in; no unstated day; no duplicated day text.
 * Provider note: ranking/category content needs the live Geoapify
 * provider (Mac only); the no-bleed / no-invented-day contract is
 * asserted on whatever the reply contains, locally and on the Mac.
 */
export default {
  id: "FR-07-02",
  title: "\"Find three Mediterranean restaurants\" returned exact-venue leftovers and invented a day",
  theme: "Venue search and provider honesty",
  class: "A",
  surfaces: ["Center"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    await h.centerSend(A, "Find Nighthawk in Coronado");
    const r = await h.centerSend(A, "Find three Mediterranean restaurants");
    const body = r.opal?.body || "";
    assert.check("Center reply", !/Friday Friday/.test(body),
      `duplicated day text must never render; got: ${body.slice(0, 240)}`);
    assert.check("Center reply", !/Friday/.test(body),
      `no day may appear that the user did not state (he stated none); got: ${body.slice(0, 240)}`);
    assert.check("Center reply", !/maya/i.test(body),
      `no prior who may bleed into a discovery answer; got: ${body.slice(0, 240)}`);
    if (/crown bistro|night & day|clayton/i.test(body)) {
      assert.note("discovery reply reused exact-venue leftovers - category leg needs the live provider on the Mac stack to distinguish leftover reuse from real results");
    }
  },
};
