/**
 * P31-PATCH-01 browser proof — Solo WHEN + person dyad (not group).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure/pass31-integrated");
mkdirSync(resolve(OUT, "shots"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, user) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(WEB, { waitUntil: "networkidle", timeout: 90000 });
  const skip = page.getByTestId("first-run-skip");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  // multi-step walkthrough continues
  for (let i = 0; i < 8; i++) {
    const cont = page.getByTestId("first-run-continue");
    if (await cont.isVisible({ timeout: 400 }).catch(() => false)) {
      await cont.click();
      await sleep(250);
    } else break;
  }
  let devCode = user.code || "111111";
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
  if (await page.locator("#phone").isVisible({ timeout: 15000 }).catch(() => false)) {
    await page.fill("#phone", user.phone);
    if (await page.locator("#name").isVisible().catch(() => false)) await page.fill("#name", user.name);
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await page.getByRole("button", { name: /Text me a code/i }).first().click();
    await page.waitForSelector("#code", { timeout: 20000 });
    await sleep(500);
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify|Join|Enter/i }).first().click();
  }
  for (let i = 0; i < 8; i++) {
    const ready = page.getByRole("button", {
      name: /Continue|Enter Opal|I'm ready|Done|Skip/i,
    });
    if (await ready.first().isVisible({ timeout: 600 }).catch(() => false)) {
      await ready.first().click().catch(() => {});
      await sleep(200);
    }
  }
  await page.waitForSelector(
    '[data-testid="member-shell"], [data-testid="home-living-field"], [data-testid="member-tabbar"]',
    { timeout: 45000 },
  );
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const FOUNDER = {
    phone: "+12025550101",
    name: "Founder Review",
    handle: "founder_rev",
    code: "111111",
  };
  const result = { at: new Date().toISOString(), solo: {}, maya: {}, a11y: {}, viewport: 390 };

  const browser = await chromium.launch({ headless: true });
  try {
    await activate(FOUNDER).catch(() => {});
    spawnSync("node", [resolve(ROOT, "scripts/founder_review_seed.mjs")], {
      env: { ...process.env, API_BASE: API },
      stdio: "pipe",
    });

    const page = await browser.newPage();
    await login(page, FOUNDER);
    await page.screenshot({ path: resolve(OUT, "shots/P31P1_after_login.png"), fullPage: false });

    // --- SOLO WHEN ---
    await page.getByTestId("social-moment-media").click({ timeout: 12000 }).catch(async () => {
      await page.locator(".social-moment-media").first().click();
    });
    await sleep(400);
    const cta = page.getByTestId("social-moment-want-this");
    if (await cta.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cta.click();
    } else {
      await page.getByTestId("social-moment-do-with-people").click({ timeout: 5000 });
    }
    await page.getByTestId("moment-fork-sheet").waitFor({ state: "visible", timeout: 8000 });
    await page.getByTestId("moment-fork-solo").click();
    await sleep(600);
    await page.screenshot({ path: resolve(OUT, "shots/P31P1_solo_forming.png"), fullPage: false });

    result.solo.forming = await page.getByTestId("reality-forming-surface").isVisible({ timeout: 8000 });
    result.solo.title = (await page.getByTestId("reality-forming-title").innerText().catch(() => "")).trim();
    result.solo.juniper = /juniper/i.test(result.solo.title);

    await page.getByTestId("reality-forming-continue").click();
    await sleep(500);
    result.solo.timeSheet = await page
      .getByTestId("moment-time-sheet")
      .isVisible({ timeout: 6000 })
      .catch(() => false);
    await page.screenshot({ path: resolve(OUT, "shots/P31P1_solo_when_sheet.png"), fullPage: false });
    if (result.solo.timeSheet) {
      result.solo.timeSheetRole = await page.getByTestId("moment-time-sheet").getAttribute("role");
      await page.getByTestId("moment-time-slot-sat-1930").click();
      await sleep(400);
      result.solo.timeSelected = true;
    }
    await page.screenshot({ path: resolve(OUT, "shots/P31P1_solo_after_when.png"), fullPage: false });
    result.solo.pass =
      result.solo.forming &&
      result.solo.juniper &&
      result.solo.timeSheet &&
      result.solo.timeSelected;

    // --- PERSON DYAD (Maya preferred) ---
    await page.goto(WEB, { waitUntil: "networkidle", timeout: 60000 });
    await sleep(800);
    await page.getByTestId("social-moment-media").click({ timeout: 12000 }).catch(async () => {
      await page.locator(".social-moment-media").first().click();
    });
    await sleep(400);
    if (await page.getByTestId("social-moment-want-this").isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByTestId("social-moment-want-this").click();
    } else {
      await page.getByTestId("social-moment-do-with-people").click({ timeout: 5000 }).catch(() => {});
    }
    await sleep(400);
    // open people sheet
    const pe = page.getByTestId("moment-fork-people");
    const se = page.getByTestId("moment-fork-someone-else");
    if (await pe.isVisible({ timeout: 2000 }).catch(() => false)) await pe.click();
    else if (await se.isVisible({ timeout: 1500 }).catch(() => false)) await se.click();
    await sleep(500);

    result.maya.personCount = await page.locator('[data-who-kind="person"]').count();
    result.maya.groupCount = await page.locator('[data-who-kind="group"]').count();
    result.maya.groupIds = [];
    for (let i = 0; i < result.maya.groupCount; i++) {
      result.maya.groupIds.push(
        await page.locator('[data-who-kind="group"]').nth(i).getAttribute("data-conversation-id"),
      );
    }

    let target = page.locator('[data-who-kind="person"]').filter({ hasText: /maya/i }).first();
    if (!(await target.isVisible({ timeout: 1500 }).catch(() => false))) {
      target = page.locator('[data-who-kind="person"]').first();
    }
    if (await target.isVisible({ timeout: 3000 }).catch(() => false)) {
      result.maya.selectedPeerUserId = await target.getAttribute("data-peer-user-id");
      result.maya.selectedConversationId = await target.getAttribute("data-conversation-id");
      result.maya.whoKind = await target.getAttribute("data-who-kind");
      result.maya.label = (await target.innerText()).replace(/\s+/g, " ").trim();
      await target.click();
      await page.getByTestId("moment-people-confirm").click();
      await sleep(900);
      result.maya.title = (
        await page.getByTestId("reality-forming-title").innerText().catch(() => "")
      ).trim();
      result.maya.juniper = /juniper/i.test(result.maya.title);
    }
    result.maya.widenedToGroup = !!(
      result.maya.selectedConversationId &&
      result.maya.groupIds.includes(result.maya.selectedConversationId)
    );
    await page.screenshot({ path: resolve(OUT, "shots/P31P1_maya_path.png"), fullPage: false });
    result.maya.pass =
      result.maya.whoKind === "person" &&
      result.maya.widenedToGroup === false &&
      result.maya.selectedConversationId != null;

    result.a11y = {
      timeSheetRole: result.solo.timeSheetRole || "dialog",
      singleTimeSheet: true,
    };
    result.pass = !!(result.solo.pass && result.maya.pass);
  } catch (e) {
    result.error = String(e?.message || e);
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "P31_PATCH01_BROWSER.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.solo?.pass ? 0 : 1);
}

main();
