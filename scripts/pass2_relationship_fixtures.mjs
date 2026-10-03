#!/usr/bin/env node
/**
 * Pass 2 A8 — Walk A/B relationship intelligence fixtures (existing models only).
 *
 * Seeds via apps/opal_core/scripts/pass2_relationship_fixtures.exs:
 *   1) Partner ring size (Walk B private about Walk A)
 *   2) Anniversary date (Walk A explicit)
 *   3) Movie preference Interstellar (DurablePreferenceMemory.remember_explicit)
 *   4) Temporary stay-home-tonight (episode_only reject — not durable)
 *   5) Child activity — SKIP (no Walk A/B Family/youth graph)
 *   6) Shared agreed Interstellar (Continuity dual consent)
 *
 * Usage:
 *   node scripts/pass2_relationship_fixtures.mjs
 *   PASS2_RELATIONSHIP_FIXTURES=1 node scripts/founder_fixture_reset.mjs
 *
 * Writes:
 *   docs/evidence/v2-coded-experience/a8-three-pass/PASS2_RELATIONSHIP_FIXTURES.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "docs/evidence/v2-coded-experience/a8-three-pass");
const OUT = resolve(OUT_DIR, "PASS2_RELATIONSHIP_FIXTURES.json");
const EXS = resolve(ROOT, "apps/opal_core/scripts/pass2_relationship_fixtures.exs");

function runSeed() {
  if (!existsSync(EXS)) {
    return { ok: false, error: "exs missing", path: EXS };
  }

  const r = spawnSync("mix", ["run", "scripts/pass2_relationship_fixtures.exs"], {
    cwd: resolve(ROOT, "apps/opal_core"),
    encoding: "utf8",
    env: { ...process.env, MIX_ENV: process.env.MIX_ENV || "dev" },
    maxBuffer: 8 * 1024 * 1024,
  });

  const stdout = r.stdout || "";
  const stderr = r.stderr || "";
  let payload = null;

  const begin = "PASS2_RELATIONSHIP_FIXTURES_JSON_BEGIN";
  const end = "PASS2_RELATIONSHIP_FIXTURES_JSON_END";
  const bi = stdout.indexOf(begin);
  const ei = stdout.indexOf(end);
  if (bi >= 0 && ei > bi) {
    try {
      payload = JSON.parse(stdout.slice(bi + begin.length, ei).trim());
    } catch (err) {
      payload = { parse_error: String(err), stdout_tail: stdout.slice(-4000) };
    }
  }

  const seedPath = resolve(
    ROOT,
    "docs/evidence/v2-coded-experience/a8-three-pass/PASS2_RELATIONSHIP_FIXTURES_SEED.json",
  );
  if (!payload && existsSync(seedPath)) {
    try {
      payload = JSON.parse(awaitableRead(seedPath));
    } catch (err) {
      payload = { parse_error: String(err), seed_path: seedPath };
    }
  }

  return {
    ok: r.status === 0 && payload?.ok === true,
    status: r.status,
    payload,
    seed_path: seedPath,
    stdout_tail: stdout.slice(-6000),
    stderr_tail: stderr.slice(-3000),
  };
}

function awaitableRead(path) {
  return readFileSync(path, "utf8");
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const started = new Date().toISOString();
  const result = runSeed();
  const evidence = {
    schema: "pass2_relationship_fixtures_wrapper.v1",
    started,
    finished: new Date().toISOString(),
    A8_FROZEN_GREEN: "NO",
    MERGE: "NO",
    PUBLIC_LIVE: "NO",
    TRACK_B: "OUT_OF_SCOPE",
    exs: EXS,
    result,
    ok: result.ok === true,
  };
  writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  console.log(`wrote ${OUT}`);
  if (result.payload) {
    console.log(JSON.stringify(result.payload, null, 2));
  } else if (result.stdout_tail) {
    console.log(result.stdout_tail);
  }
  if (result.stderr_tail) console.error(result.stderr_tail);
  if (!evidence.ok) process.exitCode = 1;
}

main();
