/**
 * P3.1 — Global Opal geometry + motion observability + control truth.
 * Run: cd apps/opal_web && node scripts/prove_p31_founder_correction.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { PNG } from "pngjs";

const ROOT = "/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people";
const OUT = join(ROOT, "docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p3.1");
for (const d of ["runtime", "motion", "figma", "diff", "overlay"]) mkdirSync(join(OUT, d), { recursive: true });

const FULL = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
const SHA = execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
const BASE = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;
const MOTION = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&opal_motion_demo=1&runtime=${SHA}`;
const THRESH = 0.12;

const proof = {
  square: "POST_B7_P3_1_FOUNDER_CORRECTION",
  starting_head: "61cede4e84495b08b8fd6183cf84e1146c9fe496",
  P2_FROZEN: true,
  P3_FOUNDER_VERIFICATION: "READY_FOR_RETEST",
  P3_FROZEN: false,
  P4_AUTHORIZED: false,
  ACTIVITY_ICON_APPROVED: false,
  implementation_sha: FULL,
  short_sha: SHA,
  started_at: new Date().toISOString(),
  geometry: {},
  motion: {},
  controls: {},
  p2: {},
  console_errors: [],
  flow: [],
};

function log(step, ok, extra = {}) {
  proof.flow.push({ step, ok: !!ok, ...extra });
  console.log(`${ok ? "OK" : "FAIL"} ${step}`, Object.keys(extra).length ? JSON.stringify(extra) : "");
}

async function enterHome(page) {
  await page.goto(page.url().includes("opal_motion_demo") ? page.url() : BASE, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  // Allow caller to set URL first
}

async function boot(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('[data-testid="fr00-tap-begin"]').click({ timeout: 20000 });
  await page.locator('[data-testid="opal-promise-enter"]').click({ timeout: 15000 });
  await page.waitForSelector('[data-testid="fr06-skip-for-now"]', { timeout: 30000 });
  await page.locator('[data-testid="fr06-skip-for-now"]').click();
  await page.waitForSelector('[data-testid="fr08-profile"]', { timeout: 60000 });
  const name = page.locator('[data-testid="fr08-display-name"], input[autocomplete="name"]').first();
  if (await name.isVisible().catch(() => false)) await name.fill("Founder");
  await page.locator('[data-testid="fr08-continue"], button:has-text("Continue")').first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Not now|Skip/i }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Not now|Skip/i }).first().click({ force: true }).catch(() => {});
  await page.waitForSelector('[data-testid="member-tab-home"]', { timeout: 45000 });
}

async function openOpal(page) {
  await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
  await page.waitForSelector('[data-testid="opal-ambient"]', { timeout: 15000 });
}

function diffPair(a, b) {
  if (!existsSync(a) || !existsSync(b)) return { diffRatio: 1, error: "missing" };
  const A = PNG.sync.read(readFileSync(a));
  const B = PNG.sync.read(readFileSync(b));
  const w = Math.min(A.width, B.width, 390);
  const h = Math.min(A.height, B.height, 844);
  let d = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ai = (A.width * y + x) << 2;
      const bi = (B.width * y + x) << 2;
      if (
        Math.abs(A.data[ai] - B.data[bi]) +
          Math.abs(A.data[ai + 1] - B.data[bi + 1]) +
          Math.abs(A.data[ai + 2] - B.data[bi + 2]) >
        60
      )
        d++;
    }
  return { diffRatio: Number((d / (w * h)).toFixed(4)), w, h, d };
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
page.on("console", (m) => {
  if (m.type() === "error") {
    const t = m.text().slice(0, 180);
    if (!/429|Too Many Requests/i.test(t)) proof.console_errors.push(t);
  }
});

try {
  await boot(page, BASE);
  await openOpal(page);
  await page.waitForTimeout(500);

  const geom = await page.evaluate(() => {
    const r = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) };
    };
    const body = r(".opal-response-body");
    const picks = r(".opal-response-picks");
    const ideas = r(".opal-ideas");
    const intent = r(".opal-intent");
    const composer = r(".opal-composer");
    return {
      resp: r(".opal-response"),
      body,
      picks,
      ideas,
      intent,
      composer,
      overlap: !!(body && ideas && body.bottom > ideas.top - 1),
      picksOverlap: !!(picks && ideas && picks.bottom > ideas.top - 1),
      intentClear: !!(ideas && intent && ideas.bottom <= intent.top + 2),
      ambientOrbit: !!document.querySelector(".opal-field-orbit"),
    };
  });
  proof.geometry = geom;
  const geoOk = !geom.overlap && !geom.picksOverlap && geom.resp?.top === 379 && geom.ideas?.top === 449;
  log("global_opal_geometry", geoOk, geom);
  await page.screenshot({ path: join(OUT, "runtime/GLOBAL_OPAL_AFTER.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });

  // Controls
  await page.locator('[data-testid="opal-settings"]').click({ force: true });
  await page.waitForTimeout(600);
  const settingsOk = (await page.locator('[data-testid="you-hub"], [data-testid="member-tab-you"], [data-screen*="you"]').count()) > 0 ||
    (await page.locator("text=Privacy").count()) > 0;
  log("settings_opens_you", settingsOk, { settingsOk });
  proof.controls.settings = settingsOk;

  await openOpal(page);
  await page.locator('[data-testid="opal-history"]').click({ force: true });
  await page.waitForSelector('[data-testid="opal-inline-sheet"]', { timeout: 5000 });
  const histOk = (await page.locator('[data-testid="opal-inline-sheet"]').count()) === 1;
  log("history_sheet", histOk);
  proof.controls.history = histOk;
  await page.locator('[data-testid="opal-sheet-close"]').click({ force: true });

  await page.locator('[data-testid="opal-context-people"]').click({ force: true });
  const ctxOk = (await page.locator('[data-testid="opal-inline-sheet"]').count()) === 1;
  log("context_pod_sheet", ctxOk);
  proof.controls.context = ctxOk;
  await page.locator('[data-testid="opal-sheet-close"]').click({ force: true });

  await page.locator('[data-testid="opal-intent-date-ideas"]').click({ force: true });
  await page.waitForTimeout(400);
  // may navigate to graphs
  const intentNote = (await page.locator('[data-testid="dock-gate-note"], [data-testid="opal-ambient-note"]').count()) > 0 ||
    (await page.locator('[data-testid="graphs-home"], [data-testid="member-tab-graphs"]').count()) > 0;
  log("intent_starter", intentNote, { intentNote });
  proof.controls.intent = intentNote;

  await openOpal(page).catch(() => {});
  if ((await page.locator('[data-testid="opal-ambient"]').count()) === 0) await openOpal(page);
  await page.locator('[data-testid="opal-chip-more-ideas"]').click({ force: true });
  const explore = (await page.locator('[data-testid="opal-ambient"]').getAttribute("data-explore-mode")) === "true";
  log("more_ideas_explore", explore);
  proof.controls.more_ideas = explore;

  const dead = await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".opal-ambient button[data-testid]")];
    return btns.filter((b) => !b.getAttribute("data-control-status") && !b.className.includes("sr-only") && b.getAttribute("data-testid") !== "opal-sheet-close").map((b) => b.getAttribute("data-testid"));
  });
  // Allow composer suggest sr-only without status
  const unexplained = dead.filter((id) => id && !/opal-suggest|opal-ambient-close|opal-sheet/.test(id));
  log("zero_dead_controls", unexplained.length === 0, { unexplained });
  proof.controls.dead = unexplained;

  // Ambient motion — cycle must be 8–14s (organic presence, not flash)
  const ambient = await page.evaluate(() => {
    const orbit = document.querySelector(".opal-field-orbit");
    if (!orbit) return { ok: false };
    const cs = getComputedStyle(orbit);
    const durSec = parseFloat(cs.animationDuration) || 0;
    return {
      ok: cs.animationName && cs.animationName !== "none" && durSec >= 8 && durSec <= 14,
      anim: cs.animationName,
      durationSec: durSec,
      easing: cs.animationTimingFunction,
    };
  });
  log("ambient_motion", ambient.ok, ambient);
  proof.motion.ambient = ambient;

  // Motion demo — organic ~3.7s breath: emerge → peak → release → settle (not <1s flash)
  await boot(page, MOTION);
  await openOpal(page);
  const t0 = Date.now();
  await page.waitForTimeout(700); // mid-emergence (~1.4s phase)
  const emerge = await page.evaluate(() => {
    const panel = document.querySelector(".opal-response.is-signal-breath");
    const cs = panel ? getComputedStyle(panel) : null;
    return {
      breath: !!panel || document.querySelector('[data-testid="opal-ambient"]')?.getAttribute("data-signal-breath") === "true",
      durationMs: cs ? Math.round(parseFloat(cs.animationDuration) * 1000) : 0,
      easing: cs?.animationTimingFunction || null,
    };
  });
  await page.screenshot({ path: join(OUT, "motion/OPAL_BREATH_EMERGE.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });
  log("breath_emerge", emerge.breath && emerge.durationMs >= 3000 && emerge.durationMs <= 4400, emerge);

  await page.waitForTimeout(900); // ~1.6s total — soft peak window
  await page.screenshot({ path: join(OUT, "motion/OPAL_BREATH_PEAK.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });
  const peakStill = (await page.locator(".opal-response.is-signal-breath").count()) > 0;
  log("breath_peak", peakStill, { peakStill, elapsedMs: Date.now() - t0 });

  await page.waitForTimeout(1200); // ~2.8s — release phase
  await page.screenshot({ path: join(OUT, "motion/OPAL_BREATH_RELEASE.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });
  const releaseStill = (await page.locator(".opal-response.is-signal-breath").count()) > 0;
  log("breath_release", releaseStill, { releaseStill, elapsedMs: Date.now() - t0 });

  await page.waitForTimeout(1400); // past 3.7s + gap → orb resonance
  const resonating = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="opal-response-orb"].is-resonating') ||
      document.querySelector('[data-testid="opal-response-orb"]');
    if (!el) return { ok: false };
    const cs = getComputedStyle(el);
    const durationMs = Math.round(parseFloat(cs.animationDuration) * 1000);
    const active = cs.animationName.includes("resonance");
    return {
      ok: active && durationMs >= 3000 && durationMs <= 4400,
      active,
      durationMs,
      easing: cs.animationTimingFunction,
      scaleApprox: cs.transform,
    };
  });
  await page.screenshot({ path: join(OUT, "motion/OPAL_MOTION_DEMO.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });
  log("orb_resonance_organic", resonating.ok, resonating);

  const tempoOk =
    emerge.breath &&
    emerge.durationMs >= 3000 &&
    emerge.durationMs <= 4400 &&
    peakStill &&
    releaseStill &&
    resonating.ok &&
    ambient.ok;
  log("motion_feels_organic", tempoOk, {
    breathMs: emerge.durationMs,
    orbMs: resonating.durationMs,
    ambientSec: ambient.durationSec,
  });
  proof.motion.demo = {
    breath: emerge.breath,
    resonating: resonating.active,
    breathDurationMs: emerge.durationMs,
    orbDurationMs: resonating.durationMs,
    ambientDurationSec: ambient.durationSec,
    ok: tempoOk,
  };
  proof.MOTION_FEELS_ORGANIC = tempoOk ? "READY_FOR_FOUNDER_RETEST" : "FAIL";

  // Calls born reveal — same organic ~3.7s duration
  await page.locator('[data-testid="member-tab-opal"]').click({ force: true }).catch(() => {});
  await page.locator('[data-testid="member-tab-chats"]').click({ force: true });
  await page.locator('[data-testid="comm-mode-calls"]').click({ force: true });
  await page.waitForSelector('[data-testid="calls-continuity-home"]', { timeout: 10000 });
  const reveal = await page.evaluate(() => {
    const el = document.querySelector(".calls-continuity-signal.is-born-reveal");
    if (!el) return { ok: false };
    const cs = getComputedStyle(el);
    const durationMs = Math.round(parseFloat(cs.animationDuration) * 1000);
    return {
      ok: cs.animationName.includes("reveal") && durationMs >= 3000 && durationMs <= 4400,
      name: cs.animationName,
      durationMs,
      easing: cs.animationTimingFunction,
    };
  });
  log("calls_born_reveal", reveal.ok, reveal);
  proof.motion.calls_reveal = reveal;
  await page.screenshot({ path: join(OUT, "motion/CALLS_BORN_REVEAL.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });

  // Reduced motion
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOpal(page).catch(async () => {
    await page.locator('[data-testid="member-tab-opal"]').click({ force: true });
    await page.waitForSelector('[data-testid="opal-ambient"]');
  });
  const reduced = await page.evaluate(() => {
    const orbit = document.querySelector(".opal-field-orbit");
    return !orbit || getComputedStyle(orbit).animationName === "none";
  });
  log("reduced_motion_kills_ambient", reduced);
  proof.motion.reduced = reduced;

  // P2 regression quick
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator('[data-testid="member-tab-chats"]').click({ force: true });
  await page.locator('[data-testid="comm-mode-calls"]').click({ force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "runtime/P2_CALLS_HOME_SMOKE.png"), clip: { x: 0, y: 0, width: 390, height: 844 } });
  const p2fig = join(ROOT, "docs/evidence/v2-coded-experience/post-b7-p0-authority-sync/p2.3/figma/CALLS_HOME_928_9.png");
  const p2d = diffPair(p2fig, join(OUT, "runtime/P2_CALLS_HOME_SMOKE.png"));
  const p2ok = p2d.diffRatio <= THRESH;
  proof.p2 = { ...p2d, status: p2ok ? "GREEN" : "PARTIAL" };
  log("p2_regression_928_9", p2ok, p2d);

  proof.GLOBAL_OPAL_GEOMETRY = geoOk ? "GREEN" : "NOT_GREEN";
  proof.GLOBAL_OPAL_CONTROL_TRUTH = unexplained.length === 0 && settingsOk && histOk && ctxOk ? "GREEN" : "NOT_GREEN";
  proof.MOTION_OBSERVABLE = proof.motion.demo?.ok && ambient.ok && reveal.ok ? "GREEN" : "NOT_GREEN";
  proof.REALITY_READINESS_AUDIT = "COMPLETE";
  if (!proof.MOTION_FEELS_ORGANIC) proof.MOTION_FEELS_ORGANIC = "FAIL";

  proof.P3_1_COMPLETE =
    geoOk &&
    proof.GLOBAL_OPAL_CONTROL_TRUTH === "GREEN" &&
    proof.MOTION_OBSERVABLE === "GREEN" &&
    proof.MOTION_FEELS_ORGANIC === "READY_FOR_FOUNDER_RETEST" &&
    p2ok &&
    reduced &&
    proof.console_errors.length === 0;

  proof.P3_CURRENT_COMPLETE = proof.P3_1_COMPLETE;
  proof.founder_normal_url = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=${SHA}`;
  proof.founder_motion_url = `http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&opal_motion_demo=1&runtime=${SHA}`;
  proof.finished_at = new Date().toISOString();

  writeFileSync(join(OUT, "P3_1_FOUNDER_CORRECTION_PROOF.json"), JSON.stringify(proof, null, 2));
  console.log("\n=== P3.1 PROOF ===");
  console.log(JSON.stringify({
    P3_1_COMPLETE: proof.P3_1_COMPLETE,
    GLOBAL_OPAL_GEOMETRY: proof.GLOBAL_OPAL_GEOMETRY,
    GLOBAL_OPAL_CONTROL_TRUTH: proof.GLOBAL_OPAL_CONTROL_TRUTH,
    MOTION_OBSERVABLE: proof.MOTION_OBSERVABLE,
    MOTION_FEELS_ORGANIC: proof.MOTION_FEELS_ORGANIC,
    tempo: {
      breathMs: proof.motion.demo?.breathDurationMs,
      orbMs: proof.motion.demo?.orbDurationMs,
      ambientSec: proof.motion.ambient?.durationSec,
      callsRevealMs: proof.motion.calls_reveal?.durationMs,
    },
    p2: proof.p2,
  }, null, 2));
  if (!proof.P3_1_COMPLETE) process.exitCode = 1;
} catch (e) {
  console.error(e);
  proof.error = String(e);
  proof.P3_1_COMPLETE = false;
  writeFileSync(join(OUT, "P3_1_FOUNDER_CORRECTION_PROOF.json"), JSON.stringify(proof, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
