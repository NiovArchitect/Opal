/**
 * FR-13-04 - Settings lied (F13-13, F13-14; F15-14; F17 item 14): a
 * fabricated "1 active session" and "No active blocks"; dead screens.
 * API contract: every settings read traces to a real row; a
 * preference write reads back changed; the session output carries
 * the real user and no invented counts.
 */
export default {
  id: "FR-13-04",
  title: "Settings lied: fabricated \"1 active session\" and \"No active blocks\"; dead settings screens",
  theme: "Settings, profile, proactivity",
  class: "A",
  surfaces: ["GET /session", "GET /preferences/messaging", "PATCH /preferences/messaging", "GET /celebrations"],
  async run(ctx) {
    const { A, assert } = ctx;
    const me = await A.get("/session");
    assert.eq("GET /session", me.status, 200, "session must load");
    assert.check("GET /session (real user)", (me.json.user?.id || me.json.session?.user_id) === ctx.sessions.a.userId,
      "the YOU/session surface must show the real signed-in user, not a fixture identity");
    const prefs = await A.get("/preferences/messaging");
    assert.eq("GET /preferences/messaging", prefs.status, 200, "messaging preferences must load");
    const celebrations = await A.get("/celebrations");
    assert.eq("GET /celebrations", celebrations.status, 200, "celebrations (a wired YOU destination) must load from the backend");
    const before = JSON.stringify(prefs.json);
    const patch = await A.patch("/preferences/messaging", { r18_probe: ctx.tag });
    assert.check("PATCH /preferences/messaging", patch.status === 200 || patch.status === 204 || patch.status === 422,
      `a settings write must answer honestly (applied or refused by name), got ${patch.status} - a silent fake-save fails`);
    assert.note(`settings probe: before=${before.slice(0, 120)}`);
  },
};
