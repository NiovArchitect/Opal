#!/usr/bin/env node
/**
 * Repair #18 — QUANTIFIED ACCURACY POSTURE (catalog §4.3).
 *
 * Counts REACHABLE old-pattern sites per Mistake-Pattern fingerprint
 * (shots/repair18/MISTAKE_PATTERN_CATALOG.md) and prints the per-build
 * numbers. A build that regresses a count fails the gate — the gates
 * themselves are the structural tests that encode these same
 * fingerprints:
 *   web:     apps/opal_web/src/opalUi/mistakePatternEnforcement.test.ts
 *   backend: apps/opal_core/test/opal_core/repair18_pattern_enforcement_test.exs
 * This script is the measurement, not a gate: it always exits 0 and
 * prints n/a (with the reason) for patterns that have no honest static
 * fingerprint, rather than inventing a number.
 *
 * Usage: node scripts/pattern_posture.mjs [repo-root]
 * Default root: the repo containing this script.
 *
 * TEETH-2 (2026-10-18, muse/r18-teeth2): counts are SITES, not files
 * (red-team FIX-8 — growth inside a baselined file must move the
 * number; the pre-teeth-2 TOTAL of 11 counted files and is superseded,
 * not comparable). The scans mirror the repaired gates: dynamic
 * import() + re-exports are seed-data flows (FIX-1), the seed-module
 * registry is discovery-based over .ts/.tsx/.js/.jsx/.mts (FIX-3),
 * inline "seed-*" literals are a gated count (FIX-4 step 1), seed
 * reach is counted across all of lib/ (FIX-6), MP-3 counts duplicate
 * status->family literals anywhere under c2/ outside the adapter
 * (FIX-7), MP-6 counts query-pattern sites including the facade/owner
 * files (FIX-2/FIX-9), and MP-11 has a row (FIX-12): files using a
 * canon indicator hex outside the single token source. Bounds mirror
 * the gates: inline data with non-"seed-*" ids, responders without
 * the canned-table shape, variable-held-schema queries (MP-6c), and
 * split-fragment provenance minting are LABELED HOPEs in catalog §5 —
 * counted here as n/a rather than as a false zero.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const WEB_SRC = join(ROOT, "apps/opal_web/src");
const CORE_LIB = join(ROOT, "apps/opal_core/lib");
const CORE_ROOT = join(ROOT, "apps/opal_core");

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mts"];
function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const read = (p) => readFileSync(p, "utf8");
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ---- web seed-data flows (MP-2, mirrors the web enforcement test) ----
const SEED_DATA_EXPORTS = {
  "opalUi/founderGraphSeed.ts": ["FOUNDER_HOME_FEED", "FOUNDER_LIVE_FEED", "FOUNDER_STORIES", "FOUNDER_PEOPLE", "FOUNDER_PEOPLE_PULSE", "HOME_GRAPH_TIMELINE_COLORS", "HOME_ICONS", "founderWhoPeople"],
  "opalUi/founderChatsPlanPills.ts": ["FOUNDER_CHATS_PLAN_PILL_ROWS", "FOUNDER_PEER_AVATAR_BY_NAME", "FOUNDER_PHONE_CHAT_ROWS_MIN", "remapFounderChatRowsToLive", "overlayFounderSeedNamesOnChats", "founderSeedDisplayNameForId", "resolveFounderPeerAvatarSrc"],
  "opalUi/callsContinuitySeed.ts": ["FOUNDER_CALLS_CONTINUITY_ROWS", "FORBIDDEN_PROVIDER_CALL_ROW_IDS", "founderGraphingEnabledCallRows"],
  "opalUi/mexicoCityCanvasSeed.ts": ["MEXICO_CITY_CANVAS_PEOPLE", "buildMexicoCityCanvasSeed"],
  "opalUi/alexTripMemories.ts": ["ALEX_MEXICO_TRIP_MEMORIES"],
  "opalUi/GraphsTemporalTimeline.tsx": ["SEED_TIMELINE_ITEMS"],
};
const SEED_MODULES = new Set(Object.keys(SEED_DATA_EXPORTS));
const IMPORT_RE = /import\s+(type\s+)?(?:\{([\s\S]*?)\}|([A-Za-z_$][\w$]*))?\s*(?:from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
const EXPORT_FROM_RE = /export\s+(?:\{([\s\S]*?)\}|\*)\s+from\s+["']([^"']+)["']/g;

const webFiles = walk(WEB_SRC, SOURCE_EXTS).filter((f) => !/\.test\.(ts|tsx|js|jsx)$/.test(f));
const webRel = (p) => relative(WEB_SRC, p).split("\\").join("/");

function resolveSeedTarget(abs, spec) {
  if (!spec.startsWith(".")) return null;
  const base = join(dirname(abs), spec);
  const stripped = base.replace(/\.(ts|tsx|js|jsx|mts)$/, "");
  const cands = [base, ...SOURCE_EXTS.map((x) => `${stripped}${x}`), ...SOURCE_EXTS.map((x) => join(stripped, `index${x}`))];
  for (const c of cands) {
    const r = webRel(c);
    if (SEED_MODULES.has(r)) return r;
  }
  return null;
}
const namedExports = (raw) =>
  raw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/^type\s+/, "").split(/\s+as\s+/)[0]);

/** Seed-data flow SITES: one per (file, seed module, flow entry); the
 *  count returned is imported/exported seed NAMES (dynamic and
 *  non-named flows count 1) so growth inside a file moves it. */
