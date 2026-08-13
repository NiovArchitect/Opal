#!/usr/bin/env node
/**
 * Manifest integrity, constitution version, dangling IDs, supersession, coverage.
 * Usage: node scripts/intelligence_validate.mjs
 * Exit 0 = pass, 1 = fail
 */
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  loadCanon,
  extractConstitutionVersion,
  extractLedgerCapabilityIds,
  readText,
  exists,
  listGoldenEpisodeFiles,
  episodeIdFromFilename,
} from "./intelligence_lib.mjs";

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

const { manifest, enforcement } = loadCanon();

// --- Constitution version ---
const constitutionMd = readText(manifest.constitution.path);
const mdVersion = extractConstitutionVersion(constitutionMd);
if (!mdVersion) {
  fail("Constitution markdown missing **Version:** x.y.z");
} else if (mdVersion !== manifest.constitution.version) {
  fail(
    `Constitution version mismatch: manifest=${manifest.constitution.version} md=${mdVersion}`
  );
}

// --- Canon files exist ---
for (const [key, rel] of Object.entries(manifest.canon || {})) {
  if (key.endsWith("_dir")) {
    if (!exists(rel)) fail(`Canon dir missing (${key}): ${rel}`);
  } else if (!exists(rel)) {
    fail(`Canon file missing (${key}): ${rel}`);
  }
}
if (!exists(manifest.constitution.path)) {
  fail(`Constitution path missing: ${manifest.constitution.path}`);
}

// --- Capabilities: ledger ↔ manifest ---
const ledgerIds = new Set(extractLedgerCapabilityIds(readText(manifest.canon.capability_ledger)));
const manifestCaps = new Set(manifest.capabilities || []);
for (const id of manifestCaps) {
  if (!ledgerIds.has(id)) fail(`Manifest capability not in ledger: ${id}`);
}
for (const id of ledgerIds) {
  if (!manifestCaps.has(id)) {
    // Ledger may mention wildcards via regex extraction of concrete IDs only
    warn(`Ledger capability not listed in manifest.capabilities: ${id}`);
  }
}

// --- Capability dependencies cover all caps ---
const depKeys = new Set(Object.keys(enforcement.capability_dependencies || {}));
for (const id of manifestCaps) {
  if (!depKeys.has(id)) fail(`Missing capability_dependencies entry for ${id}`);
}
for (const id of depKeys) {
  if (!manifestCaps.has(id)) fail(`Orphan capability_dependencies key: ${id}`);
  for (const d of enforcement.capability_dependencies[id] || []) {
    if (!manifestCaps.has(d)) fail(`Dependency ${d} of ${id} not in manifest capabilities`);
  }
}

// --- Invariants ---
const invCoverage = enforcement.invariant_coverage || {};
const invIds = new Set();
for (const inv of manifest.invariants || []) {
  if (!inv.id) fail("Invariant missing id");
  if (invIds.has(inv.id)) fail(`Duplicate invariant id: ${inv.id}`);
  invIds.add(inv.id);
  if (!inv.executable) fail(`Invariant ${inv.id} missing executable path`);
  if (!exists(inv.executable)) fail(`Invariant ${inv.id} executable path missing: ${inv.executable}`);
  const cov = invCoverage[inv.id];
  if (!cov) {
    fail(`Invariant ${inv.id} missing enforcement.invariant_coverage entry`);
  } else {
    if (!["executable", "documentation"].includes(cov.kind)) {
      fail(`Invariant ${inv.id} coverage kind invalid: ${cov.kind}`);
    }
    if (cov.path && !exists(cov.path)) fail(`Invariant ${inv.id} coverage path missing: ${cov.path}`);
    if (cov.kind === "executable" && cov.path && !exists(cov.path)) {
      fail(`Invariant ${inv.id} executable coverage missing: ${cov.path}`);
    }
  }
  for (const c of inv.capabilities || []) {
    if (!manifestCaps.has(c)) fail(`Invariant ${inv.id} references unknown capability ${c}`);
  }
}
for (const id of Object.keys(invCoverage)) {
  if (!invIds.has(id)) fail(`Orphan invariant_coverage entry: ${id}`);
}

