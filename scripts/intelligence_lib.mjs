/**
 * Shared helpers for intelligence governance scripts.
 * Model-neutral. Deterministic. No LLM.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export function readJson(rel) {
  const p = path.join(ROOT, rel);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

export function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

export function loadCanon() {
  const manifest = readJson("config/intelligence_manifest.json");
  const enforcement = readJson("config/intelligence_enforcement.json");
  return { manifest, enforcement };
}

/** Extract **Version:** x.y.z from constitution markdown. */
export function extractConstitutionVersion(md) {
  const m = md.match(/\*\*Version:\*\*\s*([0-9]+\.[0-9]+\.[0-9]+)/);
  return m ? m[1] : null;
}

/** All INT-* IDs appearing as table cells or bare tokens in ledger. */
export function extractLedgerCapabilityIds(ledgerMd) {
  const ids = new Set();
  const re = /\bINT-[A-Z0-9]+-\d{3}\b/g;
  let m;
  while ((m = re.exec(ledgerMd))) ids.add(m[0]);
  return [...ids].sort();
}

export function extractAdrIdsFromPaths(paths) {
  return paths
    .map((p) => {
      const m = String(p).match(/ADR-INT-\d{3}/);
      return m ? m[0] : null;
    })
    .filter(Boolean);
}

export function listGoldenEpisodeFiles() {
  const dir = path.join(ROOT, "docs/intelligence/golden-episodes");
  return fs
    .readdirSync(dir)
    .filter((f) => /^EP-\d{3}-.+\.md$/.test(f))
    .sort();
}

export function episodeIdFromFilename(name) {
  const m = name.match(/^(EP-\d{3})-/);
  return m ? m[1] : null;
}

/** Simple glob-ish match: ** and * supported for path segments. */
export function pathMatches(pattern, filePath) {
  const norm = filePath.replace(/\\/g, "/");
  const pat = pattern.replace(/\\/g, "/");
  if (pat.includes("**") || pat.includes("*")) {
    const esc = pat
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "<<<DS>>>")
      .replace(/\*/g, "[^/]*")
      .replace(/<<<DS>>>/g, ".*");
    return new RegExp(`^${esc}$`).test(norm);
  }
  return norm === pat || norm.endsWith("/" + pat) || norm.includes(pat);
}

export function collectDependentCapabilities(enforcement, seeds) {
  const deps = enforcement.capability_dependencies || {};
  const reverse = {};
  for (const [cap, list] of Object.entries(deps)) {
    for (const d of list || []) {
      if (!reverse[d]) reverse[d] = new Set();
      reverse[d].add(cap);
    }
  }
  const out = new Set(seeds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of [...out]) {
      for (const d of deps[c] || []) {
        if (!out.has(d)) {
          out.add(d);
          changed = true;
        }
      }
      for (const r of reverse[c] || []) {
        if (!out.has(r)) {
          out.add(r);
          changed = true;
        }
      }
    }
  }
  return [...out].sort();
}

export function capabilitiesForFiles(enforcement, files) {
  const caps = new Set();
  const matched = [];
  for (const file of files) {
    const norm = file.replace(/\\/g, "/").replace(/^\.\//, "");
    let hit = false;
    for (const t of enforcement.file_triggers || []) {
      if (pathMatches(t.pattern, norm)) {
        hit = true;
        for (const c of t.capabilities || []) caps.add(c);
      }
    }
    if (hit) matched.push(norm);
  }
  return { capabilities: [...caps].sort(), matched };
}

export function isIntelligenceSensitive(enforcement, files) {
  const { matched } = capabilitiesForFiles(enforcement, files);
  // docs/intelligence and manifest match with empty capabilities still sensitive
  if (matched.length > 0) return true;
  for (const file of files) {
    const norm = file.replace(/\\/g, "/");
    if (norm.startsWith("docs/intelligence/") || norm.startsWith("config/intelligence_")) {
      return true;
    }
  }
  return false;
}

export function invariantsForCapabilities(manifest, caps) {
  const set = new Set(caps);
  const invs = [];
  for (const inv of manifest.invariants || []) {
    if ((inv.capabilities || []).some((c) => set.has(c))) invs.push(inv.id);
  }
  return invs;
}

export function episodesForCapabilities(manifest, caps) {
  const set = new Set(caps);
  return (manifest.golden_episodes || [])
    .filter((ep) => (ep.capabilities || []).some((c) => set.has(c)))
    .map((ep) => ep.id);
}
