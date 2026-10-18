/**
 * FR-18-B5A - Household pod (Repair #18 Division B, track B5a).
 *
 * Transcribed from coordination/repair18/track-b4-b5-care-contexts.md
 * section 5, Scenario B:
 *  - A pod exists ONLY by declaration + each member's own acceptance.
 *    Invited-but-not-accepted users appear in NO default anywhere.
 *  - The weekly supply suggestion surfaces once (one batched card),
 *    accepting creates ONE ordinary SharedPlan for the whole pod with
 *    the pod's home label; no second card while it is open; dismissal
 *    suppresses for 30 days.
 *  - Pod-context plan defaults carry participants/home/timezone and are
 *    per-create (an edited default is never learned over); an unrelated
 *    conversation gets NO pod defaults; a virtual plan keeps Online.
 *  - Adversarial: a frequent co-planner who was never invited is never
 *    added and never written to; a pod of 1 gets defaults but NO supply
 *    card ever.
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

async function sweep(ctx, userId) {
  const r = await devPost(ctx, "/dev/context-sweep", { user_id: userId });
  if (r.status !== 200) throw Object.assign(new Error(`dev sweep failed: ${r.status}`), { harness: true });
  return r.json;
}

function supplyCards(feed, podId) {
  const all = [...(feed.needs_you || []), ...(feed.waiting || []), ...(feed.updated || [])];
  return all.filter((i) => i.dedupe_key === `pod_supply:${podId}`);
}

export default {
  id: "FR-18-B5A",
  title: "Household pod: declared + accepted only; supply plan and home defaults serve the whole pod",
  theme: "household-pod",
  class: "B",
  surfaces: [
    "POST /households",
    "GET /households/:id",
    "POST /households/:id/accept",
    "GET /context",
    "GET /attention",
    "POST /plans/from-context",
    "GET /opal/plans",
  ],
  async run(ctx) {
    const { A, B, h, assert } = ctx;
    if (!B) throw Object.assign(new Error("FR-18-B5A needs session B"), { harness: true });
    const sam = await freshSyntheticClient(ctx.config, "+12025550103", `Sam ${ctx.tag}`);
    const jo = await freshSyntheticClient(ctx.config, "+12025550104", `Jo ${ctx.tag}`);
    const fifth = await freshSyntheticClient(ctx.config, "+12025550106", `Fifth ${ctx.tag}`);
    if (!sam || !jo || !fifth) throw Object.assign(new Error("FR-18-B5A needs synthetic provisioning"), { harness: true });
    const dev = A.session.userId, priya = B.session.userId, samId = sam.session.userId, joId = jo.session.userId;
    // Established maturity provisioning (see FR-18-B4): the supply
    // card's batch slot is budget-gated by product law.
    await setMaturity(ctx, dev);
    await setMaturity(ctx, fifth.session.userId);
    // Stateful-stack hygiene: fixture accounts persist across runs, so
    // leave every pod from earlier runs before declaring this run's.
    for (const client of [A, B, sam, jo, fifth]) {
      const mine = await client.get("/households");
      for (const podRow of mine.json.households || []) {
        await client.post(`/households/${podRow.id}/leave`, {});
      }
    }

    // Monday 2026-10-19 15:00Z (08:00 PDT - outside quiet hours).
    await setClock(ctx, "2026-10-19T15:00:00Z");
    try {
      // -- B1: declaration + consent ---------------------------------------
      const created = await A.post("/households", {
        label: `Elm Street house ${ctx.tag}`,
        home_label: "Home",
        timezone: "America/Los_Angeles",
        invite_user_ids: [priya, samId, joId],
      });
      assert.eq("POST /households", created.status, 201, "pod declaration succeeds");
      const pod = created.json.household;
      assert.check("POST /households", !!pod?.id, "creation returns the pod contract");
      if (!pod?.id) return;
      const pid = pod.id;
      assert.check("POST /households (invited only)",
        JSON.stringify(pod.active_member_user_ids) === JSON.stringify([dev]),
        "before acceptances only the creator is an active member");
      assert.eq("POST /households (pending)", pod.pending_member_user_ids?.length, 3, "three invites pending");

      // Context projection before acceptances: defaults exclude invitees.
      let context = (await A.get("/context")).json.context;
      assert.check("GET /context (pre-accept)", !!context?.pod, "creator context resolves their pod");
      assert.check("GET /context (pre-accept defaults)",
        JSON.stringify(context.pod.plan_defaults.participant_user_ids) === JSON.stringify([dev]),
        "no default anywhere includes an invited-but-not-accepted user");

      // The fifth co-planner cannot read the pod.
      const fifthRead = await fifth.get(`/households/${pid}`);
      assert.eq("GET /households/:id (non-member)", fifthRead.status, 404, "non-members cannot read a pod");

      for (const [client, name] of [[B, "Priya"], [sam, "Sam"], [jo, "Jo"]]) {
        const acc = await client.post(`/households/${pid}/accept`, {});
        assert.eq(`POST /households/:id/accept (${name})`, acc.status, 200, `${name} accepts their own invite`);
      }
      const after = (await A.get(`/households/${pid}`)).json.household;
      assert.eq("GET /households/:id (active)", after.active_member_user_ids?.length, 4, "four active members after acceptances");
      context = (await A.get("/context")).json.context;
      assert.eq("GET /context (defaults)", context.pod.plan_defaults.participant_user_ids?.length, 4,
        "pod defaults now serve the whole household");

      // Primary flag: creator's pod is primary; a member's context shows
      // the pod only once they make it primary - plan defaults read primary.
      const priyaCtx0 = (await B.get("/context")).json.context;
      assert.check("GET /context (member, not primary)", !priyaCtx0?.pod,
        "membership alone does not hijack a member's defaults - primary is explicit");
      const prim = await B.post(`/households/${pid}/primary`, {});
      assert.eq("POST /households/:id/primary", prim.status, 200, "member can set their primary pod");
      const priyaCtx = (await B.get("/context")).json.context;
      assert.eq("GET /context (member, primary)", priyaCtx.pod?.id, pid, "primary pod drives the member's context");

      // -- B3: home defaults are per-create, edits never learned over ------
      const plan1 = await A.post("/plans/from-context", { context: "pod", title: `Groceries ${ctx.tag}` });
      assert.eq("POST /plans/from-context (pod)", plan1.status, 201, "pod-context plan creation succeeds");
      const p1 = plan1.json.plan;
      assert.eq("pod plan (place)", p1?.location, "Home", "place defaults to the pod home label");
      assert.eq("pod plan (tz)", p1?.timezone, "America/Los_Angeles", "timezone defaults to the pod timezone");
      const p1parts = (p1?.participants || []).map((x) => x.user_id || x).sort();
      assert.check("pod plan (participants)", JSON.stringify(p1parts) === JSON.stringify([dev, priya, samId, joId].sort()),
        "participants default to the whole pod");

      const plan2 = await A.post("/plans/from-context", {
        context: "pod",
        title: `Edited ${ctx.tag}`,
        participant_user_ids: [dev, priya, samId],
        location: "Corner store",
      });
      assert.eq("pod plan (edited place)", plan2.json.plan?.location, "Corner store", "an edited default is honored exactly");
      assert.eq("pod plan (edited parts)", (plan2.json.plan?.participants || []).length, 3, "edited participants honored exactly");

      const plan3 = await A.post("/plans/from-context", { context: "pod", title: `Again ${ctx.tag}` });
      assert.eq("pod plan (defaults not learned over)", (plan3.json.plan?.participants || []).length, 4,
        "the next pod-context create defaults to all 4 again - defaults are per-create");
      assert.eq("pod plan (defaults not learned over)", plan3.json.plan?.location, "Home", "place default restored per-create");

      // Virtual wins over the home label.
      const vplan = await A.post("/plans/from-context", { context: "pod", title: `Call ${ctx.tag}`, plan_type: "virtual" });
      assert.eq("pod plan (virtual)", vplan.json.plan?.plan_type, "virtual", "virtual plan type preserved");
      assert.check("pod plan (virtual place)", !vplan.json.plan?.location || vplan.json.plan.location === "Online",
        "a virtual pod plan does not inherit the home place");

      // No pod defaults from an unrelated context.
      const plain = await A.post("/plans/from-context", { context: "none", title: `Plain ${ctx.tag}` });
      assert.check("plan (no context)", !plain.json.plan?.location, "no pod place leaks into a context-free create");
      assert.eq("plan (no context)", (plain.json.plan?.participants || []).length, 1, "no pod participants leak into a context-free create");

      // -- B2: supply suggestion, once, one plan ----------------------------
      await sweep(ctx, dev);
      let feed = (await A.get("/attention")).json;
      let cards = supplyCards(feed, pid);
      assert.eq("supply card", cards.length, 1, "exactly one batched supply card for the pod creator");
      await sweep(ctx, dev);
      feed = (await A.get("/attention")).json;
      assert.eq("supply card (no duplicate)", supplyCards(feed, pid).length, 1, "producer never duplicates the card");

      const accept = await A.post(`/households/${pid}/supply-plan/accept`, {});
      assert.eq("POST supply-plan/accept", accept.status, 201, "accepting the supply suggestion creates the plan");
      const supply = accept.json.plan;
      assert.check("supply plan (title)", (supply?.title || "").includes("Supply run"), "supply plan carries the supply title");
      assert.eq("supply plan (place)", supply?.location, "Home", "supply plan is at the pod home");
      assert.eq("supply plan (source)", supply?.source, "center", "supply plan is an ordinary center SharedPlan");
      assert.eq("supply plan (participants)", (supply?.participants || []).length, 4, "supply plan serves the whole household");

      await sweep(ctx, dev);
      feed = (await A.get("/attention")).json;
      assert.eq("supply card (open plan blocks)", supplyCards(feed, pid).length, 0, "no second card while the supply plan is open");

      // NowStrip carries the pod context label for a whole-pod plan.
      // The strip is a time surface, so the leg uses a DATED pod plan
      // (the supply plan is honestly undated and appears nowhere on a
      // time strip). The dated plan is placed against the real wall
      // clock the strip reads, not the pinned scenario clock.
      const dated = await A.post("/plans/from-context", {
        context: "pod",
        title: `Dinner ${ctx.tag}`,
        start_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      });
      assert.eq("POST /plans/from-context (dated pod plan)", dated.status, 201, "dated pod plan created");
      const today = await h.calendarToday(A);
      const ev = (today.events || []).find((e) => e.plan_id === dated.json.plan?.id);
      assert.check("NowStrip (pod event)", !!ev, "the dated whole-pod plan appears on the creator's NowStrip");
      assert.check("NowStrip (context label)", (ev?.context_label || "").includes("Elm Street house"),
        "NowStrip names the pod context for a whole-pod plan");

      // -- Pod of 1: defaults yes, supply card never -------------------------
      const soloPod = await fifth.post("/households", { label: `Solo pod ${ctx.tag}`, invite_user_ids: [] });
      assert.eq("POST /households (pod of 1)", soloPod.status, 201, "a declared household of one is lawful");
      const soloPid = soloPod.json.household.id;
      await sweep(ctx, fifth.session.userId);
      const fifthFeed = (await fifth.get("/attention")).json;
      assert.eq("supply card (pod of 1)", supplyCards(fifthFeed, soloPid).length, 0, "a pod of 1 never gets a supply card");
      const fifthCtx = (await fifth.get("/context")).json.context;
      assert.check("GET /context (pod of 1)", fifthCtx.pod?.id === soloPid && fifthCtx.context_kind === "pod",
        "a declared pod of 1 is a pod context, never solo");
      assert.check("adversarial (fifth untouched)", !fifthCtx.pod || fifthCtx.pod.id === soloPid,
        "co-planning with the Elm Street pod never enrolled the fifth user anywhere");
    } finally {
      await devPost(ctx, "/dev/clock", { clear: true });
    }
  },
};
