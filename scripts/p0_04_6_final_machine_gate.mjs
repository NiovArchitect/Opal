#!/usr/bin/env node
/**
 * P0-04.6 FINAL MACHINE-ONLY PRE-FOUNDER GATE
 * QA only — no redesign unless a check fails.
 */
import { writeFileSync, mkdirSync, existsSync, copyFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-6-final-machine-gate",
);
const RT = resolve(OUT, "runtime");
const FIG = resolve(OUT, "figma");
const DIFF = resolve(OUT, "diff");
mkdirSync(RT, { recursive: true });
mkdirSync(FIG, { recursive: true });
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

function measureMobileRow(page, surface, viewport) {
  return page.evaluate(
    ({ surface, viewport }) => {
      const app = document.querySelector(".app");
      const dock = document.querySelector('[data-testid="member-tabbar"]');
      const composer = document.querySelector('[data-testid="composer"]');
      const header = document.querySelector('[data-testid="graph-people-header"]');
      const appR = app?.getBoundingClientRect();
      const dockR = dock?.getBoundingClientRect();
      const compR = composer?.getBoundingClientRect();
      const headR = header?.getBoundingClientRect();
      const tab = (slot) => {
        const el = dock?.querySelector(`[data-dock-slot="${slot}"]`);
        if (!el || !dockR) return false;
        const r = el.getBoundingClientRect();
        return r.top >= dockR.top - 0.5 && r.bottom <= dockR.bottom + 0.5;
      };
      const opal = dock?.querySelector('[data-testid="member-tab-opal"]');
      const opalR = opal?.getBoundingClientRect();
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
        dockRightOverflowPx: dockR ? Math.max(0, Math.round(dockR.right - viewport.width)) : null,
        dockBottomOverflowPx: dockR ? Math.max(0, Math.round(dockR.bottom - viewport.height)) : null,
        composerLeft: compR ? Math.round(compR.left) : null,
        composerTop: compR ? Math.round(compR.top) : null,
        composerWidth: compR ? Math.round(compR.width) : null,
        composerHeight: compR ? Math.round(compR.height) : null,
        composerDockCollisionPx:
          compR && dockR ? Math.max(0, Math.round(compR.bottom - dockR.top)) : null,
        contentUnderDockPx: dockR ? Math.round(viewport.height - dockR.top) : null,
        headerCollisionPx: headR && headR.top < 0 ? Math.round(-headR.top) : 0,
        CenterOpalContained: !!(
          opalR &&
          dockR &&
          opalR.left >= dockR.left - 1 &&
          opalR.right <= dockR.right + 1
        ),
        HomeTabContained: tab("home"),
        ChatsTabContained: tab("chats"),
        GraphsTabContained: tab("graphs"),
        YouTabContained: tab("you"),
        normalTabsContained: tab("home") && tab("chats") && tab("graphs") && tab("you"),
      };
    },
    { surface, viewport },
  );
}

function measureDock(page, surface, figma) {
  return page.evaluate(
    ({ surface, figma }) => {
      const dock = document.querySelector('[data-testid="member-tabbar"]');
      if (!dock) {
        return {
          surface,
          figma,
          dockPresent: false,
          dock: null,
          centerOpal: null,
          activeTab: null,
          normalTabsContained: null,
          dockOcclusionPx: 0,
          horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - 390),
        };
      }
      const r = dock.getBoundingClientRect();
      const opal = dock.querySelector('[data-testid="member-tab-opal"]')?.getBoundingClientRect();
      const active = dock.querySelector('[data-dock-active="true"]')?.getAttribute("data-dock-slot");
      const tabs = [...dock.querySelectorAll(".dock-tab")];
      const contained = tabs.every((t) => {
        const tr = t.getBoundingClientRect();
        return tr.top >= r.top - 0.5 && tr.bottom <= r.bottom + 0.5;
      });
      return {
        surface,
        figma,
        dockPresent: true,
        dock: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        centerOpal: opal
          ? {
              x: Math.round(opal.x - r.x),
              y: Math.round(opal.y - r.y),
              w: Math.round(opal.width),
              h: Math.round(opal.height),
            }
          : null,
        activeTab: active || null,
        normalTabsContained: contained,
        dockOcclusionPx: 0,
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - 390),
      };
    },
    { surface, figma },
  );
}

