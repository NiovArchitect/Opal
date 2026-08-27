#!/usr/bin/env node
/**
 * OPAL AUTHORITY GUARD
 * Reads docs/authority/OPAL_CURRENT_AUTHORITY.yaml (light parse) and fails on
 * known production violations. Run at start AND end of every agent pass.
 *
 * Usage: node scripts/opal-authority-check.mjs
 * Exit 0 = green, 2 = red
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = resolve(ROOT, "apps/opal_web");
const failures = [];
const warnings = [];

function fail(msg) {
  failures.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function read(p) {
  return readFileSync(resolve(ROOT, p), "utf8");
}

function sha256File(rel) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function rg(pattern, cwdRel = "apps/opal_web/src") {
  try {
    return execSync(`grep -RInE '${pattern}' '${resolve(ROOT, cwdRel)}' || true`, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

function productionHits(pattern, { allowTest = true, allowCommentHint = true } = {}) {
  const out = rg(pattern, "apps/opal_web/src");
  return out
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      const path = line.split(":")[0] || "";
      if (allowTest && /\.test\.(ts|tsx)$/.test(path)) return false;
      if (allowCommentHint && /\/\*|\/\/|SUPERSEDED|DO NOT|forbidden|never |NOT "|title is "Activity"/.test(line)) {
        // Still catch executable strings — only drop pure commentary lines
        if (/^\s*(\/\/|\*|\/\*)/.test(line.split(":").slice(2).join(":")) || line.includes("SUPERSEDED") || line.includes("DO NOT IMPLEMENT") || line.includes("Customer-facing") || line.includes("never surfaces") || line.includes("no Messages") || line.includes("NOT \"Needs") || line.includes("not \"Needs") || line.includes("founder override") || line.includes("has no Commit")) {
          return false;
        }
      }
      return true;
    });
}

// --- Manifest exists ---
const authPath = "docs/authority/OPAL_CURRENT_AUTHORITY.yaml";
if (!existsSync(resolve(ROOT, authPath))) {
  fail(`Missing ${authPath}`);
} else {
  const auth = read(authPath);
  if (!/merge_authorized:\s*false/.test(auth)) fail("OPAL_CURRENT_AUTHORITY merge_authorized must be false");
  if (!/live_authorized:\s*false/.test(auth)) fail("OPAL_CURRENT_AUTHORITY live_authorized must be false");
  if (!/founder_fixture_is_production_default:\s*false/.test(auth)) {
    fail("founder_fixture_is_production_default must be false");
  }
  if (!/direct:\s*"618:348"/.test(auth)) fail("Direct authority must be 618:348");
  if (!/group:\s*"618:451"/.test(auth)) fail("Group authority must be 618:451");
}

for (const f of [
  "docs/authority/FIGMA_RUNTIME_LEDGER.yaml",
  "docs/authority/SUPERSEDED_PRESENTATIONS.yaml",
  "docs/authority/ASSET_PROVENANCE.yaml",
]) {
  if (!existsSync(resolve(ROOT, f))) fail(`Missing ${f}`);
}

// --- Canonical asset bytes ---
const promiseSha = sha256File("apps/opal_web/public/brand/opal-graph/opal-promise-exact-941x1672.png");
const expectedPromise = "20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10";
if (promiseSha !== expectedPromise) {
  fail(`Promise SHA mismatch: got ${promiseSha}, expected ${expectedPromise}`);
}

const center = "apps/opal_web/public/brand/opal-graph/opal-center-opal-645-3-rest-512.png";
if (!existsSync(resolve(ROOT, center))) fail(`Missing Center Opal ${center}`);

const juniper = "apps/opal_web/public/figma-v2/direct/opal-direct-juniper-618-376.png";
if (!existsSync(resolve(ROOT, juniper))) fail(`Missing Direct Juniper ${juniper}`);
const juniperJpgSha = sha256File("apps/opal_web/public/figma-v2/direct/opal-direct-juniper-618-376.jpg");
if (juniperJpgSha !== "d6d8c288dc4176477c4fae90d9702863811fbb5030ba03ed65dfe029a0de4916") {
  fail(`Juniper JPG SHA mismatch: ${juniperJpgSha}`);
}

// --- Forbidden Figma as current data-figma markers in production (not brand registry) ---
const forbiddenNodes = ["539:5", "539:9", "539:11", "539:13", "540:2", "540:14", "541:8", "554:5"];
for (const node of forbiddenNodes) {
  const hits = productionHits(node.replace(":", "\\:")).filter(
    (h) =>
      !h.includes("brand.ts") &&
      !h.includes("brandMark.test") &&
      !h.includes("superseded") &&
      !h.includes("INVALID") &&
      !h.includes("legacy") &&
      !h.includes("data-figma-sfr"), // inert CSS safety selector
  );
  // Allow spectralTokens legacy selector comments
  const bad = hits.filter((h) => /data-figma(?!-sfr)=/.test(h) || /CURRENT|authority:\s*"/.test(h));
  if (bad.length) fail(`Forbidden node ${node} used as current authority:\n${bad.join("\n")}`);
}

// --- Rejected customer strings in production UI code ---
{
  const hits = rg("Enter Journey|Commit / Enter Journey", "apps/opal_web/src");
  const bad = hits
    .split("\n")
    .filter(Boolean)
    .filter((l) => !/\.test\.(ts|tsx):/.test(l))
    .filter((l) => !/no Commit|has no Commit|FORBIDDEN|must not|never /i.test(l));
  // Executable JSX text would look like >Enter Journey< or "Enter Journey" as children
  const exec = bad.filter((l) => />Enter Journey<|>Commit/.test(l) || /label:\s*["']Enter Journey/.test(l));
  if (exec.length) fail(`Enter Journey executable presentation:\n${exec.join("\n")}`);
}

{
  const call = readFileSync(resolve(WEB, "src/opalUi/CallSurfaces.tsx"), "utf8");
  if (/call-flip|data-testid=["']call-flip["']|>\s*Flip\s*</.test(call)) {
    fail("CallSurfaces contains Flip");
  }
}

{
  const chats = readFileSync(resolve(WEB, "src/opalUi/ChatsHome.tsx"), "utf8");
  if (/Messages\s*\/\s*Calls|segmented.*Messages|tab.*Calls.*Messages/.test(chats) && /<button[^>]*>\s*Messages/.test(chats)) {
    fail("ChatsHome appears to render Messages/Calls tabs");
  }
}

{
  const act = readFileSync(resolve(WEB, "src/opalUi/ActivityDestination.tsx"), "utf8");
  if (/["']Needs you["']|["']Needs You["']/.test(act) && !/NOT "Needs you"/.test(act)) {
    // title string
    if (/title=\{?["']Needs you/.test(act) || />Needs you</.test(act)) {
      fail("ActivityDestination title regresses to Needs you");
    }
  }
  if (!/Activity/.test(act)) warn("ActivityDestination may be missing Activity title");
}

{
  const graphs = readFileSync(resolve(WEB, "src/opalUi/GraphsHome.tsx"), "utf8");
  if (!/\bAction\b/.test(graphs)) fail("GraphsHome missing Action filter");
  if (/["']Needs you["']/.test(graphs) && /chip|filter|tab/.test(graphs)) {
    // allow comment about not Needs you
    if (!/not "Needs you"/.test(graphs)) fail("GraphsHome may use Needs you filter");
  }
}

{
  const seed = readFileSync(resolve(WEB, "src/opalUi/founderGraphSeed.ts"), "utf8");
  if (!/opal_founder_seed/.test(seed)) fail("isFounderSeedEnabled must gate on opal_founder_seed");
  if (!/VITE_OPAL_FOUNDER_SEED/.test(seed)) warn("VITE_OPAL_FOUNDER_SEED gate missing?");
}

// Default founder seed must not be hard-true
{
  const envFiles = ["apps/opal_web/.env", "apps/opal_web/.env.local", "apps/opal_web/.env.production"];
  for (const e of envFiles) {
    const p = resolve(ROOT, e);
    if (!existsSync(p)) continue;
    const t = readFileSync(p, "utf8");
    if (/VITE_OPAL_FOUNDER_SEED\s*=\s*true/.test(t)) {
      fail(`${e} enables founder seed by default`);
    }
  }
}

// Dated Juniper must not be gradient-only
{
  const dated = readFileSync(resolve(WEB, "src/opalUi/DatedConversationContent.tsx"), "utf8");
  if (!/opal-direct-juniper-618-376/.test(dated)) {
    fail("DatedConversationContent missing Figma Juniper image bind");
  }
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  if (/dated-opal-thumb\s*\{[^}]*linear-gradient/s.test(css) && !/dated-opal-thumb img/.test(css)) {
    fail("dated-opal-thumb still gradient-only without img rules");
  }
}

// Group send must not use outlined border treatment as primary
{
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  const groupSendBlock = css.match(/data-chat-kind="group"\][^{]*\.send-btn\s*\{[^}]+\}/s);
  if (groupSendBlock && /border:\s*1px solid/.test(groupSendBlock[0])) {
    fail("Group send still has visible 1px border chrome");
  }
  if (!/send-glyph-group/.test(css)) fail("Group send glyph styles missing");
}

// .app > * must keep critical exclusions (chained :not(...) :not(...))
{
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  const m = css.match(/\.app\s*>\s*\*(?::not\([^)]+\))+/);
  if (!m) {
    warn(".app > *:not(...) pattern not found — verify manually");
  } else {
    for (const need of ["call-surface", "tabbar", "gpt-header", "composer", "dated-conv"]) {
      if (!m[0].includes(need)) fail(`.app > * exclusions missing ${need}`);
    }
  }
}

// Ledger / brand registry consistency
{
  const brand = readFileSync(resolve(WEB, "src/brand/brand.ts"), "utf8");
  for (const node of forbiddenNodes) {
    if (!brand.includes(`"${node}"`)) warn(`brand.ts missing superseded entry ${node}`);
  }
  if (!brand.includes('directConversation: "618:348"')) fail("brand.ts directConversation authority drift");
  if (!brand.includes('groupConversation: "618:451"')) fail("brand.ts groupConversation authority drift");
}

console.log("=== OPAL AUTHORITY CHECK ===");
if (warnings.length) {
  console.log("WARNINGS:");
  for (const w of warnings) console.log(" -", w);
}
if (failures.length) {
  console.log("FAILURES:");
  for (const f of failures) console.log(" -", f);
  console.log(`\nRED — ${failures.length} failure(s)`);
  process.exit(2);
}
console.log("GREEN — all authority guards passed");
process.exit(0);
