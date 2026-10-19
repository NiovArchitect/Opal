#!/usr/bin/env node
/**
 * Repair #18 HARMONY2 - capture + probes for the surfaces this wave
 * changed: Center deck (fold clearance), Center chat (holding chips
 * mount), Graphs (goal picker mount), You hub + Soul/Memory section,
 * Search (human previews), Home (unchanged composition control), the
 * legacy Center composer (spectral border retirement, computed-style
 * probe), and the HA-A wide composition (1280px sidebar pair).
 * Icons are probed over HTTP (served bytes, not files).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright-core";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  newAuthedContext,
} from "./lib/browser.mjs";

/** The preview Mac's cached Chromium is headless-shell 1217 while
 * the suite's playwright-core 1.64 expects 1248 (its download did
 * not land); launch the cached shell explicitly - the same binary
 * the earlier waves' packs were captured with. */
async function launchBrowser() {
  const shellPath =
    process.env.HARMONY2_CHROMIUM ||
    `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-x64/chrome-headless-shell`;
  return chromium.launch({ headless: true, executablePath: shellPath });
}
import { probeHorizontalOverflow, probeClippedText } from "./lib/geometry.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });
const config = loadRenderedConfig(process.env);
const { sessions } = await provisionRenderedSessions(config);
const browser = await launchBrowser();
const manifest = {
  build_tag: config.buildTag,
  web: config.webBase,
  api: config.apiBase,
  surfaces: [],
  icons: [],
};

async function commonProbes(page, rootSel) {
  const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  const clipped = await page.evaluate(probeClippedText, rootSel).catch(() => null);
  return {
    docOverflow: overflow?.docOverflow ?? null,
    clippedCount: clipped?.clipped?.length ?? null,
    clippedSample: (clipped?.clipped ?? []).slice(0, 3).map((c) => c.text),
  };
}

for (const p of [
  "/favicon-32.png",
  "/brand/favicon-48.png",
  "/brand/opal-app-icon-180.png",
  "/brand/opal-app-icon-512.png",
  "/brand/orb/opal-orb-icon-1024.png",
]) {
  try {
    const res = await fetch(`${config.webBase}${p}`);
    const buf = Buffer.from(await res.arrayBuffer());
    manifest.icons.push({
      path: p,
      status: res.status,
      bytes: buf.length,
      png: buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
      md5: crypto.createHash("md5").update(buf).digest("hex").slice(0, 12),
    });
  } catch (e) {
    manifest.icons.push({ path: p, error: String(e) });
  }
}

