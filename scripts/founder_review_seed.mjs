#!/usr/bin/env node
/**
 * Seed coherent Home / Maya / Jordan / Friends stories for PR #112 review.
 * Requires local API at API_BASE (default http://127.0.0.1:4000).
 *
 * Usage:
 *   node scripts/founder_review_seed.mjs
 *
 * Prints the founder account phone + verify code path (synthetic fixtures).
 */

const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");

const FOUNDER = {
  phone: "+12025550101",
  name: "Founder Review",
  handle: "founder_rev",
  codeHint: "111111",
};
const MAYA = { phone: "+12025550102", name: "Maya Chen", handle: "maya_rev", codeHint: "222222" };
const JORDAN = {
  phone: "+12025550103",
  name: "Jordan Lee",
  handle: "jordan_rev",
  codeHint: "333333",
};
const FRIEND = {
  phone: "+12025550104",
  name: "Chris Park",
  handle: "chris_rev",
  codeHint: "444444",
};

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || res.statusText || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function activate(user) {
  const ch = await json("/api/v1/product/activation/challenges", {
    method: "POST",
    body: JSON.stringify({
      otp_consent_accepted: true,
      phone: user.phone,
      device_label: `${user.handle}-review`,
      idempotency_key: `rev-ch-${user.handle}-${Date.now()}`,
    }),
  });
  const code = ch.development_code || user.codeHint;
  const verified = await json("/api/v1/product/activation/verify", {
    method: "POST",
    body: JSON.stringify({
      challenge_id: ch.challenge.id,
      code,
      display_name: user.name,
      handle_hint: user.handle,
      device_label: `${user.handle}-review`,
      platform: "web",
      include_bearer: true,
    }),
  });
  return {
    token: verified.session?.access_token,
    userId: verified.user?.id,
    name: verified.user?.display_name || user.name,
  };
}

async function inviteAccept(fromToken, toUser) {
  const inv = await json("/api/v1/product/invitations", {
    method: "POST",
    bearer: fromToken,
    body: JSON.stringify({
      phone: toUser.phone,
      label: toUser.name,
      message: `Review with ${toUser.name}`,
      idempotency_key: `rev-inv-${toUser.handle}-${Date.now()}`,
    }),
  });
  const to = await activate(toUser);
  const accepted = await json(`/api/v1/product/invitations/${inv.invitation.id}/accept`, {
    method: "POST",
    bearer: to.token,
    body: JSON.stringify({}),
  });
  const conversationId = accepted.establishment?.conversation_id;
  if (!conversationId) throw new Error("No conversation after accept");
  return { conversationId, peer: to };
}

async function send(token, conversationId, body, tag) {
  return json(`/api/v1/product/conversations/${conversationId}/messages`, {
    method: "POST",
    bearer: token,
    body: JSON.stringify({
      body,
      client_message_id: `rev-${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    }),
  });
}

async function main() {
  console.log(`API ${API}`);
  await json("/health").catch(async () => {
    // some builds only expose /api health
    const r = await fetch(`${API}/health`);
    if (!r.ok) throw new Error(`API not healthy at ${API}`);
  });

  const founder = await activate(FOUNDER);
  console.log("Founder activated:", founder.name);

  // Maya — coffee story
  const maya = await inviteAccept(founder.token, MAYA);
  await send(founder.token, maya.conversationId, "Coffee Tuesday?", "maya1");
  await send(maya.peer.token, maya.conversationId, "Tuesday 10:30 AM works for me.", "maya2");
  await send(
    founder.token,
    maya.conversationId,
    "Harbor Table is perfect. I'm in.",
    "maya3",
  );
  await send(maya.peer.token, maya.conversationId, "Works for me. See you at Harbor Table.", "maya4");

  // Jordan — dinner, place still open
  const jordan = await inviteAccept(founder.token, JORDAN);
  await send(founder.token, jordan.conversationId, "We should get dinner Thursday.", "j1");
  await send(
    jordan.peer.token,
    jordan.conversationId,
    "I'm free after 6:30. Does Thursday work?",
    "j2",
  );
  await send(founder.token, jordan.conversationId, "I'm in.", "j3");
  await send(jordan.peer.token, jordan.conversationId, "Works for me.", "j4");

  // Friends group proxy — Saturday dinner; Harbor Table decided.
  const friends = await inviteAccept(founder.token, FRIEND);
  await send(
    founder.token,
    friends.conversationId,
    "Saturday dinner with the group after 7?",
    "f1",
  );
  await send(
    friends.peer.token,
    friends.conversationId,
    "Harbor Table still open if we want a table for 5.",
    "f2",
  );
  await send(founder.token, friends.conversationId, "I'm in. Harbor Table works.", "f3");
  await send(
    friends.peer.token,
    friends.conversationId,
    "Works for me. Harbor Table Saturday after 7.",
    "f4",
  );

  // Incomplete possibility — intent only, no overstatement
  await send(
    founder.token,
    jordan.conversationId,
    "We should do something Italian but I don't know where yet.",
    "j5-incomplete",
  );

  console.log("\n=== FOUNDER REVIEW LOGIN (V2 coded experience) ===");
  console.log(`Phone: ${FOUNDER.phone}`);
  console.log(`Synthetic code: ${FOUNDER.codeHint}`);
  console.log("Skip walkthrough → activate → Home first.");
  console.log("\nSeeded journeys:");
  console.log("  A Maya     — coffee Tue 10:30 · Harbor Table (settled)");
  console.log("  B Jordan   — dinner Thu after 6:30 · place open (curate)");
  console.log("  C Friends  — Saturday dinner · Harbor Table (group)");
  console.log("Click Home presence → chat → Plans → Curate/Extend where offered.");
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message, e.body || "");
  process.exit(1);
});
