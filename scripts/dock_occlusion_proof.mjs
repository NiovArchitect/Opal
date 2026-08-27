#!/usr/bin/env node
/**
 * P0: Persistent dock must not permanently occlude final meaningful content.
 * HOLD. DO NOT MERGE.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence",
);
mkdirSync(resolve(OUT, "runtime"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(400);
  // Prefer returning-user path straight to phone auth for harness stability.
  const already = page.getByTestId("fr00-already-account");
  if (await already.isVisible({ timeout: 5000 }).catch(() => false)) {
    await already.click({ force: true });
  } else if (await page.getByTestId("opal-promise-enter").isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByTestId("opal-promise-enter").click({ force: true });
  } else if (await page.getByTestId("fr00-tap-begin").isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByTestId("fr00-tap-begin").click({ force: true });
    await page.getByTestId("opal-promise-enter").waitFor({ timeout: 8000 });
    await page.getByTestId("opal-promise-enter").click({ force: true });
  }
  let dev = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) dev = j.development_code;
      }
    } catch {}
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 25000 });
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101").catch(async () => page.fill("#phone", "+12025550101"));
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  await page.getByTestId("fr06-continue").click().catch(async () => {
    await page.getByRole("button", { name: /Text me a code/i }).click();
  });
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await page.fill('[data-testid="fr07-code-input"]', dev).catch(async () => page.fill("#code", dev));
  await page.getByTestId("fr07-submit").click().catch(async () => {
    await page.getByRole("button", { name: /Continue|Verify/i }).click();
  });
  for (let i = 0; i < 50; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (await n.isVisible().catch(() => false) && !(await n.inputValue())) await n.fill("Founder");
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(160);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 });
}

async function assertDockClear(page, name) {
  const result = await page.evaluate(() => {
    const dock = document.querySelector(".tabbar.tabbar-option-b, [data-testid='member-tabbar']");
    if (!dock) return { hasDock: false, ok: true };
    const dockRect = dock.getBoundingClientRect();
    const scrollers = [
      document.querySelector(".gsh-scroll"),
      document.querySelector(".scroll"),
      document.querySelector(".pane"),
      document.scrollingElement,
    ].filter(Boolean);
    for (const s of scrollers) {
      s.scrollTop = s.scrollHeight;
    }
    // Prefer the topmost open destination sheet as scroll root when present
    const sheet = document.querySelector(
      "[data-testid='memory-detail-sheet'], [data-testid='discovery-detail-sheet'], [data-testid='forward-share-picker'], [data-testid='graph-detail-sheet'], .profile-person-overlay, .gprof",
    );
    if (sheet) sheet.scrollTop = sheet.scrollHeight;
    // Find last visible text-ish content in member shell
    const root =
      sheet ||
      document.querySelector('[data-testid="member-shell"]') ||
      document.body;
    const nodes = [...root.querySelectorAll("p, h1, h2, button, span, li, strong")];
    let last = null;
    for (const n of nodes) {
      const t = (n.textContent || "").trim();
      if (t.length < 2) continue;
      if (/Home|Chats|Graphs|You|Opal/i.test(t) && n.closest(".tabbar")) continue;
      const r = n.getBoundingClientRect();
      if (r.height < 4 || r.width < 4) continue;
      if (!last || r.bottom > last.bottom) last = { text: t.slice(0, 60), bottom: r.bottom, top: r.top };
    }
    const clearance = getComputedStyle(document.documentElement).getPropertyValue("--dock-clearance");
    const occluded = last ? last.bottom > dockRect.top + 2 : false;
    return {
      hasDock: true,
      dockTop: Math.round(dockRect.top),
      lastBottom: last ? Math.round(last.bottom) : null,
      lastText: last?.text || null,
      clearance: clearance.trim(),
      ok: !occluded,
    };
  });
  await page.screenshot({
    path: resolve(OUT, "runtime", `DOCK_CLEAR_${name}.png`),
    fullPage: false,
  });
  return { name, ...result };
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const rows = [];
  try {
    await login(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(800);
    rows.push(await assertDockClear(page, "HOME"));

    await page.locator('[data-testid^="gsh-media-"]').first().click();
    await sleep(600);
    rows.push(await assertDockClear(page, "MEMORY_DETAIL"));
    await page.keyboard.press("Escape");
    await sleep(300);

    await page.getByTestId("member-tab-chats").click({ force: true });
    await sleep(600);
    rows.push(await assertDockClear(page, "CHATS"));

    await page.getByTestId("member-tab-graphs").click({ force: true });
    await sleep(600);
    rows.push(await assertDockClear(page, "GRAPHS"));

    await page.getByTestId("member-tab-you").click({ force: true });
    await sleep(600);
    rows.push(await assertDockClear(page, "YOU"));
  } finally {
    await browser.close();
  }
  const proof = {
    at: new Date().toISOString(),
    rows,
    pass: rows.filter((r) => r.ok).length,
    total: rows.length,
  };
  writeFileSync(resolve(OUT, "DOCK_OCCLUSION_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
  if (proof.pass < proof.total) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
