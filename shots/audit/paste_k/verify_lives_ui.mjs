/**
 * Paste K — browser honesty check for ?opal_lives=1 go-live panel.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('[data-testid="lives-go-live-panel"]', { timeout: 20000 });

  result.checks.panel = true;
  result.checks.prompt = (await page.textContent('[data-testid="lives-go-live-prompt"]')) || "";
  result.checks.trade = (await page.textContent('[data-testid="lives-go-live-trade"]')) || "";
  result.checks.noSkip = (await page.textContent('[data-testid="lives-no-skip"]')) || "";
  result.checks.honesty =
    (await page.textContent('[data-testid="lives-sticker-honesty"]')) || "";
  result.checks.antiMercenary =
    (await page.textContent('[data-testid="lives-anti-mercenary"]')) || "";

  // Empty submit → "Where are you?"
  await page.click('[data-testid="lives-go-live-submit"]');
  await page.waitForSelector('[data-testid="lives-go-live-error"]', { timeout: 5000 });
  result.checks.emptyError =
    (await page.textContent('[data-testid="lives-go-live-error"]')) || "";

  await page.screenshot({ path: join(outDir, "lives_go_live_mobile.png"), fullPage: true });

  // Desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: join(outDir, "lives_go_live_desktop.png"), fullPage: true });

  const pass =
    result.checks.prompt.includes("Where are you") &&
    result.checks.trade.toLowerCase().includes("heat map") &&
    result.checks.noSkip.toLowerCase().includes("no skip") &&
    result.checks.honesty.includes("test credits") &&
    result.checks.antiMercenary.toLowerCase().includes("celebratory") &&
    result.checks.emptyError.includes("Where are you");

  result.status = pass ? "PASS" : "FAIL";
} catch (e) {
  result.error = String(e);
  result.status = "FAIL";
  try {
    await page.screenshot({ path: join(outDir, "lives_go_live_FAIL.png") });
  } catch {
    /* ignore */
  }
} finally {
  await browser.close();
}

writeFileSync(join(outDir, "LIVES_UI_VERIFY.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "PASS" ? 0 : 1);
