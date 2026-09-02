/**
 * POST-B7 P2.1 — Founder verification correction proof.
 * Run: cd apps/opal_web && node scripts/prove_p21_founder_correction.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p2.1");
mkdirSync(OUT, { recursive: true });

const FULL = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;

const proof = {
  square: "POST_B7_P2_1_FOUNDER_VERIFICATION_CORRECTION",
  starting_head: "c353f8d578f730129bcce3d12af7a2653452a766",
  P2_AUTOMATED_PROOF_AT_C353F8D: "HISTORICAL_PASS",
  P2_FOUNDER_VERIFICATION: "READY_FOR_RETEST",
  P3_AUTHORIZED: false,
  P4_AUTHORIZED: false,
  ACTIVITY_DESTINATION: "CURRENT",
  ACTIVITY_ICON: "FOUNDER_REJECTED",
  ACTIVITY_ICON_FIGMA_SUCCESSOR: "995:2",
  implementation_sha: FULL,
  short_sha: SHA,
  started_at: new Date().toISOString(),
  asserts: {},
  flow: [],
  section06_stage: {},
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
  await page.waitForTimeout(700);
}

async function stageGeometry(page, selector) {
  return page.evaluate((sel) => {
    const app = document.querySelector(".app");
    const el = document.querySelector(sel);
    if (!app || !el) return null;
    const a = app.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    return {
      appLeft: a.left,
      appWidth: a.width,
      elLeft: e.left,
      elWidth: e.width,
      deltaLeft: Math.abs(e.left - a.left),
      aligned: Math.abs(e.left - a.left) <= 2 && Math.abs(e.width - a.width) <= 2,
    };
  }, selector);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 200));
});

try {
  await enterHome(page);

  // ——— Calls + → New Call 928:276 ———
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-testid="member-tab-chats"]').click({ force: true });
  await page.waitForSelector('[data-testid="chats-home"]', { timeout: 15000 });
  await page.locator('[data-testid="comm-mode-calls"]').click({ force: true });
  await page.waitForSelector('[data-testid="calls-continuity-home"]', { timeout: 10000 });
  await page.locator('[data-testid="calls-home-new"]').click({ force: true });
  await page.waitForSelector('[data-testid="new-call-destination"]', { timeout: 10000 });
  const newCallOk = (await page.locator('[data-testid="new-call-destination"]').count()) === 1;
  const searchGone = (await page.locator('[data-testid="search-destination"]').count()) === 0;
  const peopleHeading = await page.locator("text=People").first().isVisible();
  const groupsHeading = await page.locator("text=Groups").first().isVisible();
  const noPlacesTaxonomy = (await page.locator("text=Experiences").count()) === 0;
  log("new_call_928_276", newCallOk && searchGone && peopleHeading && groupsHeading && noPlacesTaxonomy, {
    newCallOk,
    searchGone,
  });
  await page.screenshot({
    path: join(OUT, "RUNTIME_NEW_CALL.png"),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  });

  // One-tap dial Chanelle
  await page.locator('[data-testid="new-call-dial-chanelle"]').click({ force: true });
  await page.waitForTimeout(600);
  const callOpen = (await page.locator('[data-testid="call-surface"]').count()) > 0;
  log("one_tap_outgoing_call", callOpen);
  if (callOpen) {
    await page.locator('[data-testid="call-end"]').click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }

  // Continuity from New Call person row
  await page.locator('[data-testid="calls-home-new"]').click({ force: true }).catch(async () => {
    await page.locator('[data-testid="comm-mode-calls"]').click({ force: true });
    await page.locator('[data-testid="calls-home-new"]').click({ force: true });
  });
  await page.waitForSelector('[data-testid="new-call-destination"]', { timeout: 8000 }).catch(() => {});
  if ((await page.locator('[data-testid="new-call-person-chanelle"]').count()) > 0) {
    await page.locator('[data-testid="new-call-person-chanelle"]').click({ force: true });
    await page.waitForSelector('[data-testid="call-continuity-destination"]', { timeout: 8000 });
    const contOk =
      (await page.locator('[data-testid="call-cont-call"]').count()) === 1 &&
      (await page.locator('[data-testid="call-cont-video"]').count()) === 1 &&
      (await page.locator('[data-testid="call-cont-chat"]').count()) === 1;
    log("call_continuity_928_158", contOk);
    await page.screenshot({
      path: join(OUT, "RUNTIME_CALL_CONTINUITY.png"),
      clip: { x: 0, y: 0, width: 390, height: 844 },
    });
    await page.locator('[data-testid="call-cont-back"]').click({ force: true });
  } else {
    log("call_continuity_928_158", false, { reason: "new-call not remounted" });
  }

  // Search / Activity exclusivity — mutually exclusive destination states
  await page.locator('[data-testid="member-tab-home"]').click({ force: true });
  await page.waitForTimeout(500);
  await page.locator('[data-testid="gsh-search"]').first().click({ force: true });
  await page.waitForSelector('[data-testid="search-destination"]', { timeout: 10000 });
  const searchOnly =
    (await page.locator('[data-testid="search-destination"]').count()) === 1 &&
    (await page.locator('[data-testid="activity-destination"]').count()) === 0;
  // Close search via back, then open Activity
  await page.locator('[data-testid="search-back"], button[aria-label="Back"]').first().click({ force: true });
  await page.waitForTimeout(400);
  await page.locator('[data-testid="gsh-activity"]').first().click({ force: true });
  await page.waitForSelector('[data-testid="activity-destination"]', { timeout: 10000 });
  const activityOnly =
    (await page.locator('[data-testid="activity-destination"]').count()) === 1 &&
    (await page.locator('[data-testid="search-destination"]').count()) === 0;
  // While Activity is open, Home Search control may be covered — close Activity then reopen Search
  await page.locator('[data-testid="activity-back"]').click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('[data-testid="gsh-search"]').first().click({ force: true });
  await page.waitForSelector('[data-testid="search-destination"]', { timeout: 8000 });
  const afterCycle =
    (await page.locator('[data-testid="search-destination"]').count()) === 1 &&
    (await page.locator('[data-testid="activity-destination"]').count()) === 0;
  log("search_activity_exclusivity", searchOnly && activityOnly && afterCycle, {
    searchOnly,
    activityOnly,
    afterCycle,
  });

  // Section 06 stage alignment on desktop width
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('[data-testid="member-tab-you"]').click({ force: true });
  await page.waitForTimeout(600);
  const privacyBtn = page.locator("text=Privacy").first();
  if (await privacyBtn.isVisible().catch(() => false)) {
    await privacyBtn.click({ force: true });
    await page.waitForSelector('[data-testid="you-settings-pane"]', { timeout: 10000 });
    const geom = await stageGeometry(page, '[data-testid="you-settings-pane"]');
    proof.section06_stage.privacy = geom;
    log("section06_privacy_stage_aligned", !!geom?.aligned, geom || {});
    await page.screenshot({ path: join(OUT, "RUNTIME_PRIVACY_STAGE.png") });
  } else {
    log("section06_privacy_stage_aligned", false, { reason: "privacy row not found" });
  }

  proof.asserts = Object.fromEntries(proof.flow.map((f) => [f.step, f.ok]));
  const fails = proof.flow.filter((f) => !f.ok);
  proof.P2_CURRENT_COMPLETE = fails.length === 0;
  proof.P2_FROZEN = false;
  proof.finished_at = new Date().toISOString();
  proof.founder_verification_url = BASE;
  proof.founder_path = [
    "Chats → Calls → + → New Call (people/groups only)",
    "☎ Chanelle → outgoing audio",
    "Chanelle row → Call Continuity Call/Video/Chat",
    "Home Search then Activity — never both headers",
    "You → Privacy — stage aligned with dock on desktop",
  ];

  writeFileSync(join(OUT, "P2_1_FOUNDER_CORRECTION_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ P2_CURRENT_COMPLETE: proof.P2_CURRENT_COMPLETE, fails: fails.map((f) => f.step) }, null, 2));
  if (fails.length) process.exit(1);
} catch (e) {
  proof.fatal = String(e).slice(0, 600);
  proof.P2_CURRENT_COMPLETE = false;
  writeFileSync(join(OUT, "P2_1_FOUNDER_CORRECTION_PROOF.json"), JSON.stringify(proof, null, 2));
  console.error(e);
  process.exit(1);
} finally {
  await browser.close();
}
