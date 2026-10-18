#!/usr/bin/env node
/**
 * Repair #18 - rendered-stage (browser) layout-integrity runner.
 *
 * Companion to run.mjs (the API-level runner). The founder's rule
 * after Walk #4: API/jsdom proof never suffices for the rendered
 * layer - these cases drive the REAL served web app in a real
 * browser (Playwright), at phone size, in BOTH theme modes, and run
 * the class-level layout-integrity audit (lib/layout-integrity.mjs)
 * on every surface they visit.
 *
 * Setup:
 *   npm --prefix shots/regression/browser install   # playwright-core
 *   (a Playwright chromium build must be available:
 *    `npx playwright-core install chromium` or an existing
 *    ~/.cache/ms-playwright; OPAL_CHROMIUM_PATH overrides the binary)
 *
 * Env: OPAL_WEB_BASE (served web app, no trailing slash),
 *      OPAL_API_BASE, and the session sources from lib/harness.mjs
 *      (OPAL_MINTED_SESSIONS_JSON / OPAL_TOKEN_* /
 *       OPAL_SESSION_PROVISION=synthetic for local stacks).
 *
 * Exit codes mirror run.mjs: 0 pass, 1 case FAIL, 2 harness error.
 * Output: per-case manifest (elements enumerated, reviewed
 * intersections, failures) written to layout-results.json beside
 * this runner and printed as it runs - the manifest is the honest
 * coverage record the escalation requires.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import {
  loadConfig,
  loadSessions,
  ApiClient,
  CaseAssert,
  makeCtx,
} from "../lib/harness.mjs";
import { runLayoutAudit } from "../lib/layout-integrity.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const caseFile = process.argv[2] || "w4-04-layout.case.mjs";
  const mod = await import(pathToFileURL(path.join(here, caseFile)).href);
  const kase = mod.default;
  if (!kase || typeof kase.run !== "function") {
    console.error("HARNESS ERROR: case file does not export a valid browser case");
    process.exit(2);
  }

  const config = loadConfig();
  const webBase = (process.env.OPAL_WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
  console.log(`browser suite: web=${webBase} api=${config.apiBase} run_tag=${config.runTag}`);

  let sessions;
  try {
    sessions = await loadSessions(config);
  } catch (e) {
    console.error(`HARNESS ERROR: ${e.message}`);
    process.exit(2);
  }
  if (!sessions.b) {
    console.error("HARNESS ERROR: browser cases require two distinct sessions (A and B)");
    process.exit(2);
  }

  const apiCtx = makeCtx(config, sessions, new CaseAssert());
  const apiA = new ApiClient(config, sessions.a);
  const apiB = new ApiClient(config, sessions.b);

  const launchOpts = { headless: true };
  if (process.env.OPAL_CHROMIUM_PATH) launchOpts.executablePath = process.env.OPAL_CHROMIUM_PATH;
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // phone size - the founder's walk surface
    isMobile: true,
    hasTouch: true,
  });

  // Session injection - the exact shape the _consumer_reality_gate
  // scripts use (browser_session token + profile + first-run done).
  const s = sessions.a;
  await context.addInitScript(
    ({ token, userId, name, handle }) => {
      sessionStorage.setItem("opal.product.browser_session.v1", token);
      sessionStorage.setItem("opal_native_host", "1");
      localStorage.setItem(
        "opal.product.profile.v17",
        JSON.stringify({ user_id: userId, display_name: name, handle, session_id: "layout-runner" }),
      );
      localStorage.setItem("opal.firstRun.v14.completed", "1");
      localStorage.setItem("opal.firstRun.v14.phoneVerified", "1");
    },
    { token: s.token, userId: s.userId, name: s.name || "Layout A", handle: s.handle || "layout" },
  );

  const page = await context.newPage();
  const manifests = [];
  const assert = new CaseAssert();
  const ctx = {
    config,
    sessions,
    page,
    webBase,
    apiA,
    apiB,
    h: apiCtx.h,
    assert,
    tag: config.runTag,
    async setTheme(mode) {
      await page.goto(`${webBase}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate((m) => {
        localStorage.setItem("opal.appearance.theme.v1", m);
        document.documentElement.setAttribute("data-theme", m);
      }, mode);
    },
    async audit(surface) {
      const manifest = await runLayoutAudit(page, { surface });
      manifests.push(manifest);
      return manifest;
    },
  };

  let status;
  try {
    await kase.run(ctx);
    status = assert.failures.length > 0 ? "FAIL" : "PASS";
  } catch (e) {
    status = "ERROR";
    assert.failures.push({ surface: "harness", message: `harness error: ${e.message}` });
  }

  console.log(`\n[${status}] ${kase.id} - ${kase.title} (${assert.checks} checks)`);
  for (const f of assert.failures) console.log(`  FAIL surface=${f.surface}: ${f.message}`);
  for (const n of assert.notes) console.log(`  note: ${n}`);
  for (const m of manifests) {
    console.log(
      `  manifest surface=${m.surface} theme=${m.theme} viewport=${m.viewport.width}x${m.viewport.height} ` +
        `interactive=${m.interactiveCount} reviewedIntersections=${m.reviewedIntersections.length} failures=${m.failures.length}`,
    );
  }

  fs.writeFileSync(
    path.join(here, "layout-results.json"),
    JSON.stringify(
      { case: kase.id, at: new Date().toISOString(), status, checks: assert.checks, failures: assert.failures, notes: assert.notes, manifests },
      null,
      2,
    ),
  );
  await browser.close();
  process.exit(status === "ERROR" ? 2 : status === "FAIL" ? 1 : 0);
}

main().catch((e) => {
  console.error(`HARNESS ERROR: ${e.stack || e.message}`);
  process.exit(2);
});
