/**
 * POST-B7 P1 — prove FW-D1…D4 only.
 * Run: cd apps/opal_web && node scripts/prove_p1_defects.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PNG } from "pngjs";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/post-b7-p0-authority-sync");
mkdirSync(join(OUT, "p1"), { recursive: true });

const FULL = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;

const proof = {
  square: "POST_B7_P1_OBJECTIVE_DEFECT_CLOSURE",
  starting_head: "9727bc0",
  implementation_sha: FULL,
  short_sha: SHA,
  started_at: new Date().toISOString(),
  NEW_CURRENT_SURFACES_PROMOTED: 0,
  CALLS_CONTINUITY_CURRENT: "NO",
  SIGNAL_GRAMMAR_CURRENT: "NO",
  DECISION_INTELLIGENCE_CURRENT: "NO",
  OUTGOING_RINGING_UI: "NOT_CURRENT_AUTHORITY / P2_AFTER_928_PROMOTION",
  AV_TRANSPORT: "DEPENDENCY",
  defects: {},
  mounts: {},
  responsive: {},
  flow: [],
  console_errors: [],
  network_failures: [],
};

function log(step, ok, extra = {}) {
  proof.flow.push({ step, ok, ...extra });
  console.log(`${ok ? "OK" : "FAIL"} ${step}`, Object.keys(extra).length ? JSON.stringify(extra) : "");
}

async function enterHome(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click({ timeout: 20000 });
  await page.locator('[data-testid="opal-promise-enter"]').click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]', { timeout: 30000 });
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 60000 });
  const name = page.locator('[data-testid="fr08-display-name"], input[autocomplete="name"]').first();
  if (await name.isVisible().catch(() => false)) await name.fill("Founder");
  await page.locator('[data-testid="fr08-continue"], button:has-text("Continue")').first().click();
  await page.waitForTimeout(900);
  const notNow = page.getByRole("button", { name: /Not now|Skip/i }).first();
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
  await page.waitForSelector('[data-testid="member-tab-home"]', { timeout: 45000 });
  await page.waitForTimeout(1000);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 200));
});

try {
  await enterHome(page);

  // ——— FW-D3 Graphs spine ———
  await page.locator('[data-testid="member-tab-graphs"]').click({ force: true });
  await page.waitForSelector('[data-testid="graphs-trajectory"]', { timeout: 15000 });
  await page.waitForTimeout(500);
  const spine = await page.evaluate(() => {
    const rail = document.querySelector(".graphs-timeline-rail");
    const dots = [...document.querySelectorAll(".graphs-timeline-dot")].slice(0, 4);
    const stage = document.querySelector(".app") || document.body;
    const stageLeft = stage.getBoundingClientRect().left;
    const r = rail?.getBoundingClientRect();
    const spineCenter = r ? r.left + r.width / 2 - stageLeft : null;
    const nodes = dots.map((d) => {
      const b = d.getBoundingClientRect();
      return {
        center: b.left + b.width / 2 - stageLeft,
        z: getComputedStyle(d).zIndex,
      };
    });
    const railZ = rail ? getComputedStyle(rail).zIndex : null;
    const css = getComputedStyle(document.querySelector(".graphs-timeline"));
    return {
      spineCenter,
      railZ,
      nodes,
      cssSpineX: css.getPropertyValue("--graph-spine-x").trim(),
      deltas: nodes.map((n) => (spineCenter == null ? null : Math.abs(n.center - spineCenter))),
    };
  });
  const maxDelta = Math.max(...(spine.deltas || [99]).map((d) => d ?? 99));
  const axisOk = spine.spineCenter != null && Math.abs(spine.spineCenter - 52) <= 1.5;
  const centeringOk = maxDelta <= 1.05 && axisOk;
  const layeringOk = Number(spine.railZ || 0) <= Number(spine.nodes[0]?.z || 2);
  proof.defects.FW_D3 = { spine, maxDelta, centeringOk, layeringOk };
  log("FW_D3_GRAPH_SPINE_CENTERING", centeringOk, { maxDelta, spineCenter: spine.spineCenter });
  log("FW_D3_GRAPH_SPINE_LAYERING", layeringOk, { railZ: spine.railZ, nodeZ: spine.nodes[0]?.z });
  await page.screenshot({
    path: join(OUT, "p1/RUNTIME_GRAPHS_SPINE.png"),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });

  // ——— FW-D4 stage mount ———
  const appBoxBefore = await page.evaluate(() => {
    const a = document.querySelector(".app");
    const r = a.getBoundingClientRect();
    return { left: r.left, width: r.width, top: r.top };
  });
  await page.locator('[data-testid^="graphs-open-"]').first().click({ force: true });
  await page.waitForSelector('[data-testid="graph-detail-sheet"], .ogsn-graph-detail', { timeout: 12000 });
  await page.waitForTimeout(400);
  const detailMount = await page.evaluate(() => {
    const dest = document.querySelector(".ogsn-graph-detail, [data-testid='graph-detail-sheet']");
    const app = document.querySelector(".app");
    if (!dest || !app) return { error: "missing" };
    const d = dest.getBoundingClientRect();
    const a = app.getBoundingClientRect();
    return {
      appLeft: a.left,
      destLeft: d.left,
      dx: Math.abs(d.left - a.left),
      dy: Math.abs(d.top - a.top),
      destW: d.width,
      destH: d.height,
      className: dest.className,
    };
  });
  const stageOk = detailMount.dx != null && detailMount.dx <= 2 && detailMount.destW >= 380 && detailMount.destW <= 400;
  proof.defects.FW_D4 = { appBoxBefore, detailMount, stageOk };
  log("FW_D4_CENTERED_STAGE", stageOk, detailMount);
  await page.screenshot({
    path: join(OUT, "p1/RUNTIME_GRAPH_DETAIL_STAGE.png"),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });

  // Back preserves Graphs
  await page.locator('[data-testid="graph-detail-back"], button:has-text("Back")').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const backGraphs = await page.locator('[data-testid="graphs-trajectory"]').isVisible().catch(() => false);
  log("graph_detail_back_graphs", backGraphs);

  // ——— FW-D1 / D2 Calls ———
  await page.locator('[data-testid="member-tab-chats"]').click({ force: true });
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 20000 });
  const directRow = page.locator('[data-testid^="chats-row-"][data-kind="direct"]').filter({ hasText: /Chanelle/i }).first();
  await directRow.click();
  await page.waitForSelector('[data-testid="member-conversation"][data-chat-kind="direct"]', { timeout: 15000 });
  // Tap Call
  const callBtn = page.locator('[data-testid="gpt-call"], [aria-label="Call"], button:has-text("Call")').first();
  await callBtn.click({ force: true });
  await page.waitForSelector('[data-testid="call-surface"]', { timeout: 10000 });
  const callState = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="call-surface"]');
    const answer = document.querySelector('[data-testid="call-answer"]');
    const decline = document.querySelector('[data-testid="call-decline"]');
    const status = document.querySelector('[data-testid="call-status"]')?.textContent || "";
    const gptVisible = (() => {
      const h = document.querySelector(".gpt-header");
      if (!h) return false;
      const s = getComputedStyle(h);
      return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.01;
    })();
    return {
      kind: el?.getAttribute("data-call-kind"),
      direction: el?.getAttribute("data-call-direction"),
      figma: el?.getAttribute("data-figma-node"),
      hasAnswer: !!answer,
      hasDecline: !!decline,
      status,
      bodyCallOpen: document.body.dataset.callSurfaceOpen === "1",
      gptHeaderVisible: gptVisible,
      rect: el?.getBoundingClientRect(),
      appLeft: document.querySelector(".app")?.getBoundingClientRect().left,
    };
  });
  const d1Ok =
    callState.direction === "outgoing" &&
    callState.kind !== "incoming" &&
    !callState.hasAnswer &&
    !callState.hasDecline &&
    !/is calling/i.test(callState.status);
  const d2Ok = callState.bodyCallOpen && !callState.gptHeaderVisible;
  const callStageOk =
    callState.rect &&
    callState.appLeft != null &&
    Math.abs(callState.rect.left - callState.appLeft) <= 2;
  proof.defects.FW_D1 = { callState, ok: d1Ok };
  proof.defects.FW_D2 = { gptHeaderVisible: callState.gptHeaderVisible, ok: d2Ok };
  log("FW_D1_OUTGOING_INCOMING", d1Ok, {
    kind: callState.kind,
    direction: callState.direction,
    hasAnswer: callState.hasAnswer,
    status: callState.status,
  });
  log("FW_D2_CALL_COPY_OVERLAP", d2Ok && callStageOk, {
    gptHeaderVisible: callState.gptHeaderVisible,
    callStageOk,
  });
  await page.screenshot({
    path: join(OUT, "p1/RUNTIME_OUTGOING_CALL.png"),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });
  await page.locator('[data-testid="call-end"]').click({ force: true });
  await page.waitForTimeout(400);

  // Video outgoing
  const videoBtn = page.locator('[data-testid="gpt-video"], [aria-label="Video"], button:has-text("Video")').first();
  if (await videoBtn.count()) {
    await videoBtn.click({ force: true });
    await page.waitForSelector('[data-testid="call-surface"]', { timeout: 8000 });
    const v = await page.evaluate(() => ({
      kind: document.querySelector("[data-testid=call-surface]")?.getAttribute("data-call-kind"),
      direction: document.querySelector("[data-testid=call-surface]")?.getAttribute("data-call-direction"),
      answer: !!document.querySelector("[data-testid=call-answer]"),
    }));
    log("outgoing_video", v.kind === "video" && v.direction === "outgoing" && !v.answer, v);
    await page.locator('[data-testid="call-end"]').click({ force: true });
  }

  // Responsive matrix for Graph Detail stage
  const widths = [375, 390, 393, 430];
  let responsiveOk = true;
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.locator('[data-testid="member-tab-graphs"]').click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('[data-testid^="graphs-open-"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const app = document.querySelector(".app");
      const dest = document.querySelector(".ogsn-graph-detail");
      if (!app || !dest) return { error: true };
      const a = app.getBoundingClientRect();
      const d = dest.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        dx: Math.abs(d.left - a.left),
        appW: a.width,
        destW: d.width,
      };
    });
    proof.responsive[w] = m;
    if (m.error || m.overflow || m.dx > 3) responsiveOk = false;
    await page.keyboard.press("Escape").catch(() => {});
    await page.locator('[data-testid="graph-detail-back"], button:has-text("Back")').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  log("FW_D4_DESTINATION_MOUNT_STABILITY", responsiveOk, proof.responsive);
  proof.defects.FW_D4.responsiveOk = responsiveOk;

  // Global Opal integrity smoke (frozen)
  await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
  await page.waitForSelector('[data-testid="opal-ambient"]', { timeout: 12000 });
  const opal = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="opal-ambient"]');
    const hits = root?.querySelectorAll(".opal-hit, .opal-query-hit").length || 0;
    const labels = [...(root?.querySelectorAll('[data-testid^="opal-context-"]') || [])].every(
      (c) => (c.textContent || "").trim().length > 2,
    );
    const decorative = !!root?.querySelector('[data-decorative-only="true"]');
    return { hits, labels, decorative };
  });
  const opalOk = opal.hits === 0 && opal.labels && opal.decorative;
  log("GLOBAL_OPAL_INTEGRITY_GUARD", opalOk, opal);
  proof.GLOBAL_OPAL_INTEGRITY_GUARD = opalOk ? "GREEN" : "RED";
} catch (e) {
  log("runtime_exception", false, { message: String(e.message || e) });
  proof.console_errors.push(String(e.message || e));
} finally {
  await browser.close();
}

const gates = {
  FW_D1_OUTGOING_INCOMING: proof.defects.FW_D1?.ok ? "GREEN" : "RED",
  FW_D2_CALL_COPY_OVERLAP: proof.defects.FW_D2?.ok ? "GREEN" : "RED",
  FW_D3_GRAPH_SPINE_CENTERING: proof.defects.FW_D3?.centeringOk ? "GREEN" : "RED",
  FW_D3_GRAPH_SPINE_LAYERING: proof.defects.FW_D3?.layeringOk ? "GREEN" : "RED",
  FW_D4_CENTERED_STAGE: proof.defects.FW_D4?.stageOk ? "GREEN" : "RED",
  FW_D4_DESTINATION_MOUNT_STABILITY: proof.defects.FW_D4?.responsiveOk ? "GREEN" : "RED",
  RESPONSIVE_MATRIX: proof.defects.FW_D4?.responsiveOk ? "GREEN" : "RED",
  GLOBAL_OPAL_INTEGRITY_GUARD: proof.GLOBAL_OPAL_INTEGRITY_GUARD || "RED",
};
proof.gates = gates;
const allGreen = Object.values(gates).every((v) => v === "GREEN");
proof.POST_B7_P1_COMPLETE = allGreen ? "YES" : "NO";
proof.FOUNDER_RECHECK_READY = allGreen ? "YES" : "NO";
proof.FOUNDER_ACCEPTED = "NO";
proof.FOUNDER_WALK_READY = "NO"; // defects existed; recheck required
proof.MERGE = "NO";
proof.LIVE = "NO";
proof.permissionToStartLive = "NO";
proof.finished_at = new Date().toISOString();
if (allGreen) {
  proof.founder_verification_url = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;
}

writeFileSync(join(OUT, "P1_DEFECT_CLOSURE_PROOF.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ POST_B7_P1_COMPLETE: proof.POST_B7_P1_COMPLETE, gates }, null, 2));
if (!allGreen) process.exit(2);
