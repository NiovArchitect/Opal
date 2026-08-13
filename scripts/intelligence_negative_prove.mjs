#!/usr/bin/env node
/**
 * Prove the intelligence immune system fails closed on intentional violations.
 * Mutates in-memory/temp, restores always. Does not leave corrupted canon.
 *
 * Usage: node scripts/intelligence_negative_prove.mjs
 * Exit 0 only if all violations fail as expected AND restore succeeds.
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJson, readText } from "./intelligence_lib.mjs";

const results = [];

function runValidate() {
  const r = spawnSync("node", ["scripts/intelligence_validate.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return {
    exit: r.status ?? 1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function snapshot(rel) {
  const p = path.join(ROOT, rel);
  return { rel, p, content: fs.readFileSync(p, "utf8") };
}

function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content, "utf8");
}

function restore(snap) {
  fs.writeFileSync(snap.p, snap.content, "utf8");
}

function prove(id, description, expectedFailSubstring, mutate, targets) {
  const snaps = targets.map(snapshot);
  let actual = null;
  let restored = false;
  let error = null;
  try {
    mutate();
    actual = runValidate();
  } catch (e) {
    error = e;
    actual = { exit: 1, stdout: "", stderr: String(e) };
  } finally {
    for (const s of snaps) restore(s);
    // verify restore: validate should pass again
    const after = runValidate();
    restored = after.exit === 0;
    if (!restored) {
      // emergency: re-write snaps
      for (const s of snaps) restore(s);
      restored = runValidate().exit === 0;
    }
  }

  const output = `${actual.stdout}\n${actual.stderr}`;
  const failedAsExpected =
    actual.exit !== 0 &&
    (expectedFailSubstring
      ? output.toLowerCase().includes(expectedFailSubstring.toLowerCase())
      : true);

  const row = {
    VIOLATION: id,
    description,
    EXPECTED_FAILURE: expectedFailSubstring || "non-zero exit",
    ACTUAL_EXIT: actual.exit,
    ACTUAL_SNIPPET: output
      .split("\n")
      .filter((l) => l.includes("FAIL") || l.includes("- ") || l.includes("mismatch") || l.includes("missing"))
      .slice(0, 8)
      .join(" | "),
    MATCHED_EXPECTED: failedAsExpected,
    RESTORED: restored,
    error: error ? String(error) : null,
  };
  results.push(row);
  return row;
}

// Baseline must pass
const baseline = runValidate();
if (baseline.exit !== 0) {
  console.error("BASELINE VALIDATE FAILED — refuse negative prove");
  console.error(baseline.stdout);
  process.exit(2);
}

// A: constitution version mismatch
prove(
  "A",
  "manifest constitution version != Markdown constitution version",
  "version mismatch",
  () => {
    const m = readJson("config/intelligence_manifest.json");
    m.constitution.version = "9.9.9";
    write("config/intelligence_manifest.json", JSON.stringify(m, null, 2) + "\n");
  },
  ["config/intelligence_manifest.json"]
);

// B: active capability references missing dependency
prove(
  "B",
  "capability dependency references unknown capability",
  "not in manifest",
  () => {
    const e = readJson("config/intelligence_enforcement.json");
    e.capability_dependencies["INT-REALITY-001"] = ["INT-DOES-NOT-EXIST-001"];
    write("config/intelligence_enforcement.json", JSON.stringify(e, null, 2) + "\n");
  },
  ["config/intelligence_enforcement.json"]
);

// C: registered golden episode path missing
prove(
  "C",
  "registered golden episode path missing",
  "path missing",
  () => {
    const m = readJson("config/intelligence_manifest.json");
    m.golden_episodes[0].path = "docs/intelligence/golden-episodes/EP-001-DOES-NOT-EXIST.md";
    write("config/intelligence_manifest.json", JSON.stringify(m, null, 2) + "\n");
  },
  ["config/intelligence_manifest.json"]
);

// D: protected invariant/test removed (delete invariants test file temporarily)
const invRel = "apps/opal_core/test/intelligence/invariants_test.exs";
const invPath = path.join(ROOT, invRel);
const invBackup = invPath + ".negbak";
prove(
  "D",
  "protected invariant/test removed",
  "missing",
  () => {
    fs.renameSync(invPath, invBackup);
  },
  // restore via custom finally — targets empty; handle restore below
  []
);
// Fix D restore if bak exists
if (fs.existsSync(invBackup) && !fs.existsSync(invPath)) {
  fs.renameSync(invBackup, invPath);
}
// Re-run D properly with snap of existence
{
  const content = fs.readFileSync(invPath, "utf8");
  let actual;
  try {
    fs.unlinkSync(invPath);
    actual = runValidate();
  } finally {
    fs.writeFileSync(invPath, content, "utf8");
  }
  const restored = runValidate().exit === 0;
  const output = `${actual.stdout}\n${actual.stderr}`;
  // replace previous D if partial
  const idx = results.findIndex((r) => r.VIOLATION === "D");
  const row = {
    VIOLATION: "D",
    description: "protected invariant/test removed",
    EXPECTED_FAILURE: "missing executable/path",
    ACTUAL_EXIT: actual.exit,
    ACTUAL_SNIPPET: output
      .split("\n")
      .filter((l) => /fail|missing|protected/i.test(l))
      .slice(0, 8)
      .join(" | "),
    MATCHED_EXPECTED: actual.exit !== 0,
    RESTORED: restored,
    error: null,
  };
  if (idx >= 0) results[idx] = row;
  else results.push(row);
}

// E: supersession missing required fields
prove(
  "E",
  "supersession entry missing required replacement/reason/evidence",
  "supersession",
  () => {
    const e = readJson("config/intelligence_enforcement.json");
    e.supersessions = [{ from: "INT-FAKE-001" }];
    write("config/intelligence_enforcement.json", JSON.stringify(e, null, 2) + "\n");
  },
  ["config/intelligence_enforcement.json"]
);

// Final restore check
const final = runValidate();
const allPass =
  results.every((r) => r.MATCHED_EXPECTED && r.RESTORED) && final.exit === 0;

console.log("==================================================");
console.log("OPAL INTELLIGENCE NEGATIVE PROVE");
console.log("==================================================");
for (const r of results) {
  console.log("");
  console.log(`VIOLATION: ${r.VIOLATION} — ${r.description}`);
  console.log(`EXPECTED_FAILURE: ${r.EXPECTED_FAILURE}`);
  console.log(`ACTUAL_EXIT: ${r.ACTUAL_EXIT}`);
  console.log(`ACTUAL_SNIPPET: ${r.ACTUAL_SNIPPET || "(see validate output)"}`);
  console.log(`MATCHED_EXPECTED: ${r.MATCHED_EXPECTED}`);
  console.log(`RESTORED: ${r.RESTORED}`);
}
console.log("");
console.log(`FINAL_VALIDATE_EXIT: ${final.exit}`);
console.log(`RESULT: ${allPass ? "PASS (all violations fail closed + restored)" : "FAIL"}`);
console.log("==================================================");

// Write evidence file path suggestion to stdout
process.exit(allPass ? 0 : 1);
