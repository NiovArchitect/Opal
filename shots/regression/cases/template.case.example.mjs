/**
 * Template for Division B and C cases (and every future FR case).
 *
 * To add a case:
 *   1. Copy this file to cases/<case-id-lowercase>-<slug>.case.mjs
 *      (the runner discovers *.case.mjs only; this .example file is
 *      never run).
 *   2. Fill in id / title / theme / class / surfaces from the catalog.
 *   3. Write run(ctx) against the API OUTPUT the surfaces render -
 *      shape + values, per the founder contract law. Use ctx.assert
 *      soft assertions so one run names every failing surface.
 *   4. Two-party cases use ctx.A and ctx.B (distinct sessions) and
 *      must throw a harness error when B is missing - never silently
 *      downgrade to a one-party proof.
 *
 * ctx provides: config, sessions, clients { a, b }, A, B, assert,
 * h (endpoint helpers, see lib/harness.mjs), tag (run-unique),
 * marker(label) (run-unique message text), seed (founder seed
 * responses when OPAL_SEED_MODE=1, else null).
 */
export default {
  id: "FR-XX-00",
  title: "Replace with the founder symptom, short",
  theme: "replace-me",
  class: "A",
  surfaces: ["GET /opal/plans"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const plans = await h.listPlans(A);
    assert.eq("GET /opal/plans", plans.status, 200, "plan listing must load");
    // ... case steps and surface-named assertions ...
  },
};
