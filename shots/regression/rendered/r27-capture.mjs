#!/usr/bin/env node
/**
 * Repair #27 rendered capture - drives the REAL served C2 shell at
 * 390x844 in BOTH modes against the local frames stack, following
 * the bespoke-capture prior art (fullpack-capture.mjs) because the
 * R18 surface pass's predicates predate the C2 shell.
 *
 * Captures (charter proof set): flows first paint, place sheet,
 * chats list, the Chanelle-shaped thread, Create with photo
 * attach - plus a W27-1 inset variant (--opal-sat: 47px) of flows /
 * chats / thread / graphs with header-geometry probes.
 *
 * Per surface it records: screenshot, horizontal-overflow +
 * clipped-text probes, and content checks (greeting name, thread
 * duplicate-bubble count, place-sheet row titles). Output dir:
 * OPAL_RENDERED_OUT or rendered/<buildTag> under the rendered/
 * folder (this file is copied there at run time).
 */
import fs from "node:fs";
import path from "node:path";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  launchBrowser,
  newAuthedContext,
  entryUrl,
} from "./lib/browser.mjs";
import { probeHorizontalOverflow, probeClippedText } from "./lib/geometry.mjs";

const config = loadRenderedConfig(process.env);
const OUT = process.env.OPAL_RENDERED_OUT
  ? path.resolve(process.env.OPAL_RENDERED_OUT)
  : path.resolve("rendered", config.buildTag);
fs.mkdirSync(OUT, { recursive: true });

const { sessions, seedInfo } = await provisionRenderedSessions(config);
const manifest = {
  build_tag: config.buildTag,
  web: config.webBase,
  api: config.apiBase,
  seed: seedInfo ? { comm: seedInfo.comm.status, graph: seedInfo.graph.status } : null,
  viewer: { userId: sessions.a.userId, name: sessions.a.name ?? null },
  surfaces: [],
};
const save = () => fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
const log = (...a) => console.log(...a);

const browser = await launchBrowser();

async function openShell(mode, inset) {
  const ctx = await newAuthedContext(browser, config, sessions.a, mode);
  // The harness seeds the LEGACY theme key; the current boot reads
  // opal.c2.mode.v1 first (W27-16), so seed the current key too or
  // every "dark" capture silently renders light.
  await ctx.addInitScript((modeValue) => {
    try { localStorage.setItem("opal.c2.mode.v1", modeValue); } catch {}
  }, mode);
  if (inset) {
    await ctx.addInitScript(() => {
      const apply = () => {
        try {
          if (document.getElementById("r27-sat-override")) return;
          const st = document.createElement("style");
          st.id = "r27-sat-override";
          st.textContent = ":root { --opal-sat: 47px !important; }";
          (document.head || document.documentElement).appendChild(st);
        } catch {}
      };
      apply();
      document.addEventListener("DOMContentLoaded", apply);
    });
  }
  const page = await ctx.newPage();
  await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 45000 });
  await page.waitForTimeout(2200);
  return { ctx, page };
}

async function shoot(page, rec, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  rec.file = path.basename(file);
  rec.overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  rec.clipped = await page.evaluate(probeClippedText).catch(() => null);
  rec.headerTop = await page.evaluate(() => {
    const h = document.querySelector(".c2s-header");
    return h ? Math.round(h.getBoundingClientRect().top) : null;
  });
  rec.rootPadTop = await page.evaluate(() => {
    const r = document.querySelector(".c2s-root");
    return r ? getComputedStyle(r).paddingTop : null;
  });
  manifest.surfaces.push(rec);
  save();
  log("captured", name, "headerTop=", rec.headerTop);
}

async function tapDock(page, tab) {
  await page.locator(`[data-testid="c2-dock-${tab}"]`).first().click({ timeout: 8000 });
  await page.waitForTimeout(1600);
}

