#!/usr/bin/env node
/** P0-04.4 Direct/Group/Dock exact geometry proof @ 390×844 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-4-direct-group-dock",
);
const RT = resolve(OUT, "runtime");
mkdirSync(RT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

const FIGMA_DOCK = { x: 16, y: 758, w: 358, h: 86 };
const FIGMA_OPAL = { x: 146, y: -4, w: 66, h: 66 }; // relative to dock
const FIGMA_DIRECT = {
  avatar: { x: 20, y: 78, w: 52, h: 52 },
  call: { x: 250, y: 80, w: 36, h: 36 },
  video: { x: 292, y: 80, w: 36, h: 36 },
  plan: { x: 334, y: 80, w: 36, h: 36 },
  composer: { x: 20, y: 684, w: 350, h: 58 },
  attach: { x: 30, y: 697, w: 32, h: 32 },
  voice: { x: 292, y: 697, w: 32, h: 32 },
  send: { x: 330, y: 702, w: 22, h: 22 },
  dock: FIGMA_DOCK,
};
const FIGMA_GROUP = {
  call: { x: 292, y: 78, w: 34, h: 34 },
  video: { x: 334, y: 78, w: 34, h: 34 },
  sharedGraph: { x: 20, y: 142, w: 350, h: 66 },
  composer: { x: 20, y: 684, w: 350, h: 58 },
  attach: { x: 30, y: 697, w: 32, h: 32 },
  voice: { x: 292, y: 697, w: 32, h: 32 },
  dock: FIGMA_DOCK,
};

function delta(a, b) {
  if (!a || !b) return { maxAbs: 999, missing: !a };
  return {
    dx: a.x - b.x,
    dy: a.y - b.y,
    dw: a.w - b.w,
    dh: a.h - b.h,
    maxAbs: Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h)),
  };
}
const pass = (d, tol = 2) => d && !d.missing && d.maxAbs <= tol;

async function ensureHome(page) {
  await page.goto(`${WEB}/?opal_reset_first_run=1&opal_founder_seed=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(700);
  if (await page.getByTestId("fr00-already-account").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
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
  const phone = page.locator('[data-testid="fr06-phone-input"]').first();
  if (await phone.isVisible().catch(() => false)) {
    await phone.fill("+12025550101");
    await page.locator("#otp-consent, [data-testid=fr06-otp-consent]").first().check().catch(() => {});
    await page.getByTestId("fr06-continue").click();
    await page.waitForSelector('[data-testid="fr07-code-input"]', { timeout: 25000 });
    await page.fill('[data-testid="fr07-code-input"]', devCode);
    await page.getByTestId("fr07-submit").click();
    for (let i = 0; i < 50; i++) {
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
      await sleep(200);
    }
  }
  await page.getByTestId("member-tab-home").waitFor({ timeout: 45000 });
}

async function openChat(page, preferGroup) {
  await page.getByTestId("member-tab-chats").click();
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

function measureConversation(page) {
  return page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const dock = document.querySelector('[data-testid="member-tabbar"]');
    const dockR = dock?.getBoundingClientRect();
    const opal = dock?.querySelector('[data-testid="member-tab-opal"]');
    const opalR = opal?.getBoundingClientRect();
    const bubbles = [...document.querySelectorAll('[data-testid="human-message-row"]')].slice(0, 6).map((row) => {
      const bubble = row.querySelector(".bubble");
      const b = bubble?.getBoundingClientRect();
      return {
        sender: row.getAttribute("data-sender-name"),
        out: row.classList.contains("out"),
        x: b ? Math.round(b.x) : null,
        y: b ? Math.round(b.y) : null,
        w: b ? Math.round(b.width) : null,
        h: b ? Math.round(b.height) : null,
        border: bubble ? getComputedStyle(bubble).borderColor : null,
      };
    });
    return {
      figma: document.querySelector('[data-testid="member-conversation"]')?.getAttribute("data-figma"),
      kind: document.querySelector('[data-testid="member-conversation"]')?.getAttribute("data-chat-kind"),
      avatar: r('[data-testid="gpt-avatar"]'),
      call: r('[data-testid="gpt-call"]'),
      video: r('[data-testid="gpt-video"]'),
      plan: r('[data-testid="gpt-plan"]'),
      sharedGraph: r('[data-testid="gpt-shared-graph"]'),
      composer: r('[data-testid="composer"]'),
      attach: r('[data-testid="composer-attach"]'),
      voice: r('[data-testid="composer-voice"]'),
      send: r('[data-testid="composer-send"]'),
      dock: dockR
        ? { x: Math.round(dockR.x), y: Math.round(dockR.y), w: Math.round(dockR.width), h: Math.round(dockR.height) }
        : null,
      centerOpal: dockR && opalR
        ? {
            x: Math.round(opalR.x - dockR.x),
            y: Math.round(opalR.y - dockR.y),
            w: Math.round(opalR.width),
            h: Math.round(opalR.height),
          }
        : null,
      chatsActive: dock?.querySelector('[data-dock-slot="chats"]')?.getAttribute("data-dock-active"),
      bubbles,
      whoPicker: !!document.querySelector('[data-testid="who-picker"]'),
      opalPlate: r('[data-testid="opal-system-consequence"], [data-testid="opal-filament-wrap"]'),
    };
  });
}

function score(runtime, figma) {
  const rows = {};
  let ok = true;
  for (const [k, fig] of Object.entries(figma)) {
    const rt = runtime[k];
    const d = delta(rt, fig);
    const p = pass(d, 2);
    if (!p) ok = false;
    rows[k] = { figma: fig, runtime: rt, delta: d, pass: p };
  }
  return { rows, ok };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await ensureHome(page);

  // Home dock
  const homeDock = await page.evaluate(() => {
    const d = document.querySelector('[data-testid="member-tabbar"]');
    const r = d.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });

  await openChat(page, false);
  await page.screenshot({ path: resolve(RT, "DIRECT_390.png") });
  const direct = await measureConversation(page);
  const directScore = score(direct, FIGMA_DIRECT);
  directScore.rows.centerOpal = {
    figma: FIGMA_OPAL,
    runtime: direct.centerOpal,
    delta: delta(direct.centerOpal, FIGMA_OPAL),
    pass: pass(delta(direct.centerOpal, FIGMA_OPAL), 2),
  };
  if (!directScore.rows.centerOpal.pass) directScore.ok = false;

  // Functional smoke Direct
  await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.click(), "gpt-call");
  await sleep(400);
  const callOpen = (await page.locator('[data-testid="call-surface"]').count()) > 0;
  await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.click(), "call-decline");
  await sleep(300);
  await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.click(), "gpt-plan");
  await sleep(400);
  const planOpen =
    (await page.locator('[data-testid="graph-create-flow"], .graph-create').count()) > 0 ||
    (await page.getByText(/Graph|plan|Juniper/i).count()) > 0;
  // close plan if open
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(200);

  await page.locator(".gpt-back, [aria-label=Back]").first().click().catch(() => {});
  await sleep(400);

  await openChat(page, true);
  await page.screenshot({ path: resolve(RT, "GROUP_390.png") });
  const group = await measureConversation(page);
  const groupScore = score(group, FIGMA_GROUP);
  groupScore.rows.centerOpal = {
    figma: FIGMA_OPAL,
    runtime: group.centerOpal,
    delta: delta(group.centerOpal, FIGMA_OPAL),
    pass: pass(delta(group.centerOpal, FIGMA_OPAL), 2),
  };
  if (!groupScore.rows.centerOpal.pass) groupScore.ok = false;

  // Call regression smoke
  await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.click(), "gpt-video");
  await sleep(500);
  const videoGeom = await page.evaluate(() => {
    const s = document.querySelector('[data-testid="call-surface"]');
    if (!s) return null;
    const mute = s.querySelector('[data-testid="call-mute"]')?.getBoundingClientRect();
    return {
      kind: s.getAttribute("data-call-kind"),
      flip: !!s.querySelector('[data-testid="call-flip"]'),
      dock: !!document.querySelector('[data-testid="member-tabbar"]'),
      mute: mute && { x: Math.round(mute.x), y: Math.round(mute.y), w: Math.round(mute.width), h: Math.round(mute.height) },
    };
  });
  await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.click(), "call-end");
  await sleep(300);

  // Graphs / settings smoke
  await page.getByTestId("member-tab-graphs").click();
  await sleep(400);
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll(".gsh-chip")].map((e) => (e.textContent || "").trim()),
  );
  await page.getByTestId("member-tab-you").click();
  await sleep(300);
  const settingsOk =
    (await page.getByTestId("you-hub-row-spending-fit").count()) > 0 &&
    (await page.getByTestId("you-hub-row-account-security").count()) > 0;

  const result = {
    HOLD: true,
    FOUNDER_WALK_READY: "NO",
    rootCause:
      ".app > * forced tabbar to position:relative; bottom:10px → y748; max-width:calc(100%-32px) with 1px app borders → w356. Fixed: exclude .tabbar from relative hammer; left:16 bottom:0 width:358; app border→inset box-shadow.",
    homeDock,
    direct: { measure: direct, score: directScore, functional: { callOpen, planOpen, whoPicker: direct.whoPicker } },
    group: { measure: group, score: groupScore },
    callRegression: videoGeom,
    graphsChips: chips,
    settingsOk,
    consoleErrors: consoleErrors.slice(0, 20),
  };

  const ok =
    directScore.ok &&
    groupScore.ok &&
    homeDock.x === 16 &&
    homeDock.y === 758 &&
    homeDock.w === 358 &&
    homeDock.h === 86 &&
    chips.includes("Action") &&
    !chips.some((c) => /needs you/i.test(c)) &&
    settingsOk &&
    videoGeom &&
    !videoGeom.flip &&
    !videoGeom.dock;

  result.FOUNDER_WALK_READY = ok ? "YES" : "NO";
  result.gates = {
    directOk: directScore.ok,
    groupOk: groupScore.ok,
    dockOk: homeDock.w === 358 && homeDock.y === 758 && homeDock.x === 16,
    callRegressionOk: !!(videoGeom && !videoGeom.flip && !videoGeom.dock),
    graphsOk: chips.includes("Action"),
    settingsOk,
  };

  writeFileSync(resolve(OUT, "PROOF.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!ok) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
