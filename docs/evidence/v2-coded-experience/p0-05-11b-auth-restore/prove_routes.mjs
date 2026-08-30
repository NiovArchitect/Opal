/**
 * P0-05.11B live proof: founder Phone→OTP→Profile and Phone→Skip→Profile.
 * HOLD only — local Vite + Phoenix.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE =
  process.env.OPAL_FOUNDER_BASE ||
  "http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1";

async function goToPhone(page) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  // Splash → Promise → Phone
  const splash = page.locator('[data-testid="fr00-splash"], .fr-splash-tap, [data-figma-node="618:19"]').first();
  if (await splash.isVisible({ timeout: 8000 }).catch(() => false)) {
    await splash.click({ force: true });
    await page.waitForTimeout(600);
  }
  // Promise CTAs
  const begin = page.getByRole("button", { name: /Begin|I.?m new|Start/i }).first();
  if (await begin.isVisible({ timeout: 5000 }).catch(() => false)) {
    await begin.click();
    await page.waitForTimeout(500);
  } else {
    const promiseTap = page.locator('[data-testid="fr-promise"], .fr-promise, [data-figma-authority="710:8"]').first();
    if (await promiseTap.isVisible({ timeout: 3000 }).catch(() => false)) {
      await promiseTap.click({ force: true });
      await page.waitForTimeout(500);
    }
  }
  await page.waitForSelector('[data-testid="fr06-phone"], [data-testid="fr06-continue"]', {
    timeout: 20000,
  });
}

async function route1(page) {
  await goToPhone(page);
  const phone = await page.locator('[data-testid="fr06-phone"], input[type="tel"]').first().inputValue().catch(() => "");
  const dial = await page.locator('[data-testid="fr06-dial-select"], select').first().inputValue().catch(() => "");
  const consent = await page.locator('[data-testid="fr06-otp-consent"]').isChecked().catch(() => false);
  await page.locator('[data-testid="fr06-continue"]').click();
  await page.waitForSelector('[data-testid="fr07-verify"]', { timeout: 20000 });
  const codeVal = await page.locator('[data-testid="fr07-code"], input[autocomplete="one-time-code"]').first().inputValue().catch(() => "");
  const previewInDom = await page.locator("text=Preview code").count();
  // If autofill missed, type historical OTP
  if (!/^\d{6}$/.test(codeVal)) {
    await page.locator('[data-testid="fr07-code"], input[autocomplete="one-time-code"]').first().fill("111111");
  }
  await page.locator('[data-testid="fr07-verify-submit"], [data-testid="fr07-continue"], button.primary').first().click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 25000 });
  await page.screenshot({ path: join(OUT, "ROUTE1_PROFILE.png"), fullPage: true });
  return {
    phoneState: { phone, dial, consent },
    afterContinue: { verify: true, code: codeVal || "111111", preview: previewInDom > 0 },
    afterVerify: { profile: true },
  };
}

async function route2(page) {
  await goToPhone(page);
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 30000 });
  const err = await page.locator(".fr-error, [data-testid='fr-error']").first().textContent().catch(() => null);
  const text = await page.locator('[data-testid="fr08-profile"]').innerText();
  await page.screenshot({ path: join(OUT, "ROUTE2_SKIP_PROFILE.png"), fullPage: true });
  return { afterSkip: { profile: true, err, text: text.slice(0, 400) } };
}

const browser = await chromium.launch({ headless: true });
const proof = {};
try {
  const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p1 = await ctx1.newPage();
  Object.assign(proof, await route1(p1));
  await ctx1.close();

  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  Object.assign(proof, await route2(p2));
  await ctx2.close();

  proof.pass = Boolean(proof.afterVerify?.profile && proof.afterSkip?.profile && !proof.afterContinue?.preview);
  writeFileSync(join(OUT, "AUTH_RESTORE_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  if (!proof.pass) process.exit(1);
} catch (e) {
  console.error("PROOF_FAILED", e);
  writeFileSync(join(OUT, "AUTH_RESTORE_PROOF.json"), JSON.stringify({ error: String(e), ...proof }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
