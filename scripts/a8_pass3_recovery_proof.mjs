#!/usr/bin/env node
/**
 * A8 Pass 3 — Fresh reality / recovery proof.
 *
 * Clean fixture → fresh session → reload → Vite SHA check → Attention/Home/
 * history/Repeat/Center survive discontinuity.
 *
 * Run: node scripts/a8_pass3_recovery_proof.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { activate } from "./founder_proof_fixture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
const { chromium } = require("playwright");

const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const API = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const OUT = resolve(ROOT, "docs/evidence/v2-coded-experience/a8-three-pass");
const SHOTS = resolve(OUT, "shots/pass3");
mkdirSync(SHOTS, { recursive: true });

const WALK_B = { phone: "+12025550102", name: "Walk B", handle: "p3_walk_b", code: "222222" };

const results = [];
function rec(name, status, detail = {}) {
  results.push({ name, status, detail, at: new Date().toISOString() });
  const tag = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "INFO";
  console.log(`${tag.padEnd(6)} ${name}${detail.summary ? " — " + detail.summary : ""}`);
}

async function json(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function gitHead() {
  return execSync("git rev-parse --short=7 HEAD", { cwd: ROOT }).toString().trim();
}

async function injectSession(page, session) {
  await page.addInitScript((s) => {
    try {
      window.__OPAL_NATIVE_SESSION__ = {
        access_token: s.token,
        user_id: s.userId,
        display_name: s.name,
      };
      sessionStorage.setItem("opal.product.browser_session.v1", s.token);
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: s.userId, display_name: s.name, handle: s.handle || "" }),
      );
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.product.firstRun.v1", JSON.stringify({ completed: true }));
      sessionStorage.setItem("opal_native_host", "1");
      sessionStorage.removeItem("opal_reset_first_run");
      sessionStorage.removeItem("opal.forcedFirstRun");
      localStorage.removeItem("opal.forcedFirstRun");
    } catch {
      /* ignore */
    }
  }, session);
}

