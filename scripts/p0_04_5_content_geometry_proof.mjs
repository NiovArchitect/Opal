#!/usr/bin/env node
/** P0-04.5 — Direct/Group CONTENT geometry + style + mobile matrix. No invented tolerance. */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-5-content-geometry",
);
const RT = resolve(OUT, "runtime");
mkdirSync(RT, { recursive: true });
mkdirSync(resolve(OUT, "figma"), { recursive: true });
mkdirSync(resolve(OUT, "diff"), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

const FIGMA_DIRECT = {
  avatar: { x: 20, y: 78, w: 52, h: 52 },
  call: { x: 250, y: 80, w: 36, h: 36 },
  video: { x: 292, y: 80, w: 36, h: 36 },
  plan: { x: 334, y: 80, w: 36, h: 36 },
  youBubble: { x: 20, y: 154, w: 238, h: 64 },
  peerBubble: { x: 114, y: 232, w: 256, h: 64 },
  opalPlate: { x: 20, y: 324, w: 350, h: 350 },
  composer: { x: 20, y: 684, w: 350, h: 58 },
  attach: { x: 30, y: 697, w: 32, h: 32 },
  voice: { x: 292, y: 697, w: 32, h: 32 },
  send: { x: 330, y: 702, w: 22, h: 22 },
  dock: { x: 16, y: 758, w: 358, h: 86 },
  centerOpal: { x: 146, y: -4, w: 66, h: 66 },
};

const FIGMA_GROUP = {
  call: { x: 292, y: 78, w: 34, h: 34 },
  video: { x: 334, y: 78, w: 34, h: 34 },
  sharedGraph: { x: 20, y: 142, w: 350, h: 66 },
  mayaBubble: { x: 20, y: 230, w: 250, h: 58 },
  jordanBubble: { x: 94, y: 300, w: 276, h: 58 },
  sabrinaBubble: { x: 20, y: 370, w: 250, h: 58 },
  opalUpdate: { x: 20, y: 456, w: 350, h: 156 },
  composer: { x: 20, y: 684, w: 350, h: 58 },
  attach: { x: 30, y: 697, w: 32, h: 32 },
  voice: { x: 292, y: 697, w: 32, h: 32 },
  send: { x: 330, y: 702, w: 22, h: 22 },
  dock: { x: 16, y: 758, w: 358, h: 86 },
  centerOpal: { x: 146, y: -4, w: 66, h: 66 },
};

function delta(a, b) {
  if (!a || !b) return { missing: true, maxAbs: 999 };
  return {
    dx: a.x - b.x,
    dy: a.y - b.y,
    dw: a.w - b.w,
    dh: a.h - b.h,
    maxAbs: Math.max(
      Math.abs(a.x - b.x),
      Math.abs(a.y - b.y),
      Math.abs(a.w - b.w),
      Math.abs(a.h - b.h),
    ),
  };
}

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
  await sleep(800);
  await page.waitForSelector('[data-testid="member-conversation"]', { timeout: 15000 });
}

function measureDirect(page) {
  return page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(b.x),
        y: Math.round(b.y),
        w: Math.round(b.width),
        h: Math.round(b.height),
        borderColor: cs.borderColor,
        borderRadius: cs.borderRadius,
        borderWidth: cs.borderWidth,
      };
    };
    const dock = document.querySelector('[data-testid="member-tabbar"]');
    const dockR = dock?.getBoundingClientRect();
    const opal = dock?.querySelector('[data-testid="member-tab-opal"]')?.getBoundingClientRect();
    return {
      avatar: r('[data-testid="gpt-avatar"]'),
      call: r('[data-testid="gpt-call"]'),
      video: r('[data-testid="gpt-video"]'),
      plan: r('[data-testid="gpt-plan"]'),
      youBubble: r('[data-testid="dated-you-bubble"]'),
      peerBubble: r('[data-testid="dated-peer-bubble"]'),
      opalPlate: r('[data-testid="dated-opal-consequence"]'),
      juniperSlot: r('[data-testid="dated-opal-juniper-slot"]'),
      providerSlot: r('[data-testid="dated-opal-provider-slot"]'),
      leaveSlot: r('[data-testid="dated-opal-leave-slot"]'),
      travelSlot: r('[data-testid="dated-opal-travel-slot"]'),
      availabilitySlot: r('[data-testid="dated-opal-availability-slot"]'),
      composer: r('[data-testid="composer"]'),
      attach: r('[data-testid="composer-attach"]'),
      voice: r('[data-testid="composer-voice"]'),
      send: r('[data-testid="composer-send"]'),
      dock: dockR
        ? { x: Math.round(dockR.x), y: Math.round(dockR.y), w: Math.round(dockR.width), h: Math.round(dockR.height) }
        : null,
      centerOpal:
        dockR && opal
          ? {
              x: Math.round(opal.x - dockR.x),
              y: Math.round(opal.y - dockR.y),
              w: Math.round(opal.width),
              h: Math.round(opal.height),
            }
          : null,
      chatsActive: dock?.querySelector('[data-dock-slot="chats"]')?.getAttribute("data-dock-active"),
      sendBg: document.querySelector('[data-testid="composer-send"]')
        ? getComputedStyle(document.querySelector('[data-testid="composer-send"]')).backgroundColor
        : null,
    };
  });
}

