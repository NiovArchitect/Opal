/**
 * FR-15-04 - Stories broke on real inputs (F15-03, F15-04, F15-06,
 * F15-07, F16-17): string ttl 500, non-positive ttl born-expired,
 * data: media rendered as nothing, captions impossible. Contract:
 * bad ttls are refused honestly with nothing persisted and never a
 * 500; a valid story with caption reads back immediately.
 */
export default {
  id: "FR-15-04",
  title: "Stories broke on real inputs: string ttl 500, born-expired ttl, silent media, no captions",
  theme: "Stories, posts, graph-create durability",
  class: "A",
  surfaces: ["POST /stories", "GET /stories", "GET /home/feed"],
  async run(ctx) {
    const { A, assert } = ctx;
    const media = await A.post("/social-moments/media", { base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=", mime_type: "image/png" });
    const mediaId = media.json.media?.id || media.json.media_id || media.json.id;
    assert.check("setup media", !!mediaId, `media upload must return an id; got ${media.status}`);
    if (!mediaId) return;
    const countStories = async () => (await A.get("/stories")).json.stories?.length ?? (await A.get("/home/feed")).json.stories?.length ?? 0;
    for (const ttl of [0, -1, 73]) {
      const before = await countStories();
      const r = await A.post("/stories", { media_id: mediaId, ttl_hours: ttl, caption: ctx.marker(`bad ttl ${ttl}`) });
      assert.check(`POST /stories (ttl=${ttl})`, r.status >= 400 && r.status < 500,
        `ttl=${ttl} must be refused honestly (4xx), never a 500 and never a born-expired success; got ${r.status}`);
      const after = await countStories();
      assert.eq("GET /stories (nothing persisted)", after, before, `a refused ttl=${ttl} story must persist nothing`);
    }
    const strTtl = await A.post("/stories", { media_id: mediaId, ttl_hours: "24", caption: ctx.marker("string ttl") });
    assert.check("POST /stories (string ttl)", strTtl.status < 500,
      `a string ttl must never crash with a 500; got ${strTtl.status}`);
    const good = await A.post("/stories", { media_id: mediaId, ttl_hours: 24, caption: ctx.marker("captioned") });
    assert.check("POST /stories (valid)", good.status === 200 || good.status === 201,
      `a valid 24h story must persist; got ${good.status}: ${JSON.stringify(good.json).slice(0, 160)}`);
    const feed = await A.get("/home/feed");
    const found = (feed.json.stories || []).find((s) => (s.caption || "").includes("captioned"));
    assert.check("GET /home/feed (caption read-back)", !!found,
      "a created story with a caption must be visible immediately, caption intact, without re-login");
  },
};
