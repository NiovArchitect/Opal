/**
 * P0-05.12 B7 — objective runtime proof harness (HOLD).
 * Captures RUNTIME.png + PROOF.json paint/action matrices.
 * Figma PNGs expected under ./figma/ (downloaded separately).
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const FIGMA = join(OUT, "figma");
const RUNTIME = join(OUT, "runtime");
const OVERLAY = join(OUT, "overlay");
const DIFF = join(OUT, "diff");
for (const d of [FIGMA, RUNTIME, OVERLAY, DIFF]) mkdirSync(d, { recursive: true });

const SHA = process.env.OPAL_RUNTIME_SHA || "c9c5c92";
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;

function rgb(css) {
  const m = String(css || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  const h = (n) => Number(n).toString(16).padStart(2, "0");
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`.toUpperCase();
}

function sha256File(p) {
  if (!existsSync(p)) return null;
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function makeOverlayDiff(figPath, runPath, key) {
  if (!existsSync(figPath) || !existsSync(runPath)) {
    return { overlay: false, diff: false, reason: "missing_pair" };
  }
  try {
    const a = PNG.sync.read(readFileSync(figPath));
    const b = PNG.sync.read(readFileSync(runPath));
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    const over = new PNG({ width: w, height: h });
    const diff = new PNG({ width: w, height: h });
    let changed = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (a.width * y + x) << 2;
        const j = (b.width * y + x) << 2;
        const k = (w * y + x) << 2;
        const ar = a.data[i], ag = a.data[i + 1], ab = a.data[i + 2];
        const br = b.data[j], bg = b.data[j + 1], bb = b.data[j + 2];
        over.data[k] = Math.round(ar * 0.5 + br * 0.5);
        over.data[k + 1] = Math.round(ag * 0.5 + bg * 0.5);
        over.data[k + 2] = Math.round(ab * 0.5 + bb * 0.5);
        over.data[k + 3] = 255;
        const dr = Math.abs(ar - br);
        const dg = Math.abs(ag - bg);
        const db = Math.abs(ab - bb);
        const hot = dr + dg + db > 60;
        if (hot) changed++;
        diff.data[k] = hot ? 255 : 0;
        diff.data[k + 1] = 0;
        diff.data[k + 2] = hot ? 0 : 0;
        diff.data[k + 3] = 255;
      }
    }
    writeFileSync(join(OVERLAY, `${key}_OVERLAY.png`), PNG.sync.write(over));
    writeFileSync(join(DIFF, `${key}_DIFF.png`), PNG.sync.write(diff));
    return {
      overlay: true,
      diff: true,
      changedPixels: changed,
      totalPixels: w * h,
      changeRatio: Number((changed / (w * h)).toFixed(4)),
    };
  } catch (e) {
    return { overlay: false, diff: false, reason: String(e.message || e) };
  }
}

async function reachMemberHome(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(700);
  if (await page.locator('[data-testid="fr00-tap-begin"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="fr00-tap-begin"]').click();
    await page.waitForSelector('[data-testid="opal-promise-enter"]', { timeout: 12000 });
    await page.locator('[data-testid="opal-promise-enter"]').click();
    await page.waitForSelector('[data-testid="fr06-skip-for-now"]', { timeout: 15000 });
    await page.locator('[data-testid="fr06-skip-for-now"]').click();
    await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 40000 });
    const name = page.locator('[data-testid="fr08-profile"] input').first();
    if (await name.isVisible().catch(() => false)) await name.fill("Founder");
    await page
      .locator('[data-testid="fr08-continue"], [data-testid="fr08-profile"] button.primary')
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(700);
    const notNow = page.getByRole("button", { name: /Not now|Skip|Continue/i }).first();
    if (await notNow.isVisible().catch(() => false)) await notNow.click();
  }
  await page.waitForSelector('[data-testid="member-tab-home"], [data-testid="graph-social-home"]', {
    timeout: 30000,
  });
  if (await page.locator('[data-testid="member-tab-home"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="member-tab-home"]').click();
  }
  await page.waitForTimeout(600);
}

const report = {
  checkpoint: SHA,
  startedAt: new Date().toISOString(),
  screens: {},
  e2e: {},
  mobile: {},
  assets: {},
  consoleErrors: [],
  networkFails: [],
  gates: {},
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 240));
});
page.on("pageerror", (e) => report.consoleErrors.push(String(e.message || e).slice(0, 240)));
page.on("response", (r) => {
  if (r.status() >= 400 && /127\.0\.0\.1:(5173|4000)/.test(r.url())) {
    report.networkFails.push({ url: r.url().slice(0, 160), status: r.status() });
  }
});

try {
  await reachMemberHome(page);

  // —— HOME ——
  await page.screenshot({ path: join(RUNTIME, "HOME_618_44.png"), fullPage: true });
  const home = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-testid="gsh-timeline-seed-jordan-market"] .gsh-gr-node')].map(
      (n) => ({
        time: n.querySelector(".gsh-gr-time")?.textContent,
        timeColor: getComputedStyle(n.querySelector(".gsh-gr-time")).color,
        dot: getComputedStyle(n.querySelector(".gsh-gr-dot")).backgroundColor,
        dotW: n.querySelector(".gsh-gr-dot")?.getBoundingClientRect().width,
      }),
    );
    const live = document.querySelector('[data-figma-node="618:211"]');
    const blank = [...document.querySelectorAll(".gsh-card-media img")].filter((i) => !i.naturalWidth).length;
    return {
      owner: !!document.querySelector('[data-testid="graph-social-home"], .gsh-feed'),
      nodes,
      liveBorder: live ? getComputedStyle(live).borderColor : null,
      liveBg: live ? getComputedStyle(live).backgroundColor : null,
      openLive: live ? getComputedStyle(live.querySelector(".gsh-open-live")).color : null,
      badge: live ? getComputedStyle(live.querySelector(".gsh-video-live") || document.body).backgroundImage : null,
      blankMedia: blank,
      dockActive: document.querySelector('[data-testid="member-tab-home"]')?.className || null,
    };
  });
  home.nodes = (home.nodes || []).map((n) => ({
    ...n,
    timeHex: rgb(n.timeColor),
    dotHex: rgb(n.dot),
  }));
  home.liveBorderHex = rgb(home.liveBorder);
  home.liveBgHex = rgb(home.liveBg);
  home.openLiveHex = rgb(home.openLive);
  report.screens.home = home;
  report.screens.home.overlay = makeOverlayDiff(
    join(FIGMA, "HOME_618_44.png"),
    join(RUNTIME, "HOME_618_44.png"),
    "HOME_618_44",
  );

  // Open Live → 863:2
  const openLiveBtn = page.locator('[data-testid="gsh-cta-seed-live-sabrina"]').first();
  if (await openLiveBtn.isVisible().catch(() => false)) {
    await openLiveBtn.click();
    await page.waitForSelector('[data-testid="full-live-destination"]', { timeout: 10000 });
    await page.screenshot({ path: join(RUNTIME, "FULL_LIVE_863_2.png"), fullPage: true });
    report.e2e.openLive = await page.evaluate(() => ({
      dest: !!document.querySelector('[data-testid="full-live-destination"][data-figma-node="863:2"]'),
      panel: document.querySelector("[data-testid=\"graph-live-panel\"]")?.getAttribute("data-figma-live"),
      hostNeBroadcaster:
        document.querySelector("[data-testid=\"graph-live-panel\"]")?.getAttribute("data-host-ne-broadcaster") ===
        "true",
      seed: document.querySelector("[data-testid=\"glive-seed-label\"]")?.textContent || null,
      text: document.body.innerText.slice(0, 400),
    }));
    report.screens.fullLive = {
      ...report.e2e.openLive,
      overlay: makeOverlayDiff(
        join(FIGMA, "FULL_LIVE_863_2.png"),
        join(RUNTIME, "FULL_LIVE_863_2.png"),
        "FULL_LIVE_863_2",
      ),
    };
    await page.locator('[data-testid="full-live-back"]').click().catch(() => {});
    await page.waitForTimeout(400);
  } else {
    report.e2e.openLive = { dest: false, reason: "cta_missing" };
  }

  // —— CHATS ——
  await page.locator('[data-testid="member-tab-chats"]').click();
  await page.waitForSelector('[data-testid="chats-home"]', { timeout: 10000 });
  await page.screenshot({ path: join(RUNTIME, "CHATS_618_271.png"), fullPage: true });
  report.screens.chats = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="chats-home"]');
    const search = document.querySelector('[data-testid="chats-home-search"]');
    const row = document.querySelector('[data-testid^="chats-row-"]');
    return {
      owner: root?.getAttribute("data-figma") || root?.getAttribute("data-figma-authority"),
      screenBg: getComputedStyle(root).backgroundColor,
      searchBg: search ? getComputedStyle(search).backgroundColor : null,
      searchBorder: search ? getComputedStyle(search).borderColor : null,
      rowBg: row ? getComputedStyle(row).backgroundColor : null,
      rowBorder: row ? getComputedStyle(row).borderColor : null,
      dock: document.querySelector('[data-testid="member-tab-chats"]')?.className || null,
    };
  });
  Object.assign(report.screens.chats, {
    screenHex: rgb(report.screens.chats.screenBg),
    searchBgHex: rgb(report.screens.chats.searchBg),
    searchBorderHex: rgb(report.screens.chats.searchBorder),
    rowBgHex: rgb(report.screens.chats.rowBg),
    rowBorderHex: rgb(report.screens.chats.rowBorder),
    overlay: makeOverlayDiff(
      join(FIGMA, "CHATS_618_271.png"),
      join(RUNTIME, "CHATS_618_271.png"),
      "CHATS_618_271",
    ),
  });

  // New+ → Search PEOPLE
  await page.locator('[data-testid="chats-home-new"]').click();
  await page.waitForSelector('[data-testid="search-destination"]', { timeout: 8000 });
  report.e2e.chatsNew = await page.evaluate(() => ({
    node: document.querySelector('[data-testid="search-destination"]')?.getAttribute("data-figma-node"),
    mode: document.querySelector('[data-testid="search-destination"]')?.getAttribute("data-search-mode"),
    context: document.querySelector('[data-testid="search-destination"]')?.getAttribute("data-search-context"),
    peoplePillOn: document.querySelector('[data-testid="search-pill-people"]')?.classList.contains("is-on"),
  }));
  await page.locator('[data-testid="search-back"]').click();
  await page.waitForSelector('[data-testid="chats-home"]', { timeout: 8000 });
  report.e2e.chatsNew.backToChats = await page.locator('[data-testid="chats-home"]').isVisible();

  // —— GRAPHS ——
  await page.locator('[data-testid="member-tab-graphs"]').click();
  await page.waitForSelector('[data-testid="graphs-home"]', { timeout: 10000 });
  await page.screenshot({ path: join(RUNTIME, "GRAPHS_618_674.png"), fullPage: true });
  report.screens.graphs = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="graphs-home"]');
    const text = root?.innerText || "";
    const lenses = [...document.querySelectorAll('[data-testid^="graphs-lens-"]')].map((el) => ({
      id: el.getAttribute("data-testid"),
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
      border: getComputedStyle(el).borderColor,
      on: el.classList.contains("is-on") || el.getAttribute("aria-pressed") === "true",
    }));
    const statuses = [...document.querySelectorAll("[data-graph-status], .graphs-status, [data-status]")].map(
      (el) => ({
        status: el.getAttribute("data-graph-status") || el.getAttribute("data-status"),
        color: getComputedStyle(el).color,
        text: el.textContent?.trim().slice(0, 40),
      }),
    );
    return {
      owner: root?.getAttribute("data-figma") || root?.getAttribute("data-figma-node"),
      hasYourGraphs: /Your Graphs/i.test(text),
      hasTakingShape: /What is taking shape/i.test(text),
      hasCreate: !!document.querySelector('[data-testid="graphs-create"]'),
      hasJuniper: /Juniper/i.test(text),
      hasMexico: /Mexico City/i.test(text),
      hasFamily: /Family Saturday/i.test(text),
      hasRooftop: /Rooftop Jazz/i.test(text),
      noSubstitutePrimary: !/^Signal\b/m.test(text.split("\n")[0] || ""),
      lenses,
      statuses,
    };
  });
  report.screens.graphs.lenses = (report.screens.graphs.lenses || []).map((l) => ({
    ...l,
    colorHex: rgb(l.color),
    bgHex: rgb(l.bg),
  }));
  report.screens.graphs.overlay = makeOverlayDiff(
    join(FIGMA, "GRAPHS_618_674.png"),
    join(RUNTIME, "GRAPHS_618_674.png"),
    "GRAPHS_618_674",
  );

  // Graph open → detail
  const graphCard = page.locator('[data-testid^="graphs-card-"], [data-testid^="graph-card-"], .graphs-card').first();
  if (await graphCard.isVisible().catch(() => false)) {
    await graphCard.click();
    await page.waitForTimeout(800);
    report.e2e.graphDetail = await page.evaluate(() => ({
      detail: !!document.querySelector('[data-testid="graph-detail-sheet"], [data-figma-node="618:758"]'),
      enterJourney: /Enter Journey/i.test(document.body.innerText),
      commitCta: /\bCommit\b/.test(document.body.innerText) && /Enter Journey|Commit \/ Enter/i.test(document.body.innerText),
      figma: document.querySelector("[data-figma-node=\"618:758\"]")?.getAttribute("data-figma-node"),
    }));
    const back = page.locator('[data-testid="graph-detail-back"], .opal-nav-chevron').first();
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForTimeout(400);
    report.e2e.graphDetail.backToGraphs = await page.locator('[data-testid="graphs-home"]').isVisible();
  }

  // Create+
  if (await page.locator('[data-testid="graphs-create"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="graphs-create"]').click();
    await page.waitForTimeout(800);
    report.e2e.graphCreate = await page.evaluate(() => ({
      create: document.querySelector("[data-figma-node=\"863:284\"], [data-testid=\"graph-create\"]")?.getAttribute(
        "data-figma-node",
      ),
      visible: !!document.querySelector('[data-testid="graph-create"], [data-figma-node="863:284"]'),
      text: document.body.innerText.slice(0, 240),
    }));
    await page.screenshot({ path: join(RUNTIME, "GRAPH_CREATE_863_284.png"), fullPage: true });
    // Try continue to add step if candidate exists
    const cont = page.locator('[data-testid="graph-create-continue"], button:has-text("Continue"), button:has-text("Next")').first();
    if (await cont.isVisible().catch(() => false)) {
      await cont.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    const lib = page.locator('[data-testid="graph-create-library"], button:has-text("Library"), button:has-text("Choose")').first();
    if (await lib.isVisible().catch(() => false)) await lib.click().catch(() => {});
    await page.waitForTimeout(500);
    report.e2e.graphCreate.addStep = await page.evaluate(() => ({
      add: document.querySelector("[data-figma-node=\"863:338\"]")?.getAttribute("data-figma-node"),
      visible: !!document.querySelector('[data-figma-node="863:338"]'),
    }));
    await page.screenshot({ path: join(RUNTIME, "GRAPH_ADD_863_338.png"), fullPage: true }).catch(() => {});
    const close = page.locator('[data-testid="graph-create-back"], [data-testid="graph-create-close"], .opal-nav-chevron').first();
    if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
    // Escape overlay if still open
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
  }

  // —— GLOBAL OPAL ——
  await page.locator('[data-testid="member-tab-opal"]').click();
  await page.waitForSelector('[data-testid="opal-ambient-destination"], [data-testid="opal-ambient"]', {
    timeout: 10000,
  });
  await page.screenshot({ path: join(RUNTIME, "GLOBAL_OPAL_618_902.png"), fullPage: true });
  report.screens.globalOpal = await page.evaluate(() => {
    const dest = document.querySelector('[data-testid="opal-ambient-destination"], [data-opal-mount="full-screen"]');
    const ambient = document.querySelector('[data-testid="opal-ambient"], [data-figma="618:902"]');
    const text = document.body.innerText;
    const hiddenMember = getComputedStyle(document.querySelector('[data-testid="graphs-home"]') || document.body)
      .visibility;
    return {
      mount: dest?.getAttribute("data-opal-mount") || (dest ? "present" : null),
      figma: ambient?.getAttribute("data-figma") || ambient?.getAttribute("data-figma-authority"),
      fullScreen: !!dest,
      hasPeople: /People/i.test(text),
      hasPlaces: /Places/i.test(text),
      hasVibe: /Vibe/i.test(text),
      hasBudget: /Budget/i.test(text),
      hasDateIdeas: /Date ideas/i.test(text),
      hasRefine: /Refine/i.test(text),
      composer: !!document.querySelector('[data-testid="opal-query"]'),
      graphsVisibleThrough: hiddenMember !== "hidden" && !!document.querySelector('[data-testid="graphs-home"]:not([hidden])'),
    };
  });
  report.screens.globalOpal.overlay = makeOverlayDiff(
    join(FIGMA, "GLOBAL_OPAL_618_902.png"),
    join(RUNTIME, "GLOBAL_OPAL_618_902.png"),
    "GLOBAL_OPAL_618_902",
  );
  // close opal
  const closeOpal = page.locator('[data-testid="opal-ambient-close"], [data-testid="member-tab-opal"]').first();
  await closeOpal.click().catch(() => {});
  await page.waitForTimeout(400);

  // —— YOU + Section 06 ——
  await page.locator('[data-testid="member-tab-you"]').click();
  await page.waitForSelector('[data-testid="you-hub-pane"], .you-hub', { timeout: 10000 });
  await page.screenshot({ path: join(RUNTIME, "YOU_618_1344.png"), fullPage: true });
  report.screens.you = await page.evaluate(() => {
    const rows = ["location-travel", "engagement", "calls-assist", "spending-fit"].map((k) => {
      const el = document.querySelector(`[data-testid="you-hub-row-${k}"]`);
      const strong = el?.querySelector("strong");
      return {
        key: k,
        semantic: el?.getAttribute("data-semantic"),
        color: strong ? getComputedStyle(strong).color : null,
      };
    });
    return {
      youActive: (document.querySelector('[data-testid="member-tab-you"]')?.className || "").includes("is-active") ||
        document.querySelector('[data-nav-active="you"], [data-testid="you-hub-pane"]') != null,
      homeInactive: !(document.querySelector('[data-testid="member-tab-home"]')?.className || "").includes("is-active"),
      rows: rows.map((r) => ({ ...r, hex: null })),
    };
  });
  report.screens.you.rows = report.screens.you.rows.map((r) => ({ ...r, hex: rgb(r.color) }));

  const settingsProbe = {};
  for (const key of [
    "privacy",
    "location-travel",
    "spending-fit",
    "notifications",
    "safety",
    "delete-account",
  ]) {
    const row = page.locator(`[data-testid="you-hub-row-${key === "delete-account" ? "account-security" : key}"]`).first();
    if (!(await row.isVisible().catch(() => false))) continue;
    await row.click();
    await page.waitForTimeout(500);
    if (key === "delete-account") {
      const del = page.locator('[data-testid="you-setting-row-delete"], button:has-text("Delete")').first();
      if (await del.isVisible().catch(() => false)) await del.click();
      await page.waitForTimeout(400);
    }
    const shotKey = `SETTING_${key}`;
    await page.screenshot({ path: join(RUNTIME, `${shotKey}.png`), fullPage: true }).catch(() => {});
    settingsProbe[key] = await page.evaluate(() => {
      const root = document.querySelector(".you-settings-dest");
      const note = document.querySelector(".you-settings-note");
      return {
        figma: root?.getAttribute("data-figma-node"),
        semantic: root?.getAttribute("data-semantic"),
        nav: root?.getAttribute("data-nav-active"),
        noteColor: note ? getComputedStyle(note).color : null,
        title: document.querySelector(".you-settings-title")?.textContent || null,
      };
    });
    settingsProbe[key].noteHex = rgb(settingsProbe[key].noteColor);
    await page.locator('[data-testid="you-setting-back"]').click().catch(() => {});
    await page.waitForTimeout(300);
    if (key === "delete-account") {
      await page.locator('[data-testid="you-setting-back"]').click().catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  report.screens.section06 = settingsProbe;

  // —— JOURNEY actions if journey surface reachable ——
  // Prefer Home Open Journey if present
  await page.locator('[data-testid="member-tab-home"]').click().catch(() => {});
  await page.waitForTimeout(500);
  const openJourney = page.locator('button:has-text("Open Journey"), [data-testid*="open-journey"]').first();
  if (await openJourney.isVisible().catch(() => false)) {
    await openJourney.click();
    await page.waitForTimeout(800);
  }
  report.e2e.journey = await page.evaluate(() => {
    const j = document.querySelector('[data-testid="journey-surface"], [data-figma-node="618:816"]');
    return {
      present: !!j,
      text: j ? j.innerText.slice(0, 300) : document.body.innerText.slice(0, 200),
      hasAdd: /Add people/i.test(document.body.innerText),
      hasManage: /Manage/i.test(document.body.innerText),
      hasCant: /can'?t make it/i.test(document.body.innerText),
    };
  });
  if (report.e2e.journey.present || report.e2e.journey.hasManage) {
    const manage = page.locator('button:has-text("Manage"), [data-testid*="journey-manage"]').first();
    if (await manage.isVisible().catch(() => false)) {
      await manage.click();
      await page.waitForTimeout(600);
      report.e2e.manage = await page.evaluate(() => ({
        node: document.querySelector("[data-figma-node=\"863:88\"]")?.getAttribute("data-figma-node"),
        text: document.body.innerText.slice(0, 280),
      }));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    const cant = page.locator('button:has-text("can\'t make it"), button:has-text("I can\'t make it")').first();
    if (await cant.isVisible().catch(() => false)) {
      await cant.click();
      await page.waitForTimeout(600);
      report.e2e.cant = await page.evaluate(() => ({
        node: document.querySelector("[data-figma-node=\"863:195\"]")?.getAttribute("data-figma-node"),
        text: document.body.innerText.slice(0, 280),
      }));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    const add = page.locator('button:has-text("Add people"), [data-testid*="journey-add"]').first();
    if (await add.isVisible().catch(() => false)) {
      await add.click();
      await page.waitForTimeout(600);
      report.e2e.addPeople = await page.evaluate(() => ({
        node: document.querySelector("[data-figma-node=\"863:394\"]")?.getAttribute("data-figma-node"),
        circular: !!document.querySelector(".journey-add-people, [data-testid=\"journey-add-people\"]"),
        text: document.body.innerText.slice(0, 240),
      }));
      await page.keyboard.press("Escape");
    }
  }

  // —— MOBILE MATRIX ——
  for (const w of [375, 390, 393, 430]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.locator('[data-testid="member-tab-home"]').click().catch(() => {});
    await page.waitForTimeout(400);
    report.mobile[w] = await page.evaluate((vw) => {
      const overflow = document.documentElement.scrollWidth > vw + 1;
      const dock = document.querySelector('[data-testid="member-tabbar"], .tabbar-option-b, .tabbar');
      const dockRect = dock?.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        overflowX: overflow,
        dockBottom: dockRect ? Math.round(dockRect.bottom) : null,
        dockHangoff: dockRect ? dockRect.right > vw + 2 || dockRect.left < -2 : null,
      };
    }, w);
    await page.screenshot({ path: join(RUNTIME, `MOBILE_${w}.png`) }).catch(() => {});
  }
  await page.setViewportSize({ width: 390, height: 844 });

  // —— ASSETS ——
  const assetRoots = [
    "apps/opal_web/public/figma-v2/home-201/media-live-city-1728.png",
    "apps/opal_web/public/figma-v2/home-201/media-memory-friends-1728.png",
    "apps/opal_web/public/figma-v2/home-201/media-travel-carousel-1728.png",
    "apps/opal_web/public/figma-v2/home-201/media-maya.png",
    "apps/opal_web/public/figma-v2/home-201/media-juniper.png",
    "apps/opal_web/public/brand/opal-graph/opal-center-opal-645-3-rest-512.png",
  ];
  const repo = join(__dirname, "../../..");
  for (const rel of assetRoots) {
    const abs = join(repo, rel);
    const st = existsSync(abs) ? statSync(abs) : null;
    report.assets[rel] = {
      exists: !!st,
      bytes: st?.size || 0,
      sha256: sha256File(abs),
    };
  }
} catch (e) {
  report.fatal = String(e.stack || e);
} finally {
  await browser.close();
}

// —— GATES ——
const h = report.screens.home || {};
const timelineOk =
  Array.isArray(h.nodes) &&
  h.nodes.length === 4 &&
  h.nodes[0]?.timeHex === "#00E5FF" &&
  h.nodes[1]?.timeHex === "#E8D6C4" &&
  h.nodes[2]?.timeHex === "#8B5CF6" &&
  h.nodes[3]?.timeHex === "#FFC86B" &&
  h.nodes.every((n) => Math.abs((n.dotW || 0) - 20) <= 2);

report.gates = {
  WAVE_A_FROZEN: true,
  HOME_TIMELINE: timelineOk,
  HOME_MEDIA: h.blankMedia === 0,
  HOME_LIVE_PAINT: h.openLiveHex === "#00E5FF" && /255,\s*200,\s*107/.test(h.liveBorder || ""),
  OPEN_LIVE_863_2: report.e2e.openLive?.dest === true && report.e2e.openLive?.panel === "863:2",
  CHATS_PAINT:
    report.screens.chats?.screenHex === "#050816" &&
    report.screens.chats?.searchBgHex === "#03060C" &&
    report.screens.chats?.rowBgHex === "#03060C",
  CHATS_NEW_PEOPLE:
    report.e2e.chatsNew?.node === "618:2299" &&
    (report.e2e.chatsNew?.mode === "people" || report.e2e.chatsNew?.peoplePillOn) &&
    report.e2e.chatsNew?.backToChats === true,
  GRAPHS_CONTENT:
    report.screens.graphs?.hasYourGraphs &&
    report.screens.graphs?.hasTakingShape &&
    report.screens.graphs?.hasJuniper &&
    report.screens.graphs?.hasMexico,
  GRAPH_CREATE_STAMP: report.e2e.graphCreate?.create === "863:284" || report.e2e.graphCreate?.visible === true,
  GLOBAL_OPAL_FULLSCREEN: report.screens.globalOpal?.fullScreen === true && report.screens.globalOpal?.figma === "618:902",
  SECTION06_NOTES:
    report.screens.section06?.privacy?.noteHex === "#8B5CF6" &&
    report.screens.section06?.["location-travel"]?.noteHex === "#00F0D1" &&
    report.screens.section06?.["spending-fit"]?.noteHex === "#FFC86B" &&
    report.screens.section06?.notifications?.noteHex === "#D946FF",
  YOU_SPARSE:
    report.screens.you?.rows?.find((r) => r.key === "location-travel")?.hex === "#00F0D1" &&
    report.screens.you?.rows?.find((r) => r.key === "engagement")?.hex === "#D946FF",
  MOBILE_NO_OVERFLOW: Object.values(report.mobile).every((m) => m && m.overflowX === false),
  ASSETS_EXIST: Object.values(report.assets).every((a) => a.exists && a.bytes > 1000),
  CONSOLE_CLEAN: report.consoleErrors.length === 0,
  NETWORK_OK: report.networkFails.length === 0,
};

const critical = [
  "HOME_TIMELINE",
  "HOME_MEDIA",
  "OPEN_LIVE_863_2",
  "CHATS_NEW_PEOPLE",
  "GRAPHS_CONTENT",
  "GLOBAL_OPAL_FULLSCREEN",
  "SECTION06_NOTES",
  "YOU_SPARSE",
  "MOBILE_NO_OVERFLOW",
  "ASSETS_EXIST",
];
report.gates.CRITICAL_ALL_GREEN = critical.every((k) => report.gates[k] === true);
report.gates.FOUNDER_WALK_READY = false; // set by go/no-go updater after full review
report.finishedAt = new Date().toISOString();

writeFileSync(join(OUT, "B7_PROOF.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ gates: report.gates, fatal: report.fatal || null, e2e: report.e2e }, null, 2));
process.exit(report.fatal ? 1 : 0);
