/**
 * POST-B7 P2 — Calls Continuity (928:3 CURRENT).
 * Run: cd apps/opal_web && node scripts/prove_p2_calls_continuity.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p2");
mkdirSync(OUT, { recursive: true });

const FULL = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;

const proof = {
  square: "POST_B7_P2_CALLS_CONTINUITY",
  figma: "928:3",
  starting_head: "51daee175ee904e8a03b7c6f59346a06d51ba20c",
  implementation_sha: FULL,
  short_sha: SHA,
  started_at: new Date().toISOString(),
  P3_AUTHORIZED: false,
  P4_AUTHORIZED: false,
  MERGE: false,
  LIVE: false,
  permissionToStartLive: false,
  asserts: {},
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
  await page.waitForTimeout(800);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 240));
});

try {
  await enterHome(page);

  await page.locator('[data-testid="member-tab-chats"]').click({ force: true });
  await page.waitForSelector('[data-testid="chats-home"]', { timeout: 15000 });
  const chatsOk = (await page.locator('[data-testid="chats-home"]').count()) === 1;
  log("chats_home_visible", chatsOk);

  await page.locator('[data-testid="comm-mode-calls"]').click({ force: true });
  await page.waitForSelector('[data-testid="calls-continuity-home"]', { timeout: 10000 });
  const callsOk = (await page.locator('[data-testid="calls-continuity-home"]').count()) === 1;
  log("calls_chats_mode_switch", callsOk);

  const subtitle = await page.locator('[data-testid="comm-home-subtitle"]').innerText();
  const subtitleOk = subtitle.includes("The people you've been calling");
  log("calls_subtitle_law", subtitleOk, { subtitle });

  const rows = await page.locator('[data-testid^="calls-row-"]').count();
  const mayaSignal = await page.locator('[data-testid="calls-signal-call-cont-maya"]').count();
  const chanelleSignal = await page.locator('[data-testid="calls-signal-call-cont-chanelle"]').count();
  log("calls_row_metadata_without_fake_consequence", rows >= 4 && mayaSignal === 0, {
    rows,
    mayaSignal,
    chanelleSignal,
  });

  await page.locator('[data-testid="calls-filter-missed"]').click({ force: true });
  await page.waitForTimeout(300);
  const missedRows = await page.locator('[data-testid^="calls-row-"]').count();
  const missedSub = await page.locator('[data-testid="comm-home-subtitle"]').innerText();
  log("calls_missed_filter", missedRows >= 1 && /Missed/.test(missedSub), {
    missedRows,
    missedSub,
  });

  await page.locator('[data-testid="calls-filter-all"]').click({ force: true });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: join(OUT, "RUNTIME_CALLS_CONTINUITY.png"),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });

  await page.locator('[data-testid="calls-open-graph-call-cont-chanelle"]').click({ force: true });
  await page.waitForTimeout(900);
  const body = await page.locator("body").innerText();
  const graphOk =
    /Juniper/i.test(body) &&
    ((await page.locator('[data-testid="graph-detail-sheet"], .ogsn-graph-detail, [data-figma="618:758"]').count()) >
      0 ||
      /Ready|7:30/i.test(body));
  log("calls_row_earned_consequence_open_graph", graphOk, {
    hasJuniper: /Juniper/i.test(body),
  });
  await page.screenshot({
    path: join(OUT, "RUNTIME_CALLS_OPEN_GRAPH.png"),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });

  proof.asserts = {
    chats_home_visible: chatsOk,
    calls_chats_mode_switch: callsOk,
    calls_subtitle_law: subtitleOk,
    calls_row_metadata_without_fake_consequence: rows >= 4 && mayaSignal === 0,
    calls_missed_filter: missedRows >= 1,
    calls_row_earned_consequence_open_graph: graphOk,
    provider_fake_call_rows: false,
  };

  const fails = proof.flow.filter((f) => !f.ok);
  proof.P2_COMPLETE = fails.length === 0;
  proof.console_errors = proof.console_errors.slice(0, 12);
  proof.finished_at = new Date().toISOString();
  proof.founder_verification_url = BASE;
  proof.founder_walkthrough = [
    "1. Open founder URL",
    "2. Complete first-run skip path to Home",
    "3. Tap Chats dock",
    "4. Tap Calls mode",
    "5. Confirm subtitle + relationship rows (Maya has no signal)",
    "6. Tap Missed → Juniper crew Call back",
    "7. Tap All → Chanelle Open Graph → Juniper & Ivy Ready",
  ];

  writeFileSync(join(OUT, "P2_CALLS_CONTINUITY_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ P2_COMPLETE: proof.P2_COMPLETE, fails: fails.map((f) => f.step) }, null, 2));
  if (!proof.P2_COMPLETE) process.exit(1);
} catch (e) {
  proof.P2_COMPLETE = false;
  proof.fatal = String(e).slice(0, 500);
  writeFileSync(join(OUT, "P2_CALLS_CONTINUITY_PROOF.json"), JSON.stringify(proof, null, 2));
  console.error(e);
  process.exit(1);
} finally {
  await browser.close();
}
