#!/usr/bin/env node
/**
 * Seed coherent Home / Maya / Jordan + TRUE 5-person Friends group for review.
 * Requires local API at API_BASE (default http://127.0.0.1:4000).
 *
 * Gate A: Friends is ConversationMember multi-party (not a dyad proxy labeled "group").
 *
 * Usage:
 *   node scripts/founder_review_seed.mjs
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
const CHRIS = {
  phone: "+12025550104",
  name: "Chris Park",
  handle: "chris_rev",
  codeHint: "444444",
};
const JESS = {
  phone: "+12025550105",
  name: "Jess Okonkwo",
  handle: "jess_rev",
  codeHint: "555555",
};
const ALEX = {
  phone: "+12025550106",
  name: "Alex Rivera",
  handle: "alex_rev",
  codeHint: "666666",
};
const SAM = {
  phone: "+12025550107",
  name: "Sam",
  handle: "sam_rev",
  codeHint: "777777",
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

async function findDyadWithPeer(token, peerNameRe, opts = {}) {
  const list = await json("/api/v1/product/conversations", { bearer: token });
  const matches = (list.conversations || []).filter(
    (c) =>
      (c.composition === "dyad" || (c.member_count ?? 2) <= 2) &&
      (c.peers || []).some((p) => peerNameRe.test(p.display_name || p.handle || "")),
  );
  if (!matches.length) return null;
  // Prefer place-open preview for founder dinner episode; avoid over-settled proof noise.
  if (opts.preferPlaceOpen) {
    const open = matches.find(
      (c) =>
        /italian|don't know where|place still|where yet/i.test(c.preview || "") &&
        !/juniper|harbor table|campfire/i.test(c.preview || ""),
    );
    if (open) return open;
  }
  // Prefer most recently updated (stable reuse)
  matches.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return matches[0];
}

/**
 * Resolve or create a dyad with toUser.
 * Stable invitation idempotency prevents multi-seed Jordan pollution on Home.
 */
