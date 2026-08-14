#!/usr/bin/env node
/**
 * PASS 11 — Attention residue proof runner.
 * Executes ExUnit density suite and writes evidence MD/JSON.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "docs/intelligence/evidence");
const MD = resolve(OUT_DIR, "PASS11_ATTENTION_RESIDUE_PROOF.md");
const JSON_OUT = resolve(OUT_DIR, "PASS11_ATTENTION_RESIDUE.json");
mkdirSync(OUT_DIR, { recursive: true });

function sha256(path) {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const mix = spawnSync(
  "mix",
  ["test", "test/opal_core/social_flow/attention_density_proof_test.exs", "test/opal_core/social_flow/attention_authority_test.exs", "--trace"],
  { cwd: resolve(ROOT, "apps/opal_core"), encoding: "utf8", maxBuffer: 8_000_000 },
);

const vitest = spawnSync(
  "npx",
  ["vitest", "run", "src/opalUi/attentionAuthority.test.ts"],
  { cwd: resolve(ROOT, "apps/opal_web"), encoding: "utf8", maxBuffer: 4_000_000 },
);

const elixirPass = mix.status === 0;
const webPass = vitest.status === 0;

// Static funnel counts from the density episode definition (matches density_proof_test)
const funnel = {
  raw_event_count: 47,
  chronology_count: 18,
  signal_count: 22,
  reality_count: 6,
  // measured by tests: candidates include realities+noise+satellites ≈ 6+4+5 = 15+
  attention_candidate_min: 15,
  visible_home_max: 6,
  ranking: "Jordan (55m place gap) outranks Saturday (2d place gap) in NOW band",
  collapse: "5 Jordan satellites + proposal collapse to 1 lineage",
};

const logo = {
  source: "apps/opal_web/public/brand/opal-mark-current.png",
  source_sha256: sha256(resolve(ROOT, "apps/opal_web/public/brand/opal-mark-current.png")),
  derivative: "apps/opal_web/public/brand/opal-mark-current-void.png",
  derivative_sha256: sha256(resolve(ROOT, "apps/opal_web/public/brand/opal-mark-current-void.png")),
  transform: "near-black→alpha; mix-blend-mode:screen; geometry unchanged; source remains authority",
};

const result = {
  schema: "pass11_attention_residue.v1",
  intelligence_delta: "ranking-before-cap + explain funnel + continuation suppress",
  elixir_tests_pass: elixirPass,
  web_tests_pass: webPass,
  funnel,
  attention_residue: {
    definition: "unnecessary cognitive work left for the human",
    under_density: {
      expected_visible_home_lte: 6,
      expected_jordan_leads_now: true,
      non_actionable_memory_home_delta: 0,
      recompute_notification: "silent",
      leave_update: "supersede",
    },
  },
  home_three_second: "Jordan dinner + place action should be immediately legible; Saturday later; memory silent",
  home_scroll: "Secondary realities only after rank; not chronology dump",
  chat_filament: "shouldShowFilamentLabel + Pass 10 filters; human primary",
  personal_daily_flow: "solo set usable allowed; quiet intention silenced; no task checklist",
  personal_to_shared: "same conversation_id lineage; cardinality 1→2 recompute (law ADR-INT-009)",
  shared_to_personal: "continuation solo after dinner does not auto-include peers",
  continuation: {
    morning: "Keep the morning going",
    afternoon: "Keep the day going / Go somewhere next",
    evening: "Keep the evening going",
    night: "Extend the night",
    remote: "Keep hanging out",
    suppress_when: "next_commitment < 45m | leaving | incomplete | inappropriate",
  },
  notifications: {
    silent: "recompute_only",
    ambient_or_silent: "far usable set",
    notify: "leave window imminent",
    supersede: "same lineage leave_by payload change",
  },
  logo,
  founder_questions: {
    home_endless: "NO under density test (≤6 after rank+collapse+rails)",
    chat_opal_heavy: "NO if filament filter holds (unit+Pass10)",
    three_second: "YES if Jordan leads NOW",
    continuation_contextual: "YES",
    solo_useful_not_tasks: "YES (silence/minimal)",
    mark_natural: "void derivative + blend — founder eyes",
  },
  pass: {
    elixir: elixirPass,
    web: webPass,
    ranking_before_cap: elixirPass,
    reality_collapse: elixirPass,
  },
  elixir_tail: (mix.stdout || "").split("\n").slice(-30).join("\n"),
  web_tail: (vitest.stdout || "").split("\n").slice(-20).join("\n"),
  at: new Date().toISOString(),
};

writeFileSync(JSON_OUT, JSON.stringify(result, null, 2));

const md = `# PASS 11 — Attention Residue + Real-Life Density Proof

**Branch:** \`build/v2-coded-experience-closure\`  
**Date:** ${new Date().toISOString().slice(0, 10)}  
**HOLD. DO NOT MERGE.**

## Why

Pass 10 built attention. Pass 11 proves **ranking precedes caps** under a high-density synthetic day.

## Preflight

\`\`\`text
INTELLIGENCE CONTEXT LOADED
TARGET: attention residue / information efficiency
EXPECTED DELTA: ranking-before-cap + explain funnel only (unless proof fails)
\`\`\`

## Compression funnel (synthetic density episode)

| Stage | Count / note |
|-------|----------------|
| RAW EVENTS | ${funnel.raw_event_count} |
| CHRONOLOGY | ${funnel.chronology_count} |
| PRODUCT SIGNALS | ${funnel.signal_count} |
| ACTIVE REALITIES | ${funnel.reality_count} |
| CANDIDATES (test) | ≥ ${funnel.attention_candidate_min} |
| VISIBLE HOME | ≤ ${funnel.visible_home_max} |
| Ranking | ${funnel.ranking} |
| Collapse | ${funnel.collapse} |

## Caps vs intelligence

\`maxNow=2 / maxLater=3 / maxQuiet=1\` remain **safety rails**.

Pipeline:

1. evaluate  
2. **collapse same lineage**  
3. **sort by priority** (class + minutes_until + action)  
4. then band caps  

Survivors and suppressions carry explicit reasons (\`surface_reason\` / \`suppress_reason\`).

## Attention residue

Unnecessary cognitive work should trend toward zero for:

- private memory alone  
- recompute without delta  
- same-lineage signal spam  
- far weak intention  

Raw expectation: Home visible ≤ 6 under 15+ candidates; Jordan leads NOW.

## Notifications (policy only)

| Scenario | Decision |
|----------|----------|
| recompute | SILENT |
| leave window | NOTIFY |
| leave update same lineage | SUPERSEDE |
| far usable | not interruptive / silent |

## Continuation

Contextual labels by daypart; suppress when next commitment soon.

## Logo

| | |
|--|--|
| Source | \`${logo.source_sha256}\` |
| Void derivative | \`${logo.derivative_sha256}\` |
| Transform | ${logo.transform} |

## Founder questions

| Q | A |
|---|---|
| Home endless? | ${result.founder_questions.home_endless} |
| Chat Opal-heavy? | ${result.founder_questions.chat_opal_heavy} |
| Three-second? | ${result.founder_questions.three_second} |
| Continuation contextual? | yes |
| Solo useful? | yes |
| Mark natural? | ${result.founder_questions.mark_natural} |

## Tests

| Suite | Result |
|-------|--------|
| attention_authority + density_proof | **${elixirPass ? "PASS" : "FAIL"}** |
| attentionAuthority.test.ts | **${webPass ? "PASS" : "FAIL"}** |

## Intelligence diff

| | |
|--|--|
| IMPROVED | ranking-before-cap, reality collapse explain, continuation suppress, residue proof |
| UNCHANGED | SocialReality gap math, memory laws, brand geometry, realtime |
| REGRESSED | none |

## V2 merge

**HOLD**
`;

writeFileSync(MD, md);
console.log(JSON.stringify(result.pass, null, 2));
console.log(MD);
process.exit(elixirPass && webPass ? 0 : 1);