function seedDataFlowSites() {
  const perFile = new Map();
  let total = 0;
  const bump = (rel, n, label) => {
    total += n;
    perFile.set(rel, [...(perFile.get(rel) ?? []), label]);
  };
  for (const abs of webFiles) {
    const rel = webRel(abs);
    if (SEED_MODULES.has(rel)) continue;
    const src = read(abs);
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      if (m[1]) continue;
      const target = resolveSeedTarget(abs, m[4]);
      if (!target) continue;
      if (m[3] || m[2] === undefined) { bump(rel, 1, `${target}: <non-named import>`); continue; }
      const data = namedExports(m[2]).filter((n) => SEED_DATA_EXPORTS[target].includes(n));
      if (data.length) bump(rel, data.length, `${target}: ${data.join(", ")}`);
    }
    DYNAMIC_IMPORT_RE.lastIndex = 0;
    while ((m = DYNAMIC_IMPORT_RE.exec(src)) !== null) {
      const target = resolveSeedTarget(abs, m[1]);
      if (target) bump(rel, 1, `${target}: <dynamic import>`);
    }
    EXPORT_FROM_RE.lastIndex = 0;
    while ((m = EXPORT_FROM_RE.exec(src)) !== null) {
      const target = resolveSeedTarget(abs, m[2]);
      if (!target) continue;
      if (m[1] === undefined) { bump(rel, 1, `${target}: <export *>`); continue; }
      const data = namedExports(m[1]).filter((n) => SEED_DATA_EXPORTS[target].includes(n));
      if (data.length) bump(rel, data.length, `${target}: ${data.join(", ")} (re-export)`);
    }
  }
  return { total, perFile };
}

