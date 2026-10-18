/**
 * FR-17-14 (automatable part) - The Center character read as a
 * static image; presence states could stick forever (F17-15).
 * State derivation is a web-component leg (staging stack, noted);
 * "feels alive" stays a founder visual judgment (class A+P). API
 * contract asserted here: Center turns complete - a send always
 * resolves to a stored reply (never a permanently processing
 * state), which is the signal the presence quartet unwinds on.
 */
export default {
  id: "FR-17-14",
  title: "The Center character read as a static image; presence states could stick forever",
  theme: "Splash, brand, character, TestFlight",
  class: "A+P",
  surfaces: ["POST /opal/conversation/messages", "GET /opal/conversation"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    assert.note("presence-state derivation + feels-alive judgment stay on the staging web stack / phone checklist; turn-completion contract executes here");
    await h.centerNewChat(A);
    const sent = await h.centerSend(A, ctx.marker("presence probe"));
    assert.check("POST messages", (sent.status === 201 || sent.status === 200) && !!sent.opal,
      `every Center turn must resolve to a stored reply - a turn that never resolves is a stuck processing state; got status=${sent.status} opal=${!!sent.opal}`);
    const conv = await h.centerConversation(A);
    const pending = (conv.conversation?.messages || []).filter((m) => m.status === "processing" || m.status === "pending");
    assert.eq("GET /opal/conversation", pending.length, 0,
      "no stored message may sit in a processing/pending state after the turn completes");
  },
};
