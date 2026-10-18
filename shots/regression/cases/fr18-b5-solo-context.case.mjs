/**
 * FR-18-B5B - Solo context (Repair #18 Division B, track B5b).
 *
 * Transcribed from coordination/repair18/track-b4-b5-care-contexts.md
 * section 5, Scenario C:
 *  - Solo is a derived read-time predicate (no contacts, no pod), never
 *    a stored trait and never a user-facing label.
 *  - C1 (release gate): never opted in / opted out => total silence -
 *    zero proactive threads, zero Center rows, zero budget slots, zero
 *    nudges, across 14 simulated days of producer runs.
 *  - C2: opted in => exactly one solo_check_in thread inside quiet-hours
 *    law, reason-first copy with NO banned word (lonely / alone / solo /
 *    "no one" / wellbeing framing), no repeat for 7 days, second thread
 *    lawful on day 8; opting out mid-week restores total silence.
 *  - C3: suggestion ordering biases group/virtual above 1:1 for solo
 *    users only; the moment a first contact is accepted the predicate
 *    stops and both rhythm and bias stop with it.
 *  - Adversarial: a user WITH contacts gets neither; a pod-of-1 declarer
 *    gets neither (pod context wins).
 *
 * The producers run through the dev-only context sweep (the same
 * functions MemoryHourlyWorker / the rhythm caller invoke). The clock
 * is pinned through the canonical clock_override seam. No sleeps.
 */
import { freshSyntheticClient } from "../lib/harness.mjs";

const DEV = "/api/v1";
const BANNED = ["lonely", "alone", "solo", "no one", "just checking you"];

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

async function sweep(ctx, userId) {
  const r = await devPost(ctx, "/dev/context-sweep", { user_id: userId });
  if (r.status !== 200) throw Object.assign(new Error(`dev sweep failed: ${r.status}`), { harness: true });
  return r.json;
}

async function soloThreads(client, ctx) {
  const conv = await client.get("/opal/conversation");
  const msgs = conv.json.conversation?.messages || [];
  return msgs.filter((m) => (m.metadata?.trigger === "solo_check_in") || (m.body || "").includes("no plans on the horizon"));
}