const MODES = (process.env.OPAL_MODES || "light,dark").split(",");
for (const mode of MODES) {
  for (const inset of [false, true]) {
    const tag = inset ? `inset47` : `base`;
    const { ctx, page } = await openShell(mode, inset);
    try {
      // CENTER opening (the app's landing surface) + greeting check
      const greeting = await page.evaluate(() => {
        const h = document.querySelector('[data-testid="c2-center-opening"] h1');
        return h?.textContent?.trim() ?? null;
      });
      await shoot(page, { id: "center", mode, tag, greeting }, `center-${mode}-${tag}`);

      // FLOWS (home): wait for the feed to actually populate
      // (W27-3: first paint must be brief + honest, then content)
      await tapDock(page, "home");
      const t0 = Date.now();
      const feedState = await page
        .waitForSelector('[data-testid="c2-feed-memory"], [data-testid="c2-place-stone"], [data-testid="c2-feed-live"], [data-testid="c2-feed-plan"]', { timeout: 25000 })
        .then(() => "populated")
        .catch(() => "still-loading");
      const feedMs = Date.now() - t0;
      let recovered = null;
      if (feedState !== "populated") {
        // The app's own recovery path; the FIRST attempt's state
        // stays on the record - a recovery never rewrites it.
        const retry = page.locator("button").filter({ hasText: "Try again" }).first();
        if (await retry.count()) {
          await retry.click().catch(() => {});
          recovered = await page
            .waitForSelector('[data-testid="c2-feed-memory"], [data-testid="c2-place-stone"], [data-testid="c2-feed-live"], [data-testid="c2-feed-plan"]', { timeout: 20000 })
            .then(() => "populated-after-retry")
            .catch(() => "still-loading-after-retry");
        }
      }
      await shoot(page, { id: "flows", mode, tag, feedState, feedMs, recovered }, `flows-${mode}-${tag}`);

      if (!inset) {
        // PLACE SHEET: hunt the first place stone, scrolling the feed
        let stone = page.locator('[data-testid="c2-place-stone"]').first();
        for (let i = 0; i < 6 && !(await stone.count()); i++) {
          await page.evaluate(() => {
            const sc = document.querySelector('[data-testid="c2-route-home"] .c2s-scroll') || document.querySelector(".c2s-scroll");
            if (sc) sc.scrollTop += 600;
          });
          await page.waitForTimeout(900);
          stone = page.locator('[data-testid="c2-place-stone"]').first();
        }
        if (await stone.count()) {
          await stone.scrollIntoViewIfNeeded().catch(() => {});
          await stone.click();
          await page.waitForTimeout(1800);
          const rows = await page.evaluate(() =>
            [...document.querySelectorAll('[class*="place-sheet"] [class*="card-title"], [class*="sheet"] [class*="plan-row"]')]
              .map((e) => e.textContent.trim())
              .slice(0, 10),
          );
          await shoot(page, { id: "place-sheet", mode, tag, rows }, `place-sheet-${mode}-${tag}`);
          // Close the sheet for real (X in the top layer, else
          // backdrop, else Escape) and verify it left the DOM -
          // an open sheet intercepts every later tap.
          const closeBtn = page.locator('[data-top-layer] button[aria-label*="close" i], [data-top-layer] button[aria-label*="Close" i]').first();
          if (await closeBtn.count()) await closeBtn.click().catch(() => {});
          if (await page.locator("[data-top-layer]").count()) {
            await page.mouse.click(195, 36).catch(() => {});
            await page.waitForTimeout(500);
          }
          if (await page.locator("[data-top-layer]").count()) {
            await page.keyboard.press("Escape").catch(() => {});
          }
          await page.waitForSelector("[data-top-layer]", { state: "detached", timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(400);
        } else {
          manifest.surfaces.push({ id: "place-sheet", mode, tag, missing: "no c2-place-stone in feed" });
          save();
        }
      }

      // CHATS LIST
      await tapDock(page, "chats");
      await shoot(page, { id: "chats", mode, tag }, `chats-${mode}-${tag}`);

      // THREAD: open the Chanelle conversation (seed world's thread)
      const row = page.locator("button, [role='button'], a").filter({ hasText: "Chanelle" }).first();
      if (await row.count()) {
        await row.click();
        await page.waitForTimeout(5000);
        const dup = await page.evaluate(() => {
          const els = [...document.querySelectorAll('[class*="bubble"], [class*="message"]')];
          const leaves = els.filter((e) => ![...e.children].some((c) => c.textContent.trim() === e.textContent.trim()));
          const texts = leaves.map((e) => e.textContent.trim()).filter((t) => t.length > 3 && t.length < 120);
          const counts = {};
          for (const b of texts) counts[b] = (counts[b] || 0) + 1;
          return Object.entries(counts).filter(([, n]) => n > 1).slice(0, 5);
        });
        const composerClear = await page.evaluate(() => {
          const ta = document.querySelector('[class*="composer"] textarea, [class*="composer"] input, input[placeholder^="Message"], textarea[placeholder^="Message"]');
          if (!ta) return null;
          const r = ta.getBoundingClientRect();
          const el = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
          return { bottom: Math.round(r.bottom), viewportH: window.innerHeight, hit: el === ta || ta.contains(el) };
        });
        await shoot(page, { id: "thread", mode, tag, dupBubbles: dup, composer: composerClear }, `thread-${mode}-${tag}`);
        const back = page.locator('[class*="back"], [aria-label*="Back"], [aria-label*="back"]').first();
        if (await back.count()) await back.click().catch(() => {});
        await page.waitForTimeout(800);
      } else {
        manifest.surfaces.push({ id: "thread", mode, tag, missing: "no Chanelle row in chats" });
        save();
      }

      if (!inset) {
        // CREATE with photo attach: center -> opening create
        await tapDock(page, "center");
        const createBtn = page.locator('[data-testid="c2-opening-create"]').first();
        if (await createBtn.count()) {
          await createBtn.click();
          await page.waitForTimeout(1600);
          const photo = page.locator('[data-testid="c2-create-photo"]').first();
          if (await photo.count()) await photo.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(500);
          const hasPhoto = (await photo.count()) > 0;
          await shoot(page, { id: "create", mode, tag, photoAttachPresent: hasPhoto }, `create-${mode}-${tag}`);
        } else {
          manifest.surfaces.push({ id: "create", mode, tag, missing: "no c2-opening-create" });
          save();
        }
      } else {
        // GRAPHS header under inset
        await tapDock(page, "graphs");
        await shoot(page, { id: "graphs", mode, tag }, `graphs-${mode}-${tag}`);
      }
    } finally {
      await ctx.close();
    }
  }
}

save();
await browser.close();
log("R27 CAPTURE DONE ->", OUT);
