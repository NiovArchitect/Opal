#!/usr/bin/env node
/**
 * Repair #18 - SPLASH 1 REBUILD capture (founder order 2026-10-18
 * 13:48 PDT + composition refinement 13:59 PDT). Drives the REAL
 * served preview app (Mac opal-r18-preview mirror of muse/r18-splash)
 * in Chromium at 390x844:
 *  - STILLS: splash 1 both modes (the master composition, inset by
 *    the safe margin on the continuous night field), a second frame
 *    1.5s later (frame-diff = motion evidence), the entry frame into
 *    splash 2, a reduced-motion still, and the Center dock both
 *    modes (ambient living rings on the dock OrbMark).
 *  - VIDEOS: ~8s screen recordings of splash 1 in BOTH modes -
 *    rings in motion, then the Continue tap and the entry
 *    transition into splash 2. Stills cannot prove animation; the
 *    videos are this surface's rendered motion proof.
 *  - PROBES (manifest.json): stage margin containment (rings whole,
 *    never cropped: stage box inset from every screen edge), living
 *    layer presence + animation elements, splash root field color,
 *    dock living-ring containment inside the disc, build stamp.
 */
import fs from "node:fs";
import path from "node:path";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  launchBrowser,
  newAuthedContext,
  newAnonContext,
  entryUrl,
  VIEWPORT,
} from "./lib/browser.mjs";
import { probeHorizontalOverflow, probeClippedText } from "./lib/geometry.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });

const config = loadRenderedConfig(process.env);
const { sessions, seedInfo } = await provisionRenderedSessions(config);
const browser = await launchBrowser();
const manifest = {
  build_tag: config.buildTag,
  web: config.webBase,
  api: config.apiBase,
  seed: seedInfo ? { comm: seedInfo.comm.status, graph: seedInfo.graph.status } : null,
  surfaces: [],
};

const ENTRY = `${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1&opal_reset_first_run=1`;

async function splashProbes(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="c2-splash1"]');
    const stage = document.querySelector('[data-testid="c2-splash1-orb"]');
    const img = stage?.querySelector("img");
    const rings = stage?.querySelector('[data-orb-living-rings]');
    const wm = document.querySelector('[data-testid="c2-splash1-wordmark"]');
    const r = stage?.getBoundingClientRect();
    return {
      rootPresent: !!root,
      fieldAttr: root?.getAttribute("data-splash-field") ?? null,
      rootBg: root ? getComputedStyle(root).backgroundColor : null,
      enterOpalCount: root?.getAttribute("data-enter-opal-count") ?? null,
      imgSrc: img?.getAttribute("src") ?? null,
      imgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
      stageBox: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      margin: r
        ? {
            left: Math.round(r.left),
            right: Math.round(window.innerWidth - r.right),
            top: Math.round(r.top),
            contained: r.left >= 8 && window.innerWidth - r.right >= 8 && r.top >= 8 && r.right <= window.innerWidth,
          }
        : null,
      rings: rings
        ? {
            variant: rings.getAttribute("data-orb-living-rings"),
            motion: rings.getAttribute("data-motion"),
            animateMotion: rings.querySelectorAll("animateMotion").length,
            animateTransform: rings.querySelectorAll("animateTransform").length,
          }
        : null,
      lockupStacked: (() => {
        if (!r || !wm) return null;
        const w = wm.getBoundingClientRect();
        return { stacked: w.top >= r.bottom - 4, centerDeltaX: Math.round(Math.abs(r.left + r.width / 2 - (w.left + w.width / 2))) };
      })(),
      gitHeadFull: document.documentElement.getAttribute("data-git-head-full"),
    };
  });
}

// ---------- Splash stills + entry frame (anon, both modes) ----------
for (const mode of ["dark", "light"]) {
  const context = await newAnonContext(browser, mode, config);
  const page = await context.newPage();
  try {
    await page.goto(ENTRY, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1-orb"] img', { timeout: 30000 });
    await page.waitForTimeout(3000);
    const probes = await splashProbes(page);
    const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
    const clipped = await page.evaluate(probeClippedText, '[data-testid="c2-splash1"]').catch(() => null);
    manifest.surfaces.push({ label: "splash-1", mode, ...probes, docOverflow: overflow?.docOverflow ?? null, clippedCount: clipped?.clipped?.length ?? null });
    console.log(mode, "splash1:", JSON.stringify(probes));
    await page.screenshot({ path: path.join(OUT, `splash-1-${mode}.png`) });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `splash-1-${mode}-t2.png`) });
    const cont = page.locator('[data-testid="c2-splash1-continue"]');
    await cont.click();
    await page.waitForSelector('[data-testid="c2-splash2"]', { timeout: 30000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `splash-2-entry-${mode}.png`) });
    const s2 = await page.evaluate(() => ({
      enterButtons: [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Enter Opal").length,
    }));
    manifest.surfaces.push({ label: "splash-2-entry", mode, ...s2 });
    console.log(mode, "splash2 entry:", JSON.stringify(s2));
  } catch (e) {
    manifest.surfaces.push({ label: "splash", mode, failures: [String(e).slice(0, 300)] });
    console.log(mode, "ERROR", String(e).slice(0, 300));
  }
  await context.close();
}

