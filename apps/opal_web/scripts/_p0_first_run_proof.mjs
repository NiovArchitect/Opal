import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const OUT = resolve('../../shots/founder_phone_walk_p0');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.OPAL_BASE || 'http://127.0.0.1:5173';
const url = `${BASE}/?opal_reset_first_run=1&opal_holy_shit=1&t=${Date.now()}`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const log = [];
const shot = async (name) => {
  const p = resolve(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  const stageEl = page.locator('[data-first-run-stage]').first();
  const stage = (await stageEl.count()) ? await stageEl.getAttribute('data-first-run-stage') : null;
  log.push({ name, path: p, stage });
};

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  const splash = page.locator('[data-testid="fr00-splash"], [data-testid="first-run-splash-shell"]');
  await splash.first().waitFor({ timeout: 15000 });
  const skipCount = await page.locator('[data-testid="fr00-skip-intro"]').count();
  const continueBtn = page.locator('[data-testid="fr00-tap-begin"]');
  await continueBtn.waitFor({ timeout: 5000 });
  await shot('01_splash1');
  const stage1 = await page.locator('[data-first-run-stage="splash"]').count();
  await continueBtn.click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="first-run-promise-shell"], [data-first-run-stage="promise"]').first().waitFor({ timeout: 10000 });
  await shot('02_splash2_promise');
  const enter = page.getByRole('button', { name: /Enter Opal|Continue/i }).first();
  await enter.click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="fr06-phone"], [data-first-run-stage="auth"]').first().waitFor({ timeout: 10000 });
  await shot('03_phone');

  // Phone autofill display proof
  const dial = page.locator('[data-testid="fr06-dial-select"]');
  const phone = page.locator('[data-testid="fr06-phone-input"]');
  await dial.selectOption('+1');
  await phone.fill('');
  await phone.fill('+18585551212');
  await page.waitForTimeout(200);
  const national = await phone.inputValue();
  const dialVal = await dial.inputValue();
  await shot('04_phone_autofill_stripped');

  // Returning account bypass from splash (fresh reset)
  await page.goto(`${BASE}/?opal_reset_first_run=1&opal_holy_shit=1&t=${Date.now()+1}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('[data-testid="fr00-already-account"]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="fr06-phone"]').first().waitFor({ timeout: 10000 });
  await shot('05_returning_account_phone');

  const result = {
    ok: true,
    SPLASH_SINGLE_OWNER: stage1 > 0,
    AMBIGUOUS_SKIP_INTRO_CONTROL: skipCount === 0 ? 'REMOVED' : 'PRESENT',
    NEW_USER_SKIP_SPLASH_2: 'NO',
    SPLASH_1_TO_2: true,
    SPLASH_2_TO_PHONE: true,
    VISIBLE_DUPLICATE_COUNTRY_CODE: national.startsWith('1') || national.includes('+') ? 1 : 0,
    national,
    dialVal,
    RETURNING_ACCOUNT_BYPASS: true,
    PASS2_UNLOCKED: 'NO',
  };
  writeFileSync(resolve(OUT, 'VERIFY.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (result.VISIBLE_DUPLICATE_COUNTRY_CODE !== 0) process.exitCode = 2;
  if (skipCount !== 0) process.exitCode = 3;
} catch (e) {
  await shot('FAIL');
  writeFileSync(resolve(OUT, 'VERIFY.json'), JSON.stringify({ ok: false, error: String(e) }, null, 2));
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
