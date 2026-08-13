#!/usr/bin/env node
/**
 * Capability impact check from declared capabilities and/or changed files.
 *
 * Usage:
 *   node scripts/intelligence_impact.mjs --files a.ex,b.ts
 *   node scripts/intelligence_impact.mjs --modified INT-PLACE-001,INT-TIME-001
 *   node scripts/intelligence_impact.mjs --added INT-FOO-001
 *   node scripts/intelligence_impact.mjs --git   # uses git diff --name-only HEAD
 *   node scripts/intelligence_impact.mjs --git --base main
 *
 * Exit 0 always for informational; use with intelligence_check for gates.
 */
import { execSync } from "node:child_process";
import {
  loadCanon,
  capabilitiesForFiles,
  collectDependentCapabilities,
  invariantsForCapabilities,
  episodesForCapabilities,
  isIntelligenceSensitive,
  ROOT,
} from "./intelligence_lib.mjs";

function argValue(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

function parseList(raw) {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const { manifest, enforcement } = loadCanon();
const json = process.argv.includes("--json");
const useGit = process.argv.includes("--git");
const base = argValue("--base") || "HEAD";

let files = parseList(argValue("--files"));
if (useGit) {
  try {
    const out = execSync(`git diff --name-only ${base}`, {
      cwd: ROOT,
      encoding: "utf8",
    });
    const staged = execSync("git diff --name-only --cached", {
      cwd: ROOT,
      encoding: "utf8",
    });
    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: ROOT,
      encoding: "utf8",
    });
    files = [
      ...new Set(
        [...out.split("\n"), ...staged.split("\n"), ...untracked.split("\n")]
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ];
  } catch (e) {
    console.error("git diff failed:", e.message);
    process.exit(2);
  }
}

const modified = parseList(argValue("--modified"));
const added = parseList(argValue("--added"));
const fromFiles = capabilitiesForFiles(enforcement, files);
const seedCaps = [...new Set([...modified, ...added, ...fromFiles.capabilities])];
const expanded = collectDependentCapabilities(enforcement, seedCaps);
const invs = invariantsForCapabilities(manifest, expanded);
const eps = episodesForCapabilities(manifest, expanded);
const sensitive = isIntelligenceSensitive(enforcement, files) || seedCaps.length > 0;

// Episodes also from bridge map
const bridgeEps = Object.keys(enforcement.episode_eval_bridge || {}).filter((id) =>
  eps.includes(id)
);

const report = {
  intelligence_sensitive: sensitive,
  CAPABILITY_ADDED: added,
  CAPABILITY_MODIFIED: modified,
  FILES_CHANGED: files,
  FILES_MATCHED_TRIGGERS: fromFiles.matched,
  CAPABILITIES_DIRECT: seedCaps.sort(),
  CAPABILITIES_AT_RISK: expanded,
  DEPENDENCIES_AND_DEPENDENTS: expanded.filter((c) => !seedCaps.includes(c)),
  INVARIANTS_AT_RISK: invs,
  GOLDEN_EPISODES_TO_REPLAY: eps,
  EPISODE_BRIDGE: bridgeEps,
  EVAL_PROFILE_RECOMMENDED: sensitive
    ? seedCaps.length || fromFiles.matched.some((f) => !f.startsWith("docs/intelligence"))
      ? "intelligence_lightweight"
      : "governance"
    : "none",
  AUTHORITY_REMINDER: "Inference is not settlement. SocialReality authorizes_set must remain false.",
  PRIVACY_REMINDER: "Private selection ≠ send. Calendar access ≠ disclosure.",
  FROZEN_REMINDER: "Do not rewrite proof harness, brand 93:*, SF15, or V2 merge on governance alone.",
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log("==================================================");
console.log("OPAL INTELLIGENCE IMPACT CHECK");
console.log("==================================================");
console.log(`INTELLIGENCE SENSITIVE: ${report.intelligence_sensitive ? "YES" : "NO"}`);
console.log(`EVAL PROFILE: ${report.EVAL_PROFILE_RECOMMENDED}`);
console.log("");
console.log(`CAPABILITY_ADDED: ${added.join(", ") || "(none)"}`);
console.log(`CAPABILITY_MODIFIED: ${modified.join(", ") || "(none)"}`);
console.log(`FILES_CHANGED: ${files.length}`);
if (fromFiles.matched.length) {
  console.log("FILES_MATCHED_TRIGGERS:");
  for (const f of fromFiles.matched) console.log(`  - ${f}`);
}
console.log("");
console.log(`CAPABILITIES AT RISK (${expanded.length}):`);
for (const c of expanded) console.log(`  - ${c}`);
console.log("");
console.log(`INVARIANTS AT RISK: ${invs.join(", ") || "(none mapped)"}`);
console.log(`GOLDEN EPISODES TO REPLAY: ${eps.join(", ") || "(none mapped)"}`);
console.log("");
console.log("PRE-IMPLEMENTATION BLOCK (fill before coding):");
console.log("  INTELLIGENCE CONTEXT LOADED");
console.log(`  TARGET CAPABILITY: ${seedCaps.join(", ") || "…"}`);
console.log("  CURRENT BEHAVIOR: …");
console.log("  PROPOSED DELTA: …");
console.log(`  DEPENDENCIES: ${report.DEPENDENCIES_AND_DEPENDENTS.join(", ") || "…"}`);
console.log(`  INVARIANTS TO PRESERVE: ${invs.join(", ") || "…"}`);
console.log(`  EPISODES TO REPLAY: ${eps.join(", ") || "…"}`);
console.log("  EXPECTED NON-CHANGES: …");
console.log("==================================================");