function measureGroup(page) {
  return page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(b.x),
        y: Math.round(b.y),
        w: Math.round(b.width),
        h: Math.round(b.height),
        borderColor: cs.borderColor,
        borderRadius: cs.borderRadius,
      };
    };
    const dock = document.querySelector('[data-testid="member-tabbar"]');
    const dockR = dock?.getBoundingClientRect();
    const opal = dock?.querySelector('[data-testid="member-tab-opal"]')?.getBoundingClientRect();
    return {
      call: r('[data-testid="gpt-call"]'),
      video: r('[data-testid="gpt-video"]'),
      sharedGraph: r('[data-testid="gpt-shared-graph"]'),
      mayaBubble: r('[data-testid="dated-maya-bubble"]'),
      jordanBubble: r('[data-testid="dated-jordan-bubble"]'),
      sabrinaBubble: r('[data-testid="dated-sabrina-bubble"]'),
      opalUpdate: r('[data-testid="dated-opal-update"]'),
      composer: r('[data-testid="composer"]'),
      attach: r('[data-testid="composer-attach"]'),
      voice: r('[data-testid="composer-voice"]'),
      send: r('[data-testid="composer-send"]'),
      dock: dockR
        ? { x: Math.round(dockR.x), y: Math.round(dockR.y), w: Math.round(dockR.width), h: Math.round(dockR.height) }
        : null,
      centerOpal:
        dockR && opal
          ? {
              x: Math.round(opal.x - dockR.x),
              y: Math.round(opal.y - dockR.y),
              w: Math.round(opal.width),
              h: Math.round(opal.height),
            }
          : null,
      sendBg: document.querySelector('[data-testid="composer-send"]')
        ? getComputedStyle(document.querySelector('[data-testid="composer-send"]')).backgroundColor
        : null,
      sendBorder: document.querySelector('[data-testid="composer-send"]')
        ? getComputedStyle(document.querySelector('[data-testid="composer-send"]')).borderColor
        : null,
    };
  });
}

function score(runtime, figma) {
  const rows = {};
  let ok = true;
  const fails = [];
  for (const [k, fig] of Object.entries(figma)) {
    if (!fig) continue;
    const rt = runtime[k];
    const d = delta(rt, fig);
    const exact = !d.missing && d.maxAbs === 0;
    if (!exact) {
      ok = false;
      fails.push({ k, d, rt, fig });
    }
    rows[k] = { figma: fig, runtime: rt, delta: d, exact };
  }
  return { rows, ok, fails };
}

