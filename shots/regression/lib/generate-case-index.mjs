#!/usr/bin/env node
/**
 * Generate shots/regression/cases.json + CASE_INDEX.md from the Repair
 * #18 regression catalog (the case registry). The catalog is the source
 * of truth; this script only parses its group tables.
 *
 * Usage:
 *   node lib/generate-case-index.mjs [path-to-regression-catalog.md]
 *
 * Default catalog locations, first hit wins:
 *   $REGRESSION_CATALOG, then ../../../coordination/repair18/regression-catalog.md
 *   relative to the repo root (the coordination folder sits beside the
 *   repos/ folder in the opal-graph workspace).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const suiteDir = path.resolve(here, "..");
const repoRoot = path.resolve(suiteDir, "..", "..");

const candidates = [
  process.env.REGRESSION_CATALOG,
  path.resolve(repoRoot, "..", "..", "coordination", "repair18", "regression-catalog.md"),
  path.resolve(repoRoot, "..", "coordination", "repair18", "regression-catalog.md"),
].filter(Boolean);

const catalogPath = process.argv[2] || candidates.find((p) => fs.existsSync(p));
if (!catalogPath || !fs.existsSync(catalogPath)) {
  console.error(
    `catalog not found; tried: ${candidates.join(", ")} - pass the path as argv[1]`,
  );
  process.exit(2);
}

const text = fs.readFileSync(catalogPath, "utf8");
const lines = text.split("\n");

let theme = null;
const cases = [];
for (const line of lines) {
  const group = line.match(/^## Group [A-Z] - (.+)$/);
  if (group) {
    theme = group[1].trim();
    continue;
  }
  const row = line.match(/^\| (FR-\d+-\d+) \| (.*?) \| (.*?) \| (.*?) \| (.*?) \| (.*?) \|$/);
  if (!row) continue;
  const [, id, symptom, surfaces, , , klass] = row;
  if (id === "FR-18-07") continue; // cross-reference row, not a case
  if (/^\(Cross-reference\)/.test(symptom)) continue;
  const cls = klass.trim();
  const automatable = cls.startsWith("A");
  const phone = cls.startsWith("P") || cls.includes("+P") || cls.startsWith("A+P");
  cases.push({
    id,
    title: symptom.trim(),
    theme,
    surfaces: surfaces
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    class: cls,
    automatable,
    phone_checklist: phone && !automatable ? "only" : phone ? "also" : "no",
  });
}

if (cases.length === 0) {
  console.error("no case rows parsed - catalog format changed?");
  process.exit(2);
}

// Integration extension (2026-10-18, coordinator ruling - decided once):
// the catalog parser only understands FR-NN-NN rows, so whole case
// families whose ids differ (B1-S*, FR-18-B2-*, FR-B3-*, FR-18-W4-*,
// W4-04*, W4-02/W4-03 rendered) were silently dropped from the index
// while their executable case files sat in the suite. The index is
// now the UNION: catalog rows keep their registry metadata; every
// executable case file on disk (API stage + rendered stage) that the
// catalog did not produce is merged in from its module exports. A
// case file with a run() is automatable by construction; it can
// never fall out of the index again.
const known = new Set(cases.map((c) => c.id));
for (const [stage, dir] of [
  ["api", path.join(suiteDir, "cases")],
  ["rendered", path.join(suiteDir, "rendered", "cases")],
]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".case.mjs")) continue;
    const mod = (await import(path.join(dir, f))).default;
    if (!mod || !mod.id || known.has(mod.id)) continue;
    known.add(mod.id);
    const cls = (mod.class || "A").trim();
    const phone = cls.includes("P");
    cases.push({
      id: mod.id,
      title: (mod.title || mod.id).trim(),
      theme: mod.theme || (stage === "rendered" ? "rendered" : "-"),
      surfaces: Array.isArray(mod.surfaces) ? mod.surfaces : [],
      class: cls,
      automatable: typeof mod.run === "function",
      phone_checklist: phone ? "also" : "no",
      stage,
      source: "case-file",
    });
  }
}

fs.writeFileSync(
  path.join(suiteDir, "cases.json"),
  JSON.stringify(
    { generated_from: "coordination/repair18/regression-catalog.md + cases/*.case.mjs + rendered/cases/*.case.mjs", count: cases.length, cases },
    null,
    2,
  ) + "\n",
);

const auto = cases.filter((c) => c.automatable).length;
const phoneOnly = cases.filter((c) => !c.automatable).length;
let md = `# Repair #18 regression suite - case index\n\n`;
md += `Generated from the regression catalog by lib/generate-case-index.mjs. Do not edit by hand.\n\n`;
md += `Total permanent cases: ${cases.length}. Automatable at the real path: ${auto}. Phone-checklist only: ${phoneOnly}.\n\n`;
md += `| Case | Title (founder symptom, short) | Theme | Automatable | Phone checklist |\n`;
md += `|---|---|---|---|---|\n`;
for (const c of cases) {
  md += `| ${c.id} | ${c.title.replace(/\|/g, "/")} | ${c.theme || "-"} | ${c.automatable ? "yes" : "no"} | ${c.phone_checklist} |\n`;
}
md += `\nPhone-checklist only cases stay on the founder phone checklist by name in the handover; `;
md += `they are never silently dropped from the suite.\n`;
fs.writeFileSync(path.join(suiteDir, "CASE_INDEX.md"), md);

console.log(`wrote cases.json + CASE_INDEX.md: ${cases.length} cases (${auto} automatable, ${phoneOnly} phone-only)`);
