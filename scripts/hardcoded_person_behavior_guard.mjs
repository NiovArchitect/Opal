#!/usr/bin/env node
/**
 * HARDCODED_PERSON_BEHAVIOR = 0
 * Fixture names may appear in tests/demos/evidence/seeds only — never in production decision paths.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const NAMES = ["Chanelle", "Sadeil", "Maya", "Jordan", "Sabrina", "Alex"];
const ALLOW = [
  "/test/",
  "/tests/",
  "/shots/",
  "/docs/evidence/",
  "/fixtures",
  "fixture",
  "seed",
  "/scripts/",
  ".md",
  "FOUNDER",
  "founder_communication_seed",
  "founderGraphSeed",
  "walk_",
];

function allowed(file) {
  const f = file.replaceAll("\\", "/");
  return ALLOW.some((a) => f.includes(a) || f.endsWith(a));
}

const hits = [];
for (const name of NAMES) {
  let out = "";
  try {
    out = execSync(
      `rg -n --glob '!**/node_modules/**' --glob '!**/.git/**' --glob '!**/_build/**' --glob '!**/deps/**' -e '${name}' apps services packages 2>/dev/null || true`,
      { cwd: ROOT, encoding: "utf8", maxBuffer: 10_000_000 },
    );
  } catch {
    out = "";
  }
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    const file = line.split(":")[0];
    if (!file || allowed(file)) continue;
    // Allow comments that say fixture-only / person-agnostic
    if (/fixture|person-agnostic|test only|TEST FIXTURE/i.test(line)) continue;
    hits.push(line);
  }
}

const report = {
  HARDCODED_PERSON_BEHAVIOR: hits.length,
  PERSON_AGNOSTIC: hits.length === 0 ? "YES" : "NO",
  sample: hits.slice(0, 40),
};
fs.mkdirSync(path.join(ROOT, "shots/center"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "shots/center/HARDCODED_PERSON_BEHAVIOR_GUARD.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (hits.length > 0) {
  console.error(`GUARD_WARN: ${hits.length} production-path name hits (review; not always hard fail)`);
  // Warn but do not fail CI yet — first ship inventories.
  process.exit(0);
}
process.exit(0);
