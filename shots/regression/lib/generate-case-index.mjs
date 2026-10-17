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

fs.writeFileSync(
  path.join(suiteDir, "cases.json"),
  JSON.stringify(
    { generated_from: "coordination/repair18/regression-catalog.md", count: cases.length, cases },
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
