/**
 * Repair #18 — Mistake-Pattern Catalog ENFORCEMENT TEETH (web side).
 *
 * Catalog: shots/repair18/MISTAKE_PATTERN_CATALOG.md §4.1 — pattern rules
 * are machine-enforced, not remembered. A fingerprint hit fails here at
 * the same level as any other test failure. Template: the R13 gyroscope
 * gate (registered-reader exact-set) + w4LayoutContract.test.ts (static
 * audit shape).
 *
 * WHAT IS COVERED, EXACTLY:
 *  - MP-2 (fixture-painted surfaces): seed DATA values may be imported
 *    only by the files named in the migration baseline below. Type-only
 *    imports carry no data and are exempt; gate functions
 *    (isFounderSeedEnabled etc.) are the seed MODE switch, not data, and
 *    are exempt — importing the gate is how a surface lawfully asks.
 *    Any NEW file importing seed data fails, and a baseline file that
 *    stops importing seed data must be pruned from the baseline in the
 *    same change (the baseline is an exact set, both directions).
 *  - MP-1 (scripted/local responder): the R17 responder symbols and any
 *    scripted-responder module name are banned from all non-test source
 *    (comments stripped first — the historical mentions live in
 *    comments documenting the deletion, never in code).
 *  - MP-3 (per-surface state derivation, C2 shell): the presentational
 *    C2 surfaces render projections and may not (a) import the shell
 *    adapter's state-derivation functions, (b) import plan-state READ
 *    functions from the product client, or (c) re-implement the
 *    status->family map — that map exists exactly once, in shellData.ts.
 *    NOT covered: action/write calls from a surface (e.g. C2Home's
 *    publish calls) — those are commands, not state derivation; and
 *    legacy (non-C2) surfaces, whose per-surface derivation is counted
 *    by scripts/pattern_posture.mjs but not gated here yet.
 *
 * The baseline is the MIGRATION LEDGER for MP-2 on the web: 9 files at
 * branch base 8908aa14. It must only ever shrink. Shrinking requires
 * editing this file in the same commit as the migration — a founder-
 * visible event per catalog §4.4, never a silent edit.
 *
 * TEETH-2 (2026-10-18, muse/r18-teeth2) — repairs per the red-team
 * report (coordination/repair18/redteam-report.md, FIX-1..FIX-12).
 * Bounds are stated where a class cannot be machine-closed; a bound
 * stated here is mirrored in the catalog §5 ledger (a hope that is not
 * labeled is itself a violation, §4.1):
 *  - FIX-1: dynamic import() and export...from re-exports of seed
 *    modules are seed-data flows, counted exactly like static imports.
 *  - FIX-8: the MP-2 baseline is per-SITE (file -> the exact sorted set
 *    of seed exports it pulls, per seed module). Growth inside a
 *    baselined file (red-team A9) now fails.
 *  - FIX-3: the seed-module registry is discovery-based: any non-test
 *    source file whose path names it seed/fixture/demo/mock (or that
 *    lives under __fixtures__/ or __mocks__/) must be registered in
 *    SEED_MODULES or the named non-data allowlist, or this file fails.
 *    The walk and the module resolver cover .ts/.tsx/.js/.jsx/.mts and
 *    directory index.* modules (red-team A3/A5).
 *  - FIX-4 (PARTIAL, bound stated): inline "seed-*" id literals are a
 *    gated per-file site count (exact map below). Inline people/data
 *    copied with NON-"seed-*" ids (red-team A4) is not statically
 *    decidable and remains a LABELED HOPE — its closure is behavioral
 *    (seed-off rendered captures), named GAP MP-2-INLINE in §5.
 *  - FIX-5 (PARTIAL, bound stated): responder filename families are
 *    extended, and a service-free module holding a Record<string,
 *    string> table with >=2 sentence-like reply values is a responder
 *    shape hit. A renamed responder WITHOUT that shape (inline
 *    conditionals, arrays, a service-importing file) remains a LABELED
 *    HOPE — symbol lists cannot catch renames; the durable closure is
 *    real-path acceptance. Catalog §5 labels MP-1 PARTIAL.
 *  - FIX-7: MP-3's protected set is the whole c2/ directory minus a
 *    named adapter/host REGISTRY (exact set below). Every other c2
 *    file is presentational and takes the reader/derivation bans, and
 *    a flat object literal keyed by >=2 raw plan statuses with >=2
 *    family values is a duplicate status->family map wherever it sits
 *    (red-team A7/A8). BOUND: arithmetic derivation from props with no
 *    status-keyed literal remains behavioral-only (labeled in §5).
 *  - FIX-12: MP-11 — the canon indicator hexes are read from the
 *    single token source (theme/planStateColors.ts PLAN_STATE_HEX) and
 *    may appear in code only there or in the named decorative-legacy
 *    allowlist (exact set; those files are MP-11 migration items).
 *    BOUND: the "past" white (#FFFFFF) is excluded — it is the generic
 *    ink/background value and cannot be fingerprinted honestly; CSS
 *    files are outside this walk.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "..");

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mts"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (SOURCE_EXTS.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const isTestFile = (rel: string) => /\.test\.(ts|tsx|js|jsx)$/.test(rel);
const relOf = (abs: string) => relative(SRC, abs).split("\\").join("/");

/** All non-test source files, repo-relative to src/. */
const sourceFiles = walk(SRC).filter((f) => !isTestFile(relOf(f)));
const readSrc = (rel: string) => readFileSync(join(SRC, rel), "utf8");

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// ---------------------------------------------------------------- MP-2 ---