// ---------- Motion videos (anon, both modes) ----------
for (const mode of ["dark", "light"]) {
  const videoDir = path.join(OUT, `video-${mode}`);
  fs.mkdirSync(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: mode,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
  await context.addInitScript((modeValue) => {
    try {
      localStorage.setItem("opal.appearance.theme.v1", modeValue);
    } catch { /* ignore */ }
  }, mode);
  const page = await context.newPage();
  try {
    await page.goto(ENTRY, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 });
    await page.waitForTimeout(5200); // rings living on splash 1
    await page.locator('[data-testid="c2-splash1-continue"]').click();
    await page.waitForSelector('[data-testid="c2-splash2"]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2600); // the entry transition + splash 2 settle
  } catch (e) {
    console.log(mode, "VIDEO ERROR", String(e).slice(0, 200));
  }
  await context.close(); // flushes the video
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  if (files.length) {
    fs.renameSync(path.join(videoDir, files[0]), path.join(OUT, `splash-1-motion-${mode}.webm`));
    fs.rmdirSync(videoDir);
    manifest.surfaces.push({ label: "splash-1-motion-video", mode, file: `splash-1-motion-${mode}.webm` });
    console.log(mode, "video saved");
  } else {
    manifest.surfaces.push({ label: "splash-1-motion-video", mode, failures: ["no webm produced"] });
  }
}

// ---------- Reduced motion still (dark) ----------
{
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("opal.appearance.theme.v1", "dark");
    } catch { /* ignore */ }
  });
  const page = await context.newPage();
  try {
    await page.goto(ENTRY, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 });
    await page.waitForTimeout(2500);
    const rings = await page.evaluate(() => {
      const el = document.querySelector('[data-orb-living-rings="hero"]');
      return el
        ? { motion: el.getAttribute("data-motion"), animateCount: el.querySelectorAll("animateMotion, animateTransform").length }
        : null;
    });
    manifest.surfaces.push({ label: "splash-1-reduced-motion", mode: "dark", rings });
    console.log("reduced-motion rings:", JSON.stringify(rings));
    await page.screenshot({ path: path.join(OUT, "splash-1-dark-reduced-motion.png") });
  } catch (e) {
    manifest.surfaces.push({ label: "splash-1-reduced-motion", mode: "dark", failures: [String(e).slice(0, 200)] });
  }
  await context.close();
}

// ---------- Dock stills (authed, both modes) ----------
for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(3000);
    const dock = await page.evaluate(() => {
      const disc = document.querySelector(".c2s-dock-center-disc");
      const rings = disc?.querySelector('[data-orb-living-rings="ambient"]');
      const d = disc?.getBoundingClientRect();
      const m = disc?.querySelector(".orb-dock-mark")?.getBoundingClientRect();
      return {
        discPresent: !!disc,
        rings: rings
          ? { motion: rings.getAttribute("data-motion"), animateMotion: rings.querySelectorAll("animateMotion").length, animateTransform: rings.querySelectorAll("animateTransform").length }
          : null,
        markInsideDisc: d && m ? m.left >= d.left && m.right <= d.right && m.top >= d.top && m.bottom <= d.bottom : null,
        markBox: m ? { w: Math.round(m.width), h: Math.round(m.height) } : null,
        discBox: d ? { w: Math.round(d.width), h: Math.round(d.height) } : null,
      };
    });
    manifest.surfaces.push({ label: "dock-center", mode, ...dock });
    console.log(mode, "dock:", JSON.stringify(dock));
    await page.screenshot({ path: path.join(OUT, `center-dock-${mode}.png`) });
    const discEl = page.locator(".c2s-dock-center-disc");
    if (await discEl.count()) {
      const box = await discEl.boundingBox();
      if (box) {
        await page.screenshot({
          path: path.join(OUT, `dock-closeup-${mode}.png`),
          clip: { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 30), width: box.width + 60, height: box.height + 60 },
        });
      }
    }
  } catch (e) {
    manifest.surfaces.push({ label: "dock-center", mode, failures: [String(e).slice(0, 300)] });
    console.log(mode, "DOCK ERROR", String(e).slice(0, 300));
  }
  await context.close();
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", OUT);
await browser.close();
