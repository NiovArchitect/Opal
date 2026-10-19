#!/usr/bin/env node
/**
 * Repair #18 THEME UNIFICATION - capture + probes for the surfaces the
 * founder flagged in the legacy (R17) presentation of the ChatsHome
 * family, plus the C2 dock halo inspection.
 *
 * Legacy path (the ONLY place the call log exists): ?shell=r17 ->
 * legacy dock -> Chats -> ChatsHome (chats list), mode bar -> Calls
 * (call log), row tap -> member-conversation thread. C2 path: default
 * served shell -> dock close-up for the halo gate.
 *
 * Probes: geometry (overflow/clipped), DOCK HALO (sample the dock top
 * border line across x: the line must be ABSENT in the center-orb zone
 * and PRESENT outside it - read from computed borders / pseudo styles
 * plus a pixel scan of the screenshot row at the border's y), computed
 * treatments (row/avatar/pill/bubble colors), and PlanAwareness drift
 * (every variant's --pa-state must equal PLAN_STATE_HEX for its state).
 */
import fs from "node:fs";
import path from "node:path";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  launchBrowser,
  newAuthedContext,
} from "./lib/browser.mjs";
import { probeHorizontalOverflow, probeClippedText } from "./lib/geometry.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });
const config = loadRenderedConfig(process.env);
const { sessions } = await provisionRenderedSessions(config);
const browser = await launchBrowser();
const manifest = { build_tag: config.buildTag, web: config.webBase, api: config.apiBase, surfaces: [] };

const CANON = { forming: "rgb(139, 92, 246)", happening: "rgb(0, 229, 255)", ready: "rgb(255, 200, 107)", action: "rgb(255, 77, 94)", past: "rgb(255, 255, 255)" };

async function commonProbes(page, rootSel, label, mode) {
  const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  const clipped = await page.evaluate(probeClippedText, rootSel).catch(() => null);
  const failures = [];
  if (overflow?.docOverflow > 0) failures.push(`document horizontal overflow ${overflow.docOverflow}px`);
  if (overflow?.escapees?.length) failures.push(`escapees: ${JSON.stringify(overflow.escapees.slice(0, 3))}`);
  if (clipped?.clipped?.length) failures.push(`clipped: ${JSON.stringify(clipped.clipped.slice(0, 4).map((c) => c.text))}`);
  return { failures, docOverflow: overflow?.docOverflow ?? null, clippedCount: clipped?.clipped?.length ?? null };
}

/** PlanAwareness drift: computed pill color + border per element. */
async function driftProbe(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('[data-testid="plan-awareness"]')].map((e) => {
      const pill = e.querySelector('[data-testid="plan-awareness-pill"]');
      const cs = getComputedStyle(e);
      const pillCs = pill ? getComputedStyle(pill) : null;
      return {
        variant: e.getAttribute("data-variant"),
        state: e.getAttribute("data-plan-state"),
        pattern: e.getAttribute("data-pattern"),
        borderTopColor: cs.borderTopColor,
        borderTopStyle: cs.borderTopStyle,
        pillColor: pillCs ? pillCs.color : null,
        entityBg: (() => { const ent = e.querySelector('[data-testid="plan-awareness-entity"]'); return ent ? getComputedStyle(ent).backgroundColor : null; })(),
      };
    });
  }).catch(() => []);
}

