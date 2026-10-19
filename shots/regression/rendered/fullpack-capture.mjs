#!/usr/bin/env node
/**
 * Repair #18 FULL SCREENSHOT PACK (close-out phase 10) - ONE process,
 * ONE session provision, ONE founder-seed call set for the entire
 * pack (the founder-seed endpoint throttles under repeated calls).
 * Drives the REAL served preview app (Mac opal-r18-preview mirror)
 * in the cached headless-shell 1217 at 390x844, dark + light.
 *
 * Setup records are created through the REAL APIs only (harness
 * ApiClient): a B-led conversation plan that leaves viewer A's
 * answer pending (earns the DIR-4 P1 lit reveal on A's deck and the
 * DIR-1 plan-awareness elements on chats list / thread / call log),
 * two human messages in that thread, and one real call (POST /calls).
 * Nothing is painted or fixture-fed; every created record is named
 * in the manifest's `setup` block and in the pack README.
 *
 * Gates recorded per capture in manifest.json: served stamp
 * (data-git-head-full), geometry probes (docOverflow, clippedCount),
 * LOCKUP GATE (any [data-orb-lockup="full"] side-by-side lockup on
 * the surface fails the pack), dock halo containment on dock
 * close-ups. Delete-account is captured in its ARMED confirm state
 * only - the execute control is never clicked.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  newAuthedContext,
  newAnonContext,
  entryUrl,
} from "./lib/browser.mjs";
import { ApiClient } from "../lib/harness.mjs";
import { probeHorizontalOverflow, probeClippedText } from "./lib/geometry.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });
const config = loadRenderedConfig(process.env);

// ---------- ONE provision for the whole pack ----------
const { sessions, seedInfo } = await provisionRenderedSessions(config);
const manifest = {
  build_tag: config.buildTag,
  web: config.webBase,
  api: config.apiBase,
  seed: seedInfo ? { comm: seedInfo.comm.status, graph: seedInfo.graph.status } : null,
  sessions: { a: sessions.a.userId, b: sessions.b?.userId ?? null },
  setup: {},
  surfaces: [],
  lockupViolations: [],
  reprobes: {},
};
const saveManifest = () =>
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
const log = (...a) => console.log(...a);

// ---------- API setup (real records, named) ----------
const A = new ApiClient(config, sessions.a);
const B = new ApiClient(config, sessions.b);
try {
  const direct = await B.post("/conversations/direct", { peer_user_id: sessions.a.userId });
  const convId = direct.json.conversation_id;
  manifest.setup.directConversationId = convId;
  manifest.setup.directStatus = direct.status;
  const m1 = await B.post(`/conversations/${convId}/messages`, {
    body: "Saturday works for me - 7:30 at Juniper and Ivy?",
  });
  const m2 = await A.post(`/conversations/${convId}/messages`, {
    body: "Let me check my evening and I will answer here.",
  });
  manifest.setup.messages = [m1.status, m2.status];
  const created = await B.post(`/conversations/${convId}/plans`, {
    title: "Dinner at Juniper and Ivy",
    place: "Juniper and Ivy",
    location: "Juniper and Ivy",
    time_label: "Saturday 7:30 PM",
  });
  manifest.setup.planStatus = created.status;
  manifest.setup.plan = created.json.plan || null;
  const call = await A.post("/calls", { conversation_id: convId });
  manifest.setup.callStatus = call.status;
  const reveals = await A.get("/reveals");
  const items = reveals.json.reveals || reveals.json.items || [];
  manifest.setup.revealsStatus = reveals.status;
  manifest.setup.revealsForA = items.map((i) => ({
    reveal_key: i.reveal_key, category: i.category, lit: i.lit, kicker: i.kicker,
  }));
  log("setup:", JSON.stringify(manifest.setup).slice(0, 700));
} catch (e) {
  manifest.setup.error = String(e).slice(0, 300);
  log("SETUP ERROR", manifest.setup.error);
}
saveManifest();
const planId = manifest.setup.plan?.id || null;

// ---------- browser ----------
const shellPath =
  process.env.HARMONY2_CHROMIUM ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-x64/chrome-headless-shell`;
const browser = await chromium.launch({ headless: true, executablePath: shellPath });

async function stamp(page) {
  return page.evaluate(() => document.documentElement.getAttribute("data-git-head-full")).catch(() => null);
}
async function commonProbes(page, rootSel) {
  const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  const clipped = rootSel
    ? await page.evaluate(probeClippedText, rootSel).catch(() => null)
    : null;
  return {
    docOverflow: overflow?.docOverflow ?? null,
    escapees: overflow?.escapees?.length ?? null,
    clippedCount: clipped ? clipped.clipped.length : null,
    clippedSample: (clipped?.clipped ?? []).slice(0, 3).map((c) => c.text),
  };
}
async function lockupProbe(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll("[data-orb-lockup]")].map((e) =>
      e.getAttribute("data-orb-lockup"),
    );
    return { lockups: all, fullCount: all.filter((v) => v === "full").length };
  }).catch(() => ({ lockups: [], fullCount: 0 }));
}
async function shot(page, name, label, mode, rootSel, extra = {}) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, name) });
  const rec = {
    label, mode, file: name, stamp: await stamp(page),
    ...(await commonProbes(page, rootSel)),
    ...(await lockupProbe(page)),
    ...extra,
  };
  if (rec.fullCount > 0) {
    manifest.lockupViolations.push({ label, mode, file: name });
    rec.lockupGate = "FAIL";
  } else rec.lockupGate = "pass";
  manifest.surfaces.push(rec);
  saveManifest();
  log("shot", name, "stamp", rec.stamp, "overflow", rec.docOverflow, "clipped", rec.clippedCount, "lockupFull", rec.fullCount);
  return rec;
}
const vis = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
  }, sel).catch(() => false);
async function clickT(page, testid, timeout = 12000) {
  const loc = page.locator(`[data-testid="${testid}"]:visible`).first();
  if ((await loc.count()) === 0) return false;
  await loc.click({ timeout }).catch(() => {});
  return true;
}

// ---------- Splash (anon, both modes) ----------
const ENTRY = `${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1&opal_reset_first_run=1`;
for (const mode of ["dark", "light"]) {
  const context = await newAnonContext(browser, mode, config);
  const page = await context.newPage();
  try {
    await page.goto(ENTRY, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1-orb"] img', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const probes = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="c2-splash1"]');
      const stage = document.querySelector('[data-testid="c2-splash1-orb"]');
      const wm = document.querySelector('[data-testid="c2-splash1-wordmark"]');
      const r = stage?.getBoundingClientRect();
      const w = wm?.getBoundingClientRect();
      return {
        fieldAttr: root?.getAttribute("data-splash-field") ?? null,
        rootBg: root ? getComputedStyle(root).backgroundColor : null,
        enterOpalCount: root?.getAttribute("data-enter-opal-count") ?? null,
        stageBox: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
        marginContained: r ? r.left >= 8 && window.innerWidth - r.right >= 8 && r.top >= 8 : null,
        lockupStacked: r && w ? { stacked: w.top >= r.bottom - 4, centerDeltaX: Math.round(Math.abs(r.left + r.width / 2 - (w.left + w.width / 2))) } : null,
        gitHeadFull: document.documentElement.getAttribute("data-git-head-full"),
      };
    });
    manifest.surfaces.push({ label: "splash-1-probes", mode, ...probes });
    await shot(page, `splash-1-${mode}.png`, "splash-1", mode, '[data-testid="c2-splash1"]');
    // stage crop for the brand side-by-side (render side)
    const stageEl = page.locator('[data-testid="c2-splash1-orb"]');
    if (await stageEl.count()) {
      await stageEl.screenshot({ path: path.join(OUT, `_stage-crop-${mode}.png`) }).catch(() => {});
    }
    const cont = page.locator('[data-testid="c2-splash1-continue"]');
    if (await cont.count()) {
      await cont.click();
      await page.waitForSelector('[data-testid="c2-splash2"]', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(900);
      const s2 = await page.evaluate(() => ({
        enterButtons: [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Enter Opal").length,
      }));
      await shot(page, `splash-2-entry-${mode}.png`, "splash-2-entry", mode, '[data-testid="c2-splash2"]', s2);
    } else {
      manifest.surfaces.push({ label: "splash-2-entry", mode, failures: ["no c2-splash1-continue"] });
    }
  } catch (e) {
    manifest.surfaces.push({ label: "splash", mode, failures: [String(e).slice(0, 300)] });
    log(mode, "SPLASH ERROR", String(e).slice(0, 200));
  }
  await context.close();
}
saveManifest();

// ---------- Authed surfaces (both modes, session A) ----------
const createdGoalTitle = "A standing Saturday dinner with the people I love";
for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(3500);

    // ----- Home -----
    await clickT(page, "c2-dock-home");
    await page.waitForTimeout(2500);
    await shot(page, `home-${mode}.png`, "home", mode, '[data-testid="c2-route-home"]');
    const homeScroll = await page.evaluate(() => {
      const sc = document.querySelector('[data-testid="c2-home-scroll"]') ||
        document.querySelector('[data-testid="c2-route-home"] .c2s-scroll');
      if (!sc) return { scrolled: false };
      sc.scrollTop = sc.scrollHeight;
      return { scrolled: true, scrollHeight: sc.scrollHeight, clientHeight: sc.clientHeight };
    });
    await page.waitForTimeout(900);
    await shot(page, `home-scrolled-${mode}.png`, "home-scrolled", mode, '[data-testid="c2-route-home"]', { homeScroll });
    await page.evaluate(() => {
      const sc = document.querySelector('[data-testid="c2-home-scroll"]') ||
        document.querySelector('[data-testid="c2-route-home"] .c2s-scroll');
      if (sc) sc.scrollTop = 0;
    });
    await page.waitForTimeout(600);

    // ----- Search (grouped results) -----
    let searchQuery = null;
    if (await clickT(page, "c2-home-search")) {
      await page.waitForTimeout(1500);
      const input = page.locator('[data-testid="c2-search-input"]');
      if (await input.count()) {
        for (const q of ["dinner", "Regression", "a"]) {
          await input.fill(q);
          await page.waitForTimeout(1600);
          const groups = await page.evaluate(() => ({
            plans: document.querySelectorAll('[data-testid="c2-search-group-plans"]').length,
            chats: document.querySelectorAll('[data-testid="c2-search-group-chats"]').length,
            people: document.querySelectorAll('[data-testid="c2-search-group-people"]').length,
            intentions: document.querySelectorAll('[data-testid="c2-search-group-intentions"]').length,
            planRows: document.querySelectorAll('[data-testid="c2-search-plan"]').length,
            chatRows: document.querySelectorAll('[data-testid="c2-search-chat"]').length,
            personRows: document.querySelectorAll('[data-testid="c2-search-person"]').length,
          }));
          if (groups.plans && groups.chats && groups.people) { searchQuery = q; manifest.surfaces.push({ label: "search-groups", mode, query: q, groups }); break; }
          if (!searchQuery) { searchQuery = q; manifest.surfaces.push({ label: "search-groups", mode, query: q, groups }); }
        }
        await shot(page, `search-${mode}.png`, "search", mode, '[data-testid="c2-search"]', { query: searchQuery });
        const close = page.locator('[data-testid="c2-search"] [aria-label="Close search"]');
        if (await close.count()) await close.click().catch(() => {});
        await page.waitForTimeout(800);
      }
    }

    // ----- Center deck + lit reveal -----
    await clickT(page, "c2-dock-center");
    await page.waitForTimeout(3000);
    const revealProbe = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-testid="reveal-card"]')];
      return cards.map((c) => ({
        lit: c.getAttribute("data-lit"),
        category: c.getAttribute("data-category") || c.querySelector('[data-testid="reveal-kicker"]')?.textContent?.trim() || null,
        text: (c.textContent || "").trim().slice(0, 140),
        inViewport: (() => { const r = c.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; })(),
      }));
    });
    manifest.surfaces.push({ label: "center-deck-reveals", mode, reveals: revealProbe });
    await shot(page, `center-deck-${mode}.png`, "center-deck", mode, '[data-testid="c2-center-opening"]');
    const lit = page.locator('[data-testid="reveal-card"][data-lit="true"]').first();
    if (await lit.count()) {
      await lit.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, `center-deck-lit-reveal-${mode}.png`, "center-deck-lit-reveal", mode, '[data-testid="c2-center-opening"]');
      const fire = lit.locator('[data-testid="reveal-fire-frame"]').first();
      if (await fire.count()) {
        await fire.screenshot({ path: path.join(OUT, `fireframe-element-${mode}.png`) }).catch(() => {});
        manifest.surfaces.push({ label: "fireframe-element", mode, file: `fireframe-element-${mode}.png` });
      }
    } else {
      manifest.surfaces.push({ label: "center-deck-lit-reveal", mode, failures: ["no lit reveal card on deck"] });
    }
    // deck scrolled + fold check
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
      return { ok: cardBottom === null ? null : cardBottom <= dockTop + 1, cardBottom: cardBottom === null ? null : Math.round(cardBottom), dockTop: Math.round(dockTop), scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight };
    }).catch((e) => ({ ok: false, why: String(e) }));
    const deckRec = await shot(page, `center-deck-scrolled-${mode}.png`, "center-deck-scrolled", mode, '[data-testid="c2-center-opening"]', { fold });
    if (mode === "dark") manifest.reprobes.centerDeckDarkClipped = deckRec.clippedCount;
    // NOTE: re-probe uses the rest-state deck clipped from the earlier shot:
    const deckRest = manifest.surfaces.find((s) => s.label === "center-deck" && s.mode === mode);
    if (deckRest) (manifest.reprobes[mode === "dark" ? "centerDeckRestDark" : "centerDeckRestLight"] = { clippedCount: deckRest.clippedCount, clippedSample: deckRest.clippedSample });
    await page.evaluate(() => { const s = document.querySelector('[data-testid="c2-center-opening"]'); if (s) s.scrollTop = 0; });
    await page.waitForTimeout(600);

    // ----- Center chat: real exchange -----
    let chatProbe = { opened: false, holdingChips: 0 };
    if (await clickT(page, "c2-opening-talk")) {
      await page.waitForTimeout(3500);
      chatProbe = await page.evaluate(() => ({
        opened: Boolean(document.querySelector('[data-testid="center-chat"]')),
        holdingChips: document.querySelectorAll('[data-testid^="holding-chip-"]').length,
      })).catch(() => chatProbe);
      manifest.reprobes[mode === "dark" ? "centerChatOpenedDark" : "centerChatOpenedLight"] = chatProbe.opened;
      await shot(page, `center-chat-${mode}.png`, "center-chat", mode, '[data-testid="center-chat"]', { chatProbe });
      const input = page.locator('[data-testid="center-chat"] .c1-composer-input');
      if (await input.count()) {
        await input.fill("What are you holding for me?");
        await input.press("Enter");
        // live LLM: poll up to ~48s for holding chips or a settled reply
        let chips = 0;
        for (let i = 0; i < 16; i++) {
          await page.waitForTimeout(3000);
          chips = await page.locator('[data-testid^="holding-chip-"]').count();
          if (chips > 0) break;
        }
        const ex = await page.evaluate(() => ({
          holdingChips: document.querySelectorAll('[data-testid^="holding-chip-"]').length,
          chipLabels: [...document.querySelectorAll('[data-testid^="holding-chip-"]')].map((e) => e.textContent.trim()),
          chatTextTail: (document.querySelector('[data-testid="center-chat"]')?.textContent || "").slice(-400),
        })).catch(() => ({}));
        await shot(page, `center-chat-exchange-${mode}.png`, "center-chat-exchange", mode, '[data-testid="center-chat"]', { exchange: ex });
      }
      const back = page.locator('[data-testid="center-chat"] .c1-back');
      if (await back.count()) await back.click().catch(() => {});
      await page.waitForTimeout(1200);
      if (await vis(page, '[data-testid="c2-c1-back-to-center"]')) await clickT(page, "c2-c1-back-to-center");
      await page.waitForTimeout(1200);
    } else {
      manifest.surfaces.push({ label: "center-chat", mode, failures: ["c2-opening-talk not found"] });
    }

    // ----- Chats list + thread + call log -----
    await clickT(page, "c2-dock-chats");
    await page.waitForTimeout(3500);
    const paRow = await page.evaluate((pid) => {
      const els = [...document.querySelectorAll('[data-testid="plan-awareness"]')];
      return els.map((e) => ({
        variant: e.getAttribute("data-variant"), planId: e.getAttribute("data-plan-id"),
        state: e.getAttribute("data-plan-state"), text: (e.textContent || "").trim().slice(0, 120),
        isSetupPlan: pid ? e.getAttribute("data-plan-id") === pid : null,
      }));
    }, planId).catch(() => []);
    await shot(page, `chats-list-${mode}.png`, "chats-list", mode, '[data-testid="c2-route-chats"]', { planAwareness: paRow });
    // thread: prefer the row carrying the setup plan's awareness element
    let threadOpened = false;
    if (planId) {
      const pa = page.locator(`[data-testid="plan-awareness"][data-plan-id="${planId}"]`).first();
      if (await pa.count()) { await pa.click().catch(() => {}); threadOpened = true; }
    }
    if (!threadOpened) {
      const row = page.locator('[data-testid="chats-row"]:visible, [data-testid="c2-route-chats"] [data-testid="chat-row"]:visible').first();
      if (await row.count()) { await row.click().catch(() => {}); threadOpened = true; }
    }
    await page.waitForTimeout(4000);
    const threadProbe = await page.evaluate(() => {
      const strip = document.querySelector('[data-testid="next-together-strip"]');
      const rev = document.querySelector('[data-testid="reveal-thread"]');
      return {
        threadShell: Boolean(document.querySelector('[data-testid="thread-shell"]')),
        stripPresent: Boolean(strip), stripText: strip ? strip.textContent.trim().slice(0, 160) : null,
        threadRevealPresent: Boolean(rev), threadRevealText: rev ? rev.textContent.trim().slice(0, 160) : null,
      };
    });
    await shot(page, `thread-${mode}.png`, "thread", mode, '[data-testid="thread-shell"]', { thread: threadProbe });
    // back to list
    const backs = page.locator('[data-testid="gpt-back"]:visible, [data-testid="thread-shell"] .c1-back:visible, [data-testid="c2-route-chats"] .c1-back:visible');
    if (await backs.count()) await backs.first().click().catch(() => {});
    await page.waitForTimeout(2000);
    if (!(await vis(page, '[data-testid="c2-route-chats"]')) || (await vis(page, '[data-testid="thread-shell"]'))) {
      await clickT(page, "c2-dock-chats");
      await page.waitForTimeout(2500);
    }
    // call log (ChatsHome calls mode, the R17-path surface as served in C2 host)
    if (await clickT(page, "comm-mode-calls")) {
      await page.waitForTimeout(3500);
      const paCall = await page.evaluate((pid) => {
        const els = [...document.querySelectorAll('[data-testid="plan-awareness"]')].filter((e) => e.getAttribute("data-variant") === "call");
        return {
          listPresent: Boolean(document.querySelector('[data-testid="calls-continuity-list"]')),
          rows: document.querySelectorAll('[data-testid^="calls-row-"]').length,
          found: els.map((e) => ({ planId: e.getAttribute("data-plan-id"), state: e.getAttribute("data-plan-state"), text: (e.textContent || "").trim().slice(0, 120), isSetupPlan: pid ? e.getAttribute("data-plan-id") === pid : null })),
        };
      }, planId).catch(() => ({}));
      await shot(page, `call-log-${mode}.png`, "call-log", mode, '[data-testid="calls-continuity-home"]', { callLog: paCall });
      const chatMode = page.locator('[data-testid="comm-mode-chats"]');
      if (await chatMode.count()) await chatMode.click().catch(() => {});
      await page.waitForTimeout(1500);
    } else {
      manifest.surfaces.push({ label: "call-log", mode, failures: ["comm-mode-calls not found on chats route"] });
    }

    // ----- Graphs -----
    await clickT(page, "c2-dock-graphs");
    await page.waitForTimeout(3500);
    const graphsProbe = await page.evaluate(() => ({
      planCards: document.querySelectorAll('[data-testid="c2-plan-card"]').length,
      statePills: [...document.querySelectorAll('[data-testid="c2-plan-state-pill"]')].map((e) => e.textContent.trim()),
      groups: [...document.querySelectorAll('[data-testid="c2-graphs-group"]')].map((e) => (e.textContent || "").trim().slice(0, 60)),
    })).catch(() => ({}));
    await shot(page, `graphs-${mode}.png`, "graphs", mode, '[data-testid="c2-graphs"]', { graphs: graphsProbe });
    const scrollGraphsTo = async (testid) => {
      const el = page.locator(`[data-testid="${testid}"]`).first();
      if ((await el.count()) === 0) return false;
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(900);
      return true;
    };
    if (await scrollGraphsTo("c2-graphs-intentions")) {
      await shot(page, `graphs-intentions-${mode}.png`, "graphs-intentions", mode, '[data-testid="c2-graphs"]');
    } else manifest.surfaces.push({ label: "graphs-intentions", mode, failures: ["c2-graphs-intentions absent"] });
    if (await scrollGraphsTo("c2-graphs-shelf")) {
      const shelf = await page.evaluate(() => {
        const s = document.querySelector('[data-testid="c2-graphs-shelf"]');
        return {
          text: (s?.textContent || "").trim().slice(0, 500),
          starters: s ? s.querySelectorAll('[data-testid="c2-starter-start"]').length : 0,
        };
      }).catch(() => ({}));
      await shot(page, `graphs-someday-shelf-${mode}.png`, "graphs-someday-shelf", mode, '[data-testid="c2-graphs"]', { shelf });
    } else manifest.surfaces.push({ label: "graphs-someday-shelf", mode, failures: ["c2-graphs-shelf absent"] });
    // plan detail (Who + history)
    await page.evaluate(() => {
      const g = document.querySelector('[data-testid="c2-graphs"]');
      const sc = g?.closest(".c2s-scroll") || g;
      if (sc) sc.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const card = page.locator('[data-testid="c2-plan-card"]:visible').first();
    if (await card.count()) {
      await card.click().catch(() => {});
      await page.waitForTimeout(3500);
      if (await vis(page, '[data-testid="c2-graph-detail"]')) {
        if (await clickT(page, "c2-detail-history-toggle", 5000)) await page.waitForTimeout(1500);
        const detail = await page.evaluate(() => {
          const d = document.querySelector('[data-testid="c2-graph-detail"]');
          const t = (d?.textContent || "");
          return {
            textHead: t.trim().slice(0, 300),
            hasWho: /who/i.test(t),
            attendancePresent: Boolean(d?.querySelector('[data-testid="c2-detail-attendance"]')),
            historyLines: d ? d.querySelectorAll('[data-testid^="c2-detail-history"]').length : 0,
          };
        }).catch(() => ({}));
        await shot(page, `plan-detail-${mode}.png`, "plan-detail", mode, '[data-testid="c2-graph-detail"]', { detail });
        await clickT(page, "c2-detail-back", 5000);
        await page.waitForTimeout(2000);
      } else {
        manifest.surfaces.push({ label: "plan-detail", mode, failures: ["c2-graph-detail did not open from plan card"] });
        await shot(page, `plan-detail-failed-${mode}.png`, "plan-detail-failed", mode, '[data-testid="c2-graphs"]');
      }
    } else {
      manifest.surfaces.push({ label: "plan-detail", mode, failures: ["no c2-plan-card on Graphs"] });
    }
    // Working toward (goals) + link picker
    if (await scrollGraphsTo("c2-graphs-goals")) {
      let pickerCount = await page.locator('[data-testid^="c2-goal-picker-"]').count();
      if (pickerCount === 0 && mode === "dark") {
        const titleInput = page.locator('[data-testid="c2-goal-title"]');
        if (await titleInput.count()) {
          await titleInput.fill(createdGoalTitle);
          await clickT(page, "c2-goal-save", 5000);
          await page.waitForTimeout(3000);
          manifest.setup.createdGoal = { title: createdGoalTitle, via: "Graphs goal form (real UI/API)" };
          pickerCount = await page.locator('[data-testid^="c2-goal-picker-"]').count();
        }
      }
      const goalsProbe = await page.evaluate(() => {
        const g = document.querySelector('[data-testid="c2-graphs-goals"]');
        return { text: (g?.textContent || "").trim().slice(0, 400), pickers: g ? g.querySelectorAll('[data-testid^="c2-goal-picker-"]').length : 0 };
      }).catch(() => ({}));
      await shot(page, `graphs-working-toward-${mode}.png`, "graphs-working-toward", mode, '[data-testid="c2-graphs"]', { goals: goalsProbe });
      const picker = page.locator('[data-testid^="c2-goal-picker-"]').first();
      if (await picker.count()) {
        await picker.click().catch(() => {});
        await page.waitForTimeout(1500);
        const pickerProbe = await page.evaluate(() => ({
          linkButtons: document.querySelectorAll('[data-testid^="c2-goal-link-"]').length,
          pickerListPresent: Boolean(document.querySelector('[data-testid^="c2-goal-picker-list-"]')),
        })).catch(() => ({}));
        await shot(page, `graphs-goal-picker-${mode}.png`, "graphs-goal-picker", mode, '[data-testid="c2-graphs"]', { picker: pickerProbe });
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(800);
      } else {
        manifest.surfaces.push({ label: "graphs-goal-picker", mode, failures: ["no goal picker present"] });
      }
    } else manifest.surfaces.push({ label: "graphs-working-toward", mode, failures: ["c2-graphs-goals absent"] });

    // ----- You hub + every section -----
    await clickT(page, "c2-dock-you");
    await page.waitForTimeout(3000);
    await shot(page, `you-hub-${mode}.png`, "you-hub", mode, '[data-testid="c2-you"]');
    const rowKeys = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="c2-you-row-"]')].map((e) => e.getAttribute("data-testid").replace("c2-you-row-", "")),
    ).catch(() => []);
    manifest.surfaces.push({ label: "you-hub-rows", mode, rows: rowKeys });
    for (const key of rowKeys) {
      try {
        if (!(await vis(page, '[data-testid="c2-you"]'))) { await clickT(page, "c2-dock-you"); await page.waitForTimeout(2000); }
        const row = page.locator(`[data-testid="c2-you-row-${key}"]`).first();
        await row.scrollIntoViewIfNeeded().catch(() => {});
        await row.click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(2600);
        const extra = {};
        if (key === "soul-memory" || key === "what-opal-remembers") {
          extra.soulForm = await page.evaluate(() => Boolean(document.querySelector('[data-testid="c2-soul-form"]'))).catch(() => null);
          if (key === "soul-memory") manifest.reprobes[mode === "dark" ? "soulFormDark" : "soulFormLight"] = extra.soulForm;
          extra.memoryRows = await page.evaluate(() => document.querySelectorAll('[data-testid^="c2-setting-row-"]').length).catch(() => null);
        }
        if (key === "delete-account") {
          const arm = page.locator('[data-testid="c2-delete-arm"]');
          if (await arm.count()) {
            await arm.click().catch(() => {});
            await page.waitForTimeout(1200);
            extra.armed = true;
            extra.confirmVisible = await page.evaluate(() => Boolean(document.querySelector('[data-testid="c2-delete-confirm"]'))).catch(() => null);
            extra.note = "ARMED ONLY - c2-delete-confirm was NOT clicked; nothing deleted";
          } else extra.armed = false;
        }
        if (key === "connections") {
          extra.connectionRows = await page.evaluate(() =>
            [...document.querySelectorAll('[data-testid^="c2-setting-row-"]')].map((e) => ({ id: e.getAttribute("data-testid"), text: (e.textContent || "").trim().slice(0, 100) })),
          ).catch(() => []);
        }
        await shot(page, `you-${key}-${mode}.png`, `you-${key}`, mode, '[data-testid="c2-route-you"]', extra);
        if (!(await clickT(page, "c2-settings-back", 5000))) { await clickT(page, "c2-dock-you"); }
        await page.waitForTimeout(1800);
      } catch (e) {
        manifest.surfaces.push({ label: `you-${key}`, mode, failures: [String(e).slice(0, 200)] });
        await clickT(page, "c2-dock-you").catch(() => {});
        await page.waitForTimeout(1500);
      }
    }

    // ----- Dock close-up + halo check -----
    await clickT(page, "c2-dock-home");
    await page.waitForTimeout(2000);
    const halo = await page.evaluate(() => {
      const disc = document.querySelector(".c2s-dock-center-disc");
      const dock = document.querySelector('[data-testid="c2-dock"]');
      if (!disc || !dock) return { discPresent: false };
      const d = disc.getBoundingClientRect();
      const mark = disc.querySelector(".orb-dock-mark")?.getBoundingClientRect();
      const rings = disc.querySelector('[data-orb-living-rings="ambient"]');
      const cs = getComputedStyle(disc);
      return {
        discPresent: true,
        discBox: { w: Math.round(d.width), h: Math.round(d.height) },
        markInsideDisc: mark ? mark.left >= d.left && mark.right <= d.right && mark.top >= d.top && mark.bottom <= d.bottom : null,
        ringsPresent: Boolean(rings),
        discBorderTopWidth: cs.borderTopWidth, discBorderTopColor: cs.borderTopColor,
        dockTop: Math.round(dock.getBoundingClientRect().top),
      };
    }).catch(() => ({}));
    const discEl = page.locator(".c2s-dock-center-disc");
    if (await discEl.count()) {
      const box = await discEl.boundingBox();
      if (box) {
        await page.screenshot({ path: path.join(OUT, `dock-closeup-${mode}.png`), clip: { x: Math.max(0, box.x - 34), y: Math.max(0, box.y - 34), width: box.width + 68, height: box.height + 68 } });
        manifest.surfaces.push({ label: "dock-closeup", mode, file: `dock-closeup-${mode}.png`, stamp: await stamp(page), halo });
        log("shot", `dock-closeup-${mode}.png`, "halo", JSON.stringify(halo));
      }
    }
    await shot(page, `dock-full-${mode}.png`, "dock-full", mode, '[data-testid="c2-route-home"]', { halo });
  } catch (e) {
    manifest.surfaces.push({ label: "authed-run", mode, failures: [String(e).slice(0, 300)] });
    log(mode, "AUTHED ERROR", String(e).slice(0, 300));
    await page.screenshot({ path: path.join(OUT, `error-${mode}.png`) }).catch(() => {});
  }
  await context.close();
}

// ---------- Wide pair (HA-A sidebar, 1280x800) ----------
for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(4000);
    const wide = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="c2-sidebar"]');
      const dock = document.querySelector('[data-testid="c2-dock"]');
      return {
        sidebarDisplay: sidebar ? getComputedStyle(sidebar).display : null,
        sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
        dockDisplay: dock ? getComputedStyle(dock).display : null,
      };
    });
    await shot(page, `wide-home-${mode}.png`, "wide-home", mode, '[data-testid="c2-route-home"]', { wide });
    if (await clickT(page, "c2-side-you")) {
      await page.waitForTimeout(3000);
      const youNav = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="c2-you-nav"]');
        return { present: Boolean(nav), rows: document.querySelectorAll('[data-testid^="c2-you-nav-row-"]').length };
      }).catch(() => ({}));
      await shot(page, `wide-you-${mode}.png`, "wide-you", mode, '[data-testid="c2-route-you"]', { wide, youNav });
    } else {
      manifest.surfaces.push({ label: "wide-you", mode, failures: ["c2-side-you not found at wide viewport"] });
    }
  } catch (e) {
    manifest.surfaces.push({ label: "wide", mode, failures: [String(e).slice(0, 300)] });
  }
  await context.close();
}

manifest.lockupGate = manifest.lockupViolations.length === 0 ? "pass" : "FAIL";
saveManifest();
log("DONE", OUT, "surfaces:", manifest.surfaces.length, "lockupViolations:", manifest.lockupViolations.length);
await browser.close();
