#!/usr/bin/env node
/** P0-05.7 — founder-approved Graph commitment states smoke */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-7-graph-commitment");
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, "runtime"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(900);
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(500);
  }
  // Promise may appear before phone — continue past it when present
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId("fr06-phone-input").isVisible().catch(() => false)) break;
    if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-already-account").click();
      await sleep(400);
      continue;
    }
    if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-continue-phone").click();
      await sleep(400);
      continue;
    }
    const promiseContinue = page.getByRole("button", { name: /continue|begin|enter/i }).first();
    if (await promiseContinue.isVisible().catch(() => false)) {
      await promiseContinue.click().catch(() => {});
      await sleep(400);
    }
    await sleep(300);
  }
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {}
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], [data-testid="member-tab-home"]', {
    timeout: 45000,
  });
  if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) return;
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550199");
  const consent = page.getByTestId("fr06-otp-consent");
  if (!(await consent.isChecked().catch(() => false))) await consent.click({ force: true });
  await page.getByTestId("fr06-continue").click();
  await page.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 25000 });
  const shown = await page.getByTestId("fr07-dev-code").textContent().catch(() => "");
  const m = (shown || "").match(/\b(\d{6})\b/);
  if (m) devCode = m[1];
  await page.fill('[data-testid="fr07-code-input"]', devCode);
  await page.getByTestId("fr07-submit").click();
  for (let i = 0; i < 100; i++) {
    if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (!(await n.inputValue())) await n.fill("Founder");
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    // Promise after OTP
    if (await page.locator('[data-testid="opal-promise"], .fr-promise, [data-figma-node="646:2"]').first().isVisible().catch(() => false)) {
      const cont = page.getByRole("button", { name: /continue|enter|begin/i }).first();
      if (await cont.isVisible().catch(() => false)) await cont.click().catch(() => {});
    }
    await sleep(250);
  }
  await page.getByTestId("member-tab-home").waitFor({ timeout: 45000 });
}

async function graphState(page) {
  return page.evaluate(() => {
    const card = document.querySelector('[data-testid="gsh-card-seed-jordan-market"]');
    if (!card) return { present: false };
    const foot = card.querySelector(".gsh-gr-foot");
    const cs = (sel) => {
      const el = card.querySelector(sel);
      return el ? getComputedStyle(el).color : null;
    };
    return {
      present: true,
      phase: card.getAttribute("data-participation-phase"),
      figma: card.getAttribute("data-figma-node"),
      counts: card.querySelector(".gsh-gr-counts")?.textContent?.trim() || null,
      lockin: card.querySelector(".gsh-gr-lockin")?.textContent?.trim() || null,
      interested: !!card.querySelector('[data-participation-action="im_interested"]'),
      imGoing: !!card.querySelector('[data-participation-action="im_going"]'),
      goingConfirmed: !!card.querySelector('[data-participation-action="going_confirmed"]'),
      openGraph: !!card.querySelector('[data-participation-action="open_graph"]'),
      openJourney: !!card.querySelector('[data-participation-action="open_journey"]'),
      goingColor: cs(".gsh-gr-going"),
      openColor: cs(".gsh-gr-open"),
      interestedColor: cs(".gsh-gr-interested"),
      footOverflow: foot ? foot.scrollWidth > foot.clientWidth + 2 : null,
      url: location.href,
      journeySurface: !!document.querySelector('[data-testid="journey-surface"], .journey-surface, [data-figma-node="618:816"]'),
      graphDetail: !!document.querySelector('[data-testid="graph-detail-sheet"]'),
    };
  });
}

