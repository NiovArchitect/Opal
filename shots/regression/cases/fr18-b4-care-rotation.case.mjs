/**
 * FR-18-B4 - Care rotation primitive (Repair #18 Division B, track B4).
 *
 * Transcribed from coordination/repair18/track-b4-b5-care-contexts.md
 * section 5, Scenario A + cross-cutting adversarial:
 *  - A set of siblings rotates a daily check-in for a non-user subject.
 *  - Each occurrence is a real record with an owner; completing records it.
 *  - Rotation order advances off the occurrence's slot, never off passes.
 *  - A missed check-in surfaces EXACTLY ONCE to exactly the set (assignee
 *    included), dedupe key care:<occurrence_key>:missed, and a late cover
 *    retracts it for everyone.
 *  - Adversarial: non-members cannot read, complete, or pass; completing
 *    twice is idempotent; ending mid-window means no miss ever surfaces.
 *
 * Multi-session: A (creator/admin), B, plus fresh synthetic clients for
 * the third sibling and a non-member outsider. Time is driven through
 * the dev-only clock seam (POST /api/v1/dev/clock, canonical
 * clock_override) and the real TFT tick (POST /api/v1/dev/temporal-tick)
 * - the same Oban worker the cron runs every minute. No sleeps.
 */
import { freshSyntheticClient } from "../lib/harness.mjs";

const DEV = "/api/v1";

