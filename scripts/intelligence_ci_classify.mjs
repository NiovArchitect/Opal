#!/usr/bin/env node
/**
 * Classify changed files into intelligence CI profile.
 * Model-neutral. Reads config/intelligence_enforcement.json file_triggers.
 *
 * Usage:
 *   node scripts/intelligence_ci_classify.mjs --files a,b,c
 *   node scripts/intelligence_ci_classify.mjs --git-diff origin/main...HEAD
 *   node scripts/intelligence_ci_classify.mjs --github-output   # write $GITHUB_OUTPUT
 *
 * Profiles:
 *   skip          — no intelligence-sensitive paths
 *   governance    — canon/scripts/config only → ./scripts/intelligence_check.sh
 *   with_tests    — production intelligence → --with-tests
 *   full          — availability/calendar composition → --full
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import {
  ROOT,
  loadCanon,
  pathMatches,
  isIntelligenceSensitive,
} from "./intelligence_lib.mjs";

function argValue(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

function parseFiles() {
  const raw = argValue("--files");
  if (raw) {
    return raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const range = argValue("--git-diff");
  if (range) {
    try {
      const out = execSync(`git diff --name-only ${range}`, {
        cwd: ROOT,
        encoding: "utf8",
      });
      return out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      // fallback: all files in last commit vs empty
      const out = execSync("git diff --name-only HEAD~1 HEAD 2>/dev/null || true", {
        cwd: ROOT,
        encoding: "utf8",
      });
      return out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

const GOVERNANCE_PATTERNS = [
  "docs/intelligence/**",
  "config/intelligence_manifest.json",
  "config/intelligence_enforcement.json",
  "scripts/intelligence_*.mjs",
  "scripts/intelligence_check.sh",
  "scripts/intelligence_lib.mjs",
  ".github/workflows/intelligence.yml",
];

const AVAILABILITY_HINTS = [
  "availability_composition",
  "availability.ex",
  "availability_composition_test",
  "calendar",
  "freebusy",
];

function isGovernanceOnly(files) {
  if (!files.length) return false;
  return files.every((f) => {
    const norm = f.replace(/\\/g, "/");
    return GOVERNANCE_PATTERNS.some((p) => pathMatches(p, norm));
  });
}

function isAvailabilitySensitive(files) {
  return files.some((f) => {
    const n = f.replace(/\\/g, "/").toLowerCase();
    return AVAILABILITY_HINTS.some((h) => n.includes(h));
  });
}

function touchesProductionIntelligence(enforcement, files) {
  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    // governance paths alone don't force production
    if (GOVERNANCE_PATTERNS.some((p) => pathMatches(p, norm))) continue;
    for (const t of enforcement.file_triggers || []) {
      if (pathMatches(t.pattern, norm) && (t.capabilities || []).length > 0) {
        return true;
      }
    }
    // explicit production trees
    if (
      pathMatches("apps/opal_core/lib/**/social_flow/**", norm) ||
      pathMatches("apps/opal_core/test/intelligence/**", norm) ||
      pathMatches("apps/opal_core/test/opal_core/social_flow/**", norm) ||
      pathMatches("apps/opal_web/src/opalUi/**", norm) ||
      pathMatches("apps/opal_web/src/sharedReality.ts", norm) ||
      pathMatches("apps/opal_web/src/OpalApp.tsx", norm) ||
      pathMatches("scripts/founder_proof_fixture.mjs", norm) ||
      pathMatches("scripts/live_jordan_foundation_proof.mjs", norm)
    ) {
      return true;
    }
  }
  return false;
}

const { enforcement } = loadCanon();
const files = parseFiles();
const sensitive = isIntelligenceSensitive(enforcement, files) || files.some((f) => {
  const n = f.replace(/\\/g, "/");
  return (
    n.startsWith("docs/intelligence/") ||
    n.startsWith("config/intelligence_") ||
    n.startsWith("scripts/intelligence_") ||
    n.includes("/test/intelligence/") ||
    n === ".github/workflows/intelligence.yml"
  );
});

let profile = "skip";
let command = "echo 'No intelligence-sensitive paths; skip gate'";

if (sensitive) {
  if (isAvailabilitySensitive(files) && touchesProductionIntelligence(enforcement, files)) {
    profile = "full";
    command = "./scripts/intelligence_check.sh --full";
  } else if (touchesProductionIntelligence(enforcement, files)) {
    profile = "with_tests";
    command = "./scripts/intelligence_check.sh --with-tests";
  } else if (isGovernanceOnly(files) || files.every((f) => {
    const n = f.replace(/\\/g, "/");
    return (
      n.startsWith("docs/intelligence/") ||
      n.startsWith("config/intelligence_") ||
      n.startsWith("scripts/intelligence_") ||
      n === ".github/workflows/intelligence.yml"
    );
  })) {
    profile = "governance";
    command = "./scripts/intelligence_check.sh";
  } else {
    profile = "with_tests";
    command = "./scripts/intelligence_check.sh --with-tests";
  }
}

const report = {
  profile,
  command,
  file_count: files.length,
  files,
  intelligence_sensitive: sensitive,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`profile=${profile}`);
  console.log(`command=${command}`);
  console.log(`file_count=${files.length}`);
  console.log(`intelligence_sensitive=${sensitive}`);
}

if (process.argv.includes("--github-output")) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(
      out,
      `profile=${profile}\ncommand=${command}\nsensitive=${sensitive}\n`
    );
  }
}

process.exit(0);
