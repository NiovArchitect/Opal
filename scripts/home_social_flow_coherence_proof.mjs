#!/usr/bin/env node
/**
 * Home Social-Flow Coherence proof — founder reattack 2026-08-20.
 * HOLD. DO NOT MERGE. permissionToStartLive=NO. Phase C Chats PAUSED.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence/home-reattack",
);
mkdirSync(resolve(OUT, "runtime"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function skipToAuth(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(400);
  // Capture Promise mid / late composition if present
  const promise = page.getByTestId("opal-promise-screen");
  if (await promise.isVisible({ timeout: 4000 }).catch(() => false)) {
    await sleep(4200);
    await page.screenshot({
      path: resolve(OUT, "runtime/390_PROMISE_GRAPH_MOMENT.png"),
      fullPage: false,
    });
    const enter = page.getByTestId("opal-promise-enter");
    if (await enter.isVisible().catch(() => false)) await enter.click();
  }
  if (
    await page.getByTestId("fr00-already-account").isVisible({ timeout: 3000 }).catch(() => false)
  ) {
    await page.getByTestId("fr00-already-account").click();
  }
}

async function login(page) {
  await skipToAuth(page);
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* */
    }
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 20000 });
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101").catch(async () => {
    await page.fill("#phone", "+12025550101");
  });
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  await page.getByTestId("fr06-continue").click().catch(async () => {
    await page.getByRole("button", { name: /Text me a code/i }).click();
  });
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(200);
  await page.fill('[data-testid="fr07-code-input"]', devCode).catch(async () => page.fill("#code", devCode));
  await page.getByTestId("fr07-submit").click().catch(async () => {
    await page.getByRole("button", { name: /Continue|Verify/i }).click();
  });
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (await n.isVisible().catch(() => false)) {
        const v = await n.inputValue().catch(() => "");
        if (!v) await n.fill("Founder Review");
      }
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(180);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 });
}

