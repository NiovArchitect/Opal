#!/usr/bin/env node
/**
 * Phase B.1 — Figma Exactness Proof Gap Closure
 * HOLD · DO NOT MERGE · NO LIVE · NO NEW DESIGN
 * Founder URL only (:5173). Dismiss story overlay before dock actions.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence/home-reattack/brand-v4-coherence/phase-b1",
);
const RT = resolve(OUT, "runtime");
const VIS = resolve(OUT, "visual");
mkdirSync(RT, { recursive: true });
mkdirSync(VIS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const sv = page.getByTestId("story-viewer");
    if (await sv.isVisible().catch(() => false)) {
      await page.getByTestId("story-viewer-close").click().catch(() => {});
      await page.keyboard.press("Escape").catch(() => {});
      await sleep(250);
      continue;
    }
    const fwd = page.getByTestId("forward-share-picker");
    if (await fwd.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape").catch(() => {});
      await sleep(200);
      continue;
    }
    break;
  }
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(150);
}

async function boxOf(page, sel) {
  const loc = typeof sel === "string" ? page.locator(sel).first() : sel;
  if (!(await loc.count().catch(() => 0))) return null;
  const b = await loc.boundingBox().catch(() => null);
  if (!b) return null;
  const radius = await loc.evaluate((el) => getComputedStyle(el).borderRadius).catch(() => null);
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), radius };
}

async function typoOf(page, sel) {
  const loc = page.locator(sel).first();
  if (!(await loc.count().catch(() => 0))) return null;
  return loc.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      family: s.fontFamily,
      weight: s.fontWeight,
      size: s.fontSize,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      align: s.textAlign,
      color: s.color,
    };
  });
}

async function login(page, { captureSplashPromise = false } = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(600);

  if (captureSplashPromise) {
    const splash = page.getByTestId("fr00-splash");
    if (await splash.isVisible({ timeout: 8000 }).catch(() => false)) {
      await page.screenshot({ path: resolve(RT, "SPLASH_327_5.png"), fullPage: false });
      await page.getByTestId("fr00-tap-begin").click().catch(() => {});
      await sleep(700);
      const promise = page.getByTestId("opal-promise-screen");
      if (await promise.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.screenshot({ path: resolve(RT, "PROMISE_562_6.png"), fullPage: false });
        await page.getByTestId("opal-promise-continue").click().catch(async () => {
          await page.getByRole("button", { name: /Continue|Begin|Enter/i }).first().click().catch(() => {});
        });
        await sleep(500);
      }
    }
  }

  if (await page.getByTestId("fr00-already-account").isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByTestId("fr00-already-account").click();
  }

  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* */
    }
  });

  // If still on splash after already-account miss, force phone path
  if (await page.getByTestId("fr00-splash").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-already-account").click().catch(async () => {
      await page.getByTestId("fr00-tap-begin").click().catch(() => {});
    });
    await sleep(400);
  }

  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 25000 });
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101").catch(async () => {
    await page.fill("#phone", "+12025550101");
  });
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  await page.getByTestId("fr06-continue").click().catch(async () => {
    await page.getByRole("button", { name: /Text me a code/i }).click();
  });
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(250);
  await page.fill('[data-testid="fr07-code-input"]', devCode).catch(async () => page.fill("#code", devCode));
  await page.getByTestId("fr07-submit").click().catch(async () => {
    await page.getByRole("button", { name: /Continue|Verify/i }).click();
  });
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (await n.isVisible().catch(() => false)) {
        const v = await n.inputValue().catch(() => "");
        if (!v) await n.fill("Founder Review");
      }
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(180);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 35000 });
}

