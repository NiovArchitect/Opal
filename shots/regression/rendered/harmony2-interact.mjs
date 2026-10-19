#!/usr/bin/env node
/**
 * Repair #18 HARMONY2 - interaction proof for the two functional
 * completions, driven through the real UI on the served build:
 *  6a: create a goal in Graphs, open its plan picker (plans listed
 *      from the owner's real plan store), link a plan, read back the
 *      goal's changed status line.
 *  6b: ask Center chat "What are you holding for me?" - the holding
 *      answer renders its per-figure chips; tapping the memories
 *      chip routes to You > What Opal remembers.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  newAuthedContext,
} from "./lib/browser.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });
const config = loadRenderedConfig(process.env);
const { sessions } = await provisionRenderedSessions(config);
const shellPath =
  process.env.HARMONY2_CHROMIUM ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-x64/chrome-headless-shell`;
const browser = await chromium.launch({ headless: true, executablePath: shellPath });
const result = { stamp: null, goal: {}, holding: {} };

const context = await newAuthedContext(browser, config, sessions.a, "dark");
const page = await context.newPage();
await page.goto(`${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await page.waitForTimeout(5000);
result.stamp = await page.evaluate(() =>
  document.documentElement.getAttribute("data-git-head-full"),
);

// ---- 6a: goal picker ----
await page.locator('[data-testid="c2-dock-graphs"]').click();
await page.waitForTimeout(3000);
const titleInput = page.locator('[data-testid="c2-goal-title"]');
result.goal.formPresent = (await titleInput.count()) > 0;
if (result.goal.formPresent) {
  await titleInput.fill("Harmony proof goal");
  await page.locator('[data-testid="c2-goal-save"]').click();
  await page.waitForTimeout(3000);
  result.goal.created = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="c2-graphs-goals"] *')].some((e) =>
      (e.textContent || "").includes("Harmony proof goal"),
    ),
  );
  const picker = page.locator('[data-testid^="c2-goal-picker-"]').first();
  result.goal.pickerPresent = (await picker.count()) > 0;
  if (result.goal.pickerPresent) {
    await picker.click();
    await page.waitForTimeout(1200);
    result.goal.linkButtons = await page
      .locator('[data-testid^="c2-goal-link-"]')
      .count();
    await page.screenshot({ path: path.join(OUT, "interact-goal-picker-dark.png") });
    if (result.goal.linkButtons > 0) {
      const before = await page.evaluate(
        () =>
          document.querySelector('[data-testid="c2-graphs-goals"]')?.textContent ?? "",
      );
      await page.locator('[data-testid^="c2-goal-link-"]').first().click();
      await page.waitForTimeout(3000);
      const after = await page.evaluate(
        () =>
          document.querySelector('[data-testid="c2-graphs-goals"]')?.textContent ?? "",
      );
      result.goal.statusChanged = before !== after;
      result.goal.unlinkAfterLink = await page
        .locator('[data-testid^="c2-goal-unlink-"]')
        .count();
      await page.screenshot({ path: path.join(OUT, "interact-goal-linked-dark.png") });
    }
  }
}

// ---- 6b: holding chips ----
await page.locator('[data-testid="c2-dock-center"]').click();
await page.waitForTimeout(3000);
const talk = page.locator('[data-testid="c2-opening-talk"]');
result.holding.talkPresent = (await talk.count()) > 0;
if (result.holding.talkPresent) {
  await talk.click();
  await page.waitForTimeout(3500);
  const input = page.locator('[data-testid="center-chat"] .c1-composer-input');
  result.holding.composerPresent = (await input.count()) > 0;
  if (result.holding.composerPresent) {
    await input.fill("What are you holding for me?");
    await input.press("Enter");
    await page.waitForTimeout(6000);
    result.holding.chips = await page.locator('[data-testid^="holding-chip-"]').count();
    result.holding.chipLabels = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="holding-chip-"]')].map((e) => ({
        id: e.getAttribute("data-testid"),
        label: e.textContent,
      })),
    );
    await page.screenshot({ path: path.join(OUT, "interact-holding-chips-dark.png") });
    const memChip = page.locator('[data-testid="holding-chip-memories_held"]');
    if ((await memChip.count()) > 0) {
      await memChip.click();
      await page.waitForTimeout(3000);
      result.holding.afterTap = await page.evaluate(() => ({
        routeYou: Boolean(document.querySelector('[data-testid="c2-route-you"]')),
        sectionText: (
          document.querySelector('[data-testid="c2-route-you"]')?.textContent ?? ""
        ).slice(0, 120),
      }));
      await page.screenshot({ path: path.join(OUT, "interact-holding-tap-dark.png") });
    }
  }
}

fs.writeFileSync(path.join(OUT, "interact.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
