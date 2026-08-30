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
  if (!/figma_page_dated_authority:\s*"618:2"/.test(auth)) fail("Dated authority page must be 618:2");
  if (!/center_opal_rest:\s*"645:3"|authority:\s*"645:3"/.test(auth)) {
    fail("Center Opal authority must be 645:3");
  }
  if (!/x:\s*136/.test(auth) || !/w:\s*86/.test(auth)) {
    fail("Center Opal dock-relative geometry must be 136,7 · 86×64");
  }
  if (!/"568:2"/.test(auth)) fail("568:2 must be listed as forbidden/legacy");
}

for (const f of [
  "docs/authority/FIGMA_RUNTIME_LEDGER.yaml",
  "docs/authority/SUPERSEDED_PRESENTATIONS.yaml",
  "docs/authority/ASSET_PROVENANCE.yaml",
  "docs/authority/CSS_CONVERGENCE_AUDIT.yaml",
  "docs/authority/WAVE_A_FOUNDER_ACCEPTED.md",
  "docs/authority/WAVE_B_EXACT_AUTHORITY.md",
  "docs/authority/ACTION_DESTINATION_LEDGER.yaml",
  "docs/product/OPAL_PRODUCT_LOOP.md",
  "docs/product/FUTURE_SIGNALS_NOT_CURRENT_AUTHORITY.md",
  "docs/dev/FOUNDER_AUTH_FIXTURE.md",
]) {
  if (!existsSync(resolve(ROOT, f))) fail(`Missing ${f}`);
}

// --- Wave A frozen + Wave B ledger routes ---
{
  const waveA = read("docs/authority/WAVE_A_FOUNDER_ACCEPTED.md");
  if (!/WAVE_A_FOUNDER_ACCEPTED:\s*YES/.test(waveA) && !/WAVE_A_FOUNDER_ACCEPTED = YES/.test(waveA)) {
    fail("WAVE_A_FOUNDER_ACCEPTED.md must record WAVE_A_FOUNDER_ACCEPTED = YES");
  }
  if (!/DO_NOT_REOPEN_WITHOUT_PROVEN_REGRESSION/.test(waveA)) {
    fail("WAVE_A_FOUNDER_ACCEPTED.md must include DO_NOT_REOPEN_WITHOUT_PROVEN_REGRESSION");
  }
  const ledger = read("docs/authority/ACTION_DESTINATION_LEDGER.yaml");
  for (const route of [
    'destination_node: "863:2"',
    'destination_node: "618:2299"',
    'destination_node: "863:284"',
    'destination_node: "863:394"',
    'destination_node: "863:88"',
    'destination_node: "863:195"',
    'destination_node: "618:902"',
    "OPEN_LIVE_ROUTES_CURRENT_FULL_LIVE",
    "CHATS_NEW_ROUTES_SEARCH_PEOPLE_MODE",
    "GRAPH_CREATE_ROUTES_863_284_863_338",
    "GLOBAL_OPAL_FULL_SCREEN_NOT_MODAL",
  ]) {
    if (!ledger.includes(route)) fail(`ACTION_DESTINATION_LEDGER missing required route/token: ${route}`);
  }
  const authManifest = read(authPath);
  if (!/wave_a_frozen:\s*true/.test(authManifest) && !/wave_a_founder_accepted:\s*true/.test(authManifest)) {
    fail("OPAL_CURRENT_AUTHORITY must mark wave_a_frozen or wave_a_founder_accepted true");
  }
  if (!/full_live:\s*"863:2"/.test(authManifest)) fail("OPAL_CURRENT_AUTHORITY destinations.full_live must be 863:2");
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
  if (!brand.includes('centerOpalRest: "645:3"')) fail("brand.ts centerOpalRest must be 645:3");
  if (!brand.includes('datedAuthorityPage: "618:2"')) fail("brand.ts datedAuthorityPage must be 618:2");
  if (!brand.includes('globalOpal: "618:902"')) fail("brand.ts globalOpal must be dated 618:902");
  if (!brand.includes('journey: "618:816"')) fail("brand.ts journey must be dated 618:816");
}

