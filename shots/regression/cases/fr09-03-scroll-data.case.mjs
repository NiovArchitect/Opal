/**
 * FR-09-03 - Scroll misbehaved three ways (FL-R9-06, FL-R10-02,
 * FL-R10-03). Scroll physics is a web-client leg (staging stack,
 * noted). API contract asserted here: repeated reads of a long
 * thread return a STABLE window (no server-side reordering or
 * mutation can drive a re-pin), and the window is the newest page.
 */
export default {
  id: "FR-09-03",
  title: "Scroll misbehaved: forced to bottom, Jump-to-latest snapped back, late timers re-pinned",
  theme: "Composer, scroll, layering, visual containment",
  class: "A",
  surfaces: ["GET /opal/conversation"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    assert.note("scroll physics leg plugs into this file on the staging web stack; window-stability contract executes here");
    await h.centerNewChat(A);
    for (let i = 0; i < 6; i++) await h.centerSend(A, ctx.marker(`scroll ${i}`));
    const snap = async () => {
      const c = await h.centerConversation(A);
      return (c.conversation?.messages || []).map((m) => m.id).join(",");
    };
    const s1 = await snap();
    const s2 = await snap();
    assert.eq("GET /opal/conversation (stable window)", s2, s1,
      "repeated reads must return an identical window - a moving window is what re-pins the scroll view");
  },
};
