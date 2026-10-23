#!/usr/bin/env node
/** R28 W28-13 probe: what exactly is the Flows scroller's last
 *  element at max scroll, and where does the last feed card rest? */
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  launchBrowser,
  newAuthedContext,
  entryUrl,
} from "./lib/browser.mjs";

const config = loadRenderedConfig(process.env);
const { sessions } = await provisionRenderedSessions(config);
const browser = await launchBrowser();
const ctx = await newAuthedContext(browser, config, sessions.a, "light");
const page = await ctx.newPage();
await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 45000 });
await page.waitForTimeout(2000);
await page.locator('[data-testid="c2-dock-home"]').first().click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1800);
await page.waitForSelector('[data-testid="c2-feed-plan"], [data-testid="c2-place-stone"]', { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);

const out = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sc = document.querySelector('[data-testid="c2-home-scroll"]');
  if (!sc) return { error: "no home scroller" };
  // Scroll to the true bottom in steps.
  for (let y = 0; y <= sc.scrollHeight; y += 400) { sc.scrollTop = y; await sleep(60); }
  sc.scrollTop = sc.scrollHeight;
  await sleep(700);
  const srect = sc.getBoundingClientRect();
  const kids = [...sc.querySelectorAll(":scope > *")];
  const lastKids = kids.slice(-4).map((el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: (el.className.baseVal ?? el.className ?? "").toString().slice(0, 60), testid: el.getAttribute("data-testid"), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
  });
  // Deepest visible content element inside the scroller (by rect bottom, non-SVG).
  let deepest = null;
  for (const el of sc.querySelectorAll("*")) {
    if (el instanceof SVGElement) continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (!deepest || r.bottom > deepest.bottom) deepest = { tag: el.tagName, cls: (el.className.baseVal ?? el.className ?? "").toString().slice(0, 60), testid: el.getAttribute("data-testid"), bottom: Math.round(r.bottom), top: Math.round(r.top) };
  }
  const dock = document.querySelector('[class*="dock"], [data-testid*="dock"]');
  const dr = dock ? dock.getBoundingClientRect() : null;
  // Fade overlays inside the shell:
  const fades = [...document.querySelectorAll('[class*="fade"]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: (el.className.baseVal ?? el.className ?? "").toString().slice(0, 60), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), pos: getComputedStyle(el).position };
  });
  return {
    scroller: { top: Math.round(srect.top), bottom: Math.round(srect.bottom), scrollHeight: sc.scrollHeight, clientHeight: sc.clientHeight, scrollTop: Math.round(sc.scrollTop), padBottom: getComputedStyle(sc).paddingBottom },
    dock: dr ? { top: Math.round(dr.top), bottom: Math.round(dr.bottom) } : null,
    lastKids, deepest, fades,
  };
});
console.log(JSON.stringify(out, null, 2));
await ctx.close();
await browser.close();
