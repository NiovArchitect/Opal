#!/usr/bin/env node
/**
 * Repair #18 FULL PACK - TOP-UP (companion to fullpack-capture.mjs).
 * Closes the four gaps the main run recorded honestly:
 *  1. Center deck lit reveal - plan reveals render inside plan cards,
 *     so the lit element is located by its FireFrame, not by
 *     [data-testid="reveal-card"][data-lit].
 *  2. Call log - the C2 chats route carries no comm-mode-calls
 *     control on this build; the surface as served is the R17-path
 *     ChatsHome calls mode (?shell=r17), exactly as step0-calllog
 *     captured it.
 *  3. Delete account ARMED state - dump the section's controls,
 *     click ONLY the arm control, never the confirm/execute.
 *  4. Someday shelf starter - created through the real API first:
 *     a saved Celebration (POST /celebrations) 15 days out derives a
 *     starter with its basis line at read time (GraphPeople.shelf).
 * Sessions are provisioned synthetically; the founder seed is NOT
 * called again (the main run's single seed set stands; seed data
 * persists in the shared dev DB).
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
const { sessions } = await provisionRenderedSessions(config);
const manifest = { topup: true, build_tag: config.buildTag, surfaces: [], setup: {} };
const save = () => fs.writeFileSync(path.join(OUT, "manifest-topup.json"), JSON.stringify(manifest, null, 2));

// celebration -> shelf starter (real API)
const A = new ApiClient(config, sessions.a);
try {
  const cel = await A.post("/celebrations", { person_name: "Maya Torres", kind: "birthday", month: 11, day: 2 });
  manifest.setup.celebrationStatus = cel.status;
  manifest.setup.celebration = cel.json.celebration || cel.json;
  const shelf = await A.get("/graph/shelf");
  manifest.setup.shelfStatus = shelf.status;
  manifest.setup.starters = (shelf.json.starters || []).map((s) => ({ id: s.id, title: s.title, basis_line: s.basis_line }));
  console.log("starters:", JSON.stringify(manifest.setup.starters));
} catch (e) {
  manifest.setup.error = String(e).slice(0, 300);
  console.log("SETUP ERROR", manifest.setup.error);
}
save();

const shellPath =
  process.env.HARMONY2_CHROMIUM ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-x64/chrome-headless-shell`;
const browser = await chromium.launch({ headless: true, executablePath: shellPath });
const stamp = (page) => page.evaluate(() => document.documentElement.getAttribute("data-git-head-full")).catch(() => null);
async function probes(page, rootSel) {
  const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
  const clipped = rootSel ? await page.evaluate(probeClippedText, rootSel).catch(() => null) : null;
  const lockups = await page.evaluate(() => [...document.querySelectorAll("[data-orb-lockup]")].map((e) => e.getAttribute("data-orb-lockup"))).catch(() => []);
  return {
    stamp: await stamp(page),
    docOverflow: overflow?.docOverflow ?? null,
    clippedCount: clipped ? clipped.clipped.length : null,
    clippedSample: (clipped?.clipped ?? []).slice(0, 3).map((c) => c.text),
    lockups, fullCount: lockups.filter((v) => v === "full").length,
  };
}

for (const mode of ["dark", "light"]) {
  // ---- 1. deck lit reveal via FireFrame ----
  {
    const context = await newAuthedContext(browser, config, sessions.a, mode);
    const page = await context.newPage();
    try {
      await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
      await page.waitForTimeout(3000);
      await page.locator('[data-testid="c2-dock-center"]:visible').first().click();
      await page.waitForTimeout(3500);
      const probe = await page.evaluate(() => {
        const frames = [...document.querySelectorAll('[data-testid="reveal-fire-frame"]')];
        return frames.map((f) => {
          const card = f.closest('[data-testid="reveal-card"], [data-testid="c2-plan-card"], .c2s-card, section, article') || f.parentElement;
          const r = f.getBoundingClientRect();
          return { text: (card?.textContent || "").trim().slice(0, 160), box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
        });
      });
      manifest.surfaces.push({ label: "center-deck-fireframes", mode, frames: probe });
      console.log(mode, "fireframes:", JSON.stringify(probe).slice(0, 400));
      const fire = page.locator('[data-testid="reveal-fire-frame"]').first();
      if (await fire.count()) {
        await fire.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(900);
        await page.screenshot({ path: path.join(OUT, `center-deck-lit-reveal-${mode}.png`) });
        manifest.surfaces.push({ label: "center-deck-lit-reveal", mode, file: `center-deck-lit-reveal-${mode}.png`, ...(await probes(page, '[data-testid="c2-center-opening"]')) });
        await fire.screenshot({ path: path.join(OUT, `fireframe-element-${mode}.png`) }).catch(() => {});
        manifest.surfaces.push({ label: "fireframe-element", mode, file: `fireframe-element-${mode}.png`, stamp: await stamp(page) });
        console.log(mode, "lit reveal + fireframe captured");
      } else {
        manifest.surfaces.push({ label: "center-deck-lit-reveal", mode, failures: ["no reveal-fire-frame on deck"] });
      }
      // ---- 4. shelf with starter ----
      await page.locator('[data-testid="c2-dock-graphs"]:visible').first().click();
      await page.waitForTimeout(3000);
      const shelfEl = page.locator('[data-testid="c2-graphs-shelf"]').first();
      if (await shelfEl.count()) {
        await shelfEl.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(900);
        const shelfProbe = await page.evaluate(() => {
          const s = document.querySelector('[data-testid="c2-graphs-shelf"]');
          return { text: (s?.textContent || "").trim().slice(0, 500), starters: s ? s.querySelectorAll('[data-testid="c2-starter-start"]').length : 0 };
        });
        await page.screenshot({ path: path.join(OUT, `graphs-someday-shelf-${mode}.png`) });
        manifest.surfaces.push({ label: "graphs-someday-shelf", mode, file: `graphs-someday-shelf-${mode}.png`, shelf: shelfProbe, ...(await probes(page, '[data-testid="c2-graphs"]')) });
        console.log(mode, "shelf:", JSON.stringify(shelfProbe).slice(0, 200));
      }
      // ---- 3. delete account armed ----
      await page.locator('[data-testid="c2-dock-you"]:visible').first().click();
      await page.waitForTimeout(3000);
      const row = page.locator('[data-testid="c2-you-row-delete-account"]').first();
      if (await row.count()) {
        await row.scrollIntoViewIfNeeded().catch(() => {});
        await row.click().catch(() => {});
        await page.waitForTimeout(2600);
        const dump = await page.evaluate(() =>
          [...document.querySelectorAll('[data-testid^="c2-delete"], [data-testid="c2-you"] [data-testid]')].map((e) => e.getAttribute("data-testid")).slice(0, 30),
        ).catch(() => []);
        let armed = false, confirmVisible = false;
        const arm = page.locator('[data-testid="c2-delete-arm"]');
        if (await arm.count()) {
          await arm.scrollIntoViewIfNeeded().catch(() => {});
          await arm.click().catch(() => {});
          await page.waitForTimeout(1200);
          armed = true;
          confirmVisible = await page.evaluate(() => Boolean(document.querySelector('[data-testid="c2-delete-confirm"]'))).catch(() => false);
        }
        await page.screenshot({ path: path.join(OUT, `you-delete-account-${mode}.png`) });
        manifest.surfaces.push({ label: "you-delete-account", mode, file: `you-delete-account-${mode}.png`, armed, confirmVisible, sectionTestids: dump, note: "ARMED ONLY - confirm/execute NOT clicked; nothing deleted", ...(await probes(page, '[data-testid="c2-route-you"]')) });
        console.log(mode, "delete armed:", armed, "confirmVisible:", confirmVisible, "testids:", JSON.stringify(dump).slice(0, 200));
      } else {
        manifest.surfaces.push({ label: "you-delete-account", mode, failures: ["delete-account row not found"] });
      }
    } catch (e) {
      manifest.surfaces.push({ label: "topup-authed", mode, failures: [String(e).slice(0, 300)] });
      console.log(mode, "TOPUP ERROR", String(e).slice(0, 250));
    }
    await context.close();
  }
  // ---- 2. call log via the R17 path (as served) ----
  {
    const context = await newAuthedContext(browser, config, sessions.a, mode);
    const page = await context.newPage();
    try {
      await page.goto(`${config.webBase}/?shell=r17&opal_founder_seed=1&opal_native_host=1&opal_dev=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(6000);
      if (!(await page.locator('[data-testid="chats-home"], [data-testid="calls-continuity-home"]').count())) {
        const cand = page.locator('[data-testid="dock-chats"], [data-testid="tab-chats"], [data-testid="nav-chats"], [data-testid="member-tab-chats"]').first();
        if (await cand.count()) await cand.click().catch(() => {});
        else {
          const byText = page.getByText("Chats", { exact: true }).last();
          if (await byText.count()) await byText.click().catch(() => {});
        }
        await page.waitForTimeout(4000);
      }
      const callsBtn = page.locator('[data-testid="comm-mode-calls"]');
      if (await callsBtn.count()) {
        await callsBtn.click();
        await page.waitForTimeout(4000);
        const info = await page.evaluate(() => {
          const els = [...document.querySelectorAll('[data-testid="plan-awareness"]')].filter((e) => e.getAttribute("data-variant") === "call");
          return {
            listPresent: Boolean(document.querySelector('[data-testid="calls-continuity-list"]')),
            rows: document.querySelectorAll('[data-testid^="calls-row-"]').length,
            found: els.map((e) => ({ planId: e.getAttribute("data-plan-id"), state: e.getAttribute("data-plan-state"), text: (e.textContent || "").trim().slice(0, 120) })),
          };
        });
        if (info.found.length) {
          await page.locator('[data-testid="plan-awareness"][data-variant="call"]').first().scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(700);
        }
        await page.screenshot({ path: path.join(OUT, `call-log-${mode}.png`) });
        manifest.surfaces.push({ label: "call-log", mode, file: `call-log-${mode}.png`, path: "r17-shell ChatsHome calls mode (as served)", callLog: info, ...(await probes(page, '[data-testid="calls-continuity-home"]')) });
        console.log(mode, "call-log:", JSON.stringify(info).slice(0, 300));
      } else {
        manifest.surfaces.push({ label: "call-log", mode, failures: ["comm-mode-calls not found in R17 shell either"] });
        await page.screenshot({ path: path.join(OUT, `call-log-missing-${mode}.png`) }).catch(() => {});
      }
    } catch (e) {
      manifest.surfaces.push({ label: "call-log", mode, failures: [String(e).slice(0, 300)] });
      console.log(mode, "CALLLOG ERROR", String(e).slice(0, 250));
    }
    await context.close();
  }
  save();
}
save();
console.log("TOPUP DONE");
await browser.close();
