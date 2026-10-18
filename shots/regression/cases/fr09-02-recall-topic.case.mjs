/**
 * FR-09-02 - Recall answered the wrong topic (FL-R9-08; F14-12):
 * a Maya/birthday question got the sticky Henry venue. Contract:
 * recall is grounded in the asked person/topic from real rows; the
 * sticky venue is not mentioned.
 */
export default {
  id: "FR-09-02",
  title: "Recall answered the wrong topic: a Maya/birthday question got the sticky Henry venue",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    await h.centerSend(A, "Find The Henry in Coronado for Sunday brunch");
    await h.centerSend(A, "Maya wants a small birthday dinner with close friends");
    const r = await h.centerSend(A, "What did Maya want for her birthday?");
    const body = r.opal?.body || "";
    assert.check("Center reply (recall)", !/henry/i.test(body),
      `a Maya/birthday recall must not answer with the sticky Henry venue; got: ${body.slice(0, 220)}`);
    assert.check("Center reply (recall)", /maya|birthday|dinner/i.test(body),
      `the recall answer must be grounded in the Maya/birthday topic; got: ${body.slice(0, 220)}`);
  },
};
