#!/usr/bin/env node
/**
 * Repair #28 rendered capture - FULL-SURFACE audit pass.
 *
 * Method law (R28 charter, from the R27 lesson): no surface is
 * proven from source inspection. Every surface gets, at 390x844 in
 * BOTH modes against the served stack of THIS branch:
 *   - a top screenshot,
 *   - a SCROLL PROOF: the surface's scroll container is scrolled in
 *     steps to its true bottom; the record states scrollHeight,
 *     clientHeight, whether the bottom was reached, and whether
 *     the last content element's rect clears the dock,
 *   - a bottom screenshot,
 *   - a copy dump (visible innerText) for the copy read,
 *   - tap exercise of the surface's primary controls (recorded).
 * Key surfaces repeat in the simulated-inset (47px) context.
 *
 * ONE provisioning for the whole run (the founder-seed endpoint
 * throttles for hours under repeated provisioning).
 * Output: OPAL_RENDERED_OUT or rendered/<buildTag>.
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

/** The scroll proof, evaluated in-page. Finds the best scroll
 *  candidate inside (or equal to) the surface root, scrolls it to
 *  the true bottom in steps (letting lazy content settle), then
 *  measures bottom-reach and last-element dock clearance. */
async function scrollProof(page, rootSel) {
  return page.evaluate(async (rootSel) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const root = rootSel ? document.querySelector(rootSel) : document.body;
    if (!root) return { error: "root not found", rootSel };
    const dock = document.querySelector('[data-testid="c2-dock"], .c2s-dock, nav[class*="dock"]');
    const dockTop = dock ? Math.round(dock.getBoundingClientRect().top) : null;
    // Candidate scrollers: root + descendants with overflow-y auto/scroll
    const all = [root, ...root.querySelectorAll("*")];
    let best = null;
    for (const el of all) {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 4) {
        if (!best || el.scrollHeight - el.clientHeight > best.scrollHeight - best.clientHeight) best = el;
      }
    }
    let scroller = best || (root.scrollHeight > root.clientHeight + 4 ? root : null);
    if (!scroller) {
      // Portal surfaces (TopLayer destinations) scroll in an
      // ANCESTOR of the surface root, not inside it - climb.
      let anc = root.parentElement;
      while (anc && anc !== document.body) {
        const cs = getComputedStyle(anc);
        if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && anc.scrollHeight > anc.clientHeight + 4) {
          scroller = anc;
          break;
        }
        anc = anc.parentElement;
      }
    }
    if (!scroller) {
      // Nothing scrolls: does the content fit, or is it CLIPPED by a
      // non-scrolling container (the scroll-lock species)?
      const rootRect = root.getBoundingClientRect();
      let deepest = 0; let deepestEl = null;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.bottom > deepest && r.bottom < 100000) { deepest = r.bottom; deepestEl = el; }
      }
      return {
        scrollerFound: false,
        contentFits: deepest <= window.innerHeight + 1,
        deepestBottom: Math.round(deepest),
        deepestEl: deepestEl ? (deepestEl.className?.toString().slice(0, 80) || deepestEl.tagName) : null,
        dockTop,
        lastClearOfDock: dockTop == null ? null : deepest <= dockTop + 1,
        viewportH: window.innerHeight,
        rootRectBottom: Math.round(rootRect.bottom),
      };
    }
    const maxTop = scroller.scrollHeight - scroller.clientHeight;
    let steps = 0;
    for (let i = 0; i < 40 && scroller.scrollTop < maxTop - 1; i++) {
      scroller.scrollTop = Math.min(maxTop, scroller.scrollTop + Math.round(scroller.clientHeight * 0.8));
      steps++;
      await sleep(120);
    }
    scroller.scrollTop = maxTop;
    await sleep(250);
    const reachedBottom = scroller.scrollTop >= maxTop - 1;
    // Last content element: deepest last BLOCK descendant with a
    // box (SVG icons excluded - their rects can overshoot the card
    // they decorate and fake a dock collision).
    let last = null;
    const kids = scroller.querySelectorAll("*");
    for (let i = kids.length - 1; i >= 0; i--) {
      if (kids[i] instanceof SVGElement) continue;
      const r = kids[i].getBoundingClientRect();
      if (r.height > 0 && r.width > 0) { last = { rect: r, el: kids[i] }; break; }
    }
    const lastBottom = last ? Math.round(last.rect.bottom) : null;
    return {
      scrollerFound: true,
      scrollerClass: (scroller.className?.toString() || scroller.tagName).slice(0, 80),
      scrollerTestId: scroller.getAttribute("data-testid"),
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      maxScrollTop: maxTop,
      finalScrollTop: Math.round(scroller.scrollTop),
      steps,
      reachedBottom,
      dockTop,
      lastBottom,
      lastEl: last ? (last.el.className?.toString().slice(0, 80) || last.el.tagName) : null,
      lastClearOfDock: dockTop == null || lastBottom == null ? null : lastBottom <= dockTop + 1,
      viewportH: window.innerHeight,
    };
  }, rootSel).catch((e) => ({ error: String(e).slice(0, 200) }));
}

