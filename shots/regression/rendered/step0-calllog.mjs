#!/usr/bin/env node
/**
 * Repair #18 STEP 0 - call-log capture. The DIR-1 plan-awareness "call"
 * variant ships in ChatsHome, which renders in the R17 shell. Real
 * navigation path in the served app: the shell's own documented QA
 * override ?shell=r17 (theme/c2Shell.ts) -> legacy dock -> Chats tab ->
 * ChatsHome mode bar -> Calls (comm-mode-calls) -> calls-continuity-list.
 * Data: synthetic sessions + founder seed through the real APIs, plus a
 * real call placed through POST /calls (the same setup the permanent
 * DIR-1 API case fr18-dir1-01 uses) so the call log has a real row whose
 * peer shares an upcoming plan. Nothing is painted or fixture-fed.
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

for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(`${config.webBase}/?shell=r17&opal_founder_seed=1&opal_native_host=1&opal_dev=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(5000);
    const stamp = await page.evaluate(() => document.documentElement.getAttribute("data-git-head-full"));
    console.log(mode, "r17 stamp:", stamp);
    // Find the chats surface: already there, or via the legacy dock/nav.
    if (!(await page.locator('[data-testid="chats-home"], [data-testid="calls-continuity-home"]').count())) {
      const navInfo = await page.evaluate(() =>
        [...document.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid")).filter((t) => /dock|tab|nav|chats/i.test(t)).slice(0, 30),
      );
      console.log(mode, "nav testids:", JSON.stringify(navInfo));
      const cand = page.locator('[data-testid="dock-chats"], [data-testid="tab-chats"], [data-testid="nav-chats"]').first();
      if (await cand.count()) await cand.click();
      else {
        const byText = page.getByText("Chats", { exact: true }).last();
        if (await byText.count()) await byText.click();
      }
      await page.waitForTimeout(4000);
    }
    const homePresent = await page.locator('[data-testid="chats-home"], [data-testid="calls-continuity-home"]').count();
    console.log(mode, "chats-home present:", homePresent);
    const callsBtn = page.locator('[data-testid="comm-mode-calls"]');
    if (await callsBtn.count()) {
      await callsBtn.click();
      await page.waitForTimeout(4000);
    } else {
      console.log(mode, "NO comm-mode-calls in r17 shell");
      manifest.surfaces.push({ label: "call-log-plan-awareness", mode, failures: ["comm-mode-calls not found in R17 shell"] });
      await page.screenshot({ path: path.join(OUT, `call-log-missing-${mode}.png`) }).catch(() => {});
      await context.close();
      continue;
    }
    const info = await page.evaluate(() => {
      const els = [...document.querySelectorAll('[data-testid="plan-awareness"]')];
      const call = els.filter((e) => e.getAttribute("data-variant") === "call");
      return {
        listPresent: !!document.querySelector('[data-testid="calls-continuity-list"]'),
        rowCount: document.querySelectorAll('[data-testid^="calls-row-"]').length,
        total: els.length,
        found: call.map((e) => {
          const r = e.getBoundingClientRect();
          const ent = e.querySelector('[data-testid="plan-awareness-entity"]');
          return {
            text: e.textContent.trim(),
            planId: e.getAttribute("data-plan-id"),
            state: e.getAttribute("data-plan-state"),
            pattern: e.getAttribute("data-pattern"),
            entityBg: ent ? getComputedStyle(ent).backgroundColor : null,
            box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
            visible: r.width > 0 && r.height > 0,
          };
        }),
      };
    });
    console.log(mode, "call-log info:", JSON.stringify(info).slice(0, 600));
    if (info.found.length) {
      await page.locator('[data-testid="plan-awareness"][data-variant="call"]').first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `call-log-${mode}.png`) });
    console.log("shot", `call-log-${mode}.png`);
    const overflow = await page.evaluate(probeHorizontalOverflow).catch(() => null);
    const clipped = await page.evaluate(probeClippedText, '[data-testid="calls-continuity-home"]').catch(() => null);
    const failures = [];
    if (overflow?.docOverflow > 0) failures.push(`document horizontal overflow ${overflow.docOverflow}px`);
    if (overflow?.escapees?.length) failures.push(`content viewport escapees: ${JSON.stringify(overflow.escapees.slice(0, 3))}`);
    if (clipped?.clipped?.length) failures.push(`clipped text: ${JSON.stringify(clipped.clipped.slice(0, 4).map((c) => c.text))}`);
    manifest.surfaces.push({ label: "call-log-plan-awareness", mode, stamp, planAwareness: info, failures, docOverflow: overflow?.docOverflow ?? null, escapees: overflow?.escapees?.length ?? null, clippedCount: clipped?.clipped?.length ?? null });
    console.log(mode, "call-log geometry failures:", JSON.stringify(failures));
  } catch (e) {
    console.log(mode, "ERROR", String(e).slice(0, 400));
    manifest.surfaces.push({ label: "call-log-plan-awareness", mode, failures: [String(e).slice(0, 300)] });
    await page.screenshot({ path: path.join(OUT, `call-log-error-${mode}.png`) }).catch(() => {});
  }
  await context.close();
}
fs.writeFileSync(path.join(OUT, "manifest-calllog.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", OUT);
await browser.close();
