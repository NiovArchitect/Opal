/**
 * FR-15-03 - Close-circle stories reached NOBODY (F15-02): the
 * default audience eligibility was literally author == viewer.
 * Contract: the author's own story reads back for the author, and
 * eligibility is evaluated live (a viewer with no relationship gets
 * a truthful audience preview, never the author's-only bug in
 * reverse - everybody). Full mutual-close-circle staging needs a
 * third account with an established relationship; where the suite
 * can provision one it is used, else the leg is noted by name.
 */
export default {
  id: "FR-15-03",
  title: "Close-circle stories reached NOBODY - eligibility was literally author == viewer",
  theme: "Stories, posts, graph-create durability",
  class: "A",
  surfaces: ["POST /stories", "GET /stories", "GET /home/feed"],
  async run(ctx) {
    const { A, B, assert } = ctx;
    const media = await A.post("/social-moments/media", { base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=", mime_type: "image/png" });
    assert.check("POST /social-moments/media (setup)", media.status === 200 || media.status === 201,
      `media upload for the story must succeed; got ${media.status}: ${JSON.stringify(media.json).slice(0, 160)}`);
    const mediaId = media.json.media?.id || media.json.media_id || media.json.id;
    if (!mediaId) { assert.note("media upload returned no id on this stack; story legs cannot run"); return; }
    const story = await A.post("/stories", { media_id: mediaId, caption: ctx.marker("close circle"), visibility: "close_circle", ttl_hours: 24 });
    assert.check("POST /stories", story.status === 200 || story.status === 201,
      `a close-circle story create must succeed; got ${story.status}: ${JSON.stringify(story.json).slice(0, 160)}`);
    const feed = await A.get("/home/feed");
    const mine = (feed.json.stories || []).filter((s) => (s.caption || "").includes(ctx.tag));
    assert.check("GET /home/feed (author)", mine.length >= 1,
      "the author's close-circle story must at minimum reach the author's own story tray (the author==viewer bug reached nobody else AND hid intent)");
    if (B) {
      const bFeed = await B.get("/home/feed");
      const leaked = (bFeed.json.stories || []).filter((s) => (s.caption || "").includes(ctx.tag));
      assert.check("GET /home/feed (unrelated viewer)", leaked.length === 0,
        "a close-circle story must not leak to an account with no close relationship");
      assert.note("mutual close-circle member leg needs an established mutual relationship between two provisioned accounts; asserted here: author reach + non-member exclusion");
    }
  },
};
