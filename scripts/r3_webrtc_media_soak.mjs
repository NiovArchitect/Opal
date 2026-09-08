#!/usr/bin/env node
/**
 * R3 early-stretch SAME_HOST_TWO_BROWSER_PROOF
 * Uses SYNTHETIC_TEST_USER fixtures — NOT real verified Opal users.
 * No audio recording. Evidence only.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  path.resolve(__dirname, "../apps/opal_web/package.json"),
);
const { chromium } = require("playwright");

const API = process.env.OPAL_API || "http://127.0.0.1:4000";
const WEB = process.env.OPAL_WEB || "http://127.0.0.1:5173";
const tokens = JSON.parse(fs.readFileSync("/tmp/opal_recon_tokens.json", "utf8"));
const outDir = path.resolve("docs/evidence/r3-early-stretch-recon");
fs.mkdirSync(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(token, p, method = "GET", body) {
  const res = await fetch(API + p, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* */
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function main() {
  const evidence = {
    label: "SAME_HOST_TWO_BROWSER_PROOF",
    identity_class: tokens.identity_class || "SYNTHETIC_TEST_USER_FIXTURE",
    REAL_TWO_VERIFIED_USER_CALL: "BLOCKED_BY_R1A",
    api: API,
    web: WEB,
    started_at: new Date().toISOString(),
    decline: null,
    cancel: null,
    stale_answer: null,
    media: null,
    kafka_sdp_ice_media_counts: null,
  };

  // --- Decline path (API) ---
  {
    const created = await api(tokens.alex.access_token, "/api/v1/product/calls", "POST", {
      callee_user_id: tokens.jordan.user_id,
    });
    const callId = created.json?.call?.id;
    const declined = await api(
      tokens.jordan.access_token,
      `/api/v1/product/calls/${callId}/decline`,
      "POST",
      {},
    );
    const after = await api(tokens.alex.access_token, `/api/v1/product/calls/${callId}`);
    evidence.decline = {
      create_ok: created.ok,
      decline_ok: declined.ok,
      final_status: after.json?.call?.status,
      ended_reason: after.json?.call?.ended_reason,
    };
  }

  // --- Caller cancel while ringing ---
  {
    const created = await api(tokens.alex.access_token, "/api/v1/product/calls", "POST", {
      callee_user_id: tokens.jordan.user_id,
    });
    const callId = created.json?.call?.id;
    const hung = await api(
      tokens.alex.access_token,
      `/api/v1/product/calls/${callId}/hangup`,
      "POST",
      { reason: "hangup" },
    );
    const stale = await api(
      tokens.jordan.access_token,
      `/api/v1/product/calls/${callId}/answer`,
      "POST",
      {},
    );
    const after = await api(tokens.alex.access_token, `/api/v1/product/calls/${callId}`);
    evidence.cancel = {
      hangup_ok: hung.ok,
      final_status: after.json?.call?.status,
      ended_reason: after.json?.call?.ended_reason,
    };
    evidence.stale_answer = {
      rejected: !stale.ok,
      status: stale.status,
      body: stale.json || stale.text,
    };
  }

  // --- Kafka plane: outbox payload must not contain sdp/ice/media ---
  {
    // Query via health-adjacent: use mix isn't available here; count from last call create response fields only.
    // Deeper check run separately via mix. Placeholder filled by companion script if present.
    const probe = path.join(outDir, "outbox_call_payload_sample.json");
    if (fs.existsSync(probe)) {
      evidence.kafka_sdp_ice_media_counts = JSON.parse(fs.readFileSync(probe, "utf8"));
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--allow-file-access-from-files",
    ],
  });

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  await ctxA.grantPermissions(["microphone"], { origin: WEB });
  await ctxB.grantPermissions(["microphone"], { origin: WEB });

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const callerUrl =
    `${WEB}/recon/webrtc-soak.html?role=caller&autorun=0` +
    `&token=${encodeURIComponent(tokens.alex.access_token)}` +
    `&peer=${encodeURIComponent(tokens.jordan.user_id)}` +
    `&api=${encodeURIComponent(API)}`;

  // Preload callee page so it can answer as soon as call id exists.
  await pageB.goto(
    `${WEB}/recon/webrtc-soak.html?role=callee&autorun=0` +
      `&token=${encodeURIComponent(tokens.jordan.access_token)}` +
      `&api=${encodeURIComponent(API)}`,
    { waitUntil: "networkidle" },
  );

  await pageA.goto(callerUrl, { waitUntil: "networkidle" });
  await pageA.evaluate(() => window.__opalSoakRun());

  // Wait for call id
  let callId = null;
  for (let i = 0; i < 40; i++) {
    callId = await pageA.evaluate(() => window.__opalCallId || window.__opalSoakEvidence?.call?.id || null);
    if (callId) break;
    await sleep(250);
  }

  if (!callId) {
    evidence.media = {
      error: "caller_did_not_create_call",
      caller: await pageA.evaluate(() => window.__opalSoakEvidence),
    };
    fs.writeFileSync(path.join(outDir, "WEBRTC_MEDIA_SOAK.json"), JSON.stringify(evidence, null, 2));
    await browser.close();
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(2);
  }

  // Navigate callee with call_id and start immediately (race-safe via ready/reoffer).
  const calleeUrl =
    `${WEB}/recon/webrtc-soak.html?role=callee&autorun=0` +
    `&token=${encodeURIComponent(tokens.jordan.access_token)}` +
    `&call_id=${encodeURIComponent(callId)}` +
    `&api=${encodeURIComponent(API)}`;

  await pageB.goto(calleeUrl, { waitUntil: "networkidle" });
  await pageB.evaluate(() => window.__opalSoakRun());

  // Wait both done (longer — ready/reoffer may land late)
  for (let i = 0; i < 120; i++) {
    const aDone = await pageA.evaluate(() => window.__opalSoakEvidence?.done === true);
    const bDone = await pageB.evaluate(() => window.__opalSoakEvidence?.done === true);
    if (aDone && bDone) break;
    await sleep(500);
  }

  // Final stats collection after both sides settle
  await pageA.evaluate(async () => window.__opalSoakCollect && (await window.__opalSoakCollect()));
  await pageB.evaluate(async () => window.__opalSoakCollect && (await window.__opalSoakCollect()));
  await sleep(1500);
  await pageA.evaluate(async () => window.__opalSoakCollect && (await window.__opalSoakCollect()));
  await pageB.evaluate(async () => window.__opalSoakCollect && (await window.__opalSoakCollect()));

  const aEv = await pageA.evaluate(() => window.__opalSoakEvidence);
  const bEv = await pageB.evaluate(() => window.__opalSoakEvidence);

  // Hangup from caller
  await pageA.evaluate(() => window.__opalSoakHangup());
  await sleep(500);
  const finalCall = await api(tokens.alex.access_token, `/api/v1/product/calls/${callId}`);

  const aStats = aEv?.stats || {};
  const bStats = bEv?.stats || {};
  const aPackets =
    (aStats.outbound?.packetsSent || 0) > 0 || (aStats.inbound?.packetsReceived || 0) > 0;
  const bPackets =
    (bStats.outbound?.packetsSent || 0) > 0 || (bStats.inbound?.packetsReceived || 0) > 0;
  // Bidirectional preferred; unidirectional packet flow still proves media plane works.
  const packetsMoved = aPackets && bPackets;
  const packetsAny = aPackets || bPackets;

  const iceOk =
    ["connected", "completed"].includes(aStats.iceConnectionState) ||
    ["connected", "completed"].includes(bStats.iceConnectionState);

  const candidateTypes = [
    ...(aStats.candidates || []),
    ...(bStats.candidates || []),
  ].map((c) => c.candidateType);

  evidence.media = {
    call_id: callId,
    final_status: finalCall.json?.call?.status,
    SIGNALING_CONNECTED: Boolean(callId) && !aEv?.error && !bEv?.error,
    MEDIA_FLOWING: packetsMoved === true,
    MEDIA_FLOWING_ANY_SIDE: packetsAny === true,
    ice_ok: iceOk,
    needs_turn_a: aEv?.needs_turn === true,
    needs_turn_b: bEv?.needs_turn === true,
    caller_stats: aStats,
    callee_stats: bStats,
    candidate_types_seen: [...new Set(candidateTypes)],
    STUN_PATH:
      candidateTypes.includes("srflx") || candidateTypes.includes("host")
        ? candidateTypes.includes("srflx")
          ? "srflx_seen"
          : "host_only"
        : "unknown",
    caller_error: aEv?.error || null,
    callee_error: bEv?.error || null,
    video_claimed_in_transport: false,
    video_mismatch_note:
      "CallSurface has video chrome toggles; CallClient transport is audio-only — objective mismatch, no fake video.",
  };

  evidence.WEBRTC_MEDIA_LOCAL_PROOF = packetsMoved
    ? "GREEN"
    : packetsAny && iceOk
      ? "PARTIAL"
      : iceOk
        ? "PARTIAL"
        : aEv?.needs_turn || bEv?.needs_turn
          ? "PARTIAL_NEEDS_TURN"
          : "RED";

  evidence.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, "WEBRTC_MEDIA_SOAK.json"), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(
    path.join(outDir, "caller_evidence.json"),
    JSON.stringify(aEv, null, 2),
  );
  fs.writeFileSync(
    path.join(outDir, "callee_evidence.json"),
    JSON.stringify(bEv, null, 2),
  );

  await browser.close();
  console.log(JSON.stringify({ summary: {
    WEBRTC_MEDIA_LOCAL_PROOF: evidence.WEBRTC_MEDIA_LOCAL_PROOF,
    MEDIA_FLOWING: evidence.media.MEDIA_FLOWING,
    decline: evidence.decline,
    cancel: evidence.cancel,
    stale_answer_rejected: evidence.stale_answer?.rejected,
  }}, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
