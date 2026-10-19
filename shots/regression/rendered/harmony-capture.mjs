#!/usr/bin/env node
/**
 * Repair #18 HARMONY-0 capture (founder sharpening 2026-10-18 12:52-12:54 PDT).
 * Same surfaces/session/seed as step0-capture.mjs, plus harmony probes:
 * lockup-law geometry (stacked vs side-by-side), sampled-token computed
 * styles, the chats call-preview resolution, a scrolled Center card
 * (title-clip diagnosis), and the You / Settings identity spots. Drives the REAL served preview app (Mac
 * opal-r18-preview mirror of muse/repair-18 @ 428a4a77) in Chromium at
 * 390x844, dark + light, real session data (synthetic sessions + founder
 * seed through the real APIs - no fixture painting).
 * Surfaces: splash-1, splash-2, home (OrbLockup header), center-rest
 * (orb dock presence), chats-list (DIR-1 plan-awareness variant=row),
 * thread (Next Together strip, variant=strip), call-log (ChatsHome calls
 * mode, variant=call). Geometry probes per surface; every verdict is
 * recorded in manifest.json - a missing element is reported, never hidden.
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
import {
  probeHorizontalOverflow,
  probeClippedText,
  probeHitTests,
} from "./lib/geometry.mjs";

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

async function probes(page, routeTestId, label, mode) {
  const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  const clipped = await page.evaluate(probeClippedText, `[data-testid="${routeTestId}"]`).catch(() => null);
  const dockIds = ["c2-dock-home", "c2-dock-chats", "c2-dock-center", "c2-dock-graphs", "c2-dock-you"];
  const hits = await page.evaluate(probeHitTests, dockIds.map((id) => ({ name: id, selector: `[data-testid="${id}"]` }))).catch(() => null);
  const failures = [];
  if (overflow) {
    if (overflow.docOverflow > 0) failures.push(`document horizontal overflow ${overflow.docOverflow}px`);
    if (overflow.escapees?.length) failures.push(`content viewport escapees: ${JSON.stringify(overflow.escapees.slice(0, 3))}`);
  }
  if (clipped && clipped.clipped?.length) failures.push(`clipped text: ${JSON.stringify(clipped.clipped.slice(0, 4).map((c) => c.text))}`);
  const trapped = Array.isArray(hits) ? hits.filter((h) => h.present && h.visible && h.trapped) : [];
  if (trapped.length) failures.push(`dock controls trapped: ${JSON.stringify(trapped.map((h) => h.label || h.name))}`);
  const rec = { label, mode, failures, docOverflow: overflow?.docOverflow ?? null, escapees: overflow?.escapees?.length ?? null, clippedCount: clipped?.clipped?.length ?? null, truncatedNotes: clipped?.truncated?.slice(0, 4).map((t) => t.text) ?? [] };
  manifest.surfaces.push(rec);
  console.log(mode, label, "geometry failures:", JSON.stringify(failures));
  return rec;
}

async function buildStamp(page) {
  return page.evaluate(() => ({
    gitHeadFull: document.documentElement.getAttribute("data-git-head-full"),
    badge: [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /seed ·/.test(e.textContent || ""))?.textContent?.trim() ?? null,
  })).catch(() => ({ gitHeadFull: null, badge: null }));
}

async function planAwareness(page, variant) {
  return page.evaluate((v) => {
    const els = [...document.querySelectorAll('[data-testid="plan-awareness"]')];
    const match = els.filter((e) => e.getAttribute("data-variant") === v);
    return {
      total: els.length,
      variants: els.map((e) => e.getAttribute("data-variant")),
      found: match.map((e) => {
        const r = e.getBoundingClientRect();
        const ent = e.querySelector('[data-testid="plan-awareness-entity"]');
        const pill = e.querySelector('[data-testid="plan-awareness-pill"]');
        return {
          text: e.textContent.trim(),
          planId: e.getAttribute("data-plan-id"),
          state: e.getAttribute("data-plan-state"),
          pattern: e.getAttribute("data-pattern"),
          entityBg: ent ? getComputedStyle(ent).backgroundColor : null,
          pillColor: pill ? getComputedStyle(pill).color : null,
          box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          visible: r.width > 0 && r.height > 0,
        };
      }),
    };
  }, variant).catch((e) => ({ error: String(e).slice(0, 200) }));
}

async function shot(page, name) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log("shot", name);
}

// ---------- Splash (anon, both modes) ----------
for (const mode of ["dark", "light"]) {
  const context = await newAnonContext(browser, mode, config);
  const page = await context.newPage();
  try {
    await page.goto(`${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1&opal_reset_first_run=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 }).catch(() => console.log(mode, "splash1 selector timeout"));
    await page.waitForTimeout(2500);
    const orb = await page.evaluate(() => {
      const hero = document.querySelector('[data-testid="c2-splash1-orb"]');
      const img = hero?.querySelector("img");
      const all = [...document.querySelectorAll("img")].map((i) => i.getAttribute("src")).filter(Boolean);
      return {
        heroPresent: !!hero,
        heroImg: img ? img.getAttribute("src") : null,
        heroBox: hero ? (() => { const r = hero.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
        imgs: all.slice(0, 8),
        hasOpalWordmarkText: /OPAL/.test(document.body.innerText || ""),
      };
    });
    await shot(page, `splash-1-${mode}.png`);
    await probes(page, "c2-splash1", "splash-1", mode);
    manifest.surfaces.push({ label: "splash-1-orb", mode, ...orb });
    const splashLockup = await page.evaluate(() => {
      const hero = document.querySelector('[data-testid="c2-splash1-orb"]')?.getBoundingClientRect();
      const wm = document.querySelector('[data-testid="c2-splash1-wordmark"]')?.getBoundingClientRect();
      if (!hero || !wm) return { present: false };
      return {
        present: true,
        stacked: wm.top >= hero.bottom - 4,
        centerDeltaX: Math.round(Math.abs((hero.left + hero.width / 2) - (wm.left + wm.width / 2))),
        sideBySide: wm.left >= hero.right - 4,
      };
    }).catch(() => ({ error: "probe failed" }));
    manifest.surfaces.push({ label: "splash-1-lockup-law", mode, ...splashLockup });
    console.log(mode, "splash1 lockup law:", JSON.stringify(splashLockup));
    console.log(mode, "splash1 orb:", JSON.stringify(orb));
    const cont = page.locator('[data-testid="c2-splash1-continue"]');
    if (await cont.count()) {
      await cont.click();
      await page.waitForTimeout(4000);
      await shot(page, `splash-2-${mode}.png`);
      const tids = await page.evaluate(() => [...document.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid")).slice(0, 12));
      manifest.surfaces.push({ label: "splash-2", mode, testids: tids, failures: [] });
      console.log(mode, "splash2 testids:", JSON.stringify(tids));
    } else {
      manifest.surfaces.push({ label: "splash-2", mode, failures: ["no c2-splash1-continue control"] });
      console.log(mode, "no splash1 continue");
    }
  } catch (e) {
    manifest.surfaces.push({ label: "splash", mode, failures: [String(e).slice(0, 300)] });
  }
  await context.close();
}

// ---------- Authed surfaces (both modes) ----------
for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(3000);
    manifest.buildStamp = await buildStamp(page);
    console.log(mode, "build stamp:", JSON.stringify(manifest.buildStamp));

    // Center rest (boots into Center) - orb presence: dock center + opening orb
    const centerOrb = await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="c2-dock-center"]');
      const imgs = dock ? [...dock.querySelectorAll("img,svg")].map((i) => i.getAttribute("src") || i.getAttribute("class") || i.tagName) : [];
      return { dockCenterPresent: !!dock, dockCenterMedia: imgs, dockHTML: dock ? dock.innerHTML.slice(0, 200) : null };
    });
    await shot(page, `center-rest-${mode}.png`);
    await probes(page, "c2-route-center", "center-rest", mode);
    manifest.surfaces.push({ label: "center-orb", mode, ...centerOrb });
    const harmonyTokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const disc = document.querySelector(".c2s-dock-center-disc");
      const root = document.querySelector(".c2s-root");
      return {
        canvas: cs.getPropertyValue("--canvas").trim(),
        canvasStage: cs.getPropertyValue("--canvas-stage").trim(),
        surface1: cs.getPropertyValue("--surface-1").trim(),
        accent1: cs.getPropertyValue("--accent-1").trim(),
        rootBg: root ? getComputedStyle(root).backgroundColor : null,
        dockDiscBorder: disc ? getComputedStyle(disc).borderTopColor : null,
        fireLinesInCenter: document.querySelectorAll('[data-testid="c2-route-center"] .orb-fire-line').length,
      };
    }).catch(() => ({ error: "probe failed" }));
    manifest.surfaces.push({ label: "harmony-tokens", mode, ...harmonyTokens });
    console.log(mode, "harmony tokens:", JSON.stringify(harmonyTokens));
    // Title-clip diagnosis: scroll the fold-crossing Center card fully
    // into view above the dock and re-probe + re-shoot.
    try {
      const title = page.locator('[data-testid="c2-route-center"] .c2-plan-title', { hasText: "Plan with User A" }).first();
      if (await title.count()) {
        await title.scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
        const tbox = await title.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight, textOverflow: getComputedStyle(el).textOverflow, whiteSpace: getComputedStyle(el).whiteSpace };
        });
        manifest.surfaces.push({ label: "center-card-title-scrolled", mode, ...tbox });
        console.log(mode, "center title scrolled:", JSON.stringify(tbox));
        await shot(page, `center-scrolled-${mode}.png`);
        await page.evaluate(() => document.querySelector('[data-testid="c2-route-center"] .c2s-scroll')?.scrollTo({ top: 0 }));
        await page.waitForTimeout(600);
      } else {
        manifest.surfaces.push({ label: "center-card-title-scrolled", mode, failures: ["no Plan with User A title on center route"] });
      }
    } catch (e) {
      manifest.surfaces.push({ label: "center-card-title-scrolled", mode, failures: [String(e).slice(0, 200)] });
    }
    console.log(mode, "center orb:", JSON.stringify(centerOrb).slice(0, 300));

    // Home - OrbLockup header
    await page.click('[data-testid="c2-dock-home"]');
    await page.waitForSelector('[data-testid="c2-route-home"]', { timeout: 30000 }).catch(() => console.log(mode, "home route timeout"));
    await page.waitForTimeout(2500);
    const lockup = await page.evaluate(() => {
      const home = document.querySelector('[data-testid="c2-route-home"]');
      const imgs = home ? [...home.querySelectorAll("img")].map((i) => i.getAttribute("src")).filter(Boolean) : [];
      const svgs = home ? [...home.querySelectorAll("svg")].length : 0;
      return { orbAssets: imgs.filter((s) => /brand\/orb/.test(s)), allImgs: imgs.slice(0, 6), svgCount: svgs };
    });
    await shot(page, `home-${mode}.png`);
    await probes(page, "c2-route-home", "home", mode);
    manifest.surfaces.push({ label: "home-lockup", mode, ...lockup });
    const lockupAudit = await page.evaluate(() => {
      const els = [...document.querySelectorAll("[data-orb-lockup]")];
      return {
        count: els.length,
        forms: els.map((e) => e.getAttribute("data-orb-lockup")),
        anyFullHorizontal: els.some((e) => e.getAttribute("data-orb-lockup") === "full"),
        headerText: document.querySelector('[data-testid="c2-route-home"] header')?.textContent?.trim().slice(0, 40) ?? null,
      };
    }).catch(() => ({ error: "probe failed" }));
    manifest.surfaces.push({ label: "home-lockup-law", mode, ...lockupAudit });
    console.log(mode, "home lockup law:", JSON.stringify(lockupAudit));
    console.log(mode, "home lockup:", JSON.stringify(lockup));

    // Chats list - DIR-1 row plan-awareness
    await page.click('[data-testid="c2-dock-chats"]');
    await page.waitForTimeout(3500);
    const paRow = await planAwareness(page, "row");
    if (paRow.found?.length) {
      await page.locator('[data-testid="plan-awareness"][data-variant="row"]').first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(600);
    }
    await shot(page, `chats-list-${mode}.png`);
    await probes(page, "c2-route-chats", "chats-list", mode);
    manifest.surfaces.push({ label: "chats-plan-awareness", mode, planAwareness: paRow });
    const previewAudit = await page.evaluate(() => {
      const texts = [...document.querySelectorAll('[data-testid="c2-route-chats"] .c1-session-preview')].map((e) => e.textContent.trim());
      return { previews: texts.slice(0, 8), rawCallPreviews: texts.filter((t) => t.startsWith("call:")).length };
    }).catch(() => ({ error: "probe failed" }));
    manifest.surfaces.push({ label: "chats-preview-audit", mode, ...previewAudit });
    console.log(mode, "chats previews:", JSON.stringify(previewAudit));
    console.log(mode, "chats plan-awareness:", JSON.stringify(paRow).slice(0, 500));

    // Thread - Next Together strip
    const row = page.locator('[data-testid="c2-route-chats"] >> text=Saturday Crew').first();
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(5000);
      const strip = await page.evaluate(() => {
        const s = document.querySelector('[data-testid="next-together-strip"]');
        return { present: !!s, text: s ? s.textContent.trim().slice(0, 200) : null };
      });
      const paStrip = await planAwareness(page, "strip");
      await shot(page, `thread-${mode}.png`);
      manifest.surfaces.push({ label: "thread-next-together", mode, strip, planAwareness: paStrip });
      console.log(mode, "thread strip:", JSON.stringify(strip), "pa:", JSON.stringify(paStrip).slice(0, 400));
      // back to chats list
      await page.goBack().catch(() => {});
      await page.waitForTimeout(2500);
      if (!(await page.locator('[data-testid="c2-route-chats"]').count())) {
        await page.click('[data-testid="c2-dock-chats"]').catch(() => {});
        await page.waitForTimeout(2500);
      }
    } else {
      manifest.surfaces.push({ label: "thread-next-together", mode, failures: ["no Saturday Crew conversation row in chats host"] });
      console.log(mode, "no conversation row found");
    }

    // You hub + Settings identity spot (orb mono mark, single element)
    try {
      await page.click('[data-testid="c2-dock-you"]');
      await page.waitForTimeout(3000);
      await shot(page, `you-${mode}.png`);
      const appRow = page.locator("text=Appearance").first();
      let settingsMark = { opened: false, markPresent: false };
      if (await appRow.count()) {
        await appRow.click();
        await page.waitForTimeout(2500);
        settingsMark = await page.evaluate(() => ({
          opened: true,
          markPresent: !!document.querySelector('[data-orb="settings-header-mark"]'),
          lockups: [...document.querySelectorAll("[data-orb-lockup]")].map((e) => e.getAttribute("data-orb-lockup")),
        })).catch(() => ({ opened: true, markPresent: false }));
        await shot(page, `settings-${mode}.png`);
      }
      manifest.surfaces.push({ label: "settings-identity", mode, ...settingsMark });
      console.log(mode, "settings identity:", JSON.stringify(settingsMark));
      await page.click('[data-testid="c2-dock-chats"]').catch(() => {});
      await page.waitForTimeout(2500);
    } catch (e) {
      manifest.surfaces.push({ label: "settings-identity", mode, failures: [String(e).slice(0, 200)] });
    }

    // Call log - ChatsHome calls mode
    const callsBtn = page.locator('[data-testid="comm-mode-calls"]');
    if (await callsBtn.count()) {
      await callsBtn.click();
      await page.waitForTimeout(3500);
      const paCall = await planAwareness(page, "call");
      if (paCall.found?.length) {
        await page.locator('[data-testid="plan-awareness"][data-variant="call"]').first().scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(600);
      }
      await shot(page, `call-log-${mode}.png`);
      await probes(page, "c2-route-chats", "call-log", mode);
      manifest.surfaces.push({ label: "call-log-plan-awareness", mode, planAwareness: paCall });
      console.log(mode, "call-log plan-awareness:", JSON.stringify(paCall).slice(0, 500));
    } else {
      manifest.surfaces.push({ label: "call-log-plan-awareness", mode, failures: ["comm-mode-calls control not found on chats route"] });
      console.log(mode, "no comm-mode-calls control");
    }
  } catch (e) {
    console.log(mode, "ERROR", String(e).slice(0, 400));
    manifest.surfaces.push({ label: "mode-run", mode, failures: [String(e).slice(0, 300)] });
    await page.screenshot({ path: path.join(OUT, `error-${mode}.png`) }).catch(() => {});
  }
  await context.close();
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", OUT);
await browser.close();