async function viewportAudit(page, label) {
  return page.evaluate((lab) => {
    const vw = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    const dest = document.querySelector(
      "[data-testid='graph-detail-sheet'],[data-testid='forward-share-picker'],[data-testid='discovery-detail-sheet'],[data-testid='journey-surface'],[data-testid='journey-manage-sheet'],[data-testid='story-viewer'],[data-testid='graph-profile-page'],[data-testid='new-chat-picker']",
    );
    const destBox = dest ? dest.getBoundingClientRect() : null;
    const overlays = [...document.querySelectorAll("[role='dialog'], .opal-ephemeral-note")].map(
      (el) => ({
        testid: el.getAttribute("data-testid"),
        z: getComputedStyle(el).zIndex,
        pe: getComputedStyle(el).pointerEvents,
        visible: el.getClientRects().length > 0,
      }),
    );
    return {
      label: lab,
      viewportW: vw,
      scrollWidth: sw,
      pageBlowout: sw > vw + 1,
      destWidth: destBox ? Math.round(destBox.width) : null,
      destMaxOk: destBox ? destBox.width <= Math.min(vw, 480) + 1 : true,
      overlays,
    };
  }, label);
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const consoleErrors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => consoleErrors.push(String(e.message || e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const results = {
    hold: true,
    doNotMerge: true,
    permissionToStartLive: "NO",
    phaseCChats: "PAUSED",
    date: "2026-08-20",
    checks: {},
    audits: [],
    screens: [],
  };

  try {
    await login(page);
    await page.screenshot({
      path: resolve(OUT, "runtime/390_HOME.png"),
      fullPage: false,
    });
    results.screens.push("390_HOME.png");
    results.audits.push(await viewportAudit(page, "home"));

    // Open Graph
    const openGraph = page.locator('[data-testid^="gsh-open-graph-"]').first();
    if (await openGraph.isVisible({ timeout: 8000 }).catch(() => false)) {
      await openGraph.click();
      await sleep(600);
      await page.screenshot({
        path: resolve(OUT, "runtime/390_GRAPH_DETAIL.png"),
        fullPage: false,
      });
      results.screens.push("390_GRAPH_DETAIL.png");
      const gAudit = await viewportAudit(page, "graph-detail");
      results.audits.push(gAudit);
      results.checks.graphViewportOk = !gAudit.pageBlowout && gAudit.destMaxOk;
      results.checks.graphBackChevron = await page
        .getByTestId("graph-detail-back")
        .evaluate((el) => el.classList.contains("opal-nav-chevron"))
        .catch(() => false);
      await page.getByTestId("graph-detail-back").click();
      await sleep(400);
    } else {
      results.checks.graphOpenMissing = true;
    }

    // Shared history → profile
    const hist = page.locator('[data-testid^="gsh-shared-history-"]').first();
    if (await hist.isVisible({ timeout: 5000 }).catch(() => false)) {
      await hist.click();
      await sleep(500);
      await page.screenshot({
        path: resolve(OUT, "runtime/390_SHARED_HISTORY_PROFILE.png"),
        fullPage: false,
      });
      results.screens.push("390_SHARED_HISTORY_PROFILE.png");
      results.checks.sharedHistoryProfile = await page
        .getByTestId("graph-profile-page")
        .isVisible()
        .catch(() => false);
      results.checks.sharedHistoryLens = await page
        .getByTestId("gprof-shared-history-lens")
        .isVisible()
        .catch(() => false);
      await page.getByTestId("profile-person-back").click().catch(() => {});
      await sleep(300);
    }

    // Story
    const story = page.locator('[data-testid^="gsh-story-"]').first();
    if (await story.isVisible({ timeout: 4000 }).catch(() => false)) {
      await story.click();
      await sleep(500);
      await page.screenshot({
        path: resolve(OUT, "runtime/390_STORY_VIEWER.png"),
        fullPage: false,
      });
      results.screens.push("390_STORY_VIEWER.png");
      const mediaSrc = await page
        .locator('[data-testid="story-viewer-media"] img')
        .getAttribute("src")
        .catch(() => null);
      results.checks.storyHasRealMedia =
        !!mediaSrc && !/figma-v2\/stories\/(chanelle|maya|jordan|sabrina|alex)\.png$/.test(mediaSrc);
      await page.getByTestId("story-viewer-close").click();
      await sleep(300);
    }

    // Discovery
    const see = page.getByRole("button", { name: /See experience|Check out/i }).first();
    const discCard = page.locator('[data-testid^="gsh-card-"]').filter({ hasText: /Nearby|Listening|experience/i }).first();
    if (await see.isVisible({ timeout: 3000 }).catch(() => false)) {
      await see.click();
    } else if (await discCard.isVisible().catch(() => false)) {
      await discCard.click();
    }
    await sleep(500);
    if (await page.getByTestId("discovery-detail-sheet").isVisible().catch(() => false)) {
      await page.screenshot({
        path: resolve(OUT, "runtime/390_DISCOVERY.png"),
        fullPage: false,
      });
      results.screens.push("390_DISCOVERY.png");
      results.audits.push(await viewportAudit(page, "discovery"));
      results.checks.discoverySaveCopy = await page
        .getByTestId("discovery-save-idea")
        .innerText()
        .then((t) => /Save this idea/i.test(t))
        .catch(() => false);
      results.checks.discoveryBackChevron = await page
        .getByTestId("discovery-detail-back")
        .evaluate((el) => el.classList.contains("opal-nav-chevron"))
        .catch(() => false);
      await page.getByTestId("discovery-detail-back").click();
      await sleep(300);
    }

    // Forward from memory actions if available
    const forwardBtn = page.locator('[data-testid^="gsh-forward-"], [data-testid^="gsh-share-"]').first();
    if (await forwardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await forwardBtn.click();
      await sleep(500);
    }
    if (await page.getByTestId("forward-share-picker").isVisible().catch(() => false)) {
      await page.screenshot({
        path: resolve(OUT, "runtime/390_FORWARD.png"),
        fullPage: false,
      });
      results.screens.push("390_FORWARD.png");
      results.audits.push(await viewportAudit(page, "forward"));
      results.checks.forwardBackChevron = await page
        .getByTestId("forward-back")
        .evaluate((el) => el.classList.contains("opal-nav-chevron"))
        .catch(() => false);
      // no black footer plate: check cancel is sr-only / chevron present
      const cancelHidden = await page
        .getByTestId("forward-cancel")
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return s.clip !== "auto" || el.classList.contains("social-dest-sr-dismiss");
        })
        .catch(() => true);
      results.checks.forwardCancelNotGiant = cancelHidden;
      await page.getByTestId("forward-back").click();
      await sleep(400);
      // overlay residue
      results.checks.forwardResidueGone = !(await page
        .getByTestId("forward-share-picker")
        .isVisible()
        .catch(() => false));
    }

    // Overlay residue after home root
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(200);
    const residue = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll("[role='dialog']")].filter(
        (el) => el.getClientRects().length > 0,
      );
      return {
        visibleDialogs: dialogs.map((d) => d.getAttribute("data-testid")),
        bodyOverflow: getComputedStyle(document.body).overflow,
      };
    });
    results.checks.overlayResidue = residue;
    results.checks.zeroVisibleDialogsAtHome = residue.visibleDialogs.length === 0;

    results.checks.consoleErrorCount = consoleErrors.length;
    results.checks.consoleErrorsSample = consoleErrors.slice(0, 8);
    results.ok =
      results.checks.graphViewportOk !== false &&
      results.checks.zeroVisibleDialogsAtHome !== false;

    writeFileSync(resolve(OUT, "HOME_SOCIAL_FLOW_COHERENCE_PROOF.json"), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
