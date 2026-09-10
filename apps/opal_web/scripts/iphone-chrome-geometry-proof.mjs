/**
 * Founder correction #3 · 1114:2 compact float — computed dock + primary viewport geometry proof.
 * Mandatory matrix: 375×812 · 390×844 · 393×852 · 430×932
 *
 * Run: node scripts/iphone-chrome-geometry-proof.mjs
 * Requires: playwright (apps/opal_web)
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const cssPath = resolve(root, "src/styles.css");
const outDir = resolve(root, "../../docs/evidence/iphone-layout-2026-09-10");
const css = readFileSync(cssPath, "utf8");

const VIEWPORTS = [
  { width: 375, height: 812, safeTop: 44, safeBottom: 34 },
  { width: 390, height: 844, safeTop: 47, safeBottom: 34 },
  { width: 393, height: 852, safeTop: 59, safeBottom: 34 },
  { width: 430, height: 932, safeTop: 59, safeBottom: 34 },
];

function buildHtml(mode = "home") {
  const main =
    mode === "you"
      ? `<main class="pane">
      <div class="scroll profile-pane you-pane-254-340 you-pane-618-1344" data-testid="you-hub-pane">
        <header class="you-hub-header" data-testid="you-identity-header">
          <div class="you-hub-title-row"><h1 class="you-hub-title">You</h1></div>
        </header>
        <section class="you-hub-rows">
          <button class="you-hub-row" type="button"><span class="you-hub-row-copy"><strong>Privacy</strong><span>x</span></span></button>
          <button class="you-hub-row" type="button"><span class="you-hub-row-copy"><strong>Feed</strong><span>x</span></span></button>
          <button class="you-hub-row" type="button"><span class="you-hub-row-copy"><strong>Location</strong><span>x</span></span></button>
          <button class="you-hub-row" type="button"><span class="you-hub-row-copy"><strong>Engagement</strong><span>x</span></span></button>
          <button class="you-hub-row" type="button"><span class="you-hub-row-copy"><strong>Calls</strong><span>x</span></span></button>
          <button class="you-hub-row" type="button"><span class="you-hub-row-copy"><strong>Notifications</strong><span>x</span></span></button>
        </section>
      </div>
    </main>`
      : `<main class="pane">
      <div class="scroll gsh" data-testid="home-scroll">
        <div class="gsh-top gsh-top-spectral">
          <button class="gsh-profile-hit" type="button"><span class="gsh-profile-avatar">A</span></button>
          <div class="gsh-header-actions">
            <button class="gsh-header-hit" type="button">S</button>
            <button class="gsh-header-hit" type="button">N</button>
          </div>
        </div>
        <div class="gsh-feed">
          <article class="gsh-card" data-card="1" style="height:180px;margin:12px;background:#1a2338;border-radius:16px;"></article>
          <article class="gsh-card" data-card="2" style="height:180px;margin:12px;background:#1a2338;border-radius:16px;"></article>
          <article class="gsh-card" data-card="3" style="height:180px;margin:12px;background:#1a2338;border-radius:16px;"></article>
          <article class="gsh-card" data-card="4" style="height:180px;margin:12px;background:#1a2338;border-radius:16px;"></article>
        </div>
      </div>
    </main>`;

  // Home: no topbar (matches OpalApp tab==="home"). You: topbar present but must display:none.
  const topbar =
    mode === "you"
      ? `<header class="topbar glass" data-brand-chrome="mark">
      <div class="topbar-brand"><span class="topbar-brand-word">Opal<span class="is-graph"> Graph</span></span></div>
    </header>`
      : "";

  return `<!doctype html>
<html class="opal-native-host">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<style>
${css}
html.opal-native-host {
  --opal-safe-top: var(--proof-safe-top, 47px);
  --opal-safe-bottom: var(--proof-safe-bottom, 34px);
}
html, body, #root { margin:0; height:100%; background:#050816; }
.dock-icon { width:24px; height:24px; background:#919eb2; border-radius:4px; }
</style>
</head>
<body>
<div id="root">
  <div class="app" data-member-nav="true" style="height:100%;">
    ${topbar}
    ${main}
    <nav class="tabbar tabbar-option-b" data-testid="member-tabbar">
      <div class="dock-bar" aria-hidden>
        <div class="dock-bar-dip" style="background:rgba(8,17,29,0.96);border:1px solid #1E2B3F;border-radius:28px;width:100%;height:100%;"></div>
      </div>
      <div class="dock-slots">
        <button class="dock-tab is-active" data-dock-slot="home" type="button"><span class="dock-icon"></span><span class="dock-label">Home</span></button>
        <button class="dock-tab" data-dock-slot="chats" type="button"><span class="dock-icon"></span><span class="dock-label">Chats</span></button>
        <button class="dock-opal is-rest" type="button"><span class="dock-opal-mark" style="display:block;width:100%;height:100%;background:#6ee8f5;border-radius:50%;"></span></button>
        <button class="dock-tab" data-dock-slot="graphs" type="button"><span class="dock-icon"></span><span class="dock-label">Graphs</span></button>
        <button class="dock-tab" data-dock-slot="you" type="button"><span class="dock-icon"></span><span class="dock-label">You</span></button>
      </div>
    </nav>
  </div>
</div>
</body>
</html>`;
}

function round(n) {
  return Math.round(n * 10) / 10;
}

async function measure(page, vp, mode = "home") {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.setContent(buildHtml(mode), { waitUntil: "load" });
  await page.evaluate(({ safeTop, safeBottom }) => {
    document.documentElement.style.setProperty("--proof-safe-top", `${safeTop}px`);
    document.documentElement.style.setProperty("--proof-safe-bottom", `${safeBottom}px`);
    document.documentElement.style.setProperty("--opal-safe-top", `${safeTop}px`);
    document.documentElement.style.setProperty("--opal-safe-bottom", `${safeBottom}px`);
  }, vp);

  return page.evaluate((safeTop) => {
    const app = document.querySelector(".app");
    const scroll = document.querySelector(".gsh.scroll, .gsh, [data-testid='you-hub-pane']");
    const top = document.querySelector(".gsh-top, .you-hub-title");
    const avatar = document.querySelector(".gsh-profile-avatar, .you-hub-title");
    const dock = document.querySelector(".tabbar.tabbar-option-b");
    const bar = document.querySelector(".dock-bar");
    const label = document.querySelector(".dock-tab.is-active .dock-label, .dock-tab .dock-label");
    const orb = document.querySelector(".dock-opal");
    const topbar = document.querySelector(".topbar");

    const br = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };

    const dockR = br(dock);
    const barR = br(bar);
    const labelR = br(label);
    const scrollR = br(scroll);
    const topR = br(top);
    const avatarR = br(avatar);
    const orbR = br(orb);
    const cs = getComputedStyle(document.documentElement);
    const appCs = getComputedStyle(app);

    const labelInsideBar =
      labelR && barR
        ? labelR.top >= barR.top - 0.5 && labelR.bottom <= barR.bottom + 0.5
        : false;

    const contentBehindDock =
      scrollR && dockR ? Math.max(0, scrollR.bottom - dockR.top) : null;

    const interactiveTop = avatarR ? avatarR.top : topR?.top;
    const clearsSafeTop = interactiveTop != null ? interactiveTop >= safeTop - 0.5 : false;

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      tokens: {
        sideMargin: cs.getPropertyValue("--opal-dock-side-margin").trim(),
        baseHeight: cs.getPropertyValue("--opal-dock-base-height").trim(),
        gap: cs.getPropertyValue("--opal-dock-content-gap").trim(),
        inset: cs.getPropertyValue("--opal-primary-viewport-inset").trim(),
        trail: cs.getPropertyValue("--opal-scroll-trail-pad").trim(),
        safeTop: cs.getPropertyValue("--opal-safe-top").trim(),
        safeBottom: cs.getPropertyValue("--opal-safe-bottom").trim(),
      },
      appPaddingBottom: appCs.paddingBottom,
      topbarDisplay: topbar ? getComputedStyle(topbar).display : "absent",
      homeTop: topR,
      interactiveTop,
      clearsSafeTop,
      scroll: scrollR,
      dock: dockR,
      bar: barR,
      label: labelR,
      orb: orbR,
      labelInsideBar,
      contentBehindDock,
      dockLeftMargin: dockR ? dockR.left : null,
      dockRightMargin: dockR ? window.innerWidth - dockR.right : null,
      dockWidth: dockR ? dockR.width : null,
    };
  }, vp.safeTop);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];

for (const mode of ["home", "you"]) {
  for (const vp of VIEWPORTS) {
    const m = await measure(page, vp, mode);
    const expectedWidth = vp.width - 20;
    const leftOk = Math.abs((m.dockLeftMargin ?? -1) - 10) <= 1;
    const rightOk = Math.abs((m.dockRightMargin ?? -1) - 10) <= 1;
    const widthOk = Math.abs((m.dockWidth ?? -1) - expectedWidth) <= 1.5;
    const clipOk = (m.contentBehindDock ?? 99) <= 1;
    const labelOk = m.labelInsideBar === true;
    const safeOk = m.clearsSafeTop === true;
    const topbarOk =
      mode === "home"
        ? m.topbarDisplay === "absent"
        : m.topbarDisplay === "none";

    results.push({
      mode,
      viewport: `${vp.width}x${vp.height}`,
      expectedDockWidth: expectedWidth,
      measured: {
        left: round(m.dockLeftMargin),
        right: round(m.dockRightMargin),
        width: round(m.dockWidth),
        dockHeight: round(m.dock?.height),
        barTop: round(m.bar?.top),
        barBottom: round(m.bar?.bottom),
        labelTop: round(m.label?.top),
        labelBottom: round(m.label?.bottom),
        orbTop: round(m.orb?.top),
        scrollBottom: round(m.scroll?.bottom),
        dockTop: round(m.dock?.top),
        contentBehindDock: round(m.contentBehindDock),
        appPaddingBottom: m.appPaddingBottom,
        interactiveTop: round(m.interactiveTop),
        topbarDisplay: m.topbarDisplay,
        gapScrollToDock: round((m.dock?.top ?? 0) - (m.scroll?.bottom ?? 0)),
      },
      gates: {
        DOCK_LEFT_MARGIN: leftOk ? "GREEN" : "RED",
        DOCK_RIGHT_MARGIN: rightOk ? "GREEN" : "RED",
        DOCK_WIDTH: widthOk ? "GREEN" : "RED",
        LABEL_CONTAINMENT: labelOk ? "GREEN" : "RED",
        PRIMARY_SCROLL_CLIP: clipOk ? "GREEN" : "RED",
        SAFE_TOP_CLEAR: safeOk ? "GREEN" : "RED",
        TOPBAR_OWNER: topbarOk ? "GREEN" : "RED",
      },
      raw: m,
    });
  }
}

await browser.close();

mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "GEOMETRY_PROOF_CORRECTION_2.json");
writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

let failed = 0;
for (const r of results) {
  const bad = Object.entries(r.gates).filter(([, v]) => v !== "GREEN");
  const status = bad.length ? "RED" : "GREEN";
  if (bad.length) failed += 1;
  console.log(
    `${r.mode} ${r.viewport} ${status} width=${r.measured.width}/${r.expectedDockWidth} L=${r.measured.left} R=${r.measured.right} behind=${r.measured.contentBehindDock} gap=${r.measured.gapScrollToDock} safeTop=${r.measured.interactiveTop} topbar=${r.measured.topbarDisplay}`,
  );
  if (bad.length) console.log("  fail:", bad.map(([k]) => k).join(", "));
}
console.log(`\nWrote ${outPath}`);
console.log(failed === 0 ? "GEOMETRY_PROOF = GREEN" : `GEOMETRY_PROOF = RED (${failed} viewports)`);
process.exit(failed === 0 ? 0 : 1);
