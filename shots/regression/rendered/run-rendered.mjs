#!/usr/bin/env node
/**
 * Repair #18 - RENDERED regression stage runner.
 *
 * The permanent institutional fix for the standing gate (founder,
 * 2026-10-17): NO WALK WITHOUT RENDERED PROOF. Drives the real
 * served web app in Chromium at 390x844 against the real backend.
 *
 * Usage:
 *   node shots/regression/rendered/run-rendered.mjs [--case W4-02]
 *                                                  [--surfaces-only]
 *                                                  [--cases-only]
 *                                                  [--out <dir>]
 *
 * Env (same mechanism as the API stage, plus the web base):
 *   OPAL_WEB_BASE   served web app (default http://127.0.0.1:5173)
 *   OPAL_API_BASE   backend the web app proxies to (default :4000)
 *   OPAL_SEED_MODE=1, OPAL_SESSION_PROVISION=synthetic, OPAL_PHONE_A/B
 *   OPAL_MINTED_SESSIONS_JSON / OPAL_TOKEN_A (staging stacks)
 *   OPAL_BUILD_TAG  output folder name (default: the run tag)
 *
 * Output: rendered/<build-tag>/ with manifest.json (surface pass),
 * results.json (rendered cases), screenshots, and per-case shots
 * under cases/<case-id>/.
 *
 * Exit codes mirror run.mjs: 0 = all pass; 1 = at least one FAIL (a
 * rendered defect reproduced - surfaces named); 2 = harness error
 * (the stage itself could not run; never a product result).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CaseAssert } from "../lib/harness.mjs";
import {
  loadRenderedConfig,
  provisionRenderedSessions,
  launchBrowser,
  newAuthedContext,
  gotoMemberShell,
} from "./lib/browser.mjs";
import { runSurfacePass } from "./surfaces-run.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const casesDir = path.join(here, "cases");

function parseArgs(argv) {
  const args = { case: null, surfacesOnly: false, casesOnly: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--case") args.case = argv[++i];
    else if (argv[i] === "--surfaces-only") args.surfacesOnly = true;
    else if (argv[i] === "--cases-only") args.casesOnly = true;
    else if (argv[i] === "--out") args.out = argv[++i];
  }
  return args;
}

async function discover() {
  const files = fs.readdirSync(casesDir).filter((f) => f.endsWith(".case.mjs")).sort();
  const cases = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(casesDir, f)).href);
    const c = mod.default;
    if (!c || !c.id || typeof c.run !== "function") {
      throw new Error(`rendered case file ${f} does not export a valid case`);
    }
    cases.push({ ...c, file: f });
  }
  return cases;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadRenderedConfig();
  const outDir = args.out || path.join(here, config.buildTag);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(
    `rendered stage: web=${config.webBase} api=${config.apiBase} seed_mode=${config.seedMode ? "on" : "off"} build_tag=${config.buildTag} out=${outDir}`,
  );

  // Reachability first: a dead stack is a harness error, not a FAIL.
  try {
    const health = await fetch(`${config.apiBase}/health`, { signal: AbortSignal.timeout(8000) });
    if (!health.ok) throw new Error(`api /health status ${health.status}`);
    const web = await fetch(`${config.webBase}/`, { signal: AbortSignal.timeout(8000) });
    if (!web.ok) throw new Error(`web / status ${web.status}`);
  } catch (e) {
    console.error(`HARNESS ERROR: stack unreachable: ${e.message}`);
    process.exit(2);
  }

  let sessions, seedInfo;
  try {
    ({ sessions, seedInfo } = await provisionRenderedSessions(config));
  } catch (e) {
    console.error(`HARNESS ERROR: ${e.message}`);
    process.exit(2);
  }
  console.log(
    `sessions: ${Object.entries(sessions)
      .map(([r, s]) => `${r}=${s.source}:${String(s.userId).slice(0, 8)}`)
      .join(" ")}${seedInfo ? ` seed comm=${seedInfo.comm.status} graph=${seedInfo.graph.status}` : ""}`,
  );

  const browser = await launchBrowser().catch((e) => {
    console.error(`HARNESS ERROR: ${e.message}`);
    process.exit(2);
  });

  let anyFail = false;
  let anyError = false;
  const caseResults = [];

  try {
    if (!args.casesOnly) {
      const manifest = await runSurfacePass({
        config,
        browser,
        sessions,
        outDir,
        log: (m) => console.log(m),
      });
      console.log(
        `surface pass: ${manifest.summary.pass}/${manifest.summary.total} PASS -> ${path.join(outDir, "manifest.json")}`,
      );
      if (manifest.summary.fail > 0) anyFail = true;
    }

    if (!args.surfacesOnly) {
      const all = await discover();
      const selected = all.filter((c) => !args.case || c.id === args.case);
      if (selected.length === 0) {
        console.error("no rendered cases selected");
        process.exit(2);
      }
      for (const c of selected) {
        const assert = new CaseAssert();
        const caseDir = path.join(outDir, "cases", c.id.toLowerCase());
        fs.mkdirSync(caseDir, { recursive: true });
        const rctx = {
          config,
          sessions,
          assert,
          browser,
          seed: seedInfo,
          shot: async (page, name) => {
            const p = path.join(caseDir, `${name}.png`);
            await page.screenshot({ path: p }).catch(() => null);
            return p;
          },
          /** Fresh authenticated context+page in the given mode, on
           *  the member shell, closed when fn returns. */
          withMode: async (mode, fn) => {
            const ctx = await newAuthedContext(browser, config, sessions.a, mode);
            const page = await ctx.newPage();
            try {
              const shell = await gotoMemberShell(page, config);
              if (!shell.memberShell) {
                assert.check(c.id, false, `${mode}: member shell did not load for rendered case`);
                return;
              }
              const theme = await page.evaluate(() =>
                document.documentElement.getAttribute("data-theme"),
              );
              assert.eq(c.id, theme, mode, `${mode}: resolved data-theme must equal the mode under test`);
              await fn(page);
            } finally {
              await ctx.close();
            }
          },
        };
        const started = Date.now();
        let status;
        try {
          await c.run(rctx);
          status = assert.failures.length > 0 ? "FAIL" : "PASS";
        } catch (e) {
          status = "ERROR";
          assert.failures.push({ surface: "harness", message: `harness error: ${e.message}` });
        }
        if (status === "FAIL") anyFail = true;
        if (status === "ERROR") anyError = true;
        const ms = Date.now() - started;
        console.log(`\n[${status}] ${c.id} - ${c.title} (${ms}ms, ${assert.checks} checks)`);
        for (const f of assert.failures) console.log(`  FAIL surface=${f.surface}: ${f.message}`);
        for (const n of assert.notes) console.log(`  note: ${n}`);
        caseResults.push({
          id: c.id,
          title: c.title,
          theme: c.theme || null,
          class: c.class || "R",
          surfaces: c.surfaces || [],
          status,
          checks: assert.checks,
          failures: assert.failures,
          notes: assert.notes,
          ms,
          shotsDir: caseDir,
        });
      }
    }
  } finally {
    await browser.close();
  }

  const resultsPath = path.join(outDir, "results.json");
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        stage: "repair18-rendered-regression",
        web_base: config.webBase,
        api_base: config.apiBase,
        api_rewrite:
          new URL(config.apiBase).origin !== "http://127.0.0.1:4000"
            ? "browser-context rewrite of /api to OPAL_API_BASE (Vite proxy target :4000 held by another process locally; see lib/browser.mjs)"
            : "none (Vite proxy path, as served)",
        build_tag: config.buildTag,
        at: new Date().toISOString(),
        results: caseResults,
      },
      null,
      2,
    ),
  );
  const passed = caseResults.filter((r) => r.status === "PASS").length;
  console.log(`\nrendered cases: ${passed}/${caseResults.length} PASS, results -> ${resultsPath}`);
  process.exit(anyError ? 2 : anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error(`HARNESS ERROR: ${e.stack || e.message}`);
  process.exit(2);
});
