#!/usr/bin/env node
/**
 * Socket health probe — measures raw reconnect thrash, not UI quietness.
 *
 * Usage (API + web already running, founder session active is optional):
 *   This script is a *harness contract* for browser console / Playwright.
 *
 * In a connected browser session after 15–30 min of use, run:
 *   productRealtime.getDiagnostics()
 *
 * Expected healthy:
 *   connectCount: 1 (or low)
 *   closeCount: 0
 *   reconnectScheduleCount: 0
 *   errorCount: 0
 *   connectedLifetimeMs: large
 *
 * If UI looked calm but reconnectScheduleCount is high, the defect is still open.
 */

const expected = {
  connectCount_max: 2,
  closeCount_max: 0,
  reconnectScheduleCount_max: 0,
  errorCount_max: 0,
  connectedLifetimeMs_min: 15 * 60 * 1000,
};

console.log(JSON.stringify({
  probe: "socket_health",
  instructions: [
    "Open two browser tabs logged into different product accounts.",
    "Keep both connected 15–30 minutes: message, idle, navigate, background tab, return.",
    "In each tab console: productRealtime.getDiagnostics()",
    "Record Human Coordination Residue separately for the episode.",
  ],
  healthy_thresholds: expected,
  status: "HARNESS_ONLY — live multi-browser 15–30m proof not executed in this agent pass",
}, null, 2));
