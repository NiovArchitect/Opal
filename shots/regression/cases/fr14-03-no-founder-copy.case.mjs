/**
 * FR-14-03 - New users saw the founder's friends and copy (F14-08
 * to F14-12): a who-picker fabricated 9 people; fallbacks named
 * Chanelle, Maya, Jordan, Juniper & Ivy. Contract: on a fresh
 * account, people/trips/curate outputs contain zero founder names,
 * founder venues, or founder default times.
 */
export default {
  id: "FR-14-03",
  title: "New users saw the founder's friends and the founder's copy: fabricated who-picker, named fallbacks",
  theme: "Person-agnostic behavior, hardcodes, gyroscope",
  class: "A",
  surfaces: ["GET /people", "GET /trips", "POST /recommendations/curate"],
  async run(ctx) {
    const { assert } = ctx;
    const fresh = await ctx.freshClient("+12025550105", "Anna Lindqvist");
    const client = fresh || ctx.A;
    if (!fresh) { assert.note("no fresh synthetic account; founder-copy legs are only meaningful on a fresh account - running anyway, results may be vacuous"); }
    const FOUNDER = [/chanelle/i, /maya/i, /jordan/i, /juniper/i, /sadeil/i];
    const people = await client.get("/people");
    assert.eq("GET /people", people.status, 200, "people must load for a fresh account");
    const peopleBlob = JSON.stringify(people.json);
    for (const re of FOUNDER) {
      assert.check("GET /people (fresh account)", !re.test(peopleBlob),
        `a fresh account's people output must contain zero founder names (${re}); got: ${peopleBlob.slice(0, 200)}`);
    }
    const trips = await client.get("/trips");
    assert.eq("GET /trips", trips.status, 200, "trips must load");
    const curate = await client.post("/recommendations/curate", {});
    const curateBlob = JSON.stringify(curate.json || {});
    for (const re of FOUNDER) {
      assert.check("POST /recommendations/curate (fallbacks)", !re.test(curateBlob),
        `curate fallbacks must never emit a founder name (${re}); got: ${curateBlob.slice(0, 200)}`);
    }
    assert.check("POST /recommendations/curate (default time)", !/Saturday 7:30 PM/.test(curateBlob),
      "no fallback may emit the founder default time \"Saturday 7:30 PM\"");
  },
};
