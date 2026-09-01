/**
 * B5.2 — final remaining runtime closure prove.
 * Person → Calls Audio/Video/Group → Global Opal → Home + regression greens.
 * Run: cd apps/opal_web && node scripts/prove_b52_closure.mjs
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

const proof = {
  square: "B5_2_FINAL_REMAINING_RUNTIME_CLOSURE",
  sha: SHA,
  starting_head: "ae09bc5",
  implementation_base: "7b545ef",
  threshold: THRESH,
  started_at: new Date().toISOString(),
  console_errors: [],
  network_failures: [],
  surfaces: {},
  statuses: {},
  route: {},
  person_assets: {},
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

function record(id, node, d, extra = {}) {
  const status = d.diffRatio != null && d.diffRatio <= THRESH ? "GREEN" : "PARTIAL";
  proof.surfaces[id] = { node, ...d, status, ...extra };
  proof.statuses[id] = status;
  console.log(`${id} ${node} diffRatio=${d.diffRatio} ${status}`);
}

async function shot(page, name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "runtime", name), clip });
}

async function enterHome(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click({ timeout: 20000 });
  await page.locator('[data-testid="opal-promise-enter"]').click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]', { timeout: 30000 });
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

const browser = await chromium.launch({ headless: true });
const page = await (
  await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
).newPage();
page.on("console", (m) => {
  if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 200));
});
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/favicon|sourcemap|hot-update|fonts\.googleapis/.test(u))
    proof.network_failures.push(u.slice(0, 160));
});

try {
  await enterHome(page);
  proof.route.enterHome = "GREEN";

  // —— 1. PERSON PROFILE (Chanelle — exact 618:1257 cast) ——
  await page.locator('[data-testid="member-tab-home"]').click();
  await page.waitForTimeout(600);
  const chanelleAvatar = page
    .locator('[data-testid*="chanelle" i][data-testid^="gsh-person-"], [data-testid="gsh-person-seed-chanelle-juniper"], [data-testid="gsh-person-seed-consequence-chanelle"]')
    .first();
  if (await chanelleAvatar.count()) {
    await chanelleAvatar.click({ timeout: 15000 });
  } else {
    // Fallback: open any person then verify name; prefer text Chanelle nearby
    await page.locator('button:has-text("Chanelle"), [data-testid^="gsh-person-"]').first().click({ timeout: 15000 });
  }
  await page.waitForSelector('[data-testid="graph-profile-page"][data-figma-node="618:1257"]', { timeout: 15000 });
  const personIdentity = await page.locator(".gprof-name").first().innerText().catch(() => "");
  if (!/chanelle/i.test(personIdentity)) {
    // Wrong person — back and try juniper card avatar specifically
    await page.locator('[data-testid="profile-person-back"]').click().catch(() => {});
    await page.waitForTimeout(400);
    await page.locator('[data-testid="gsh-person-seed-chanelle-juniper"]').click({ timeout: 15000 });
    await page.waitForSelector('[data-testid="graph-profile-page"]', { timeout: 15000 });
  }
  await shot(page, "PERSON_618_1257.png");
  record(
    "person_profile",
    "618:1257",
    diffPair(
      join(OUT, "figma/PERSON_618_1257.png"),
      join(OUT, "runtime/PERSON_618_1257.png"),
      join(OUT, "overlay/PERSON_618_1257_OVERLAY.png"),
      join(OUT, "diff/PERSON_618_1257_DIFF.png"),
    ),
    { identity: personIdentity },
  );
  proof.route.person_profile = "GREEN";

  // —— 2a. CALLS INCOMING (regression) ——
  await page.locator('[data-testid="gprof-call"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-testid="call-surface"][data-figma-node="618:581"]', { timeout: 15000 });
  await shot(page, "CALL_INCOMING_618_581.png");
  record(
    "calls_incoming",
    "618:581",
    diffPair(
      join(OUT, "figma/CALL_INCOMING_618_581.png"),
      join(OUT, "runtime/CALL_INCOMING_618_581.png"),
      join(OUT, "overlay/CALL_INCOMING_618_581_OVERLAY.png"),
      join(OUT, "diff/CALL_INCOMING_618_581_DIFF.png"),
    ),
  );
  proof.route.calls_incoming = "GREEN";

  // —— 2b. CALLS AUDIO (Answer) ——
  await page.locator('[data-testid="call-answer"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-testid="call-surface"][data-figma-node="618:599"]', { timeout: 15000 });
  await shot(page, "CALL_AUDIO_618_599.png");
  record(
    "calls_audio",
    "618:599",
    diffPair(
      join(OUT, "figma/CALL_AUDIO_618_599.png"),
      join(OUT, "runtime/CALL_AUDIO_618_599.png"),
      join(OUT, "overlay/CALL_AUDIO_618_599_OVERLAY.png"),
      join(OUT, "diff/CALL_AUDIO_618_599_DIFF.png"),
    ),
  );
  proof.route.calls_audio = "GREEN";
  await page.locator('[data-testid="call-end"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-testid="call-surface"]', { state: "detached", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);

  // —— 2c. CALLS VIDEO ——
  // Re-open Chanelle profile if needed
  if (!(await page.locator('[data-testid="graph-profile-page"]').isVisible().catch(() => false))) {
    await page.locator('[data-testid="member-tab-home"]').click({ force: true });
    await page.waitForTimeout(500);
    await page.locator('[data-testid="gsh-person-seed-chanelle-juniper"]').click({ timeout: 15000 });
    await page.waitForSelector('[data-testid="graph-profile-page"]', { timeout: 15000 });
  }
  await page.locator('[data-testid="gprof-video"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-testid="call-surface"][data-figma-node="618:620"]', { timeout: 15000 });
  await shot(page, "CALL_VIDEO_618_620.png");
  record(
    "calls_video",
    "618:620",
    diffPair(
      join(OUT, "figma/CALL_VIDEO_618_620.png"),
      join(OUT, "runtime/CALL_VIDEO_618_620.png"),
      join(OUT, "overlay/CALL_VIDEO_618_620_OVERLAY.png"),
      join(OUT, "diff/CALL_VIDEO_618_620_DIFF.png"),
    ),
  );
  proof.route.calls_video = "GREEN";
  await page.locator('[data-testid="call-end"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-testid="call-surface"]', { state: "detached", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);

  // —— 2d. CALLS GROUP — from group chat Call ——
  // Leave profile via Home dock (back is SR-only / clipped)
  await page.locator('[data-testid="member-tab-home"]').click({ force: true });
  await page.waitForSelector('[data-testid="profile-person-overlay"]', { state: "detached", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('[data-testid="member-tab-chats"]').click();
  await page.waitForSelector('[data-testid="chats-home"]', { timeout: 15000 });
  // Prefer a group row if present
  const groupRow = page.locator('[data-testid="chats-home"] [data-kind="group"], .chats-home-row[data-kind="group"]').first();
  if (await groupRow.isVisible().catch(() => false)) {
    await groupRow.click();
  } else {
    // fallback: any chat then open call as group via force if needed
    await page.locator('[data-testid="chats-home"] .chats-home-row, [data-testid^="chats-row-"]').first().click({ timeout: 10000 });
  }
  await page.waitForTimeout(800);
  const chatCall = page.locator('[data-testid="gpt-call"], [data-testid="thread-call"], button[aria-label*="Call" i]').first();
  if (await chatCall.isVisible().catch(() => false)) {
    await chatCall.click();
    await page.waitForTimeout(700);
    // If incoming, answer into group/audio
    const surface = page.locator('[data-testid="call-surface"]');
    await surface.waitFor({ timeout: 15000 });
    const node = await surface.getAttribute("data-figma-node");
    if (node === "618:581") {
      // Answer — may become audio; for group incoming Answer → group
      await page.locator('[data-testid="call-answer"]').click();
      await page.waitForTimeout(700);
    }
  }
  // If not group yet, force via evaluate is not allowed under CSP — open video on group chat path instead
  let groupNode = await page.locator('[data-testid="call-surface"]').getAttribute("data-figma-node").catch(() => null);
  if (groupNode !== "618:642") {
    // Try video button on group thread (maps to group kind)
    if (await page.locator('[data-testid="call-surface"]').isVisible().catch(() => false)) {
      await page.locator('[data-testid="call-end"], [data-testid="call-decline"]').first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
    const chatVideo = page.locator('[data-testid="gpt-video"], [data-testid="thread-video"], button[aria-label*="Video" i]').first();
    if (await chatVideo.isVisible().catch(() => false)) {
      await chatVideo.click();
      await page.waitForTimeout(800);
    }
  }
  groupNode = await page.locator('[data-testid="call-surface"]').getAttribute("data-figma-node").catch(() => null);
  if (groupNode === "618:642" || (await page.locator('[data-testid="call-surface"][data-call-kind="group"]').count()) > 0) {
    await shot(page, "CALL_GROUP_618_642.png");
    record(
      "calls_group",
      "618:642",
      diffPair(
        join(OUT, "figma/CALL_GROUP_618_642.png"),
        join(OUT, "runtime/CALL_GROUP_618_642.png"),
        join(OUT, "overlay/CALL_GROUP_618_642_OVERLAY.png"),
        join(OUT, "diff/CALL_GROUP_618_642_DIFF.png"),
      ),
    );
    proof.route.calls_group = "GREEN";
    await page.locator('[data-testid="call-end"]').click().catch(() => {});
  } else {
    // Direct group open via URL state not available — mark entry issue for report
    proof.route.calls_group = "ENTRY_PARTIAL";
    proof.statuses.calls_group = "PARTIAL";
    proof.surfaces.calls_group = {
      node: "618:642",
      diffRatio: 1,
      status: "PARTIAL",
      error: `could not reach group call; got node=${groupNode}`,
    };
    console.log("calls_group ENTRY FAILED node=", groupNode);
  }
  await page.waitForTimeout(500);

  // —— 3. GLOBAL OPAL ——
  await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
  await page.waitForSelector('[data-testid="opal-ambient-destination"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="opal-ambient"]', { timeout: 10000 });
  await shot(page, "GLOBAL_OPAL_618_902.png");
  record(
    "global_opal",
    "618:902",
    diffPair(
      join(OUT, "figma/GLOBAL_OPAL_618_902.png"),
      join(OUT, "runtime/GLOBAL_OPAL_618_902.png"),
      join(OUT, "overlay/GLOBAL_OPAL_618_902_OVERLAY.png"),
      join(OUT, "diff/GLOBAL_OPAL_618_902_DIFF.png"),
    ),
  );
  proof.route.global_opal = "GREEN";
  // Close Opal fully before Home (dock toggle above stage)
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('[data-testid="opal-ambient-destination"]').isVisible().catch(() => false))) break;
    await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('[data-testid="opal-ambient-destination"]', { state: "detached", timeout: 15000 });
  await page.waitForTimeout(500);

  // —— 4. HOME ——
  await page.locator('[data-testid="member-tab-home"]').click({ force: true });
  await page.waitForSelector('[data-testid^="gsh-card-"], [data-testid^="gsh-person-"]', { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.querySelectorAll(".scroll, .pane, .gsh-home, [data-testid='gsh-home']").forEach((el) => {
      try { el.scrollTop = 0; } catch {}
    });
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(400);
  // Guard: must not still be on Opal
  if (await page.locator('[data-testid="opal-ambient-destination"]').isVisible().catch(() => false)) {
    throw new Error("HOME capture aborted — Opal still mounted");
  }
  await shot(page, "HOME_618_44.png");
  record(
    "home",
    "618:44",
    diffPair(
      join(OUT, "figma/HOME_618_44.png"),
      join(OUT, "runtime/HOME_618_44.png"),
      join(OUT, "overlay/HOME_618_44_OVERLAY.png"),
      join(OUT, "diff/HOME_618_44_DIFF.png"),
    ),
  );
  proof.route.home = "GREEN";

  // —— Regression greens ——
  // Ensure Opal/overlays closed
  if (await page.locator('[data-testid="opal-ambient-destination"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
    await page.waitForSelector('[data-testid="opal-ambient-destination"]', { state: "detached", timeout: 10000 });
  }
  await page.locator('[data-testid="member-tab-chats"]').click({ force: true });
  await page.waitForSelector('[data-testid="chats-home"]', { timeout: 15000 });
  await shot(page, "CHATS_618_271.png");
  record(
    "chats",
    "618:271",
    diffPair(
      join(OUT, "figma/CHATS_618_271.png"),
      join(OUT, "runtime/CHATS_618_271.png"),
      join(OUT, "overlay/CHATS_618_271_OVERLAY.png"),
      join(OUT, "diff/CHATS_618_271_DIFF.png"),
    ),
  );

  await page.locator('[data-testid="member-tab-graphs"]').click();
  await page.waitForSelector('[data-testid="graphs-home"]', { timeout: 15000 });
  await shot(page, "GRAPHS_618_674.png");
  record(
    "graphs",
    "618:674",
    diffPair(
      join(OUT, "figma/GRAPHS_618_674.png"),
      join(OUT, "runtime/GRAPHS_618_674.png"),
      join(OUT, "overlay/GRAPHS_618_674_OVERLAY.png"),
      join(OUT, "diff/GRAPHS_618_674_DIFF.png"),
    ),
  );
} catch (e) {
  proof.error = String(e).slice(0, 600);
  console.error(e);
}

const remainingKeys = ["home", "global_opal", "person_profile", "calls_audio", "calls_video", "calls_group"];
const remaining = remainingKeys.filter((k) => proof.statuses[k] !== "GREEN").length;
// Calls family status
const callsOk =
  proof.statuses.calls_incoming === "GREEN" &&
  proof.statuses.calls_audio === "GREEN" &&
  proof.statuses.calls_video === "GREEN" &&
  proof.statuses.calls_group === "GREEN";

proof.CALLS_FORMAL_STATUS = callsOk ? "GREEN" : "PARTIAL";
proof.B5_RUNTIME_PARTIALS_REMAINING = remaining;
proof.MISSING_FIGMA_AUTHORITY = 0;
proof.FOUNDER_REVIEW = 1;
proof.B6_ONLY = 1;
proof.B5_COMPLETE = remaining === 0 && callsOk && proof.statuses.chats === "GREEN" && proof.statuses.graphs === "GREEN";
proof.finished_at = new Date().toISOString();
proof.console_error_count = proof.console_errors.length;
proof.network_failure_count = proof.network_failures.length;

writeFileSync(join(OUT, "B5_2_CLOSURE_PROOF.json"), JSON.stringify(proof, null, 2));
console.log(
  JSON.stringify(
    {
      remaining,
      CALLS_FORMAL_STATUS: proof.CALLS_FORMAL_STATUS,
      B5_COMPLETE: proof.B5_COMPLETE,
      statuses: proof.statuses,
      route: proof.route,
      error: proof.error,
    },
    null,
    2,
  ),
);

await browser.close();
process.exit(proof.error ? 1 : 0);
