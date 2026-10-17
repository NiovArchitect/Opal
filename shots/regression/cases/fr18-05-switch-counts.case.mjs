/**
 * FR-18-05 - Center chat switching went insane (F18-08 IA + thrash).
 *
 * Founder symptom: 47 conversation switches in one session, chats
 * blended into each other, one giant thread held everything. The
 * automated source is the client poll that "reads" the current chat
 * by POSTing to the switch endpoint - a read implemented as a server
 * mutation (track-intelligence.md section 6).
 *
 * Contract asserted here, at the API level every surface consumes:
 *  - Deliberate switches: each switch returns ONLY that session's
 *    messages (chat separation across 20 deliberate switches among 3
 *    distinct chats, including a switch sequence done twice).
 *  - One switch per user action: the harness counts its own switch
 *    POSTs - exactly the deliberate count, no more.
 *  - Second open = 0 switches: re-opening the ALREADY ACTIVE session
 *    (the poll's pattern) must be a no-op on the server contract - no
 *    session row changes (updated_at / archived_at / list order all
 *    identical after repeated same-id opens). A switch endpoint that
 *    mutates on a same-id open makes the client poll a write storm.
 *  - Reads are reads: GET list + GET conversation change nothing.
 *  - Identity: every session in the list carries a distinct label
 *    (title or last-message preview), and a switch response carries
 *    the session title so the open chat can show which chat it is.
 *
 * The browser-level poll count itself (request interception on the
 * real client) plugs into this case when a web harness is available;
 * the server no-op contract above is what makes that storm impossible
 * to hide, and it is assertable today.
 *
 * Expected on the R17 tip: the same-id switch still runs a transaction
 * and updates the target row on every call.
 */
export default {
  id: "FR-18-05",
  title: "Center chat switching went insane: 47 switches, chats blended, one giant thread",
  theme: "chat-sessions",
  class: "A",
  surfaces: [
    "POST /opal/conversations/:id/switch",
    "GET /opal/conversations",
    "GET /opal/conversation",
  ],
  async run(ctx) {
    const { A, h, assert } = ctx;
    const topics = ["alpha", "bravo", "charlie"];
    const sessionIds = [];

    // -- Build 3 distinct Center chats with distinct marker content ------
    for (const topic of topics) {
      const fresh = await h.centerNewChat(A);
      assert.eq("POST /opal/conversation/new", fresh.status, 200, "new chat must succeed");
      const id = fresh.conversation?.id;
      assert.check("POST /opal/conversation/new", !!id, "new chat must return a session id");
      await h.centerSend(A, ctx.marker(`topic ${topic}`));
      if (id) sessionIds.push(id);
    }
    assert.eq("setup", sessionIds.length, 3, "three distinct sessions must exist");

    const listed0 = await h.centerSessions(A);
    const mine = listed0.sessions.filter((s) => sessionIds.includes(s.id));
    assert.eq(
      "GET /opal/conversations",
      mine.length,
      3,
      "the sessions list must contain all three chats",
    );
    const labels = mine.map((s) => s.title || s.last_message_preview || "");
    assert.check(
      "GET /opal/conversations",
      labels.every((l) => l && l.length > 0) && new Set(labels).size === labels.length,
      `untitled chats must be distinguishable in the list; labels were: ${JSON.stringify(labels)}`,
    );

    // -- 20 deliberate switches: separation + exactly-one-per-action -----
    const sequence = [0, 1, 2, 1, 0, 2, 0, 1, 2, 2, 1, 0, 2, 0, 1, 1, 2, 0, 2, 1];
    const switchesBefore = A.switchPosts;
    for (const idx of sequence) {
      const target = sessionIds[idx];
      const r = await h.centerSwitch(A, target);
      assert.eq(
        "POST /opal/conversations/:id/switch",
        r.status,
        200,
        `deliberate switch to session ${topics[idx]} must succeed`,
      );
      const msgs = r.json.conversation?.messages || [];
      const bodies = msgs.map((m) => m.body || "");
      const ownMarker = bodies.some((b) => b.includes(`topic ${topics[idx]}`));
      const foreign = topics
        .filter((t) => t !== topics[idx])
        .filter((t) => bodies.some((b) => b.includes(`topic ${t}`)));
      assert.check(
        "POST /opal/conversations/:id/switch (separation)",
        ownMarker && foreign.length === 0,
        `session ${topics[idx]} must paint only its own messages (own=${ownMarker}, foreign=${foreign.join(",") || "none"})`,
      );
      assert.check(
        "POST /opal/conversations/:id/switch (title)",
        typeof r.json.conversation?.title === "string" &&
          r.json.conversation.title.length > 0,
        "the switch response must carry the session title so the open chat can show which chat it is",
      );
    }
    assert.eq(
      "switch count",
      A.switchPosts - switchesBefore,
      sequence.length,
      "exactly one switch POST per deliberate user action, no more",
    );

    // -- Second open = 0 switches: same-id open must mutate nothing ------
    const snap = async () => {
      const l = await h.centerSessions(A);
      return l.sessions
        .filter((s) => sessionIds.includes(s.id))
        .map((s) => `${s.id}|${s.updated_at}|${s.active}`)
        .sort()
        .join(";");
    };
    const activeId = sessionIds[sequence[sequence.length - 1]];
    const before = await snap();
    for (let i = 0; i < 5; i++) {
      await h.centerSwitch(A, activeId); // the client poll pattern
    }
    const afterSameId = await snap();
    assert.eq(
      "POST /opal/conversations/:id/switch (same-id re-open)",
      afterSameId,
      before,
      "re-opening the already active session must change no session row - a poll-driven re-open must be a no-op read, not a mutation",
    );

    // -- Reads are reads ---------------------------------------------------
    await h.centerSessions(A);
    await h.centerConversation(A);
    const afterReads = await snap();
    assert.eq(
      "GET /opal/conversations + GET /opal/conversation",
      afterReads,
      before,
      "reading the session list or the active conversation must not mutate any session",
    );
  },
};
