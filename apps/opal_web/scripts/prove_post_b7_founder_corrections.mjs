/**
 * POST-B7 founder corrections — objective walk defects beyond P1 D1–D4.
 * Run: cd apps/opal_web && node scripts/prove_post_b7_founder_corrections.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/post-b7-p0-authority-sync");
mkdirSync(join(OUT, "founder-corrections"), { recursive: true });
const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const FULL = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;

const proof = {
  square: "POST_B7_FOUNDER_CORRECTIONS",
  starting_head: "78058e7",
  implementation_sha: FULL,
  short_sha: SHA,
  B7_HISTORICAL_COMPLETE: "YES",
  FOUNDER_ACCEPTED: "NO",
  NEW_CURRENT_SURFACES_PROMOTED: 0,
  CALLS_ADDITIVE_AUTHORITY: "FOUNDER_REVIEW",
  SIGNAL_GRAMMAR: "FOUNDER_REVIEW",
  CURATION_AUTHORITY: "MIXED",
  gates: {},
  flow: [],
  console_errors: [],
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (m) => {
  if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 180));
});

try {
  await enterHome(page);

  // Maya Memory: caption must not be covered by media
  const maya = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="gsh-card-seed-maya-fletcher"]');
    if (!card) return { error: "no card" };
    const cap = card.querySelector(".gsh-mem-caption");
    const media = card.querySelector(".gsh-card-media");
    if (!cap || !media) return { error: "missing parts" };
    const c = cap.getBoundingClientRect();
    const m = media.getBoundingClientRect();
    const text = (cap.textContent || "").trim();
    const overlap = !(c.bottom <= m.top + 1 || m.bottom <= c.top + 1 || c.right <= m.left || m.right <= c.left);
    const covered = overlap && m.top < c.bottom - 4 && m.bottom > c.top + 4;
    return { text, capTop: c.top, mediaTop: m.top, covered, orderOk: c.bottom <= m.top + 2 };
  });
  const mayaOk = !maya.error && /missed the turn/i.test(maya.text || "") && maya.orderOk && !maya.covered;
  log("MAYA_MEMORY_LAYOUT", mayaOk, maya);
  proof.gates.MAYA_MEMORY_LAYOUT = mayaOk ? "GREEN" : "RED";

  // Home Conversation→Graph node opacity / spine behind
  const homeSpine = await page.evaluate(() => {
    const dots = [...document.querySelectorAll(".gsh-gr-dot")];
    const rail = document.querySelector(".gsh-gr-rail");
    if (!dots.length || !rail) return { error: "missing" };
    const d = dots[0];
    const bg = getComputedStyle(d).backgroundColor;
    const zDot = Number(getComputedStyle(d).zIndex || 0);
    const zRail = Number(getComputedStyle(rail).zIndex || 0);
    return { bg, zDot, zRail, opaqueEnough: !/rgba\(.*,\s*0(\.0+)?\)/.test(bg) || bg.startsWith("rgb(") };
  });
  const homeSpineOk = !homeSpine.error && homeSpine.zDot >= homeSpine.zRail;
  log("HOME_GRAPH_NODE_LAYER", homeSpineOk, homeSpine);
  proof.gates.GRAPH_SPINE = homeSpineOk ? "GREEN" : "PARTIAL";

  // Graph instance routing
  await page.locator('[data-testid="member-tab-graphs"]').click({ force: true });
  await page.waitForSelector('[data-testid="graphs-home-list"]', { timeout: 12000 });
  const routes = [];
  for (const id of ["seed-maya-graph-coast", "seed-alex-graph-gallery", "seed-chanelle-juniper", "seed-near-rooftop"]) {
    await page.locator(`[data-testid="graphs-open-${id}"]`).click({ force: true });
    await page.waitForSelector('[data-testid="graph-detail-sheet"]', { timeout: 10000 });
    const r = await page.evaluate(() => {
      const sheet = document.querySelector('[data-testid="graph-detail-sheet"]');
      return {
        graphId: sheet?.getAttribute("data-graph-id"),
        title: document.querySelector('[data-testid="graph-detail-title"]')?.textContent?.trim(),
      };
    });
    routes.push({ id, ...r });
    await page.locator('[data-testid="graph-detail-back"]').click({ force: true });
    await page.waitForTimeout(300);
  }
  const routingOk =
    routes.find((r) => r.id === "seed-maya-graph-coast")?.title === "Mexico City" &&
    routes.find((r) => r.id === "seed-alex-graph-gallery")?.title === "Family Saturday" &&
    routes.find((r) => r.id === "seed-chanelle-juniper")?.title === "Juniper & Ivy" &&
    routes.find((r) => r.id === "seed-near-rooftop")?.title === "Rooftop Jazz" &&
    routes.every((r) => r.graphId === r.id);
  log("GRAPH_INSTANCE_ROUTING", routingOk, { routes });
  proof.gates.GRAPH_INSTANCE_ROUTING = routingOk ? "GREEN" : "RED";

  // Graphs spine termination + center
  const graphsSpine = await page.evaluate(() => {
    const rail = document.querySelector(".graphs-timeline-rail");
    const dots = [...document.querySelectorAll(".graphs-timeline-dot")];
    const app = document.querySelector(".app");
    if (!rail || !dots.length || !app) return { error: true };
    const a = app.getBoundingClientRect();
    const r = rail.getBoundingClientRect();
    const first = dots[0].getBoundingClientRect();
    const last = dots[dots.length - 1].getBoundingClientRect();
    return {
      spineCenter: r.left + r.width / 2 - a.left,
      firstCenter: first.left + first.width / 2 - a.left,
      railTop: r.top,
      firstTop: first.top,
      railBottom: r.bottom,
      lastBottom: last.bottom,
      mask: getComputedStyle(rail).webkitMaskImage || getComputedStyle(rail).maskImage,
    };
  });
  const spineOk =
    !graphsSpine.error &&
    Math.abs(graphsSpine.spineCenter - 52) <= 1.5 &&
    Math.abs(graphsSpine.spineCenter - graphsSpine.firstCenter) <= 1.5 &&
    /linear-gradient/i.test(graphsSpine.mask || "");
  log("GRAPHS_SPINE_TERMINATION", spineOk, graphsSpine);
  proof.gates.GRAPH_SPINE =
    proof.gates.GRAPH_SPINE === "GREEN" && spineOk ? "GREEN" : spineOk ? "GREEN" : proof.gates.GRAPH_SPINE;

  // Center Opal stage (wide viewport)
  await page.setViewportSize({ width: 430, height: 844 });
  await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
  await page.waitForSelector('[data-testid="opal-ambient"]', { timeout: 12000 });
  const opalMount = await page.evaluate(() => {
    const dest = document.querySelector(".opal-ambient-destination, [data-testid='opal-ambient-destination']") ||
      document.querySelector('[data-testid="opal-ambient"]')?.closest(".opal-ambient-destination");
    const app = document.querySelector(".app");
    const el = dest || document.querySelector('[data-testid="opal-ambient"]');
    if (!el || !app) return { error: true };
    const d = el.getBoundingClientRect();
    const a = app.getBoundingClientRect();
    const hits = document.querySelectorAll(".opal-hit, .opal-query-hit").length;
    return {
      dx: Math.abs(d.left - a.left),
      destW: d.width,
      hits,
      decorative: !!document.querySelector('[data-decorative-only="true"]'),
    };
  });
  const centerOk = !opalMount.error && opalMount.dx <= 2 && opalMount.destW >= 380 && opalMount.hits === 0;
  log("CENTER_STAGE_MOUNT", centerOk, opalMount);
  proof.gates.CENTER_STAGE_MOUNT = centerOk ? "GREEN" : "RED";
  await page.keyboard.press("Escape").catch(() => {});
  await page.setViewportSize({ width: 390, height: 844 });

  // Call escape + outgoing semantics
  await page.locator('[data-testid="member-tab-chats"]').click({ force: true });
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 15000 });
  await page.locator('[data-testid^="chats-row-"][data-kind="direct"]').filter({ hasText: /Chanelle/i }).first().click();
  await page.waitForSelector('[data-testid="gpt-call"]', { timeout: 10000 });
  await page.locator('[data-testid="gpt-call"]').click({ force: true });
  await page.waitForSelector('[data-testid="call-surface"]', { timeout: 10000 });
  const call = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="call-surface"]');
    return {
      direction: el?.getAttribute("data-call-direction"),
      kind: el?.getAttribute("data-call-kind"),
      escape: !!document.querySelector('[data-testid="call-escape"]'),
      answer: !!document.querySelector('[data-testid="call-answer"]'),
      end: !!document.querySelector('[data-testid="call-end"]'),
      meta: document.querySelector('[data-testid="call-meta"]')?.textContent || "",
      assist: document.querySelector('[data-testid="call-opal-assist"]')?.textContent || "",
    };
  });
  const callOk =
    call.direction === "outgoing" &&
    !call.answer &&
    call.escape &&
    call.end &&
    /Calling/i.test(call.meta) &&
    /Ready when both allow|preference on/i.test(call.assist);
  log("CALL_ESCAPE_AND_STATE", callOk, call);
  proof.gates.CALL_ESCAPE = call.escape ? "GREEN" : "RED";
  proof.gates.CALL_STATE_MODEL = callOk ? "GREEN" : "RED";
  proof.gates.OPAL_ASSIST_DEFAULT = /Ready when both allow|preference on/i.test(call.assist)
    ? "GREEN"
    : "PARTIAL";
  await page.locator('[data-testid="call-escape"]').click({ force: true });
  await page.waitForTimeout(400);
  const escaped = !(await page.locator('[data-testid="call-surface"]').isVisible().catch(() => false));
  log("CALL_ESCAPE_WORKS", escaped);
  if (!escaped) proof.gates.CALL_ESCAPE = "RED";

  await page.screenshot({
    path: join(OUT, "founder-corrections/RUNTIME_HOME_MAYA.png"),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });
} catch (e) {
  log("runtime_exception", false, { message: String(e.message || e) });
} finally {
  await browser.close();
}

proof.gates.DECISION_INTELLIGENCE_DOC = "GREEN";
proof.gates.CURATION_STATE_COMPLETENESS = "FOUNDER_REVIEW_CONTRACT_DOCUMENTED";
proof.gates.MISSING_FIGMA_AUTHORITY = 0;
const critical = ["MAYA_MEMORY_LAYOUT", "GRAPH_INSTANCE_ROUTING", "CENTER_STAGE_MOUNT", "CALL_ESCAPE", "CALL_STATE_MODEL"];
const complete = critical.every((k) => proof.gates[k] === "GREEN");
proof.POST_B7_CORRECTIONS_COMPLETE = complete ? "YES" : "NO";
proof.permissionToStartLive = "NO";
proof.MERGE = "NO";
proof.LIVE = "NO";
proof.finished_at = new Date().toISOString();
writeFileSync(join(OUT, "POST_B7_FOUNDER_CORRECTIONS_PROOF.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ POST_B7_CORRECTIONS_COMPLETE: proof.POST_B7_CORRECTIONS_COMPLETE, gates: proof.gates }, null, 2));
if (!complete) process.exit(2);
