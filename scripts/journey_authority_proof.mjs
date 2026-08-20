/**
 * Graph → Journey authority API proof.
 * HOLD. DO NOT MERGE.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/social-flow-final-convergence");
mkdirSync(OUT, { recursive: true });

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || body.message || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function main() {
  const result = {
    at: new Date().toISOString(),
    founderResetUrl: "http://127.0.0.1:5173/?opal_reset_first_run=1",
    assertions: {},
  };
  let passed = 0;
  let failed = 0;
  const assert = (name, ok, detail) => {
    result.assertions[name] = { ok: !!ok, detail: detail ?? null };
    if (ok) passed += 1;
    else failed += 1;
  };

  const A = await activate({
    phone: "+12025550101",
    name: "Founder Review",
    handle: "founder_rev",
    code: "111111",
  });
  const B = await activate({
    phone: "+12025550103",
    name: "Jordan Lee",
    handle: "jordan_rev",
    code: "333333",
  });
  const E = await activate({
    phone: "+12025550108",
    name: "Unauthorized Eve",
    handle: "eve_rev",
    code: "888888",
  });

  const direct = await json("/api/v1/product/conversations/direct", {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({ peer_user_id: B.userId }),
  });
  assert("ensure_direct", !!direct.conversation_id, direct);

  const act = await json("/api/v1/product/journeys/activate", {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({
      conversation_id: direct.conversation_id,
      title: "Juniper & Ivy",
      location: "Juniper & Ivy",
      time_label: "Saturday · 7:30 PM",
      travel_minutes: 18,
    }),
  });
  const journey = act.journey;
  assert("activate_journey", !!journey?.plan_id && journey.lineage?.same_reality === true, journey);
  assert("leave_not_fabricated", journey.leave?.fabricated === false, journey.leave);
  assert("traffic_not_claimed", journey.leave?.traffic_aware === false, journey.leave);
  assert("maps_available", journey.navigation?.available === true, journey.navigation);
  assert("reservation_not_live", /NOT_CLAIMED/i.test(String(journey.reservation?.live_execution)), journey.reservation);
  assert("viewer_is_lead", journey.viewer?.is_lead === true, journey.viewer);

  const planId = journey.plan_id;

  // Add B to journey
  const add = await json(`/api/v1/product/journeys/${planId}/add-people`, {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({ peer_user_ids: [B.userId] }),
  });
  assert("add_people_no_chat_widen", add.widens_chat_automatically === false, add);

  await json(`/api/v1/product/journeys/${planId}/reconfirm`, {
    method: "POST",
    bearer: B.token,
    body: "{}",
  });

  // B cannot material-change
  let denied = false;
  try {
    await json(`/api/v1/product/journeys/${planId}/material-change`, {
      method: "POST",
      bearer: B.token,
      body: JSON.stringify({ time_label: "Saturday · 9:00 PM" }),
    });
  } catch (e) {
    denied = e.status === 403 || /DENIED|forbidden/i.test(String(e.message));
  }
  assert("non_lead_change_denied", denied);

  const changed = await json(`/api/v1/product/journeys/${planId}/material-change`, {
    method: "POST",
    bearer: A.token,
    body: JSON.stringify({ time_label: "Saturday · 9:00 PM" }),
  });
  assert("lead_material_change", changed.requires_reconfirmation === true, changed);

  const cant = await json(`/api/v1/product/journeys/${planId}/cant-make-it`, {
    method: "POST",
    bearer: B.token,
    body: JSON.stringify({ note: "conflict" }),
  });
  assert("cant_make_it_solo", cant.cancels_everyone === false, cant);

  let strangerDenied = false;
  try {
    await json(`/api/v1/product/journeys/${planId}`, { bearer: E.token });
  } catch (e) {
    strangerDenied = e.status === 403 || e.status === 404 || /DENIED|forbidden|not_found/i.test(String(e.message));
  }
  assert("stranger_denied", strangerDenied);

  result.browserAssertions = { passed, failed, total: passed + failed };
  result.verdict = failed === 0 ? "HOLD_JOURNEY_PASS" : "HOLD_JOURNEY_PARTIAL";
  writeFileSync(resolve(OUT, "BROWSER_PROOF_JOURNEY_AUTHORITY.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
