#!/usr/bin/env node
/** Harmony-0: You hub + Settings identity capture (fresh session per
 * mode - no prior in-app navigation, dock reached directly). */
import fs from "node:fs";
import path from "node:path";
import { loadRenderedConfig, provisionRenderedSessions, launchBrowser, newAuthedContext, entryUrl } from "./lib/browser.mjs";
const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });
const config = loadRenderedConfig(process.env);
const { sessions } = await provisionRenderedSessions(config);
const browser = await launchBrowser();
const manifest = { build_tag: config.buildTag, surfaces: [] };
for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(entryUrl(config), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(2500);
    await page.click('[data-testid="c2-dock-you"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, `you-${mode}.png`) });
    console.log(mode, "shot you");
    const rec = { label: "you-settings-identity", mode, failures: [] };
    const appRow = page.locator("text=Appearance").first();
    if (await appRow.count()) {
      await appRow.click();
      await page.waitForTimeout(2500);
      const info = await page.evaluate(() => ({
        markPresent: !!document.querySelector('[data-orb="settings-header-mark"]'),
        markAsset: document.querySelector('[data-orb="settings-header-mark"] svg')?.getAttribute("data-orb-asset") ?? null,
        lockups: [...document.querySelectorAll("[data-orb-lockup]")].map((e) => e.getAttribute("data-orb-lockup")),
      })).catch(() => ({ error: "probe failed" }));
      Object.assign(rec, info);
      await page.screenshot({ path: path.join(OUT, `settings-${mode}.png`) });
      console.log(mode, "settings:", JSON.stringify(info));
    } else {
      rec.failures.push("no Appearance row on You hub");
    }
    manifest.surfaces.push(rec);
  } catch (e) {
    console.log(mode, "ERROR", String(e).slice(0, 300));
    manifest.surfaces.push({ label: "you-settings-identity", mode, failures: [String(e).slice(0, 300)] });
    await page.screenshot({ path: path.join(OUT, `you-error-${mode}.png`) }).catch(() => {});
  }
  await context.close();
}
fs.writeFileSync(path.join(OUT, "manifest-you.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", OUT);
await browser.close();
