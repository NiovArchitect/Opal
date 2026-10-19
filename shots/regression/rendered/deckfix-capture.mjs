#!/usr/bin/env node
/**
 * Repair #18 DECKFIX re-capture - the full pack's affected surfaces
 * only, same harness discipline as fullpack-capture.mjs (real served
 * preview app, cached headless-shell 1217, 390x844, dark + light,
 * geometry probes per capture). Proves the deckfix findings:
 *  F1 center deck rest WITH the derivation's lit P1 reveal rendered
 *     in Needs you (FireFrame visible), plus a scrolled-to-lit frame;
 *  F2 thread: Next Together strip clear of the first message
 *     (rect-intersection probe), the human call line as a system
 *     line, no "call:<uuid>" text anywhere, lit reveal in thread;
 *  F3 center deck clippedCount 0 AT REST (probeClippedText on the
 *     opening at scrollTop 0) + scrolled fold check;
 *  F7 You hub: contained scroller geometry + the calls-assist row
 *     scrolled into view rests fully above the dock (rect + hit
 *     test), hub rest frame.
 * Setup: sessions only + founder seed ONCE for the whole run (the
 * pack's discipline). The pack's F1 setup is recreated through the
 * real APIs ONLY when the served DB no longer holds it (checked via
 * GET /reveals for viewer A: a lit P1 + the Juniper plan's reveal).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  newAuthedContext,
  entryUrl,
} from "./lib/browser.mjs";
import { ApiClient } from "../lib/harness.mjs";
import { probeHorizontalOverflow, probeClippedText } from "./lib/geometry.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });
const config = loadRenderedConfig(process.env);
const log = (...a) => console.log(...a);

const { sessions, seedInfo } = await provisionRenderedSessions(config);
const manifest = {
  wave: "deckfix-recapture",
  web: config.webBase,
  api: config.apiBase,
  seed: seedInfo ? { comm: seedInfo.comm.status, graph: seedInfo.graph.status } : null,
  sessions: { a: sessions.a.userId, b: sessions.b?.userId ?? null },
  setup: {},
  surfaces: [],
};
const saveManifest = () =>
  fs.writeFileSync(path.join(OUT, "deckfix-manifest.json"), JSON.stringify(manifest, null, 2));

const A = new ApiClient(config, sessions.a);
const B = new ApiClient(config, sessions.b);

// ---------- F1 setup: verify, recreate only if gone ----------
const PACK_PLAN_ID = "d39df6d7-2626-4143-93ed-85427b910dbd";
async function feedForA() {
  const r = await A.get("/reveals");
  const items = r.json?.reveals || r.json?.items || [];
  return { status: r.status, items };
}
let feed = await feedForA();
let litP1 = feed.items.find((i) => i.category === "P1" && i.lit);
let packReveal = feed.items.find((i) => i.plan_id === PACK_PLAN_ID);
manifest.setup.feedBefore = {
  status: feed.status,
  litP1: litP1 ? litP1.reveal_key : null,
  packPlanReveal: packReveal ? packReveal.reveal_key : null,
};
if (!litP1 || !packReveal) {
  log("setup: pack F1 setup not fully held - recreating through real APIs");
  const direct = await B.post("/conversations/direct", { peer_user_id: sessions.a.userId });
  const convId = direct.json.conversation_id;
  const m1 = await B.post(`/conversations/${convId}/messages`, {
    body: "Saturday works for me - 7:30 at Juniper and Ivy?",
  });
  const m2 = await A.post(`/conversations/${convId}/messages`, {
    body: "Let me check my evening and I will answer here.",
  });
  const created = await B.post(`/conversations/${convId}/plans`, {
    title: "Dinner at Juniper and Ivy",
    place: "Juniper and Ivy",
    location: "Juniper and Ivy",
    time_label: "Saturday 7:30 PM",
  });
  const call = await A.post("/calls", { conversation_id: convId });
  manifest.setup.recreated = {
    conversationId: convId,
    messages: [m1.status, m2.status],
    planStatus: created.status,
    planId: created.json?.plan?.id ?? null,
    callStatus: call.status,
  };
  feed = await feedForA();
  litP1 = feed.items.find((i) => i.category === "P1" && i.lit);
  packReveal = feed.items.find((i) => i.plan_id === (manifest.setup.recreated.planId ?? PACK_PLAN_ID));
} else {
  manifest.setup.recreated = null;
}
manifest.setup.feedFinal = feed.items.map((i) => ({
  reveal_key: i.reveal_key, category: i.category, lit: i.lit, plan_id: i.plan_id,
}));
const setupPlanId = packReveal?.plan_id ?? PACK_PLAN_ID;
log("setup: litP1 =", litP1?.reveal_key, "setupPlan =", setupPlanId);
saveManifest();

// ---------- browser ----------
const shellPath =
  process.env.HARMONY2_CHROMIUM ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-x64/chrome-headless-shell`;
const browser = await chromium.launch({ headless: true, executablePath: shellPath });

async function shot(page, name, label, mode, rootSel, extra = {}) {
  const stamp = await page
    .evaluate(() => document.documentElement.getAttribute("data-git-head-full"))
    .catch(() => null);
  const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  const clipped = rootSel ? await page.evaluate(probeClippedText, rootSel).catch(() => null) : null;
  await page.screenshot({ path: path.join(OUT, name) });
  const rec = {
    label, mode, file: name, stamp,
    docOverflow: overflow ? overflow.docOverflow : null,
    escapees: overflow ? overflow.escapees.length : null,
    clippedCount: clipped ? clipped.clipped.length : null,
    clippedSample: (clipped?.clipped ?? []).slice(0, 3).map((c) => c.text),
    ...extra,
  };
  manifest.surfaces.push(rec);
  saveManifest();
  log("shot", name, "stamp", stamp, "overflow", rec.docOverflow, "clipped", rec.clippedCount);
  return rec;
}
async function clickT(page, testid, timeout = 15000) {
  const loc = page.locator(`[data-testid="${testid}"]:visible`).first();
  if ((await loc.count()) === 0) return false;
  await loc.click({ timeout }).catch(() => {});
  return true;
}

for (const mode of ["dark", "light"]) {
  const ctx = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await ctx.newPage();
  await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 }).catch(() => null);
  await page.waitForTimeout(2500);

  // ----- Center deck rest (F1 + F3) -----
  await clickT(page, "c2-dock-center");
  await page.waitForTimeout(3500);
  const deckRestProbe = await page.evaluate(() => {
    const sc = document.querySelector('[data-testid="c2-center-opening"]');
    const dock = document.querySelector('[data-testid="c2-dock"]');
    const lit = document.querySelector('[data-testid="reveal-card"][data-lit="true"]');
    const litRect = lit?.getBoundingClientRect();
    return {
      scrollTop: sc?.scrollTop ?? null,
      scrollerBottom: sc ? Math.round(sc.getBoundingClientRect().bottom) : null,
      dockTop: dock ? Math.round(dock.getBoundingClientRect().top) : null,
      needsYouPresent: Boolean(document.querySelector('[data-testid="c2-opening-needs-you"]')),
      revealCards: [...document.querySelectorAll('[data-testid="c2-center-opening"] [data-testid="reveal-card"]')].map((c) => ({
        lit: c.getAttribute("data-lit"), category: c.getAttribute("data-category"),
        key: c.getAttribute("data-reveal-key"), text: (c.textContent || "").trim().slice(0, 90),
      })),
      fireFramesOnDeck: document.querySelectorAll('[data-testid="c2-center-opening"] [data-testid="reveal-fire-frame"]').length,
      litRect: litRect ? { top: Math.round(litRect.top), bottom: Math.round(litRect.bottom) } : null,
      litInFrame: litRect ? litRect.bottom > 0 && litRect.top < window.innerHeight : false,
    };
  });
  await shot(page, `center-deck-${mode}.png`, "center-deck", mode, '[data-testid="c2-center-opening"]', { deckRest: deckRestProbe });
  // scroll the lit reveal fully into view (deck's own scroller) + element crop
  const litLoc = page.locator('[data-testid="c2-center-opening"] [data-testid="reveal-card"][data-lit="true"]').first();
  if ((await litLoc.count()) > 0) {
    await litLoc.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(900);
    await shot(page, `center-deck-lit-reveal-${mode}.png`, "center-deck-lit-reveal", mode, '[data-testid="c2-center-opening"]', { deckRest: deckRestProbe });
    const fire = litLoc.locator('[data-testid="reveal-fire-frame"]').first();
    if ((await fire.count()) > 0) {
      await fire.screenshot({ path: path.join(OUT, `fireframe-element-${mode}.png`) }).catch(() => {});
      manifest.surfaces.push({ label: "fireframe-element", mode, file: `fireframe-element-${mode}.png`, source: "center deck lit reveal" });
    }
  } else {
    manifest.surfaces.push({ label: "center-deck-lit-reveal", mode, failures: ["no lit reveal card on deck"] });
  }
  // deck scrolled + fold check (the pack's own probe shape)
  const fold = await page.evaluate(async () => {
    const scroller = document.querySelector('[data-testid="c2-center-opening"]');
    const dock = document.querySelector('[data-testid="c2-dock"]');
    if (!scroller || !dock) return { ok: false, why: "missing scroller or dock" };
    scroller.scrollTop = scroller.scrollHeight;
    await new Promise((r) => setTimeout(r, 700));
    const sections = [...scroller.querySelectorAll("section")];
    const last = sections[sections.length - 1];
    const card = last ? last.querySelector(".c2s-card, [data-testid='c2-plan-card'], [data-testid='reveal-card']") || last : null;
    const dockTop = dock.getBoundingClientRect().top;
    const cardBottom = card ? card.getBoundingClientRect().bottom : null;
    return { ok: cardBottom === null ? null : cardBottom <= dockTop + 1, cardBottom: cardBottom === null ? null : Math.round(cardBottom), dockTop: Math.round(dockTop), scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight };
  }).catch((e) => ({ ok: false, why: String(e) }));
  await shot(page, `center-deck-scrolled-${mode}.png`, "center-deck-scrolled", mode, '[data-testid="c2-center-opening"]', { fold });
  await page.evaluate(() => { const s = document.querySelector('[data-testid="c2-center-opening"]'); if (s) s.scrollTop = 0; });
  await page.waitForTimeout(600);

  // ----- Thread (F2) -----
  await clickT(page, "c2-dock-chats");
  await page.waitForTimeout(3500);
  let threadOpened = false;
  if (setupPlanId) {
    const pa = page.locator(`[data-testid="plan-awareness"][data-plan-id="${setupPlanId}"]`).first();
    if ((await pa.count()) > 0) { await pa.click().catch(() => {}); threadOpened = true; }
  }
  if (!threadOpened) {
    const row = page.locator('[data-testid="chats-row"]:visible').first();
    if ((await row.count()) > 0) { await row.click().catch(() => {}); threadOpened = true; }
  }
  await page.waitForTimeout(4000);
  const threadProbe = await page.evaluate(() => {
    const strip = document.querySelector('[data-testid="next-together-strip"]');
    const stripRect = strip?.getBoundingClientRect();
    const bubbles = [...document.querySelectorAll('[data-testid="thread-shell"] .c1-bubble')];
    const first = bubbles[0]?.getBoundingClientRect();
    const intersects = stripRect && first
      ? stripRect.left < first.right && stripRect.right > first.left && stripRect.top < first.bottom && stripRect.bottom > first.top
      : null;
    const threadText = document.querySelector('[data-testid="thread-shell"]')?.textContent || "";
    const systemLines = [...document.querySelectorAll('[data-testid="thread-shell"] .c1-system-line')].map((e) => e.textContent.trim());
    const rev = document.querySelector('[data-testid="reveal-thread"]');
    const revCard = document.querySelector('[data-testid="reveal-thread"] [data-testid="reveal-card"]');
    return {
      threadShell: Boolean(document.querySelector('[data-testid="thread-shell"]')),
      stripPresent: Boolean(strip),
      stripPosition: strip ? getComputedStyle(strip).position : null,
      stripRect: stripRect ? { top: Math.round(stripRect.top), bottom: Math.round(stripRect.bottom) } : null,
      firstBubbleRect: first ? { top: Math.round(first.top), bottom: Math.round(first.bottom) } : null,
      stripOverlapsFirstMessage: intersects,
      rawCallTextPresent: /call:[0-9a-f-]{8,}/i.test(threadText),
      systemLines,
      threadRevealPresent: Boolean(rev),
      threadRevealLit: revCard?.getAttribute("data-lit") ?? null,
      threadRevealText: rev ? rev.textContent.trim().slice(0, 160) : null,
    };
  });
  await shot(page, `thread-${mode}.png`, "thread", mode, '[data-testid="thread-shell"]', { thread: threadProbe });
  const revLoc = page.locator('[data-testid="reveal-thread"] [data-testid="reveal-card"]').first();
  if ((await revLoc.count()) > 0) {
    await revLoc.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(900);
    await shot(page, `thread-lit-reveal-${mode}.png`, "thread-lit-reveal", mode, '[data-testid="thread-shell"]', { thread: threadProbe });
  } else {
    manifest.surfaces.push({ label: "thread-lit-reveal", mode, failures: ["no reveal in thread"] });
  }
  const backs = page.locator('[data-testid="thread-shell"] .c1-back:visible');
  if ((await backs.count()) > 0) await backs.first().click().catch(() => {});
  await page.waitForTimeout(1500);

  // ----- You hub (F7) -----
  await clickT(page, "c2-dock-you");
  await page.waitForTimeout(3000);
  const hubRestProbe = await page.evaluate(() => {
    const hub = document.querySelector('[data-testid="c2-you"]');
    const sc = hub?.querySelector(".c2s-scroll");
    const dock = document.querySelector('[data-testid="c2-dock"]');
    return {
      hubHeight: hub ? Math.round(hub.getBoundingClientRect().height) : null,
      scrollerClientHeight: sc?.clientHeight ?? null,
      scrollerScrollHeight: sc?.scrollHeight ?? null,
      scrollerIsScroller: sc ? sc.scrollHeight > sc.clientHeight : null,
      scrollTop: sc?.scrollTop ?? null,
      dockTop: dock ? Math.round(dock.getBoundingClientRect().top) : null,
    };
  });
  await shot(page, `you-hub-${mode}.png`, "you-hub", mode, '[data-testid="c2-you"]', { hubRest: hubRestProbe });
  const orbProbe = await page.evaluate(async () => {
    const row = document.querySelector('[data-testid="c2-you-row-calls-assist"]');
    const sc = document.querySelector('[data-testid="c2-you"] .c2s-scroll');
    const dock = document.querySelector('[data-testid="c2-dock"]');
    if (!row || !sc || !dock) return { missing: true };
    row.scrollIntoView({ block: "nearest" });
    await new Promise((r) => setTimeout(r, 800));
    const rr = row.getBoundingClientRect();
    const dockTop = dock.getBoundingClientRect().top;
    const cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    const trapped = !(hit === row || row.contains(hit));
    sc.scrollTop = sc.scrollHeight;
    await new Promise((r) => setTimeout(r, 800));
    const rows = [...document.querySelectorAll('[data-testid^="c2-you-row-"]')];
    const last = rows[rows.length - 1]?.getBoundingClientRect();
    return {
      rowRectAfterIntoView: { top: Math.round(rr.top), bottom: Math.round(rr.bottom) },
      dockTop: Math.round(dockTop),
      rowFullyAboveDock: rr.bottom <= dockTop + 1,
      hitTestid: hit?.getAttribute?.("data-testid") ?? null,
      hitTag: hit?.tagName?.toLowerCase() ?? null,
      trapped,
      maxScrollTop: sc.scrollHeight - sc.clientHeight,
      lastRowBottomAtMaxScroll: last ? Math.round(last.bottom) : null,
      lastRowClearAtMaxScroll: last ? last.bottom <= dockTop + 1 : null,
    };
  });
  manifest.surfaces.push({ label: "you-hub-orb-clearance", mode, orbProbe });
  saveManifest();
  log("orbProbe", mode, JSON.stringify(orbProbe));
  await ctx.close();
}
await browser.close();
saveManifest();
log("DECKFIX_CAPTURE_DONE");
