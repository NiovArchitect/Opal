/**
 * FR-16-01 - "Skip for now" on phone verification was a dead control
 * (F16-05). The onboarding render leg is web (staging stack, noted).
 * API contract asserted here: NO path constructs an unverified/guest
 * session - activation without a valid challenge + code never
 * returns a bearer token.
 */
export default {
  id: "FR-16-01",
  title: "\"Skip for now\" on phone verification was a dead control for every real user",
  theme: "Onboarding, OTP, permissions",
  class: "A",
  surfaces: ["POST /activation/verify"],
  async run(ctx) {
    const { assert } = ctx;
    assert.note("onboarding render leg (no Skip affordance seed-off; fixture Skip seed-on) plugs into this file on the staging web stack");
    const base = `${ctx.config.apiBase}/api/v1/product`;
    const res = await fetch(`${base}/activation/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id: "00000000-0000-0000-0000-000000000000", code: "000000", phone: "+12025550199", display_name: "Skip Test", include_bearer: true }),
    });
    const json = await res.json().catch(() => ({}));
    assert.check("POST /activation/verify (no valid challenge)", res.status >= 400 && !json.session?.access_token,
      `no unverified/guest session may ever be constructed; got status=${res.status} token=${!!json.session?.access_token}`);
  },
};
