/**
 * B3 — You hub + all 12 Section 06 formal captures / overlay / diff / back proof.
 * Run: cd apps/opal_web && node scripts/prove_b3_section06.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PNG } from "pngjs";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/p0-05-12-wave-b");
for (const d of ["runtime", "overlay", "diff", "figma"]) mkdirSync(join(OUT, d), { recursive: true });

const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;
const clip = { x: 0, y: 0, width: 390, height: 844 };
const THRESH = 0.12;

/** Order: hub then 12 nested screens matching YOU_SETTING_FIGMA */
const SCREENS = [
  { id: "you_hub", node: "618:1344", figma: "YOU_618_1344.png", runtime: "YOU_618_1344.png", entry: null, title: "You hub" },
  { id: "privacy", node: "618:1524", figma: "SETTING_PRIVACY_618_1524.png", runtime: "SETTING_PRIVACY_618_1524.png", entry: "privacy", title: "Privacy & Audience", accent: "violet" },
  { id: "location-travel", node: "618:1591", figma: "SETTING_LOCATION_618_1591.png", runtime: "SETTING_LOCATION_618_1591.png", entry: "location-travel", title: "Location & Travel", accent: "aqua" },
  { id: "spending-fit", node: "618:1662", figma: "SETTING_SPENDING_618_1662.png", runtime: "SETTING_SPENDING_618_1662.png", entry: "spending-fit", title: "Spending & Fit", accent: "gold" },
  { id: "calls-assist", node: "618:1733", figma: "SETTING_CALLS_618_1733.png", runtime: "SETTING_CALLS_618_1733.png", entry: "calls-assist", title: "Calls & Opal Assist", accent: "cyan" },
  { id: "feed-discovery", node: "618:1801", figma: "SETTING_FEED_618_1801.png", runtime: "SETTING_FEED_618_1801.png", entry: "feed-discovery", title: "Feed & Discovery", accent: "violet" },
  { id: "engagement", node: "618:1868", figma: "SETTING_ENGAGEMENT_618_1868.png", runtime: "SETTING_ENGAGEMENT_618_1868.png", entry: "engagement", title: "Engagement", accent: "coral" },
  { id: "notifications", node: "618:1935", figma: "SETTING_NOTIFICATIONS_618_1935.png", runtime: "SETTING_NOTIFICATIONS_618_1935.png", entry: "notifications", title: "Notifications", accent: "magenta" },
  { id: "linked-devices", node: "618:2003", figma: "SETTING_DEVICES_618_2003.png", runtime: "SETTING_DEVICES_618_2003.png", entry: "linked-devices", title: "Linked Devices", accent: "aqua" },
  { id: "safety", node: "618:2060", figma: "SETTING_SAFETY_618_2060.png", runtime: "SETTING_SAFETY_618_2060.png", entry: "safety", title: "Safety", accent: "coral" },
  { id: "edit-profile", node: "618:2123", figma: "SETTING_EDIT_PROFILE_618_2123.png", runtime: "SETTING_EDIT_PROFILE_618_2123.png", entry: "edit-profile", title: "Edit Profile", accent: "cyan" },
  { id: "account-security", node: "618:2180", figma: "SETTING_ACCOUNT_618_2180.png", runtime: "SETTING_ACCOUNT_618_2180.png", entry: "account-security", title: "Account & Security", accent: "violet" },
  { id: "delete-account", node: "618:2243", figma: "SETTING_DELETE_618_2243.png", runtime: "SETTING_DELETE_618_2243.png", entry: "delete-account", title: "Delete Account", accent: "coral", viaAccount: true },
];

const proof = {
  square: "B3_YOU_SECTION06",
  sha: SHA,
  starting_head: "8c090d0",
  figma_file: "fy69K8cCug9prf5GLwQ7Hy",
  section: "618:1254",
  threshold: THRESH,
  started_at: new Date().toISOString(),
  console_errors: [],
  network_failures: [],
  screens: {},
  statuses: {},
  back_proof: {},
  routing: {},
};

