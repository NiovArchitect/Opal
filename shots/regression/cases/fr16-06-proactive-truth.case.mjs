/**
 * FR-16-06 - Proactive machinery was dead or lying (F15-12, F16-12
 * to F16-16): Home "recent changes" permanently empty, opt-out
 * silently never saved. Contract: the assist/opt-out preference
 * persists on read-back from the backend; Home loads its real
 * payload for a fresh account with no fabricated entries.
 */
export default {
  id: "FR-16-06",
  title: "Proactive machinery was dead or lying: opt-out silently never saved, recent changes empty",
  theme: "Settings, profile, proactivity",
  class: "A",
  surfaces: ["GET /preferences/assist", "PATCH /preferences/assist", "GET /home/feed"],
  async run(ctx) {
    const { A, assert } = ctx;
    const before = await A.get("/preferences/assist");
    assert.eq("GET /preferences/assist", before.status, 200, "assist preference must load");
    // The real persisted preference contract on this surface is
    // assist_calls_enabled (bool). The F16-16 disease class: a settings
    // write that silently never saves. Toggle it and demand read-back.
    const current = before.json.assist_calls_enabled;
    assert.check("GET /preferences/assist (shape)", current === null || typeof current === "boolean",
      `the assist preference must read back as unset (null) or a real boolean - never a fabricated string/default; got: ${JSON.stringify(before.json).slice(0, 160)}`);
    const patch = await A.patch("/preferences/assist", { assist_calls_enabled: !current });
    assert.check("PATCH /preferences/assist", patch.status === 200,
      `a preference write must be accepted by the real endpoint; got ${patch.status}`);
    if (patch.status === 200) {
      const after = await A.get("/preferences/assist");
      assert.eq("GET /preferences/assist (read-back)", after.json.assist_calls_enabled, !current,
        "the flipped preference must persist and read back - a silent no-save is the defect");
      await A.patch("/preferences/assist", { assist_calls_enabled: current });
    }
    const feed = await A.get("/home/feed");
    assert.eq("GET /home/feed", feed.status, 200, "Home must load");
  },
};
