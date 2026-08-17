/**
 * S0 Opal Graph brand + nav foundation browser proof.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/live-closure/v2-3-1");
mkdirSync(resolve(OUT, "shots"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
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
  if (await page.locator("#phone").isVisible({ timeout: 15000 }).catch(() => false)) {
    await page.fill("#phone", "+12025550101");
    if (await page.locator("#name").isVisible().catch(() => false)) {
      await page.fill("#name", "Founder Review");
    }
    const consent = page.locator("#otp-consent");
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await page.getByRole("button", { name: /Text me a code/i }).first().click();
    await page.waitForSelector("#code", { timeout: 20000 });
    await sleep(400);
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
  await page.waitForSelector('[data-testid="member-shell"], [data-testid="member-tabbar"]', {
    timeout: 45000,
  });
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    brand: {},
    nav: {},
    routes: {},
    a11y: {},
    create: {},
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
    await login(page);
    await page.screenshot({ path: resolve(OUT, "shots/S0_home_390.png"), fullPage: false });

    result.brand.productName = await page
      .locator("[data-product-name]")
      .first()
      .getAttribute("data-product-name");
    result.brand.title = await page.title();
    // Home uses V2BrandRow; other tabs use topbar mark
    result.brand.markSrc = await page
      .locator(
        'img[data-brand-role="core-mark"], img[data-brand-source="opal-graph-symbol-transparent"], .home-opal-mark, .opal-mark--graph',
      )
      .first()
      .getAttribute("src")
      .catch(() => null);
    result.brand.homeWord = await page
      .locator(".home-brand-word, .topbar-brand-word")
      .first()
      .innerText()
      .catch(() => "");
    result.brand.favicon = await page.evaluate(() => {
      const l = document.querySelector('link[rel="icon"]');
      return l?.getAttribute("href") || null;
    });
    result.brand.pass =
      result.brand.productName === "Opal Graph" &&
      /Opal Graph/i.test(result.brand.title || "") &&
      (/opal-graph\/symbol-transparent/.test(result.brand.markSrc || "") ||
        /Graph/i.test(result.brand.homeWord || ""));

    const tabbar = page.getByTestId("member-tabbar");
    result.nav.createDock = await tabbar.getAttribute("data-create-dock");
    result.nav.model = await tabbar.getAttribute("data-nav-model");
    result.nav.tabs = [];
    for (const id of ["home", "chats", "plans", "you"]) {
      const t = page.getByTestId(`member-tab-${id}`);
      const visible = await t.isVisible();
      result.nav.tabs.push({ id, visible, label: await t.innerText().catch(() => "") });
    }
    result.create.deadButtonCount = await page.locator('[data-testid="member-tab-create"]').count();
    result.create.pass =
      result.nav.createDock === "deferred" && result.create.deadButtonCount === 0;

    // Route smoke
    for (const [id, key] of [
      ["home", "home"],
      ["chats", "people"],
      ["plans", "plans"],
      ["you", "you"],
    ]) {
      await page.getByTestId(`member-tab-${id}`).click();
      await sleep(400);
      result.routes[key] = {
        active: await page.getByTestId(`member-tab-${id}`).getAttribute("aria-current"),
        shell: await page.getByTestId("member-shell").isVisible(),
      };
    }
    await page.screenshot({ path: resolve(OUT, "shots/S0_you_390.png"), fullPage: false });

    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await sleep(300);
    await page.screenshot({ path: resolve(OUT, "shots/S0_desktop.png"), fullPage: false });
    result.desktop = {
      tabbarVisible: await tabbar.isVisible(),
      width: 1280,
    };

    result.a11y = {
      navLabel: await tabbar.getAttribute("aria-label"),
      tabsHaveLabels: result.nav.tabs.every((t) => t.label.trim().length > 0),
    };

    result.nav.pass =
      result.nav.tabs.every((t) => t.visible) &&
      result.nav.model === "home-people-create-plans-you" &&
      result.routes.home?.shell &&
      result.routes.people?.active === "page";

    result.pass = !!(
      result.brand.pass &&
      result.create.pass &&
      result.nav.pass &&
      result.a11y.tabsHaveLabels
    );
  } catch (e) {
    result.error = String(e?.message || e);
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "S0_BROWSER.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 1);
}

main();
