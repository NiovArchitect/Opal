/**
 * FR-16-03 (automatable part) - PermissionBootstrap forced all three
 * permission decisions before any payoff (F16-08). Gating is a web
 * leg (staging stack, noted); the persistence contract asserted
 * here: preference reads start honest (nothing pre-granted), and a
 * preference the user never set is never reported as granted.
 * The real OS prompt result stays device behavior (class A+P).
 */
export default {
  id: "FR-16-03",
  title: "PermissionBootstrap forced all three permission decisions before any payoff",
  theme: "Onboarding, OTP, permissions",
  class: "A+P",
  surfaces: ["GET /preferences/assist", "GET /preferences/messaging"],
  async run(ctx) {
    const { assert } = ctx;
    assert.note("Continue-gating leg plugs into this file on the staging web stack; OS prompt result stays on the phone checklist");
    const fresh = await ctx.freshClient("+12025550107", "Regression Perms");
    const client = fresh || ctx.A;
    const assist = await client.get("/preferences/assist");
    assert.eq("GET /preferences/assist", assist.status, 200, "assist preference must load for a fresh account");
    const blob = JSON.stringify(assist.json);
    assert.check("GET /preferences/assist (no pre-grant)", !/"granted"\s*:\s*true/.test(blob),
      `a fresh account must never read back a permission as granted by default; got: ${blob.slice(0, 200)}`);
  },
};
