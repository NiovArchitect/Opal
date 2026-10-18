/**
 * FR-15-05 - Publish accepted ANY media ids (F15-09, F15-10, F16-03):
 * nonexistent ids, other users' media (bytes then served), empty
 * posts persisted. Contract: all three are rejected, nothing
 * persists, and another account cannot read the media bytes.
 */
export default {
  id: "FR-15-05",
  title: "Publish accepted ANY media ids - nonexistent, other users', empty posts persisted",
  theme: "Stories, posts, graph-create durability",
  class: "A",
  surfaces: ["POST /social-moments", "GET /social-moments", "GET /social-moments/media/:id"],
  async run(ctx) {
    const { A, B, assert } = ctx;
    const count = async () => (await A.get("/social-moments")).json.moments?.length || 0;
    const before = await count();
    const ghost = await A.post("/social-moments", { caption: ctx.marker("ghost media"), media_ids: ["00000000-0000-0000-0000-000000000000"] });
    assert.check("POST /social-moments (nonexistent media)", ghost.status >= 400 && ghost.status < 500,
      `a nonexistent media id must be rejected; got ${ghost.status}`);
    const empty = await A.post("/social-moments", { caption: "", media_ids: [] });
    assert.check("POST /social-moments (empty)", empty.status >= 400 && empty.status < 500,
      `an empty post must be rejected; got ${empty.status}`);
    assert.eq("GET /social-moments (nothing persisted)", await count(), before,
      "rejected publishes must persist nothing");
    if (B) {
      const up = await A.post("/social-moments/media", { base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=", mime_type: "image/png" });
      const mid = up.json.media?.id || up.json.media_id || up.json.id;
      if (mid) {
        const theft = await B.post("/social-moments", { caption: ctx.marker("stolen media"), media_ids: [mid] });
        assert.check("POST /social-moments (other user's media)", theft.status >= 400 && theft.status < 500,
          `publishing another account's media must be rejected; got ${theft.status}`);
        const bytes = await B.get(`/social-moments/media/${encodeURIComponent(mid)}`);
        assert.check("GET media (other account)", bytes.status === 403 || bytes.status === 404 || bytes.status === 401,
          `another account must not be served the media bytes without story authorization; got ${bytes.status}`);
      }
    }
  },
};
