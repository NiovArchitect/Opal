/**
 * FR-15-01 - Story share announced "shared" before the backend
 * answered; "Post" never persisted at all - it wrote to state nobody
 * read (F15-05, F15-08).
 *
 * Genesis: Repair #15 - the Post flow wrote to local/write-only state
 * (the post existed nowhere on the backend), and the story share
 * claimed success optimistically before the server answered.
 *
 * Guards (API level = the persistence the UI claim must rest on):
 *  - A published post reads back from the backend: GET /social-moments
 *    (index), GET /social-moments/:id (show), and the Home feed
 *    projection all contain it.
 *  - A created story reads back in GET /stories for its author.
 *  - Failure honesty: a post referencing a nonexistent media id and
 *    an empty post are refused (>= 400) and persist NOTHING (the
 *    failed content appears on no surface afterwards) - so a UI can
 *    never truthfully announce them as shared.
 *  - A story with a non-numeric ttl is refused honestly, never a 500.
 *
 * Pass expectation on the current tip: PASS (R15/R16 publishing law).
 */
export default {
  id: "FR-15-01",
  title: "Story share announced 'shared' before the backend answered; Post never persisted",
  theme: "No scripted responders, no seed impersonation, no fake success",
  class: "A",
  surfaces: ["Home Post flow", "story composer", "Home feed", "POST /social-moments", "POST /stories"],
  async run(ctx) {
    const { A, assert } = ctx;
    const caption = ctx.marker("post persistence");

    // -- Post: publish, then read back on every surface ------------------
    const pub = await A.post("/social-moments", { caption, visibility: "friends" });
    assert.check(
      "POST /social-moments",
      pub.status === 200 || pub.status === 201,
      `post publish must succeed (got ${pub.status}: ${JSON.stringify(pub.json).slice(0, 160)})`,
    );
    const momentId = pub.json?.moment?.id;
    assert.check("POST /social-moments", !!momentId, "the publish response must carry the persisted moment id");

    const index = await A.get("/social-moments");
    assert.check(
      "GET /social-moments (index read-back)",
      (index.json.moments || []).some((m) => m.id === momentId),
      "a published post must read back in the moments index - write-only state is the defect",
    );
    if (momentId) {
      const show = await A.get(`/social-moments/${encodeURIComponent(momentId)}`);
      assert.check(
        "GET /social-moments/:id (show read-back)",
        show.status === 200 && (show.json.moment?.caption || "") === caption,
        "the post must read back by id with its caption intact",
      );
    }
    const feed = await A.get("/home/feed");
    assert.check(
      "GET /home/feed (Home read-back)",
      JSON.stringify(feed.json || {}).includes(caption),
      "the post must appear in the Home feed projection the founder actually reads",
    );

    // -- Story: create with a legacy data: ref, read back -----------------
    const tinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=";
    const story = await A.post("/stories", {
      media_ref: tinyPng,
      caption: ctx.marker("story persistence"),
      ttl_hours: 24,
      visibility: "friends",
    });
    assert.check(
      "POST /stories",
      story.status === 200 || story.status === 201,
      `story create must succeed (got ${story.status}: ${JSON.stringify(story.json).slice(0, 160)})`,
    );
    const stories = await A.get("/stories");
    assert.check(
      "GET /stories (read-back)",
      (stories.json.stories || []).some((s) => s.id === story.json?.story?.id),
      "a created story must read back in the author's story list",
    );

    // -- Failure honesty: refused writes persist nothing -------------------
    const badMedia = await A.post("/social-moments", {
      caption: ctx.marker("ghost media post"),
      media_ids: ["00000000-0000-4000-8000-0000000000ff"],
      visibility: "friends",
    });
    assert.check(
      "POST /social-moments (nonexistent media)",
      badMedia.status >= 400,
      `a post referencing nonexistent media must be refused, never announced shared (got ${badMedia.status})`,
    );
    const empty = await A.post("/social-moments", { caption: "", media_ids: [], visibility: "friends" });
    assert.check(
      "POST /social-moments (empty post)",
      empty.status >= 400,
      `an empty post must be refused (got ${empty.status})`,
    );
    const indexAfter = await A.get("/social-moments");
    assert.check(
      "GET /social-moments (failed writes persist nothing)",
      !JSON.stringify(indexAfter.json || {}).includes("ghost media post"),
      "a refused post must appear on no surface afterwards",
    );

    const badTtl = await A.post("/stories", { media_ref: tinyPng, ttl_hours: "abc", visibility: "friends" });
    assert.check(
      "POST /stories (string ttl)",
      badTtl.status >= 400 && badTtl.status < 500,
      `a non-numeric ttl must be an honest refusal, never a 500 (got ${badTtl.status})`,
    );
  },
};