async function shoot(page, rec, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file }).catch(() => {});
  rec.file = path.basename(file);
  rec.overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  rec.clipped = await page.evaluate(probeClippedText).catch(() => null);
  rec.copy = await page.evaluate(() => (document.body?.innerText || "").slice(0, 6000)).catch(() => null);
  manifest.surfaces.push(rec);
  save();
  log("captured", name);
}

async function openShell(mode, inset) {
  const ctx = await newAuthedContext(browser, config, sessions.a, mode);
  await ctx.addInitScript((modeValue) => {
    try { localStorage.setItem("opal.c2.mode.v1", modeValue); } catch {}
  }, mode);
  if (inset) {
    await ctx.addInitScript(() => {
      const apply = () => {
        try {
          if (document.getElementById("r28-sat-override")) return;
          const st = document.createElement("style");
          st.id = "r28-sat-override";
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
  await page.waitForTimeout(2000);
  return { ctx, page };
}

async function tapDock(page, tab) {
  await page.locator(`[data-testid="c2-dock-${tab}"]`).first().click({ timeout: 8000 });
  await page.waitForTimeout(1500);
}

/** Close any top layer (sheet) and verify it left the DOM - an
 *  open sheet intercepts every later tap (R27 harness lesson,
 *  re-learned in R28 run 1). */
async function closeTopLayer(page) {
  if (!(await page.locator("[data-top-layer]").count())) return true;
  const closeBtn = page.locator('[data-top-layer] button[aria-label*="close" i], [data-top-layer] button[aria-label*="Close" i]').first();
  if (await closeBtn.count()) await closeBtn.click().catch(() => {});
  if (await page.locator("[data-top-layer]").count()) {
    await page.mouse.click(195, 36).catch(() => {});
    await page.waitForTimeout(400);
  }
  if (await page.locator("[data-top-layer]").count()) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
  }
  return (await page.locator("[data-top-layer]").count()) === 0;
}

async function scrollAndShoot(page, rec, name, rootSel) {
  await page.waitForTimeout(700); // settle before measuring
  rec.scroll = await scrollProof(page, rootSel);
  await shoot(page, rec, name);
}

const MODES = (process.env.OPAL_MODES || "light,dark").split(",");
for (const mode of MODES) {
  for (const inset of [false, true]) {
    const tag = inset ? "inset47" : "base";
    // Inset pass covers the scroll-critical surfaces only.
    const { ctx, page } = await openShell(mode, inset);
    try {
      // ---- CENTER ----
      await scrollAndShoot(page, { id: "center", mode, tag }, `center-${mode}-${tag}`, '[data-testid="c2-shell"]');

      // ---- FLOWS ----
      await tapDock(page, "home");
      await page.waitForSelector('[data-testid="c2-feed-memory"], [data-testid="c2-place-stone"], [data-testid="c2-feed-live"], [data-testid="c2-feed-plan"]', { timeout: 25000 }).catch(() => {});
      await shoot(page, { id: "flows-top", mode, tag }, `flows-${mode}-${tag}-top`);
      await scrollAndShoot(page, { id: "flows", mode, tag }, `flows-${mode}-${tag}-bottom`, '[data-testid="c2-route-home"]');

      if (!inset) {
        // ---- PLACE SHEET + COMMENTS ----
        const stone = page.locator('[data-testid="c2-place-stone"]').first();
        if (await stone.count()) {
          await stone.scrollIntoViewIfNeeded().catch(() => {});
          await stone.click();
          await page.waitForTimeout(1800);
          await scrollAndShoot(page, { id: "place-sheet", mode, tag }, `place-sheet-${mode}-${tag}`, "[data-top-layer]");
          await closeTopLayer(page);
          await page.waitForTimeout(400);
        } else {
          manifest.surfaces.push({ id: "place-sheet", mode, tag, missing: "no place stone in feed" }); save();
        }
        // comments: first comment glyph on a feed card
        const commentBtn = page.locator('[data-testid*="comment"], button[aria-label*="comment" i]').first();
        if (await commentBtn.count()) {
          await commentBtn.scrollIntoViewIfNeeded().catch(() => {});
          await commentBtn.click().catch(() => {});
          await page.waitForTimeout(1500);
          if (await page.locator("[data-top-layer]").count()) {
            await scrollAndShoot(page, { id: "comments-sheet", mode, tag }, `comments-${mode}-${tag}`, "[data-top-layer]");
            await closeTopLayer(page);
            await page.waitForTimeout(400);
          } else {
            manifest.surfaces.push({ id: "comments-sheet", mode, tag, missing: "glyph did not open a sheet" }); save();
          }
        } else {
          manifest.surfaces.push({ id: "comments-sheet", mode, tag, missing: "no comment control in feed" }); save();
        }
        // ---- STORY VIEWER ----
        try {
        const story = page.locator('[data-testid="c2-stone"]').first();
        if (await story.count()) {
          await story.scrollIntoViewIfNeeded().catch(() => {});
          await story.click().catch(() => {});
          await page.waitForTimeout(1800);
          await shoot(page, { id: "story-viewer", mode, tag }, `story-${mode}-${tag}`);
          const x = page.locator('[data-testid="c2-story-viewer-close"]').first();
          if (await x.count()) await x.click().catch(() => {});
          if (await page.locator('[data-testid="c2-story-viewer"]').count()) {
            await page.keyboard.press("Escape").catch(() => {});
          }
          await page.waitForTimeout(400);
        } else {
          manifest.surfaces.push({ id: "story-viewer", mode, tag, missing: "no story stone found" }); save();
        }
        } catch (e) {
          manifest.surfaces.push({ id: "story-viewer", mode, tag, error: String(e).slice(0, 160) }); save();
          await closeTopLayer(page).catch(() => {});
        }
        // ---- LIVE WATCH ----
        try {
        const live = page.locator('[data-testid="c2-feed-live"]').first();
        if (await live.count()) {
          await live.scrollIntoViewIfNeeded().catch(() => {});
          await live.click().catch(() => {});
          await page.waitForTimeout(1800);
          await scrollAndShoot(page, { id: "live-watch", mode, tag }, `live-${mode}-${tag}`, '[data-testid="c2-shell"]');
          const leave = page.locator('[data-testid="c2-live-watch-close"]').first();
          if (await leave.count()) await leave.click().catch(() => {});
          if (await page.locator('[data-testid="c2-live-watch"]').count()) {
            const back = page.locator('[aria-label*="Back"], [aria-label*="back"], [class*="back"]').first();
            if (await back.count()) await back.click().catch(() => {});
          }
          await page.waitForTimeout(600);
        } else {
          manifest.surfaces.push({ id: "live-watch", mode, tag, missing: "no live card in feed" }); save();
        }
        } catch (e) {
          manifest.surfaces.push({ id: "live-watch", mode, tag, error: String(e).slice(0, 160) }); save();
        }
      }

      // ---- CHATS LIST ----
      await tapDock(page, "chats");
      await shoot(page, { id: "chats-top", mode, tag }, `chats-${mode}-${tag}-top`);
      await scrollAndShoot(page, { id: "chats", mode, tag }, `chats-${mode}-${tag}-bottom`, '[data-testid="c2-shell"]');

      // ---- THREAD: Chanelle ----
      const crow = page.locator("button, [role='button'], a").filter({ hasText: "Chanelle" }).first();
      if (await crow.count()) {
        await crow.click();
        await page.waitForTimeout(4000);
        const hdr = await page.evaluate(() => {
          const h = document.querySelector('[class*="thread"] [class*="header"], [class*="chat-head"]');
          return h ? h.innerText.slice(0, 200) : null;
        });
        await shoot(page, { id: "thread-chanelle-top", mode, tag, header: hdr }, `thread-chanelle-${mode}-${tag}-top`);
        await scrollAndShoot(page, { id: "thread-chanelle", mode, tag }, `thread-chanelle-${mode}-${tag}-bottom`, '[data-testid="c2-shell"]');
        const back = page.locator('[class*="back"], [aria-label*="Back"], [aria-label*="back"]').first();
        if (await back.count()) await back.click().catch(() => {});
        await page.waitForTimeout(800);
      } else {
        manifest.surfaces.push({ id: "thread-chanelle", mode, tag, missing: "no Chanelle row" }); save();
      }

      {
        // ---- THREAD: Maya + CHECK-IN SHEET + BOND ----
        const mrow = page.locator("button, [role='button'], a").filter({ hasText: "Maya" }).first();
        if (await mrow.count()) {
          await mrow.click();
          await page.waitForTimeout(4000);
          const hdr = await page.evaluate(() => document.body.innerText.slice(0, 400)).catch(() => null);
          await shoot(page, { id: "thread-maya-top", mode, tag, headerSnip: hdr }, `thread-maya-${mode}-${tag}-top`);
          await scrollAndShoot(page, { id: "thread-maya", mode, tag }, `thread-maya-${mode}-${tag}-bottom`, '[data-testid="c2-shell"]');
          // W28-7 probe: after scrolling to the end, does the last
          // message bubble clear the composer, and does the thread
          // composer carry the mic affordance?
          const overlap = await page.evaluate(() => {
            const composer = document.querySelector('[class*="composer"], [data-testid*="composer"]');
            const msgs = [...document.querySelectorAll('[class*="bubble"], [class*="message-row"], [class*="msg"]')]
              .filter((el) => el.getBoundingClientRect().height > 0);
            const lastMsg = msgs[msgs.length - 1];
            const cTop = composer ? Math.round(composer.getBoundingClientRect().top) : null;
            const mBottom = lastMsg ? Math.round(lastMsg.getBoundingClientRect().bottom) : null;
            const mic = composer ? /mic|voice/i.test(composer.innerHTML) || Boolean(composer.querySelector('[aria-label*="mic" i], [aria-label*="voice" i]')) : null;
            return { composerTop: cTop, lastMsgBottom: mBottom, lastMsgClearsComposer: cTop == null || mBottom == null ? null : mBottom <= cTop + 1, composerHasMic: mic };
          }).catch(() => null);
          manifest.surfaces.push({ id: "thread-maya-composer", mode, tag, overlap });
          save();
          // check-in card -> sheet
          const ci = page.locator('[data-testid*="checkin"], [data-testid*="check-in"], [class*="checkin"], [class*="check-in"]').first();
          if (await ci.count()) {
            await ci.scrollIntoViewIfNeeded().catch(() => {});
            await ci.click().catch(() => {});
            await page.waitForTimeout(1500);
            const sheetTitle = await page.evaluate(() => {
              const s = document.querySelector("[data-top-layer], [role='dialog']");
              return s ? s.innerText.slice(0, 900) : null;
            });
            await scrollAndShoot(page, { id: "checkin-sheet", mode, tag, sheetText: sheetTitle }, `checkin-sheet-${mode}-${tag}`, "[data-top-layer], [role='dialog']");
            const close = page.locator("[data-top-layer] button, [role='dialog'] button").filter({ hasText: "Close" }).first();
            if (await close.count()) await close.click().catch(() => {});
            await closeTopLayer(page).catch(() => {});
            await page.waitForTimeout(500);
          } else {
            manifest.surfaces.push({ id: "checkin-sheet", mode, tag, missing: "no check-in card in Maya thread" }); save();
          }
          // bond/orbit: door 1 = thread header (name/avatar);
          // door 2 = the NEXT TOGETHER bar. Record which opened it.
          let bondDoor = null;
          const hdrBtn = page.locator('[class*="thread-head"] button, [class*="chat-head"] button, header button').filter({ hasText: "Maya" }).first();
          if (await hdrBtn.count()) {
            await hdrBtn.click().catch(() => {});
            await page.waitForTimeout(1500);
            if (await page.locator('[data-testid="c2-bond-stone"]').count()) bondDoor = "thread-header";
          }
          if (!bondDoor) {
            const nt = page.locator('[class*="next-together"], [data-testid*="next-together"], [class*="nextTogether"]').first();
            if (await nt.count()) {
              await nt.click().catch(() => {});
              await page.waitForTimeout(2000);
              if (await page.locator('[data-testid="c2-bond-stone"]').count()) bondDoor = "next-together-bar";
              else bondDoor = "bar-tapped-no-bond-surface";
            }
          }
          if (bondDoor && bondDoor !== "bar-tapped-no-bond-surface") {
            await scrollAndShoot(page, { id: "bond", mode, tag, door: bondDoor }, `bond-${mode}-${tag}`, '[data-testid="c2-bond-stone"]');
            const back2 = page.locator('[data-testid="c2-bond-close"], [data-testid="orbit-back-to-thread"], [class*="back"], [aria-label*="Back"]').first();
            if (await back2.count()) await back2.click().catch(() => {});
            await page.waitForTimeout(800);
          } else {
            manifest.surfaces.push({ id: "bond", mode, tag, missing: `bond surface not reached (door: ${bondDoor ?? "none found"})` }); save();
          }
          const back = page.locator('[class*="back"], [aria-label*="Back"], [aria-label*="back"]').first();
          if (await back.count()) await back.click().catch(() => {});
          await page.waitForTimeout(800);
        } else {
          manifest.surfaces.push({ id: "thread-maya", mode, tag, missing: "no Maya row" }); save();
        }
      }

      // ---- GRAPHS LIST (headline) ----
      await tapDock(page, "graphs");
      await page.waitForTimeout(1200);
      await shoot(page, { id: "graphs-top", mode, tag }, `graphs-${mode}-${tag}-top`);
      await scrollAndShoot(page, { id: "graphs", mode, tag }, `graphs-${mode}-${tag}-bottom`, '[data-testid="c2-graphs"]');

      // ---- GRAPH DETAIL ----
      {
        const card = page.locator('[data-testid="c2-graphs"] [class*="card"], [data-testid="c2-graph-card"]').first();
        // Prefer a real plan card button (Meetup if present)
        const meetup = page.locator("button, [role='button']").filter({ hasText: "Meetup" }).first();
        const target = (await meetup.count()) ? meetup : card;
        if (await target.count()) {
          await target.scrollIntoViewIfNeeded().catch(() => {});
          await target.click().catch(() => {});
          await page.waitForTimeout(2500);
          await shoot(page, { id: "graph-detail-top", mode, tag }, `graph-detail-${mode}-${tag}-top`);
          await scrollAndShoot(page, { id: "graph-detail", mode, tag }, `graph-detail-${mode}-${tag}-bottom`, '[data-testid="c2-graph-detail"]');
          const back = page.locator('[class*="back"], [aria-label*="Back"], [aria-label*="back"]').first();
          if (await back.count()) await back.click().catch(() => {});
          await page.waitForTimeout(800);
        } else {
          manifest.surfaces.push({ id: "graph-detail", mode, tag, missing: "no graph card" }); save();
        }

        // ---- CREATE (all tenses) ----
        await tapDock(page, "center");
        const createBtn = page.locator('[data-testid="c2-opening-create"]').first();
        if (await createBtn.count()) {
          await createBtn.click();
          await page.waitForTimeout(1600);
          await scrollAndShoot(page, { id: "create", mode, tag }, `create-${mode}-${tag}`, '[data-testid="c2-shell"]');
          for (const tense of ["Forecast", "Memories"]) {
            const t = page.locator("button").filter({ hasText: tense }).first();
            if (await t.count()) {
              await t.click().catch(() => {});
              await page.waitForTimeout(1200);
              await scrollAndShoot(page, { id: `create-${tense.toLowerCase()}`, mode, tag }, `create-${tense.toLowerCase()}-${mode}-${tag}`, '[data-testid="c2-shell"]');
            }
          }
          const x = page.locator('[data-testid*="create"] button[aria-label*="close" i], button[aria-label="Close"]').first();
          if (await x.count()) await x.click().catch(() => {});
          await page.keyboard.press("Escape").catch(() => {});
          await page.waitForTimeout(600);
        } else {
          manifest.surfaces.push({ id: "create", mode, tag, missing: "no opening create" }); save();
        }
      }

      // ---- YOU HUB + SETTINGS ROOMS ----
      await tapDock(page, "you");
      await page.waitForTimeout(1200);
      await shoot(page, { id: "you-top", mode, tag }, `you-${mode}-${tag}-top`);
      await scrollAndShoot(page, { id: "you", mode, tag }, `you-${mode}-${tag}-bottom`, '[data-testid="c2-shell"]');
      {
        // Every settings room, by its own row testid - no name guessing.
        const keys = await page.evaluate(() =>
          [...document.querySelectorAll('[data-testid^="c2-you-row-"]')].map((el) => el.getAttribute("data-testid")),
        ).catch(() => []);
        for (const k of keys ?? []) {
          const row = page.locator(`[data-testid="${k}"]`).first();
          if (!(await row.count())) continue;
          await row.scrollIntoViewIfNeeded().catch(() => {});
          await row.click().catch(() => {});
          await page.waitForTimeout(1400);
          const roomSel = '[data-testid^="c2-settings-"]';
          if (await page.locator(roomSel).first().count()) {
            await scrollAndShoot(page, { id: `you-room-${k.replace("c2-you-row-", "")}`, mode, tag }, `you-room-${k.replace("c2-you-row-", "")}-${mode}-${tag}`, '[data-testid="c2-shell"]');
            const back = page.locator('[data-testid="c2-settings-back"]').first();
            if (await back.count()) await back.click().catch(() => {});
            await page.waitForTimeout(700);
          } else {
            manifest.surfaces.push({ id: `you-room-${k}`, mode, tag, missing: "row did not open a settings room" });
            save();
          }
        }
      }
    } catch (e) {
      manifest.surfaces.push({ id: "context", mode, tag, error: String(e).slice(0, 200) });
      save();
      log("context error", mode, tag, String(e).slice(0, 120));
    } finally {
      await ctx.close();
    }
  }
}

// ---- ONBOARDING (anon) ----
for (const mode of MODES) {
  const ctx = await newAnonContext(browser, mode, config);
  const page = await ctx.newPage();
  try {
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    await shoot(page, { id: "onboarding-entry", mode, tag: "anon" }, `onboarding-${mode}-entry`);
    const phoneInput = page.locator('input[type="tel"], input[autocomplete*="tel"], input[name*="phone" i]').first();
    if (await phoneInput.count()) {
      manifest.surfaces.push({ id: "onboarding-phone", mode, tag: "anon", note: "phone input present; full OTP flow is the harness API stage's cover, not re-run here (seed budget)" });
      save();
    }
  } finally {
    await ctx.close();
  }
}

save();
await browser.close();
log("R28 CAPTURE DONE ->", OUT);
