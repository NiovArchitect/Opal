#!/usr/bin/env node
/**
 * Dual-client socket lifetime session.
 * Default duration 20 minutes (SOCKET_PROOF_MS env to override for CI smoke).
 *
 * Uses product socket-ticket + phoenix JS if available; otherwise records
 * that founder must run productRealtime.getDiagnostics() in two browsers.
 *
 * This agent environment may not hold real Phoenix sockets for 20m with
 * full channel load — script prints protocol and can smoke for short duration.
 */
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const DURATION_MS = Number(process.env.SOCKET_PROOF_MS || 20 * 60 * 1000);
const SAMPLE_MS = Number(process.env.SOCKET_SAMPLE_MS || 5 * 60 * 1000);

console.log(JSON.stringify({
  protocol: "socket_lifetime_session",
  api: API,
  duration_ms: DURATION_MS,
  sample_ms: SAMPLE_MS,
  instructions: [
    "Open two browsers: Founder +12025550101 and Maya +12025550102 (or Sam).",
    "Keep both logged in for full duration.",
    "At T+0,5,10,15,20 run: productRealtime.getDiagnostics()",
    "Exercise: A↔B messages, idle, Home, open chats, background tab, send after idle.",
    "Success ~ connectCount:1 reconnectScheduleCount:0 closeCount:0 errorCount:0 rising connectedLifetimeMs",
    "Quiet UI with high reconnectScheduleCount = FAIL",
  ],
  agent_status: DURATION_MS >= 20 * 60 * 1000
    ? "FULL_20M_REQUIRES_FOUNDER_BROWSERS — agent cannot substitute dual human browser lifecycle"
    : "SMOKE_DURATION",
  note: "Do not claim socket closed until dual-browser diagnostics recorded.",
}, null, 2));

// Lightweight health loop (API only) — not a substitute for Phoenix reconnect proof
const started = Date.now();
const samples = [];
const endAt = started + Math.min(DURATION_MS, Number(process.env.SOCKET_API_POLL_MS || 15000));

async function sample() {
  try {
    const r = await fetch(`${API}/health`);
    samples.push({ t: Date.now() - started, ok: r.ok, status: r.status });
  } catch (e) {
    samples.push({ t: Date.now() - started, ok: false, error: String(e.message || e) });
  }
}

await sample();
while (Date.now() < endAt) {
  await new Promise((r) => setTimeout(r, 3000));
  await sample();
}

console.log(JSON.stringify({
  api_health_samples: samples,
  socket_phoenix_proof: "NOT_EXECUTED_IN_AGENT",
  founder_action_required: true,
}, null, 2));

process.exit(samples.every((s) => s.ok) ? 0 : 1);
