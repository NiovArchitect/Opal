/**
 * B5.1 — measured reconciliation re-prove for remaining PARTIALs + Calls.
 * Run: cd apps/opal_web && node scripts/prove_b51_reconcile.mjs
 * Requires: Vite :5173 + Phoenix :4000
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

const SURFACES = [
  { id: "home", node: "618:44", figma: "HOME_618_44.png", runtime: "HOME_618_44.png", owner: "gsh-home, [data-testid=member-tab-home]" },
  { id: "chats", node: "618:271", figma: "CHATS_618_271.png", runtime: "CHATS_618_271.png", owner: "[data-testid=chats-home]" },
  { id: "search", node: "618:2299", figma: "SEARCH_618_2299.png", runtime: "SEARCH_618_2299.png", owner: "[data-testid=search-destination]" },
  { id: "graphs", node: "618:674", figma: "GRAPHS_618_674.png", runtime: "GRAPHS_618_674.png", owner: "[data-testid=graphs-home]" },
  { id: "graph_detail", node: "618:758", figma: "GRAPH_DETAIL_618_758.png", runtime: "GRAPH_DETAIL_618_758.png", owner: "[data-testid=graph-detail], [data-figma-node='618:758']" },
  { id: "global_opal", node: "618:902", figma: "GLOBAL_OPAL_618_902.png", runtime: "GLOBAL_OPAL_618_902.png", owner: "[data-testid=opal-ambient], .opal-ambient" },
  { id: "person_profile", node: "618:1257", figma: "PERSON_618_1257.png", runtime: "PERSON_618_1257.png", owner: "[data-testid=graph-profile-page], [data-figma-node='618:1257']" },
  { id: "calls_incoming", node: "618:581", figma: "CALL_INCOMING_618_581.png", runtime: "CALL_INCOMING_618_581.png", owner: "[data-testid=call-surface], .call-surface" },
];

const proof = {
  square: "B5_1_MEASURED_RECONCILIATION",
  sha: SHA,
  starting_head: "a67a227",
  threshold: THRESH,
  started_at: new Date().toISOString(),
  console_errors: [],
  network_failures: [],
  surfaces: {},
  statuses: {},
  route: {},
  calls_ledger: {
    classification: "B5_RUNTIME_PARTIAL",
    reason: "eighth B5 runtime PARTIAL — CallSurfaces implements 618:581/599/620/642; not Settings 618:1733; not B6_ONLY",
  },
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
      const fr = figma.data[fi],
        fg = figma.data[fi + 1],
        fb = figma.data[fi + 2];
      const rr = runtime.data[ri],
        rg = runtime.data[ri + 1],
        rb = runtime.data[ri + 2];
      overlay.data[i] = (fr + rr) >> 1;
      overlay.data[i + 1] = (fg + rg) >> 1;
      overlay.data[i + 2] = (fb + rb) >> 1;
      overlay.data[i + 3] = 255;
      const hot = Math.abs(fr - rr) + Math.abs(fg - rg) + Math.abs(fb - rb) > 60;
      if (hot) {
        diffPixels++;
        diff.data[i] = 255;
        diff.data[i + 1] = 40;
        diff.data[i + 2] = 40;
        diff.data[i + 3] = 255;
      } else {
        diff.data[i] = rr;
        diff.data[i + 1] = rg;
        diff.data[i + 2] = rb;
        diff.data[i + 3] = 80;
      }
    }
  }
  writeFileSync(overlayPath, PNG.sync.write(overlay));
  writeFileSync(diffPath, PNG.sync.write(diff));
  return { width: w, height: h, diffPixels, diffRatio: Number((diffPixels / (w * h)).toFixed(4)) };
}

async function shot(page, runtimeName) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "runtime", runtimeName), clip });
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

async function enterHome() {
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

function record(id, node, d, extra = {}) {
  const status = d.diffRatio != null && d.diffRatio <= THRESH ? "GREEN" : "PARTIAL";
  proof.surfaces[id] = { node, ...d, status, ...extra };
  proof.statuses[id] = status;
  console.log(`${id} ${node} diffRatio=${d.diffRatio} ${status}`);
}

try {
  await enterHome();
  proof.route.enterHome = "GREEN";

  // HOME — scroll origin top (formal compares Figma top 844 of tall frame)
  await page.locator('[data-testid="member-tab-home"]').click();
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const scrollers = document.querySelectorAll(".gsh-home, .pane, .scroll, [data-testid='gsh-home']");
    scrollers.forEach((el) => {
      try { el.scrollTop = 0; } catch {}
    });
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(400);
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

  // PERSON PROFILE — capture while Home feed is fresh (before Opal mount)
  const avatar = page.locator('[data-testid^="gsh-person-"]').first();
  await avatar.click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="graph-profile-page"][data-figma-node="618:1257"]', { timeout: 15000 });
  const personIdentity = await page.locator(".gprof-name").first().innerText().catch(() => "");
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
    { identity: personIdentity, route: "GraphProfilePage via Home avatar" },
  );
  proof.route.person_profile = "GREEN";
  proof.person_identity = personIdentity;

  // CALLS Incoming — from profile Call
  const callBtn = page.locator('[data-testid="gprof-call"]').first();
  await callBtn.click({ timeout: 10000 });
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
  await page.locator('[data-testid="call-decline"]').click({ timeout: 10000 });
  await page.waitForSelector('[data-testid="call-surface"]', { state: "detached", timeout: 10000 }).catch(() => {});
  const personBack = page.locator('[data-testid="profile-person-back"]').first();
  if (await personBack.isVisible().catch(() => false)) await personBack.click();
  await page.waitForTimeout(500);

  // CHATS
  await page.locator('[data-testid="member-tab-chats"]').click();
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
  proof.route.chats = "GREEN";

  // SEARCH — from Chats New+
  const newPlus = page.locator('[data-testid="chats-home-new"], [data-testid="chats-new-plus"], button:has-text("+")').first();
  if (await newPlus.isVisible().catch(() => false)) {
    await newPlus.click();
  } else {
    // fallback: home search
    await page.locator('[data-testid="member-tab-home"]').click();
    await page.waitForTimeout(400);
    const searchBtn = page.locator('[data-testid="gsh-search"], [aria-label*="Search" i]').first();
    await searchBtn.click({ timeout: 10000 });
  }
  await page.waitForSelector('[data-testid="search-destination"]', { timeout: 15000 });
  await shot(page, "SEARCH_618_2299.png");
  record(
    "search",
    "618:2299",
    diffPair(
      join(OUT, "figma/SEARCH_618_2299.png"),
      join(OUT, "runtime/SEARCH_618_2299.png"),
      join(OUT, "overlay/SEARCH_618_2299_OVERLAY.png"),
      join(OUT, "diff/SEARCH_618_2299_DIFF.png"),
    ),
  );
  proof.route.search = "GREEN";
  // dismiss search
  const searchBack = page.locator('[data-testid="search-back"], [data-testid="search-destination"] button[aria-label="Back"]').first();
  if (await searchBack.isVisible().catch(() => false)) await searchBack.click();
  else await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // GRAPHS
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
  proof.route.graphs = "GREEN";

  // GRAPH DETAIL — Juniper authority card (618:758 cast)
  const graphCard = page.locator('[data-testid="graphs-open-seed-chanelle-juniper"], [data-testid^="graphs-open-"]').first();
  await graphCard.click({ timeout: 10000 });
  await page.waitForTimeout(900);
  await shot(page, "GRAPH_DETAIL_618_758.png");
  record(
    "graph_detail",
    "618:758",
    diffPair(
      join(OUT, "figma/GRAPH_DETAIL_618_758.png"),
      join(OUT, "runtime/GRAPH_DETAIL_618_758.png"),
      join(OUT, "overlay/GRAPH_DETAIL_618_758_OVERLAY.png"),
      join(OUT, "diff/GRAPH_DETAIL_618_758_DIFF.png"),
    ),
  );
  proof.route.graph_detail = "GREEN";
  const detailBack = page.locator('[data-testid="graph-detail-back"], [aria-label="Back"]').first();
  if (await detailBack.isVisible().catch(() => false)) await detailBack.click();
  await page.waitForTimeout(400);

  // GLOBAL OPAL — center dock → full destination 618:902 (not Home+listening)
  const opalTab = page.locator('[data-testid="member-tab-opal"]').first();
  await opalTab.click({ timeout: 10000 });
  await page.waitForSelector('[data-testid="opal-ambient-destination"][data-opal-mount="full-screen"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="opal-ambient"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="opal-neural-field"], .opal-ambient-field, .opal-convo', { timeout: 10000 });
  await page.waitForTimeout(500);
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
} catch (e) {
  proof.error = String(e).slice(0, 500);
  console.error(e);
}

const remaining = Object.values(proof.statuses).filter((s) => s === "PARTIAL").length;
proof.B5_RUNTIME_PARTIALS_REMAINING = remaining;
proof.MISSING_FIGMA_AUTHORITY = 0;
proof.FOUNDER_REVIEW = 1;
proof.B6_ONLY = 1;
proof.B5_COMPLETE = remaining === 0;
proof.finished_at = new Date().toISOString();
proof.console_error_count = proof.console_errors.length;
proof.network_failure_count = proof.network_failures.length;

writeFileSync(join(OUT, "B5_1_RECONCILE_PROOF.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ remaining, statuses: proof.statuses, route: proof.route, error: proof.error }, null, 2));

await browser.close();
process.exit(proof.error ? 1 : 0);