/** Seed DATA modules and the data exports that paint fixtures. */
const SEED_DATA_EXPORTS: Record<string, string[]> = {
  "opalUi/founderGraphSeed.ts": [
    "FOUNDER_HOME_FEED",
    "FOUNDER_LIVE_FEED",
    "FOUNDER_STORIES",
    "FOUNDER_PEOPLE",
    "FOUNDER_PEOPLE_PULSE",
    "HOME_GRAPH_TIMELINE_COLORS",
    "HOME_ICONS",
    "founderWhoPeople",
  ],
  "opalUi/founderChatsPlanPills.ts": [
    "FOUNDER_CHATS_PLAN_PILL_ROWS",
    "FOUNDER_PEER_AVATAR_BY_NAME",
    "FOUNDER_PHONE_CHAT_ROWS_MIN",
    "remapFounderChatRowsToLive",
    "overlayFounderSeedNamesOnChats",
    "founderSeedDisplayNameForId",
    "resolveFounderPeerAvatarSrc",
  ],
  "opalUi/callsContinuitySeed.ts": [
    "FOUNDER_CALLS_CONTINUITY_ROWS",
    "FORBIDDEN_PROVIDER_CALL_ROW_IDS",
    "founderGraphingEnabledCallRows",
  ],
  "opalUi/mexicoCityCanvasSeed.ts": [
    "MEXICO_CITY_CANVAS_PEOPLE",
    "buildMexicoCityCanvasSeed",
  ],
  "opalUi/alexTripMemories.ts": ["ALEX_MEXICO_TRIP_MEMORIES"],
  "opalUi/GraphsTemporalTimeline.tsx": ["SEED_TIMELINE_ITEMS"],
};

const SEED_MODULES = new Set(Object.keys(SEED_DATA_EXPORTS));

/**
 * MP-2 MIGRATION BASELINE, per SITE (FIX-8): file -> sorted list of
 * "<seed module>: <sorted seed export names>" entries covering static
 * imports, dynamic import()s, and re-exports. Exact in both directions
 * — a new file, a new export pulled into a baselined file, a new flow
 * kind, or a removed site all fail until this map is pruned in the
 * same commit (founder-visible, §4.4). Shrink-only.
 */
const MP2_BASELINE_SITES: Record<string, string[]> = {
  "OpalApp.tsx": [
    "opalUi/alexTripMemories.ts: ALEX_MEXICO_TRIP_MEMORIES",
    "opalUi/callsContinuitySeed.ts: FOUNDER_CALLS_CONTINUITY_ROWS",
    "opalUi/founderChatsPlanPills.ts: FOUNDER_CHATS_PLAN_PILL_ROWS, founderSeedDisplayNameForId, overlayFounderSeedNamesOnChats, resolveFounderPeerAvatarSrc",
    "opalUi/founderGraphSeed.ts: FOUNDER_HOME_FEED, FOUNDER_LIVE_FEED",
  ],
  "opalUi/GraphDetailSheet.tsx": [
    "opalUi/founderGraphSeed.ts: FOUNDER_HOME_FEED",
  ],
  "opalUi/JourneyAddPeople.tsx": [
    "opalUi/founderGraphSeed.ts: founderWhoPeople",
  ],
  "opalUi/SearchDestination.tsx": [
    "opalUi/founderGraphSeed.ts: FOUNDER_HOME_FEED",
  ],
  "opalUi/TripCanvasView.tsx": [
    "opalUi/mexicoCityCanvasSeed.ts: buildMexicoCityCanvasSeed",
  ],
  "opalUi/graphsHydration.ts": [
    "opalUi/GraphsTemporalTimeline.tsx: SEED_TIMELINE_ITEMS",
    "opalUi/founderGraphSeed.ts: FOUNDER_HOME_FEED",
  ],
  "opalUi/homeHydration.ts": [
    "opalUi/founderGraphSeed.ts: FOUNDER_HOME_FEED, FOUNDER_LIVE_FEED",
  ],
  "opalUi/socialAuthority.ts": [
    "opalUi/founderGraphSeed.ts: FOUNDER_HOME_FEED, FOUNDER_LIVE_FEED, FOUNDER_STORIES",
  ],
};