async function mobileProbe(page, preferGroup, viewport) {
  await page.setViewportSize(viewport);
  await sleep(300);
  // reopen chat at this viewport
  await page.getByTestId("member-tab-chats").click().catch(() => {});
  await sleep(400);
  if (!(await page.locator('[data-testid="member-conversation"]').count())) {
    await openChat(page, preferGroup);
  }
  return page.evaluate((vp) => {
    const app = document.querySelector(".app");
    const dock = document.querySelector('[data-testid="member-tabbar"]');
    const composer = document.querySelector('[data-testid="composer"]');
    const header = document.querySelector('[data-testid="graph-people-header"]');
    const appR = app?.getBoundingClientRect();
    const dockR = dock?.getBoundingClientRect();
    const compR = composer?.getBoundingClientRect();
    const headR = header?.getBoundingClientRect();
    const overflowX = Math.max(0, document.documentElement.scrollWidth - vp.width);
    const dockRightOverflow = dockR ? Math.max(0, dockR.right - vp.width) : 0;
    const composerBottomCollision = compR && dockR ? Math.max(0, compR.bottom - dockR.top) : 0;
    const contentUnderDock = dockR ? Math.max(0, vp.height - dockR.top) : 0;
    const tabs = [...(dock?.querySelectorAll(".dock-tab") || [])];
    const tabsContained = tabs.every((t) => {
      const r = t.getBoundingClientRect();
      const dr = dock.getBoundingClientRect();
      return r.bottom <= dr.bottom + 0.5 && r.top >= dr.top - 0.5;
    });
    const opal = dock?.querySelector('[data-testid="member-tab-opal"]');
    const opalR = opal?.getBoundingClientRect();
    const opalContained = opalR && dockR ? opalR.left >= dockR.left - 1 && opalR.right <= dockR.right + 1 : false;
    return {
      viewport: vp,
      appWidth: appR ? Math.round(appR.width) : null,
      horizontalOverflowPx: overflowX,
      dockLeft: dockR ? Math.round(dockR.left) : null,
      dockTop: dockR ? Math.round(dockR.top) : null,
      dockWidth: dockR ? Math.round(dockR.width) : null,
      dockHeight: dockR ? Math.round(dockR.height) : null,
      dockRightOverflowPx: Math.round(dockRightOverflow),
      composerBottomCollisionPx: Math.round(composerBottomCollision),
      contentUnderDockPx: Math.round(contentUnderDock),
      headerCollisionPx: headR && headR.top < 0 ? Math.round(-headR.top) : 0,
      CenterOpalContained: !!opalContained,
      normalTabsContained: tabsContained,
    };
  }, viewport);
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
  await openChat(page, false);
  await page.screenshot({ path: resolve(RT, "DIRECT_RUNTIME.png") });
  const directM = await measureDirect(page);
  const directScore = score(directM, FIGMA_DIRECT);

  // style proof
  const directStyle = {
    youBorder: directM.youBubble?.borderColor,
    youRadius: directM.youBubble?.borderRadius,
    peerBorder: directM.peerBubble?.borderColor,
    peerRadius: directM.peerBubble?.borderRadius,
    opalRadius: directM.opalPlate?.borderRadius,
    chatsActive: directM.chatsActive,
  };

  await page.locator(".gpt-back, [aria-label=Back]").first().click().catch(() => {});
  await sleep(400);
  await openChat(page, true);
  await page.screenshot({ path: resolve(RT, "GROUP_RUNTIME.png") });
  const groupM = await measureGroup(page);
  const groupScore = score(groupM, FIGMA_GROUP);
  const groupStyle = {
    mayaBorder: groupM.mayaBubble?.borderColor,
    jordanBorder: groupM.jordanBubble?.borderColor,
    sabrinaBorder: groupM.sabrinaBubble?.borderColor,
    opalRadius: groupM.opalUpdate?.borderRadius,
    sendBg: groupM.sendBg,
    sendBorder: groupM.sendBorder,
  };

  // Mobile matrix
  const viewports = [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 393, height: 852 },
    { width: 430, height: 932 },
  ];
  const mobileDirect = [];
  const mobileGroup = [];
  for (const vp of viewports) {
    mobileDirect.push(await mobileProbe(page, false, vp));
  }
  for (const vp of viewports) {
    mobileGroup.push(await mobileProbe(page, true, vp));
  }

  // Call smoke
  await page.setViewportSize({ width: 390, height: 844 });
  await openChat(page, false);
  await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.click(), "gpt-video");
  await sleep(400);
  const callOk = await page.evaluate(() => {
    const s = document.querySelector('[data-testid="call-surface"]');
    return {
      open: !!s,
      flip: !!s?.querySelector('[data-testid="call-flip"]'),
      dock: !!document.querySelector('[data-testid="member-tabbar"]'),
      mute: (() => {
        const m = s?.querySelector('[data-testid="call-mute"]')?.getBoundingClientRect();
        return m && { x: Math.round(m.x), y: Math.round(m.y), w: Math.round(m.width), h: Math.round(m.height) };
      })(),
    };
  });
  await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.click(), "call-end");
  await sleep(300);

  const plusOneResolved =
    directScore.rows.attach?.exact &&
    directScore.rows.voice?.exact &&
    directScore.rows.send?.exact &&
    groupScore.rows.attach?.exact &&
    groupScore.rows.voice?.exact;

  const result = {
    HOLD: true,
    FOUNDER_WALK_READY: "NO",
    noInventedTolerance: true,
    direct: { measure: directM, score: directScore, style: directStyle },
    group: { measure: groupM, score: groupScore, style: groupStyle },
    plusOneResolved,
    mobile: { direct: mobileDirect, group: mobileGroup },
    callRegression: callOk,
    consoleErrors: consoleErrors.slice(0, 20),
  };

  const ok =
    directScore.ok &&
    groupScore.ok &&
    plusOneResolved &&
    callOk.open &&
    !callOk.flip &&
    !callOk.dock &&
    mobileDirect.every((m) => m.horizontalOverflowPx === 0 && m.normalTabsContained) &&
    mobileGroup.every((m) => m.horizontalOverflowPx === 0 && m.normalTabsContained);

  result.FOUNDER_WALK_READY = ok ? "YES" : "NO";
  result.gates = {
    directContentOk: directScore.ok,
    groupContentOk: groupScore.ok,
    plusOneResolved,
    callRegressionOk: callOk.open && !callOk.flip && !callOk.dock,
    mobileOk:
      mobileDirect.every((m) => m.horizontalOverflowPx === 0) &&
      mobileGroup.every((m) => m.horizontalOverflowPx === 0),
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
