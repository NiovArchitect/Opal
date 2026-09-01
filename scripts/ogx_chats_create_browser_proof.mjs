/**
 * HISTORICAL ONLY — B6 RETIRED FROM CURRENT EXECUTABLE SET.
 *
 * Completeness closure — Create Graph 149:31→145:216 + Chats-00 + partial OGX Home.
 * HOLD. DO NOT MERGE.
 *
 * Current Create authorities are 863:284 / 863:338 (see prove_b4_create.mjs).
 * This script asserts legacy 149:31 as current — do NOT run as current proof.
 * Set OPAL_RUN_HISTORICAL=1 to re-execute for lineage archaeology only.
 * Historical evidence JSON under social-flow-final-convergence is IMMUTABLE.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "./founder_proof_fixture.mjs";

if (process.env.OPAL_RUN_HISTORICAL !== "1") {
  console.error(
    JSON.stringify(
      {
        status: "RETIRED_HISTORICAL",
        square: "B6",
        script: "ogx_chats_create_browser_proof.mjs",
        reason: "Asserts legacy Create 149:31 as current; current authority is 863:284/863:338",
        current_proof: "apps/opal_web/scripts/prove_b4_create.mjs",
        hint: "OPAL_RUN_HISTORICAL=1 to run lineage-only",
      },
      null,
      2,
    ),
  );
  process.exit(3);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/shots",
);
const EVIDENCE = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence",
);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(WEB, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(800);

  // SFR-00 → already have account → AUTH phone (fr06)
  if (await page.getByTestId("fr00-already-account").isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
  } else if (await page.getByTestId("fr00-skip-intro").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-skip-intro").click();
    await sleep(400);
    if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-already-account").click();
    } else if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-continue-phone").click();
    }
  }
  await sleep(500);

  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/product/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });

  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 20000 });
  if (await page.getByTestId("fr06-phone-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr06-phone-input"]', "+12025550101");
  } else {
    await page.fill("#phone", "+12025550101");
  }
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) {
    await consent.first().check().catch(() => {});
  }
  if (await page.getByTestId("fr06-continue").isVisible().catch(() => false)) {
    await page.getByTestId("fr06-continue").click();
  } else {
    await page.getByRole("button", { name: /Text me a code/i }).first().click();
  }

  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(400);
  if (await page.getByTestId("fr07-code-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr07-code-input"]', devCode);
    await page.getByTestId("fr07-submit").click();
  } else {
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }

  // Wait for profile (AUTH) or home
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) break;
    await sleep(250);
  }

  if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const v = await page.getByTestId("fr08-name-input").inputValue().catch(() => "");
      if (!v) await page.fill('[data-testid="fr08-name-input"]', "Founder Review");
    }
    if (await page.getByTestId("fr08-username-input").isVisible().catch(() => false)) {
      const v = await page.getByTestId("fr08-username-input").inputValue().catch(() => "");
      if (!v) await page.fill('[data-testid="fr08-username-input"]', "founder_rev");
    }
    // Wait until Continue is enabled (not "Working")
    for (let i = 0; i < 30; i++) {
      const btn = page.getByTestId("fr08-continue");
      const disabled = await btn.isDisabled().catch(() => true);
      if (!disabled) {
        await btn.click();
        break;
      }
      await sleep(200);
    }
  }

  for (let i = 0; i < 20; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
      await sleep(400);
      continue;
    }
    await sleep(300);
  }

  await page.waitForSelector('[data-testid="member-shell"], [data-testid="member-tabbar"]', {
    timeout: 30000,
  });
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    web: WEB,
    create: {},
    chats: {},
    home: {},
    dock: {},
    planWhoSkip: {},
    verdict: "HOLD",
  };

  await activate({
    phone: "+12025550101",
    name: "Founder Review",
    handle: "founder_rev",
    code: "111111",
  }).catch(() => {});

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => {
      result.pageError = String(e.message || e);
    });
    await login(page);

    // --- HOME partial OGX ---
    const home = page.getByTestId("graph-social-home");
    result.home.visible = await home.isVisible().catch(() => false);
    result.home.figma = await home.getAttribute("data-figma-home").catch(() => null);
    result.home.status = await home.getAttribute("data-home-status").catch(() => null);
    result.home.hydration = await home.getAttribute("data-home-hydration").catch(() => null);
    result.home.stories = await page.getByTestId("gsh-stories").isVisible().catch(() => false);
    result.home.feedCount = await page.locator('[data-testid^="gsh-card-"]').count();
    await page.screenshot({ path: resolve(OUT, "OGX_HOME_PARTIAL.png"), fullPage: false });

    // --- DOCK ---
    result.dock.createAttr = await page
      .getByTestId("member-tabbar")
      .getAttribute("data-create-dock")
      .catch(() => null);
    result.dock.model = await page
      .getByTestId("member-tabbar")
      .getAttribute("data-nav-model")
      .catch(() => null);
    result.dock.hasPermanentPlus = await page
      .locator('[data-testid="member-tab-create"], .tab-create-plus')
      .count()
      .then((n) => n > 0)
      .catch(() => false);

    // --- CHATS ---
    await page.getByTestId("member-tab-chats").click();
    await sleep(800);
    // Allow conversation hydration from listConversations
    for (let i = 0; i < 20; i++) {
      const n = await page.locator('[data-testid^="chats-row-"]').count();
      if (n > 0) break;
      await sleep(400);
    }
    const chats = page.getByTestId("chats-home");
    result.chats.visible = await chats.isVisible().catch(() => false);
    result.chats.figma = await chats.getAttribute("data-figma").catch(() => null);
    result.chats.rowCount = await page.locator('[data-testid^="chats-row-"]').count();
    result.chats.empty = await page.getByTestId("chats-home-empty").isVisible().catch(() => false);
    result.chats.loadError = await page.locator('[data-testid="load-error"], .load-error').first().textContent().catch(() => null);
    result.chats.hasNew = await page.getByTestId("chats-home-new").isVisible().catch(() => false);
    await page.screenshot({ path: resolve(OUT, "CHATS_00.png"), fullPage: false });

    await page.getByTestId("chats-home-new").click();
    await sleep(400);
    result.chats.newPicker = await page.getByTestId("new-chat-picker").isVisible().catch(() => false);
    await page.screenshot({ path: resolve(OUT, "CHATS_NEW_PICKER.png"), fullPage: false });
    if (result.chats.newPicker) {
      await page.getByTestId("new-chat-back").click();
      await sleep(300);
    }

    // Open first chat if any — Plan WHO skip
    const firstRow = page.locator('[data-testid^="chats-row-"]').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await sleep(800);
      const plan = page.getByTestId("gpt-plan");
      result.planWhoSkip.planVisible = await plan.isVisible().catch(() => false);
      result.planWhoSkip.whoSkipAttr = await plan.getAttribute("data-who-skip").catch(() => null);
      if (result.planWhoSkip.planVisible) {
        await plan.click();
        await page
          .getByTestId("graph-create-choose-media")
          .waitFor({ state: "visible", timeout: 8000 })
          .catch(() => {});
        await sleep(300);
        result.planWhoSkip.createOpened = await page
          .getByTestId("graph-create-choose-media")
          .isVisible()
          .catch(() => false);
        result.planWhoSkip.context = await page
          .getByTestId("graph-create-context")
          .textContent()
          .catch(() => null);
        result.planWhoSkip.whoPickerOpen = await page
          .getByTestId("moment-fork-sheet")
          .isVisible()
          .catch(() => false);
        await page.screenshot({
          path: resolve(OUT, "PLAN_FROM_DIRECT_CREATE.png"),
          fullPage: false,
        });
        if (result.planWhoSkip.createOpened) {
          await page.getByTestId("graph-create-back").click({ force: true });
          await sleep(400);
          // Ensure overlay closed before continuing
          await page
            .getByTestId("graph-create-flow")
            .waitFor({ state: "detached", timeout: 5000 })
            .catch(() => {});
        }
      }
      const back = page.locator('[data-testid="graph-people-header"] .gpt-back, .gpt-back').first();
      if (await back.isVisible().catch(() => false)) {
        await back.click({ force: true });
        await sleep(400);
      }
    }

    // Ensure no overlay blocks dock
    if (await page.getByTestId("graph-create-flow").isVisible().catch(() => false)) {
      await page.getByTestId("graph-create-back").click({ force: true }).catch(() => {});
      await sleep(300);
    }

    // --- CREATE GRAPH from Graphs ---
    await page.getByTestId("member-tab-graphs").click({ force: true });
    await sleep(600);
    result.create.graphsHome = await page.getByTestId("graphs-home").isVisible().catch(() => false);
    const createBtn = page.getByTestId("graphs-create");
    result.create.buttonVisible = await createBtn.isVisible().catch(() => false);
    await page.screenshot({ path: resolve(OUT, "GRAPHS_00.png"), fullPage: false });
    await createBtn.click();
    await sleep(800);
    const choose = page.getByTestId("graph-create-choose-media");
    result.create.chooseMediaVisible = await choose.isVisible({ timeout: 8000 }).catch(() => false);
    result.create.figma149 = await page
      .getByTestId("graph-create-flow")
      .getAttribute("data-figma-create")
      .catch(() => null);
    result.create.findTimePrimary = await page
      .getByTestId("availability-sheet")
      .isVisible()
      .catch(() => false);
    await page.screenshot({ path: resolve(OUT, "CREATE_149_31.png"), fullPage: false });

    if (result.create.chooseMediaVisible) {
      await page.getByTestId("graph-create-library").click();
      await sleep(500);
      result.create.composeVisible = await page
        .getByTestId("graph-create-compose")
        .isVisible()
        .catch(() => false);
      result.create.figma145 = await page
        .getByTestId("graph-create-flow")
        .getAttribute("data-figma-create")
        .catch(() => null);
      await page.screenshot({ path: resolve(OUT, "CREATE_145_216.png"), fullPage: false });
      await page.getByTestId("graph-create-submit").click();
      await sleep(500);
      result.create.returnedGraphs = await page
        .getByTestId("graphs-home")
        .isVisible()
        .catch(() => false);
    } else {
      result.create.graphCreateOpenInDom = await page
        .locator('[data-testid="graph-create-flow"]')
        .count();
    }

    const okCreate =
      result.create.chooseMediaVisible &&
      result.create.figma149 === "149:31" &&
      result.create.composeVisible &&
      result.create.figma145 === "145:216" &&
      !result.create.findTimePrimary;
    const okChats = result.chats.visible && result.chats.figma === "476:2" && result.chats.newPicker;
    const okHome =
      result.home.visible &&
      result.home.figma === "287:6" &&
      result.home.status === "partial-ogx";
    const okDock = result.dock.createAttr === "deferred" && !result.dock.hasPermanentPlus;

    result.acceptance = {
      createGraphApprovedPath: okCreate,
      chats00: okChats,
      homePartialOgx: okHome,
      noPermanentPlus: okDock,
      planSkipsWho:
        !result.planWhoSkip.planVisible ||
        (result.planWhoSkip.whoSkipAttr === "true" &&
          result.planWhoSkip.createOpened &&
          result.planWhoSkip.whoPickerOpen === false),
    };
    result.verdict =
      okCreate && okChats && okHome && okDock ? "HOLD_SLICE_PASS" : "HOLD_SLICE_PARTIAL";

    writeFileSync(
      resolve(EVIDENCE, "BROWSER_PROOF_CHATS_CREATE_HOME.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
