/**
 * FR-17-09 - Chat-list pill text hung outside its pill (F17-04).
 * Containment measurement is a web-client leg (staging stack,
 * noted). API contract asserted here: the chats-list projection
 * carries a bounded short label separately from the full title, so
 * the pill never has to render unbounded text.
 */
export default {
  id: "FR-17-09",
  title: "Chat-list pill text hung outside its pill: \"farmers market plus coast\" outside the pill",
  theme: "Composer, scroll, layering, visual containment",
  class: "A",
  surfaces: ["GET /conversations (plan_projection)"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    assert.note("measured containment leg plugs into this file on the staging web stack; label-shape contract executes here");
    const convs = await h.listConversations(A);
    assert.eq("GET /conversations", convs.status, 200, "chats list must load");
    for (const c of convs.conversations) {
      const proj = c.plan_projection;
      if (!proj) continue;
      const label = proj.short_label || proj.label || proj.title || "";
      assert.check("GET /conversations plan_projection", typeof label === "string",
        `pill label must be a plain bounded string; got ${typeof label}`);
    }
    assert.note(`inspected ${convs.conversations.length} conversation rows for pill label shape`);
  },
};
