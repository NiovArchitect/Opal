#!/usr/bin/env node
/**
 * Deterministic intelligence preflight discovery.
 * Usage: node scripts/intelligence_preflight.mjs [--json]
 */
import {
  loadCanon,
  extractConstitutionVersion,
  readText,
  listGoldenEpisodeFiles,
} from "./intelligence_lib.mjs";

const json = process.argv.includes("--json");
const { manifest, enforcement } = loadCanon();
const constitutionMd = readText(manifest.constitution.path);
const mdVersion = extractConstitutionVersion(constitutionMd);
const episodes = listGoldenEpisodeFiles();

const report = {
  status: "OK",
  constitution_version_manifest: manifest.constitution.version,
  constitution_version_md: mdVersion,
  constitution_version_match: mdVersion === manifest.constitution.version,
  primary_law: manifest.constitution.primary_law,
  capability_count: (manifest.capabilities || []).length,
  capabilities: manifest.capabilities,
  invariant_count: (manifest.invariants || []).length,
  invariants: (manifest.invariants || []).map((i) => ({
    id: i.id,
    executable: i.executable,
  })),
  golden_episode_count: (manifest.golden_episodes || []).length,
  golden_episodes: (manifest.golden_episodes || []).map((e) => e.id),
  golden_episode_files_on_disk: episodes,
  adr_count: (manifest.adrs || []).length,
  eval_suites: Object.keys(manifest.eval_suites || {}),
  eval_profiles: Object.keys(enforcement.eval_profiles || {}),
  agent_preflight_required_fields: enforcement.agent_preflight_required_fields,
  commands: enforcement.commands,
  frozen: {
    brand: enforcement ? manifest.frozen_foundations?.brand?.status : undefined,
    v2_merge: manifest.frozen_foundations?.v2_merge?.status,
    proof_harness: manifest.frozen_foundations?.proof_harness?.status,
    sf15: manifest.frozen_foundations?.sf15?.status,
  },
  establishment_sha: enforcement.constitution_establishment_sha,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.constitution_version_match ? 0 : 1);
}

console.log("==================================================");
console.log("OPAL INTELLIGENCE PREFLIGHT (deterministic)");
console.log("==================================================");
console.log(`CONSTITUTION VERSION: ${report.constitution_version_manifest}`);
console.log(
  `CONSTITUTION MD VERSION: ${report.constitution_version_md || "MISSING"} (${report.constitution_version_match ? "MATCH" : "MISMATCH"})`
);
console.log(`PRIMARY LAW: ${report.primary_law}`);
console.log(`CAPABILITY COUNT: ${report.capability_count}`);
console.log(`INVARIANT COUNT: ${report.invariant_count}`);
console.log(`GOLDEN EPISODES: ${report.golden_episodes.join(", ")}`);
console.log(`ADRs: ${report.adr_count}`);
console.log(`EVAL SUITES: ${report.eval_suites.join(", ")}`);
console.log(`EVAL PROFILES: ${report.eval_profiles.join(", ")}`);
console.log(`ESTABLISHMENT SHA: ${report.establishment_sha}`);
console.log("");
console.log("FROZEN / HOLD:");
console.log(`  brand: ${manifest.frozen_foundations?.brand?.status}`);
console.log(`  v2_merge: ${manifest.frozen_foundations?.v2_merge?.status}`);
console.log(`  proof_harness: ${manifest.frozen_foundations?.proof_harness?.status}`);
console.log(`  sf15: ${manifest.frozen_foundations?.sf15?.status}`);
console.log("");
console.log("AGENT MUST EMIT BEFORE INTELLIGENCE CODE CHANGES:");
for (const f of report.agent_preflight_required_fields) {
  console.log(`  - ${f}`);
}
console.log("");
console.log("COMMANDS:");
for (const [k, v] of Object.entries(report.commands || {})) {
  console.log(`  ${k}: ${v}`);
}
console.log("==================================================");

process.exit(report.constitution_version_match ? 0 : 1);