for (const mode of ["dark", "light"]) {
  // ---------- C2 surfaces: home + chats + thread + dock halo ----------
  {
    const context = await newAuthedContext(browser, config, sessions.a, mode);
    const page = await context.newPage();
    try {
      await page.goto(`${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(5000);
      const stamp = await page.evaluate(() => document.documentElement.getAttribute("data-git-head-full"));
      // Home
      const homeBtn = page.locator('[data-testid="c2-dock-home"]');
      if (await homeBtn.count()) { await homeBtn.click(); await page.waitForTimeout(3500); }
      let halo = await page.evaluate(() => {
        const dock = document.querySelector('[data-testid="c2-dock"]');
        const disc = document.querySelector(".c2s-dock-center-disc");
        if (!dock || !disc) return null;
        const dr = dock.getBoundingClientRect(); const cr = disc.getBoundingClientRect();
        const cs = getComputedStyle(dock);
        const before = getComputedStyle(dock, "::before"); const after = getComputedStyle(dock, "::after");
        return {
          dockBorderTopColor: cs.borderTopColor,
          before: { borderTopColor: before.borderTopColor, width: before.width, left: before.left },
          after: { borderTopColor: after.borderTopColor, width: after.width },
          discZone: { left: Math.round(cr.left - dr.left), right: Math.round(cr.right - dr.left), top: Math.round(cr.top - dr.top) },
          dockW: Math.round(dr.width),
        };
      }).catch(() => null);
      await page.screenshot({ path: path.join(OUT, `home-${mode}.png`) });
      const homeProbe = await page.evaluate(() => {
        return [...document.querySelectorAll('[data-testid="c2-plan-card"]')].slice(0, 6).map((c) => {
          const cs = getComputedStyle(c);
          const pill = c.querySelector('[data-testid="c2-plan-state-pill"]');
          return { state: c.getAttribute("data-plan-state"), borderTopColor: cs.borderTopColor, borderTopStyle: cs.borderTopStyle, boxShadow: cs.boxShadow.slice(0, 80), pillColor: pill ? getComputedStyle(pill).color : null };
        });
      }).catch(() => []);
      const hp = await commonProbes(page, '[data-testid="c2-route-home"]', `home-${mode}`, mode);
      manifest.surfaces.push({ label: "home", mode, stamp, halo, planCards: homeProbe, drift: await driftProbe(page), ...hp });
      // Chats (C1 list inside C2)
      const chatsBtn = page.locator('[data-testid="c2-dock-chats"]');
      if (await chatsBtn.count()) { await chatsBtn.click(); await page.waitForTimeout(3500); }
      await page.screenshot({ path: path.join(OUT, `chats-list-c2-${mode}.png`) });
      const cp = await commonProbes(page, '[data-testid="c2-c1-chats-host"]', `chats-list-c2-${mode}`, mode);
      manifest.surfaces.push({ label: "chats-list-c2", mode, stamp, drift: await driftProbe(page), ...cp });
      // Thread (first row)
      const row = page.locator(".c1-chat-row").first();
      if (await row.count()) { await row.click(); await page.waitForTimeout(3500); }
      await page.screenshot({ path: path.join(OUT, `thread-c2-${mode}.png`) });
      const tp = await commonProbes(page, '[data-testid="c2-c1-chats-host"]', `thread-c2-${mode}`, mode);
      manifest.surfaces.push({ label: "thread-c2", mode, stamp, drift: await driftProbe(page), ...tp });
      // Dock close-up (halo inspection at capture scale)
      const dockEl = page.locator('[data-testid="c2-dock"]');
      if (await dockEl.count()) {
        const box = await dockEl.boundingBox();
        if (box) await page.screenshot({ path: path.join(OUT, `dock-c2-closeup-${mode}.png`), clip: { x: Math.max(0, box.x - 6), y: Math.max(0, box.y - 34), width: box.width + 12, height: box.height + 40 } }).catch(() => {});
      }
    } catch (e) {
      manifest.surfaces.push({ label: "c2", mode, failures: [String(e).slice(0, 300)] });
      await page.screenshot({ path: path.join(OUT, `c2-error-${mode}.png`) }).catch(() => {});
    }
    await context.close();
  }

  // ---------- R17 legacy: chats list, call log, thread ----------
  {
    const context = await newAuthedContext(browser, config, sessions.a, mode);
    const page = await context.newPage();
    try {
      await page.goto(`${config.webBase}/?shell=r17&opal_founder_seed=1&opal_native_host=1&opal_dev=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(5000);
      const stamp = await page.evaluate(() => document.documentElement.getAttribute("data-git-head-full"));
      if (!(await page.locator('[data-testid="chats-home"], [data-testid="calls-continuity-home"]').count())) {
        const cand = page.locator('[data-testid="dock-chats"], [data-testid="tab-chats"], [data-testid="nav-chats"]').first();
        if (await cand.count()) await cand.click();
        else { const byText = page.getByText("Chats", { exact: true }).last(); if (await byText.count()) await byText.click(); }
        await page.waitForTimeout(4000);
      }
      // Legacy dock halo probe: the dock-bar ::before ring + its mask.
      const legacyHalo = await page.evaluate(() => {
        const bar = document.querySelector(".tabbar-option-b .dock-bar");
        if (!bar) return null;
        const before = getComputedStyle(bar, "::before");
        const after = getComputedStyle(bar, "::after");
        const barCs = getComputedStyle(bar);
        const opal = document.querySelector(".tabbar-option-b .dock-opal");
        const br = bar.getBoundingClientRect(); const or_ = opal ? opal.getBoundingClientRect() : null;
        return {
          ringBackground: before.backgroundImage.slice(0, 120),
          barBorderTopColor: barCs.borderTopColor,
          barBorderLeftColor: barCs.borderLeftColor,
          segmentBefore: { width: before.width, borderTopColor: before.borderTopColor },
          segmentAfter: { width: after.width, borderTopColor: after.borderTopColor },
          opalZone: or_ ? { left: Math.round(or_.left - br.left), right: Math.round(or_.right - br.left) } : null,
          barW: Math.round(br.width),
        };
      }).catch(() => null);
      await page.screenshot({ path: path.join(OUT, `chats-list-${mode}.png`) });
      const listTreat = await page.evaluate(() => {
        const row = document.querySelector(".chats-home-row");
        const av = document.querySelector(".chats-home-avatar");
        const pill = document.querySelector(".chats-plan-pill");
        const conn = document.querySelector(".chats-home-connection");
        const out = {};
        if (row) { const cs = getComputedStyle(row); out.row = { bg: cs.backgroundColor, borderTopColor: cs.borderTopColor, borderTopWidth: cs.borderTopWidth }; }
        if (av) { const cs = getComputedStyle(av); out.avatar = { bg: (cs.backgroundImage || cs.backgroundColor).slice(0, 120) }; }
        if (pill) { const cs = getComputedStyle(pill); out.pill = { state: pill.getAttribute("data-plan-state"), bg: cs.backgroundColor, color: cs.color, borderTopColor: cs.borderTopColor }; }
        if (conn) out.connectionColor = getComputedStyle(conn).color;
        return out;
      }).catch(() => ({}));
      const lp = await commonProbes(page, '[data-testid="chats-home"]', `chats-list-${mode}`, mode);
      manifest.surfaces.push({ label: "chats-list", mode, stamp, legacyHalo, treatments: listTreat, drift: await driftProbe(page), ...lp });
      // Legacy dock close-up
      const dockEl2 = page.locator(".tabbar-option-b").first();
      if (await dockEl2.count()) {
        const box = await dockEl2.boundingBox();
        if (box) await page.screenshot({ path: path.join(OUT, `dock-legacy-closeup-${mode}.png`), clip: { x: Math.max(0, box.x - 4), y: Math.max(0, box.y - 10), width: box.width + 8, height: box.height + 14 } }).catch(() => {});
      }
      // Call log
      const callsBtn = page.locator('[data-testid="comm-mode-calls"]');
      if (await callsBtn.count()) { await callsBtn.click(); await page.waitForTimeout(4000); }
      await page.screenshot({ path: path.join(OUT, `call-log-${mode}.png`) });
      const callTreat = await page.evaluate(() => {
        const row = document.querySelector(".calls-continuity-row");
        const av = document.querySelector(".calls-row-avatar");
        const out = {};
        if (row) { const cs = getComputedStyle(row); out.row = { bg: cs.backgroundColor, borderTopColor: cs.borderTopColor, borderTopWidth: cs.borderTopWidth, boxShadow: cs.boxShadow.slice(0, 90) }; }
        if (av) { const cs = getComputedStyle(av); out.avatar = { bg: (cs.backgroundImage || cs.backgroundColor).slice(0, 120), shadow: cs.boxShadow.slice(0, 90) }; }
        return out;
      }).catch(() => ({}));
      const cap = await commonProbes(page, '[data-testid="calls-continuity-home"]', `call-log-${mode}`, mode);
      manifest.surfaces.push({ label: "call-log", mode, stamp, treatments: callTreat, drift: await driftProbe(page), ...cap });
      // Legacy thread: back to chats, open first row
      const chatsBtn2 = page.locator('[data-testid="comm-mode-chats"]');
      if (await chatsBtn2.count()) { await chatsBtn2.click(); await page.waitForTimeout(2500); }
      const firstRow = page.locator('[data-testid^="chats-row-"]').first();
      if (await firstRow.count()) {
        // The list re-renders after the mode switch; a first click can
        // land on a stale row. Retry until the thread actually opens.
        for (let attempt = 0; attempt < 3; attempt++) {
          await firstRow.click().catch(() => {});
          await page.waitForTimeout(2500);
          if (await page.locator('[data-testid="member-conversation"]').count()) break;
        }
        await page.waitForTimeout(1500);
      }
      await page.screenshot({ path: path.join(OUT, `thread-${mode}.png`) });
      const threadTreat = await page.evaluate(() => {
        const bin = document.querySelector(".bubble.in"); const bout = document.querySelector(".bubble.out");
        const read = (el) => el ? { bg: getComputedStyle(el).backgroundColor, borderTopColor: getComputedStyle(el).borderTopColor, borderTopWidth: getComputedStyle(el).borderTopWidth } : null;
        return { in: read(bin), out: read(bout), present: !!document.querySelector('[data-testid="member-conversation"]') };
      }).catch(() => ({}));
      const thp = await commonProbes(page, '[data-testid="member-conversation"]', `thread-${mode}`, mode);
      manifest.surfaces.push({ label: "thread", mode, stamp, treatments: threadTreat, drift: await driftProbe(page), ...thp });
    } catch (e) {
      manifest.surfaces.push({ label: "r17", mode, failures: [String(e).slice(0, 300)] });
      await page.screenshot({ path: path.join(OUT, `r17-error-${mode}.png`) }).catch(() => {});
    }
    await context.close();
  }
}
fs.writeFileSync(path.join(OUT, "manifest-unify.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", OUT);
await browser.close();
