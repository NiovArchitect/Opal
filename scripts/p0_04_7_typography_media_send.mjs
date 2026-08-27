#!/usr/bin/env node
/**
 * P0-04.7 — Typography + Direct Juniper media + Group send
 * Narrow repair verification. Geometry/dock/calls frozen.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-7-typography-media-send",
);
const RT = resolve(OUT, "runtime");
const FIG = resolve(OUT, "figma");
const DIFF = resolve(OUT, "diff");
mkdirSync(RT, { recursive: true });
mkdirSync(DIFF, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(ROOT, "apps/opal_web/node_modules/playwright"));

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
];

function typo(cs, text) {
  return {
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    color: cs.color,
    text: (text || "").trim().slice(0, 80),
  };
}

function nearColor(cssRgb, hex) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cssRgb || "");
  if (!m) return false;
  const hr = parseInt(hex.slice(1, 3), 16);
  const hg = parseInt(hex.slice(3, 5), 16);
  const hb = parseInt(hex.slice(5, 7), 16);
  return Math.abs(+m[1] - hr) <= 3 && Math.abs(+m[2] - hg) <= 3 && Math.abs(+m[3] - hb) <= 3;
}

function weightOk(got, want) {
  const g = String(got);
  if (want === 600) return g === "600" || g === "semibold" || g === "Semi Bold";
  if (want === 400) return g === "400" || g === "normal";
  if (want === 500) return g === "500" || g === "medium";
  return g === String(want);
}

function sizeOk(got, wantPx) {
  return Math.round(parseFloat(got)) === wantPx;
}

function familyInter(got) {
  return /Inter/i.test(got || "");
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
    await sleep(300);
    await page.fill('[data-testid="fr07-code-input"]', devCode);
    await page.getByTestId("fr07-submit").click();
    for (let i = 0; i < 60; i++) {
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
  await page.getByTestId("member-tab-home").waitFor({ timeout: 60000 });
}

async function openChat(page, preferGroup) {
  await page.getByTestId("member-tab-chats").click();
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 45000 });
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

async function leaveToHome(page) {
  await page.evaluate(() => {
    document.querySelector('[data-testid="call-end"]')?.click();
    document.querySelector('[data-testid="call-decline"]')?.click();
  });
  await sleep(200);
  await page.locator(".gpt-back, [aria-label=Back]").first().click().catch(() => {});
  await sleep(300);
  if (await page.getByTestId("member-tab-home").count()) {
    await page.getByTestId("member-tab-home").click().catch(() => {});
  }
  await sleep(300);
}

function measureMobile(page, surface, viewport) {
  return page.evaluate(
    ({ surface, viewport }) => {
      const app = document.querySelector(".app");
      const dock = document.querySelector('[data-testid="member-tabbar"]');
      const composer = document.querySelector('[data-testid="composer"]');
      const appR = app?.getBoundingClientRect();
      const dockR = dock?.getBoundingClientRect();
      const compR = composer?.getBoundingClientRect();
      const tab = (slot) => {
        const el = dock?.querySelector(`[data-dock-slot="${slot}"]`);
        if (!el || !dockR) return false;
        const r = el.getBoundingClientRect();
        return r.top >= dockR.top - 0.5 && r.bottom <= dockR.bottom + 0.5;
      };
      return {
        viewport,
        surface,
        appWidth: appR ? Math.round(appR.width) : null,
        appHeight: appR ? Math.round(appR.height) : null,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - viewport.width),
        dockLeft: dockR ? Math.round(dockR.left) : null,
        dockTop: dockR ? Math.round(dockR.top) : null,
        dockWidth: dockR ? Math.round(dockR.width) : null,
        dockHeight: dockR ? Math.round(dockR.height) : null,
        composerDockCollisionPx:
          compR && dockR ? Math.max(0, Math.round(compR.bottom - dockR.top)) : null,
        normalTabsContained: tab("home") && tab("chats") && tab("graphs") && tab("you"),
        textClipSuspect: [...document.querySelectorAll(".dated-bubble-body, .gpt-name")].some((el) => {
          const cs = getComputedStyle(el);
          return cs.overflow === "hidden" && el.scrollWidth > el.clientWidth + 1;
        }),
      };
    },
    { surface, viewport },
  );
}

async function main() {
  const pageErrors = [];
  const consoleErrors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await ensureHome(page);

  // —— DIRECT typography + media ——
  await openChat(page, false);
  await sleep(500);
  await page.screenshot({ path: resolve(RT, "RUNTIME_DIRECT_618_348.png") });
  await page.locator('[data-testid="dated-opal-juniper-thumb"]').screenshot({
    path: resolve(RT, "RUNTIME_JUNIPER_CROP.png"),
  }).catch(() => {});

  const directTypo = await page.evaluate(() => {
    const sample = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return {
        sel,
        ...((cs, text) => ({
          fontFamily: cs.fontFamily,
          fontWeight: cs.fontWeight,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          color: cs.color,
          text: (text || "").trim().slice(0, 80),
        }))(getComputedStyle(el), el.textContent),
      };
    };
    const ph = document.querySelector('[data-testid="composer"] .composer-input');
    const phCs = ph ? getComputedStyle(ph, "::placeholder") : null;
    const img = document.querySelector('[data-testid="dated-opal-juniper-thumb"] img');
    const thumb = document.querySelector('[data-testid="dated-opal-juniper-thumb"]');
    const send = document.querySelector('[data-testid="composer-send"]');
    const sendCs = send ? getComputedStyle(send) : null;
    return {
      title: sample('[data-testid="gpt-name"]'),
      subtitle: sample('[data-testid="gpt-conn"]'),
      youLabel: sample('[data-testid="dated-you-bubble"] .dated-bubble-label'),
      youBody: sample('[data-testid="dated-you-bubble"] .dated-bubble-body'),
      peerLabel: sample('[data-testid="dated-peer-bubble"] .dated-bubble-label'),
      peerBody: sample('[data-testid="dated-peer-bubble"] .dated-bubble-body'),
      opalKicker: sample('[data-testid="dated-opal-kicker"]'),
      juniperTitle: sample(".dated-direct .dated-opal-title"),
      graphTime: sample(".dated-direct .dated-opal-when"),
      truthSlot: sample('[data-testid="dated-opal-provider-slot"]'),
      bottomCopy: sample('[data-testid="dated-opal-quiet"]'),
      composer: ph
        ? {
            fontFamily: getComputedStyle(ph).fontFamily,
            fontWeight: getComputedStyle(ph).fontWeight,
            fontSize: getComputedStyle(ph).fontSize,
            color: getComputedStyle(ph).color,
            placeholderColor: phCs?.color || null,
            placeholder: ph.getAttribute("placeholder"),
          }
        : null,
      dockLabel: sample(".dock-tab.is-active .dock-label"),
      juniper: img
        ? {
            src: img.currentSrc || img.src,
            naturalW: img.naturalWidth,
            naturalH: img.naturalHeight,
            renderedW: Math.round(img.getBoundingClientRect().width),
            renderedH: Math.round(img.getBoundingClientRect().height),
            objectFit: getComputedStyle(img).objectFit,
            radius: getComputedStyle(thumb).borderRadius,
            thumbRect: thumb
              ? {
                  x: Math.round(thumb.getBoundingClientRect().left),
                  y: Math.round(thumb.getBoundingClientRect().top),
                  w: Math.round(thumb.getBoundingClientRect().width),
                  h: Math.round(thumb.getBoundingClientRect().height),
                }
              : null,
            dpr3ok: img.naturalWidth >= 324 && img.naturalHeight >= 258,
            hasGradientOnly: false,
          }
        : { hasImg: false, bg: thumb ? getComputedStyle(thumb).backgroundImage : null },
      directSend: send
        ? {
            kind: send.getAttribute("data-send-kind"),
            bg: sendCs.backgroundColor,
            border: sendCs.border,
            w: Math.round(send.getBoundingClientRect().width),
            h: Math.round(send.getBoundingClientRect().height),
            x: Math.round(send.getBoundingClientRect().left),
            y: Math.round(send.getBoundingClientRect().top),
            hasSvg: !!send.querySelector("svg"),
            glyph: (send.textContent || "").trim(),
          }
        : null,
    };
  });

  // —— GROUP typography + send ——
  await leaveToHome(page);
  await openChat(page, true);
  await sleep(500);
  await page.screenshot({ path: resolve(RT, "RUNTIME_GROUP_618_451.png") });
  await page.locator('[data-testid="composer-send"]').screenshot({
    path: resolve(RT, "RUNTIME_GROUP_SEND.png"),
  }).catch(() => {});

  const groupTypo = await page.evaluate(() => {
    const sample = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        sel,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        color: cs.color,
        text: (el.textContent || "").trim().slice(0, 80),
      };
    };
    const send = document.querySelector('[data-testid="composer-send"]');
    const sendCs = send ? getComputedStyle(send) : null;
    const glyph = send?.querySelector(".send-glyph-group");
    const gCs = glyph ? getComputedStyle(glyph) : null;
    return {
      title: sample('[data-testid="gpt-name"]'),
      subtitle: sample('[data-testid="gpt-conn"]'),
      sharedGraph: sample('[data-testid="gpt-shared-graph"] .gpt-shared-graph-label'),
      mayaLabel: sample('[data-testid="dated-maya-bubble"] .dated-bubble-label'),
      mayaBody: sample('[data-testid="dated-maya-bubble"] .dated-bubble-body'),
      jordanLabel: sample('[data-testid="dated-jordan-bubble"] .dated-bubble-label'),
      jordanBody: sample('[data-testid="dated-jordan-bubble"] .dated-bubble-body'),
      sabrinaLabel: sample('[data-testid="dated-sabrina-bubble"] .dated-bubble-label'),
      sabrinaBody: sample('[data-testid="dated-sabrina-bubble"] .dated-bubble-body'),
      opalKicker: sample('[data-testid="dated-opal-group-kicker"]'),
      opalHeadline: sample('[data-testid="dated-opal-going"]'),
      opalSupport: sample('[data-testid="dated-opal-arrival"]'),
      opalReservation: sample('[data-testid="dated-opal-group-provider"]'),
      composer: (() => {
        const el = document.querySelector('[data-testid="composer"] .composer-input');
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: cs.fontSize, color: cs.color };
      })(),
      groupSend: send
        ? {
            kind: send.getAttribute("data-send-kind"),
            bg: sendCs.backgroundColor,
            borderWidth: sendCs.borderWidth,
            borderStyle: sendCs.borderStyle,
            borderColor: sendCs.borderColor,
            x: Math.round(send.getBoundingClientRect().left),
            y: Math.round(send.getBoundingClientRect().top),
            w: Math.round(send.getBoundingClientRect().width),
            h: Math.round(send.getBoundingClientRect().height),
            glyph: glyph ? (glyph.textContent || "").trim() : (send.textContent || "").trim(),
            glyphFont: gCs?.fontFamily,
            glyphWeight: gCs?.fontWeight,
            glyphSize: gCs?.fontSize,
            glyphColor: gCs?.color,
            hasSvg: !!send.querySelector("svg"),
            hasVisibleBorder: sendCs.borderStyle !== "none" && parseFloat(sendCs.borderWidth) > 0,
          }
        : null,
    };
  });

  // Mobile matrix
  const mobileRows = [];
  for (const surface of ["Direct", "Group"]) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await sleep(150);
      await leaveToHome(page);
      await openChat(page, surface === "Group");
      await sleep(300);
      mobileRows.push(await measureMobile(page, surface, vp));
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });

  // Dock smoke @390 Home
  await leaveToHome(page);
  const dockHome = await page.evaluate(() => {
    const dock = document.querySelector('[data-testid="member-tabbar"]')?.getBoundingClientRect();
    const opal = document.querySelector('[data-testid="member-tab-opal"]')?.getBoundingClientRect();
    return {
      dock: dock ? { x: Math.round(dock.x), y: Math.round(dock.y), w: Math.round(dock.width), h: Math.round(dock.height) } : null,
      centerOpal: dock && opal
        ? { x: Math.round(opal.x - dock.x), y: Math.round(opal.y - dock.y), w: Math.round(opal.width), h: Math.round(opal.height) }
        : null,
    };
  });

  // Call no-dock smoke
  await openChat(page, false);
  await page.evaluate(() => document.querySelector('[data-testid="gpt-call"]')?.click());
  await sleep(400);
  const callIncoming = await page.evaluate(() => ({
    dock: !!document.querySelector('[data-testid="member-tabbar"]'),
    call: !!document.querySelector('[data-testid="call-surface"]'),
  }));
  await page.evaluate(() => document.querySelector('[data-testid="call-decline"]')?.click());
  await sleep(300);
  await leaveToHome(page);

  // Graphs chips
  await page.getByTestId("member-tab-graphs").click();
  await sleep(300);
  const graphsChips = await page.evaluate(() =>
    [...document.querySelectorAll(".gsh-chip")].map((e) => (e.textContent || "").trim()),
  );

  // First run + promise
  const fr = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const frPage = await fr.newPage();
  await frPage.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "domcontentloaded" });
  await sleep(700);
  const firstRun = {
    splash: (await frPage.getByTestId("fr00-splash").count()) > 0 || (await frPage.getByTestId("fr00-tap-begin").count()) > 0,
  };
  if (await frPage.getByTestId("fr00-tap-begin").count()) {
    await frPage.getByTestId("fr00-tap-begin").click();
    await sleep(500);
  }
  firstRun.promise =
    (await frPage.getByTestId("opal-promise-enter").count()) > 0 ||
    (await frPage.locator('[data-testid*="promise"]').count()) > 0;
  await fr.close();

  const promiseSha = createHash("sha256")
    .update(readFileSync(resolve(ROOT, "apps/opal_web/public/brand/opal-graph/opal-promise-exact-941x1672.png")))
    .digest("hex");

  const juniperSha = createHash("sha256")
    .update(readFileSync(resolve(ROOT, "apps/opal_web/public/figma-v2/direct/opal-direct-juniper-618-376.jpg")))
    .digest("hex");

  // Diff overlays via pillow venv if present
  let diffOk = false;
  try {
    execSync(
      `/tmp/.p04v/bin/python - <<'PY'
from PIL import Image, ImageChops, ImageEnhance
from pathlib import Path
base = Path(${JSON.stringify(OUT)})
for name in ["DIRECT", "GROUP"]:
    fig = Image.open(base/"figma"/f"FIGMA_{name}_618_{'348' if name=='DIRECT' else '451'}.png").convert("RGBA").resize((390,844))
    run = Image.open(base/"runtime"/f"RUNTIME_{name}_618_{'348' if name=='DIRECT' else '451'}.png").convert("RGBA").resize((390,844))
    diff = ImageChops.difference(fig.convert("RGB"), run.convert("RGB"))
    ImageEnhance.Brightness(diff).enhance(3).save(base/"diff"/f"{name}_DIFF.png")
    Image.blend(fig, run, 0.5).save(base/"diff"/f"{name}_OVERLAY.png")
print("ok")
PY`,
      { stdio: "pipe" },
    );
    diffOk = true;
  } catch (e) {
    writeFileSync(resolve(DIFF, "DIFF_NOTE.txt"), String(e.message || e));
  }

  // Evaluate typography gates
  const dChecks = [];
  const pushD = (role, got, wantSize, wantWeight, wantColor) => {
    const ok =
      got &&
      familyInter(got.fontFamily) &&
      sizeOk(got.fontSize, wantSize) &&
      weightOk(got.fontWeight, wantWeight) &&
      nearColor(got.color, wantColor);
    dChecks.push({
      role,
      ok: !!ok,
      figma: { size: wantSize, weight: wantWeight, color: wantColor, family: "Inter" },
      runtime: got,
    });
  };
  pushD("title", directTypo.title, 21, 600, "#F4F7FA");
  pushD("subtitle", directTypo.subtitle, 13, 400, "#8A96A8");
  pushD("youLabel", directTypo.youLabel, 12, 600, "#00E5FF");
  pushD("youBody", directTypo.youBody, 17, 600, "#F4F7FA");
  pushD("peerLabel", directTypo.peerLabel, 12, 600, "#FFC86B");
  pushD("peerBody", directTypo.peerBody, 17, 600, "#F4F7FA");
  pushD("opalKicker", directTypo.opalKicker, 15, 600, "#00E5FF");
  pushD("juniperTitle", directTypo.juniperTitle, 23, 600, "#F4F7FA");
  pushD("graphTime", directTypo.graphTime, 14, 600, "#8B5CF6");
  pushD("truthSlot", directTypo.truthSlot, 13, 600, "#F4F7FA");
  pushD("bottomCopy", directTypo.bottomCopy, 13, 400, "#8A96A8");
  if (directTypo.composer) {
    dChecks.push({
      role: "composer",
      ok:
        familyInter(directTypo.composer.fontFamily) &&
        sizeOk(directTypo.composer.fontSize, 14) &&
        weightOk(directTypo.composer.fontWeight, 400),
      figma: { size: 14, weight: 400, color: "#E2E8F0" },
      runtime: directTypo.composer,
    });
  }

  const gChecks = [];
  const pushG = (role, got, wantSize, wantWeight, wantColor) => {
    const ok =
      got &&
      familyInter(got.fontFamily) &&
      sizeOk(got.fontSize, wantSize) &&
      weightOk(got.fontWeight, wantWeight) &&
      nearColor(got.color, wantColor);
    gChecks.push({
      role,
      ok: !!ok,
      figma: { size: wantSize, weight: wantWeight, color: wantColor, family: "Inter" },
      runtime: got,
    });
  };
  pushG("title", groupTypo.title, 22, 600, "#F4F7FA");
  pushG("subtitle", groupTypo.subtitle, 12, 400, "#8A96A8");
  pushG("sharedGraph", groupTypo.sharedGraph, 13, 600, "#8B5CF6");
  pushG("mayaLabel", groupTypo.mayaLabel, 10, 600, "#00F0D1");
  pushG("mayaBody", groupTypo.mayaBody, 14, 600, "#F4F7FA");
  pushG("jordanLabel", groupTypo.jordanLabel, 10, 600, "#8B5CF6");
  pushG("jordanBody", groupTypo.jordanBody, 14, 600, "#F4F7FA");
  pushG("sabrinaLabel", groupTypo.sabrinaLabel, 10, 600, "#D946FF");
  pushG("sabrinaBody", groupTypo.sabrinaBody, 14, 600, "#F4F7FA");
  pushG("opalKicker", groupTypo.opalKicker, 13, 600, "#00E5FF");
  pushG("opalHeadline", groupTypo.opalHeadline, 18, 600, "#F4F7FA");
  pushG("opalSupport", groupTypo.opalSupport, 11, 400, "#B8C2D4");
  pushG("opalReservation", groupTypo.opalReservation, 11, 400, "#8A96A8");
  if (groupTypo.composer) {
    gChecks.push({
      role: "composer",
      ok:
        familyInter(groupTypo.composer.fontFamily) &&
        sizeOk(groupTypo.composer.fontSize, 14) &&
        weightOk(groupTypo.composer.fontWeight, 400),
      figma: { size: 14, weight: 400, color: "#E2E8F0" },
      runtime: groupTypo.composer,
    });
  }

  const gs = groupTypo.groupSend;
  const groupSendOk =
    !!gs &&
    gs.glyph === "↑" &&
    !gs.hasVisibleBorder &&
    /transparent|rgba\(0,\s*0,\s*0,\s*0\)/.test(gs.bg) &&
    sizeOk(gs.glyphSize, 20) &&
    weightOk(gs.glyphWeight, 600) &&
    nearColor(gs.glyphColor, "#00E5FF") &&
    !gs.hasSvg;

  const juniperOk =
    directTypo.juniper &&
    directTypo.juniper.naturalW >= 324 &&
    directTypo.juniper.objectFit === "cover" &&
    directTypo.juniper.renderedW === 108 &&
    directTypo.juniper.renderedH === 86 &&
    /opal-direct-juniper-618-376/.test(directTypo.juniper.src || "");

  const mobileOk = mobileRows.every(
    (r) =>
      r.horizontalOverflowPx === 0 &&
      r.normalTabsContained === true &&
      r.composerDockCollisionPx === 0 &&
      (r.viewport.width !== 390 ||
        (r.dockLeft === 16 && r.dockTop === 758 && r.dockWidth === 358 && r.dockHeight === 86)),
  );

  const dockOk =
    dockHome.dock &&
    dockHome.dock.x === 16 &&
    dockHome.dock.y === 758 &&
    dockHome.dock.w === 358 &&
    dockHome.dock.h === 86 &&
    dockHome.centerOpal &&
    dockHome.centerOpal.x === 146 &&
    dockHome.centerOpal.y === -4;

  const directTypoOk = dChecks.every((c) => c.ok);
  const groupTypoOk = gChecks.every((c) => c.ok);

  const result = {
    HOLD: true,
    FOUNDER_WALK_READY: "NO",
    at: new Date().toISOString(),
    FONT_FAMILY_DEPENDENCY_GAP: false,
    directTypography: { checks: dChecks, objectiveDiff: dChecks.filter((c) => !c.ok).length },
    groupTypography: { checks: gChecks, objectiveDiff: gChecks.filter((c) => !c.ok).length },
    juniper: {
      ...directTypo.juniper,
      provenanceShaJpg: juniperSha,
      expectedFigmaSha: "d6d8c288dc4176477c4fae90d9702863811fbb5030ba03ed65dfe029a0de4916",
      sameAsFigmaRaw: juniperSha === "d6d8c288dc4176477c4fae90d9702863811fbb5030ba03ed65dfe029a0de4916",
      sameAsMediaJuniper: false,
      ok: juniperOk,
    },
    groupSend: { ...gs, ok: groupSendOk },
    directSend: directTypo.directSend,
    mobileRows,
    dockHome,
    callIncoming,
    graphsChips,
    firstRun,
    promiseSha,
    promiseShaUnchanged: promiseSha === "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10",
    diffOk,
    consoleNetwork: {
      pageErrors: pageErrors.length,
      consoleErrors: consoleErrors.length,
      samples: [...pageErrors, ...consoleErrors].slice(0, 5),
    },
  };

  const ok =
    directTypoOk &&
    groupTypoOk &&
    juniperOk &&
    groupSendOk &&
    mobileOk &&
    dockOk &&
    callIncoming.dock === false &&
    callIncoming.call === true &&
    graphsChips.includes("Action") &&
    firstRun.splash &&
    result.promiseShaUnchanged &&
    pageErrors.length === 0;

  result.FOUNDER_WALK_READY = ok ? "YES" : "NO";
  result.gates = {
    DIRECT_TYPOGRAPHY: directTypoOk ? "GREEN" : "RED",
    GROUP_TYPOGRAPHY: groupTypoOk ? "GREEN" : "RED",
    DIRECT_JUNIPER_MEDIA: juniperOk ? "GREEN" : "RED",
    DIRECT_MEDIA_DPR3: juniperOk ? "GREEN" : "RED",
    GROUP_SEND_TREATMENT: groupSendOk ? "GREEN" : "RED",
    MOBILE: mobileOk ? "GREEN" : "RED",
    DOCK: dockOk ? "GREEN" : "RED",
    CALL_NO_DOCK: callIncoming.dock === false && callIncoming.call ? "GREEN" : "RED",
    PROMISE: result.promiseShaUnchanged ? "GREEN" : "RED",
    CONSOLE: pageErrors.length === 0 ? "GREEN" : "RED",
  };
  result.failures = {
    directTypo: dChecks.filter((c) => !c.ok),
    groupTypo: gChecks.filter((c) => !c.ok),
    juniperOk,
    groupSendOk,
  };

  // flatten required filenames
  for (const f of [
    "FIGMA_DIRECT_618_348.png",
    "FIGMA_GROUP_618_451.png",
  ]) {
    if (existsSync(resolve(FIG, f))) {
      writeFileSync(resolve(OUT, f), readFileSync(resolve(FIG, f)));
    }
  }
  for (const f of ["RUNTIME_DIRECT_618_348.png", "RUNTIME_GROUP_618_451.png", "RUNTIME_JUNIPER_CROP.png", "RUNTIME_GROUP_SEND.png"]) {
    if (existsSync(resolve(RT, f))) writeFileSync(resolve(OUT, f), readFileSync(resolve(RT, f)));
  }
  for (const f of ["DIRECT_DIFF.png", "DIRECT_OVERLAY.png", "GROUP_DIFF.png", "GROUP_OVERLAY.png"]) {
    if (existsSync(resolve(DIFF, f))) writeFileSync(resolve(OUT, f), readFileSync(resolve(DIFF, f)));
  }

  writeFileSync(resolve(OUT, "PROOF.json"), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      {
        FOUNDER_WALK_READY: result.FOUNDER_WALK_READY,
        gates: result.gates,
        failures: {
          direct: result.failures.directTypo.map((c) => c.role),
          group: result.failures.groupTypo.map((c) => c.role),
          juniperOk,
          groupSendOk,
          groupSend: gs,
        },
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (!ok) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