for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(`${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(5000);
    const stamp = await page.evaluate(() =>
      document.documentElement.getAttribute("data-git-head-full"),
    );

    // Home (control surface)
    const homeBtn = page.locator('[data-testid="c2-dock-home"]');
    if (await homeBtn.count()) {
      await homeBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: path.join(OUT, `home-${mode}.png`) });
    manifest.surfaces.push({
      label: "home",
      mode,
      stamp,
      ...(await commonProbes(page, '[data-testid="c2-route-home"]')),
    });

    // Search (from Home)
    const searchBtn = page.locator('[data-testid="c2-home-search"]');
    let searchProbe = { opened: false };
    if (await searchBtn.count()) {
      await searchBtn.click();
      await page.waitForTimeout(1500);
      const input = page.locator('[data-testid="c2-search-input"]');
      if (await input.count()) {
        await input.fill("call");
        await page.waitForTimeout(1200);
        searchProbe = await page.evaluate(() => ({
          opened: true,
          rawCallPreviews: [...document.querySelectorAll('[data-testid="c2-search"] *')]
            .filter((e) => e.children.length === 0 && /call:[0-9a-f-]{8,}/.test(e.textContent || ""))
            .length,
        }));
        await page.screenshot({ path: path.join(OUT, `search-${mode}.png`) });
        const close = page.locator('[data-testid="c2-search"] [aria-label="Close search"]');
        if (await close.count()) await close.click();
        await page.waitForTimeout(800);
      }
    }
    manifest.surfaces.push({ label: "search", mode, stamp, ...searchProbe });

    // Center deck + fold probe
    const centerBtn = page.locator('[data-testid="c2-dock-center"]');
    if (await centerBtn.count()) {
      await centerBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: path.join(OUT, `center-deck-${mode}.png`) });
    const fold = await page.evaluate(async () => {
      const scroller = document.querySelector('[data-testid="c2-center-opening"]');
      const dock = document.querySelector('[data-testid="c2-dock"]');
      if (!scroller || !dock) return { ok: false, why: "missing scroller or dock" };
      scroller.scrollTop = scroller.scrollHeight;
      await new Promise((r) => setTimeout(r, 700));
      const sections = [...scroller.querySelectorAll("section")];
      const last = sections[sections.length - 1];
      const card = last ? last.querySelector(".c2s-card, [data-testid='c2-plan-card']") || last : null;
      const dockTop = dock.getBoundingClientRect().top;
      const cardBottom = card ? card.getBoundingClientRect().bottom : null;
      return {
        ok: cardBottom === null ? null : cardBottom <= dockTop + 1,
        cardBottom: cardBottom === null ? null : Math.round(cardBottom),
        dockTop: Math.round(dockTop),
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
      };
    }).catch((e) => ({ ok: false, why: String(e) }));
    await page.screenshot({ path: path.join(OUT, `center-deck-scrolled-${mode}.png`) });
    manifest.surfaces.push({
      label: "center-deck",
      mode,
      stamp,
      fold,
      ...(await commonProbes(page, '[data-testid="c2-center-opening"]')),
    });

    // Center chat (holding chips mount check - seed may carry none)
    const talk = page.locator('[data-testid="c2-opening-talk"]');
    let chatProbe = { opened: false, holdingChips: 0 };
    if (await talk.count()) {
      await talk.click();
      await page.waitForTimeout(3500);
      chatProbe = await page.evaluate(() => ({
        opened: Boolean(document.querySelector('[data-testid="center-chat"]')),
        holdingChips: document.querySelectorAll('[data-testid^="holding-chip-"]').length,
      })).catch(() => chatProbe);
      await page.screenshot({ path: path.join(OUT, `center-chat-${mode}.png`) });
      const back = page.locator('[data-testid="center-chat"] .c1-back');
      if (await back.count()) {
        await back.click();
        await page.waitForTimeout(1200);
      }
      const backToCenter = page.locator('[data-testid="c2-c1-back-to-center"]');
      if (await backToCenter.count()) {
        await backToCenter.click();
        await page.waitForTimeout(1200);
      }
    }
    manifest.surfaces.push({ label: "center-chat", mode, stamp, ...chatProbe });

    // Graphs + goals section
    const graphsBtn = page.locator('[data-testid="c2-dock-graphs"]');
    if (await graphsBtn.count()) {
      await graphsBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: path.join(OUT, `graphs-${mode}.png`) });
    const goals = page.locator('[data-testid="c2-graphs-goals"]');
    let goalsProbe = { present: false, pickers: 0 };
    if (await goals.count()) {
      await goals.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      goalsProbe = await page.evaluate(() => ({
        present: true,
        pickers: document.querySelectorAll('[data-testid^="c2-goal-picker-"]').length,
      }));
      await page.screenshot({ path: path.join(OUT, `graphs-goals-${mode}.png`) });
    }
    manifest.surfaces.push({
      label: "graphs",
      mode,
      stamp,
      goals: goalsProbe,
      ...(await commonProbes(page, '[data-testid="c2-graphs"]')),
    });

    // You hub + Soul/Memory section
    const youBtn = page.locator('[data-testid="c2-dock-you"]');
    if (await youBtn.count()) {
      await youBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: path.join(OUT, `you-${mode}.png`) });
    manifest.surfaces.push({
      label: "you",
      mode,
      stamp,
      ...(await commonProbes(page, '[data-testid="c2-you"]')),
    });
    const soulRow = page.locator('[data-testid="c2-you-row-soul-memory"]');
    if (await soulRow.count()) {
      await soulRow.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(OUT, `you-soul-memory-${mode}.png`) });
      manifest.surfaces.push({
        label: "you-soul-memory",
        mode,
        stamp,
        soulForm: await page.evaluate(() =>
          Boolean(document.querySelector('[data-testid="c2-soul-form"]')),
        ),
      });
    }
  } catch (e) {
    manifest.surfaces.push({ label: `phone-${mode}`, mode, error: String(e) });
  } finally {
    await context.close().catch(() => {});
  }

  // Legacy Center composer probe (?shell=r17): computed treatment of
  // the shared brand composer on the Center surface.
  const lctx = await newAuthedContext(browser, config, sessions.a, mode);
  const lpage = await lctx.newPage();
  try {
    await lpage.goto(
      `${config.webBase}/?shell=r17&opal_founder_seed=1&opal_native_host=1&opal_dev=1`,
      { waitUntil: "domcontentloaded", timeout: 90000 },
    );
    await lpage.waitForTimeout(6000);
    const composer = await lpage.evaluate(() => {
      const el = document.querySelector('[data-testid="composer"]');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        backgroundImage: cs.backgroundImage.slice(0, 160),
        backgroundColor: cs.backgroundColor,
        borderTopColor: cs.borderTopColor,
        boxShadow: cs.boxShadow.slice(0, 80),
      };
    }).catch(() => null);
    if (composer) {
      await lpage.screenshot({ path: path.join(OUT, `legacy-center-${mode}.png`) });
    }
    manifest.surfaces.push({ label: "legacy-center-composer", mode, composer });
  } catch (e) {
    manifest.surfaces.push({ label: "legacy-center-composer", mode, error: String(e) });
  } finally {
    await lctx.close().catch(() => {});
  }
}

// HA-A wide pair (1280x800)
for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(5000);
    const wide = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="c2-sidebar"]');
      const dock = document.querySelector('[data-testid="c2-dock"]');
      return {
        sidebarDisplay: sidebar ? getComputedStyle(sidebar).display : null,
        sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
        dockDisplay: dock ? getComputedStyle(dock).display : null,
      };
    });
    await page.screenshot({ path: path.join(OUT, `wide-home-${mode}.png`) });
    const youBtn = page.locator('[data-testid="c2-side-you"]');
    let youNav = { present: false };
    if (await youBtn.count()) {
      await youBtn.click();
      await page.waitForTimeout(3000);
      youNav = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="c2-you-nav"]');
        return {
          present: Boolean(nav),
          display: nav ? getComputedStyle(nav).display : null,
          rows: document.querySelectorAll('[data-testid^="c2-you-nav-row-"]').length,
        };
      });
      await page.screenshot({ path: path.join(OUT, `wide-you-${mode}.png`) });
    }
    manifest.surfaces.push({ label: "wide", mode, wide, youNav });
  } catch (e) {
    manifest.surfaces.push({ label: `wide-${mode}`, mode, error: String(e) });
  } finally {
    await context.close().catch(() => {});
  }
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
await browser.close();
