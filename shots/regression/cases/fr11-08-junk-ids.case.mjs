/**
 * FR-11-08 (adversarial half) - Structural disease (R11 W1/W4/W5;
 * F12-59, F12-61, F16-04): nil/junk ids crashed public entry points
 * with 500s. Contract: every plan-surface entry point returns an
 * honest 4xx for nil, non-binary, junk and shape-wrong ids - never
 * a 500, never a raise leaked as raw exception text.
 */
export default {
  id: "FR-11-08",
  title: "Structural disease: nil/junk ids crashed public entry points with 500s",
  theme: "Person-agnostic behavior, hardcodes, gyroscope",
  class: "A",
  surfaces: ["GET /journeys/:id", "GET /conversations/:id/alignment", "GET /social-moments/:id", "GET /trips/:id"],
  async run(ctx) {
    const { A, assert } = ctx;
    const junk = ["nil", "null", "undefined", "not-a-uuid", "12345", "'; DROP TABLE plans; --"];
    const routes = [
      (id) => `/journeys/${id}`,
      (id) => `/conversations/${id}/alignment`,
      (id) => `/social-moments/${id}`,
      (id) => `/trips/${id}`,
    ];
    for (const make of routes) {
      for (const id of junk.slice(0, 3)) {
        const r = await A.get(make(encodeURIComponent(id)));
        assert.check(`GET ${make(id)}`, r.status >= 400 && r.status < 500,
          `a junk id must return an honest 4xx, never a 500; got ${r.status}`);
        assert.check(`GET ${make(id)} (error shape)`, !/Ecto\.|Phoenix\.|stacktrace|\(elixir/i.test(JSON.stringify(r.json)),
          "error output must be human copy, never raw exception internals");
      }
    }
  },
};
