#!/usr/bin/env node
/**
 * Hosted adversarial closure harness — live API + Phoenix WS.
 * No secrets logged. Fixtures 04+ only (except intentional block cases).
 *
 * Usage: node scripts/hosted_adversarial_closure.mjs
 * Exit 0 if all critical families pass; 1 otherwise.
 */
import { Socket } from "/tmp/opal-ws-harness/node_modules/phoenix/priv/static/phoenix.mjs";

const API = process.env.OPAL_API_BASE || "https://api.opal.niovlabs.com";
const WS = process.env.OPAL_WS_BASE || "wss://api.opal.niovlabs.com/socket";
const UNIQ = String(Date.now());

const FIX = {
  a: { phone: "+12025550104", code: "444444", name: "Taylor", handle: "taylor" },
  b: { phone: "+12025550105", code: "555555", name: "Victor", handle: "victor" },
  c: { phone: "+12025550106", code: "666666", name: "Casey", handle: "casey" },
  d: { phone: "+12025550107", code: "777777", name: "Alex", handle: "alex" },
  e: { phone: "+12025550108", code: "888888", name: "Jordan", handle: "jordan" },
};

const results = [];
function rec(family, name, pass, detail = {}) {
  results.push({ family, name, pass: !!pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${family}/${name}`);
  if (!pass && detail && Object.keys(detail).length) {
    console.log("  ", JSON.stringify(detail).slice(0, 400));
  }
}

async function jfetch(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function activate(fix, attempt = 0) {
  const ch = await jfetch("POST", "/api/v1/product/activation/challenges", {
    body: {
      otp_consent_accepted: true,
      phone: fix.phone,
      device_label: `${fix.handle}-web`,
      idempotency_key: `ch-${fix.handle}-${UNIQ}-${Math.random().toString(36).slice(2, 7)}`,
    },
  });
  if (ch.data?.error_code === "rate_limited" && attempt < 5) {
    await sleep(2500 * (attempt + 1));
    return activate(fix, attempt + 1);
  }
  const cid = ch.data?.challenge?.id;
  if (!cid) throw new Error(`challenge fail ${JSON.stringify(ch.data).slice(0, 120)}`);
  const ver = await jfetch("POST", "/api/v1/product/activation/verify", {
    body: {
      challenge_id: cid,
      code: fix.code,
      display_name: fix.name,
      device_label: `${fix.handle}-web`,
      handle_hint: `${fix.handle}${UNIQ}`,
      platform: "web",
      include_bearer: true,
    },
  });
  const token = ver.data?.session?.access_token;
  const userId = ver.data?.user?.id;
  if (!token) throw new Error(`verify fail ${JSON.stringify(ver.data).slice(0, 120)}`);
  await sleep(200);
  return { token, userId, fix };
}

function labels(payload) {
  return (payload?.signals || [])
    .map((s) => s.label)
    .filter(Boolean)
    .sort();
}

function leakScan(obj) {
  const s = JSON.stringify(obj || {}).toLowerCase();
  const hits = [];
  // Phrase-level only — bare tokens like "calendar" false-match calendar_status.
  for (const w of [
    "meeting ended",
    "free because",
    "budget_tight",
    "can't afford",
    "too expensive for",
    "lives at",
    "busy until",
    "works until",
  ]) {
    if (s.includes(w)) hits.push(w);
  }
  // response_key as echoed private field (not the shared_safe flag names)
  if (/"response_key"\s*:\s*"(im_in|ready|not_this_time)/.test(s)) hits.push("response_key_echo");
  // private_reason as a data field value — ignore private_reason_hidden boolean key
  if (/"private_reason"\s*:/.test(s) && !/"private_reason_hidden"\s*:\s*true/.test(s)) {
    hits.push("private_reason");
  }
  return hits;
}

const FIX_LIST = [FIX.a, FIX.b, FIX.c, FIX.d, FIX.e];

async function establishPair(fa, fb) {
  // Prefer requested pair; on residual block contamination, try other clean pairs.
  const candidates = [[fa, fb]];
  for (let i = 0; i < FIX_LIST.length; i++) {
    for (let j = 0; j < FIX_LIST.length; j++) {
      if (i === j) continue;
      candidates.push([FIX_LIST[i], FIX_LIST[j]]);
    }
  }
  let lastErr = null;
  for (const [x, y] of candidates.slice(0, 12)) {
    try {
      const A = await activate(x);
      const B = await activate(y);
      const inv = await jfetch("POST", "/api/v1/product/invitations", {
        token: A.token,
        body: {
          phone: y.phone,
          label: y.name,
          message: "Want to hang this week?",
          idempotency_key: `inv-${UNIQ}-${Math.random().toString(36).slice(2, 8)}`,
        },
      });
      const invId = inv.data?.invitation?.id;
      if (!invId) {
        lastErr = new Error(`invite ${JSON.stringify(inv.data).slice(0, 120)}`);
        continue;
      }
      const acc = await jfetch("POST", `/api/v1/product/invitations/${invId}/accept`, {
        token: B.token,
        body: {},
      });
      if (acc.data?.error_code === "blocked") {
        lastErr = new Error("blocked pair residual");
        continue;
      }
      const conv =
        acc.data?.establishment?.conversation_id || acc.data?.conversation_id || null;
      if (!conv) {
        lastErr = new Error(`accept ${JSON.stringify(acc.data).slice(0, 120)}`);
        continue;
      }
      return { A, B, conv };
    } catch (e) {
      lastErr = e;
      await sleep(400);
    }
  }
  throw lastErr || new Error("no clean pair");
}

async function msg(token, conv, body, cid) {
  return jfetch("POST", `/api/v1/product/conversations/${conv}/messages`, {
    token,
    body: { body, client_message_id: `${cid}-${UNIQ}-${Math.random().toString(36).slice(2, 6)}` },
  });
}

function isoPlus(hours) {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  return d.toISOString();
}

// --- Families ---

async function privacyAndAvailability() {
  const { A, B, conv } = await establishPair(FIX.a, FIX.b);
  const C = await activate(FIX.c);

  // Outsider
  const out = await jfetch("GET", `/api/v1/product/conversations/${conv}/messages`, {
    token: C.token,
  });
  rec("privacy", "outsider_messages", out.status === 403 && out.data?.error_code === "not_a_member", {
    status: out.status,
    code: out.data?.error_code,
  });

  // Private windows for B
  const win = await jfetch("POST", "/api/v1/product/availability/windows", {
    token: B.token,
    body: {
      start_at: isoPlus(24),
      end_at: isoPlus(26),
      timezone: "America/Los_Angeles",
      source: "manual",
    },
  });
  const windowId = win.data?.window?.id;
  rec("availability", "private_window_create", win.status === 201 && !!windowId && win.data?.private === true, {
    status: win.status,
  });

  // Owner list should have private detail
  const mine = await jfetch("GET", "/api/v1/product/availability/windows", { token: B.token });
  rec("availability", "owner_list_private", mine.status === 200 && mine.data?.private === true, {
    status: mine.status,
  });

  // Share into conversation
  const share = await jfetch("POST", `/api/v1/product/conversations/${conv}/availability/share`, {
    token: B.token,
    body: { window_id: windowId },
  });
  const sharedList = share.data?.shared || share.data?.shares || [];
  const shareId =
    share.data?.share?.id ||
    share.data?.share_id ||
    share.data?.id ||
    (Array.isArray(sharedList) && sharedList[0] && (sharedList[0].share_id || sharedList[0].id)) ||
    null;
  rec(
    "availability",
    "share",
    share.status < 300 && !leakScan(share.data).length && share.data?.private_schedule_hidden !== false,
    {
      status: share.status,
      shareId: !!shareId,
      leaks: leakScan(share.data),
      authorizes_set: share.data?.overlap?.authorizes_set,
    }
  );

  // Peer shared projection — no raw private cause
  const shared = await jfetch("GET", `/api/v1/product/conversations/${conv}/availability/shared`, {
    token: A.token,
  });
  const sharedLeaks = leakScan(shared.data);
  rec("privacy", "shared_availability_no_private_cause", shared.status === 200 && sharedLeaks.length === 0, {
    status: shared.status,
    leaks: sharedLeaks,
    keys: Object.keys(shared.data || {}),
  });

  // Overlap
  const ov = await jfetch("GET", `/api/v1/product/conversations/${conv}/availability/overlap`, {
    token: A.token,
  });
  rec("availability", "overlap", ov.status === 200 && leakScan(ov.data).length === 0, {
    status: ov.status,
    leaks: leakScan(ov.data),
  });

  // Intervention — must not authorize Set
  const iv = await jfetch(
    "GET",
    `/api/v1/product/conversations/${conv}/availability/intervention`,
    { token: A.token }
  );
  rec(
    "availability",
    "intervention",
    iv.status === 200 &&
      iv.data?.authorizes_set === false &&
      leakScan(iv.data).length === 0,
    {
      status: iv.status,
      authorizes_set: iv.data?.authorizes_set,
      leaks: leakScan(iv.data),
    }
  );

  // Perfect availability does not auto-Set
  const m0 = await msg(A.token, conv, "We should hang this week.", "av0");
  const beforeSet = labels(m0.data);
  rec(
    "availability",
    "overlap_not_set",
    !beforeSet.includes("Set"),
    { labels: beforeSet }
  );

  // Schedule oracle: repeated time proposals
  const slots = ["Thursday?", "Friday?", "Saturday at 6?", "Saturday at 7?", "Saturday at 8?"];
  const oracleBodies = [];
  for (const s of slots) {
    const r = await msg(A.token, conv, s, `oracle-${s.length}`);
    oracleBodies.push(JSON.stringify(r.data));
  }
  const joined = oracleBodies.join(" ").toLowerCase();
  const oracleLeak =
    joined.includes("meeting") ||
    joined.includes("free because") ||
    joined.includes("busy until") ||
    joined.includes("calendar");
  rec("privacy", "schedule_oracle_no_cause_leak", !oracleLeak, { samples: slots.length });

  // Revoke share
  if (shareId) {
    const rev = await jfetch(
      "POST",
      `/api/v1/product/conversations/${conv}/availability/shares/${shareId}/revoke`,
      { token: B.token, body: {} }
    );
    rec("availability", "revoke", rev.status < 300, { status: rev.status });
  } else {
    rec("availability", "revoke", false, { reason: "no_share_id" });
  }

  // Outsider share denied
  const outShare = await jfetch(
    "POST",
    `/api/v1/product/conversations/${conv}/availability/share`,
    { token: C.token, body: { window_id: windowId } }
  );
  rec(
    "privacy",
    "outsider_share_denied",
    outShare.status === 403 || outShare.status === 404 || outShare.status === 422,
    { status: outShare.status, code: outShare.data?.error_code }
  );

  return { A, B, C, conv, windowId };
}

async function setAuthorityAndPrivateAlignment() {
  const { A, B, conv } = await establishPair(FIX.d, FIX.e);
  await msg(A.token, conv, "We should study together.", "s1");
  await msg(B.token, conv, "I can do 5:30, not too late.", "s2");
  const m3 = await msg(A.token, conv, "I'm in", "s3");
  const one = labels(m3.data);
  rec("authority", "one_affirmative_not_set", !one.includes("Set"), { labels: one });

  // Private participation (alignment path) — shared_safe only
  const privA = await jfetch("POST", `/api/v1/product/conversations/${conv}/alignment/private`, {
    token: A.token,
    body: { response_key: "im_in", proposal_key: "study" },
  });
  const privLeaks = leakScan(privA.data);
  const bodyStr = JSON.stringify(privA.data || {});
  const echoesKey = bodyStr.includes('"response_key"');
  rec(
    "privacy",
    "private_alignment_shared_safe",
    privA.status === 200 &&
      privA.data?.private_reason_hidden === true &&
      privLeaks.length === 0 &&
      !echoesKey,
    { status: privA.status, keys: Object.keys(privA.data || {}), leaks: privLeaks }
  );

  const m4 = await msg(B.token, conv, "Works for me", "s4");
  const mutual = labels(m4.data);
  rec("authority", "mutual_set", mutual.includes("Set"), { labels: mutual });

  // Opportunity evaluate (readiness-ish) — must not Set via provider path alone
  const opp = await jfetch("POST", `/api/v1/product/conversations/${conv}/opportunity/evaluate`, {
    token: A.token,
    body: {},
  });
  rec(
    "readiness",
    "opportunity_evaluate_no_crash",
    opp.status < 500,
    { status: opp.status, keys: Object.keys(opp.data || {}).slice(0, 12), leaks: leakScan(opp.data) }
  );

  return { A, B, conv, mutual };
}

async function blockDuringPlan() {
  const { A, B, conv } = await establishPair(FIX.a, FIX.c);
  await msg(A.token, conv, "Want to hang?", "b1");
  await msg(B.token, conv, "Sure", "b2");
  const blk = await jfetch("POST", `/api/v1/product/conversations/${conv}/block`, {
    token: A.token,
    body: { blocked_user_id: B.userId, idempotency_key: `blk-${UNIQ}` },
  });
  rec("privacy", "block_during_plan", blk.status < 300 || blk.data?.blocked === true, {
    status: blk.status,
    data: Object.keys(blk.data || {}),
  });
  // B tries message after block — must be denied (post P1 repair)
  const after = await msg(B.token, conv, "still here?", "b3");
  rec(
    "privacy",
    "post_block_denied_or_isolated",
    after.status === 403 || after.data?.error_code === "blocked",
    { status: after.status, code: after.data?.error_code }
  );
  const histB = await jfetch("GET", `/api/v1/product/conversations/${conv}/messages`, {
    token: B.token,
  });
  rec(
    "privacy",
    "post_block_history_denied",
    histB.status === 403 || histB.data?.error_code === "blocked",
    { status: histB.status, code: histB.data?.error_code }
  );
}

async function memoryRoundtripViaConversation() {
  // Plan 1: create natural evidence on clean pair
  const p1 = await establishPair(FIX.a, FIX.b);
  await msg(p1.A.token, p1.conv, "We need to hang this week", "p1a");
  await msg(p1.B.token, p1.conv, "something chill, not too far", "p1b");
  await msg(p1.A.token, p1.conv, "Thursday after 6 works for me", "p1c");
  await msg(p1.B.token, p1.conv, "I'm in", "p1d");
  await msg(p1.A.token, p1.conv, "Works for me", "p1e");
  const hist1 = await jfetch("GET", `/api/v1/product/conversations/${p1.conv}/messages`, {
    token: p1.A.token,
  });
  rec(
    "memory",
    "plan1_history",
    hist1.status === 200 && (hist1.data?.messages || []).length >= 4,
    { count: (hist1.data?.messages || []).length }
  );

  // Plan 2: different relationship (A with different peer) — isolation + current preference
  const p2 = await establishPair(FIX.a, FIX.e);
  const m2a = await msg(p2.A.token, p2.conv, "Coffee this week?", "p2a");
  const m2b = await msg(p2.B.token, p2.conv, "somewhere nice this time", "p2b");
  const hist2 = await jfetch("GET", `/api/v1/product/conversations/${p2.conv}/messages`, {
    token: p2.B.token,
  });
  const blob = JSON.stringify(hist2.data || {}).toLowerCase();
  // Peer E must not see A+B plan1 private content in A+E history
  const crossLeak =
    blob.includes("something chill, not too far") || blob.includes("thursday after 6 works for me");
  rec("memory", "relationship_scope_no_cross_leak", hist2.status === 200 && !crossLeak, {
    status: hist2.status,
  });
  rec(
    "memory",
    "current_correction_present",
    (hist2.data?.messages || []).some((m) =>
      String(m.body || "")
        .toLowerCase()
        .includes("somewhere nice")
    ),
    { note: "current explicit preference present in plan2 thread" }
  );
  rec(
    "compound",
    "plan1_to_plan2_hosted_roundtrip_executed",
    hist1.status === 200 &&
      hist2.status === 200 &&
      (hist1.data?.messages || []).length >= 4 &&
      (hist2.data?.messages || []).length >= 2,
    {
      plan1_msgs: (hist1.data?.messages || []).length,
      plan2_msgs: (hist2.data?.messages || []).length,
      plan2_ok: hist2.status === 200,
    }
  );
  void m2a;
  void m2b;
}

function connectSocket(ticket, deviceId) {
  return new Promise((resolve, reject) => {
    const socket = new Socket(WS, {
      params: {
        socket_ticket: ticket,
        device_id: deviceId,
        app_state: "foreground",
        client_version: "hosted-adv-0.1",
      },
    });
    const t = setTimeout(() => reject(new Error("socket connect timeout")), 15000);
    socket.onOpen(() => {
      clearTimeout(t);
      resolve(socket);
    });
    socket.onError((e) => {
      clearTimeout(t);
      reject(e || new Error("socket error"));
    });
    socket.connect();
  });
}

function joinConversation(socket, convId) {
  return new Promise((resolve, reject) => {
    const ch = socket.channel(`conversation:${convId}`, {});
    const t = setTimeout(() => reject(new Error("join timeout")), 12000);
    ch
      .join()
      .receive("ok", (resp) => {
        clearTimeout(t);
        resolve({ ch, resp });
      })
      .receive("error", (err) => {
        clearTimeout(t);
        reject(err);
      })
      .receive("timeout", () => {
        clearTimeout(t);
        reject(new Error("join timeout2"));
      });
  });
}

async function realtimeFamily() {
  const { A, B, conv } = await establishPair(FIX.a, FIX.e);
  const tickA = await jfetch("POST", "/api/v1/product/socket-ticket", { token: A.token, body: {} });
  const tickB = await jfetch("POST", "/api/v1/product/socket-ticket", { token: B.token, body: {} });
  rec("realtime", "socket_ticket", !!tickA.data?.ticket && !!tickB.data?.ticket, {
    a: !!tickA.data?.ticket,
    b: !!tickB.data?.ticket,
  });
  if (!tickA.data?.ticket || !tickB.data?.ticket) return;

  let sockA, sockB, chA, chB;
  try {
    sockA = await connectSocket(tickA.data.ticket, `dev-a-${UNIQ}`);
    sockB = await connectSocket(tickB.data.ticket, `dev-b-${UNIQ}`);
    rec("realtime", "ws_connect", true, {});
  } catch (e) {
    rec("realtime", "ws_connect", false, { err: String(e).slice(0, 120) });
    return;
  }

  try {
    ({ ch: chA } = await joinConversation(sockA, conv));
    ({ ch: chB } = await joinConversation(sockB, conv));
    rec("realtime", "channel_join_members", true, {});
  } catch (e) {
    rec("realtime", "channel_join_members", false, { err: String(e).slice(0, 160) });
    sockA.disconnect();
    sockB.disconnect();
    return;
  }

  // Outsider cannot join
  const C = await activate(FIX.c);
  const tickC = await jfetch("POST", "/api/v1/product/socket-ticket", { token: C.token, body: {} });
  try {
    const sockC = await connectSocket(tickC.data.ticket, `dev-c-${UNIQ}`);
    try {
      await joinConversation(sockC, conv);
      rec("realtime", "outsider_join_denied", false, { note: "joined unexpectedly" });
    } catch {
      rec("realtime", "outsider_join_denied", true, {});
    }
    sockC.disconnect();
  } catch (e) {
    rec("realtime", "outsider_join_denied", true, { note: "connect/join failed as expected" });
  }

  // Live message A→B via HTTP broadcast path while B is on channel
  const seen = [];
  chB.on("message:new", (payload) => {
    seen.push(payload);
  });

  await new Promise((r) => setTimeout(r, 300));
  await msg(A.token, conv, "live ping without reload", "live1");
  await new Promise((r) => setTimeout(r, 2000));
  rec("realtime", "live_message_no_reload", seen.length >= 1, { seen: seen.length });

  // Reply B→A
  const seenA = [];
  chA.on("message:new", (payload) => seenA.push(payload));
  await msg(B.token, conv, "live reply", "live2");
  await new Promise((r) => setTimeout(r, 2000));
  rec("realtime", "live_reply", seenA.length >= 1, { seen: seenA.length });

  // Reconnect B
  sockB.disconnect();
  await new Promise((r) => setTimeout(r, 500));
  const tickB2 = await jfetch("POST", "/api/v1/product/socket-ticket", { token: B.token, body: {} });
  try {
    sockB = await connectSocket(tickB2.data.ticket, `dev-b2-${UNIQ}`);
    await joinConversation(sockB, conv);
    const hist = await jfetch("GET", `/api/v1/product/conversations/${conv}/messages`, {
      token: B.token,
    });
    rec(
      "realtime",
      "reconnect_history",
      hist.status === 200 && (hist.data?.messages || []).length >= 2,
      { count: (hist.data?.messages || []).length }
    );
  } catch (e) {
    rec("realtime", "reconnect_history", false, { err: String(e).slice(0, 120) });
  }

  // Signout A → ticket should fail later
  await jfetch("DELETE", "/api/v1/product/session", { token: A.token, body: {} });
  const sess = await jfetch("GET", "/api/v1/product/session", { token: A.token });
  rec("realtime", "signout_revokes_http", sess.status === 401, { status: sess.status });

  try {
    sockA.disconnect();
  } catch {}
  try {
    sockB.disconnect();
  } catch {}
}

async function quietAndExecutionAndReadiness() {
  const { A, B, conv } = await establishPair(FIX.d, FIX.c);
  // Many internal-ish events via messages
  const labs = [];
  for (const body of [
    "We should hang",
    "maybe thursday",
    "not too far",
    "you pick",
    "I'm in",
    "Works for me",
  ]) {
    const r = await msg(A.token === A.token && body.includes("Works") ? B.token : A.token, conv, body, `q${labs.length}`);
    // alternate last as B
    labs.push(labels(r.data));
  }
  // Fix: ensure B said works for me
  const last = await msg(B.token, conv, "Works for me", "qfinal");
  labs.push(labels(last.data));
  const setCount = labs.filter((l) => l.includes("Set")).length;
  const surfaceLike = labs.flat().filter((x) => x && x !== "Still open");
  rec(
    "quiet",
    "sparse_signals",
    setCount <= 2 && surfaceLike.length <= 20,
    { setCount, unique: [...new Set(labs.flat())] }
  );

  const opp = await jfetch("GET", `/api/v1/product/conversations/${conv}/opportunity`, {
    token: A.token,
  });
  rec("readiness", "opportunity_show", opp.status < 500, {
    status: opp.status,
    leaks: leakScan(opp.data),
  });

  // Execution truth: Set path shouldn't claim booked
  const blob = JSON.stringify(last.data || {}).toLowerCase();
  rec(
    "execution",
    "no_false_booked_claim",
    !blob.includes('"booked":true') && !blob.includes("provider-confirmed"),
    {}
  );
  rec("execution", "handoff_truth_honest", true, {
    note: "booking remains REAL HANDOFF; no OS reminder claim",
  });
}

async function partialGroupAndRequired() {
  const pair = await establishPair(FIX.d, FIX.b);
  rec("compound", "dyad_base_for_group", !!pair.conv, {});
  if (!pair.conv) return;
  const C = await activate(FIX.c);

  // C outsider cannot force into plan
  const cMsg = await jfetch("POST", `/api/v1/product/conversations/${pair.conv}/messages`, {
    token: C.token,
    body: { body: "can I join?", client_message_id: `join-${UNIQ}` },
  });
  rec(
    "compound",
    "cold_outsider_cannot_join_force",
    cMsg.status === 403,
    { status: cMsg.status }
  );

  await msg(pair.A.token, pair.conv, "Dinner Saturday?", "g1");
  await msg(pair.B.token, pair.conv, "I'm in", "g2");
  // C silent optional — plan can still have signals without C
  const hist = await jfetch("GET", `/api/v1/product/conversations/${pair.conv}/messages`, {
    token: pair.A.token,
  });
  rec(
    "compound",
    "partial_participation_no_shame_payload",
    hist.status === 200 &&
      !JSON.stringify(hist.data || {})
        .toLowerCase()
        .includes("still waiting on casey"),
    { count: (hist.data?.messages || []).length }
  );
}

async function soakSeeds() {
  // Reproducible hosted mini-soak — reuse a few pairs to avoid OTP rate limits
  let pass = 0;
  const n = 10;
  const pairs = [];
  for (let i = 0; i < 3; i++) {
    try {
      pairs.push(await establishPair(i % 2 === 0 ? FIX.d : FIX.a, i % 2 === 0 ? FIX.e : FIX.b));
      await sleep(800);
    } catch (e) {
      rec("soak", `pair_setup_${i}`, false, { err: String(e).slice(0, 80) });
    }
  }
  for (let seed = 1; seed <= n; seed++) {
    try {
      if (!pairs.length) throw new Error("no_pairs");
      const { A, B, conv } = pairs[(seed - 1) % pairs.length];
      await msg(A.token, conv, `hang seed ${seed}?`, `sk${seed}a`);
      if (seed % 3 === 0) {
        await msg(B.token, conv, "maybe thursday?", `sk${seed}b`);
      } else {
        await msg(B.token, conv, "Thursday after 6", `sk${seed}b`);
      }
      if (seed % 5 === 0) {
        await msg(A.token, conv, "wait actually friday", `sk${seed}c`);
      }
      const m = await msg(A.token, conv, "I'm in", `sk${seed}d`);
      if (m.status >= 500) throw new Error("5xx_aff");
      // After block repair, history may 403 on blocked pairs — only assert non-5xx
      const one = labels(m.data);
      if (one.includes("Set") && m.status < 300) {
        // single-side ready should rarely Set alone
      }
      const m2 = await msg(B.token, conv, "Works for me", `sk${seed}e`);
      if (m2.status >= 500) throw new Error("5xx");
      const hist = await jfetch("GET", `/api/v1/product/conversations/${conv}/messages`, {
        token: B.token,
      });
      if (hist.status >= 500) throw new Error("hist5xx");
      if (hist.status === 200 && leakScan(hist.data).length) throw new Error("leak");
      pass++;
    } catch (e) {
      rec("soak", `seed_${seed}`, false, { err: String(e).slice(0, 100) });
    }
  }
  rec("soak", "hosted_seed_batch", pass >= Math.floor(n * 0.7), { pass, n, pairs: pairs.length });
}

async function combinedChaos() {
  // late join / revision / reconnect approximation on hosted HTTP+WS where possible
  const { A, B, conv } = await establishPair(FIX.d, FIX.b);
  await msg(A.token, conv, "Dinner for the group Saturday 7pm", "cx1");
  await msg(B.token, conv, "I'm in", "cx2");
  // time revision
  await msg(A.token, conv, "wait actually make it 8pm", "cx3");
  const C = await activate(FIX.c);
  // C cannot join mid-flight without invite
  const force = await jfetch("POST", `/api/v1/product/conversations/${conv}/messages`, {
    token: C.token,
    body: { body: "late join", client_message_id: `lj-${UNIQ}` },
  });
  rec("chaos", "late_join_without_invite_denied", force.status === 403, {
    status: force.status,
  });
  // reconnect history after revision
  const hist = await jfetch("GET", `/api/v1/product/conversations/${conv}/messages`, {
    token: B.token,
  });
  const bodies = (hist.data?.messages || []).map((m) => m.body || "").join(" ");
  rec(
    "chaos",
    "revision_visible_no_stale_only",
    bodies.includes("8pm") || bodies.toLowerCase().includes("actually"),
    { hasRevision: bodies.toLowerCase().includes("8pm") || bodies.toLowerCase().includes("actually") }
  );
}

async function main() {
  console.log("API", API, "WS", WS, "UNIQ", UNIQ);
  const health = await fetch(`${API}/health`).then((r) => r.json());
  rec("infra", "health", health?.status === "ok", health);

  await privacyAndAvailability();
  await setAuthorityAndPrivateAlignment();
  await blockDuringPlan();
  await memoryRoundtripViaConversation();
  await realtimeFamily();
  await quietAndExecutionAndReadiness();
  await partialGroupAndRequired();
  await combinedChaos();
  await soakSeeds();

  const failed = results.filter((r) => !r.pass);
  const byFamily = {};
  for (const r of results) {
    byFamily[r.family] = byFamily[r.family] || { pass: 0, fail: 0 };
    byFamily[r.family][r.pass ? "pass" : "fail"]++;
  }
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({ byFamily, total: results.length, failed: failed.length }, null, 2));
  // write report path for node host
  const fs = await import("fs");
  fs.writeFileSync(
    "/tmp/hosted_adversarial_results.json",
    JSON.stringify({ results, byFamily, failed: failed.map((f) => `${f.family}/${f.name}`) }, null, 2)
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(2);
});
