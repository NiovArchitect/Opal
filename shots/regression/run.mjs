#!/usr/bin/env node
/**
 * Repair #18 - cumulative founder regression suite runner.
 *
 * Usage:
 *   node shots/regression/run.mjs [--case FR-18-01] [--theme duplicates]
 *                                 [--list] [--out results.json]
 *
 * Env: see lib/harness.mjs (OPAL_API_BASE, session sources, OPAL_SEED_MODE).
 *
 * Exit code: 0 = every selected case passed; 1 = at least one FAIL;
 * 2 = harness error (the suite itself could not run a case - that is
 * never a product pass and never a product fail).
 *
 * Cases are plug-ins: drop a *.case.mjs file into cases/ exporting
 * { id, title, theme, class, surfaces, run(ctx) }. Division B and C
 * cases plug in exactly this way; see cases/template.case.example.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  loadConfig,
  loadSessions,
  runFounderSeed,
  scanSeedWorld,
  freshSyntheticClient,
  CaseAssert,
  makeCtx,
} from "./lib/harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const casesDir = path.join(here, "cases");

function parseArgs(argv) {
  const args = { case: null, theme: null, list: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--case") args.case = argv[++i];
    else if (argv[i] === "--theme") args.theme = argv[++i];
    else if (argv[i] === "--list") args.list = true;
    else if (argv[i] === "--out") args.out = argv[++i];
  }
  return args;
}

async function discover() {
  const files = fs
    .readdirSync(casesDir)
    .filter((f) => f.endsWith(".case.mjs"))
    .sort();
  const cases = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(casesDir, f)).href);
    const c = mod.default;
    if (!c || !c.id || typeof c.run !== "function") {
      throw new Error(`case file ${f} does not export a valid case`);
    }
    cases.push({ ...c, file: f });
  }
  return cases;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const all = await discover();
  const selected = all.filter(
    (c) =>
      (!args.case || c.id === args.case) &&
      (!args.theme || (c.theme || "").toLowerCase() === args.theme.toLowerCase()),
  );

  if (args.list) {
    for (const c of all) {
      console.log(
        `${c.id}\t${c.theme || "-"}\t${c.class || "A"}\t${c.title}`,
      );
    }
    console.log(`\n${all.length} executable case(s) discovered`);
    return;
  }
  if (selected.length === 0) {
    console.error("no cases selected");
    process.exit(2);
  }

  const config = loadConfig();
  console.log(
    `suite: api=${config.apiBase} seed_mode=${config.seedMode ? "on" : "off"} run_tag=${config.runTag}`,
  );

  let sessions;
  try {
    sessions = await loadSessions(config);
  } catch (e) {
    console.error(`HARNESS ERROR: ${e.message}`);
    process.exit(2);
  }
  console.log(
    `sessions: ${Object.entries(sessions)
      .map(([r, s]) => `${r}=${s.source}:${String(s.userId).slice(0, 8)}`)
      .join(" ")}`,
  );

  const results = [];
  let seedInfo = null;
  if (config.seedMode) {
    const { ApiClient } = await import("./lib/harness.mjs");
    const seedClient = new ApiClient(config, sessions.a);
    seedInfo = await runFounderSeed(seedClient);
    console.log(
      `founder seed: communication status=${seedInfo.comm.status} graph status=${seedInfo.graph.status}`,
    );
    if (seedInfo.comm.status >= 400 || seedInfo.graph.status >= 400) {
      console.error(
        "HARNESS ERROR: founder seed provisioning failed; seed-mode cases cannot run",
      );
      process.exit(2);
    }
    // Repair #19 (W1) permanent gate: the seeded review world must not
    // contain machine-speak on any served surface. Runs BEFORE the
    // cases, on the seed world exactly as a reviewer would be served
    // it. A hit is a harness error (exit 2): the run's evidence is
    // invalid for review, never a product pass.
    const { ApiClient: GateClient } = await import("./lib/harness.mjs");
    const gateHits = await scanSeedWorld(new GateClient(config, sessions.a));
    if (gateHits.length > 0) {
      console.error(
        `HARNESS ERROR: machine-speak in seed world (${gateHits.length} hits):`,
      );
      for (const h of gateHits.slice(0, 20)) {
        console.error(`  ${h.surface} ${h.path}: "${h.token}" in "${h.value}"`);
      }
      process.exit(2);
    }
    console.log("seed world machine-speak gate: clean (0 hits)");
  }

  let anyFail = false;
  let anyError = false;
  for (const c of selected) {
    const assert = new CaseAssert();
    const ctx = makeCtx(config, sessions, assert);
    ctx.seed = seedInfo;
    ctx.freshClient = (phone, name) => freshSyntheticClient(config, phone, name);
    const started = Date.now();
    let status;
    try {
      await c.run(ctx);
      status = assert.failures.length > 0 ? "FAIL" : "PASS";
    } catch (e) {
      status = "ERROR";
      assert.failures.push({
        surface: "harness",
        message: `harness error: ${e.message}`,
      });
    }
    if (status === "FAIL") anyFail = true;
    if (status === "ERROR") anyError = true;
    const ms = Date.now() - started;
    console.log(`\n[${status}] ${c.id} - ${c.title} (${ms}ms, ${assert.checks} checks)`);
    for (const f of assert.failures) {
      console.log(`  FAIL surface=${f.surface}: ${f.message}`);
    }
    for (const n of assert.notes) console.log(`  note: ${n}`);
    results.push({
      id: c.id,
      title: c.title,
      theme: c.theme || null,
      class: c.class || "A",
      surfaces: c.surfaces || [],
      status,
      checks: assert.checks,
      failures: assert.failures,
      notes: assert.notes,
      ms,
    });
  }

  const summary = {
    suite: "repair18-founder-regression",
    api_base: config.apiBase,
    seed_mode: config.seedMode,
    run_tag: config.runTag,
    at: new Date().toISOString(),
    results,
  };
  const outPath = args.out || path.join(here, "results.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  const passed = results.filter((r) => r.status === "PASS").length;
  console.log(
    `\nsummary: ${passed}/${results.length} PASS, results -> ${outPath}`,
  );
  process.exit(anyError ? 2 : anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error(`HARNESS ERROR: ${e.stack || e.message}`);
  process.exit(2);
});
