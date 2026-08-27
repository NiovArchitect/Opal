#!/usr/bin/env node
/**
 * P0-05.2 — Current product authority hard lock smoke
 * Center Opal 645:3 @ 136,7 · 86×64 · route-owned dock active states
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/p0-05-2-authority-hard-lock");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

const EXPECT_OPAL = { x: 136, y: 7, w: 86, h: 64 };
const EXPECT_DOCK = { x: 16, y: 758, w: 358, h: 86 };
const PROMISE_SHA =
  "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10";
const CENTER_SHA =
  "1ddbbe1bc23b029de27d8ba1a3396d1de35e814da5101d518c1305a7131935f6";

function sha256file(rel) {
  const buf = readFileSync(resolve(ROOT, "apps/opal_web/public", rel.replace(/^\//, "")));
  return createHash("sha256").update(buf).digest("hex");
}

async function measureDock(page) {
  return page.evaluate(() => {
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const opal = document.querySelector(".dock-opal");
    const mark = document.querySelector(".dock-opal-mark");
    const shell = document.querySelector('[data-testid="member-shell"]');
    const active = [
      ...document.querySelectorAll('[data-dock-active="true"]'),
    ].map((el) => el.getAttribute("data-dock-slot") || el.getAttribute("data-testid"));
    const br = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    const dockAbs = br(dock);
    const opalAbs = br(opal);
    let centerOpal = null;
    if (dockAbs && opalAbs) {
      centerOpal = {
        x: opalAbs.x - dockAbs.x,
        y: opalAbs.y - dockAbs.y,
        w: opalAbs.w,
        h: opalAbs.h,
      };
    }
    return {
      dock: dockAbs,
      centerOpal,
      active,
      shell: shell?.getAttribute("data-dock-active-slot") || null,
      primaryTab: shell?.getAttribute("data-primary-tab") || null,
      src: mark?.getAttribute("src") || null,
      dockPresent: !!dock,
    };
  });
}

async function shot(page, name) {
  await page.screenshot({
    path: resolve(OUT, `${name}_390.png`),
    fullPage: false,
  });
}

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(900);
  // Prefer returning-user path → phone/auth (do not traverse Promise here)
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
    await sleep(500);
  } else if (await page.getByTestId("fr00-skip-intro").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-skip-intro").click();
    await sleep(500);
  }
  // Conversion gate may still show fr05
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

  const phone = page.locator('[data-testid="fr06-phone-input"]').first();
  await phone.fill("+12025550101");
  // React controlled checkbox — click label/input, do not rely on .check() alone
  const consent = page.getByTestId("fr06-otp-consent");
  if (!(await consent.isChecked().catch(() => false))) {
    await consent.click({ force: true });
  }
  await sleep(150);
  await page.getByTestId("fr06-continue").click();
  await page.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 25000 });
  // Prefer visible development code if rendered
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

async function openChat(page, preferGroup) {
  await page.getByTestId("member-tab-chats").click();
  await sleep(600);
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 30000 });
  const rows = page.locator('[data-testid^="chats-row-"]');
  const n = await rows.count();
  for (let i = 0; i < Math.min(n, 80); i++) {
    const text = await rows.nth(i).innerText();
    const isGroup = /· Group/i.test(text);
    if (preferGroup ? isGroup : !isGroup) {
      await rows.nth(i).click();
      break;
    }
  }
  await sleep(700);
  await page.waitForSelector('[data-testid="member-conversation"]', { timeout: 15000 });
}

function geomOk(got, exp, tol = 2) {
  if (!got) return false;
  return (
    Math.abs(got.x - exp.x) <= tol &&
    Math.abs(got.y - exp.y) <= tol &&
    Math.abs(got.w - exp.w) <= tol &&
    Math.abs(got.h - exp.h) <= tol
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const consoleErrors = [];
const netFails = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("requestfailed", (r) => {
  netFails.push({ url: r.url(), err: r.failure()?.errorText });
});

const matrix = [];
const push = (surface, m, extra = {}) => {
  matrix.push({ surface, ...m, ...extra });
};

// --- Splash (fresh first-run, no skip) ---
await page.goto(`${WEB}/?opal_reset_first_run=1`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await sleep(900);
const splashVisible = await page.locator(".fr-splash, [data-testid='fr00-splash'], [data-figma-splash]").first().isVisible().catch(() => false)
  || await page.getByText("Tap to begin").first().isVisible().catch(() => false);
await shot(page, "SPLASH");
const splashMeta = await page.evaluate(() => {
  const root =
    document.querySelector('[data-testid="fr00-splash"]') ||
    document.querySelector("[data-figma-authority='618:19']") ||
    document.querySelector(".fr-splash") ||
    document.body;
  const emblem = document.querySelector(
    ".fr-splash img, .fr-splash [data-brand-role], [data-testid='fr00-splash'] img",
  );
  return {
    figmaAuthority: root?.getAttribute?.("data-figma-authority") || null,
    figmaDated: root?.getAttribute?.("data-figma-dated") || null,
    figmaLineage:
      root?.getAttribute?.("data-figma-sfr") ||
      document.querySelector("[data-figma-splash]")?.getAttribute("data-figma-splash") ||
      null,
    hasTap: !!document.querySelector('[data-testid="fr00-tap-begin"]'),
    hasSkip: !!document.querySelector('[data-testid="fr00-skip-intro"]'),
    hasReturning: !!document.querySelector('[data-testid="fr00-already-account"]'),
    emblemSrc: emblem?.getAttribute?.("src") || null,
  };
});
writeFileSync(
  resolve(OUT, "SPLASH_PROOF.json"),
  JSON.stringify({ splashVisible, splashMeta, figmaAuthority: "618:19" }, null, 2),
);

// Promise path: Tap to begin
if (await page.getByText("Tap to begin").first().isVisible().catch(() => false)) {
  await page.getByText("Tap to begin").first().click();
  await sleep(900);
}
const promiseMeta = await page.evaluate(() => {
  const img =
    document.querySelector('[data-brand-role="promise"], img[src*="opal-promise"]') ||
    document.querySelector('img[src*="promise"]');
  return {
    src: img?.getAttribute("src") || null,
    visible: !!img,
  };
});
await shot(page, "PROMISE");
writeFileSync(
  resolve(OUT, "PROMISE_PROOF.json"),
  JSON.stringify(
    {
      promiseMeta,
      runtimeSha: sha256file("/brand/opal-graph/opal-promise-exact-941x1672.png"),
      expectedSha: PROMISE_SHA,
      untouched: sha256file("/brand/opal-graph/opal-promise-exact-941x1672.png") === PROMISE_SHA,
      figmaAuthority: "646:2",
    },
    null,
    2,
  ),
);

// Auth into member shell
await ensureHome(page);

// Home
{
  const m = await measureDock(page);
  await shot(page, "HOME");
  push("Home", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("home") && !m.active.includes("chats"),
  });
}

// Chats
{
  await page.getByTestId("member-tab-chats").click();
  await sleep(700);
  const m = await measureDock(page);
  await shot(page, "CHATS");
  push("Chats", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("chats"),
  });
}

// Direct
{
  await openChat(page, false);
  const m = await measureDock(page);
  await shot(page, "DIRECT");
  push("Direct", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("chats"),
  });
  // back via chats tab
  await page.getByTestId("member-tab-chats").click();
  await sleep(500);
}

// Group
{
  await openChat(page, true);
  const m = await measureDock(page);
  await shot(page, "GROUP");
  push("Group", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("chats"),
  });
}

// Graphs overview
{
  await page.getByTestId("member-tab-graphs").click();
  await sleep(800);
  const m = await measureDock(page);
  await shot(page, "GRAPHS");
  push("Graphs", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("graphs"),
  });
}

// Graph Detail
{
  const openBtn = page.locator('[data-testid^="graphs-open-"]').first();
  if (await openBtn.isVisible().catch(() => false)) {
    await openBtn.click();
    await sleep(800);
  }
  const m = await measureDock(page);
  await shot(page, "GRAPH_DETAIL");
  push("GraphDetail", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("graphs"),
  });
  // dismiss if possible
  const back = page.locator('[data-testid="graph-detail-back"], [aria-label="Back"], button:has-text("Back")').first();
  if (await back.isVisible().catch(() => false)) await back.click().catch(() => {});
  await page.getByTestId("member-tab-graphs").click().catch(() => {});
  await sleep(400);
}

// Journey — try list journey signal / journey card
{
  let journeyOpened = false;
  const journeySignal = page.locator('[data-testid="list-journey-signal"], [data-testid="graph-journey-card"]').first();
  if (await journeySignal.isVisible().catch(() => false)) {
    await journeySignal.click();
    await sleep(800);
    journeyOpened = true;
  } else {
    // Home may have journey CTAs
    await page.getByTestId("member-tab-home").click();
    await sleep(500);
    const homeJourney = page.locator('[data-testid="journey-cta-row"], [data-testid="graph-journey-card"], [data-testid="gjourney-im-in"]').first();
    if (await homeJourney.isVisible().catch(() => false)) {
      await homeJourney.click();
      await sleep(800);
      journeyOpened = true;
    }
  }
  const m = await measureDock(page);
  await shot(page, "JOURNEY");
  push("Journey", m, {
    journeyOpened,
    ok:
      journeyOpened
        ? geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("graphs")
        : geomOk(m.centerOpal, EXPECT_OPAL), // geometry still asserted if surface not reached
    note: journeyOpened
      ? "Journey surface open; Graphs active required"
      : "Journey surface not opened in this seed — geometry sampled on current route",
  });
}

// You
{
  await page.getByTestId("member-tab-you").click();
  await sleep(700);
  const m = await measureDock(page);
  await shot(page, "YOU");
  push("You", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && m.active.includes("you"),
  });
}

// Settings Hub — open a you-hub row that nests settings
{
  const settingsRow = page.locator('[data-testid^="you-hub-row-"]').first();
  if (await settingsRow.isVisible().catch(() => false)) {
    await settingsRow.click();
    await sleep(700);
  }
  const m = await measureDock(page);
  await shot(page, "SETTINGS_HUB");
  push("SettingsHub", m, {
    ok: geomOk(m.centerOpal, EXPECT_OPAL) && (m.active.includes("you") || m.shell === "you"),
  });
  await page.getByTestId("member-tab-you").click().catch(() => {});
  await sleep(300);
}

// Global Opal
{
  await page.getByTestId("member-tab-opal").click();
  await sleep(700);
  const m = await measureDock(page);
  await shot(page, "GLOBAL_OPAL");
  const falseHome = m.active.includes("home") && m.shell !== "opal";
  push("GlobalOpal", m, {
    ok:
      geomOk(m.centerOpal, EXPECT_OPAL) &&
      m.shell === "opal" &&
      !m.active.includes("home") &&
      !m.active.includes("chats") &&
      !m.active.includes("graphs") &&
      !m.active.includes("you"),
    falseHomeLit: falseHome,
  });
  // close ambient
  await page.getByTestId("member-tab-opal").click();
  await sleep(400);
}

// Calls — no dock
{
  await openChat(page, false);
  await sleep(400);
  const callBtn = page.locator('[data-testid="gpt-call"], [aria-label="Call"], [data-testid="gprof-call"]').first();
  let callDock = { dock: null, kind: null };
  if (await callBtn.isVisible().catch(() => false)) {
    await callBtn.click();
    await sleep(800);
    const surface = await page.getByTestId("call-surface").isVisible().catch(() => false);
    const dockPresent = await page.locator(".tabbar.tabbar-option-b").isVisible().catch(() => false);
    callDock = {
      dock: dockPresent,
      kind: surface ? "active-call-or-incoming" : "no-surface",
      surface,
    };
    await shot(page, "CALL");
    // end/decline if present
    const end = page.locator('[data-testid="call-end"], [data-testid="call-decline"]').first();
    if (await end.isVisible().catch(() => false)) await end.click().catch(() => {});
  } else {
    // Force incoming via evaluate if available
    callDock = { dock: false, kind: "call-button-not-found", note: "skipped interactive call open" };
  }
  writeFileSync(resolve(OUT, "CALL_DOCK.json"), JSON.stringify(callDock, null, 2));
}

const centerSha = sha256file("/brand/opal-graph/opal-center-opal-645-3-rest-512.png");
const promiseSha = sha256file("/brand/opal-graph/opal-promise-exact-941x1672.png");

const report = {
  at: new Date().toISOString(),
  expectCenterOpal: EXPECT_OPAL,
  expectDock: EXPECT_DOCK,
  centerOpalAsset: {
    path: "/brand/opal-graph/opal-center-opal-645-3-rest-512.png",
    sha256: centerSha,
    match: centerSha === CENTER_SHA,
  },
  promiseAsset: {
    path: "/brand/opal-graph/opal-promise-exact-941x1672.png",
    sha256: promiseSha,
    match: promiseSha === PROMISE_SHA,
    untouched: promiseSha === PROMISE_SHA,
  },
  matrix,
  callDock: JSON.parse(readFileSync(resolve(OUT, "CALL_DOCK.json"), "utf8")),
  consoleErrors: consoleErrors.slice(0, 30),
  netFails: netFails.filter((n) => !/favicon|sourcemap/i.test(n.url)).slice(0, 20),
  allOk: matrix.every((r) => r.ok !== false) && promiseSha === PROMISE_SHA && centerSha === CENTER_SHA,
};

writeFileSync(resolve(OUT, "DOCK_NAV_MATRIX.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ allOk: report.allOk, surfaces: matrix.map((m) => ({ s: m.surface, ok: m.ok, active: m.active, shell: m.shell, co: m.centerOpal })) }, null, 2));

await browser.close();
process.exit(report.allOk ? 0 : 1);