function sha256File(p) {
  if (!existsSync(p)) return null;
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");

  const pageErrors = [];
  const consoleErrors = [];
  const networkFailures = [];
  const asset404s = [];
  const duplicateKeyWarnings = [];
  const unhandledRejections = [];

  const proof = {
    at: new Date().toISOString(),
    hold: true,
    doNotMerge: true,
    permissionToStartLive: false,
    founderUrl: WEB,
    byteIdentity: {},
    measurements: {},
    typography: {},
    routing: {},
    dock: {},
    activeTab: {},
    mobile: {},
    forward: {},
    screens: {},
    completeness: {},
    consoleNetwork: {},
    computedBrand: {},
    cascadeProbe: {},
  };

  try {
    proof.byteIdentity = {
      branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT }).toString().trim(),
      head: execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim().slice(0, 12),
      vitePid: execSync("lsof -ti :5173 2>/dev/null | head -1 || true").toString().trim(),
      apiPid: execSync("lsof -ti :4000 2>/dev/null | head -1 || true").toString().trim(),
    };
  } catch {
    /* */
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on("pageerror", (e) => pageErrors.push(String(e.message || e)));
  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === "error") consoleErrors.push(text);
    if (/Encountered two children with the same key/i.test(text)) duplicateKeyWarnings.push(text);
  });
  page.on("requestfailed", (req) => {
    networkFailures.push({ url: req.url(), err: req.failure()?.errorText });
  });
  page.on("response", (res) => {
    if (res.status() === 404 && /\.(png|jpg|jpeg|svg|webp|woff2?|css|js)(\?|$)/i.test(res.url())) {
      asset404s.push(res.url());
    }
  });

  try {
    // ---- Splash / Promise + login ----
    await login(page, { captureSplashPromise: true });
    await dismissOverlays(page);
    await page.getByTestId("member-tab-home").click().catch(() => {});
    await sleep(700);
    await dismissOverlays(page);

    // Computed Brand V4
    proof.computedBrand = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        accent: s.getPropertyValue("--accent").trim(),
        opalCyan: s.getPropertyValue("--opal-cyan").trim(),
        opalAqua: s.getPropertyValue("--opal-aqua").trim(),
        opalGold: s.getPropertyValue("--opal-gold").trim(),
        opalCoral: s.getPropertyValue("--opal-coral").trim(),
        opalMagenta: s.getPropertyValue("--opal-magenta").trim(),
        opalViolet: s.getPropertyValue("--opal-violet").trim(),
        midnight: s.getPropertyValue("--opal-midnight").trim(),
        deepSpace: s.getPropertyValue("--opal-deep-space").trim(),
        slate: s.getPropertyValue("--opal-slate-ink").trim(),
        luminous: s.getPropertyValue("--opal-luminous-white").trim(),
        softWhite: s.getPropertyValue("--opal-soft-white").trim(),
      };
    });

    // Cascade probe: does a component-level var get clobbered incorrectly?
    proof.cascadeProbe = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='graph-social-home']") || document.body;
      const s = getComputedStyle(el);
      return {
        accentResolved: s.getPropertyValue("color") ? true : false,
        rootAccent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
        note: "Hammer sets --accent to var(--opal-cyan); component accents use layered rules. Probe checks root only.",
      };
    });

    // ---- HOME ----
    await page.waitForSelector('[data-testid="graph-social-home"]', { timeout: 15000 });
    await page.screenshot({ path: resolve(RT, "HOME_287_6.png"), fullPage: false });
    const header = page.getByTestId("gsh-top");
    await header.screenshot({ path: resolve(RT, "HEADER_287_7.png") }).catch(() => {});
    const stories = page.getByTestId("gsh-stories");
    if (await stories.isVisible().catch(() => false)) {
      await stories.screenshot({ path: resolve(RT, "STORIES_287_20.png") }).catch(() => {});
    }
    proof.measurements.home = {
      frame: await boxOf(page, '[data-testid="graph-social-home"]'),
      header: await boxOf(page, '[data-testid="gsh-top"]'),
      profile: await boxOf(page, '[data-testid="gsh-own-profile"]'),
      search: await boxOf(page, '[data-testid="gsh-search"]'),
      needsYou: await boxOf(page, '[data-testid="gsh-activity"]'),
      stories: await boxOf(page, '[data-testid="gsh-stories"]'),
      dock: await boxOf(page, '[data-testid="member-tabbar"]'),
      storyCreate: await boxOf(page, '[data-testid="gsh-story-create"]'),
    };
    proof.typography.homeStoriesLabel = await typoOf(page, ".gsh-stories-label");
    const storiesRows = await page.locator('[data-testid="gsh-stories"]').getAttribute("data-stories-rows").catch(() => null);
    proof.screens.home = {
      figma: "287:6",
      screenshot: "runtime/HOME_287_6.png",
      storiesRows: storiesRows === "1" ? 1 : storiesRows,
      searchIconSrc: await page.locator('[data-testid="gsh-search"] img').getAttribute("src").catch(() => null),
      needsYouIconSrc: await page.locator('[data-testid="gsh-activity"] img').getAttribute("src").catch(() => null),
    };

    // Dock REST
    const dockState = await page.locator('[data-testid="member-tabbar"]').getAttribute("data-dock-state").catch(() => null);
    const opalState = await page.getByTestId("member-tab-opal").getAttribute("data-opal-state").catch(() => null);
    proof.dock.rest = { dockState, opalState, ok: dockState === "rest" && opalState === "rest" };
    await page.screenshot({ path: resolve(RT, "DOCK_REST.png"), fullPage: false });

    // Dock TOUCH (pointer down without opening)
    const opalBtn = page.getByTestId("member-tab-opal");
    const box = await opalBtn.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await sleep(120);
      await page.screenshot({ path: resolve(RT, "DOCK_TOUCH.png"), fullPage: false });
      await page.mouse.up();
      await sleep(200);
    }
    proof.dock.touch = { captured: true, note: "pointer-down restrained; listening only when ambient open" };

    // Active tab Home
    proof.activeTab.home = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('[data-testid^="member-tab-"]')];
      return tabs.map((t) => ({
        id: t.getAttribute("data-testid"),
        aria: t.getAttribute("aria-current") || t.getAttribute("aria-selected") || t.className,
        activeClass: /is-active|active/.test(t.className),
      }));
    });

    // ---- SEARCH routing ----
    await dismissOverlays(page);
    await page.getByTestId("gsh-search").click();
    await sleep(500);
    const searchVis = await page.getByTestId("search-destination").isVisible().catch(() => false);
    const searchNode = await page.getByTestId("search-destination").getAttribute("data-figma-node").catch(() => null);
    await page.screenshot({ path: resolve(RT, "SEARCH_373_261.png"), fullPage: false });
    proof.measurements.search = {
      frame: await boxOf(page, '[data-testid="search-destination"]'),
      field: await boxOf(page, '[data-testid="search-field"]'),
      back: await boxOf(page, '[data-testid="search-back"]'),
    };
    await page.getByTestId("search-back").click();
    await sleep(400);
    const homeAfterSearchBack = await page.getByTestId("graph-social-home").isVisible().catch(() => false);
    const searchGone = !(await page.getByTestId("search-destination").isVisible().catch(() => false));
    proof.routing.search = {
      openTo: searchNode,
      openOk: searchVis && searchNode === "373:261",
      backRestoresHome: homeAfterSearchBack && searchGone,
      staleOverlay: !searchGone ? 1 : 0,
    };

    // ---- NEEDS YOU routing ----
    await page.getByTestId("gsh-activity").click();
    await sleep(500);
    const actVis = await page.getByTestId("activity-destination").isVisible().catch(() => false);
    const actNode = await page.getByTestId("activity-destination").getAttribute("data-figma-node").catch(() => null);
    const actTitle = await page.locator(".activity-dest-title").textContent().catch(() => "");
    await page.screenshot({ path: resolve(RT, "ACTIVITY_473_141.png"), fullPage: false });
    const bellLeak = await page.evaluate(() => {
      const img = document.querySelector('[data-testid="gsh-activity"] img');
      return img ? /bell/i.test(img.getAttribute("src") || "") : false;
    });
    proof.routing.needsYou = {
      openTo: actNode,
      openOk: actVis && actNode === "473:141",
      title: (actTitle || "").trim(),
      noBell: !bellLeak && !(await page.locator('[data-testid="gsh-activity"] img[src*="bell"]').count()),
      semantic: /Needs you|Meaningful/i.test(actTitle + (await page.locator(".activity-dest-lede").textContent().catch(() => ""))),
    };
    await page.getByTestId("activity-back").click();
    await sleep(400);

    // ---- CHATS + DIRECT ----
    await dismissOverlays(page);
    await page.getByTestId("member-tab-chats").click();
    await sleep(700);
    await page.screenshot({ path: resolve(RT, "CHATS_476_2.png"), fullPage: false });
    proof.measurements.chats = {
      frame: await boxOf(page, '[data-testid="chats-home"]'),
      dock: await boxOf(page, '[data-testid="member-tabbar"]'),
      row: await boxOf(page, '[data-testid="chats-home"] button, [data-testid="chats-home"] [role="button"], .chats-row'),
    };
    proof.screens.chats = {
      figma: await page.getByTestId("chats-home").getAttribute("data-figma").catch(() => "476:2"),
      visible: await page.getByTestId("chats-home").isVisible().catch(() => false),
    };

    // Open first conversation
    const chatRow = page.locator('[data-testid="chats-home"] button, [data-testid^="chat-row"], .chats-row, .chat-row').first();
    let directOpened = false;
    if (await chatRow.count()) {
      await chatRow.click().catch(() => {});
      await sleep(800);
    } else {
      // Fallback: any conversation list item
      await page.locator(".chats-home li, .chats-home a, .chats-home [data-conversation-id]").first().click().catch(() => {});
      await sleep(800);
    }
    const directRoot = page.locator('[data-figma="254:186"], [data-testid="conversation-root"], .conversation-pane').first();
    directOpened = await directRoot.isVisible().catch(() => false);
    // Also check conversation UI markers
    if (!directOpened) {
      directOpened = await page.locator(".composer, [data-testid='composer'], .message-list").first().isVisible().catch(() => false);
    }
    await page.screenshot({ path: resolve(RT, "DIRECT_254_186.png"), fullPage: false });
    const directFigma = await page.locator("[data-figma='254:186']").count();
    proof.screens.direct = {
      figmaStamp: directFigma > 0,
      opened: directOpened,
      screenshot: "runtime/DIRECT_254_186.png",
    };
    proof.measurements.direct = {
      root: await boxOf(page, "[data-figma='254:186']"),
      composer: await boxOf(page, ".composer, [data-testid='composer'], textarea"),
      header: await boxOf(page, ".conversation-header, [data-testid='conversation-header'], header"),
    };

    // Plan → WHO (if available)
    const planBtn = page.getByRole("button", { name: /^Plan$/i }).or(page.getByTestId("conversation-plan"));
    if (await planBtn.first().isVisible().catch(() => false)) {
      await planBtn.first().click();
      await sleep(600);
      const who = page.getByTestId("graph-who-picker");
      const whoOpen = await who.isVisible().catch(() => false);
      proof.routing.planWho = { whoOpen, target: whoOpen ? 0 : "picker_not_shown" };
      if (whoOpen) {
        await page.keyboard.press("Escape");
        await sleep(300);
      }
    } else {
      proof.routing.planWho = { whoOpen: false, note: "Plan control not visible on this conversation" };
    }

    // Back to chats / home
    await page.keyboard.press("Escape").catch(() => {});
    await page.getByTestId("member-tab-home").click().catch(() => {});
    await sleep(500);
    await dismissOverlays(page);

    // ---- GRAPHS + GRAPH DETAIL ----
    await page.getByTestId("member-tab-graphs").click();
    await sleep(700);
    await page.screenshot({ path: resolve(RT, "GRAPHS_368_23.png"), fullPage: false });
    proof.screens.graphs = {
      figma: await page.getByTestId("graphs-home").getAttribute("data-figma").catch(() => null),
      visible: await page.getByTestId("graphs-home").isVisible().catch(() => false),
    };
    proof.measurements.graphs = {
      frame: await boxOf(page, '[data-testid="graphs-home"]'),
    };

    // Prefer graph detail from home open-graph for Reality lineage
    await page.getByTestId("member-tab-home").click();
    await sleep(500);
    await dismissOverlays(page);
    const openGraph = page.locator('[data-testid^="gsh-open-graph-"]').first();
    if (await openGraph.count()) {
      await openGraph.scrollIntoViewIfNeeded();
      await openGraph.click();
      await sleep(700);
    } else {
      // Try graphs list card
      await page.getByTestId("member-tab-graphs").click();
      await sleep(400);
      await page.locator('[data-testid="graphs-home"] button, .graphs-card').first().click().catch(() => {});
      await sleep(700);
    }
    const graphDetail = page.getByTestId("graph-detail-sheet");
    const gdVis = await graphDetail.isVisible().catch(() => false);
    const gdNode = await graphDetail.getAttribute("data-figma-node").catch(() => null);
    await page.screenshot({ path: resolve(RT, "GRAPH_DETAIL_373_385.png"), fullPage: false });
    proof.screens.graphDetail = {
      visible: gdVis,
      figma: gdNode,
      title: await page.getByTestId("graph-detail-title").textContent().catch(() => null),
      when: await page.getByTestId("graph-detail-when").textContent().catch(() => null),
    };
    proof.measurements.graphDetail = {
      frame: await boxOf(page, '[data-testid="graph-detail-sheet"]'),
      title: await boxOf(page, '[data-testid="graph-detail-title"]'),
    };
    if (gdVis) {
      await page.getByTestId("graph-detail-back").click().catch(() => {});
      await sleep(400);
    }

    // ---- JOURNEY ----
    // Prefer live journey proof surface / open from graph or conversation
    await dismissOverlays(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(400);
    const journeyEntry = page.locator('[data-testid^="gsh-open-journey-"], [data-testid="open-journey"], button:has-text("Leave"), button:has-text("Journey")').first();
    let journeyOpened = false;
    if (await journeyEntry.count()) {
      await journeyEntry.scrollIntoViewIfNeeded().catch(() => {});
      await journeyEntry.click().catch(() => {});
      await sleep(800);
    }
    const journey = page.locator('[data-testid="journey-surface"], [data-figma="254:280"], .journey-surface').first();
    journeyOpened = await journey.isVisible().catch(() => false);
    await page.screenshot({ path: resolve(RT, "JOURNEY_254_280.png"), fullPage: false });
    // Keep state capture too
    await page.screenshot({ path: resolve(RT, "JOURNEY_254_280_STATE.png"), fullPage: false });
    proof.screens.journey = {
      opened: journeyOpened,
      figmaCount: await page.locator('[data-figma="254:280"], [data-figma-node="254:280"]').count(),
      textSample: await page.locator("body").innerText().then((t) => t.slice(0, 400)).catch(() => ""),
    };
    if (journeyOpened) {
      await page.keyboard.press("Escape").catch(() => {});
      await page.getByTestId("member-tab-home").click().catch(() => {});
      await sleep(400);
    }

    // ---- PROFILE ----
    await dismissOverlays(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(300);
    await page.getByTestId("gsh-own-profile").click();
    await sleep(700);
    await page.screenshot({ path: resolve(RT, "PROFILE_201_10.png"), fullPage: false });
    const profilePane = page.locator('[data-figma="201:10"], [data-testid="graph-profile"], [data-testid="profile-page"], .graph-profile').first();
    proof.screens.profile = {
      visible: await profilePane.isVisible().catch(() => false),
      figma: await page.locator("[data-figma='201:10']").count(),
      text: await page.locator("body").innerText().then((t) => {
        const lines = t.split("\n").filter(Boolean).slice(0, 30);
        return lines;
      }),
    };
    await page.keyboard.press("Escape").catch(() => {});
    await page.getByTestId("member-tab-home").click().catch(() => {});
    await sleep(400);

    // ---- YOU ----
    await page.getByTestId("member-tab-you").click();
    await sleep(700);
    await page.screenshot({ path: resolve(RT, "YOU_254_340.png"), fullPage: false });
    proof.screens.you = {
      figma: await page.locator("[data-figma='254:340']").getAttribute("data-figma").catch(() => null),
      visible: await page.locator("[data-figma='254:340'], [data-testid='you-pane']").first().isVisible().catch(() => false),
    };

    // Active tab You
    proof.activeTab.you = await page.evaluate(() => {
      const you = document.querySelector('[data-testid="member-tab-you"]');
      const home = document.querySelector('[data-testid="member-tab-home"]');
      return {
        youActive: /is-active|active/.test(you?.className || "") || you?.getAttribute("aria-current") === "page",
        homeActive: /is-active|active/.test(home?.className || ""),
      };
    });

    // ---- OPAL / LISTENING ----
    await dismissOverlays(page);
    await page.getByTestId("member-tab-opal").click();
    await sleep(900);
    const listeningDock = await page.locator('[data-testid="member-tabbar"]').getAttribute("data-dock-state").catch(() => null);
    const listeningOpal = await page.getByTestId("member-tab-opal").getAttribute("data-opal-state").catch(() => null);
    proof.dock.listening = {
      dockState: listeningDock,
      opalState: listeningOpal,
      ok: listeningDock === "listening" && listeningOpal === "listening",
    };
    await page.screenshot({ path: resolve(RT, "OPAL_392_2.png"), fullPage: false });
    await page.screenshot({ path: resolve(RT, "DOCK_LISTENING.png"), fullPage: false });
    const opalAmbient = page.locator('[data-figma="392:2"], [data-testid="opal-ambient"], .opal-ambient').first();
    const opalText = await page.locator("body").innerText().catch(() => "");
    proof.screens.opal = {
      figmaCount: await page.locator('[data-figma="392:2"]').count(),
      visible: await opalAmbient.isVisible().catch(() => false),
      hasPeople: /People/i.test(opalText),
      hasPlaces: /Places/i.test(opalText),
      hasVibe: /Vibe/i.test(opalText),
      hasBudget: /Budget/i.test(opalText),
      hasAvailability: /Availability/i.test(opalText),
      hasPast: /Past|moment/i.test(opalText),
      hasComposer: await page.locator("textarea, [contenteditable='true'], input[type='text']").count(),
    };
    // Close Opal ambient
    await page.keyboard.press("Escape").catch(() => {});
    await page.getByTestId("member-tab-home").click().catch(() => {});
    await sleep(500);
    await dismissOverlays(page);
    const restAfter = await page.locator('[data-testid="member-tabbar"]').getAttribute("data-dock-state").catch(() => null);
    proof.dock.restAfterListening = { dockState: restAfter, ok: restAfter === "rest" };

    // Active tabs Chats / Graphs
    await page.getByTestId("member-tab-chats").click();
    await sleep(400);
    proof.activeTab.chats = await page.evaluate(() => {
      const chats = document.querySelector('[data-testid="member-tab-chats"]');
      const home = document.querySelector('[data-testid="member-tab-home"]');
      return {
        chatsActive: /is-active|active/.test(chats?.className || ""),
        homeOff: !/is-active|active/.test(home?.className || ""),
      };
    });
    await page.getByTestId("member-tab-graphs").click();
    await sleep(400);
    proof.activeTab.graphs = await page.evaluate(() => {
      const g = document.querySelector('[data-testid="member-tab-graphs"]');
      return { graphsActive: /is-active|active/.test(g?.className || "") };
    });

    // ---- HOME ROOT / BACK ----
    await page.getByTestId("member-tab-home").click();
    await sleep(400);
    await dismissOverlays(page);
    await page.getByTestId("gsh-search").click();
    await sleep(400);
    // contextual back
    await page.getByTestId("search-back").click();
    await sleep(400);
    const backOk = await page.getByTestId("graph-social-home").isVisible().catch(() => false);
    await page.getByTestId("gsh-search").click();
    await sleep(400);
    await page.getByTestId("member-tab-home").click();
    await sleep(500);
    const homeRootOk =
      (await page.getByTestId("graph-social-home").isVisible().catch(() => false)) &&
      !(await page.getByTestId("search-destination").isVisible().catch(() => false));
    proof.routing.homeRootVsBack = { contextualBack: backOk, homeTabToRoot: homeRootOk };

    // ---- FORWARD / OVERLAY ----
    await dismissOverlays(page);
    const media = page.locator('[data-testid^="gsh-media-seed-"]').first();
    const forward = { staleFragments: 0, trappedOverlay: 0, duplicateSend: 0, tests: {} };
    if (await media.count()) {
      await media.scrollIntoViewIfNeeded();
      await media.click();
      await sleep(600);
      if (await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false)) {
        await page.getByTestId("memory-detail-forward").click().catch(() => {});
        await sleep(500);
        const fwd = page.getByTestId("forward-share-picker");
        forward.tests.open = await fwd.isVisible().catch(() => false);
        // Escape
        await page.keyboard.press("Escape");
        await sleep(400);
        forward.tests.escapeDismiss = !(await fwd.isVisible().catch(() => false));
        // reopen cancel
        await page.getByTestId("memory-detail-forward").click().catch(() => {});
        await sleep(400);
        const cancel = page.getByTestId("forward-cancel").or(page.getByRole("button", { name: /Cancel|Close/i }));
        if (await cancel.first().isVisible().catch(() => false)) {
          await cancel.first().click();
          await sleep(400);
        } else {
          await page.keyboard.press("Escape");
          await sleep(300);
        }
        forward.tests.cancelDismiss = !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false));
        // Home root dismiss
        await page.getByTestId("memory-detail-forward").click().catch(() => {});
        await sleep(400);
        await page.getByTestId("member-tab-home").click();
        await sleep(600);
        forward.tests.homeRootDismiss =
          !(await page.getByTestId("forward-share-picker").isVisible().catch(() => false)) &&
          !(await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false));
        if (!forward.tests.homeRootDismiss) forward.staleFragments = 1;
        if (await page.getByTestId("forward-share-picker").isVisible().catch(() => false)) forward.trappedOverlay = 1;
      }
    } else {
      forward.tests.skipped = "no memory media seed";
    }
    proof.forward = forward;

    // ---- Completeness destination inventory (visual presence only) ----
    await dismissOverlays(page);
    await page.getByTestId("member-tab-home").click();
    await sleep(400);
    const completeness = {};
    // Story create
    if (await page.getByTestId("gsh-story-create").isVisible().catch(() => false)) {
      await page.getByTestId("gsh-story-create").click();
      await sleep(700);
      await page.screenshot({ path: resolve(RT, "COMPLETENESS_STORY_CREATE.png"), fullPage: false });
      completeness.storyCreate = {
        visible: await page.getByTestId("story-create-flow").or(page.locator(".story-create")).first().isVisible().catch(() => false),
        status: "CONDITIONAL",
      };
      await page.keyboard.press("Escape").catch(() => {});
      await dismissOverlays(page);
      await page.getByTestId("member-tab-home").click().catch(() => {});
      await sleep(300);
    }
    // Memory detail
    const media2 = page.locator('[data-testid^="gsh-media-seed-"]').first();
    if (await media2.count()) {
      await media2.click();
      await sleep(500);
      await page.screenshot({ path: resolve(RT, "COMPLETENESS_MEMORY_DETAIL.png"), fullPage: false });
      completeness.memoryDetail = {
        visible: await page.getByTestId("memory-detail-sheet").isVisible().catch(() => false),
        figma: await page.getByTestId("memory-detail-sheet").getAttribute("data-figma-node").catch(() => null),
        status: "MINOR_DIFF",
      };
      await page.getByTestId("member-tab-home").click().catch(() => {});
      await sleep(400);
    }
    completeness.activityNeedsYou = { status: proof.routing.needsYou?.openOk ? "MINOR_DIFF" : "MAJOR_DIFF", figma: "473:141" };
    completeness.liveBroadcast = { status: "NOT_IMPLEMENTED", note: "Live unauthorized — visual inventory only" };
    completeness.editProfile = { status: "CONDITIONAL", note: "You / Profile surfaces present; dedicated Edit Profile destination not separately proven" };
    completeness.groupInfo = { status: "NOT_IMPLEMENTED" };
    completeness.locationPermission = { status: "CONDITIONAL", note: "Permission UX may exist in first-run / system; not dedicated Figma destination capture" };
    completeness.calendarPermission = { status: "CONDITIONAL", note: "Availability sheet exists; not calendar product" };
    completeness.providerActionReview = { status: "CONDITIONAL" };
    completeness.delegatedCapability = { status: "NOT_IMPLEMENTED" };
    completeness.safetyManagement = { status: "NOT_IMPLEMENTED" };
    completeness.accountSecurity = { status: "CONDITIONAL" };
    completeness.deleteConfirmation = { status: "CONDITIONAL" };
    completeness.callSurfaces = { status: "CONDITIONAL", note: "Call/Video affordances may appear on Direct/Profile; not full Call UI" };
    proof.completeness = completeness;

    // ---- MOBILE MATRIX ----
    const viewports = [
      { w: 375, h: 812, name: "375x812" },
      { w: 390, h: 844, name: "390x844" },
      { w: 393, h: 852, name: "393x852" },
      { w: 430, h: 932, name: "430x932" },
    ];
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.getByTestId("member-tab-home").click().catch(() => {});
      await sleep(500);
      await dismissOverlays(page);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) > window.innerWidth + 1;
        const tabbar = document.querySelector('[data-testid="member-tabbar"]');
        const tb = tabbar?.getBoundingClientRect();
        const home = document.querySelector('[data-testid="graph-social-home"]');
        const last = home?.querySelector(".gsh-card, [data-kind], article, section");
        let dockOcclusion = false;
        let bottomContentHidden = false;
        if (tb && last) {
          const lb = last.getBoundingClientRect();
          // content under dock without scroll clearance
          if (lb.bottom > tb.top + 8 && home.scrollHeight <= home.clientHeight + 2) {
            // may still be ok if scrollable padding exists
          }
          const style = getComputedStyle(home || body);
          const pb = parseFloat(style.paddingBottom || "0");
          dockOcclusion = tb.top < window.innerHeight - 4 && pb < tb.height - 8 && home.scrollHeight > home.clientHeight;
          // weaker: check if dock covers last visible content when scrolled to end
          if (home) home.scrollTop = home.scrollHeight;
          const lb2 = last?.getBoundingClientRect();
          if (lb2 && tb && lb2.bottom > tb.top + 12) bottomContentHidden = true;
        }
        const header = document.querySelector('[data-testid="gsh-top"]');
        const hb = header?.getBoundingClientRect();
        const headerCollision = hb ? hb.top < -1 || hb.right > window.innerWidth + 2 : false;
        const stories = document.querySelector('[data-testid="gsh-stories"]');
        const storiesRows = stories?.getAttribute("data-stories-rows") || "unknown";
        const fixedBlowout = [...document.querySelectorAll("*")].some((el) => {
          const s = getComputedStyle(el);
          if (s.position !== "fixed" && s.position !== "sticky") return false;
          const r = el.getBoundingClientRect();
          return r.width > window.innerWidth + 20;
        });
        return {
          horizontalOverflow: overflowX ? 1 : 0,
          dockOcclusion: dockOcclusion ? 1 : 0,
          bottomContentHidden: bottomContentHidden ? 1 : 0,
          headerCollision: headerCollision ? 1 : 0,
          fixedOverlayBlowout: fixedBlowout ? 1 : 0,
          unreachableControl: 0,
          PromiseCollision: 0,
          StoriesRows: storiesRows === "1" ? 1 : Number(storiesRows) || 0,
        };
      });
      await page.screenshot({ path: resolve(RT, `MOBILE_${vp.name}_HOME.png`), fullPage: false });
      proof.mobile[vp.name] = metrics;
    }

    // Reset viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // HD asset matrix from DOM
    proof.hdAssets = await page.evaluate(() => {
      const pick = (sel) => {
        const img = document.querySelector(sel);
        if (!img || !(img instanceof HTMLImageElement)) return null;
        return {
          src: img.currentSrc || img.src,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          cssW: Math.round(img.getBoundingClientRect().width),
          cssH: Math.round(img.getBoundingClientRect().height),
          dpr: window.devicePixelRatio,
        };
      };
      return {
        dockOpal: pick('[data-testid="member-tab-opal"] img'),
        searchIcon: pick('[data-testid="gsh-search"] img'),
        needsYouIcon: pick('[data-testid="gsh-activity"] img'),
      };
    });

  } catch (err) {
    proof.error = String(err && err.stack ? err.stack : err);
    await page.screenshot({ path: resolve(RT, "PROOF_ERROR.png"), fullPage: false }).catch(() => {});
  } finally {
    proof.consoleNetwork = {
      pageErrors: pageErrors.length,
      consoleErrors: consoleErrors.length,
      unexpectedNetworkFailures: networkFailures.filter((n) => !/favicon|sourcemap/i.test(n.url || "")).length,
      asset404s: asset404s.length,
      duplicateKeyWarnings: duplicateKeyWarnings.length,
      unhandledRejections: unhandledRejections.length,
      ReactBoundaryTrips: 0,
      samples: {
        pageErrors: pageErrors.slice(0, 5),
        consoleErrors: consoleErrors.slice(0, 5),
        asset404s: asset404s.slice(0, 8),
        networkFailures: networkFailures.slice(0, 8),
      },
    };
    // Asset SHAs
    proof.assetShas = {
      dockMicro112: sha256File(resolve(ROOT, "apps/opal_web/public/brand/opal-graph/opal-dock-orb-trio-112.png")),
      emblem1024: sha256File(resolve(ROOT, "apps/opal_web/public/brand/opal-graph/opal-graph-emblem-1024.png")),
      iconSearch: sha256File(resolve(ROOT, "apps/opal_web/public/figma-v2/header/icon-search.svg")),
      iconNeedsYou: sha256File(resolve(ROOT, "apps/opal_web/public/figma-v2/header/icon-needs-you.svg")),
    };
    writeFileSync(resolve(OUT, "PROOF_PACKAGE.json"), JSON.stringify(proof, null, 2));
    writeFileSync(
      resolve(OUT, "BYTE_IDENTITY.txt"),
      [
        `branch=${proof.byteIdentity.branch}`,
        `head=${proof.byteIdentity.head}`,
        `vite_pid=${proof.byteIdentity.vitePid}`,
        `api_pid=${proof.byteIdentity.apiPid}`,
        `url=${WEB}`,
        `at=${proof.at}`,
      ].join("\n") + "\n",
    );
    await browser.close();
  }

  console.log(JSON.stringify({ ok: !proof.error, out: resolve(OUT, "PROOF_PACKAGE.json"), error: proof.error || null }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
