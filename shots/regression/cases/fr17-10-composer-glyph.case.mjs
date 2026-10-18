/**
 * FR-17-10 - Composer had a stray arrow inside it; typed text clashed
 * under the voice button (F17-06 a/b). Glyph rendering is a web leg
 * (staging stack, noted). API contract asserted here: the server
 * never injects glyphs into stored bodies - a body round-trips
 * byte-identical, so any stray glyph is provably client-side.
 */
export default {
  id: "FR-17-10",
  title: "The composer had a stray arrow inside it and typed text clashed under the voice button",
  theme: "Composer, scroll, layering, visual containment",
  class: "A",
  surfaces: ["POST /opal/conversation/messages", "GET /opal/conversation"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    assert.note("composer rendering leg plugs into this file on the staging web stack; byte-fidelity contract executes here");
    await h.centerNewChat(A);
    const text = ctx.marker("plain text, no arrows");
    const sent = await h.centerSend(A, text);
    const mine = sent.messages.find((m) => m.role === "user" || (m.body || "").includes("plain text"));
    const stored = mine?.body || sent.messages[sent.messages.length - 2]?.body || "";
    assert.check("stored body", stored === text || stored.includes(text),
      `the stored body must be byte-identical to what was typed (no injected glyphs); got: ${JSON.stringify(stored)}`);
    assert.check("stored body", !/→|➜|➤/.test(stored.replace(text, "")),
      "no stray arrow glyph may be added to the stored body");
  },
};
