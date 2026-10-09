/**
 * Paste K — browser E2E: ?opal_lives=1 → search (blocked) → manual TEST VENUE → go live.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activate } from "../../../scripts/founder_proof_fixture.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");
const outDir = __dirname;
mkdirSync(outDir, { recursive: true });

const base = process.env.OPAL_WEB_URL || "http://127.0.0.1:5173";
const url = `${base}/?opal_lives=1&opal_founder_seed=1`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const result = { url, checks: {}, status: "FAIL" };

try {
  let token = process.env.OPAL_ACCESS_TOKEN || "";
  if (!token) {
    try {
      const session = await activate({
        phone: "+12025550101",
        name: "Founder Review",
        handle: "founder_rev",
        code: "111111",
      });
      token = session.token || session.access_token || session.session?.access_token || "";
    } catch (actErr) {
      // production_sms rejects fixture lines — allow pre-minted bearer
      if (!process.env.OPAL_ACCESS_TOKEN) {
        throw new Error(
          `activate failed (${actErr}) — set OPAL_ACCESS_TOKEN for production_sms E2E`,
        );
      }
    }
  }
  if (!token) throw new Error("no founder token from activate() or OPAL_ACCESS_TOKEN");

  await page.addInitScript((tok) => {
    // productClient stores the raw bearer string (not JSON) under this key.
    sessionStorage.setItem("opal.product.browser_session.v1", tok);
    localStorage.setItem("opal.firstRun.v14.completed", "1");
    localStorage.setItem(
      "opal.product.profile.v17",
      JSON.stringify({
        user_id: "47aa5856-8c56-4b18-a4d4-6a9b456516a8",
        display_name: "Founder Review",
        handle: "founder_rev",
      }),
    );
  }, token);

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="lives-go-live-panel"]', { timeout: 20000 });

  result.checks.panel = true;
  result.checks.prompt = (await page.textContent('[data-testid="lives-go-live-prompt"]')) || "";
  result.checks.trade = (await page.textContent('[data-testid="lives-go-live-trade"]')) || "";
  result.checks.noSkip = (await page.textContent('[data-testid="lives-no-skip"]')) || "";
  result.checks.honesty =
    (await page.textContent('[data-testid="lives-sticker-honesty"]')) || "";

  // Search → Places blocked / empty → manual testing appears
  await page.fill('[data-testid="lives-venue-search"]', "Rooftop Bar San Diego");
  await page.click('[data-testid="lives-venue-search-submit"]');
  await page.waitForSelector('[data-testid="lives-manual-testing"]', { timeout: 15000 });
  result.checks.manualAppeared = true;

  // Search already opens the form when blocked; only toggle if still closed.
  if (!(await page.locator('[data-testid="lives-manual-form"]').isVisible().catch(() => false))) {
    await page.click('[data-testid="lives-manual-testing-toggle"]');
  }
  await page.waitForSelector('[data-testid="lives-manual-form"]', { timeout: 5000 });
  const venueName = `Paste K Test ${Date.now().toString(36)}`;
  const venueCity = "San Diego";
  await page.fill('[data-testid="lives-manual-name"]', venueName);
  await page.fill('[data-testid="lives-manual-city"]', venueCity);

  const goLiveResp = page.waitForResponse(
    (r) => r.url().includes("/lives/go-live") && r.request().method() === "POST",
    { timeout: 20000 },
  );
  await page.click('[data-testid="lives-go-live-manual"]');
  const resp = await goLiveResp;
  result.checks.goLiveStatus = resp.status();
  result.checks.goLiveBody = await resp.json().catch(() => ({}));

  const errEl = page.locator('[data-testid="lives-go-live-error"]');
  if (await errEl.isVisible().catch(() => false)) {
    result.checks.uiError = (await errEl.textContent()) || "";
  }

  await page.waitForSelector('[data-testid="lives-go-live-success"]', { timeout: 20000 });
  result.checks.liveStarted = true;
  result.checks.consequence =
    (await page.textContent('[data-testid="lives-go-live-consequence"]')) || "";
  result.checks.testBadge =
    (await page.textContent('[data-testid="lives-test-venue-badge"]')) || "";

  await page.screenshot({ path: join(outDir, "lives_manual_go_live_mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: join(outDir, "lives_manual_go_live_desktop.png"),
    fullPage: true,
  });

  const pass =
    result.checks.prompt.includes("Where are you") &&
    result.checks.trade.toLowerCase().includes("heat map") &&
    result.checks.noSkip.toLowerCase().includes("no skip") &&
    result.checks.honesty.includes("test credits") &&
    result.checks.manualAppeared &&
    result.checks.liveStarted &&
    result.checks.testBadge.includes("TEST VENUE") &&
    result.checks.consequence.toLowerCase().includes("test venue") &&
    result.checks.goLiveStatus >= 200 &&
    result.checks.goLiveStatus < 300;

  result.status = pass ? "PASS" : "FAIL";
} catch (e) {
  result.error = String(e);
  result.status = "FAIL";
  try {
    await page.screenshot({ path: join(outDir, "lives_manual_go_live_FAIL.png") });
  } catch {
    /* ignore */
  }
} finally {
  await browser.close();
}

writeFileSync(join(outDir, "LIVES_UI_VERIFY.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "PASS" ? 0 : 1);