export default {
  id: "FR-18-B5B",
  title: "Solo context: silence without opt-in; a 7-day check-in rhythm with it; bias exits with the first contact",
  theme: "solo-context",
  class: "B",
  surfaces: [
    "GET /context",
    "POST /context/proactive-opt-in",
    "GET /opal/conversation",
    "GET /attention",
    "GET /context/suggestion-order",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw Object.assign(new Error("FR-18-B5B needs session B"), { harness: true });
    const rin = await freshSyntheticClient(ctx.config, "+12025550107", `Rin ${ctx.tag}`);
    if (!rin) throw Object.assign(new Error("FR-18-B5B needs synthetic provisioning for Rin"), { harness: true });
    const rinId = rin.session.userId;
    // Established maturity provisioning (see FR-18-B4) — C1's silence
    // assertions are about the OPT-IN gate, which is checked before
    // the budget, so they hold exactly as written.
    await setMaturity(ctx, rinId);

    // Rin is active in Opal (7-day activity gate) via a real Center send.
    await setClock(ctx, "2026-10-19T18:00:00Z"); // Mon 11:00 PDT
    try {
      await h.centerSend(rin, ctx.marker("solo activity"));
      let context = (await rin.get("/context")).json.context;
      assert.eq("GET /context (Rin)", context?.context_kind, "solo", "a user with no contacts and no pod reads as solo context");
      assert.check("GET /context (no label leak)", !JSON.stringify(context).toLowerCase().includes("lonely"),
        "the context contract never labels the person");

      // -- C1: never opted in => 14 days of total silence -------------------
      for (let d = 0; d < 14; d++) {
        const day = new Date(Date.UTC(2026, 9, 19 + d, 18, 0, 0)).toISOString().replace(".000Z", "Z");
        await setClock(ctx, day);
        const s = await sweep(ctx, rinId);
        assert.eq(`C1 day ${d + 1} (producer)`, s.solo?.status, "suppressed", "rhythm producer suppresses without opt-in");
        assert.eq(`C1 day ${d + 1} (reason)`, s.solo?.reason, "proactive_threads_not_enabled",
          "the opt-in gate is checked before any other work");
      }
      let threads = await soloThreads(rin, ctx);
      assert.eq("C1 (threads)", threads.length, 0, "zero proactive threads across 14 days");
      const feed1 = (await rin.get("/attention")).json;
      const allRows = [...(feed1.needs_you || []), ...(feed1.waiting || []), ...(feed1.updated || [])];
      assert.eq("C1 (center rows)", allRows.filter((i) => (i.dedupe_key || "").includes("solo")).length, 0,
        "zero solo AttentionCenter rows");
      const ctxAfterC1 = (await rin.get("/context")).json.context;
      assert.eq("C1 (budget)", ctxAfterC1.attention_slots_used_today, 0, "zero AttentionBudget slots consumed");

      // -- Suggestion bias while solo (C3, first half) ----------------------
      // The candidate pool is real held data: three open plans Rin made -
      // a 1:1, a group plan, and a virtual plan, in that creation order.
      const sam = await freshSyntheticClient(ctx.config, "+12025550103", `Sam ${ctx.tag}`);
      const jo = await freshSyntheticClient(ctx.config, "+12025550104", `Jo ${ctx.tag}`);
      if (!sam || !jo) throw Object.assign(new Error("FR-18-B5B needs synthetic provisioning for pool members"), { harness: true });
      const mk = (attrs) => rin.post("/plans/from-context", { context: "none", ...attrs });
      assert.eq("C3 (pool 1:1)", (await mk({ title: `Duo ${ctx.tag}`, participant_user_ids: [rinId, B.session.userId] })).status, 201, "1:1 plan created");
      assert.eq("C3 (pool group)", (await mk({ title: `Crew ${ctx.tag}`, participant_user_ids: [rinId, B.session.userId, sam.session.userId, jo.session.userId] })).status, 201, "group plan created");
      assert.eq("C3 (pool virtual)", (await mk({ title: `Online ${ctx.tag}`, plan_type: "virtual" })).status, 201, "virtual plan created");
      const order1 = (await rin.get("/context/suggestion-order")).json;
      const kinds1 = (order1.candidates || []).map((c) => c.shape);
      assert.check("C3 (pool)", JSON.stringify(kinds1.slice().sort()) === JSON.stringify(["group", "one_to_one", "virtual"]),
        `the candidate pool carries all three shapes (got ${JSON.stringify(kinds1)})`);
      assert.check("C3 (bias)", kinds1.indexOf("one_to_one") === kinds1.length - 1,
        "for a solo user the 1:1 candidate sorts last - group and virtual above it");
      assert.eq("C3 (count)", kinds1.length, 3, "bias reorders only - the batch size is unchanged");

      // -- C2: opted in => one thread, 7-day gate, day-8 second -------------
      const opt = await rin.post("/context/proactive-opt-in", { enabled: true });
      assert.eq("POST /context/proactive-opt-in", opt.status, 200, "Rin opts in to proactive threads");
      await setClock(ctx, "2026-11-02T18:00:00Z"); // Mon 10:00 PST, inside 8-22
      await h.centerSend(rin, ctx.marker("solo activity 2"));
      let s = await sweep(ctx, rinId);
      assert.eq("C2 (first thread)", s.solo?.status, "initiated", "first eligible sweep opens exactly one check-in thread");
      threads = await soloThreads(rin, ctx);
      assert.eq("C2 (thread count)", threads.length, 1, "exactly one solo_check_in thread");
      const body = (threads[0]?.body || "").toLowerCase();
      for (const word of BANNED) {
        assert.check("C2 (copy law)", !body.includes(word), `check-in copy must never contain "${word}"`);
      }
      assert.check("C2 (reason first)", body.includes("reason"), "the opening carries its reason first (module law)");

      for (let d = 1; d <= 6; d++) {
        const day = new Date(Date.UTC(2026, 10, 2 + d, 18, 0, 0)).toISOString().replace(".000Z", "Z");
        await setClock(ctx, day);
        s = await sweep(ctx, rinId);
        assert.eq(`C2 day +${d} (7-day gate)`, s.solo?.reason, "rhythm_window", "no repeat inside the 7-day rhythm window");
      }
      threads = await soloThreads(rin, ctx);
      assert.eq("C2 (still one)", threads.length, 1, "still exactly one thread after 6 more days");

      await setClock(ctx, "2026-11-10T18:00:00Z"); // day 8
      s = await sweep(ctx, rinId);
      assert.eq("C2 (day 8)", s.solo?.status, "initiated", "a second thread is lawful on day 8");
      threads = await soloThreads(rin, ctx);
      assert.eq("C2 (two threads)", threads.length, 2, "two threads total after day 8");

      // Opt out mid-week: total silence again.
      const optOut = await rin.post("/context/proactive-opt-in", { enabled: false });
      assert.eq("POST /context/proactive-opt-in (off)", optOut.status, 200, "Rin opts back out");
      await setClock(ctx, "2026-11-18T18:00:00Z"); // day 16 - past the rhythm window
      s = await sweep(ctx, rinId);
      assert.eq("C2 (opt-out silence)", s.solo?.status, "suppressed", "opt-out restores total silence");
      threads = await soloThreads(rin, ctx);
      assert.eq("C2 (no third thread)", threads.length, 2, "no thread opens after opt-out");

      // -- C3 exit: first accepted contact ends solo -------------------------
      await rin.post("/context/proactive-opt-in", { enabled: true });
      const link = await rin.request("PUT", `/relationships/${B.session.userId}`, { type: "friend" });
      assert.check("C3 (contact link)", [200, 201].includes(link.status), "Rin records a first contact (typed relationship)");
      context = (await rin.get("/context")).json.context;
      assert.check("C3 (predicate off)", context?.context_kind !== "solo", "solo context ends the moment Opal holds someone for Rin");
      const order2 = (await rin.get("/context/suggestion-order")).json;
      const kinds2 = (order2.candidates || []).map((c) => c.shape);
      assert.check("C3 (bias off)", JSON.stringify(kinds2) === JSON.stringify(["one_to_one", "group", "virtual"]),
        "ordering returns to natural once solo ends");
      await setClock(ctx, "2026-11-26T18:00:00Z");
      s = await sweep(ctx, rinId);
      assert.eq("C3 (rhythm off)", s.solo?.reason, "not_solo", "the rhythm producer never fires for a non-solo user, opt-in or not");
    } finally {
      await devPost(ctx, "/dev/clock", { clear: true });
    }
  },
};