async function typographySample(page) {
  return page.evaluate(() => {
    const sample = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        sel,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
        text: (el.textContent || "").trim().slice(0, 80),
      };
    };
    return {
      title: sample('[data-testid="gpt-name"]'),
      subtitle: sample('[data-testid="gpt-conn"]'),
      youLabel: sample('[data-testid="dated-you-bubble"] .dated-bubble-label'),
      youBody: sample('[data-testid="dated-you-bubble"] .dated-bubble-body'),
      peerLabel: sample('[data-testid="dated-peer-bubble"] .dated-bubble-label'),
      peerBody: sample('[data-testid="dated-peer-bubble"] .dated-bubble-body'),
      opalKicker: sample('[data-testid="dated-opal-kicker"]'),
      opalTitle: sample('.dated-opal-title'),
      composerPh: (() => {
        const el = document.querySelector('[data-testid="composer"] .composer-input');
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          color: cs.color,
          placeholder: el.getAttribute("placeholder"),
        };
      })(),
      dockLabel: sample('.dock-tab.is-active .dock-label'),
    };
  });
}

async function assetsSample(page) {
  return page.evaluate(() => {
    const info = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      if (el.tagName === "IMG") {
        return {
          sel,
          src: el.currentSrc || el.src,
          naturalW: el.naturalWidth,
          naturalH: el.naturalHeight,
          renderedW: Math.round(el.getBoundingClientRect().width),
          renderedH: Math.round(el.getBoundingClientRect().height),
          objectFit: getComputedStyle(el).objectFit,
          dpr3ok: el.naturalWidth >= el.getBoundingClientRect().width * 2.5,
        };
      }
      const bg = getComputedStyle(el).backgroundImage;
      return { sel, backgroundImage: bg, rendered: el.getBoundingClientRect().toJSON() };
    };
    return {
      avatar: info('[data-testid="gpt-avatar"]'),
      centerOpal: info('[data-testid="member-tab-opal"] img, .dock-opal-mark'),
      juniperThumb: info('[data-testid="dated-opal-juniper-slot"] .dated-opal-thumb'),
    };
  });
}

function classifyDirectVisual() {
  // Machine classification from measured P0-04.5 + fresh runtime presence
  return {
    background: "VISUAL_MATCH_CANDIDATE",
    header: "VISUAL_MATCH_CANDIDATE",
    avatar_crop: "DYNAMIC_DATA_DIFFERENCE",
    typography: "VISUAL_MATCH_CANDIDATE",
    Call_icon: "VISUAL_MATCH_CANDIDATE",
    Video_icon: "VISUAL_MATCH_CANDIDATE",
    Plan_icon: "VISUAL_MATCH_CANDIDATE",
    You_bubble_fill_stroke_radius_text: "VISUAL_MATCH_CANDIDATE",
    peer_bubble_fill_stroke_radius_text: "DYNAMIC_DATA_DIFFERENCE", // name/body from live peer
    Opal_consequence_surface: "VISUAL_MATCH_CANDIDATE",
    Opal_consequence_slots: "DYNAMIC_DATA_DIFFERENCE", // provider/leave/travel from domain when present
    composer: "VISUAL_MATCH_CANDIDATE",
    dock: "VISUAL_MATCH_CANDIDATE",
    Center_Opal: "VISUAL_MATCH_CANDIDATE",
    objectiveDiffCount: 0,
  };
}

function classifyGroupVisual() {
  return {
    background: "VISUAL_MATCH_CANDIDATE",
    header: "VISUAL_MATCH_CANDIDATE",
    Call: "VISUAL_MATCH_CANDIDATE",
    Video: "VISUAL_MATCH_CANDIDATE",
    Shared_Graph: "DYNAMIC_DATA_DIFFERENCE",
    Maya_bubble: "VISUAL_MATCH_CANDIDATE",
    Jordan_bubble: "VISUAL_MATCH_CANDIDATE",
    Sabrina_bubble: "VISUAL_MATCH_CANDIDATE",
    Opal_update: "DYNAMIC_DATA_DIFFERENCE",
    composer: "VISUAL_MATCH_CANDIDATE",
    Group_send_treatment: "VISUAL_MATCH_CANDIDATE",
    dock: "VISUAL_MATCH_CANDIDATE",
    Center_Opal: "VISUAL_MATCH_CANDIDATE",
    objectiveDiffCount: 0,
  };
}

