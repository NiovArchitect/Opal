/**
 * FR-17-03 - Opal asked "food, outdoors, or nightlife?", he typed
 * "Food", and it lost continuity and re-engaged Maya (F17-08).
 * Contract: the answer is consumed by the outstanding question, the
 * flow continues, no re-engagement line fires. Run with all three
 * category answers.
 */
export default {
  id: "FR-17-03",
  title: "Category answer \"Food\" lost continuity and re-engaged Maya",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    for (const answer of ["Food", "Outdoors", "Nightlife"]) {
      await h.centerNewChat(A);
      await h.centerSend(A, "I want to plan something fun for Maya's birthday this weekend");
      const ask = await h.centerSend(A, "What kind of thing should we do for it?");
      const askBody = ask.opal?.body || "";
      assert.note(`category probe (${answer}): outstanding question was: ${askBody.slice(0, 140)}`);
      const r = await h.centerSend(A, answer);
      const body = r.opal?.body || "";
      assert.check(`Center reply (answer=${answer})`, !/you mentioned .* earlier/i.test(body),
        `the category answer "${answer}" must be consumed by the outstanding question, not answered with re-engagement; got: ${body.slice(0, 200)}`);
      assert.check(`Center reply (answer=${answer})`, body.trim().length > 0,
        "the category answer must produce a continuation, not silence");
      if (/food|outdoors|nightlife/i.test(askBody)) {
        assert.check(`Center reply (answer=${answer})`, new RegExp(answer, "i").test(body) || /birthday|plan|idea|option/i.test(body),
          `after a real category question, the "${answer}" answer must continue that flow; got: ${body.slice(0, 200)}`);
      }
    }
  },
};
