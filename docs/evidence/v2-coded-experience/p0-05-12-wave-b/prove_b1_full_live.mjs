/**
 * B1 — Full Live 863:2 formal capture + overlay + diff + path proof.
 * Run from apps/opal_web: node ../../docs/evidence/v2-coded-experience/p0-05-12-wave-b/prove_b1_full_live.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/p0-05-12-wave-b");
for (const d of ["runtime", "overlay", "diff", "figma"]) mkdirSync(join(OUT, d), { recursive: true });

const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;

const proof = {
  square: "B1_FULL_LIVE_863_2",
  sha: SHA,
  figma_file: "fy69K8cCug9prf5GLwQ7Hy",
  figma_node: "863:2",
  started_at: new Date().toISOString(),
  console_errors: [],
  network_failures: [],
  e2e: {},
  geometry: {},
  status: "PARTIAL",
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") proof.console_errors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => proof.console_errors.push(String(e).slice(0, 300)));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!/favicon|sourcemap|hot-update/.test(u)) proof.network_failures.push(u.slice(0, 200));
});

async function enterHome() {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fr00-tap-begin"]', { timeout: 15000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click();
  await page.waitForSelector('[data-testid="opal-promise-enter"]');
  await page.locator('[data-testid="opal-promise-enter"]').click();
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]');
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 45000 });
  const name = page
    .locator('[data-testid="fr08-display-name"], #fr-display-name, input[name="displayName"], input[autocomplete="name"]')
    .first();
  if (await name.isVisible().catch(() => false)) await name.fill("Founder");
  else {
    const vis = page.locator('[data-testid="fr08-profile"] input:not([type="file"]):not([type="hidden"])').first();
    if (await vis.isVisible().catch(() => false)) await vis.fill("Founder");
  }
  await page.locator('[data-testid="fr08-continue"], [data-testid="fr08-profile"] button.primary, button:has-text("Continue")').first().click();
  await page.waitForTimeout(900);
  const notNow = page.getByRole("button", { name: /Not now|Skip/i }).first();
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
  await page.waitForSelector('[data-testid="member-tab-home"]', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

try {
  await enterHome();

  // Open Live from Home Rare Live card
  const openLive = page.locator('[data-testid="gsh-open-live"], button:has-text("Open Live")').first();
  await openLive.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  proof.e2e.openLiveVisible = await openLive.isVisible().catch(() => false);
  if (!proof.e2e.openLiveVisible) {
    // fallback: live card
    const liveCard = page.locator('[data-testid*="live"], [data-figma-node="618:211"]').first();
    await liveCard.scrollIntoViewIfNeeded().catch(() => {});
    const btn = liveCard.locator('button:has-text("Open Live")').first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      proof.e2e.openLiveVisible = true;
    }
  } else {
    await openLive.click();
  }
  await page.waitForSelector('[data-testid="full-live-destination"], [data-figma-live="863:2"]', {
    timeout: 15000,
  });
  await page.waitForTimeout(800);

  proof.e2e.fullLive = await page.evaluate(() => {
    const dest = document.querySelector('[data-testid="full-live-destination"]');
    const panel = document.querySelector('[data-testid="graph-live-panel"]');
    const media = document.querySelector('[data-testid="full-live-media"] img');
    const dockGraphs = document.querySelector('[data-testid="member-tab-graphs"]');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: cs.fontSize,
        color: cs.color,
        borderRadius: cs.borderRadius,
        borderColor: cs.borderColor,
        background: cs.backgroundColor,
      };
    };
    return {
      destNode: dest?.getAttribute("data-figma-node"),
      navActive: dest?.getAttribute("data-nav-active"),
      panelNode: panel?.getAttribute("data-figma-live"),
      host: panel?.getAttribute("data-host"),
      broadcaster: panel?.getAttribute("data-broadcaster"),
      hostNe: panel?.getAttribute("data-host-ne-broadcaster"),
      mediaHash: panel?.getAttribute("data-live-media-hash"),
      sameReality: panel?.getAttribute("data-same-reality-home-live"),
      title: document.querySelector('[data-testid="full-live-title"]')?.textContent,
      area: document.querySelector('[data-testid="full-live-area"]')?.textContent,
      attribution: document.querySelector('[data-testid="glive-seed-label"]')?.textContent,
      videoBadge: !!document.querySelector('[data-testid="full-live-video-badge"]'),
      onWay: !!document.querySelector('[data-testid="glive-on-my-way"]'),
      disclosure: document.querySelector('[data-testid="full-live-disclosure"]')?.textContent,
      graphsActive:
        dockGraphs?.getAttribute("aria-current") === "page" ||
        dockGraphs?.classList.contains("is-active") ||
        dest?.getAttribute("data-nav-active") === "graphs",
      rects: {
        brand: rect(document.querySelector('[data-testid="full-live-brand"]')),
        pill: rect(document.querySelector('[data-testid="full-live-pill"]')),
        title: rect(document.querySelector('[data-testid="full-live-title"]')),
        area: rect(document.querySelector('[data-testid="full-live-area"]')),
        media: rect(document.querySelector('[data-testid="full-live-media"]')),
        badge: rect(document.querySelector('[data-testid="full-live-video-badge"]')),
        attribution: rect(document.querySelector('[data-testid="glive-seed-label"]')),
        state: rect(document.querySelector('[data-testid="full-live-state"]')),
        onway: rect(document.querySelector('[data-testid="glive-on-my-way"]')),
        disclosure: rect(document.querySelector('[data-testid="full-live-disclosure"]')),
      },
      mediaSrc: media?.getAttribute("src"),
    };
  });

  // Clip to phone frame
  const clip = { x: 0, y: 0, width: 390, height: 844 };
  const runtimePath = join(OUT, "runtime/RUNTIME_FULL_LIVE.png");
  const runtimePathAlt = join(OUT, "runtime/FULL_LIVE_863_2.png");
  await page.screenshot({ path: runtimePath, clip });
  await page.screenshot({ path: runtimePathAlt, clip });
  await page.screenshot({ path: join(OUT, "RUNTIME_FULL_LIVE_863_2.png"), clip });

  proof.geometry = proof.e2e.fullLive.rects;
  proof.identity = {
    title: proof.e2e.fullLive.title,
    host: proof.e2e.fullLive.host,
    broadcaster: proof.e2e.fullLive.broadcaster,
    hostNe: proof.e2e.fullLive.hostNe,
    mediaHash: proof.e2e.fullLive.mediaHash,
    sameReality: proof.e2e.fullLive.sameReality,
  };

  // Overlay + diff vs fresh Figma
  const figmaPath = join(OUT, "figma/FIGMA_FULL_LIVE_863_2.png");
  if (!existsSync(figmaPath)) throw new Error("missing fresh Figma capture");

  // Use Playwright canvas-less PNG compare via node buffer + raw decode with pngjs if present, else sharp, else simple note
  let overlayOk = false;
  try {
    const { PNG } = await import("pngjs");
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
        const fr = figma.data[fi];
        const fg = figma.data[fi + 1];
        const fb = figma.data[fi + 2];
        const rr = runtime.data[ri];
        const rg = runtime.data[ri + 1];
        const rb = runtime.data[ri + 2];
        // 50/50 blend overlay
        overlay.data[i] = (fr + rr) >> 1;
        overlay.data[i + 1] = (fg + rg) >> 1;
        overlay.data[i + 2] = (fb + rb) >> 1;
        overlay.data[i + 3] = 255;
        const dr = Math.abs(fr - rr);
        const dg = Math.abs(fg - rg);
        const db = Math.abs(fb - rb);
        const hot = dr + dg + db > 60;
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
    writeFileSync(join(OUT, "overlay/FULL_LIVE_863_2_OVERLAY.png"), PNG.sync.write(overlay));
    writeFileSync(join(OUT, "diff/FULL_LIVE_863_2_DIFF.png"), PNG.sync.write(diff));
    proof.diff = {
      width: w,
      height: h,
      diffPixels,
      diffRatio: Number((diffPixels / (w * h)).toFixed(4)),
      threshold: "sum_abs_rgb>60",
    };
    overlayOk = true;
  } catch (e) {
    proof.diff = { error: String(e).slice(0, 400), overlayOk: false };
  }

  // Geometry tolerance vs Figma absolute
  const expected = {
    brand: { x: 20, y: 18, w: 176, h: 40 },
    pill: { x: 20, y: 74 },
    title: { x: 20, y: 98 },
    area: { x: 20, y: 132 },
    media: { x: 20, y: 170, w: 350, h: 300 },
    state: { x: 20, y: 490, w: 350, h: 122 },
    onway: { x: 20, y: 636, w: 350, h: 52 },
    disclosure: { x: 20, y: 708 },
  };
  const tol = 3;
  const geoNotes = [];
  for (const [k, exp] of Object.entries(expected)) {
    const got = proof.geometry[k];
    if (!got) {
      geoNotes.push(`${k}: MISSING`);
      continue;
    }
    for (const axis of Object.keys(exp)) {
      if (Math.abs((got[axis] ?? 0) - exp[axis]) > tol) {
        geoNotes.push(`${k}.${axis}: got ${got[axis]} expected ${exp[axis]}`);
      }
    }
  }
  proof.geometry_mismatches = geoNotes;

  const identityOk =
    proof.e2e.fullLive?.title === "Rooftop jazz" &&
    proof.e2e.fullLive?.host === "Jordan" &&
    proof.e2e.fullLive?.broadcaster === "Sabrina" &&
    proof.e2e.fullLive?.hostNe === "true" &&
    proof.e2e.fullLive?.mediaHash === "1fd39e009e4f6e8f17bcbb4f4bc07e69fccd9190" &&
    proof.e2e.fullLive?.sameReality === "618:211";

  const geoOk = geoNotes.length === 0;
  const paintOk = overlayOk && proof.diff?.diffRatio != null && proof.diff.diffRatio < 0.12;
  proof.status = identityOk && geoOk && (paintOk || (overlayOk && proof.diff.diffRatio < 0.2))
    ? geoOk && paintOk
      ? "GREEN"
      : "PARTIAL"
    : identityOk
      ? "PARTIAL"
      : "RED";

  proof.founder_verification = {
    url: BASE,
    path: [
      "1. Open URL (resets first-run + founder seed)",
      "2. Tap to begin → Enter Opal → Skip for now → Continue profile → Not now",
      "3. On Home, scroll to Rare Live card → Open Live",
      "4. Full Live 863:2 appears (Rooftop jazz / Downtown / Sabrina·Jordan / Graphs dock active)",
    ],
    compare_against: "Figma node 863:2 (docs/.../figma/FIGMA_FULL_LIVE_863_2.png)",
  };

  proof.console_error_count = proof.console_errors.length;
  proof.network_failure_count = proof.network_failures.length;
  proof.finished_at = new Date().toISOString();
  proof.overlay_ok = overlayOk;

  writeFileSync(join(OUT, "B1_FULL_LIVE_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ status: proof.status, sha: SHA, geoNotes, diff: proof.diff, identityOk }, null, 2));
} catch (err) {
  proof.status = "RED";
  proof.error = String(err);
  writeFileSync(join(OUT, "B1_FULL_LIVE_PROOF.json"), JSON.stringify(proof, null, 2));
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