async function devPost(ctx, path, body, userId) {
  const res = await fetch(`${ctx.config.apiBase}${DEV}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-opal-dev-user-id": userId || "regression",
    },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function setMaturity(ctx, userId) {
  const r = await devPost(ctx, "/dev/maturity", { user_id: userId, maturity: "established" });
  if (r.status !== 200) throw Object.assign(new Error(`dev maturity failed: ${r.status}`), { harness: true });
}

async function setClock(ctx, iso) {
  const r = await devPost(ctx, "/dev/clock", { iso });
  if (r.status !== 200) throw Object.assign(new Error(`dev clock failed: ${r.status}`), { harness: true });
}

async function tick(ctx) {
  const r = await devPost(ctx, "/dev/temporal-tick", {});
  if (r.status !== 200) throw Object.assign(new Error(`dev tick failed: ${r.status}`), { harness: true });
  return r.json;
}

async function attention(client, h) {
  const r = await client.get("/attention");
  return r.json || {};
}

function missedRows(feed, key) {
  return (feed.needs_you || []).filter((i) => i.dedupe_key === key);
}

export default {
  id: "FR-18-B4",
  title: "Care rotation: siblings rotate a daily parent check-in; a miss surfaces once to exactly the set",
  theme: "care-rotation",
  class: "B",
  surfaces: [
    "POST /care-rotations",
    "GET /care-rotations/:id",
    "POST /care-rotations/:id/check-ins/:key/complete",
    "POST /care-rotations/:id/check-ins/:key/pass",
    "GET /attention",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw Object.assign(new Error("FR-18-B4 needs session B"), { harness: true });
    const cora = await freshSyntheticClient(ctx.config, "+12025550103", `Cora ${ctx.tag}`);
    const outsider = await freshSyntheticClient(ctx.config, "+12025550105", `Out ${ctx.tag}`);
    if (!cora || !outsider) {
      throw Object.assign(new Error("FR-18-B4 needs synthetic provisioning for Cora + outsider"), { harness: true });
    }
    const ana = A.session.userId, ben = B.session.userId, coraId = cora.session.userId;
    // Established maturity is account provisioning (the same stored
    // record 30 days of real use writes): the AttentionBudget maturity
    // gate is product law and correctly denies brand-new accounts any
    // proactive slot, which would test the gate, not the rotation.
    for (const uid of [ana, ben, coraId]) await setMaturity(ctx, uid);

    // Monday 2026-10-19 18:05 America/New_York = 22:05Z (EDT).
    await setClock(ctx, "2026-10-19T22:05:00Z");
    try {
      // -- Create: Ana creates, Ben + Cora are proposed members ------------
      const created = await A.post("/care-rotations", {
        subject_label: `Mom ${ctx.tag}`,
        member_user_ids: [ben, coraId],
        cadence: { frequency: "daily", local_time: "18:00", window_hours: 4 },
        timezone: "America/New_York",
      });
      assert.eq("POST /care-rotations", created.status, 201, "rotation creation must succeed");
      const rotation = created.json.rotation;
      assert.check("POST /care-rotations", !!rotation?.id, "creation returns the rotation contract");
      if (!rotation?.id) return;
      const rid = rotation.id;
      assert.eq("POST /care-rotations (pending)", rotation.pending_member_user_ids?.length, 2,
        "proposed members are pending until they accept - nobody is in a set they did not accept");
      assert.check("POST /care-rotations (order)", JSON.stringify(rotation.member_user_ids) === JSON.stringify([ana]),
        "only the creator is an active member before acceptances");

      // Non-member read is refused before anything else.
      const outRead0 = await outsider.get(`/care-rotations/${rid}`);
      assert.eq("GET /care-rotations/:id (outsider)", outRead0.status, 404, "outsider must not read a rotation");

      // -- Acceptances ------------------------------------------------------
      for (const [client, name] of [[B, "Ben"], [cora, "Cora"]]) {
        const acc = await client.post(`/care-rotations/${rid}/accept`, {});
        assert.eq(`POST /care-rotations/:id/accept (${name})`, acc.status, 200, `${name} accepts`);
      }
      const after = await A.get(`/care-rotations/${rid}`);
      assert.check("GET /care-rotations/:id (order)",
        JSON.stringify(after.json.rotation.member_user_ids) === JSON.stringify([ana, ben, coraId]),
        "rotation order is creator, then acceptances in proposal order");

      // -- A1: Monday occurrence is Ana's; she completes with a note --------
      await tick(ctx);
      let view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      const mon = view.check_ins.find((c) => c.occurrence_key.endsWith("2026-10-19"));
      assert.check("tick materialize (Mon)", !!mon, "Monday occurrence materialized by the tick");
      assert.eq("tick materialize (Mon assignee)", mon?.assignee_user_id, ana, "Monday is Ana's turn");
      assert.eq("tick materialize (Mon status)", mon?.status, "open", "Monday occurrence open in its window");

      const done = await A.post(`/care-rotations/${rid}/check-ins/${mon.occurrence_key}/complete`, { note: "Talked, all good" });
      assert.eq("POST complete (Ana)", done.status, 200, "assignee completes her turn");
      assert.eq("POST complete (Ana)", done.json.check_in?.status, "done", "completion recorded as done");
      assert.eq("POST complete (Ana)", done.json.check_in?.note, "Talked, all good", "note recorded verbatim");

      // Duplicate completion is idempotent (double-tap / race safe).
      const done2 = await A.post(`/care-rotations/${rid}/check-ins/${mon.occurrence_key}/complete`, { note: "second tap" });
      assert.eq("POST complete (duplicate)", done2.status, 200, "duplicate completion does not error");
      assert.eq("POST complete (duplicate)", done2.json.check_in?.note, "Talked, all good", "duplicate completion changes nothing");

      // Adversarial: outsider cannot complete or pass.
      const outComplete = await outsider.post(`/care-rotations/${rid}/check-ins/${mon.occurrence_key}/complete`, {});
      assert.check("POST complete (outsider)", [403, 404].includes(outComplete.status), "non-member completion rejected");
      const outPass = await outsider.post(`/care-rotations/${rid}/check-ins/${mon.occurrence_key}/pass`, {});
      assert.check("POST pass (outsider)", [403, 404].includes(outPass.status), "non-member pass rejected");

      // Tue/Wed/Thu advance: Ben, Cora, Ana.
      const days = [
        ["2026-10-20T22:05:00Z", "2026-10-20", ben, B],
        ["2026-10-21T22:05:00Z", "2026-10-21", coraId, cora],
        ["2026-10-22T22:05:00Z", "2026-10-22", ana, A],
      ];
      for (const [iso, date, who, client] of days) {
        await setClock(ctx, iso);
        await tick(ctx);
        view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
        const occ = view.check_ins.find((c) => c.occurrence_key.endsWith(date));
        assert.eq(`advance ${date}`, occ?.assignee_user_id, who, `${date} assignee follows rotation order`);
        const r = await client.post(`/care-rotations/${rid}/check-ins/${occ.occurrence_key}/complete`, {});
        assert.eq(`advance ${date} complete`, r.status, 200, `${date} completes`);
        const feed = await attention(client, h);
        assert.eq(`advance ${date} attention`, missedRows(feed, `care:${occ.occurrence_key}:missed`).length, 0,
          "a completed day never produces a miss row");
      }

      // -- A3 swap: Fri is Ben, Sat is Cora. Ben passes Fri to Cora; Cora
      //    passes Sat to Ben. Both complete as assignees (done, not covered).
      await setClock(ctx, "2026-10-23T22:05:00Z"); // Fri 18:05 ET
      await tick(ctx);
      view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      const fri = view.check_ins.find((c) => c.occurrence_key.endsWith("2026-10-23"));
      assert.eq("swap setup (Fri)", fri?.assignee_user_id, ben, "Friday is Ben's slot");
      const pass1 = await B.post(`/care-rotations/${rid}/check-ins/${fri.occurrence_key}/pass`, { to_user_id: coraId, reason: "swap" });
      assert.eq("POST pass (Ben->Cora)", pass1.status, 200, "targeted pass succeeds");
      assert.eq("POST pass (Ben->Cora)", pass1.json.check_in?.assignee_user_id, coraId, "assignee is now Cora");
      assert.eq("POST pass (Ben->Cora)", pass1.json.check_in?.handoff_from_user_id, ben, "handoff trail records Ben");
      const friDone = await cora.post(`/care-rotations/${rid}/check-ins/${fri.occurrence_key}/complete`, {});
      assert.eq("swap complete (Cora)", friDone.json.check_in?.status, "done", "post-handoff assignee completion is done, not covered");
      // Passing a completed occurrence is rejected.
      const passDone = await B.post(`/care-rotations/${rid}/check-ins/${fri.occurrence_key}/pass`, { to_user_id: ana });
      assert.check("POST pass (completed)", passDone.status >= 400, "a completed occurrence cannot be passed");

      await setClock(ctx, "2026-10-24T22:05:00Z"); // Sat 18:05 ET
      await tick(ctx);
      view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      const sat = view.check_ins.find((c) => c.occurrence_key.endsWith("2026-10-24"));
      assert.eq("swap setup (Sat)", sat?.assignee_user_id, coraId, "Saturday is Cora's slot");
      await cora.post(`/care-rotations/${rid}/check-ins/${sat.occurrence_key}/pass`, { to_user_id: ben, reason: "swap" });
      const satDone = await B.post(`/care-rotations/${rid}/check-ins/${sat.occurrence_key}/complete`, {});
      assert.eq("swap complete (Ben)", satDone.json.check_in?.status, "done", "swap counterpart completes as assignee");

      // Sun returns to Ana (pointer keyed off slots, passes did not reshuffle).
      await setClock(ctx, "2026-10-25T22:05:00Z"); // Sun 18:05 ET (EDT still)
      await tick(ctx);
      view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      const sun = view.check_ins.find((c) => c.occurrence_key.endsWith("2026-10-25"));
      assert.eq("advance after swaps (Sun)", sun?.assignee_user_id, ana, "Sunday is Ana again - passes never reshuffle the order");
      await A.post(`/care-rotations/${rid}/check-ins/${sun.occurrence_key}/complete`, {});

      // -- A2: Monday is Ben again; nobody completes; window ends 22:00 ET.
      await setClock(ctx, "2026-10-26T22:05:00Z"); // Mon 18:05 ET
      await tick(ctx);
      view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      const miss = view.check_ins.find((c) => c.occurrence_key.endsWith("2026-10-26"));
      assert.eq("miss setup (Mon2)", miss?.assignee_user_id, ben, "second Monday is Ben's turn");
      const missKey = `care:${miss.occurrence_key}:missed`;

      // Before window end: no surface anywhere.
      for (const client of [A, B, cora]) {
        const feed = await attention(client, h);
        assert.eq("miss (before window end)", missedRows(feed, missKey).length, 0, "no miss surface before the window closes");
      }
      const outFeed0 = await attention(outsider, h);
      assert.eq("miss (outsider, before)", missedRows(outFeed0, missKey).length, 0, "outsider sees nothing");

      // Window ends Mon 22:00 ET = Tue 02:00Z. Tick at 02:01Z.
      await setClock(ctx, "2026-10-27T02:01:00Z");
      await tick(ctx);
      for (const [client, name] of [[A, "Ana"], [B, "Ben"], [cora, "Cora"]]) {
        const feed = await attention(client, h);
        const rows = missedRows(feed, missKey);
        assert.eq(`miss surface (${name})`, rows.length, 1, `${name} has exactly one miss row`);
        assert.check(`miss surface (${name})`, (rows[0]?.title || "").includes("No check-in logged"),
          "miss copy states the window fact, never a judgment");
      }
      const outFeed = await attention(outsider, h);
      assert.eq("miss surface (outsider)", missedRows(outFeed, missKey).length, 0, "the miss surfaces to exactly the set and nobody else");

      // Re-tick 5x: still exactly one, surfaced_at unchanged.
      view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      const surfacedAt = view.check_ins.find((c) => c.occurrence_key === miss.occurrence_key)?.missed_surfaced_at;
      assert.check("miss (stamped)", !!surfacedAt, "missed_surfaced_at stamped exactly once");
      for (let i = 0; i < 5; i++) await tick(ctx);
      for (const client of [A, B, cora]) {
        const feed = await attention(client, h);
        assert.eq("miss (no re-surface)", missedRows(feed, missKey).length, 1, "later ticks never re-surface the same miss");
      }
      view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      assert.eq("miss (stamp stable)", view.check_ins.find((c) => c.occurrence_key === miss.occurrence_key)?.missed_surfaced_at,
        surfacedAt, "missed_surfaced_at never moves");

      // Late cover by Cora retracts the surface for everyone.
      await setClock(ctx, "2026-10-27T13:00:00Z"); // Tue 09:00 ET
      const cover = await cora.post(`/care-rotations/${rid}/check-ins/${miss.occurrence_key}/complete`, {});
      assert.eq("cover late", cover.status, 200, "any member can cover a missed occurrence");
      assert.eq("cover late", cover.json.check_in?.status, "covered", "late completion by a non-assignee is covered");
      assert.eq("cover late", cover.json.check_in?.done_by_user_id, coraId, "cover records who actually checked in");
      for (const client of [A, B, cora]) {
        const feed = await attention(client, h);
        assert.eq("cover late (retract)", missedRows(feed, missKey).length, 0, "late cover resolves the miss row for the whole set");
      }

      // -- End mid-window: no miss ever surfaces for the open window -------
      await setClock(ctx, "2026-10-27T22:05:00Z"); // Tue 18:05 ET, Cora's turn
      await tick(ctx);
      const ended = await A.post(`/care-rotations/${rid}/end`, {});
      assert.eq("POST end (admin)", ended.status, 200, "admin ends the rotation");
      const endByMember = await B.post(`/care-rotations/${rid}/end`, {});
      assert.check("POST end (non-admin)", endByMember.status >= 400, "only the admin ends a rotation");
      await setClock(ctx, "2026-10-28T03:00:00Z"); // past Tue window end
      await tick(ctx);
      view = (await A.get(`/care-rotations/${rid}`)).json.rotation;
      const tue = view.check_ins.find((c) => c.occurrence_key.endsWith("2026-10-27"));
      assert.eq("end mid-window", tue?.status, "cancelled", "open occurrence is cancelled when the rotation ends");
      for (const client of [A, B, cora]) {
        const feed = await attention(client, h);
        assert.eq("end mid-window (no miss)", missedRows(feed, `care:${tue.occurrence_key}:missed`).length, 0,
          "an ended rotation never surfaces a miss for its last window");
      }
    } finally {
      await devPost(ctx, "/dev/clock", { clear: true });
    }
  },
};
