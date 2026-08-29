#!/usr/bin/env node
/** P0-05.8 — Splash shell + dock stage geometry smoke at 390×844 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-8-runtime-figma-convergence");
mkdirSync(resolve(OUT, "runtime"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(1200);
  await page.waitForSelector('[data-testid="fr00-splash"]', { timeout: 30000 });
  await page.screenshot({ path: resolve(OUT, "runtime/RUNTIME_SPLASH.png") });

  const geo = await page.evaluate(() => {
    const app = document.querySelector(".app");
    const splash = document.querySelector('[data-testid="fr00-splash"]');
    const frame = document.querySelector(".fr-frame");
    const mark = document.querySelector(".fr-splash-mark");
    const word = document.querySelector(".fr-splash-wordmark");
    const tap = document.querySelector('[data-testid="fr00-tap-begin"]');
    const skip = document.querySelector('[data-testid="fr00-skip-intro"]');
    const ret = document.querySelector('[data-testid="fr00-already-account"]');
    const br = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const appCs = cs(app);
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      app: br(app),
      appMaxWidth: appCs?.maxWidth || null,
      appBoxShadow: appCs?.boxShadow || null,
      splash: br(splash),
      splashAuthority: splash?.getAttribute("data-figma-authority"),
      frame: br(frame),
      frameMaxWidth: cs(frame)?.maxWidth || null,
      mark: br(mark),
      word: br(word),
      tap: br(tap),
      skip: br(skip),
      returning: br(ret),
      skipHidden: skip ? skip.hasAttribute("hidden") || cs(skip)?.display === "none" : null,
    };
  });

  // Auth phone screenshot path: already account
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(800);
  }
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-already-account").click();
      await sleep(400);
    }
    await sleep(300);
  }
  let phone = null;
  if (await page.getByTestId("fr06-phone").isVisible().catch(() => false)) {
    await page.screenshot({ path: resolve(OUT, "runtime/RUNTIME_PHONE.png") });
    phone = await page.evaluate(() => ({
      authority: document.querySelector('[data-testid="fr06-phone"]')?.getAttribute("data-figma-authority"),
      hasAuthV4: document.querySelector(".fr-auth-v4") != null,
    }));
  }

  const checks = {
    SPLASH_VIEWPORT_WIDTH: geo.viewport.w === 390,
    SPLASH_VIEWPORT_HEIGHT: geo.viewport.h === 844,
    SPLASH_AUTHORITY: geo.splashAuthority === "618:19",
    APP_MAX_WIDTH_390: geo.appMaxWidth === "390px",
    APP_NO_INSET_HAIRLINE: !geo.appBoxShadow || geo.appBoxShadow === "none",
    FRAME_NO_430_CARD: geo.frameMaxWidth === "none" || geo.frameMaxWidth === "100%" || !geo.frameMaxWidth,
    SPLASH_WIDTH_NEAR_390: !!geo.splash && Math.abs(geo.splash.w - 390) <= 2,
    EMBLEM_NEAR_176: !!geo.mark && Math.abs(geo.mark.w - 176) <= 4,
    TAP_PRESENT: !!geo.tap,
    SKIP_VISIBLE: geo.skipHidden === false,
    PHONE_773_27: phone?.authority === "773:27",
  };

  const proof = {
    pass: "P0-05.8-splash-shell",
    at: new Date().toISOString(),
    head: execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
    root_cause_label: "WRONG_PARENT_MAX_WIDTH",
    geo,
    phone,
    checks,
    ok: Object.values(checks).every(Boolean),
    authority: execSync("node scripts/opal-authority-check.mjs", { cwd: ROOT, encoding: "utf8" }).includes(
      "GREEN",
    ),
  };
  writeFileSync(resolve(OUT, "SPLASH_SHELL_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  await browser.close();
  process.exit(proof.ok && proof.authority ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