function diffPair(figmaPath, runtimePath, overlayPath, diffPath) {
  if (!existsSync(figmaPath) || !existsSync(runtimePath)) {
    return { error: "missing capture", diffRatio: 1 };
  }
  const figma = PNG.sync.read(readFileSync(figmaPath));
  const runtime = PNG.sync.read(readFileSync(runtimePath));
  const w = Math.min(figma.width, runtime.width, 390);
  const h = Math.min(figma.height, runtime.height, 844);
  const overlay = new PNG({ width: w, height: h });
  const diff = new PNG({ width: w, height: h });
  let diffPixels = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (w * y + x) << 2;
      const fi = (figma.width * y + x) << 2;
      const ri = (runtime.width * y + x) << 2;
      const fr = figma.data[fi], fg = figma.data[fi + 1], fb = figma.data[fi + 2];
      const rr = runtime.data[ri], rg = runtime.data[ri + 1], rb = runtime.data[ri + 2];
      overlay.data[i] = (fr + rr) >> 1;
      overlay.data[i + 1] = (fg + rg) >> 1;
      overlay.data[i + 2] = (fb + rb) >> 1;
      overlay.data[i + 3] = 255;
      const hot = Math.abs(fr - rr) + Math.abs(fg - rg) + Math.abs(fb - rb) > 60;
      if (hot) {
        diffPixels++;
        diff.data[i] = 255; diff.data[i + 1] = 40; diff.data[i + 2] = 40; diff.data[i + 3] = 255;
      } else {
        diff.data[i] = rr; diff.data[i + 1] = rg; diff.data[i + 2] = rb; diff.data[i + 3] = 80;
      }
    }
  }
  writeFileSync(overlayPath, PNG.sync.write(overlay));
  writeFileSync(diffPath, PNG.sync.write(diff));
  return { width: w, height: h, diffPixels, diffRatio: Number((diffPixels / (w * h)).toFixed(4)) };
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
page.on("console", (m) => { if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 200)); });
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/favicon|sourcemap|hot-update|fonts\.googleapis/.test(u)) proof.network_failures.push(u.slice(0, 160));
});

async function enterHome() {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click();
  await page.locator('[data-testid="opal-promise-enter"]').click();
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]');
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 60000 });
  const name = page.locator('[data-testid="fr08-display-name"], input[autocomplete="name"]').first();
  if (await name.isVisible().catch(() => false)) await name.fill("Founder");
  await page.locator('[data-testid="fr08-continue"], button:has-text("Continue")').first().click();
  await page.waitForTimeout(900);
  const notNow = page.getByRole("button", { name: /Not now|Skip/i }).first();
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
  await page.waitForSelector('[data-testid="member-tab-home"]', { timeout: 45000 });
  await page.waitForTimeout(1500);
}

async function openYou() {
  await page.locator('[data-testid="member-tab-you"]').click();
  await page.waitForSelector('[data-figma-you="618:1344"], [data-figma="618:1344"], [data-testid="you-hub"], .you-pane-618-1344', { timeout: 15000 });
  await page.waitForTimeout(600);
}

async function openSetting(key, viaAccount = false) {
  if (viaAccount) {
    // Ensure on You hub first
    if (await page.locator('[data-testid="you-setting-back"]').isVisible().catch(() => false)) {
      // back until hub
      for (let i = 0; i < 3; i++) {
        if (await page.locator('[data-testid="you-settings-pane"]').isVisible().catch(() => false)) {
          await page.locator('[data-testid="you-setting-back"]').click();
          await page.waitForTimeout(400);
        } else break;
      }
    }
    const acct = page.locator('[data-testid="you-hub-row-account-security"], button:has-text("Account & security")').first();
    await acct.scrollIntoViewIfNeeded();
    await acct.click();
    await page.waitForSelector('[data-you-setting="account-security"], [data-figma-node="618:2180"]', { timeout: 10000 });
    await page.waitForTimeout(400);
    const del = page.locator('button:has-text("Delete account"), [data-testid*="delete"]').first();
    await del.click();
    await page.waitForSelector('[data-you-setting="delete-account"], [data-figma-node="618:2243"]', { timeout: 10000 });
  } else if (key === "edit-profile") {
    const btn = page.locator('[data-testid="you-edit-profile"], button:has-text("Edit profile")').first();
    await btn.click();
    await page.waitForSelector('[data-you-setting="edit-profile"], [data-figma-node="618:2123"]', { timeout: 10000 });
  } else {
    // hub row by key or title
    let row = page.locator(`[data-testid="you-hub-row-${key}"]`).first();
    if (!(await row.isVisible().catch(() => false))) {
      const titles = {
        privacy: "Privacy",
        "feed-discovery": "Feed & discovery",
        "location-travel": "Location & travel",
        engagement: "Engagement",
        "calls-assist": "Calls & Opal Assist",
        notifications: "Notifications",
        "linked-devices": "Linked devices",
        safety: "Safety",
        "spending-fit": "Spending & fit",
        "account-security": "Account & security",
      };
      row = page.locator(`button:has-text("${titles[key]}")`).first();
    }
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await page.waitForSelector(`[data-you-setting="${key}"], [data-testid="you-setting-${key}"]`, { timeout: 10000 });
  }
  await page.waitForTimeout(500);
}