// Center Opal CSS geometry — exact 645:3 wrapper (not obsolete Trio)
{
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  // Prefer the geometry block (must include left:) — skip shared multi-selector rules.
  const blocks = [...css.matchAll(/\.tabbar-option-b \.dock-opal\s*\{[^}]+\}/gs)].map((m) => m[0]);
  const geo = blocks.find((b) => /left:\s*\d+px/.test(b));
  if (!geo) {
    fail("Missing .tabbar-option-b .dock-opal geometry CSS block");
  } else {
    if (!/left:\s*136px/.test(geo)) fail("Center Opal left must be 136px");
    if (!/top:\s*7px/.test(geo)) fail("Center Opal top must be 7px");
    if (!/width:\s*86px/.test(geo)) fail("Center Opal width must be 86px");
    if (!/height:\s*64px/.test(geo)) fail("Center Opal height must be 64px");
    if (/left:\s*146px/.test(geo) || /top:\s*-4px/.test(geo)) {
      fail("Obsolete Trio Center Opal geometry 146/-4 still live");
    }
  }
  const app = readFileSync(resolve(WEB, "src/OpalApp.tsx"), "utf8");
  if (!/dockActiveSlot/.test(app)) fail("OpalApp missing dockActiveSlot route ownership");
  if (!/opalCenterOpalRest645|data-figma-center-opal="645:3"/.test(app)) {
    fail("OpalApp dock must bind exact 645:3 Center Opal asset");
  }
}

