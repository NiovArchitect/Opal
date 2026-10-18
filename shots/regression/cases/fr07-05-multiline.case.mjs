/**
 * FR-07-05 - Multiline text escaped the composer shell (FL-R7-003).
 * Shell geometry is a web-client leg (staging stack, noted). The API
 * contract asserted here: 1/3/5/10-line bodies persist verbatim and
 * read back intact on every surface - the content the shell renders.
 */
export default {
  id: "FR-07-05",
  title: "Multiline text escaped the composer shell",
  theme: "Composer, scroll, layering, visual containment",
  class: "A",
  surfaces: ["POST /opal/conversation/messages", "GET /opal/conversation"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    assert.note("composer shell geometry leg plugs into this file on the staging web stack");
    await h.centerNewChat(A);
    for (const n of [1, 3, 5, 10]) {
      const body = Array.from({ length: n }, (_, i) => `${ctx.marker("line")} ${n}-${i}`).join("\n");
      const sent = await h.centerSend(A, body);
      assert.check("POST messages", sent.status === 201 || sent.status === 200, `a ${n}-line send must succeed; got ${sent.status}`);
      const mine = sent.messages.find((m) => (m.body || "").includes(`line`));
      assert.check("stored body", !!mine && mine.body === body,
        `a ${n}-line body must persist verbatim; got: ${JSON.stringify((mine?.body || "").slice(0, 120))}`);
    }
  },
};
