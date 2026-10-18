/**
 * FR-14-06 - Every voice/listen/transcribe path CRASHED on a
 * non-macOS host (F14-01): an unguarded launchctl call raised
 * instead of returning "disabled". This suite runs on Linux - the
 * exact failing host class. Contract: voice paths return honest
 * disabled results with zero 500s.
 */
export default {
  id: "FR-14-06",
  title: "Every voice / listen / transcribe path CRASHED on a non-macOS host",
  theme: "Clock, bucketing, misc rendering truth",
  class: "A",
  surfaces: ["GET /voice/listen", "POST /voice/speak"],
  async run(ctx) {
    const { A, assert } = ctx;
    const listen = await A.get("/voice/listen");
    assert.check("GET /voice/listen", listen.status < 500,
      `the listen path on a non-macOS host must return an honest disabled result, never crash; got ${listen.status}`);
    const speak = await A.post("/voice/speak", { text: "regression probe" });
    assert.check("POST /voice/speak", speak.status < 500,
      `the speak path on a non-macOS host must answer honestly (disabled or success), never crash; got ${speak.status}: ${JSON.stringify(speak.json).slice(0, 140)}`);
  },
};
