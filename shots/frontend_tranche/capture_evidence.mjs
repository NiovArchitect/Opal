/**
 * Capture intelligence surface fixtures at 390×844 and 430×932.
 * Uses Playwright against local HTML fixtures (no live vite required).
 * Run from apps/opal_web: `node ../../shots/frontend_tranche/capture_evidence.mjs`
 * so `playwright` resolves from opal_web/node_modules.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const requireFromWeb = createRequire(
  path.join(repoRoot, "apps/opal_web/package.json"),
);
const { chromium } = requireFromWeb("playwright");
const fixtures = path.join(__dirname, "fixtures", "intelligence-surfaces.html");
const outDir = __dirname;

const SURFACES = [
  "reminder-upcoming",
  "reminder-day_of",
  "reminder-passed_unplanned",
  "reminder-planned",
  "person-memory",
  "mediation-blocked",
  "mediation-consensus",
  "weekly-briefing",
];

const VIEWPORTS = [
  { w: 390, h: 844 },
  { w: 430, h: 932 },
];

const browser = await chromium.launch({ headless: true });
const manifest = [];

for (const surface of SURFACES) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 2,
    });
    const url = `file://${fixtures}?surface=${encodeURIComponent(surface)}`;
    await page.goto(url);
    await page.waitForTimeout(100);
    const name = `${surface}-${vp.w}x${vp.h}.png`;
    const dest = path.join(outDir, name);
    await page.screenshot({ path: dest, fullPage: false });
    manifest.push({ surface, viewport: `${vp.w}x${vp.h}`, file: name });
    await page.close();
    console.log("wrote", name);
  }
}

await browser.close();
fs.writeFileSync(
  path.join(outDir, "screenshot_manifest.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), shots: manifest }, null, 2),
);
console.log("DONE", manifest.length);