// --- Golden episodes ---
const epIds = new Set();
for (const ep of manifest.golden_episodes || []) {
  if (!ep.id || !/^EP-\d{3}$/.test(ep.id)) fail(`Golden episode bad id: ${ep.id}`);
  if (epIds.has(ep.id)) fail(`Duplicate golden episode id: ${ep.id}`);
  epIds.add(ep.id);
  if (!ep.path || !exists(ep.path)) fail(`Golden episode path missing: ${ep.id} → ${ep.path}`);
  const body = readText(ep.path);
  if (!body.includes(ep.id)) fail(`Episode file does not contain id ${ep.id}: ${ep.path}`);
  for (const c of ep.capabilities || []) {
    if (!manifestCaps.has(c)) fail(`Episode ${ep.id} unknown capability ${c}`);
  }
  const bridge = (enforcement.episode_eval_bridge || {})[ep.id];
  if (!bridge) {
    fail(`Episode ${ep.id} missing episode_eval_bridge entry`);
  } else if (bridge.suite && !exists(bridge.suite)) {
    fail(`Episode ${ep.id} bridge suite missing: ${bridge.suite}`);
  } else if (bridge.kind === "documentation" && !bridge.note) {
    warn(`Episode ${ep.id} is documentation-only without note`);
  }
}
const diskEps = listGoldenEpisodeFiles();
for (const f of diskEps) {
  const id = episodeIdFromFilename(f);
  if (id && !epIds.has(id)) fail(`Episode file on disk not in manifest: ${f}`);
}
for (const id of epIds) {
  const found = diskEps.some((f) => episodeIdFromFilename(f) === id);
  if (!found) fail(`Manifest episode ${id} has no EP-*.md on disk`);
}

// --- ADRs ---
for (const adr of manifest.adrs || []) {
  if (!exists(adr)) fail(`ADR missing: ${adr}`);
}
const decisionsDir = path.join(ROOT, "docs/intelligence/decisions");
if (fs.existsSync(decisionsDir)) {
  for (const f of fs.readdirSync(decisionsDir).filter((x) => x.startsWith("ADR-INT-"))) {
    const rel = `docs/intelligence/decisions/${f}`;
    if (!(manifest.adrs || []).includes(rel)) {
      warn(`ADR on disk not in manifest.adrs: ${rel}`);
    }
  }
}

// --- Domain owner paths (warn if missing — V2 dirty tree may not have all committed) ---
for (const [name, rel] of Object.entries(manifest.domain_owners || {})) {
  if (!exists(rel)) {
    warn(`Domain owner path missing (may be uncommitted V2 work): ${name} → ${rel}`);
  }
}

// --- Supersessions ---
for (const s of enforcement.supersessions || []) {
  if (!s.from) fail("Supersession missing from");
  if (!s.to && !s.replacement) fail(`Supersession of ${s.from} missing to/replacement`);
  if (!s.reason) fail(`Supersession of ${s.from} missing reason`);
  if (!s.evidence) fail(`Supersession of ${s.from} missing evidence`);
  if (!s.adr) fail(`Supersession of ${s.from} missing adr reference`);
}

// --- Protected paths exist ---
for (const p of enforcement.protected_paths || []) {
  if (!exists(p)) fail(`Protected path missing: ${p}`);
}

// --- Eval suite commands shape ---
for (const [name, suite] of Object.entries(manifest.eval_suites || {})) {
  if (!suite.command) fail(`Eval suite ${name} missing command`);
  if (!suite.cwd) fail(`Eval suite ${name} missing cwd`);
}

// --- Report ---
console.log("==================================================");
console.log("OPAL INTELLIGENCE MANIFEST VALIDATION");
console.log("==================================================");
console.log(`Constitution: ${manifest.constitution.version} (${mdVersion === manifest.constitution.version ? "version OK" : "VERSION FAIL"})`);
console.log(`Capabilities: ${manifestCaps.size}`);
console.log(`Invariants: ${invIds.size}`);
console.log(`Golden episodes: ${epIds.size}`);
console.log(`ADRs: ${(manifest.adrs || []).length}`);
console.log(`Supersessions: ${(enforcement.supersessions || []).length}`);

if (warnings.length) {
  console.log("");
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}

if (errors.length) {
  console.log("");
  console.log(`FAILURES (${errors.length}):`);
  for (const e of errors) console.log(`  - ${e}`);
  console.log("==================================================");
  console.log("RESULT: FAIL");
  process.exit(1);
}

console.log("");
console.log("RESULT: PASS");
console.log("==================================================");
process.exit(0);
