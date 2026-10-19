/**
 * FR-B3-01 - Circle check-in sweep, Scenario A (design section 6):
 * family circle resolved from the organizer's own RelationshipType
 * rows, lockdown day one. Organizer + 5 member sessions, each a
 * distinct authenticated user. Answers roll into ONE organizer
 * summary; the member who never answers stays VISIBLE as unanswered.
 *
 * Real path only: every step goes through the product HTTP API the
 * client renders (POST/GET /checkins, member Center reads). The
 * memory non-admission and free-text-consumption legs of Scenario A
 * are proven in the backend suite (checkin_test.exs) - there is no
 * API surface that could assert them honestly from here, and this
 * case does not pretend otherwise.
 */
import { freshSyntheticClient } from "../lib/harness.mjs";

const PHONES = {
  c: "+12025550103",
  d: "+12025550104",
  e: "+12025550105",
  f: "+12025550106",
  outsider: "+12025550107",
};

export default {
  id: "FR-B3-01",
  title: "Check-in sweep: family circle, answers roll into one summary, unanswered stays visible",
  theme: "checkin-sweep",
  class: "B",
  surfaces: [
    "POST /checkins",
    "GET /checkins/:id (organizer summary)",
    "GET /checkins/:id (member view)",
    "POST /checkins/:id/respond",
    "POST /checkins/:id/withdraw",
    "POST /checkins/:id/close",
    "GET /checkins/for-source",
    "GET /opal/conversation (member ask card)",
  ],
  async run(ctx) {
    const { A, B, h, assert, config } = ctx;
    if (!B) throw new Error("FR-B3-01 needs session B (member) - two-party case");

    const C = await freshSyntheticClient(config, PHONES.c, "Member Cee");
    const D = await freshSyntheticClient(config, PHONES.d, "Member Dee");
    const E = await freshSyntheticClient(config, PHONES.e, "Member Ee");
    const POOL = {
      f6: await freshSyntheticClient(config, PHONES.f, "Member Eff"),
      g7: await freshSyntheticClient(config, PHONES.outsider, "Outsider Gee"),
      h8: await freshSyntheticClient(config, "+12025550108", "Member Aitch"),
    };
    if (!C || !D || !E || !POOL.f6 || !POOL.g7 || !POOL.h8) {
      throw new Error(
        "FR-B3-01 needs OPAL_SESSION_PROVISION=synthetic for the extra member sessions",
      );
    }

    // Repeat-run hygiene on a stateful dev DB: a relationship_set
    // circle is the organizer's whole family set, and a closed sweep
    // holds its circle in the 24h quiet window (the quiet law working
    // as designed). The fifth member therefore rotates through the
    // three pool fixtures (106/107/108): each choice is a DIFFERENT
    // member set, hence a different circle. The case tries each
    // configuration in tag-rotated order and proceeds with the first
    // whose create returns 201; a 422 sweep_quiet_window or a 200
    // already-open from an earlier run moves to the next. Non-chosen
    // pool members are explicitly typed "friend" so no earlier run
    // can leak them into this run's family set.
    let tagHash = 0;
    for (const ch of ctx.tag) tagHash = (tagHash * 31 + ch.charCodeAt(0)) % 9973;
    const poolKeys = ["f6", "g7", "h8"];
    const rotated = poolKeys.map((_, i) => poolKeys[(tagHash + i) % 3]);

    const typeAs = async (client, type) => {
      const r = await A.request("PUT", `/relationships/${client.session.userId}`, { type });
      assert.eq("PUT /relationships/:id", r.status, 200, `${type} typing must land`);
    };
    for (const m of [B, C, D, E]) await typeAs(m, "family");
    for (const k of poolKeys) await typeAs(POOL[k], "friend");

    // -- Step 1: one action asks everyone -----------------------------
    const convsBefore = (await h.listConversations(A)).conversations.length;
    let F = null;
    let G = null;
    let created = null;
    let idem = null;
    for (const fifthKey of rotated) {
      const others = poolKeys.filter((k) => k !== fifthKey);
      F = POOL[fifthKey];
      G = POOL[others[0]];
      // Reset BEFORE choosing: a candidate that failed (quiet window)
      // must not stay typed family into the next candidate's set.
      for (const k of poolKeys) await typeAs(POOL[k], "friend");
      await typeAs(F, "family");
      idem = `b3a-${ctx.tag}-${fifthKey}`;
      created = await A.post("/checkins", {
        source_kind: "relationship_set",
        source_filter: { type: "family" },
        prompt_theme: "with the power out",
        expires_in_hours: 48,
        idempotency_key: idem,
      });
      if (created.status === 201) break;
      created = null;
    }
    if (!created) {
      throw new Error(
        "all three family-circle variants are inside the 24h quiet window or already open from runs in the last 24h - the quiet law is doing its job; re-run tomorrow or on a fresh DB",
      );
    }
    const members = [B, C, D, E, F];
    const memberIds = members.map((m) => m.session.userId);
    const sweep = created.json.checkin;
    assert.check("POST /checkins", !!sweep?.sweep?.id, "summary carries the sweep");
    const sweepId = sweep.sweep.id;
    assert.eq("summary counts", sweep.counts.asked_total, 5, "5 targets asked");
    assert.eq("summary counts", sweep.counts.still_waiting, 5, "all 5 start unanswered");
    assert.eq("summary counts", sweep.counts.answered, 0, "nobody answered yet");
    assert.eq(
      "summary members",
      sweep.members.length,
      5,
      "every target is a named row from the start (unanswered is a stored state)",
    );
    assert.check(
      "summary members",
      sweep.members.every((m) => m.response_status === "asked"),
      "all member rows start in status asked",
    );
    assert.check(
      "summary copy",
      typeof sweep.copy?.headline === "string" && sweep.copy.headline.includes("0 of 5"),
      "server composes the headline copy",
    );
    // Derived set has no conversation of its own: the sweep creates
    // NO group conversation and NO marker. (Delta-scoped: the shared
    // organizer may hold conversations from other cases/runs.)
    const convsAfter = await h.listConversations(A);
    assert.eq(
      "GET /conversations",
      convsAfter.conversations.length,
      convsBefore,
      "relationship_set sweep creates no conversation and no marker message",
    );

    // Idempotent re-create (double tap): same sweep, no second ask.
    const again = await A.post("/checkins", {
      source_kind: "relationship_set",
      source_filter: { type: "family" },
      idempotency_key: idem,
    });
    assert.eq("POST /checkins (retry)", again.json.checkin.sweep.id, sweepId, "retry returns the same sweep");

    // -- Member ask cards: verbatim consent copy + theme --------------
    for (const m of members) {
      const view = await m.get(`/checkins/${sweepId}`);
      assert.eq("GET /checkins/:id (member)", view.status, 200, "member can open their ask");
      assert.eq("member view", view.json.view, "member", "member gets the member view");
      const body = view.json.checkin.ask?.body || "";
      assert.check(
        "member ask copy",
        body.includes("go only to") && body.includes("nobody else"),
        "ask copy states answers go only to the organizer",
      );
      assert.check(
        "member ask copy",
        (view.json.checkin.ask?.theme_line || "").includes("with the power out"),
        "organizer theme is shown verbatim",
      );
      assert.check(
        "member view privacy",
        !("members" in view.json.checkin) && !("counts" in view.json.checkin),
        "member view carries no rollup and no other member's data",
      );
      const center = await h.centerConversation(m);
      const asks = (center.conversation?.messages || []).filter(
        (msg) =>
          msg.metadata?.source === "checkin_sweep" &&
          msg.metadata?.kind === "ask" &&
          msg.metadata?.sweep_id === sweepId,
      );
      assert.eq("GET /opal/conversation", asks.length, 1, "exactly one ask card in the member's Center");
    }

    // -- Outsider: no view, no answer, no leak -------------------------
    const gView = await G.get(`/checkins/${sweepId}`);
    assert.eq("GET /checkins/:id (outsider)", gView.status, 404, "outsider gets not_found, not the summary");
    const gResp = await G.post(`/checkins/${sweepId}/respond`, { okay: "ok" });
    assert.eq("POST respond (outsider)", gResp.status, 404, "non-member cannot answer");

    const summary = async () => (await A.get(`/checkins/${sweepId}`)).json.checkin;
    const row = (s, client) => s.members.find((m) => m.user_id === client.session.userId);

    // -- Step 2: three members answer ----------------------------------
    const bResp = await B.post(`/checkins/${sweepId}/respond`, {
      okay: "ok",
      where_text: "home",
      needs_text: "",
    });
    assert.eq("POST respond (B)", bResp.status, 200, "member answer accepted");
    let s = await summary();
    assert.eq("summary after B", s.counts.answered, 1, "one answered");
    assert.eq("summary after B", s.counts.still_waiting, 4, "four still waiting, none dropped");
    assert.eq("summary after B", row(s, B).where_text, "home", "B's where is verbatim");

    await C.post(`/checkins/${sweepId}/respond`, {
      okay: "ok",
      where_text: "at my sister's in Carlsbad",
    });
    const dResp = await D.post(`/checkins/${sweepId}/respond`, {
      okay: "not_ok",
      needs_text: "insulin is running low",
      share_area: true,
      lat: 33.1581009,
      lon: -117.3509999,
      area_label: "Carlsbad",
    });
    assert.eq("POST respond (D, share)", dResp.status, 200, "share answer accepted");
    s = await summary();
    assert.eq("summary after C+D", s.counts.answered, 3, "three answered");
    assert.eq("summary after C+D", s.counts.not_ok, 1, "one not_ok counted");
    const dRow = row(s, D);
    assert.eq("shared area", dRow.shared_area?.label, "Carlsbad", "coarse label shown to organizer");
    const latStr = String(dRow.shared_area?.lat ?? "");
    assert.check(
      "shared area precision",
      latStr.split(".")[1] === undefined || latStr.split(".")[1].length <= 3,
      `shared coordinates are coarsened to at most 3 decimals (got ${latStr})`,
    );

    // Spoof attempt: B answers "as" C - the session user is the author.
    const cBefore = row(s, C);
    await B.post(`/checkins/${sweepId}/respond`, {
      okay: "ok",
      where_text: "spoofed",
      member_user_id: C.session.userId,
    });
    s = await summary();
    assert.eq(
      "spoof defense",
      row(s, C).where_text,
      cBefore.where_text,
      "a body member_user_id never authors another member's answer",
    );
    assert.eq("spoof defense", row(s, B).where_text, "spoofed", "the write landed on the session user's own row");

    // Amend: same row, last write wins, first responded_at preserved.
    const bFirstRespondedAt = row(s, B).responded_at;
    await B.post(`/checkins/${sweepId}/respond`, { okay: "ok", where_text: "at home now" });
    s = await summary();
    assert.eq("amend", s.members.filter((m) => m.user_id === B.session.userId).length, 1, "still exactly one row for B");
    assert.eq("amend", row(s, B).where_text, "at home now", "amendment wins");
    assert.eq("amend", row(s, B).responded_at, bFirstRespondedAt, "responded_at keeps the first answer time");

    // -- Step 3: one declines, one never answers ------------------------
    await E.post(`/checkins/${sweepId}/respond`, { decline: true });
    s = await summary();
    assert.eq("summary after decline", s.counts.declined_or_passed, 1, "decline counted");
    const eRow = row(s, E);
    assert.eq("decline row", eRow.response_status, "declined", "decline is its own status");
    assert.check(
      "decline row",
      !eRow.where_text && !eRow.needs_text && !eRow.okay,
      "a decline carries no content fields",
    );

    assert.eq("summary final", s.counts.still_waiting, 1, "exactly one still waiting");
    const fRow = row(s, F);
    assert.eq("unanswered visibility", fRow.response_status, "asked", "the silent member is still 'asked', never marked answered or declined");
    // Name-source repair (Repair #18 apifix): the line names the
    // member by the SERVER's display name for that account. The
    // case's locally-assumed fixture name ("Member Eff" / F.session
    // .name) is not what the server holds in suite context - the
    // synthetic phone pool is shared, an earlier case provisions
    // each pool phone first, and activation verify keeps the
    // existing user's name, so the server-side name differs. The
    // assertion's contract is unchanged (the line NAMES the
    // unanswered member); the expected name now comes from the
    // server's own records: the summary's member row for F, falling
    // back to F's own profile.
    let serverName = fRow.display_name || null;
    if (!serverName) {
      const prof = await F.get("/session");
      serverName =
        prof.json?.user?.display_name || prof.json?.session?.user?.display_name || null;
    }
    assert.check(
      "unanswered visibility",
      !!serverName && (s.copy.still_waiting_line || "").includes(serverName),
      `the still-waiting line NAMES the unanswered member (server-known name ${JSON.stringify(serverName)}); line: ${JSON.stringify(s.copy.still_waiting_line)}`,
    );
    assert.check(
      "summary copy",
      (s.copy.still_waiting_line || "").includes("Not answering is not the same as being okay"),
      "server copy carries the welfare line verbatim",
    );

    // Cross-surface equality: for-source returns the same projection.
    const forSource = await A.get(
      "/checkins/for-source?source_kind=relationship_set",
    );
    assert.eq(
      "GET /checkins/for-source",
      forSource.json.checkin?.sweep?.id,
      sweepId,
      "circle surface row reads the same sweep",
    );
    assert.eq(
      "GET /checkins/for-source",
      forSource.json.checkin?.counts?.answered,
      s.counts.answered,
      "counts agree across surfaces",
    );

    // -- Withdrawal erases content everywhere ---------------------------
    const w = await C.post(`/checkins/${sweepId}/withdraw`, {});
    assert.eq("POST withdraw", w.status, 200, "member can withdraw while open");
    s = await summary();
    const cRow = row(s, C);
    assert.eq("withdraw", cRow.response_status, "withdrawn", "withdrawn status shows");
    assert.check(
      "withdraw",
      !cRow.where_text && !cRow.free_text,
      "withdrawn content is erased from the organizer summary, not just hidden",
    );

    // -- Close: late answers refused, record stays honest ---------------
    const closed = await A.post(`/checkins/${sweepId}/close`, {});
    assert.eq("POST close", closed.status, 200, "organizer can close");
    s = await summary();
    assert.eq("closed summary", s.sweep.status, "closed", "sweep is closed");
    assert.eq(
      "closed summary",
      row(s, F).response_status,
      "asked",
      "at close the silent member still reads as did-not-answer",
    );
    const late = await F.post(`/checkins/${sweepId}/respond`, { okay: "ok" });
    assert.eq("late respond", late.status, 422, "late answer is refused");
    assert.eq("late respond", late.json.reason, "sweep_closed", "refusal names sweep_closed");
    s = await summary();
    assert.eq("late respond", row(s, F).response_status, "asked", "a refused late answer stores nothing");

    // -- Quiet window: no immediate re-sweep of the same circle ---------
    const tooSoon = await A.post("/checkins", {
      source_kind: "relationship_set",
      source_filter: { type: "family" },
      idempotency_key: `b3a-second-${ctx.tag}`,
    });
    assert.eq("quiet window", tooSoon.status, 422, "re-sweep inside 24h of close is refused");
    assert.eq("quiet window", tooSoon.json.reason, "sweep_quiet_window", "refusal names the quiet window");
    assert.check(
      "quiet window",
      typeof tooSoon.json.next_sweep_allowed_at === "string",
      "the contract carries next_sweep_allowed_at so the client can disable honestly",
    );
    assert.check("member ids unused", memberIds.length === 5, "snapshot had 5 targets");
  },
};
