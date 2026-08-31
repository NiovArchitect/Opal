/**
 * B2.1 — Direct 618:348 formal closure only.
 * Run: cd apps/opal_web && node scripts/prove_b21_direct.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PNG } from "pngjs";
import { createHash } from "node:crypto";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/p0-05-12-wave-b");
const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;
const clip = { x: 0, y: 0, width: 390, height: 844 };
const PREV_DIFF = 0.1419;

const proof = {
  square: "B2_1_DIRECT_FORMAL_CLOSURE",
  sha: SHA,
  figma_node: "618:348",
  previous_diffRatio: PREV_DIFF,
  formal_threshold_precedent_b1: 0.12,
  started_at: new Date().toISOString(),
  console_errors: [],
  network_failures: [],
};

function sha1file(p) {
  return createHash("sha1").update(readFileSync(p)).digest("hex");
}

function regionDiff(figma, runtime) {
  const w = 390, h = 844;
  const regions = {
    A_avatar: { x: 20, y: 78, w: 52, h: 52 },
    B_juniper_media: { x: 34, y: 386, w: 108, h: 86 },
    C_header_text: { x: 84, y: 78, w: 160, h: 50 },
    D_bubbles: { x: 20, y: 154, w: 350, h: 160 },
    E_opal_plate: { x: 20, y: 324, w: 350, h: 350 },
    F_composer: { x: 20, y: 684, w: 350, h: 58 },
    G_dock: { x: 16, y: 758, w: 358, h: 86 },
    H_field_bg: { x: 0, y: 0, w: 390, h: 70 },
  };
  const hot = (fi, ri) => {
    const dr = Math.abs(figma.data[fi] - runtime.data[ri]);
    const dg = Math.abs(figma.data[fi + 1] - runtime.data[ri + 1]);
    const db = Math.abs(figma.data[fi + 2] - runtime.data[ri + 2]);
    return dr + dg + db > 60;
  };
  const out = {};
  let full = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (w * y + x) << 2;
    if (hot(i, i)) full++;
  }
  for (const [name, r] of Object.entries(regions)) {
    let hotPx = 0;
    const area = r.w * r.h;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const i = (w * y + x) << 2;
      if (hot(i, i)) hotPx++;
    }
    out[name] = { area, hotPx, ratio: Number((hotPx / area).toFixed(4)), share_of_full: Number((hotPx / full).toFixed(4)) };
  }
  out.FULL = { hotPx: full, ratio: Number((full / (w * h)).toFixed(4)) };
  return out;
}

function makeOverlayDiff(figmaPath, runtimePath, overlayPath, diffPath) {
  const figma = PNG.sync.read(readFileSync(figmaPath));
  const runtime = PNG.sync.read(readFileSync(runtimePath));
  const w = Math.min(figma.width, runtime.width, 390);
  const h = Math.min(figma.height, runtime.height, 844);
  const overlay = new PNG({ width: w, height: h });
  const diff = new PNG({ width: w, height: h });
  let diffPixels = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
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
  writeFileSync(overlayPath, PNG.sync.write(overlay));
  writeFileSync(diffPath, PNG.sync.write(diff));
  return { diffPixels, diffRatio: Number((diffPixels / (w * h)).toFixed(4)), regions: regionDiff(figma, runtime) };
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
page.on("console", (m) => { if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 200)); });
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/favicon|sourcemap|hot-update|fonts\.googleapis/.test(u)) proof.network_failures.push(u.slice(0, 160));
});

try {
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
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="member-tab-chats"]').click();
  await page.waitForSelector('[data-testid^="chats-row-"]', { timeout: 45000 });
  const directRow = page.locator('[data-testid^="chats-row-"][data-kind="direct"]').filter({ hasText: /Chanelle/i }).first();
  await directRow.scrollIntoViewIfNeeded();
  await directRow.click();
  await page.waitForSelector('[data-testid="member-conversation"][data-chat-kind="direct"]', { timeout: 15000 });
  await page.waitForTimeout(1000);

  proof.snap = await page.evaluate(() => {
    const app = document.querySelector('[data-testid="member-conversation"]');
    const av = document.querySelector('[data-testid="gpt-avatar"]');
    const ju = document.querySelector('[data-testid="dated-opal-juniper-thumb"] img');
    const cs = getComputedStyle(app);
    return {
      figmaPeople: document.querySelector('[data-testid="graph-people-header"]')?.getAttribute("data-figma-people"),
      name: document.querySelector('[data-testid="gpt-name"]')?.textContent,
      fieldBg: cs.backgroundColor,
      hasOpalLined: /Opal lined this up/i.test(app?.innerText || ""),
      avatarTag: av?.tagName,
      avatarSrc: av?.getAttribute?.("src") || (av?.tagName === "IMG" ? av.src : null),
      juniperSrc: ju?.getAttribute("src"),
      avatarRect: av ? (() => { const r = av.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
    };
  });

  const runtimePath = join(OUT, "runtime/DIRECT_618_348.png");
  await page.screenshot({ path: runtimePath, clip });
  await page.screenshot({ path: join(OUT, "runtime/RUNTIME_DIRECT.png"), clip });

  const figmaPath = join(OUT, "figma/DIRECT_618_348.png");
  const diff = makeOverlayDiff(
    figmaPath,
    runtimePath,
    join(OUT, "overlay/DIRECT_618_348_OVERLAY.png"),
    join(OUT, "diff/DIRECT_618_348_DIFF.png"),
  );
  proof.diff = { previous: PREV_DIFF, after: diff.diffRatio, diffPixels: diff.diffPixels };
  proof.regions = diff.regions;
  proof.geometry = {
    avatar: proof.snap.avatarRect,
    expected_avatar: { x: 20, y: 78, w: 52, h: 52 },
  };
  proof.asset_provenance = {
    chanelle_runtime: "/figma-v2/direct/opal-direct-chanelle-618-351.png",
    chanelle_sha1: sha1file(join(ROOT, "apps/opal_web/public/figma-v2/direct/opal-direct-chanelle-618-351.png")).slice(0, 16),
    juniper_runtime: "/figma-v2/direct/opal-direct-juniper-618-376.jpg",
    juniper_sha1: sha1file(join(ROOT, "apps/opal_web/public/figma-v2/direct/opal-direct-juniper-618-376.jpg")).slice(0, 16),
    juniper_matches_figma_raw: sha1file(join(ROOT, "apps/opal_web/public/figma-v2/direct/opal-direct-juniper-618-376.jpg")).slice(0, 16) === "87ce8060678ecfc1",
  };

  const geoOk =
    proof.snap.avatarRect &&
    Math.abs(proof.snap.avatarRect.x - 20) <= 3 &&
    Math.abs(proof.snap.avatarRect.y - 78) <= 3 &&
    Math.abs(proof.snap.avatarRect.w - 52) <= 3;

  const identityOk =
    proof.snap.figmaPeople === "618:348" &&
    /Chanelle/i.test(proof.snap.name || "") &&
    proof.snap.hasOpalLined &&
    /opal-direct-chanelle-618-351/.test(proof.snap.avatarSrc || "") &&
    /\.jpg/.test(proof.snap.juniperSrc || "");

  proof.DIRECT_FORMAL_PARITY =
    identityOk && geoOk && diff.diffRatio <= 0.12
      ? "GREEN"
      : identityOk && geoOk && diff.diffRatio < 0.14
        ? "PARTIAL"
        : identityOk
          ? "PARTIAL"
          : "RED";

  // Remaining classification
  const r = diff.regions;
  proof.remaining_diff_classification = {
    primary_drivers: Object.entries(r)
      .filter(([k]) => k !== "FULL")
      .sort((a, b) => b[1].hotPx - a[1].hotPx)
      .slice(0, 5)
      .map(([k, v]) => ({ region: k, hotPx: v.hotPx, share_of_full: v.share_of_full, region_ratio: v.ratio })),
    note:
      diff.diffRatio <= 0.12
        ? "Within B1 formal threshold 0.12 after asset+paint reconciliation."
        : "Still above 0.12 — classify residual by region evidence above.",
  };

  proof.console_error_count = proof.console_errors.length;
  proof.network_failure_count = proof.network_failures.length;
  proof.finished_at = new Date().toISOString();
  writeFileSync(join(OUT, "B2_1_DIRECT_PROOF.json"), JSON.stringify(proof, null, 2));

  // Merge into B2_COMMUNICATION_PROOF.json
  const b2Path = join(OUT, "B2_COMMUNICATION_PROOF.json");
  if (existsSync(b2Path)) {
    const b2 = JSON.parse(readFileSync(b2Path, "utf8"));
    b2.statuses = b2.statuses || {};
    b2.statuses.DIRECT_FORMAL_PARITY = proof.DIRECT_FORMAL_PARITY;
    b2.b2_1 = {
      previous_diffRatio: PREV_DIFF,
      after_diffRatio: diff.diffRatio,
      DIRECT_FORMAL_PARITY: proof.DIRECT_FORMAL_PARITY,
      asset_provenance: proof.asset_provenance,
      remaining_diff_classification: proof.remaining_diff_classification,
    };
    b2.B2_COMPLETE =
      proof.DIRECT_FORMAL_PARITY === "GREEN" &&
      b2.statuses.GROUP_FORMAL_PARITY === "GREEN" &&
      b2.statuses.GROUP_INFO_FORMAL_PARITY === "GREEN";
    writeFileSync(b2Path, JSON.stringify(b2, null, 2));
  }

  console.log(JSON.stringify({
    DIRECT_FORMAL_PARITY: proof.DIRECT_FORMAL_PARITY,
    before: PREV_DIFF,
    after: diff.diffRatio,
    geoOk,
    identityOk,
    snap: proof.snap,
    top_regions: proof.remaining_diff_classification.primary_drivers,
  }, null, 2));
} catch (e) {
  proof.error = String(e);
  writeFileSync(join(OUT, "B2_1_DIRECT_PROOF.json"), JSON.stringify(proof, null, 2));
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
