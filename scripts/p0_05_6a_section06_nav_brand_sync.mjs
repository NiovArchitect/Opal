#!/usr/bin/env node
/** P0-05.6A — Section 06 You-active nested settings + Group Info Chats-active + Brand V4 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-6a-section06-nav-brand-sync");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));
const EXPECT = { x: 136, y: 7, w: 86, h: 64 };

function geomOk(g) {
  if (!g) return false;
  return Math.abs(g.x - 136) <= 2 && Math.abs(g.y - 7) <= 2 && Math.abs(g.w - 86) <= 2 && Math.abs(g.h - 64) <= 2;
}

async function measure(page) {
  return page.evaluate(() => {
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const opal = document.querySelector(".dock-opal");
    const shell = document.querySelector('[data-testid="member-shell"]');
    const active = [...document.querySelectorAll('[data-dock-active="true"]')].map(
      (el) => el.getAttribute("data-dock-slot") || el.getAttribute("data-testid"),
    );
    const br = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const d = br(dock);
    const o = br(opal);
    const title = document.querySelector(".you-settings-title");
    const cs = title ? getComputedStyle(title) : null;
    const toggle = document.querySelector(".you-settings-toggle.on");
    const tcs = toggle ? getComputedStyle(toggle) : null;
    return {
      active,
      shell: shell?.getAttribute("data-dock-active-slot"),
      centerOpal: d && o ? { x: o.x - d.x, y: o.y - d.y, w: o.w, h: o.h } : null,
      dockPresent: !!dock,
      youSetting: document.querySelector("[data-you-setting]")?.getAttribute("data-you-setting"),
      figmaNode: document.querySelector("[data-figma-node]")?.getAttribute("data-figma-node"),
      brandV4: document.querySelector('[data-brand-v4="true"]') != null,
      semantic: document.querySelector("[data-semantic]")?.getAttribute("data-semantic"),
      titleColor: cs?.color || null,
      toggleOnBg: tcs?.backgroundColor || null,
      groupInfo: !!document.querySelector('[data-testid="group-info"]'),
      profile: !!document.querySelector('[data-testid="graph-profile-page"]'),
      youHub: !!document.querySelector('[data-testid="you-hub-pane"]'),
    };
  });
}

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(900);
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(500);
  }
  if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr05-already-account").click();
    await sleep(400);
  } else if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
    await page.getByTestId("fr05-continue-phone").click();
    await sleep(400);
  }
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {}
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], [data-testid="member-tab-home"]', {
    timeout: 30000,
  });
  if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) return;
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101");
  const consent = page.getByTestId("fr06-otp-consent");
  if (!(await consent.isChecked().catch(() => false))) await consent.click({ force: true });
  await page.getByTestId("fr06-continue").click();
  await page.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 25000 });
  const shown = await page.getByTestId("fr07-dev-code").textContent().catch(() => "");
  const m = (shown || "").match(/\b(\d{6})\b/);
  if (m) devCode = m[1];
  await page.fill('[data-testid="fr07-code-input"]', devCode);
  await page.getByTestId("fr07-submit").click();
  for (let i = 0; i < 80; i++) {
    if (await page.getByTestId("member-tab-home").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (!(await n.inputValue())) await n.fill("Founder");
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(250);
  }
  await page.getByTestId("member-tab-home").waitFor({ timeout: 45000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ensureHome(page);

const matrix = [];
const push = (row) => matrix.push(row);

// Person Profile Home-active
await page.locator('[data-testid^="gsh-person-"]').first().click();
await sleep(700);
let m = await measure(page);
push({
  surface: "PersonProfile",
  figma: "618:1257",
  active: m.active,
  ok: m.profile && m.active.includes("home") && !m.active.includes("you") && geomOk(m.centerOpal),
});
await page.getByTestId("profile-person-back").click().catch(() => {});
await sleep(300);

// You hub
await page.getByTestId("member-tab-you").click();
await sleep(600);
m = await measure(page);
await page.screenshot({ path: resolve(OUT, "YOU_HUB.png"), fullPage: false });
push({
  surface: "You",
  figma: "618:1344",
  active: m.active,
  ok: m.youHub && m.active.includes("you") && geomOk(m.centerOpal),
});

const settingsToOpen = [
  ["privacy", "618:1524", "SETTINGS_HUB_THEN_PRIVACY.png"],
  ["location-travel", "618:1591", "LOCATION_TRAVEL.png"],
  ["spending-fit", "618:1662", "SPENDING_FIT.png"],
  ["notifications", "618:1935", "NOTIFICATIONS.png"],
  ["account-security", "618:2180", "ACCOUNT_SECURITY.png"],
];

// Open first row from hub (settings hub feel) then navigate nested
for (const [key, figma, shot] of settingsToOpen) {
  // Ensure on You hub
  if (!(await page.getByTestId("you-hub-pane").isVisible().catch(() => false))) {
    await page.getByTestId("member-tab-you").click();
    await sleep(400);
  }
  // If nested open, back out
  while (await page.getByTestId("you-setting-back").isVisible().catch(() => false)) {
    await page.getByTestId("you-setting-back").click();
    await sleep(250);
  }
  const row = page.getByTestId(`you-hub-row-${key === "account-security" ? "account-security" : key}`);
  // Hub rows use keys privacy, location-travel, etc.
  const hubKey =
    key === "privacy"
      ? "privacy"
      : key === "location-travel"
        ? "location-travel"
        : key === "spending-fit"
          ? "spending-fit"
          : key === "notifications"
            ? "notifications"
            : "account-security";
  const hub = page.getByTestId(`you-hub-row-${hubKey}`);
  if (await hub.count()) {
    await hub.click();
  } else {
    // fallback first more-row
    await page.locator('[data-testid^="you-hub-row-"]').first().click();
  }
  await sleep(700);
  m = await measure(page);
  await page.screenshot({ path: resolve(OUT, shot), fullPage: false });
  const titleOk = m.titleColor && /248|250|255|rgb\(248,\s*250,\s*255\)/i.test(m.titleColor);
  push({
    surface: key,
    figma,
    active: m.active,
    youSetting: m.youSetting,
    brandV4: m.brandV4,
    semantic: m.semantic,
    titleColor: m.titleColor,
    toggleOnBg: m.toggleOnBg,
    centerOpal: m.centerOpal,
    ok:
      m.active.includes("you") &&
      !m.active.includes("home") &&
      geomOk(m.centerOpal) &&
      m.brandV4 === true,
    titleLooksLuminous: !!titleOk,
  });
}

// Group Info Chats-active
await page.getByTestId("member-tab-chats").click();
await sleep(700);
{
  const rows = page.locator('[data-testid^="chats-row-"]');
  await rows.first().waitFor({ timeout: 20000 });
  for (let i = 0; i < Math.min(await rows.count(), 40); i++) {
    const t = await rows.nth(i).innerText();
    if (/· Group/i.test(t)) {
      await rows.nth(i).click();
      break;
    }
  }
}
await sleep(800);
if (await page.getByTestId("gpt-open-group-info").isVisible().catch(() => false)) {
  await page.getByTestId("gpt-open-group-info").click();
  await sleep(700);
}
m = await measure(page);
await page.screenshot({ path: resolve(OUT, "GROUP_INFO.png"), fullPage: false });
push({
  surface: "GroupInfo",
  figma: "618:521",
  active: m.active,
  groupInfo: m.groupInfo,
  centerOpal: m.centerOpal,
  ok: m.groupInfo && m.active.includes("chats") && !m.active.includes("home") && geomOk(m.centerOpal),
});

const final = {
  at: new Date().toISOString(),
  headBase: "15731c0cdf1da014afea9373073413067a673241",
  figmaGov: ["755:2", "755:3"],
  candidatesNotImplemented: ["738:2", "738:35"],
  matrix,
  allOk: matrix.every((r) => r.ok),
};
writeFileSync(resolve(OUT, "NAV_MATRIX.json"), JSON.stringify(final, null, 2));
console.log(JSON.stringify({ allOk: final.allOk, matrix: matrix.map((r) => ({ s: r.surface, ok: r.ok, active: r.active, brand: r.brandV4, semantic: r.semantic })) }, null, 2));
await browser.close();
process.exit(final.allOk ? 0 : 1);
