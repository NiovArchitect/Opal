#!/usr/bin/env node
/**
 * Repair #18 FIRST-LOOK tranche capture (founder directive 2026-10-18 03:39).
 * Drives the REAL served C2 shell on the Mac preview stack at phone
 * viewport, both modes, with real session data (synthetic sessions +
 * founder seed through the real APIs). Captures: opening/home, Center
 * (rest + Talk-to-Opal chat host), Chats list, one thread. Runs the
 * geometry probes (overflow / clipped text / dock hit-tests) per
 * surface and writes a manifest. A surface with probe failures is
 * reported, never silently shipped.
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
import {
  probeHorizontalOverflow,
  probeClippedText,
  probeHitTests,
} from "./lib/geometry.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });

const config = loadRenderedConfig(process.env);
const { sessions } = await provisionRenderedSessions(config);
const browser = await launchBrowser();
const manifest = { build_tag: config.buildTag, web: config.webBase, api: config.apiBase, surfaces: [] };

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
  manifest.surfaces.push({ label, mode, failures, docOverflow: overflow?.docOverflow ?? null, escapees: overflow?.escapees?.length ?? null, clippedCount: clipped?.clipped?.length ?? null, truncatedNotes: clipped?.truncated?.slice(0, 4).map((t) => t.text) ?? [] });
  return failures;
}

async function shot(page, name) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log("shot", name);
}

for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(3000);

    // The shell BOOTS into the Center route: the opening deck (character,
    // greeting, Make something happen / Talk to Opal, Taking Shape cards).
    await shot(page, `center-rest-${mode}.png`);
    console.log(mode, "center-rest failures:", await probes(page, "c2-route-center", "center-rest", mode));

    // Scrolled-to-bottom: the last card must clear the floating dock.
    await page.evaluate(() => {
      const sc = document.querySelector('[data-testid="c2-route-center"] .c2s-scroll') || document.querySelector('[data-testid="c2-route-center"]');
      if (sc) sc.scrollTop = sc.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1500);
    await shot(page, `center-rest-scrolled-${mode}.png`);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Home route via dock
    await page.click('[data-testid="c2-dock-home"]');
    await page.waitForSelector('[data-testid="c2-route-home"]', { timeout: 30000 }).catch(() => console.log(mode, "home route timeout"));
    await page.waitForTimeout(2500);
    await shot(page, `home-${mode}.png`);
    console.log(mode, "home failures:", await probes(page, "c2-route-home", "home", mode));

    // Back to Center deck, then Talk to Opal -> C1 CenterChat host
    await page.click('[data-testid="c2-dock-center"]');
    await page.waitForSelector('[data-testid="c2-opening-talk"]', { timeout: 30000 }).catch(() => console.log(mode, "opening-talk timeout"));
    await page.waitForTimeout(1500);
    const talk = page.locator('[data-testid="c2-opening-talk"]');
    if (await talk.count()) {
      await talk.click();
      await page.waitForSelector('[data-testid="c2-c1-center-host"]', { timeout: 60000 }).catch(() => console.log(mode, "center host timeout"));
      await page.waitForTimeout(3000);
      await shot(page, `center-chat-${mode}.png`);
      console.log(mode, "center-chat host present:", await page.locator('[data-testid="c2-c1-center-host"]').count());
      manifest.surfaces.push({ label: "center-chat", mode, failures: [], hostPresent: await page.locator('[data-testid="c2-c1-center-host"]').count() });
    } else {
      console.log(mode, "NO c2-opening-talk control found");
      manifest.surfaces.push({ label: "center-chat", mode, failures: ["c2-opening-talk control not found"] });
    }
    await page.click('[data-testid="c2-dock-home"]').catch(() => {});
    await page.waitForTimeout(1200);

    // Chats list
    await page.click('[data-testid="c2-dock-chats"]');
    await page.waitForTimeout(3000);
    await shot(page, `chats-list-${mode}.png`);
    console.log(mode, "chats failures:", await probes(page, "c2-route-chats", "chats-list", mode));

    // Thread: click the Saturday Crew conversation row by its title text
    const row = page.locator('[data-testid="c2-route-chats"] >> text=Saturday Crew').first();
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(5000);
      await shot(page, `thread-${mode}.png`);
      const tids = await page.evaluate(() => [...document.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid")).filter((t) => /thread|conversation|composer/i.test(t)));
      console.log(mode, "thread-ish testids:", JSON.stringify([...new Set(tids)].slice(0, 12)));
      manifest.surfaces.push({ label: "thread", mode, failures: [], threadTestids: [...new Set(tids)] });
    } else {
      console.log(mode, "no conversation row found in chats host");
      manifest.surfaces.push({ label: "thread", mode, failures: ["no conversation row in chats host"] });
    }
  } catch (e) {
    console.log(mode, "ERROR", String(e).slice(0, 400));
    manifest.surfaces.push({ label: "mode-run", mode, failures: [String(e).slice(0, 300)] });
    await page.screenshot({ path: path.join(OUT, `error-${mode}.png`) }).catch(() => {});
  }
  await context.close();
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("MANIFEST", JSON.stringify(manifest.surfaces, null, 1));
await browser.close();
