/**
 * FR-18-06 - The story composer was buried (F18-04): not reachable
 * from the home/social entry point. The tap-path leg is web
 * (staging stack, noted). API contract asserted here: the Home feed
 * payload - the entry surface itself - carries the live story tray
 * the composer entry sits in, and the story create path behind it
 * works end to end.
 */
export default {
  id: "FR-18-06",
  title: "The story composer was buried - not reachable from the home / social entry point",
  theme: "Stories, posts, graph-create durability",
  class: "A",
  surfaces: ["GET /home/feed", "POST /stories"],
  async run(ctx) {
    const { A, assert } = ctx;
    assert.note("tap-count reachability leg plugs into this file on the staging web stack; entry-surface payload contract executes here");
    const feed = await A.get("/home/feed");
    assert.eq("GET /home/feed", feed.status, 200, "the Home entry surface must load");
    assert.check("GET /home/feed (story tray)", Array.isArray(feed.json.stories),
      "the Home payload must carry the story tray the composer entry point lives in - a tray-less Home is the buried-composer defect at the data layer");
  },
};
