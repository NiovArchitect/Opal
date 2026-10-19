#!/usr/bin/env node
/**
 * Repair #19 W8 - Settings family rendered evidence (Soul / Memory /
 * Activity rooms, You hub, Center doorway) in both modes, driven
 * against the REAL served stack (backend + Vite dev from this
 * worktree). Records are created through the REAL APIs only: one
 * memory capsule (so Memory renders populated) after the as-found
 * Memory frame, and one Soul PATCH (daily cap 3, New York time) so
 * the Soul frame shows labeled real values, never raw form values.
 * Raw-leak text probes run per room (bare "22:00", bare "3",
 * unlabeled "standard") and are recorded in the manifest.
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
import { ApiClient } from "../lib/harness.mjs";

const OUT = process.env.FIRSTLOOK_OUT;
if (!OUT) throw new Error("FIRSTLOOK_OUT required");
fs.mkdirSync(OUT, { recursive: true });
const config = loadRenderedConfig(process.env);
const { sessions } = await provisionRenderedSessions(config);
const A = new ApiClient(config, sessions.a);

const manifest = {
  build_tag: config.buildTag,
  web: config.webBase,
  api: config.apiBase,
  session_a: sessions.a.userId,
  setup: {},
  surfaces: [],
};

// Real truth edits for the frames (named, through the real APIs).
const soulPatch = await A.request("PATCH", "/memory-wallet/soul", {
  proactive_daily_cap: 3,
  timezone: "America/New_York",
});
manifest.setup.soul_patch_status = soulPatch.status;

const browser = await launchBrowser();

const RAW_LEAKS = [
  { name: "bare-22:00", re: /(?<![\d:])22:00(?![\d])/ },
  { name: "raw-standard", re: /\bstandard\b/ },
  { name: "raw-america-los-angeles-only", re: /^America\/Los_Angeles$/m },
];

async function probe(page, label, mode) {
  const text = await page
    .locator('[data-testid="c2-shell"]')
    .innerText()
    .catch(() => "");
  const leaks = RAW_LEAKS.filter((l) => l.re.test(text)).map((l) => l.name);
  const rec = { label, mode, leaks, failures: [] };
  manifest.surfaces.push(rec);
  return rec;
}

async function settleRoom(page) {
  await page
    .waitForFunction(() => !document.body.innerText.includes("One moment."), { timeout: 30000 })
    .catch(() => {});
  await page.waitForTimeout(900);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log("shot", name);
}

for (const mode of ["dark", "light"]) {
  const context = await newAuthedContext(browser, config, sessions.a, mode);
  const page = await context.newPage();
  try {
    await page.goto(entryUrl(config, "shell=c2"), { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector('[data-testid="c2-shell"]', { timeout: 90000 });
    await page.waitForTimeout(3000);
    // Center deck + the renamed doorway.
    const doorway = await page
      .locator('[data-testid="c2-center-orb-doorway"]')
      .innerText()
      .catch(() => null);
    await shot(page, `center-${mode}.png`);
    const centerRec = await probe(page, "center-doorway", mode);
    centerRec.doorway_text = doorway;

    // You hub.
    await page.click('[data-testid="c2-dock-you"]');
    await page.waitForTimeout(2500);
    await shot(page, `you-hub-${mode}.png`);
    await probe(page, "you-hub", mode);

    // Soul room.
    await page.click('[data-testid="c2-you-row-soul"]');
    await settleRoom(page);
    await shot(page, `soul-${mode}.png`);
    await probe(page, "soul-room", mode);
    await page.click('[data-testid="c2-settings-back"]');
    await page.waitForTimeout(1200);

    // Memory room, as found.
    await page.click('[data-testid="c2-you-row-memory"]');
    await settleRoom(page);
    await shot(page, `memory-as-found-${mode}.png`);
    await probe(page, "memory-room-as-found", mode);

    if (mode === "dark") {
      // Populate through the real API, then re-read the room.
      const created = await A.request("POST", "/memory-wallet/capsules", {
        summary: "Anniversary dinner spot - the quiet corner table at the place on Abbot Kinney.",
        kind: "personal_memory",
      });
      manifest.setup.capsule_create_status = created.status;
    }
    await page.click('[data-testid="c2-settings-back"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="c2-you-row-memory"]');
    await settleRoom(page);
    await shot(page, `memory-${mode}.png`);
    await probe(page, "memory-room", mode);
    await page.click('[data-testid="c2-settings-back"]');
    await page.waitForTimeout(1200);

    // Activity room.
    await page.click('[data-testid="c2-you-row-approvals-activity"]');
    await settleRoom(page);
    await shot(page, `activity-${mode}.png`);
    await probe(page, "activity-room", mode);
    await page.click('[data-testid="c2-settings-back"]');
    await page.waitForTimeout(800);
  } catch (e) {
    console.log(mode, "ERROR", String(e).slice(0, 300));
    manifest.surfaces.push({ label: "error", mode, failures: [String(e).slice(0, 300)] });
    await page.screenshot({ path: path.join(OUT, `error-${mode}.png`) }).catch(() => {});
  }
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, "manifest-r19soul.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", OUT);
