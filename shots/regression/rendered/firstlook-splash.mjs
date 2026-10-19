#!/usr/bin/env node
/** First-look tranche: opening flow (splash 1 + splash 2/promise), anon, both modes. */
import fs from "node:fs";
import path from "node:path";
import { loadRenderedConfig, launchBrowser, newAnonContext } from "./lib/browser.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
const config = loadRenderedConfig(process.env);
const browser = await launchBrowser();
for (const mode of ["dark", "light"]) {
  const context = await newAnonContext(browser, mode, config);
  const page = await context.newPage();
  await page.goto(`${config.webBase}/?opal_founder_seed=1&opal_native_host=1&opal_dev=1&opal_reset_first_run=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="c2-splash1"]', { timeout: 90000 }).catch(() => console.log(mode, "splash1 selector timeout"));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `splash-1-${mode}.png`) });
  console.log("shot splash-1", mode);
  const cont = page.locator('[data-testid="c2-splash1-continue"]');
  if (await cont.count()) {
    await cont.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, `splash-2-${mode}.png`) });
    const tids = await page.evaluate(() => [...document.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid")).slice(0, 10));
    console.log("shot splash-2", mode, JSON.stringify(tids));
  } else {
    console.log(mode, "no splash1 continue");
  }
  await context.close();
}
await browser.close();