try {
  await enterHome();
  await openYou();

  for (const s of SCREENS) {
    if (s.entry) {
      // return to hub if nested
      while (await page.locator('[data-testid="you-settings-pane"]').isVisible().catch(() => false)) {
        await page.locator('[data-testid="you-setting-back"]').click({ force: true });
        await page.waitForTimeout(350);
      }
      await openYou();
      await openSetting(s.entry, !!s.viaAccount);
    }

    const snap = await page.evaluate((entry) => {
      const pane = document.querySelector('[data-testid="you-settings-pane"], [data-figma-you="618:1344"], .you-pane-618-1344, [data-testid="member-tab-you"]')?.closest?.(".app") || document.body;
      const dest = document.querySelector("[data-figma-node], [data-figma-you], [data-figma]");
      const semantic = document.querySelector("[data-semantic]")?.getAttribute("data-semantic");
      const figma =
        document.querySelector("[data-figma-node]")?.getAttribute("data-figma-node") ||
        document.querySelector("[data-figma]")?.getAttribute("data-figma") ||
        document.querySelector("[data-figma-you]")?.getAttribute("data-figma-you");
      const youActive =
        document.querySelector('[data-testid="member-tab-you"]')?.classList.contains("is-active") ||
        document.querySelector('.dock-tab[data-dock-slot="you"].is-active') != null ||
        document.querySelector("[data-nav-active='you']") != null;
      const toggles = [...document.querySelectorAll('[data-testid^="you-settings-toggle"], .you-settings-toggle, input[type="checkbox"], button[role="switch"]')].length;
      const title = document.querySelector(".you-settings-title, .you-hub-title, h1")?.textContent?.trim();
      return { figma, semantic, youActive, toggles, title, entry, bodySnippet: (document.body.innerText || "").slice(0, 280) };
    }, s.entry);

    const runtimePath = join(OUT, "runtime", s.runtime);
    await page.screenshot({ path: runtimePath, clip });

    const figmaPath = join(OUT, "figma", s.figma);
    const d = diffPair(
      figmaPath,
      runtimePath,
      join(OUT, "overlay", s.runtime.replace(".png", "_OVERLAY.png")),
      join(OUT, "diff", s.runtime.replace(".png", "_DIFF.png")),
    );

    const identityOk = !s.entry || snap.figma === s.node || (snap.title && s.title.toLowerCase().includes(snap.title.toLowerCase().slice(0, 8)));
    const accentOk = !s.accent || snap.semantic === s.accent || s.id === "you_hub";
    let status = "RED";
    if (identityOk && d.diffRatio != null && d.diffRatio <= THRESH) status = "GREEN";
    else if (identityOk && d.diffRatio != null && d.diffRatio < 0.22) status = "PARTIAL";
    else if (identityOk) status = "PARTIAL";

    proof.screens[s.id] = {
      node: s.node,
      title: s.title,
      snap,
      diff: d,
      accent_expected: s.accent || null,
      accent_ok: accentOk,
      status,
    };
    proof.statuses[s.id] = status;
    proof.routing[s.id] = { entry: s.entry || "dock-you", figma_stamp: snap.figma, you_active: snap.youActive };

    // Back proof for nested
    if (s.entry && s.id !== "delete-account") {
      await page.locator('[data-testid="you-setting-back"]').click({ force: true });
      await page.waitForTimeout(400);
      const backOk = await page.evaluate(() => {
        const nested = !!document.querySelector('[data-testid="you-settings-pane"]');
        const hub = !!document.querySelector('[data-figma="618:1344"], [data-figma-you="618:1344"], .you-hub-title');
        return { nested, hub, youActive: !!document.querySelector("[data-nav-active='you'], .dock-tab[data-dock-slot='you'].is-active") };
      });
      proof.back_proof[s.id] = { ...backOk, ok: backOk.hub && !backOk.nested };
    }
    if (s.id === "delete-account") {
      await page.locator('[data-testid="you-setting-back"]').click({ force: true });
      await page.waitForTimeout(400);
      const toAccount = await page.evaluate(() => document.querySelector('[data-you-setting="account-security"], [data-figma-node="618:2180"]') != null);
      proof.back_proof[s.id] = { returns_to_account: toAccount, ok: toAccount };
      // back to hub
      if (toAccount) {
        await page.locator('[data-testid="you-setting-back"]').click({ force: true });
        await page.waitForTimeout(350);
      }
    }
  }

  proof.console_error_count = proof.console_errors.length;
  proof.network_failure_count = proof.network_failures.length;
  const greens = Object.values(proof.statuses).filter((x) => x === "GREEN").length;
  const partials = Object.values(proof.statuses).filter((x) => x === "PARTIAL").length;
  const reds = Object.values(proof.statuses).filter((x) => x === "RED").length;
  proof.B3_COMPLETE = reds === 0 && partials === 0 && greens === SCREENS.length;
  proof.summary = { greens, partials, reds, total: SCREENS.length };
  proof.finished_at = new Date().toISOString();

  writeFileSync(join(OUT, "B3_SECTION06_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ summary: proof.summary, statuses: proof.statuses, B3_COMPLETE: proof.B3_COMPLETE }, null, 2));
} catch (e) {
  proof.error = String(e);
  writeFileSync(join(OUT, "B3_SECTION06_PROOF.json"), JSON.stringify(proof, null, 2));
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