const MP2_BASELINE = new Set(Object.keys(MP2_BASELINE_SITES));

const IMPORT_RE =
  /import\s+(type\s+)?(?:\{([\s\S]*?)\}|([A-Za-z_$][\w$]*))?\s*(?:from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
const EXPORT_FROM_RE =
  /export\s+(?:\{([\s\S]*?)\}|\*)\s+from\s+["']([^"']+)["']/g;

function resolveSeedTarget(fromRel: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = join(dirname(join(SRC, fromRel)), spec);
  const stripped = base.replace(/\.(ts|tsx|js|jsx|mts)$/, "");
  const candidates = [
    base,
    ...SOURCE_EXTS.map((x) => `${stripped}${x}`),
    ...SOURCE_EXTS.map((x) => join(stripped, `index${x}`)),
  ];
  for (const cand of candidates) {
    const rel = relOf(cand);
    if (SEED_MODULES.has(rel)) return rel;
  }
  return null;
}

const namedExports = (raw: string): string[] =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^type\s+/, "").split(/\s+as\s+/)[0]);

/**
 * Files pulling seed DATA values (not types, not gate functions), via
 * static imports, dynamic import(), or re-exports (FIX-1). Values are
 * per-site entries: "<seed module>: <sorted export names>".
 */
function seedDataImporters(): Map<string, string[]> {
  const hits = new Map<string, string[]>();
  const add = (rel: string, entry: string) =>
    hits.set(rel, [...(hits.get(rel) ?? []), entry]);
  for (const abs of sourceFiles) {
    const rel = relOf(abs);
    if (SEED_MODULES.has(rel)) continue;
    const src = readFileSync(abs, "utf8");
    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      if (m[1]) continue; // import type — no data flows
      const target = resolveSeedTarget(rel, m[4]);
      if (!target) continue;
      if (m[3] || m[2] === undefined) {
        // default / namespace / side-effect import of a seed module:
        // no way to prove it is data-free, so it counts as a data import.
        add(rel, `${target}: <non-named import>`);
        continue;
      }
      const data = namedExports(m[2])
        .filter((n) => SEED_DATA_EXPORTS[target].includes(n))
        .sort();
      if (data.length) add(rel, `${target}: ${data.join(", ")}`);
    }
    DYNAMIC_IMPORT_RE.lastIndex = 0;
    while ((m = DYNAMIC_IMPORT_RE.exec(src)) !== null) {
      const target = resolveSeedTarget(rel, m[1]);
      if (target) add(rel, `${target}: <dynamic import>`);
    }
    EXPORT_FROM_RE.lastIndex = 0;
    while ((m = EXPORT_FROM_RE.exec(src)) !== null) {
      const target = resolveSeedTarget(rel, m[2]);
      if (!target) continue;
      if (m[1] === undefined) {
        add(rel, `${target}: <export *>`);
        continue;
      }
      const data = namedExports(m[1])
        .filter((n) => SEED_DATA_EXPORTS[target].includes(n))
        .sort();
      if (data.length) add(rel, `${target}: ${data.join(", ")} (re-export)`);
    }
  }
  for (const [rel, entries] of hits) hits.set(rel, [...new Set(entries)].sort());
  return hits;
}

