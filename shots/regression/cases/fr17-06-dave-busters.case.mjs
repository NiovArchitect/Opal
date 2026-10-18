/**
 * FR-17-06 - "Dave & Busters near me" was blocked because the name
 * was not perfect and no locality was given (F17-11). Contract: an
 * exact-entity search starts with the requested name (misspellings
 * and punctuation variants included); the location gate never asks
 * the category question; copy is honest when distance ranking is
 * impossible.
 */
export default {
  id: "FR-17-06",
  title: "\"Dave & Busters near me\" was blocked because the name was not perfect",
  theme: "Venue search and provider honesty",
  class: "A",
  surfaces: ["Center"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const variants = ["Let's do Dave & Busters near me", "Dave and Busters near me", "dave & buster's near me"];
    for (const v of variants) {
      await h.centerNewChat(A);
      const r = await h.centerSend(A, v);
      const body = r.opal?.body || "";
      assert.check(`Center reply (${v})`, !/food, outdoors, or nightlife|what kind of (food|place|thing)/i.test(body),
        `an exact-entity request must never be gated by the category question; got: ${body.slice(0, 200)}`);
      assert.check(`Center reply (${v})`, /dave|buster/i.test(body) || /location|near you|where/i.test(body),
        `the reply must engage the requested entity (or honestly ask for location), never block on name perfection; got: ${body.slice(0, 200)}`);
    }
  },
};