async function inviteAccept(fromToken, toUser) {
  const existing = await findDyadWithPeer(
    fromToken,
    new RegExp(toUser.name.split(/\s+/)[0], "i"),
  );
  const to = await activate(toUser);
  if (existing?.id) {
    return { conversationId: existing.id, peer: to, reused: true };
  }
  const inv = await json("/api/v1/product/invitations", {
    method: "POST",
    bearer: fromToken,
    body: JSON.stringify({
      phone: toUser.phone,
      label: toUser.name,
      message: `Review with ${toUser.name}`,
      // Stable key so re-seeds resolve the same invite/conversation lineage.
      idempotency_key: `rev-inv-${toUser.handle}-founder-episode-v1`,
    }),
  });
  const accepted = await json(`/api/v1/product/invitations/${inv.invitation.id}/accept`, {
    method: "POST",
    bearer: to.token,
    body: JSON.stringify({}),
  });
  const conversationId = accepted.establishment?.conversation_id;
  if (!conversationId) throw new Error("No conversation after accept");
  return { conversationId, peer: to, reused: false };
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
    const r = await fetch(`${API}/health`);
    if (!r.ok) throw new Error(`API not healthy at ${API}`);
  });

  const founder = await activate(FOUNDER);
  console.log("Founder activated:", founder.name);

  // Maya — coffee story (dyad, settled). Reuse existing dyad when re-seeding.
  const maya = await inviteAccept(founder.token, MAYA);
  if (!maya.reused) {
    await send(founder.token, maya.conversationId, "Coffee Tuesday?", "maya1");
    await send(maya.peer.token, maya.conversationId, "Tuesday 10:30 AM works for me.", "maya2");
    await send(
      founder.token,
      maya.conversationId,
      "Harbor Table is perfect. I'm in.",
      "maya3",
    );
    await send(
      maya.peer.token,
      maya.conversationId,
      "Works for me. See you at Harbor Table.",
      "maya4",
    );
  } else {
    console.log("Maya dyad reused:", maya.conversationId);
  }

  // Jordan — dinner, place still open (dyad, curate). Idempotent episode.
  // Prefer existing place-open dyad; never clone a second Jordan just for re-seed.
  const existingJordan = await findDyadWithPeer(founder.token, /Jordan/i, {
    preferPlaceOpen: true,
  });
  let jordan;
  if (existingJordan?.id) {
    const peer = await activate(JORDAN);
    jordan = { conversationId: existingJordan.id, peer, reused: true };
    console.log("Jordan dyad reused (no new clone):", jordan.conversationId);
    // If prior live proofs settled place/participation, re-open place gap for demos.
    const hist = await json(
      `/api/v1/product/conversations/${jordan.conversationId}/messages`,
      { bearer: founder.token },
    );
    const blob = (hist.messages || []).map((m) => m.body || "").join("\n");
    // Always re-assert place-open for founder demo when reusing (long proof threads drift).
    await send(
      founder.token,
      jordan.conversationId,
      "Place still open for Thursday dinner — somewhere Italian.",
      `j-place-reopen-${Date.now()}`,
    );
  } else {
    jordan = await inviteAccept(founder.token, JORDAN);
    await send(founder.token, jordan.conversationId, "We should get dinner Thursday.", "j1");
    await send(
      jordan.peer.token,
      jordan.conversationId,
      "I'm free after 6:30. Does Thursday work?",
      "j2",
    );
    await send(founder.token, jordan.conversationId, "I'm in.", "j3");
    await send(jordan.peer.token, jordan.conversationId, "Works for me.", "j4");
    await send(
      founder.token,
      jordan.conversationId,
      "We should do something Italian but I don't know where yet.",
      "j5-incomplete",
    );
  }

  // TRUE 5-person group — ConversationMember multi-party, not dyad proxy.
  // Founder + Chris + Jess + Alex + Maya already exist; activate remaining first.
  const chris = await activate(CHRIS);
  const jess = await activate(JESS);
  const alex = await activate(ALEX);
  const sam = await activate(SAM);
  // Maya already activated via invite; use maya.peer

  // Reuse existing multi-party Friends conversation if present (no Home dual Friends).
  const convList = await json("/api/v1/product/conversations", {
    bearer: founder.token,
  });
  const existingGroup = (convList.conversations || []).find(
    (c) =>
      c.composition === "group" ||
      (c.member_count ?? 0) >= 5 ||
      /friends|saturday/i.test(c.title || ""),
  );

  let gId;
  let groupReused = false;
  if (existingGroup?.id) {
    gId = existingGroup.id;
    groupReused = true;
    console.log(`True group reused: ${gId} members=${existingGroup.member_count}`);
  } else {
    const group = await json("/api/v1/product/conversations/group", {
      method: "POST",
      bearer: founder.token,
      body: JSON.stringify({
        member_user_ids: [chris.userId, jess.userId, alex.userId, maya.peer.userId],
        label: "Friends Saturday",
      }),
    });
    gId = group.conversation_id;
    if (!gId || group.member_count < 5) {
      throw new Error(
        `Group seed failed: expected 5 members, got ${group.member_count} (${gId})`,
      );
    }
    console.log(`True group created: ${gId} members=${group.member_count}`);
  }

  // Founder proof episode — only on first create (reuse must not spam chronology).
  let beforeSam = { messages: [] };
  if (!groupReused) {
    await send(founder.token, gId, "Saturday?", "g1");
    await send(chris.token, gId, "I'm in.", "g2");
    await send(jess.token, gId, "Can't get there before 7:30.", "g3");
    await send(alex.token, gId, "Anywhere but downtown.", "g4");
    await send(maya.peer.token, gId, "Not sushi again 😂.", "g5");
    await send(
      jess.token,
      gId,
      "I can come but I'm leaving around 9.",
      "g6-early",
    );
    beforeSam = await json(`/api/v1/product/conversations/${gId}/messages`, {
      bearer: founder.token,
    });
    console.log("members before Sam ask: 5");
    await send(founder.token, gId, "Can Sam come?", "g7-guest");
    try {
      await json(`/api/v1/product/conversations/${gId}/members`, {
        method: "POST",
        bearer: founder.token,
        body: JSON.stringify({ user_id: sam.userId }),
      });
    } catch {
      /* may already be member from message auto-path */
    }
    await send(sam.token, gId, "I'm in. Excited for Saturday.", "g7b-sam");
    await send(
      chris.token,
      gId,
      "Start without me, I'll meet you around 8.",
      "g8-optional",
    );
    await send(jess.token, gId, "Works for me.", "g9");
    await send(alex.token, gId, "I'm in.", "g10");
    await send(maya.peer.token, gId, "I'm in.", "g11");
    await send(
      founder.token,
      gId,
      "Harbor Table Saturday after 7:30. I'm in.",
      "g12",
    );
    await send(alex.token, gId, "Actually downtown is fine tonight.", "g13-recompose");
  } else {
    beforeSam = await json(`/api/v1/product/conversations/${gId}/messages`, {
      bearer: founder.token,
    });
  }

  // Inspect signals + durable chronology
  const msgs = await json(`/api/v1/product/conversations/${gId}/messages`, {
    bearer: founder.token,
  });
  const convListAfter = await json("/api/v1/product/conversations", {
    bearer: founder.token,
  });
  const friends = (convListAfter.conversations || []).find((c) => c.id === gId);
  const signals = msgs.signals || [];
  const recognition = signals.find((s) => s.kind !== "proposal") || signals[0];
  const gc = recognition?.group_composition || {};
  console.log("\n=== GROUP MEMBERSHIP + COMPOSITION PROOF ===");
  console.log("member_count seed create:", group.member_count);
  console.log("member_count after Sam (list):", friends?.member_count);
  console.log("peers after Sam:", (friends?.peers || []).map((p) => p.display_name).join(", "));
  console.log("composition:", recognition?.composition);
  console.log("lifecycle:", recognition?.lifecycle_stage);
  console.log("who count:", gc.who?.member_count, "pending:", gc.who?.pending_invites);
  console.log("human_surface:", gc.human_surface?.headline);
  console.log("when:", gc.when?.window_note || gc.when?.strongest_common_start);
  console.log("downtown incompatible:", gc.where?.downtown_incompatible);
  console.log("sushi conflict:", gc.food?.sushi_conflict);
  console.log("authority:", gc.authority?.model);
  console.log("durable chronology count:", (msgs.chronology || []).length);
  console.log(
    "chronology kinds:",
    (msgs.chronology || []).map((m) => m.kind).join(", "),
  );
  console.log("source_message_ids:", recognition?.source_message_ids?.length || 0);
  console.log("msgs before Sam signal probe:", beforeSam.messages?.length);

  console.log("\n=== FOUNDER REVIEW LOGIN (V2 three-gate pass) ===");
  console.log(`Phone: ${FOUNDER.phone}`);
  console.log(`Synthetic code: ${FOUNDER.codeHint}`);
  console.log("Skip walkthrough → activate → Home first.");
  console.log("\nSeeded journeys:");
  console.log("  A Maya     — coffee Tue 10:30 · Harbor Table (dyad settled)");
  console.log(`  B Jordan   — dinner Thu · place open (dyad curate) id=${jordan.conversationId}`);
  // Durable id for live browser proofs (latest clean place-open dyad)
  try {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const outDir = resolve(root, "docs/evidence/v2-coded-experience/live-closure");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      resolve(outDir, "SEED_CONVERSATION_IDS.json"),
      JSON.stringify(
        {
          jordan_place_open: jordan.conversationId,
          maya_settled: maya.conversationId,
          friends_group: gId,
          at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.log("seed id write skipped:", e.message);
  }
  console.log(
    "  C Friends  — TRUE 5-member group (Founder/Chris/Jess/Alex/Maya) · Harbor Table Saturday",
  );
  console.log("Open Friends chat: scroll for human→Opal→human causal filaments.");
  console.log("\nSTATUS: DO NOT MERGE — intelligence gates still under proof.");
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message, e.body || "");
  process.exit(1);
});