describe("MP-2 (web): seed data flows only into the named migration baseline", () => {
  it("the seed data modules themselves exist (audit target is real)", () => {
    for (const mod of SEED_MODULES) {
      expect(existsSync(join(SRC, mod)), mod).toBe(true);
    }
  });

  it("seed-data import SITES are EXACTLY the baseline — growth inside a baselined file fails (FIX-8)", () => {
    const hits = seedDataImporters();
    const found: Record<string, string[]> = {};
    for (const [rel, entries] of [...hits.entries()].sort()) found[rel] = entries;
    expect(
      found,
      `MP-2 seed-data import sites changed.\nFound:\n${Object.entries(found)
        .map(([f, what]) => `  - ${f} -> ${what.join(" | ")}`)
        .join("\n")}\nA new importer or a new seed export in an existing ` +
        `importer is a fixture-painted surface (MP-2). A removed site ` +
        `means the migration advanced — prune it from MP2_BASELINE_SITES ` +
        `in this file in the same commit.`,
    ).toEqual(MP2_BASELINE_SITES);
  });

  it("the C2 shell imports NO seed data (SP-2/SP-3 surfaces stay clean)", () => {
    const hits = seedDataImporters();
    const c2 = [...hits.keys()].filter((f) => f.startsWith("c2/"));
    expect(c2).toEqual([]);
  });

  it("every seed/fixture/demo/mock-named module is registered (FIX-3 discovery registry)", () => {
    // Non-data seed-like modules that are lawfully unregistered would
    // be named here; today there are none — a new fixture module can
    // never be silently invisible to the seed scan again (A3/A5).
    const NON_DATA_SEEDLIKE_ALLOWLIST = new Set<string>([]);
    const unregistered = sourceFiles
      .map(relOf)
      .filter(
        (rel) =>
          (/(seed|fixture|demo|mock)/i.test(rel) ||
            rel.includes("__fixtures__/") ||
            rel.includes("__mocks__/")) &&
          !SEED_MODULES.has(rel) &&
          !NON_DATA_SEEDLIKE_ALLOWLIST.has(rel),
      );
    expect(
      unregistered,
      "MP-2: a seed/fixture/demo/mock-named module exists that the seed " +
        "registry has never heard of. Register it in SEED_DATA_EXPORTS " +
        "(if it carries seed data) or in NON_DATA_SEEDLIKE_ALLOWLIST " +
        "(if it provably carries none) — in this file, visibly.",
    ).toEqual([]);
  });

  it('inline "seed-*" id literals match the gated per-file site counts exactly (FIX-4 step 1)', () => {
    // Baseline at teeth-2 (sites = literal occurrences in non-seed
    // modules). Exact in both directions; shrink-only like every
    // baseline here. BOUND: inline data with non-"seed-*" ids is not
    // statically decidable — LABELED HOPE, GAP MP-2-INLINE (catalog §5).
    const INLINE_SEED_ID_BASELINE: Record<string, number> = {
      "OpalApp.tsx": 23,
      "opalUi/GraphDetailSheet.tsx": 5,
      "opalUi/SearchDestination.tsx": 3,
      "opalUi/TripCanvasView.tsx": 1,
      "opalUi/graphAuthorityChrome.ts": 5,
      "opalUi/graphCalendaring.ts": 9,
      "opalUi/graphsHydration.ts": 4,
      "opalUi/homeHydration.ts": 12,
    };
    const found: Record<string, number> = {};
    for (const abs of sourceFiles) {
      const rel = relOf(abs);
      if (SEED_MODULES.has(rel)) continue;
      const n = (readFileSync(abs, "utf8").match(/["']seed-[a-z0-9-]+["']/g) ?? [])
        .length;
      if (n > 0) found[rel] = n;
    }
    expect(
      found,
      'MP-2: inline "seed-*" id literal sites changed — a new file or ' +
        "new literals are inline fixture data (MP-2); a drop means the " +
        "migration advanced, prune INLINE_SEED_ID_BASELINE in this file.",
    ).toEqual(INLINE_SEED_ID_BASELINE);
  });
});

// ---------------------------------------------------------------- MP-1 ---

/** R17 responder symbols — banned from code (comments stripped). */
const RESPONDER_SYMBOLS = [
  "interpretSeedThreadReply",
  "applySeedThreadIntelligence",
  "isSeedDemoChatTarget",
  "seedChatKeyFrom",
  "seedChatIdForPersonName",
  "seedPeerAttribution",
  "SeedSimulatedBanner",
  "resolveFounderSeedThread",
  "founderSeedThreadMessages",
  "founderSeedConversationIdForName",
  "collectSeedLocalExtras",
  "planFromLocalConfirm",
] as const;

/**
 * FIX-5 responder SHAPE (PARTIAL): a service-free module whose
 * Record<string, string> table holds >=2 sentence-like values is a
 * canned-reply table shape. Files importing the product client / an
 * api module, or calling fetch, are exempt — they can reach the real
 * answering path. BOUND (labeled in §5): a renamed responder without
 * this shape is not statically decidable.
 */
function responderShapeFiles(): string[] {
  const offenders: string[] = [];
  const tableRe =
    /(?:const|let|var)\s+(\w+)\s*:\s*Record<string,\s*string>\s*=\s*\{([^{}]*)\}/g;
  for (const abs of sourceFiles) {
    const rel = relOf(abs);
    const code = stripComments(readFileSync(abs, "utf8"));
    if (/productClient|from\s+["'][^"']*\/api\/|fetch\s*\(/.test(code)) continue;
    let m: RegExpExecArray | null;
    tableRe.lastIndex = 0;
    while ((m = tableRe.exec(code)) !== null) {
      const values = [
        ...m[2].matchAll(/(?:["']?[A-Za-z0-9_]+["']?)\s*:\s*"([^"\n]+)"/g),
      ].map((x) => x[1]);
      const sentences = values.filter((v) => v.trim().split(/\s+/).length >= 4);
      if (sentences.length >= 2) offenders.push(`${rel}: table ${m[1]}`);
    }
  }
  return offenders;
}

describe("MP-1 (web): no local scripted responder is reachable from product code", () => {
  it("no scripted-responder module file exists under src/", () => {
    const banned = sourceFiles
      .map(relOf)
      .filter((rel) =>
        /(seedthreadintelligence|scriptedresponder|cannedrepl|localreply|replyengine|scriptedreply|offlinereply)/i.test(
          rel,
        ),
      );
    expect(banned).toEqual([]);
  });

  it("no non-test source file references a responder symbol in code", () => {
    const offenders: string[] = [];
    for (const abs of sourceFiles) {
      const code = stripComments(readFileSync(abs, "utf8"));
      for (const sym of RESPONDER_SYMBOLS) {
        if (code.includes(sym)) offenders.push(`${relOf(abs)}: ${sym}`);
      }
    }
    expect(
      offenders,
      "A scripted responder symbol re-entered product code (MP-1 -> SP-1: " +
        "every user-visible answer is composed by the real service).",
    ).toEqual([]);
  });

  it("no service-free module holds a canned-reply table shape (FIX-5, PARTIAL)", () => {
    expect(
      responderShapeFiles(),
      "MP-1: a module with no service/client import holds a " +
        "Record<string, string> table of sentence-like values — the " +
        "canned-reply shape. Answers are composed by the real service " +
        "(SP-1); if this is a legitimate presentation table, its file " +
        "must reach the service layer or be named in the catalog §5 " +
        "bound for FIX-5.",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------- MP-3 ---

/**
 * FIX-7: the C2 adapter/host REGISTRY — the only c2/ files allowed to
 * derive state or call plan-state readers. Exact set: adding a file
 * here is a founder-visible edit in this file (§4.4). Every other
 * non-test file under c2/ is presentational and takes the bans below.
 *  - shellData.ts / shellDataBridge.ts: the shell adapters (the one
 *    derivation site + its bridge).
 *  - projections.ts: projection TYPES only.
 *  - C1ShellHosts.tsx: host that wires adapters to surfaces.
 *  - C2Shell.tsx: shell composition/host (routes, no derivation).
 */
const C2_ADAPTER_REGISTRY = new Set([
  "c2/shell/shellData.ts",
  "c2/shell/shellDataBridge.ts",
  "c2/shell/projections.ts",
  "c2/shell/C1ShellHosts.tsx",
  "c2/shell/C2Shell.tsx",
]);

/** Presentational C2 surfaces named by the original teeth (kept). */
const C2_PRESENTATIONAL = [
  "c2/shell/C2Home.tsx",
  "c2/shell/C2Graphs.tsx",
  "c2/shell/C2You.tsx",
  "c2/shell/C2CenterOpening.tsx",
  "c2/shell/bits.tsx",
  "c2/PlanCardC2.tsx",
] as const;

/** Plan-state READ functions a surface must never call to compute state. */
const PLAN_STATE_READERS = [
  "listOpalPlans",
  "listConversations",
  "listMessages",
  "listMemoryFacts",
  "listTemporaryStories",
  "loadProfile",
  "getHomeTimezone",
  "getMessagingPreferences",
  "getAssistPreference",
  "getGoogleCalendarStatus",
] as const;

/** The shell adapter's derivation functions — surfaces render, not derive. */
const ADAPTER_DERIVATIONS = ["cardFromPlan", "familyOfStatus"] as const;

const RAW_PLAN_STATUSES = new Set([
  "agreed",
  "locked",
  "proposed",
  "confirmed",
  "live",
  "done",
  "cancelled",
]);
const FAMILY_VALUES = new Set(["ready", "forming", "happening", "action", "past"]);

/**
 * Flat object literals keyed by >=2 raw plan statuses whose values are
 * >=2 state families — a duplicate status->family map under ANY name
 * (FIX-7, kills red-team A7). BOUND: only flat literals are scanned;
 * derivation built from comparisons/arithmetic with no status-keyed
 * literal remains behavioral-only (labeled in §5).
 */
function statusFamilyMapHits(src: string): string[] {
  const hits: string[] = [];
  for (const chunk of src.match(/\{[^{}]*\}/g) ?? []) {
    const entries = [
      ...chunk.matchAll(/["']?([a-z_]+)["']?\s*:\s*"([a-z]+)"/g),
    ].map((x) => [x[1], x[2]] as const);
    const rawKeys = new Set(entries.filter(([k]) => RAW_PLAN_STATUSES.has(k)).map(([k]) => k));
    const famVals = new Set(entries.filter(([, v]) => FAMILY_VALUES.has(v)).map(([, v]) => v));
    if (rawKeys.size >= 2 && famVals.size >= 2) {
      hits.push([...rawKeys].sort().join(","));
    }
  }
  return hits;
}

function c2PresentationalFiles(): string[] {
  return sourceFiles
    .map(relOf)
    .filter((r) => r.startsWith("c2/") && !C2_ADAPTER_REGISTRY.has(r));
}

describe("MP-3 (web): C2 shell surfaces consume projections, never re-derive plan state", () => {
  it("every projection-typed C2 surface names its Projection type", () => {
    // The four data surfaces are typed by a named Projection. bits.tsx and
    // PlanCardC2.tsx are leaf components typed by projection-derived
    // inputs (AvatarRef / PlanCardC2Input) and are covered by the
    // reader/derivation bans below, not by this assertion.
    for (const rel of [
      "c2/shell/C2Home.tsx",
      "c2/shell/C2Graphs.tsx",
      "c2/shell/C2You.tsx",
      "c2/shell/C2CenterOpening.tsx",
    ]) {
      expect(readSrc(rel), rel).toMatch(/Projection/);
    }
  });

  it("the adapter/host registry is exactly the named set, and its files exist", () => {
    for (const rel of C2_ADAPTER_REGISTRY) {
      expect(existsSync(join(SRC, rel)), rel).toBe(true);
    }
    expect([...C2_ADAPTER_REGISTRY].sort()).toEqual([
      "c2/shell/C1ShellHosts.tsx",
      "c2/shell/C2Shell.tsx",
      "c2/shell/projections.ts",
      "c2/shell/shellData.ts",
      "c2/shell/shellDataBridge.ts",
    ]);
  });

  it("no presentational C2 surface imports a plan-state reader or an adapter derivation", () => {
    const offenders: string[] = [];
    for (const rel of c2PresentationalFiles()) {
      const src = readSrc(rel);
      let m: RegExpExecArray | null;
      IMPORT_RE.lastIndex = 0;
      while ((m = IMPORT_RE.exec(src)) !== null) {
        if (m[1]) continue; // type-only
        const names = (m[2] ?? "")
          .split(",")
          .map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0])
          .filter(Boolean);
        for (const n of names) {
          if ((PLAN_STATE_READERS as readonly string[]).includes(n)) {
            offenders.push(`${rel}: imports reader ${n} from ${m[4]}`);
          }
          if ((ADAPTER_DERIVATIONS as readonly string[]).includes(n)) {
            offenders.push(`${rel}: imports derivation ${n} from ${m[4]}`);
          }
        }
      }
    }
    expect(
      offenders,
      "MP-3: a C2 surface computed plan state instead of rendering its " +
        "projection (SP-3: one projection per surface, built in shellData.ts). " +
        "Derivation belongs in the registry files only — registering a new " +
        "adapter is a visible edit to C2_ADAPTER_REGISTRY in this file.",
    ).toEqual([]);
  });

  it("no C2 file outside the shell adapter holds a duplicate status->family map, under any name (FIX-7)", () => {
    const offenders: string[] = [];
    for (const rel of sourceFiles.map(relOf).filter((r) => r.startsWith("c2/"))) {
      if (rel === "c2/shell/shellData.ts") continue;
      for (const keys of statusFamilyMapHits(readSrc(rel))) {
        offenders.push(`${rel}: status->family literal over {${keys}}`);
      }
    }
    expect(
      offenders,
      "MP-3: a second status->family map exists outside shellData.ts — " +
        "renaming the map does not move the derivation (SP-3).",
    ).toEqual([]);
  });

  it("the status->family map exists exactly once, in the shell adapter", () => {
    const c2Files = sourceFiles.map(relOf).filter((r) => r.startsWith("c2/"));
    const withMap = c2Files.filter((rel) =>
      readSrc(rel).includes("FAMILY_BY_STATUS"),
    );
    expect(withMap).toEqual(["c2/shell/shellData.ts"]);
  });
});

// --------------------------------------------------------------- MP-11 ---

describe("MP-11 (web): canon indicator hexes live only in the token source + named legacy allowlist (FIX-12)", () => {
  it("canon hexes are read from the single token source, and usage outside it is EXACTLY the allowlist", () => {
    const tokenRel = "theme/planStateColors.ts";
    const tokenSrc = readSrc(tokenRel);
    const hexBlock = tokenSrc.match(/PLAN_STATE_HEX\s*=\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    // The "past" white is excluded: #FFFFFF is the generic ink/background
    // value across the app and cannot be fingerprinted honestly (bound
    // stated in this file's header and catalog §5).
    const canon = [
      ...new Set(
        [...hexBlock.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) =>
          x[0].toUpperCase(),
        ),
      ),
    ].filter((h) => h !== "#FFFFFF");
    expect(canon.length).toBeGreaterThanOrEqual(4);

    // Decorative-legacy allowlist: pre-existing canon-hex uses outside
    // the token source, inventoried at teeth-2. Each is an MP-11
    // MIGRATION item (indicator hues used as decoration/branding), not
    // an approval — the set is exact and shrink-only, and any NEW file
    // using a canon hex fails until it is migrated or named here in a
    // founder-visible edit (§4.4).
    const MP11_ALLOWLIST = new Set([
      "brand/brand.ts",
      // "main.tsx" RETIRED by harmony2: its one canon-hex use (the
      // runtime error screen's #00e5ff primary button - happening
      // spent as a generic fill) was replaced with the sampled
      // brand accent #7d4dce, so the file no longer uses a canon
      // hex outside the token source and leaves the allowlist.
      "opalUi/GraphConvoyPanel.tsx",
      // "opalUi/GraphSocialHome.tsx", "opalUi/OpalLivingCharacter.tsx"
      // and "opalUi/founderGraphSeed.ts" RETIRED by R19 W27 (AT-09):
      // the graph avatar/timeline tone cycle and the seed palette
      // now cycle the non-canon entity (person-tint) palette, the
      // gprof labels wear brand violet/pearl, the legacy --accent is
      // brand violet, and the living character paints the orb's
      // sampled fire - so none of the three files uses a canon state
      // hex outside the token source any more.
      "opalUi/callsContinuitySeed.ts",
      "opalUi/founderChatsPlanPills.ts",
      "opalUi/graphConvoyEta.ts",
      "opalUi/graphSurfaceInterop.ts",
      "theme/signalGrammar.ts",
      "theme/technicolorProduction.ts",
    ]);
    const found = new Set<string>();
    for (const abs of sourceFiles) {
      const rel = relOf(abs);
      if (rel === tokenRel) continue;
      const code = stripComments(readFileSync(abs, "utf8")).toUpperCase();
      if (canon.some((h) => code.includes(h))) found.add(rel);
    }
    expect(
      [...found].sort(),
      `MP-11: canon indicator hexes (${canon.join(", ")}) used outside ` +
        `${tokenRel}. Found: ${[...found].sort().join(", ")}. A canon hue ` +
        `is a state meaning, never decoration (SP-11) — use the token, or ` +
        `name the legacy use in MP11_ALLOWLIST in this file visibly.`,
    ).toEqual([...MP11_ALLOWLIST].sort());
  });
});