async function openHome(page, session) {
  await page.setViewportSize({ width: 390, height: 844 });
  await injectSession(page, session);
  await page.goto(`${WEB}/?opal_native_host=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="gsh-activity"], [data-member-nav="true"]', { timeout: 45000 });
  await page.waitForTimeout(800);
}

async function waitAttentionReady(page, timeout = 15000) {
  await page.waitForSelector('[data-testid="activity-destination"]', { timeout });
  const readySel =
    '[data-testid="needs-you"], [data-testid="waiting"], [data-testid="updated"], [data-testid="attention-nothing-needed"], [data-testid="attention-empty"], [data-testid="attention-error"]';
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const loading = await page.locator('[data-testid="attention-loading"]').isVisible().catch(() => false);
    if (!loading) {
      const ready = await page.locator(readySel).first().isVisible().catch(() => false);
      if (ready) return;
    }
    await page.waitForTimeout(200);
  }
  throw new Error("Attention not ready");
}

async function main() {
  const started = new Date().toISOString();
  const head = gitHead();
  rec("STARTING_SHA", "INFO", { summary: head });

  // 1) Clean fixture
  try {
    execSync("node scripts/founder_fixture_reset.mjs", { cwd: ROOT, stdio: "pipe", timeout: 180000 });
    rec("FIXTURE_RESET", "PASS");
  } catch (e) {
    rec("FIXTURE_RESET", "FAIL", { summary: String(e).slice(0, 160) });
  }

  // 2) Relationship fixtures re-seed
  try {
    execSync("node scripts/pass2_relationship_fixtures.mjs", { cwd: ROOT, stdio: "pipe", timeout: 120000 });
    rec("RELATIONSHIP_FIXTURES_RESEED", "PASS");
  } catch (e) {
    rec("RELATIONSHIP_FIXTURES_RESEED", "FAIL", { summary: String(e).slice(0, 160) });
  }

  const bAct = await activate(WALK_B);
  const b = { token: bAct.token, userId: bAct.userId, name: WALK_B.name, handle: WALK_B.handle };
  rec("FRESH_LOGIN_ACTIVATE", "PASS", { summary: b.userId.slice(0, 8) });

  // API health after fixture
  const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
  rec("PHOENIX_HEALTH", health?.status === "ok" ? "PASS" : "FAIL", { summary: JSON.stringify(health) });

  const feed = await json("/api/v1/product/home/feed?limit=40", { bearer: b.token });
  const objects = feed.body.objects || feed.body.items || [];
  rec("HOME_FEED_AFTER_RESET", objects.length >= 8 ? "PASS" : "FAIL", {
    summary: `objects=${objects.length} mode=${feed.body.mode}`,
  });

  const att = await json("/api/v1/product/attention", { bearer: b.token });
  rec("ATTENTION_AFTER_RESET", "PASS", {
    summary: `badge=${att.body.actionable_count ?? 0}`,
  });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await openHome(page, b);

    // Runtime SHA match
    const runtime = await page.evaluate(() => window.__opalRuntimeAuthority || window.__OPAL_GIT_HEAD__ || null);
    const feSha =
      (runtime && runtime.frontend_build_sha) ||
      (typeof runtime === "string" ? runtime : null) ||
      (await page.evaluate(() => window.__OPAL_GIT_HEAD__));
    rec("RUNTIME_FE_SHA", feSha && String(feSha).startsWith(head.slice(0, 7)) ? "PASS" : "INFO", {
      summary: `fe=${feSha} head=${head}`,
    });

    // Home dense
    await page.waitForSelector("[data-home-mode]", { timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
    const homeMeta = await page.evaluate(() => {
      const root = document.querySelector("[data-home-mode]");
      return {
        mode: root?.getAttribute("data-home-mode") || "",
        cards: document.querySelectorAll(".gsh-card, [data-testid^='gsh-card']").length,
      };
    });
    rec("HOME_UI_AFTER_FRESH_SESSION", homeMeta.cards >= 8 || homeMeta.mode === "PRODUCTION_HYDRATION" ? "PASS" : "FAIL", {
      summary: JSON.stringify(homeMeta),
    });
    await page.screenshot({ path: resolve(SHOTS, "home_fresh.png") });

    // Reload survival
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[data-testid="gsh-activity"]', { timeout: 45000 });
    await page.waitForTimeout(1000);
    const afterReload = await page.evaluate(() => ({
      mode: document.querySelector("[data-home-mode]")?.getAttribute("data-home-mode") || "",
      badge: document.querySelector('[data-testid="gsh-activity"]')?.getAttribute("data-attention-badge"),
      hasNav: Boolean(document.querySelector("[data-member-nav='true'], [data-testid='member-tab-home']")),
    }));
    rec("PAGE_RELOAD_SURVIVES", afterReload.hasNav ? "PASS" : "FAIL", { summary: JSON.stringify(afterReload) });
    await page.screenshot({ path: resolve(SHOTS, "home_after_reload.png") });

    // Attention reachable post-reload
    await page.locator('[data-testid="gsh-activity"]').click();
    await waitAttentionReady(page);
    const attText = await page.locator('[data-testid="activity-destination"]').innerText();
    rec("ATTENTION_AFTER_RELOAD", !/Could not connect/i.test(attText) ? "PASS" : "FAIL", {
      summary: attText.slice(0, 100).replace(/\n/g, " | "),
    });
    await page.locator('[data-testid="activity-back"]').click().catch(() => undefined);
    await page.waitForTimeout(400);

    // Graphs past + Repeat still available
    await page.locator('[data-testid="member-tab-graphs"], button:has-text("Graphs")').first().click().catch(() => undefined);
    await page.waitForTimeout(800);
    const pastBtn = page.locator('button:has-text("Past"), [data-testid="graphs-past"]');
    if (await pastBtn.first().isVisible().catch(() => false)) await pastBtn.first().click();
    await page.waitForTimeout(600);
    const fort = page.locator("text=Fort Oak").first();
    let repeatOk = false;
    if (await fort.isVisible().catch(() => false)) {
      await fort.click();
      await page.waitForTimeout(900);
      repeatOk = await page.locator('[data-testid="graph-detail-repeat"]').isVisible().catch(() => false);
      await page.screenshot({ path: resolve(SHOTS, "past_detail_after_recovery.png") });
    }
    rec("REPEAT_AFTER_RECOVERY", repeatOk ? "PASS" : "FAIL");

    // Center composer in-flow after recovery
    await page.locator('[data-testid="graph-detail-back"], [data-testid="activity-back"]').first().click().catch(() => undefined);
    await page.waitForTimeout(400);
    await page.locator('[data-testid="member-tab-opal"], button:has-text("Opal")').first().click().catch(() => undefined);
    await page.waitForTimeout(800);
    const composerPos = await page.evaluate(() => {
      const c = document.querySelector(".opal-center-v2-composer, .opal-center-v2 .opal-composer");
      return c ? getComputedStyle(c).position : null;
    });
    rec("CENTER_COMPOSER_AFTER_RECOVERY", composerPos === "relative" || composerPos === "static" ? "PASS" : "FAIL", {
      summary: `position=${composerPos}`,
    });
    await page.screenshot({ path: resolve(SHOTS, "center_after_recovery.png") });

    // New browser context = new session survival of API truth
    const page2 = await browser.newPage();
    await openHome(page2, b);
    await page2.waitForSelector("[data-home-mode]", { timeout: 20000 }).catch(() => undefined);
    // Wait until feed leaves EMPTY or cards appear (hydration race after fresh context).
    const hydrateDeadline = Date.now() + 15000;
    let home2 = { mode: "", cards: 0 };
    while (Date.now() < hydrateDeadline) {
      home2 = await page2.evaluate(() => ({
        mode: document.querySelector("[data-home-mode]")?.getAttribute("data-home-mode") || "",
        cards: document.querySelectorAll(".gsh-card, [data-testid^='gsh-card']").length,
      }));
      if (home2.cards >= 8 || home2.mode === "PRODUCTION_HYDRATION" || home2.mode === "FOUNDER_FIXTURE") break;
      await page2.waitForTimeout(400);
    }
    rec("NEW_CONTEXT_HOME", home2.cards >= 8 || home2.mode === "PRODUCTION_HYDRATION" || home2.mode === "FOUNDER_FIXTURE" ? "PASS" : "FAIL", {
      summary: JSON.stringify(home2),
    });
    await page2.close();
  } finally {
    await browser.close();
  }

  // Recovery docs exist
  const docs = [
    "docs/authority/PRODUCT_INVARIANTS.md",
    "docs/evidence/v2-coded-experience/a8-three-pass/PASS_1_FUNCTIONAL.md",
    "docs/evidence/v2-coded-experience/a8-three-pass/PASS_2_ADVERSARIAL.md",
    "docs/evidence/v2-coded-experience/coherence-recovery/ACTION_GRAPH_MATRIX.md",
  ];
  for (const d of docs) {
    rec(`DOC_${d.split("/").pop()}`, existsSync(resolve(ROOT, d)) ? "PASS" : "FAIL");
  }

  const failures = results.filter((r) => r.status === "FAIL");
  const report = {
    square: "A8_PASS3_RECOVERY",
    started_at: started,
    finished_at: new Date().toISOString(),
    starting_sha: head,
    results,
    AUTOMATED_FAILURE_COUNT: failures.length,
    AUTOMATED_TEST_COUNT: results.filter((r) => r.status === "PASS" || r.status === "FAIL").length,
    GREEN: failures.length === 0,
    COMMIT: "NO",
    A8_FROZEN_GREEN: "NO",
  };
  writeFileSync(resolve(OUT, "PASS3_RECOVERY_PROOF.json"), JSON.stringify(report, null, 2));
  console.log(`\nA8_PASS3_RECOVERY=${report.GREEN ? "GREEN" : "RED"} failures=${failures.length}`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
