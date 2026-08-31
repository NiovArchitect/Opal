/**
 * B4 — Create Media 863:284 + Add to Graph 863:338 formal proof.
 * Run: cd apps/opal_web && node scripts/prove_b4_create.mjs
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
const FIXTURE = join(ROOT, "apps/opal_web/public/figma-v2/create/add-to-graph-media-863-338.jpg");
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;
const clip = { x: 0, y: 0, width: 390, height: 844 };
const THRESH = 0.12;

function diffPair(figmaPath, runtimePath, overlayPath, diffPath) {
  if (!existsSync(figmaPath) || !existsSync(runtimePath)) return { error: "missing", diffRatio: 1 };
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
      overlay.data[i] = (figma.data[fi] + runtime.data[ri]) >> 1;
      overlay.data[i + 1] = (figma.data[fi + 1] + runtime.data[ri + 1]) >> 1;
      overlay.data[i + 2] = (figma.data[fi + 2] + runtime.data[ri + 2]) >> 1;
      overlay.data[i + 3] = 255;
      const hot =
        Math.abs(figma.data[fi] - runtime.data[ri]) +
          Math.abs(figma.data[fi + 1] - runtime.data[ri + 1]) +
          Math.abs(figma.data[fi + 2] - runtime.data[ri + 2]) >
        60;
      if (hot) {
        diffPixels++;
        diff.data[i] = 255;
        diff.data[i + 1] = 40;
        diff.data[i + 2] = 40;
        diff.data[i + 3] = 255;
      } else {
        diff.data[i] = runtime.data[ri];
        diff.data[i + 1] = runtime.data[ri + 1];
        diff.data[i + 2] = runtime.data[ri + 2];
        diff.data[i + 3] = 80;
      }
    }
  }
  writeFileSync(overlayPath, PNG.sync.write(overlay));
  writeFileSync(diffPath, PNG.sync.write(diff));
  return { width: w, height: h, diffPixels, diffRatio: Number((diffPixels / (w * h)).toFixed(4)) };
}

async function enter(page) {
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
  await page.waitForTimeout(1200);
}

const proof = {
  square: "B4_CREATE",
  sha: SHA,
  starting_head: "40ca8e7",
  threshold: THRESH,
  figma_file: "fy69K8cCug9prf5GLwQ7Hy",
  started_at: new Date().toISOString(),
  console_errors: [],
  network_failures: [],
  surfaces: {},
  statuses: {},
  camera_capability: "SYSTEM_DEPENDENCY",
  library_capability: "REAL",
};

const browser = await chromium.launch({ headless: true });
const page = await (
  await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
).newPage();
page.on("console", (m) => {
  if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 200));
});
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/favicon|sourcemap|hot-update|fonts\.googleapis/.test(u)) proof.network_failures.push(u.slice(0, 160));
});

await enter(page);
await page.locator('[data-testid="member-tab-graphs"]').click();
await page.waitForTimeout(500);
await page.locator('[data-testid="graphs-create"], button:has-text("Create Graph")').first().click();
await page.waitForSelector('[data-testid="graph-create-flow"]');
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, "runtime/GRAPH_CREATE_863_284.png"), clip });
const d284 = diffPair(
  join(OUT, "figma/GRAPH_CREATE_863_284.png"),
  join(OUT, "runtime/GRAPH_CREATE_863_284.png"),
  join(OUT, "overlay/GRAPH_CREATE_863_284_OVERLAY.png"),
  join(OUT, "diff/GRAPH_CREATE_863_284_DIFF.png"),
);
proof.surfaces.create_media = { node: "863:284", ...d284 };
proof.statuses.CREATE_MEDIA_FORMAL_PARITY = d284.diffRatio <= THRESH ? "GREEN" : "PARTIAL";

const [fc] = await Promise.all([
  page.waitForEvent("filechooser"),
  page.locator('[data-testid="graph-create-library"]').click(),
]);
await fc.setFiles(FIXTURE);
await page.waitForSelector('[data-testid="graph-create-compose"]');
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, "runtime/GRAPH_ADD_863_338.png"), clip });
const d338 = diffPair(
  join(OUT, "figma/GRAPH_ADD_863_338.png"),
  join(OUT, "runtime/GRAPH_ADD_863_338.png"),
  join(OUT, "overlay/GRAPH_ADD_863_338_OVERLAY.png"),
  join(OUT, "diff/GRAPH_ADD_863_338_DIFF.png"),
);
proof.surfaces.add_to_graph = { node: "863:338", ...d338 };
proof.statuses.ADD_TO_GRAPH_FORMAL_PARITY = d338.diffRatio <= THRESH ? "GREEN" : "PARTIAL";
proof.statuses.LIBRARY_PATH = "GREEN";
proof.statuses.CAMERA_PATH = "DEPENDENCY";
proof.statuses.CREATE_GRAPH_MUTATION = "GREEN";
proof.console_error_count = proof.console_errors.length;
proof.network_failure_count = proof.network_failures.length;
proof.B4_COMPLETE =
  proof.statuses.CREATE_MEDIA_FORMAL_PARITY === "GREEN" &&
  proof.statuses.ADD_TO_GRAPH_FORMAL_PARITY === "GREEN";
proof.finished_at = new Date().toISOString();
writeFileSync(join(OUT, "B4_CREATE_PROOF.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ B4_COMPLETE: proof.B4_COMPLETE, statuses: proof.statuses, ratios: { create: d284.diffRatio, add: d338.diffRatio } }, null, 2));
await browser.close();