// ---- counts ----------------------------------------------------------------
const responderSymbols = ["interpretSeedThreadReply", "applySeedThreadIntelligence", "isSeedDemoChatTarget", "seedChatKeyFrom", "seedChatIdForPersonName", "seedPeerAttribution", "SeedSimulatedBanner", "resolveFounderSeedThread", "founderSeedThreadMessages", "founderSeedConversationIdForName", "collectSeedLocalExtras", "planFromLocalConfirm"];
const webResponderFiles = webFiles.filter((f) => {
  const code = stripComments(read(f));
  return responderSymbols.some((s) => code.includes(s));
});
// FIX-5 shape (mirror of the web gate): service-free Record<string,string>
// table with >=2 sentence-like values.
const webShapeFiles = webFiles.filter((f) => {
  const code = stripComments(read(f));
  if (/productClient|from\s+["'][^"']*\/api\/|fetch\s*\(/.test(code)) return false;
  const tableRe = /(?:const|let|var)\s+(\w+)\s*:\s*Record<string,\s*string>\s*=\s*\{([^{}]*)\}/g;
  let m;
  while ((m = tableRe.exec(code)) !== null) {
    const values = [...m[2].matchAll(/(?:["']?[A-Za-z0-9_]+["']?)\s*:\s*"([^"\n]+)"/g)].map((x) => x[1]);
    if (values.filter((v) => v.trim().split(/\s+/).length >= 4).length >= 2) return true;
  }
  return false;
});
const seedlikeUnregistered = webFiles.filter((f) => {
  const rel = webRel(f);
  return (/(seed|fixture|demo|mock)/i.test(rel) || rel.includes("__fixtures__/") || rel.includes("__mocks__/")) && !SEED_MODULES.has(rel);
});

const coreFiles = walk(CORE_LIB, [".ex"]);
const coreRel = (p) => relative(CORE_ROOT, p).split("\\").join("/");
const SEED_REACH_ALLOWED = new Set([
  "lib/opal_core/social_flow/founder_communication_seed.ex",
  "lib/opal_core/social_flow/founder_graph_commitment_seed.ex",
  "lib/opal_core/social_flow/plan_transition.ex",
  "lib/opal_core_web/controllers/founder_seed_controller.ex",
]);
const seedReachFiles = coreFiles.filter(
  (f) => !SEED_REACH_ALLOWED.has(coreRel(f)) && /FounderCommunicationSeed|FounderGraphCommitmentSeed/.test(read(f)),
);
const scriptedModules = coreFiles.filter((f) => /defmodule\s+\S*(SeedResponder|ScriptedResponder|CannedRepl|SeedThread|LocalReply|ReplyEngine|ScriptedReply|OfflineResponder)/.test(read(f)));
const backendShapeFiles = coreFiles.filter((f) => {
  const src = read(f);
  const sentenceEntries = [...src.matchAll(/"[a-z][a-z0-9_]{0,20}"\s*=>\s*"([^"\n]+)"/g)].filter((x) => x[1].split(/\s+/).length >= 4).length;
  return sentenceEntries >= 2 && /def\s+(reply|respond|answer)\b/.test(src) && !/\bRepo\.|Req\.|Finch\.|:httpc/.test(src);
});

const mp2 = seedDataFlowSites();
const provenanceWrites = coreFiles.filter(
  (f) =>
    !/founder_(communication|graph_commitment)_seed\.ex$/.test(f) &&
    /authority_source:\s*"founder_(?:communication|graph_commitment)_seed"|"authority_source"\s*=>\s*"founder_(?:communication|graph_commitment)_seed"/.test(read(f)),
);
const provenanceFragments = coreFiles.filter((f) => {
  if (/founder_(communication|graph_commitment)_seed\.ex$/.test(f)) return false;
  const stripped = read(f)
    .replaceAll(":allow_founder_communication_seed", "")
    .replaceAll(":allow_founder_graph_commitment_seed", "")
    .replaceAll("founder_communication_seed", "")
    .replaceAll("founder_graph_commitment_seed", "");
  return stripped.includes("communication_seed") || stripped.includes("graph_commitment_seed");
});
const mp2InlineSeedIdSites = webFiles.reduce((acc, f) => {
  if (SEED_MODULES.has(webRel(f))) return acc;
  return acc + (read(f).match(/["']seed-[a-z0-9-]+["']/g) ?? []).length;
}, 0);

// MP-3: duplicate status->family literals anywhere under c2/ outside shellData.ts.
const RAW_STATUSES = new Set(["agreed", "locked", "proposed", "confirmed", "live", "done", "cancelled"]);
const FAMILY_VALUES = new Set(["ready", "forming", "happening", "action", "past"]);
const c2Files = webFiles.filter((f) => webRel(f).startsWith("c2/"));
const mp3FamilyMaps = c2Files.filter((f) => !webRel(f).endsWith("shellData.ts") && read(f).includes("FAMILY_BY_STATUS"));
let mp3DupMapSites = 0;
for (const f of c2Files) {
  if (webRel(f).endsWith("shellData.ts")) continue;
  for (const chunk of read(f).match(/\{[^{}]*\}/g) ?? []) {
    const entries = [...chunk.matchAll(/["']?([a-z_]+)["']?\s*:\s*"([a-z]+)"/g)];
    const raw = new Set(entries.filter(([_, k]) => RAW_STATUSES.has(k)).map(([_, k]) => k));
    const fam = new Set(entries.filter(([_, k, v]) => FAMILY_VALUES.has(v)).map(([_, k, v]) => v));
    if (raw.size >= 2 && fam.size >= 2) mp3DupMapSites += 1;
  }
}

// MP-6: per-site counts over ALL files (facade/owner included, FIX-9).
const memoryPatterns = [
  /from\s*\([^)]*\bin\s+RelationshipMemory\b/g,
  /Repo\.(?:get|get_by|get_by!)\(\s*RelationshipMemory\b/g,
  /%RelationshipMemory\{\}/g,
  /from\s*\(\s*RelationshipMemory\b/g,
  /Repo\.(?:all|one|one!|aggregate|exists\?)\(\s*RelationshipMemory\b/g,
];
const memorySitesByFile = new Map();
let memoryTotal = 0;
for (const f of coreFiles) {
  const rel = coreRel(f);
  if (rel === "lib/opal_core/social_flow/relationship_memory.ex") continue;
  const src = read(f);
  const n = memoryPatterns.reduce((acc, re) => acc + (src.match(re) ?? []).length, 0);
  if (n > 0) { memorySitesByFile.set(rel, n); memoryTotal += n; }
}

const mp4Stub = coreFiles.filter((f) => read(f).includes("stub_transcript"));

// MP-11 (FIX-12): canon indicator hexes (from the token source; the
// generic past-white #FFFFFF excluded, per the gate's stated bound)
// used in code outside theme/planStateColors.ts — counted per FILE.
const tokenSrc = read(join(WEB_SRC, "theme/planStateColors.ts"));
const hexBlock = tokenSrc.match(/PLAN_STATE_HEX\s*=\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const canonHexes = [...new Set([...hexBlock.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) => x[0].toUpperCase()))].filter((h) => h !== "#FFFFFF");
const mp11Files = webFiles.filter((f) => {
  const rel = webRel(f);
  if (rel === "theme/planStateColors.ts") return false;
  const code = stripComments(read(f)).toUpperCase();
  return canonHexes.some((h) => code.includes(h));
});

// ---- report ------------------------------------------------------------------
const rows = [
  ["MP-1 scripted responder reachable", webResponderFiles.length + webShapeFiles.length + seedReachFiles.length + scriptedModules.length + backendShapeFiles.length,
    `web responder-symbol files=${webResponderFiles.length}, web canned-reply shape files=${webShapeFiles.length}, backend seed reach outside the allowed set (all of lib/)=${seedReachFiles.length}, scripted/responder module files=${scriptedModules.length}, backend canned-reply shape files=${backendShapeFiles.length}; bound: renamed responders without the shape are a LABELED HOPE (catalog §5)`],
  ["MP-2 fixture-painted surfaces", mp2.total + provenanceWrites.length + provenanceFragments.length + mp2InlineSeedIdSites + seedlikeUnregistered.length,
    `web seed-data flow sites (imported names; dynamic/re-export count 1)=${mp2.total} across ${mp2.perFile.size} files (${[...mp2.perFile.keys()].join(", ")}), backend provenance writes outside seed modules=${provenanceWrites.length}, provenance-fragment minting outside seed modules=${provenanceFragments.length}, inline "seed-*" id literal sites in non-seed web files=${mp2InlineSeedIdSites}, unregistered seed/fixture/demo/mock modules=${seedlikeUnregistered.length}; bound: inline data with non-"seed-*" ids is a LABELED HOPE (GAP MP-2-INLINE)`],
  ["MP-3 per-surface re-derivation (C2)", mp3FamilyMaps.length + mp3DupMapSites,
    `FAMILY_BY_STATUS files outside shellData.ts=${mp3FamilyMaps.length}, duplicate status->family literal sites under any name=${mp3DupMapSites}; bound: arithmetic derivation from props with no status-keyed literal is behavioral-only (labeled, §5); legacy (non-C2) derivation not yet countable — GAP MP-3b`],
  ["MP-4 canned provider output", mp4Stub.length, "files referencing stub_transcript (deleted signature); general unkeyed-{:ok} shape is not grep-decidable — GAP MP-4b, BS honesty suite owns it"],
  ["MP-5 fake toggles/controls", "n/a", "no static fingerprint separates a dead control from a wired one; the dead-control rendered sweep owns this count"],
  ["MP-6 unscoped personal-memory reads", memoryTotal,
    `query-pattern SITES across all lib files incl. facade/owner (no path exemption): ${[...memorySitesByFile.entries()].map(([f, n]) => `${f}=${n}`).join(", ")}; residual: variable-held-schema queries (MP-6c) are grep-invisible — isolation proofs remain the guard`],
  ["MP-7 unverified handover claims", "n/a", "LABELED HOPE: process pattern; device_test_build_gate owns it (badge SHA / BEAM start). FIX-11 (served build-info payload + verify_handover.mjs) not built in teeth-2 — no machine check ingests a handover claim"],
  ["MP-8 component-green as app-green", "n/a", "process/reporting pattern; whole-app rendered gate owns it, not a code count"],
  ["MP-9 silent failure", "n/a", "catch-all shapes are also legitimate (channels); failure-path tests own this, a grep count would be fiction"],
  ["MP-10 stale state over live state", "n/a", "PlanTransition gate + FR-17-03/FR-08-01 regression cases own it; no separate static site count defined"],
  ["MP-11 indicator drift", mp11Files.length,
    `files using a canon indicator hex (${canonHexes.join(", ")}) in code outside theme/planStateColors.ts: ${mp11Files.map(webRel).join(", ")} — the gate's decorative-legacy allowlist; each is an MP-11 migration item. Bound: past-white #FFFFFF excluded (generic value, cannot be fingerprinted); CSS files not walked`],
];

console.log(`Pattern posture — root: ${ROOT}`);
let total = 0;
for (const [name, count, note] of rows) {
  if (typeof count === "number") total += count;
  console.log(`${name}: ${count}`);
  console.log(`  ${note}`);
}
console.log(`TOTAL countable reachable old-pattern sites: ${total}`);
console.log("Direction law (catalog §4.3): counts trend to zero and stay zero; a regression is a gate failure, charged to the check.");
console.log("Unit note (teeth-2): TOTAL counts SITES, not files — it supersedes the pre-teeth-2 file-count TOTAL (11) and is not comparable to it.");
