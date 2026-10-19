/**
 * FR-B3-02 - Circle check-in sweep, Scenario B (design section 6):
 * group conversation source. One organizer marker in the thread,
 * group replies are NEVER consumed as sweep answers, and the QUIET
 * law holds under a nag attack: repeated create attempts return the
 * one open sweep and re-notify nobody.
 *
 * The muted-member and late-joiner legs need conversation-member
 * state the HTTP surface cannot set up (mute flag, mid-sweep join);
 * they are proven at the same real path in the backend suite
 * (checkin_test.exs: delivery never consults notifications_muted;
 * a post-creation joiner is not a target). This case proves the
 * outsider half of the snapshot law over HTTP: someone who was
 * never in the snapshot gets not_found on answer and on read.
 */
import { freshSyntheticClient } from "../lib/harness.mjs";

export default {
  id: "FR-B3-02",
  title: "Check-in sweep: group circle marker, group replies never count, nag attack re-notifies nobody",
  theme: "checkin-sweep",
  class: "B",
  surfaces: [
    "POST /conversations/group",
    "POST /checkins (conversation source)",
    "GET /conversations/:id/messages (marker)",
    "POST /conversations/:id/messages (group reply)",
    "GET /checkins/:id (organizer summary)",
    "GET /opal/conversation (ask count under nag attack)",
    "GET /checkins/for-source (suggestion gate, opt-in off)",
  ],
  async run(ctx) {
    const { A, B, h, assert, config } = ctx;
    if (!B) throw new Error("FR-B3-02 needs session B");

    const C = await freshSyntheticClient(config, "+12025550103", "Celia Ruiz");
    const D = await freshSyntheticClient(config, "+12025550104", "Derek Ruiz");
    const E = await freshSyntheticClient(config, "+12025550105", "Elena Ruiz");
    if (!C || !D || !E) {
      throw new Error("FR-B3-02 needs OPAL_SESSION_PROVISION=synthetic");
    }

    const group = await h.createGroup(
      A,
      [B.session.userId, C.session.userId, D.session.userId],
      `Saturday Crew ${ctx.tag}`,
    );
    assert.check("POST /conversations/group", !!group.conversationId, "group conversation created");
    const convId = group.conversationId;

    const created = await A.post("/checkins", {
      source_kind: "conversation",
      source_ref_id: convId,
      idempotency_key: `b3b-${ctx.tag}`,
    });
    assert.eq("POST /checkins", created.status, 201, "conversation sweep created");
    const sweep = created.json.checkin;
    const sweepId = sweep.sweep.id;
    assert.eq("snapshot", sweep.counts.asked_total, 3, "snapshot is the 3 other members");
    assert.eq("circle label", sweep.sweep.circle_label, `Saturday Crew ${ctx.tag}`, "label frozen from the conversation");

    // Exactly one marker message, organizer-authored, privacy promise.
    const msgs = await h.getHumanMessages(A, convId);
    const markers = msgs.messages.filter((m) => (m.body || "").includes("check in with everyone"));
    assert.eq("marker", markers.length, 1, "exactly one marker message in the thread");
    assert.check(
      "marker copy",
      (markers[0]?.body || "").includes("privately"),
      "marker promises replies come back privately",
    );

    // Re-create while open (any key): same sweep, no second marker.
    const again = await A.post("/checkins", {
      source_kind: "conversation",
      source_ref_id: convId,
      idempotency_key: `b3b-other-${ctx.tag}`,
    });
    assert.eq("already open", again.json.checkin.sweep.id, sweepId, "second create returns the open sweep");
    const msgs2 = await h.getHumanMessages(A, convId);
    assert.eq(
      "marker",
      msgs2.messages.filter((m) => (m.body || "").includes("check in with everyone")).length,
      1,
      "still exactly one marker after re-create",
    );

    // A group reply is group chat, NOT a sweep answer (design 2.3).
    const posted = await h.postHumanMessage(B, convId, "all good here");
    assert.eq("group reply", posted.status, 201, "group reply posts normally");
    let s = (await A.get(`/checkins/${sweepId}`)).json.checkin;
    const bRow = s.members.find((m) => m.user_id === B.session.userId);
    assert.eq(
      "group reply is not an answer",
      bRow.response_status,
      "asked",
      "B still shows still-waiting after replying in the group thread",
    );
    assert.eq("counts unchanged", s.counts.answered, 0, "no answer was invented from group text");

    // B answers on the card: now it counts.
    await B.post(`/checkins/${sweepId}/respond`, { okay: "ok", where_text: "home" });
    s = (await A.get(`/checkins/${sweepId}`)).json.checkin;
    assert.eq("card answer", s.counts.answered, 1, "card answer lands");

    // Outsider (never in the snapshot): no read, no answer.
    const eView = await E.get(`/checkins/${sweepId}`);
    assert.eq("outsider read", eView.status, 404, "outsider cannot read the sweep");
    const eResp = await E.post(`/checkins/${sweepId}/respond`, { okay: "ok" });
    assert.eq("outsider respond", eResp.status, 404, "outsider cannot answer");

    // -- Nag attack: 5 more create attempts change nothing -------------
    const askCount = async (client) => {
      const center = await h.centerConversation(client);
      return (center.conversation?.messages || []).filter(
        (msg) =>
          msg.metadata?.source === "checkin_sweep" &&
          msg.metadata?.kind === "ask" &&
          msg.metadata?.sweep_id === sweepId,
      ).length;
    };
    assert.eq("ask count before attack", await askCount(C), 1, "C has exactly one ask");
    for (let i = 0; i < 5; i++) {
      const r = await A.post("/checkins", {
        source_kind: "conversation",
        source_ref_id: convId,
        idempotency_key: `b3b-nag-${i}-${ctx.tag}`,
      });
      assert.eq("nag attempt", r.json.checkin.sweep.id, sweepId, `nag attempt ${i} returns the same open sweep`);
    }
    assert.eq("ask count after attack", await askCount(C), 1, "nobody was re-asked");
    assert.eq("ask count after attack", await askCount(D), 1, "nobody was re-asked (D)");
    const msgs3 = await h.getHumanMessages(A, convId);
    assert.eq(
      "marker after attack",
      msgs3.messages.filter((m) => (m.body || "").includes("check in with everyone")).length,
      1,
      "no duplicate markers after the nag attack",
    );

    // -- Suggestion gate at the HTTP surface: opt-in OFF ---------------
    // proactive_threads_enabled defaults FALSE and no settings surface
    // flips it over HTTP today (pre-existing gap, named in the B3
    // report); the deterministic HTTP assertion is the default-off
    // suppression. The full opt-in matrix runs through the real gate
    // stack in the backend suite with the clock pinned.
    const group2 = await h.createGroup(
      A,
      [B.session.userId, C.session.userId],
      `Quiet Circle ${ctx.tag}`,
    );
    const fs = await A.get(
      `/checkins/for-source?source_kind=conversation&source_ref_id=${group2.conversationId}`,
    );
    assert.eq("for-source", fs.status, 200, "for-source loads");
    assert.eq(
      "suggestion gate (opt-in off)",
      fs.json.suggestion,
      null,
      "no in-context suggestion is offered while the proactive opt-in is off",
    );
  },
};