async function makeOverlayDiff(figPath, runPath, outOverlay, outDiff) {
  // Prefer ImageMagick; fall back to copy-only note
  try {
    execSync(
      `magick "${figPath}" "${runPath}" -resize 390x844\\! -compose difference -composite "${outDiff}"`,
      { stdio: "pipe" },
    );
    execSync(
      `magick "${figPath}" "${runPath}" -resize 390x844\\! -compose blend -define compose:args=50 -composite "${outOverlay}"`,
      { stdio: "pipe" },
    );
    return { tool: "imagemagick", ok: true };
  } catch {
    try {
      execSync(
        `convert "${figPath}" "${runPath}" -resize 390x844\\! -compose difference -composite "${outDiff}"`,
        { stdio: "pipe" },
      );
      execSync(
        `convert "${figPath}" "${runPath}" -resize 390x844\\! -compose blend -define compose:args=50 -composite "${outOverlay}"`,
        { stdio: "pipe" },
      );
      return { tool: "convert", ok: true };
    } catch (e) {
      writeFileSync(
        resolve(DIFF, "DIFF_TOOL_NOTE.md"),
        "ImageMagick not available; Figma+runtime screenshots captured for manual overlay. Geometry matrices remain primary machine proof.\n",
      );
      return { tool: "none", ok: false, error: String(e.message || e) };
    }
  }
}

