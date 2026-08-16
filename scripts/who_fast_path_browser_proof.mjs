/**
 * WHO-FAST-PATH-01 browser proof — multi person, no concatenation.
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
  // Wait for conversation list to hydrate (WHO fast path needs dyads in state)
  for (let i = 0; i < 40; i++) {
    const n = await page.locator('[data-testid="chat-row"], .chat-row, [data-testid="people-row"]').count().catch(() => 0);
    // Home may be default — open People briefly to force list paint, or wait network
    if (n > 0) break;
    await sleep(250);
  }
  await sleep(800);
}

async function openWho(page) {
  await page.getByTestId("social-moment-media").click({ timeout: 12000 }).catch(async () => {
    await page.locator(".social-moment-media").first().click();
  });
  await sleep(400);
  if (await page.getByTestId("social-moment-want-this").isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByTestId("social-moment-want-this").click();
  } else {
    await page.getByTestId("social-moment-do-with-people").click({ timeout: 5000 });
  }
  await page.getByTestId("moment-fork-sheet").waitFor({ state: "visible", timeout: 8000 });
  await sleep(300);
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
  const result = { at: new Date().toISOString(), who: {}, maya: {}, jordan: {}, a11y: {} };

  const browser = await chromium.launch({ headless: true });
  try {
    await activate(FOUNDER).catch(() => {});
    spawnSync("node", [resolve(ROOT, "scripts/founder_review_seed.mjs")], {
      env: { ...process.env, API_BASE: API },
      stdio: "pipe",
    });

    const page = await browser.newPage();
    await login(page, FOUNDER);
    // Nudge People tab so conversations are definitely loaded into shell state
    await page.getByRole("button", { name: /^People$/i }).click().catch(() => {});
    await sleep(1200);
    await page.getByRole("button", { name: /^Home$/i }).click().catch(() => {});
    await sleep(800);
    await openWho(page);
    await page.screenshot({
      path: resolve(OUT, "shots/WHO_FAST_PATH_390.png"),
      fullPage: false,
    });

    const sheet = page.getByTestId("moment-fork-sheet");
    result.who.solo = await page.getByTestId("moment-fork-solo").isVisible();
    result.who.title = await page.getByTestId("moment-fork-title").innerText().catch(() => "");
    const personBtns = page.locator('[data-testid^="moment-fork-person-"]');
    result.who.personCount = await personBtns.count();
    result.who.personLabels = [];
    result.who.ariaLabels = [];
    for (let i = 0; i < result.who.personCount; i++) {
      result.who.personLabels.push((await personBtns.nth(i).innerText()).trim());
      result.who.ariaLabels.push(await personBtns.nth(i).getAttribute("aria-label"));
    }
    result.who.hasMore = await page.getByTestId("moment-fork-more-people").isVisible().catch(() => false);
    result.who.hasGroups = await page.getByTestId("moment-fork-groups").isVisible().catch(() => false);
    result.who.hasSomeoneElse = await page.getByTestId("moment-fork-someone-else").count();
    result.who.joinedText = (await sheet.innerText()).replace(/\s+/g, " ");
    // Panel flex — column stack is the structural anti-concatenation proof
    result.who.panelDisplay = await page
      .locator(".moment-fork-panel")
      .evaluate((el) => getComputedStyle(el).flexDirection)
      .catch(() => null);
    result.who.optionBoxes = await page
      .locator(".moment-fork-panel .moment-people-option")
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), height: Math.round(r.height), text: el.textContent?.trim() };
        }),
      );
    // Distinct vertical bands (no shared top = not side-by-side glue)
    const tops = result.who.optionBoxes.map((b) => b.top);
    result.who.noConcatenation =
      result.who.panelDisplay === "column" &&
      tops.length >= 2 &&
      new Set(tops).size === tops.length;

    result.who.hasMaya = result.who.personLabels.some((l) => /maya/i.test(l));
    result.who.hasJordan = result.who.personLabels.some((l) => /jordan/i.test(l));
    result.who.pass =
      result.who.solo &&
      result.who.personCount >= 2 &&
      result.who.hasMaya &&
      result.who.hasJordan &&
      result.who.panelDisplay === "column" &&
      result.who.noConcatenation &&
      result.who.hasSomeoneElse === 0;

    // Tap Maya — routing
    const mayaBtn = page.locator('[data-testid^="moment-fork-person-"]').filter({ hasText: /maya/i }).first();
    if (await mayaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      result.maya.conversationId = await mayaBtn.getAttribute("data-conversation-id");
      result.maya.peerUserId = await mayaBtn.getAttribute("data-peer-user-id");
      await mayaBtn.click();
      await sleep(800);
      result.maya.formingTitle = (
        await page.getByTestId("reality-forming-title").innerText().catch(() => "")
      ).trim();
      result.maya.pass =
        /maya/i.test(result.maya.formingTitle) && /juniper/i.test(result.maya.formingTitle);
      await page.screenshot({
        path: resolve(OUT, "shots/WHO_FAST_PATH_maya.png"),
        fullPage: false,
      });
    }

    // Jordan path
    await page.goto(WEB, { waitUntil: "networkidle" });
    await sleep(800);
    await openWho(page);
    const jordanBtn = page
      .locator('[data-testid^="moment-fork-person-"]')
      .filter({ hasText: /jordan/i })
      .first();
    if (await jordanBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      result.jordan.conversationId = await jordanBtn.getAttribute("data-conversation-id");
      result.jordan.peerUserId = await jordanBtn.getAttribute("data-peer-user-id");
      result.jordan.pass =
        result.jordan.conversationId !== result.maya.conversationId &&
        Boolean(result.jordan.conversationId);
    }

    result.a11y = {
      distinctAria: new Set(result.who.ariaLabels).size === result.who.ariaLabels.length,
      viewport: "390x844",
    };
    result.pass = !!(result.who.pass && result.maya.pass !== false);
  } catch (e) {
    result.error = String(e?.message || e);
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "WHO_FAST_PATH_BROWSER.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.who?.pass ? 0 : 1);
}

main();