// P0-05.4/05.5 — Leave truth slot + Graph open must never auto-activate Journey
{
  const dated = readFileSync(resolve(WEB, "src/opalUi/DatedConversationContent.tsx"), "utf8");
  const app = readFileSync(resolve(WEB, "src/OpalApp.tsx"), "utf8");
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  const detail = readFileSync(resolve(WEB, "src/opalUi/GraphDetailSheet.tsx"), "utf8");
  if (/onOpenJourney/.test(dated) || /dated-opal-leave-action/.test(dated)) {
    fail("DIRECT_LEAVE_TRUTH_SLOT_NOT_NAVIGATION — DatedConversationContent must not wire Leave→Journey");
  }
  // P0-05.7: onOpenJourney on Home Graph is allowed (nav-only). Direct Leave must not wire it.
  if (/Direct Leave →/.test(app) || /onOpenJourney=\{[^}]*Leave/.test(app) || /Leave[\s\S]{0,80}setActiveJourney/.test(app)) {
    fail("DIRECT_LEAVE_TRUTH_SLOT_NOT_NAVIGATION — OpalApp must not open Journey from Direct Leave");
  }
  if (/dated-opal-leave-action/.test(css)) {
    fail("DIRECT_LEAVE_TRUTH_SLOT_NOT_NAVIGATION — Leave button chrome must not exist");
  }
  if (/data-testid=["']graph-enter-journey["']/.test(detail) || /Enter Journey/.test(detail)) {
    fail("GRAPH_DETAIL_ENTER_JOURNEY_CTA — Graph Detail must not expose Enter Journey");
  }
  // P0-05.5 — opening Graph Detail must not POST activate / mutate SharedPlan
  if (/Graph → SharedPlan → Journey \(618:3288\)/.test(app)) {
    fail("GRAPH_OPEN_DOES_NOT_ACTIVATE_JOURNEY — auto SharedPlan note must not exist");
  }
  if (/graphDetailEntrySource !== ["']graphs["']/.test(app) && /activateJourney\(/.test(app)) {
    // Detect the P0-05.4 mount-effect pattern specifically
    if (/graphDetailCardId[\s\S]{0,200}graphDetailEntrySource !== ["']graphs["'][\s\S]{0,800}activateJourney\(/.test(app)) {
      fail("GRAPH_OPEN_DOES_NOT_ACTIVATE_JOURNEY — Graph Detail mount must not call activateJourney");
    }
  }
  if (!/activateJourney/.test(app)) {
    fail("activateJourney client must remain available for already-open Journey refresh");
  }
  if (!/data-testid=["']graph-open-directions["']/.test(detail)) {
    fail("Graph Detail must keep Open directions action");
  }
}

// P0-05.6A — Section 06 / Group Info navigation + Brand V4
{
  const auth = read("docs/authority/OPAL_CURRENT_AUTHORITY.yaml");
  const ledger = read("docs/authority/FIGMA_RUNTIME_LEDGER.yaml");
  const app = readFileSync(resolve(WEB, "src/OpalApp.tsx"), "utf8");
  const youSet = readFileSync(resolve(WEB, "src/opalUi/YouSettingsDestination.tsx"), "utf8");
  const groupInfo = readFileSync(resolve(WEB, "src/opalUi/GroupInfoDestination.tsx"), "utf8");
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  if (!/nested_section_06_settings:\s*you/.test(auth)) {
    fail("OPAL_CURRENT_AUTHORITY must declare nested Section 06 settings You-active");
  }
  if (!/group_info:\s*chats/.test(auth)) {
    fail("OPAL_CURRENT_AUTHORITY must declare Group Info Chats-active");
  }
  if (!/person_profile:\s*home/.test(auth)) {
    fail("OPAL_CURRENT_AUTHORITY must declare Person Profile Home-active");
  }
  if (!/section_06_brand_system:\s*BRAND_V4/.test(auth)) {
    fail("OPAL_CURRENT_AUTHORITY must declare Section 06 Brand V4");
  }
  if (!/profilePerson\) return "home"/.test(app)) {
    fail("OpalApp must keep Person Profile → Home dock");
  }
  if (!/tab === "you"\) return "you"/.test(app)) {
    fail("OpalApp must keep You/settings → You dock");
  }
  if (!/GroupInfoDestination/.test(app) || !/data-nav-active="chats"/.test(groupInfo)) {
    fail("Group Info 618:521 must exist and declare Chats-active");
  }
  if (!/data-nav-active="you"/.test(youSet) || !/data-brand-v4="true"/.test(youSet)) {
    fail("YouSettingsDestination must declare You-active + Brand V4");
  }
  if (!/--you-cyan:\s*#00e5ff/i.test(css) || !/--you-midnight:\s*#050816/i.test(css)) {
    fail("You settings CSS must encode Brand V4 core tokens");
  }
}

// P0-05.7 — founder-approved Graph commitment states (738:2 / 738:35 CURRENT)
{
  const auth = read("docs/authority/OPAL_CURRENT_AUTHORITY.yaml");
  const ledger = read("docs/authority/FIGMA_RUNTIME_LEDGER.yaml");
  const app = readFileSync(resolve(WEB, "src/OpalApp.tsx"), "utf8");
  const home = readFileSync(resolve(WEB, "src/opalUi/GraphSocialHome.tsx"), "utf8");
  const detail = readFileSync(resolve(WEB, "src/opalUi/GraphDetailSheet.tsx"), "utf8");
  const dated = readFileSync(resolve(WEB, "src/opalUi/DatedConversationContent.tsx"), "utf8");
  const client = readFileSync(resolve(WEB, "src/api/productClient.ts"), "utf8");
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  const journeyAuth = readFileSync(
    resolve(ROOT, "apps/opal_core/lib/opal_core/social_flow/journey_authority.ex"),
    "utf8",
  );

  if (!/home_graph_participation:/.test(auth)) fail("OPAL_CURRENT_AUTHORITY missing home_graph_participation");
  if (!/lock_in_commitment:\s*"738:2"/.test(auth)) fail("home_graph_participation.lock_in_commitment must be 738:2");
  if (!/committed_journey_available:\s*"738:35"/.test(auth)) {
    fail("home_graph_participation.committed_journey_available must be 738:35");
  }
  if (!/status:\s*FOUNDER_APPROVED_CURRENT/.test(auth)) {
    fail("home_graph_participation status must be FOUNDER_APPROVED_CURRENT");
  }
  if (!/approved_date:\s*"2026-08-27"/.test(auth)) fail("home_graph_participation approved_date must be 2026-08-27");

  const m738 = ledger.match(/"738:2"[\s\S]{0,400}is_current_authority:\s*(true|false)/);
  if (!m738 || m738[1] !== "true") fail("738:2 must be current authority (is_current_authority: true)");
  const m738b = ledger.match(/"738:35"[\s\S]{0,400}is_current_authority:\s*(true|false)/);
  if (!m738b || m738b[1] !== "true") fail("738:35 must be current authority (is_current_authority: true)");
  if (/FOUNDER_REVIEW_REQUIRED[\s\S]{0,80}738:2|738:2[\s\S]{0,80}FOUNDER_REVIEW_REQUIRED/.test(ledger)) {
    fail("738:2 must not remain FOUNDER_REVIEW_REQUIRED");
  }

  if (!/def accept_going\(/.test(journeyAuth)) fail("JourneyAuthority.accept_going missing");
  if (!/acceptGoing\(/.test(client)) fail("productClient.acceptGoing missing");
  if (!/ensureFounderGraphCommitmentSeed/.test(client) || !/ensureFounderGraphCommitmentSeed/.test(app)) {
    fail("Founder graph commitment seed client+OpalApp wiring missing");
  }
  if (!/onImGoing/.test(home) || !/onImGoing/.test(app)) fail("I'm going wiring missing");
  if (!/onOpenJourney/.test(home) || !/onOpenJourney/.test(app)) fail("Open Journey wiring missing");
  if (!/data-participation-action="im_interested"/.test(home)) fail("I'm interested action marker missing");
  if (!/data-participation-action="im_going"/.test(home)) fail("I'm going action marker missing");
  if (!/#FFC86B|#ffc86b/.test(css)) fail("Alignment Gold #FFC86B missing for I'm going / Going ✓");

  // Soft interest must not call acceptGoing / activateJourney
  if (/onIdGoSoftInterest[\s\S]{0,400}acceptGoing|onIdGoSoftInterest[\s\S]{0,400}activateJourney/.test(app)) {
    fail("INTERESTED_DOES_NOT_ACCEPT_PARTICIPANT — soft interest must not accept/activate");
  }
  // I'm going must not force navigation / activate
  if (/onImGoing[\s\S]{0,800}setActiveJourney|onImGoing[\s\S]{0,800}activateJourney/.test(app)) {
    fail("IM_GOING_DOES_NOT_FORCE_NAV — I'm going must not navigate/activate Journey");
  }
  if (/onImGoing[\s\S]{0,500}respond_option|onImGoing[\s\S]{0,500}accept-all/.test(app)) {
    fail("IM_GOING_DOES_NOT_ACCEPT_ALL");
  }
  // Open Journey must use getJourney (nav), not acceptGoing/activate as mutation path
  if (/onOpenJourney[\s\S]{0,600}acceptGoing\(/.test(app)) {
    fail("OPEN_JOURNEY_IS_NAV_ONLY — must not acceptGoing");
  }
  if (/onOpenJourney[\s\S]{0,600}activateJourney\(/.test(app)) {
    fail("OPEN_JOURNEY_IS_NAV_ONLY — must not activateJourney");
  }
  if (!/onOpenJourney[\s\S]{0,800}getJourney\(/.test(app)) {
    fail("OPEN_JOURNEY_IS_NAV_ONLY — must resolve existing Journey via getJourney");
  }
  if (/data-testid=["']graph-enter-journey["']/.test(detail) || />Enter Journey</.test(detail)) {
    fail("GRAPH_DETAIL_ENTER_JOURNEY_CTA must remain false");
  }
  if (/onOpenJourney/.test(dated)) {
    fail("DIRECT_LEAVE_NOT_NAVIGATION — DatedConversation must not open Journey");
  }
}

// P0-05.8 — First Run Brand V4 + Splash shell + dock stage
{
  const auth = read("docs/authority/OPAL_CURRENT_AUTHORITY.yaml");
  const css = readFileSync(resolve(WEB, "src/styles.css"), "utf8");
  const fr = readFileSync(resolve(WEB, "src/onboarding/FirstRunExperience.tsx"), "utf8");
  const opal = readFileSync(resolve(WEB, "src/opalUi/OpalAmbient.tsx"), "utf8");
  const chats = readFileSync(resolve(WEB, "src/opalUi/ChatsHome.tsx"), "utf8");
  const graphs = readFileSync(resolve(WEB, "src/opalUi/GraphsHome.tsx"), "utf8");

  if (!/phone:\s*"773:27"/.test(auth)) fail("First Run phone authority must be 773:27");
  if (!/verify:\s*"773:52"/.test(auth)) fail("First Run verify authority must be 773:52");
  if (!/profile_setup:\s*"773:80"/.test(auth)) fail("First Run profile authority must be 773:80");
  if (!/find_people:\s*"773:113"/.test(auth)) fail("First Run find_people authority must be 773:113");
  if (!/status:\s*CURRENT_BRAND_V4/.test(auth)) fail("First Run status must be CURRENT_BRAND_V4");

  if (!/data-figma-authority="618:19"/.test(fr)) fail("Splash must bind 618:19");
  if (!/data-figma-authority="773:27"/.test(fr)) fail("Phone must bind 773:27");
  if (!/data-figma-authority="773:52"/.test(fr)) fail("Verify must bind 773:52");
  if (!/data-figma-authority="773:80"/.test(fr)) fail("Profile must bind 773:80");
  if (!/data-figma-authority="773:113"/.test(fr)) fail("Find People must bind 773:113");
  if (!/fr08-add-photo/.test(fr)) fail("PROFILE_ADD_PHOTO_ACTIONABLE — Add photo control missing");
  if (/data-profile-photo="deferred"/.test(fr)) fail("Profile photo must not remain deferred-only");

  if (/max-width:\s*430px/.test(css) && /\.fr-frame\s*\{[^}]*max-width:\s*430px/s.test(css)) {
    fail("First Run .fr-frame must not use 430px max-width card shell");
  }
  if (/app-premember \.fr-s1[\s\S]{0,120}box-shadow:\s*0 0 0 1px/.test(css)) {
    fail("First Run must not use desktop frosted device-card box-shadow");
  }
  if (!/\.app\s*\{[^}]*max-width:\s*390px/s.test(css)) {
    fail("Canonical .app stage must be max-width 390px");
  }
  if (!/data-figma="618:271"|data-figma-authority="618:271"/.test(chats)) {
    fail("Chats must declare 618:271");
  }
  if (!/data-figma="618:674"|data-figma-graphs="618:674"/.test(graphs)) {
    fail("Graphs must declare 618:674");
  }
  if (!/data-figma="618:902"|data-figma-authority="618:902"/.test(opal)) {
    fail("Global Opal must declare visual authority 618:902");
  }
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