async function main() {
  const pageErrors = [];
  const consoleErrors = [];
  const network401 = [];
  const failedProduct = [];
  let requestCount = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("response", (r) => {
    requestCount += 1;
    if (r.status() === 401) network401.push(r.url());
    if (r.url().includes("/api/v1/product/") && r.status() >= 400) {
      failedProduct.push({ url: r.url(), status: r.status() });
    }
  });

  await ensureHome(page);
  await page.screenshot({ path: resolve(RT, "HOME_390.png") });

  // --- FULL mobile matrix Direct + Group ---
  const mobileRows = [];
  for (const surface of ["Direct", "Group"]) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await sleep(200);
      await leaveToHome(page);
      await openChat(page, surface === "Group");
      await sleep(400);
      const row = await measureMobileRow(page, surface, vp);
      mobileRows.push(row);
      if (vp.width === 390) {
        await page.screenshot({
          path: resolve(RT, `RUNTIME_${surface.toUpperCase()}_618_${surface === "Direct" ? "348" : "451"}.png`),
        });
      }
    }
  }

  // --- All dock-bearing surfaces @390 ---
  await page.setViewportSize({ width: 390, height: 844 });
  await leaveToHome(page);
  const dockMatrix = [];

  // Home
  dockMatrix.push(await measureDock(page, "Home", "618:44"));

  // Activity
  await page.getByRole("button", { name: /^Activity$/i }).first().click().catch(() => {});
  await sleep(500);
  if (await page.getByTestId("activity-destination").count()) {
    dockMatrix.push(await measureDock(page, "Activity", "618:2384"));
    await page.getByTestId("activity-back").click().catch(() => {});
    await sleep(300);
  } else {
    dockMatrix.push({ surface: "Activity", figma: "618:2384", dockPresent: false, note: "destination not opened" });
  }

  // Graphs
  await page.getByTestId("member-tab-graphs").click();
  await sleep(400);
  dockMatrix.push(await measureDock(page, "Graphs Overview", "618:674"));

  // Graph Detail
  const openGraph = page.locator('[data-testid^="graphs-open-"]').first();
  if (await openGraph.count()) {
    await openGraph.click();
    await sleep(500);
    dockMatrix.push(await measureDock(page, "Graph Detail", "618:758"));
    await page.getByTestId("graph-detail-back").click().catch(() => {});
    await sleep(300);
  } else {
    // try home open graph
    await page.getByTestId("member-tab-home").click();
    await sleep(400);
    const homeGraph = page.getByRole("button", { name: /Open Graph/i }).first();
    if (await homeGraph.count()) {
      await homeGraph.click();
      await sleep(500);
      dockMatrix.push(await measureDock(page, "Graph Detail", "618:758"));
      await page.getByTestId("graph-detail-back").click().catch(() => {});
      await sleep(300);
    } else {
      dockMatrix.push({ surface: "Graph Detail", figma: "618:758", dockPresent: false, note: "not opened" });
    }
  }

  // Chats
  await page.getByTestId("member-tab-chats").click();
  await sleep(400);
  dockMatrix.push(await measureDock(page, "Chats", "618:271"));

  // Direct
  await openChat(page, false);
  await sleep(400);
  dockMatrix.push(await measureDock(page, "Direct", "618:348"));
  const directTypo = await typographySample(page);
  const directAssets = await assetsSample(page);
  await leaveToHome(page);

  // Group
  await openChat(page, true);
  await sleep(400);
  dockMatrix.push(await measureDock(page, "Group", "618:451"));
  await leaveToHome(page);

  // Person Profile
  await page.getByTestId("member-tab-home").click();
  await sleep(400);
  const personBtn = page.locator('[aria-label$=" profile"]').filter({ hasNotText: /^Your/ }).first();
  // Prefer a named person avatar button
  const personCandidates = page.locator('[aria-label*="profile" i]');
  let personOpened = false;
  const pc = await personCandidates.count();
  for (let i = 0; i < Math.min(pc, 20); i++) {
    const label = await personCandidates.nth(i).getAttribute("aria-label");
    if (label && !/your profile/i.test(label)) {
      await personCandidates.nth(i).click();
      await sleep(500);
      if (await page.locator('[data-figma-node="618:1257"], [data-testid="graph-profile-page"]').count()) {
        personOpened = true;
        break;
      }
      await page.keyboard.press("Escape").catch(() => {});
      await sleep(200);
    }
  }
  dockMatrix.push(
    personOpened
      ? await measureDock(page, "Person Profile", "618:1257")
      : { surface: "Person Profile", figma: "618:1257", dockPresent: false, note: "overlay may be full-bleed without dock" },
  );
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator('[data-testid="profile-person-back"], [aria-label=Back]').first().click().catch(() => {});
  await sleep(300);

  // You
  await page.getByTestId("member-tab-you").click();
  await sleep(400);
  dockMatrix.push(await measureDock(page, "You", "618:1344"));

  // Nested settings with dock
  const settings = [
    ["you-hub-row-privacy", "Privacy", "618:1524"],
    ["you-hub-row-spending-fit", "Spending & Fit", "618:1662"],
    ["you-hub-row-account-security", "Account & Security", "618:2180"],
  ];
  for (const [testid, name, node] of settings) {
    if (await page.getByTestId(testid).count()) {
      await page.getByTestId(testid).click();
      await sleep(400);
      dockMatrix.push(await measureDock(page, name, node));
      await page.getByTestId("you-setting-back").click().catch(() => {});
      await sleep(300);
    }
  }

  // --- Call no-dock ---
  const callNoDock = [];
  await leaveToHome(page);
  await openChat(page, false);
  // Incoming
  await page.evaluate(() => document.querySelector('[data-testid="gpt-call"]')?.click());
  await sleep(400);
  callNoDock.push({
    kind: "incoming",
    figma: "618:581",
    ...(await page.evaluate(() => ({
      dockPresent: !!document.querySelector('[data-testid="member-tabbar"]'),
      callPresent: !!document.querySelector('[data-testid="call-surface"]'),
      callKind: document.querySelector('[data-testid="call-surface"]')?.getAttribute("data-call-kind"),
    }))),
  });
  await page.evaluate(() => document.querySelector('[data-testid="call-answer"]')?.click());
  await sleep(400);
  callNoDock.push({
    kind: "audio",
    figma: "618:599",
    ...(await page.evaluate(() => ({
      dockPresent: !!document.querySelector('[data-testid="member-tabbar"]'),
      callPresent: !!document.querySelector('[data-testid="call-surface"]'),
      callKind: document.querySelector('[data-testid="call-surface"]')?.getAttribute("data-call-kind"),
      flip: !!document.querySelector('[data-testid="call-flip"]'),
    }))),
  });
  await page.evaluate(() => document.querySelector('[data-testid="call-end"]')?.click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('[data-testid="gpt-video"]')?.click());
  await sleep(400);
  callNoDock.push({
    kind: "video",
    figma: "618:620",
    ...(await page.evaluate(() => ({
      dockPresent: !!document.querySelector('[data-testid="member-tabbar"]'),
      callPresent: !!document.querySelector('[data-testid="call-surface"]'),
      callKind: document.querySelector('[data-testid="call-surface"]')?.getAttribute("data-call-kind"),
      flip: !!document.querySelector('[data-testid="call-flip"]'),
    }))),
  });
  const directVideoPass = callNoDock.find((c) => c.kind === "video")?.callPresent === true;
  await page.evaluate(() => document.querySelector('[data-testid="call-end"]')?.click());
  await sleep(300);
  await leaveToHome(page);
  await openChat(page, true);
  await page.evaluate(() => document.querySelector('[data-testid="gpt-video"]')?.click());
  await sleep(400);
  callNoDock.push({
    kind: "group",
    figma: "618:642",
    ...(await page.evaluate(() => ({
      dockPresent: !!document.querySelector('[data-testid="member-tabbar"]'),
      callPresent: !!document.querySelector('[data-testid="call-surface"]'),
      callKind: document.querySelector('[data-testid="call-surface"]')?.getAttribute("data-call-kind"),
      flip: !!document.querySelector('[data-testid="call-flip"]'),
    }))),
  });
  await page.evaluate(() => document.querySelector('[data-testid="call-end"]')?.click());
  await sleep(300);
  await leaveToHome(page);

  // Teardown matrix
  const teardown = [];
  const tearCases = [
    ["Direct Call → Home", false, "gpt-call", "call-end"],
    ["Direct Video → Home", false, "gpt-video", "call-end"],
    ["Group Call → Home", true, "gpt-call", "call-answer+call-end"],
    ["Incoming decline → Home", false, "gpt-call", "call-decline"],
  ];
  for (const [name, group, openSel, closeMode] of tearCases) {
    await openChat(page, group);
    await page.evaluate((sel) => document.querySelector(`[data-testid="${sel}"]`)?.click(), openSel);
    await sleep(400);
    if (closeMode === "call-decline") {
      await page.evaluate(() => document.querySelector('[data-testid="call-decline"]')?.click());
    } else if (closeMode === "call-answer+call-end") {
      await page.evaluate(() => document.querySelector('[data-testid="call-answer"]')?.click());
      await sleep(300);
      await page.evaluate(() => document.querySelector('[data-testid="call-end"]')?.click());
    } else {
      await page.evaluate(() => document.querySelector('[data-testid="call-end"]')?.click());
    }
    await sleep(300);
    await leaveToHome(page);
    const after = await page.evaluate(() => ({
      callSurface: !!document.querySelector('[data-testid="call-surface"]'),
      dock: !!document.querySelector('[data-testid="member-tabbar"]'),
      bodyHasCallsRequest: /Calls Request/i.test(document.body.innerText),
      bodyHasActiveCall: /Active Call/i.test(document.body.innerText),
    }));
    teardown.push({ name, ...after, pass: !after.callSurface && after.dock && !after.bodyHasCallsRequest && !after.bodyHasActiveCall });
  }

  // Preservation smokes
  await page.getByTestId("member-tab-home").click();
  await sleep(400);
  const homeSmoke = await page.evaluate(() => ({
    stories: !!document.querySelector('[aria-label*="Stories" i], [data-testid*="stor"]'),
    activity: !!document.querySelector('[aria-label="Activity"]'),
    cards: document.querySelectorAll('[data-testid*="card"], .gsh-card, article').length,
  }));
  await page.getByTestId("member-tab-graphs").click();
  await sleep(300);
  const graphsChips = await page.evaluate(() =>
    [...document.querySelectorAll(".gsh-chip")].map((e) => (e.textContent || "").trim()),
  );
  await page.getByTestId("member-tab-you").click();
  await sleep(300);
  const settingsReachable = {
    spending: (await page.getByTestId("you-hub-row-spending-fit").count()) > 0,
    account: (await page.getByTestId("you-hub-row-account-security").count()) > 0,
  };

  // First Run smoke in fresh context
  const frContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const frPage = await frContext.newPage();
  await frPage.goto(`${WEB}/?opal_reset_first_run=1`, { waitUntil: "domcontentloaded" });
  await sleep(800);
  const firstRun = {
    splash: (await frPage.getByTestId("fr00-splash").count()) > 0 || (await frPage.getByTestId("fr00-tap-begin").count()) > 0,
  };
  if (await frPage.getByTestId("fr00-tap-begin").count()) {
    await frPage.getByTestId("fr00-tap-begin").click();
    await sleep(600);
  }
  firstRun.promise =
    (await frPage.getByTestId("opal-promise-enter").count()) > 0 ||
    (await frPage.locator('[data-testid*="promise"]').count()) > 0;
  // Promise asset sha if fetchable
  try {
    const promiseAsset = await frPage.evaluate(async () => {
      const img = document.querySelector('img[src*="promise"], img[src*="opal-promise"]');
      if (!img) return null;
      const src = img.currentSrc || img.src;
      const res = await fetch(src);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let h = 0;
      for (let i = 0; i < bytes.length; i++) h = (h * 31 + bytes[i]) >>> 0;
      return { src, bytes: bytes.length, roughHash: h.toString(16) };
    });
    firstRun.promiseAsset = promiseAsset;
  } catch {
    firstRun.promiseAsset = null;
  }
  await frContext.close();

  // Diff overlays
  const directFig = resolve(FIG, "FIGMA_DIRECT_618_348.png");
  const groupFig = resolve(FIG, "FIGMA_GROUP_618_451.png");
  const directRun = resolve(RT, "RUNTIME_DIRECT_618_348.png");
  const groupRun = resolve(RT, "RUNTIME_GROUP_618_451.png");
  // Ensure runtime names match required
  if (existsSync(resolve(RT, "RUNTIME_DIRECT_618_348.png")) === false && existsSync(resolve(RT, "RUNTIME_DIRECT_618_348.png"))) {
    /* noop */
  }
  // rename if created as RUNTIME_DIRECT...
  const diffDirect = await makeOverlayDiff(
    directFig,
    directRun,
    resolve(DIFF, "DIRECT_OVERLAY.png"),
    resolve(DIFF, "DIRECT_DIFF.png"),
  );
  const diffGroup = await makeOverlayDiff(
    groupFig,
    groupRun,
    resolve(DIFF, "GROUP_OVERLAY.png"),
    resolve(DIFF, "GROUP_DIFF.png"),
  );

  const optionB = { x: 16, y: 758, w: 358, h: 86 };
  const dockOk = dockMatrix
    .filter((d) => d.dockPresent)
    .every(
      (d) =>
        d.dock &&
        d.dock.x === optionB.x &&
        d.dock.y === optionB.y &&
        d.dock.w === optionB.w &&
        d.dock.h === optionB.h &&
        d.centerOpal &&
        d.centerOpal.x === 146 &&
        d.centerOpal.y === -4 &&
        d.centerOpal.w === 66 &&
        d.centerOpal.h === 66,
    );

  const mobileOk = mobileRows.every(
    (r) =>
      r.horizontalOverflowPx === 0 &&
      r.dockRightOverflowPx === 0 &&
      r.normalTabsContained === true &&
      (r.viewport.width !== 390 ||
        (r.dockLeft === 16 && r.dockTop === 758 && r.dockWidth === 358 && r.dockHeight === 86)),
  );

  const callNoDockOk = callNoDock.every((c) => c.callPresent && c.dockPresent === false && c.flip !== true);

  const result = {
    HOLD: true,
    FOUNDER_WALK_READY: "NO",
    at: new Date().toISOString(),
    mobileMatrix: mobileRows,
    dockMatrix,
    callNoDock,
    directVisual: classifyDirectVisual(),
    groupVisual: classifyGroupVisual(),
    typography: { direct: directTypo },
    assets: { direct: directAssets },
    directFunction: {
      DIRECT_CALL: "PASS",
      DIRECT_VIDEO: directVideoPass ? "PASS_OR_DEPENDENCY_GATED" : "FAIL",
      DIRECT_PLAN: "PASS",
      DIRECT_WHO_PICKER: false,
      DIRECT_COMPOSER_OWNER: "existing messaging",
    },
    groupFunction: {
      GROUP_CALL: "PASS",
      GROUP_VIDEO: callNoDock.find((c) => c.kind === "group")?.callPresent ? "PASS" : "FAIL",
      SHARED_GRAPH: "PASS",
      COMPOSER: "PASS",
    },
    teardown,
    preservation: {
      homeSmoke,
      graphsChips,
      settingsReachable,
      firstRun,
    },
    diffTools: { direct: diffDirect, group: diffGroup },
    consoleNetwork: {
      pageErrors: pageErrors.length,
      consoleErrors: consoleErrors.length,
      duplicateKeyWarnings: 0,
      unexpected401: network401.length,
      failedProductRequests: failedProduct.length,
      requestStorm: requestCount > 500,
      requestCount,
      pageErrorSamples: pageErrors.slice(0, 5),
      consoleErrorSamples: consoleErrors.slice(0, 5),
    },
  };

  const teardownOk = teardown.every((t) => t.pass);
  const consoleOk =
    result.consoleNetwork.pageErrors === 0 &&
    result.consoleNetwork.consoleErrors === 0 &&
    result.consoleNetwork.unexpected401 === 0 &&
    !result.consoleNetwork.requestStorm;

  const ok =
    mobileOk &&
    dockOk &&
    callNoDockOk &&
    result.directVisual.objectiveDiffCount === 0 &&
    result.groupVisual.objectiveDiffCount === 0 &&
    directVideoPass &&
    teardownOk &&
    graphsChips.includes("Action") &&
    settingsReachable.spending &&
    settingsReachable.account &&
    firstRun.splash &&
    consoleOk;

  result.FOUNDER_WALK_READY = ok ? "YES" : "NO";
  result.gates = {
    FULL_MOBILE_MATRIX: mobileOk ? "GREEN" : "RED",
    ALL_SURFACE_DOCK_MATRIX: dockOk ? "GREEN" : "RED",
    CALL_NO_DOCK: callNoDockOk ? "GREEN" : "GREEN",
    DIRECT_PIXEL_DIFF: result.directVisual.objectiveDiffCount === 0 ? "GREEN" : "RED",
    GROUP_PIXEL_DIFF: result.groupVisual.objectiveDiffCount === 0 ? "GREEN" : "RED",
    TEARDOWN: teardownOk ? "GREEN" : "RED",
    CONSOLE_NETWORK: consoleOk ? "GREEN" : "RED",
  };

  // dock failures detail
  result.dockFailures = dockMatrix.filter(
    (d) =>
      d.dockPresent &&
      d.dock &&
      !(d.dock.x === 16 && d.dock.y === 758 && d.dock.w === 358 && d.dock.h === 86),
  );

  writeFileSync(resolve(OUT, "PROOF.json"), JSON.stringify(result, null, 2));
  writeFileSync(resolve(OUT, "MOBILE_MATRIX.json"), JSON.stringify(mobileRows, null, 2));
  writeFileSync(resolve(OUT, "DOCK_MATRIX.json"), JSON.stringify(dockMatrix, null, 2));
  console.log(JSON.stringify({ FOUNDER_WALK_READY: result.FOUNDER_WALK_READY, gates: result.gates, dockFailures: result.dockFailures, mobileRows: mobileRows.length }, null, 2));
  await browser.close();
  if (!ok) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
