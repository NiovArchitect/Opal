/**
 * FR-18-W4-01b (Walk #4, W4-01) - duplicate sends apply state
 * exactly once.
 *
 * The founder pressed send repeatedly on "Schedule 7 am church at
 * Awaken": 5 sends, 4+ identical bubbles, each re-running the turn
 * pipeline. Three server contracts are asserted here (the client
 * in-flight lock + compose-time idempotency key are covered by the
 * web unit tests for the send guard):
 *
 *  1. SAME client_message_id x5: the first delivery creates; every
 *     repeat returns the ORIGINAL message (origin "idempotent",
 *     HTTP 200), the thread stores the message exactly once, and
 *     the turn's state change applies exactly once (exactly one
 *     resulting plan for the sent intent).
 *  2. NO key, identical body x5 in rapid succession: the sends
 *     collapse to one stored message and one application of state
 *     (documented no-key dedupe semantics: same sender +
 *     conversation + identical body inside a short window returns
 *     the original delivery instead of storing a second copy).
 *  3. Cross-account collision probe: a DIFFERENT sender reusing the
 *     first sender's client_message_id in the same conversation
 *     must NOT receive the first sender's message as their own
 *     delivery (409 idempotency_conflict, or their own distinct
 *     stored message) - never a silent cross-account replay.
 *
 * Bodies carry the run tag so counts stay exact on shared accounts.
 */
export default {
  id: "FR-18-W4-01b",
  title:
    "W4-01b: rapid duplicate sends (same key x5, no-key identical x5, cross-account key collision) apply state exactly once",
  theme: "send-intent",
  class: "A",
  surfaces: [
    "POST /conversations/:id/messages",
    "GET /conversations/:id/messages",
    "GET /opal/plans",
    "GET /conversations/:id/alignment",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) {
      throw new Error("two distinct sessions are required (sender + partner)");
    }

    // Isolated thread: fresh group when a third synthetic member is
    // provisionable, else the suite dyad (bodies are run-tagged, so
    // counts stay exact either way).
    let convId = null;
    const C = await ctx.freshClient("+12025550103", "W4-01b third");
    if (C) {
      const g = await h.createGroup(A, [B.session.userId, C.session.userId], "w4-01b dupes");
      convId = g.conversationId;
    }
    if (!convId) {
      convId = (await h.ensureDirect(A, B.session.userId)).conversationId;
    }
    assert.check("thread setup", !!convId, "an isolated thread is required");
    if (!convId) return;

    // A current plan, so the sent intent has state to apply.
    await h.postHumanMessage(A, convId, "Let's do dinner at Juniper and Ivy on Thursday at 8 PM");
    await h.postHumanMessage(B, convId, "Sounds good, 8 PM works for me");
    await h.getAlignment(A, convId);
    const plansBefore = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
    assert.check("setup", plansBefore.length >= 1, "a current dinner plan must exist before the duplicate sends");

    // -- Leg 1: same idempotency key x5 --------------------------------
    const keyedBody = `Schedule 7 am church at Awaken ${ctx.tag}`;
    const key = `w4-01b-${ctx.tag}-keyed`;
    const keyedResults = [];
    for (let i = 0; i < 5; i++) {
      keyedResults.push(await h.postHumanMessage(A, convId, keyedBody, { clientMessageId: key }));
    }
    assert.eq("POST (keyed x5, first)", keyedResults[0].status, 201, "the first keyed delivery must create");
    for (let i = 1; i < 5; i++) {
      assert.check(
        "POST (keyed x5, repeats)",
        keyedResults[i].status === 200 && keyedResults[i].json?.origin === "idempotent" && keyedResults[i].message?.id === keyedResults[0].message?.id,
        `repeat ${i + 1} with the same key must return the original message as idempotent; got status=${keyedResults[i].status} origin=${keyedResults[i].json?.origin} id=${keyedResults[i].message?.id}`,
      );
    }

    // -- Leg 2: no key, identical body x5, rapid ------------------------
    const bareBody = `Schedule 9 am brunch at The Henry ${ctx.tag}`;
    const bareResults = [];
    for (let i = 0; i < 5; i++) {
      bareResults.push(await h.postHumanMessage(A, convId, bareBody));
    }
    assert.eq("POST (no-key x5, first)", bareResults[0].status, 201, "the first no-key delivery must create");
    for (let i = 1; i < 5; i++) {
      assert.check(
        "POST (no-key x5, repeats collapse)",
        bareResults[i].status === 200 && bareResults[i].json?.origin === "idempotent" && bareResults[i].message?.id === bareResults[0].message?.id,
        `identical no-key repeat ${i + 1} inside the window must collapse to the original delivery; got status=${bareResults[i].status} origin=${bareResults[i].json?.origin} id=${bareResults[i].message?.id}`,
      );
    }

    // -- Stored exactly once each ---------------------------------------
    await h.getAlignment(A, convId);
    const msgs = await h.getHumanMessages(A, convId);
    assert.eq(
      "GET /conversations/:id/messages (keyed stored once)",
      msgs.messages.filter((m) => m.body === keyedBody).length,
      1,
      "the keyed message must be stored exactly once",
    );
    assert.eq(
      "GET /conversations/:id/messages (no-key stored once)",
      msgs.messages.filter((m) => m.body === bareBody).length,
      1,
      "the no-key identical message must be stored exactly once (duplicates collapse to the original delivery)",
    );

    // -- State applied exactly once each --------------------------------
    const plansAfter = (await h.listPlans(A)).plans.filter((p) => p.conversation_id === convId);
    const churchPlans = plansAfter.filter((p) => (p.title || "").toLowerCase().includes("church"));
    const brunchPlans = plansAfter.filter((p) => (p.title || "").toLowerCase().includes("brunch"));
    assert.check(
      "GET /opal/plans (state once, keyed)",
      churchPlans.length <= 1,
      `the keyed intent's state may apply at most once (one church plan or one ASK); got ${churchPlans.length} church plans`,
    );
    assert.check(
      "GET /opal/plans (state once, no-key)",
      brunchPlans.length <= 1,
      `the no-key intent's state may apply at most once; got ${brunchPlans.length} brunch plans`,
    );
    const al = (await h.getAlignment(A, convId)).alignment || {};
    assert.check(
      "GET /conversations/:id/alignment (no proposal from duplicates)",
      !al.change_proposal,
      "duplicate new-plan sends must never produce a change_proposal on the dinner plan",
    );

    // -- Leg 3: cross-account key collision ------------------------------
    const collision = await h.postHumanMessage(B, convId, `B's own words ${ctx.tag}`, {
      clientMessageId: key,
    });
    assert.check(
      "POST (cross-account key collision)",
      collision.status === 409 || (collision.status === 201 && collision.message?.id !== keyedResults[0].message?.id),
      `a different sender reusing the key must get a 409 conflict or their own distinct message - never the first sender's message replayed; got status=${collision.status} id=${collision.message?.id}`,
    );
    if (collision.status === 201) {
      const after = await h.getHumanMessages(A, convId);
      assert.eq(
        "GET /conversations/:id/messages (collision stored as B's own)",
        after.messages.filter((m) => m.body === `B's own words ${ctx.tag}`).length,
        1,
        "if the collision is accepted as a distinct send, it is stored once under B",
      );
    }
  },
};
