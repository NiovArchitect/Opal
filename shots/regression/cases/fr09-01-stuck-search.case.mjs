/**
 * FR-09-01 - A stuck search captured the thread (FL-R9-01, FL-R9-04,
 * FL-R9-05, FL-R8-03): person messages triggered venue searches,
 * "cancel the search" was ignored, stale results painted after New
 * Chat. Contract: non-search turns never restart a search, cancel is
 * honored, a new chat never receives stale results.
 */
export default {
  id: "FR-09-01",
  title: "A stuck search captured the thread: cancel ignored, stale results after New Chat",
  theme: "Center routing, sticky context, continuity",
  class: "A",
  surfaces: ["Center"],
  async run(ctx) {
    const { A, h, assert } = ctx;
    await h.centerNewChat(A);
    const search = await h.centerSend(A, "Find Italian restaurants in Coronado");
    const searchBody = search.opal?.body || "";
    assert.note(`search turn reply: ${searchBody.slice(0, 140)}`);

    const greet = await h.centerSend(A, "Hi Chanelle, how is your day going?");
    const gb = greet.opal?.body || "";
    assert.check("Center reply (person message)", !/searching|looking up|finding (restaurants|places|venues)/i.test(gb),
      `a person message must not trigger a venue search; got: ${gb.slice(0, 200)}`);

    const cancel = await h.centerSend(A, "cancel the search");
    const cb = cancel.opal?.body || "";
    assert.check("Center reply (cancel search)", !/searching|still looking|here are .* results/i.test(cb),
      `"cancel the search" must stop the search, not continue it; got: ${cb.slice(0, 200)}`);

    await h.centerNewChat(A);
    const fresh = await h.centerConversation(A);
    const msgs = fresh.conversation?.messages || [];
    assert.check("GET /opal/conversation (new chat)", msgs.length === 0,
      `a new chat must start empty - no stale search results may paint; found ${msgs.length} messages`);
  },
};