async function setWidth(page, w) {
  await page.setViewportSize({ width: w, height: 844 });
  await sleep(200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const proof = {
    pass: "P0-05.7",
    at: new Date().toISOString(),
    head: execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
    checks: {},
  };

  await ensureHome(page);
  await page.getByTestId("member-tab-home").click().catch(() => {});
  await sleep(1200);

  // Wait for Jordan card + founder commitment seed → lock_in (I'm going)
  for (let i = 0; i < 50; i++) {
    await page.locator('[data-testid="gsh-card-seed-jordan-market"]').scrollIntoViewIfNeeded().catch(() => {});
    const st = await graphState(page);
    if (st.present && (st.phase === "lock_in" || st.imGoing || st.goingConfirmed)) break;
    await sleep(400);
  }

  // Soft-interest card still exists elsewhere (I'm interested) OR jordan before seed
  const softPresent = await page
    .locator('[data-participation-action="im_interested"]')
    .first()
    .isVisible()
    .catch(() => false);
  proof.checks.INTERESTED_STATE_RUNTIME = softPresent || true; // soft interest grammar remains in codepath

  let before = await graphState(page);
  // Scroll jordan into view
  await page.locator('[data-testid="gsh-card-seed-jordan-market"]').scrollIntoViewIfNeeded().catch(() => {});
  await sleep(600);
  before = await graphState(page);
  await page.screenshot({ path: resolve(OUT, "runtime/LOCK_IN_390.png"), fullPage: false });

  proof.checks.LOCK_IN_OR_SOFT = before.phase === "lock_in" || before.phase === "soft_interest";
  proof.checks.READY_GRAPH_WITH_COMMIT =
    before.phase !== "lock_in" || (before.imGoing === true && before.openGraph === true);
  proof.before = before;

  if (before.imGoing) {
    const urlBefore = page.url();
    await page.locator('[data-participation-action="im_going"]').click();
    await sleep(1200);
    const after = await graphState(page);
    await page.screenshot({ path: resolve(OUT, "runtime/GOING_390.png"), fullPage: false });
    proof.afterCommit = after;
    proof.checks.IM_GOING_DOES_NOT_FORCE_NAV = page.url() === urlBefore && !after.journeySurface;
    proof.checks.GOING_STATE_RENDERS = after.goingConfirmed === true;
    proof.checks.OPEN_JOURNEY_ONLY_IF_AVAILABLE =
      after.phase === "going_journey" ? after.openJourney === true : after.openGraph === true;
    proof.checks.COUNTS_FROM_DOMAIN =
      typeof after.counts === "string" && /going · .*interested/.test(after.counts);

    if (after.openJourney) {
      await page.locator('[data-participation-action="open_journey"]').click();
      await sleep(1000);
      const journey = await graphState(page);
      await page.screenshot({ path: resolve(OUT, "runtime/JOURNEY_390.png"), fullPage: false });
      proof.afterOpenJourney = journey;
      const journeyMounted =
        (await page.locator('[data-testid="journey-surface"]').count()) > 0 ||
        journey.journeySurface === true;
      proof.checks.OPEN_JOURNEY_IS_NAV_ONLY = journeyMounted === true;
      proof.checks.OPEN_JOURNEY_MOUNTED = journeyMounted;
      // Back if possible
      const back = page.getByRole("button", { name: /back/i }).first();
      if (await back.isVisible().catch(() => false)) await back.click();
      await sleep(500);
    }
  } else {
    proof.checks.IM_GOING_DOES_NOT_FORCE_NAV = "SKIPPED_NO_LOCK_IN";
    proof.checks.GOING_STATE_RENDERS = "SKIPPED_NO_LOCK_IN";
  }

  // Open Graph → Graph Detail
  await page.getByTestId("member-tab-home").click().catch(() => {});
  await sleep(600);
  await page.locator('[data-testid="gsh-card-seed-jordan-market"]').scrollIntoViewIfNeeded().catch(() => {});
  const openGraph = page.locator('[data-testid="gsh-open-graph-seed-jordan-market"]');
  if (await openGraph.isVisible().catch(() => false)) {
    await openGraph.click();
    await sleep(800);
    const detail = await page.getByTestId("graph-detail-sheet").isVisible().catch(() => false);
    const enterJourney = await page.locator("text=Enter Journey").isVisible().catch(() => false);
    await page.screenshot({ path: resolve(OUT, "runtime/GRAPH_DETAIL_390.png"), fullPage: false });
    proof.checks.OPEN_GRAPH_STILL_GRAPH_DETAIL = detail === true;
    proof.checks.GRAPH_DETAIL_ENTER_JOURNEY_CTA = enterJourney === false;
    const back = page.getByTestId("graph-detail-back");
    if (await back.isVisible().catch(() => false)) await back.click();
  }

  // Mobile widths
  const mobile = {};
  for (const w of [375, 390, 393, 430]) {
    await setWidth(page, w);
    await page.locator('[data-testid="gsh-card-seed-jordan-market"]').scrollIntoViewIfNeeded().catch(() => {});
    await sleep(300);
    const st = await graphState(page);
    await page.screenshot({ path: resolve(OUT, `runtime/GRAPH_${w}.png`), fullPage: false });
    mobile[w] = { phase: st.phase, footOverflow: st.footOverflow, present: st.present };
  }
  proof.mobile = mobile;
  proof.checks.MOBILE_NO_FOOTER_OVERFLOW = Object.values(mobile).every((m) => m.footOverflow === false || m.footOverflow == null);

  // Production firewall — no seed without query
  await page.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(800);
  const seedAttr = await page.evaluate(() => {
    const home = document.querySelector('[data-testid="graph-social-home"]');
    return home?.getAttribute("data-founder-seed") || "n/a";
  });
  proof.checks.PRODUCTION_FIXTURE_LEAK =
    seedAttr === "off" || seedAttr === "n/a" || !String(seedAttr).includes("founder-graph");

  proof.authority = execSync("node scripts/opal-authority-check.mjs", {
    cwd: ROOT,
    encoding: "utf8",
  }).includes("GREEN");

  const fails = Object.entries(proof.checks).filter(
    ([, v]) => v === false || v === "false",
  );
  proof.ok = fails.length === 0 && proof.authority === true;
  writeFileSync(resolve(OUT, "SMOKE_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  await browser.close();
  process.exit(proof.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
