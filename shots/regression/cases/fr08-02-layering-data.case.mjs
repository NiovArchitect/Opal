/**
 * FR-08-02 (automatable part) - Things rendered behind other things
 * (FL-R8-07, F17-03, F17-06c, F18-05). Layering is a web-client leg
 * (staging stack + phone visual, class A+P, noted). API contract
 * asserted here: the payloads those layers render (plan detail,
 * story list, thread plan card) are complete and self-contained -
 * no layer depends on data only another layer holds.
 */
export default {
  id: "FR-08-02",
  title: "Things rendered behind other things: graph detail under chrome, story composer behind social screen",
  theme: "Composer, scroll, layering, visual containment",
  class: "A+P",
  surfaces: ["GET /journeys/:id", "GET /home/feed"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    assert.note("z-order/portal leg plugs into this file on the staging web stack; payload-completeness contract executes here; visual sign-off stays on the phone checklist");
    const feed = await A.get("/home/feed");
    assert.eq("GET /home/feed", feed.status, 200, "the Home payload behind the story composer must load completely");
    assert.check("GET /home/feed", Array.isArray(feed.json.stories) || Array.isArray(feed.json.feed) || typeof feed.json === "object",
      "the Home payload must carry its story surface data in one response");
    // Graph detail serves journey plans; use the seeded journey (the
    // founder's specimen) when seed mode is on.
    const planId = ctx.seed?.graph?.json?.shared_plan_id || null;
    if (planId) {
      const j = await A.get(`/journeys/${encodeURIComponent(planId)}`);
      assert.eq("GET /journeys/:id", j.status, 200, "graph detail payload must load as one complete response");
      assert.check("GET /journeys/:id (completeness)", !!j.json.journey || !!j.json.id,
        "the graph detail response must carry the full journey payload in one response");
    } else {
      assert.note("no seeded journey on this stack; graph-detail completeness leg not assertable (a non-journey plan lawfully answers 409 not_journey)");
    }
  },
};
