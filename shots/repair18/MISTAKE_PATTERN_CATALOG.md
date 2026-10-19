# Repair #18 — MISTAKE-PATTERN CATALOG + CONTAMINATION AUDIT CHARTER

Founder directive, 2026-10-18 04:35 PDT: "I said a lot — I want to make
sure this isn't connected to old things that cause the same errors we've
been running into. You should be learning from your mistakes by now. By
errors, I mean the same mistakes."

This catalog is the program's memory of HOW it fails. Every recurring
failure from the walks is abstracted into the PATTERN that caused it.
Each pattern carries a FINGERPRINT — how it is detected in code, in
review, and in tests — and the standing check that guards it. The
complaint ledger (shots/repair18/COMPLAINT_LEDGER.md) holds the
instances; this catalog holds the shapes. The wallet map carries the
contamination audit built on this catalog (see §3).

**RECURRENCE RULE (standing):** if a cataloged mistake recurs after its
check exists, the failure is charged to the CHECK, not just the code —
the check gets fixed, and the recurrence is reported to the founder
**by name**. Learning is demonstrated by this catalog shrinking the
space where old mistakes can live, never by assertion.

**MIGRATION RULE (founder correction, 2026-10-18 04:37 PDT —
supersedes any quarantine-as-disposition framing):** "If those are
patterns still in the codebase, how come those aren't being REPAIRED
into new patterns? It is a redesign — in order to ensure accuracy."
Every cataloged mistake-pattern is **repaired into its successor
pattern** across the whole codebase — the redesign IS this
transformation. The audit tracks pattern-level migration: old pattern
→ new pattern → every site inventoried → every site converted →
verification that **zero reachable sites of the old pattern remain**.
Quarantine is permitted only as a temporary in-migration state with
its conversion in the same program, never as a final disposition. A
pattern that genuinely cannot be converted in this program becomes a
**founder-named exception in the delivery**, not a quiet quarantine.
Distinction preserved: back-end MACHINERY is preserved (no gratuitous
rewrites); mistake-PATTERNS are not machinery — they are what the
redesign exists to replace, and the successor patterns are built from
the healthy machinery already present (single-gate transitions,
projections, scoped reads).

---

## 1. The patterns

### MP-1 — A scripted/local layer answers instead of the real back end
- **Instances:** the scripted seed layer that impersonated Chanelle and
  Maya (killed R17); seed-script replies standing in for the Center;
  any dev harness whose answers a surface can mistake for the server's.
- **Fingerprint (code):** response composition outside the request path
  of the real service; seed/demo modules imported by product code;
  canned reply tables reachable from a controller/channel.
  **(review):** "Whose words are these — the server's, computed from
  stored truth, or a script's?" **(test):** the real-path case kills
  the script's signature phrases and still gets a true answer; the
  seed is data, never behavior (R17 W2 law).
- **Standing check:** real_user_path_acceptance cases run against the
  served stack with seed present; banned-signature greps in the API
  suite.

### MP-2 — Fixture-painted surfaces
- **Instances:** founder seed fixtures rendered as live people/places/
  counts (F-04 Live panel, F-05 Calls signal, walk-era graph fixtures);
  splash/marketing illustrations leaking into product surfaces.
- **Fingerprint (code):** literals naming people/places/counts inside
  render paths; `seed`-shaped data imported by non-seed components;
  fallback branches that supply a person/place when data is absent.
  **(review):** "Remove the fixture: does the surface tell the truth
  (empty/honest) or does it invent?" **(test):** seed-off rendered
  captures; classification sweep rows for every painted surface.
- **Standing check:** classification = FALSE wherever found; rendered
  captures run against real session data; the sweep re-runs per pack.

### MP-3 — Per-surface shadow state and re-derivation
- **Instances:** three different invented attendance numbers for one
  plan (F18-01); the front end re-deriving plan state per surface;
  GAP-7's false single-derivation claim; wallet GYRO defects (unscoped
  per-surface reads).
- **Fingerprint (code):** the same fact computed in more than one
  place; a surface reading stores directly instead of its projection;
  status logic duplicated across components. **(review):** "Name the
  ONE projection this surface renders. If it computes, it violates."
  **(test):** cross-surface read-back cases — change state once, read
  it on every surface, require identical truth.
- **Standing check:** interface law (front end renders outputs, never
  re-derives); gyroscope defect register in the wallet map.

### MP-4 — Canned provider output presented as live
- **Instances:** the Deepgram canned transcript (BS-4, deleted); the
  `{:ok, stub_transcript}` return shape (deleted); OpenTable
  query-echo "results" (F-01, retired); FCM false-ready (F-03,
  retired).
- **Fingerprint (code):** a provider module returning `{:ok, ...}` on
  an unconfigured/absent key; default text in provider-shaped payloads;
  "available: true" registry entries nothing can route to.
  **(review):** "Unkeyed, what does this return? If the answer is
  anything but disabled/error, it is MP-4." **(test):** unkeyed-path
  tests assert the honest tuple; keyed-path proof is a live exercise,
  never a stub.
- **Standing check:** BS honesty suite + classification sweep provider
  rows; F-16 governs the one still-open instance class (live call
  transcription).

### MP-5 — Fake toggles and controls
- **Instances:** R13 fake toggles; dead dock/sheet controls in walks
  #1–#4; Drop-it rendered-but-unwired in earlier builds (now honestly
  absent until wired — the correct interim state).
- **Fingerprint (code):** a control whose handler sets only local
  state; a setting persisted nowhere; a button with no request behind
  it. **(review):** "Tap it: what stored truth changes, and where do I
  read it back?" **(test):** dead-control sweep — every tappable
  inventoried and exercised with read-back.
- **Standing check:** ledger class sweep (b); settings law (every
  setting TRUE).

### MP-6 — Unscoped or wholesale data reads
- **Instances:** memory recall checking owner+visibility but never
  scope/purpose/expiry (wallet GYRO-01); whole-wallet reads by
  consumers; aggregate leakage paths.
- **Fingerprint (code):** a read that takes an account id but no scope/
  purpose; context assembly that loads collections instead of a
  minimized package; queries without the caller's entitlement in the
  predicate. **(review):** "Show me the intersection: relevant ∩
  allowed — where is it computed?" **(test):** two-account isolation
  proofs (SM-ISO-01/02 pattern) incl. literal prompt-payload audits.
- **Standing check:** isolation proofs in the regression suite; wallet
  map GYRO-01 is the named open instance, closed by the wallet build.

### MP-7 — Handover claims not verified against the served build
- **Instances:** walk link without opal_dev=1; wrong build served
  twice (stale checkout; resurrected servers); walk #4 expectation
  failure (handover implied what the build didn't contain);
  "machine-proven" sounding like acceptance.
- **Fingerprint (process):** any claim about a build whose badge SHA,
  BEAM start, and contents were not verified in the same breath.
  **(review):** "Which served artifact, verified how, at what time?"
  **(test):** device_test_build_gate — badge == claimed tip, BEAM
  start postdates checkout, foreign servers on the ports killed and
  verified dead.
- **Standing check:** handover-integrity sweep (ledger Section E-f);
  the screenshot pack precedes any walk; reporting law (machine-proven,
  pending phone walk).

### MP-8 — Component-green reported as app-green
- **Instances:** the test-reality gap itself ("all these tests passed,
  I open the app and right away it's broken"); pieces-green verdicts in
  every failed cycle; jsdom structure assertions standing in for the
  rendered layer (R17 failure mode).
- **Fingerprint (process):** a verdict sentence whose evidence is a
  component/API suite while the claim is about the app. **(review):**
  "What is the untested remainder — name it in the same sentence."
  **(test):** the decisive gate is whole-app rendered testing (testing
  unity law).
- **Standing check:** reporting discipline in the ledger preamble; a
  verdict is for the whole app or labeled partial, remainder named.

### MP-9 — Silent failure
- **Instances:** call channel `{:noreply}` catch-all (F-15, fixed);
  seed claims of gates that didn't exist (F-14, fixed); LLM fallback
  swallowing provider failure into a template with no log (F18-08
  contributing cause).
- **Fingerprint (code):** catch-all clauses returning noreply/ok;
  `rescue`/`catch` converting errors into plausible values; fallbacks
  with no log/metric. **(review):** "When this fails, who finds out,
  and how?" **(test):** unknown-input cases must surface the error
  shape; failure-path cases exist per surface, not only happy paths.
- **Standing check:** classification sweep silent-shape rows; totality
  law (a check exercising only the happy shape has not tested the
  surface).

### MP-10 — Stale state revived over live state
- **Instances:** the sticky Maya re-engagement line answering a live
  category answer (RF-2/F-06, fixed); founder seed resurrecting
  cancelled plans to "agreed" (F-10, fixed via the logged gate
  exception); fold/upsert paths mutating time labels without revision
  (RF-5 — investigated, refuted with evidence).
- **Fingerprint (code):** history scans unbounded by recency/relevance
  deciding the current turn; seed/backfill writes that bypass the
  transition gate; any write path to governed state without a logged
  transition. **(review):** "What entitles this old fact to speak for
  the present?" **(test):** turn-order cases (answer the CURRENT
  question), terminal-state cases (cancelled stays cancelled under
  every tool the system owns).
- **Standing check:** PlanTransition gate + regression cases FR-17-03 /
  FR-08-01 / seed-restore tests.

### MP-11 — Indicator drift (added 2026-10-18 06:18 PDT, founder law)
- **Pattern:** a state indicator (color or pattern) means one thing on
  one surface and something else — or nothing — on another; or an
  indicator color/pattern is repurposed decoratively, so the user's
  learned language stops being true. The Persistent Indicator
  Language is invariant by law: action `#FF4D5E`, ready `#FFC86B`,
  forming `#8B5CF6`, happening `#00E5FF`, past white — the same on
  every surface, in both modes (modes change luminance, never
  meaning; L9), with patterns as secondary indicators under QUIET +
  brand restraint. Persistence is the teaching mechanism: learned
  once, read everywhere at a glance.
- **Instances:** named by the founder as a law before a fleet of
  instances accumulated — the state system's hues were explicitly
  replaceable in the redesign authorization, which is exactly how
  drift enters (each surface's designer "improving" a color locally).
- **Fingerprint (code):** a state token redefined per component; a
  hex/pattern from the canon used for non-state decoration; a surface
  inventing its own status color. **(review):** "Does this color mean
  the same thing it meant on the last surface?" **(test):** the
  rendered sweep — for each state, sample the indicator on every
  surface in both modes; any deviation fails.
- **Standing check:** indicator-language rendered sweep (same state →
  same color/pattern, every surface, both modes), part of the pack
  gate; state tokens single-sourced from the orb-sampled canon.

## 1A. The successor patterns (what each mistake is repaired INTO)

Built from the healthy machinery already present — single-gate
transitions, one explicit projection per surface, scoped reads:

| Old | Successor pattern |
|---|---|
| MP-1 scripted layer answers | **SP-1 One answering path** — every user-visible answer is composed in the real service from stored truth; seed is data, never behavior |
| MP-2 fixture-painted surfaces | **SP-2 Projection-or-honest-empty** — a surface renders its projection or a truthful empty/partial state; absent data appears as absent |
| MP-3 shadow state / re-derivation | **SP-3 One projection per surface** — the gyroscope spoke: front end renders outputs, never re-derives state |
| MP-4 canned provider output as live | **SP-4 Honest provider contract** — unconfigured means the disabled shape everywhere; "live" is proven only by a real exercise |
| MP-5 fake toggles/controls | **SP-5 Controls with receipts** — every control performs its operation and the effect reads back; every setting is TRUE |
| MP-6 unscoped/wholesale reads | **SP-6 Scoped reads only** — every read carries scope and purpose; consumers receive minimized packages, never collections |
| MP-7 unverified handover claims | **SP-7 Verified handover** — badge SHA, BEAM start, and contents verified in the same breath as any claim; the pack precedes the walk |
| MP-8 component-green as app-green | **SP-8 Whole-app verdicts** — the decisive gate is the served artifact at the rendered layer; partial verdicts are labeled with the untested remainder named |
| MP-9 silent failure | **SP-9 Failures surface** — every failure has a named observer: a plain-language error for the user or an operator-visible log/metric; no silent catch-alls |
| MP-10 stale state over live state | **SP-10 Governed writes only** — all state changes pass the single gate as logged transitions; live state outranks revived history, always |
| MP-11 indicator drift | **SP-11 One indicator language** — state colors/patterns are single-sourced canonical tokens, invariant across surfaces and modes; indicator hues are never decoration |

## 2. How new work answers to this catalog

- Every new component/branch in this program **declares its
  dependencies** in its report: which existing modules/patterns it
  routes through.
- Any new component found routing through a cataloged mistake-pattern
  **fails review outright** — no "we'll clean it later."
- The blind-spot hunters' finds are screened against this catalog
  first: a find that matches a pattern is a RECURRENCE (charged to the
  check, reported by name); a find that matches none extends the
  catalog.

## 3. The contamination audit = pattern-level migration (mapping layer)

The validated wallet map carries the migration ledger built from this
catalog. For each pattern MP-n → successor SP-n, the map tracks:

1. **Every site inventoried** — where the old pattern still lives in
   the codebase today (file-level), including where new work
   (redesign, wallet, ingestion) touches or could inherit it.
2. **Every site converted** — the site's migration to the successor
   pattern, or its removal where the surface itself is honestly
   absent.
3. **Zero-reachable verification** — the fingerprint re-run after
   conversion proving zero REACHABLE sites of the old pattern remain
   (dead code that cannot be reached is inventoried as such and
   scheduled for deletion, not counted as converted-by-neglect).
4. **Exceptions** — a site/pattern that genuinely cannot be converted
   in this program is NOT a disposition: it is escalated as a
   **founder-named exception** in the delivery, with the reason and
   the cost stated. Temporary quarantine exists only as an
   in-migration state whose conversion is scheduled in the same
   program.

The mapping validator owns this layer's sign-off under the method law
(dual-pass + source adjudication), and the map's gap register
cross-references pattern ids (MP-n) wherever a gap is an old mistake
still standing. Migration progress is reported per pattern (sites
inventoried / converted / remaining), never as a vibe.

## 4. Enforcement requirements (founder ratification + gap-fill, 2026-10-18 04:41 PDT)

Doctrine counts only if accuracy is solidified through process and
code rules ENFORCED through process. These are requirements, not
aspirations:

1. **AUTOMATED TEETH.** Pattern rules are machine-enforced, not
   remembered: architecture/structural tests in the suites (the R13
   gyroscope gate is the template) and static checks that FAIL THE
   BUILD on banned-pattern fingerprints — fixture/seed data flowing
   into production projections; unscoped wallet reads; local scripted
   responders; per-surface state derivation. A fingerprint hit fails
   at the same level as a test failure. A rule without a machine check
   is a hope, and is labeled as such in the migration ledger until it
   has one.
2. **SEED PROVENANCE AS A CODE RULE.** Synthetic/demo data is
   namespaced and typed so it CANNOT flow into surfaces presented as
   the user's real product; the served build's data provenance is
   auditable. Three walks touched this disease; it gets a type-level
   cure, not vigilance.
3. **QUANTIFIED ACCURACY POSTURE.** Pattern-site counts and
   rendered-sweep defect counts are measured per build and must trend
   to zero / stay zero; a build that regresses a count fails the
   gate. "Optimized accuracy" is a number with a direction, not an
   adjective. Counts are recorded per build in the delivery evidence.
4. **RULES UNDER CHANGE CONTROL.** This catalog, its fingerprints,
   and the gates live IN THE REPO under review discipline (canonical
   home: shots/repair18/MISTAKE_PATTERN_CATALOG.md). Weakening or
   removing a gate is a founder-visible event in the delivery notes,
   never a silent edit.
5. **RED-TEAM THE ENFORCEMENT.** The adversarial pass includes trying
   to sneak a cataloged old pattern past the gates — in code, in a
   fixture, in a handover claim. A gate that can be quietly bypassed
   is classified FALSE like any other fake, and its bypass is a
   recurrence charged to the gate.

**Capstone (already law, restated):** all of this machinery exists to
make the founder's phone walk boring. His walk remains the final
authority no process replaces.

## 5. Enforcement teeth — migration ledger (added 2026-10-18, muse/r18-teeth; TEETH-2 update 2026-10-18, muse/r18-teeth2)

Machine checks now in the suites (a fingerprint hit fails the build like
a test failure). Baselines are exact sets in the test files — shrink-only,
pruned in the same commit as a migration, never silently (§4.4).

TEETH-2 note: the teeth-1 gates were red-teamed (19 attacks: 2 caught,
17 bypassed — coordination/repair18/redteam-report.md) and repaired per
its FIX-1..FIX-12. Rows below state the post-teeth-2 truth: what is
machine-enforced, and every remaining HOPE is labeled as a hope with
its bound (§4.1 — an unlabeled hope is itself a violation). Baselines
are per-SITE counts now, not per-file.

| MP | Machine check | Baseline / status (teeth-2, tip 1e92f2d3) |
|---|---|---|
| MP-1 | web: `mistakePatternEnforcement.test.ts` (responder symbols, comments stripped; scripted-responder module filename families incl. local-reply/reply-engine; FIX-5 canned-reply SHAPE: a service-free module holding a `Record<string, string>` table with >=2 sentence-like values fails) + backend: `repair18_pattern_enforcement_test.exs` (seed-module reach scanned across ALL of lib/ — exact allowed set: the two seed modules, gated FounderSeedController, plan_transition.ex documentation reference; extended responder module-name families; FIX-5 backend shape: sentence-table map + reply/respond/answer function + no Repo/Req/HTTP call fails) — **PARTIAL** | 0 sites. **LABELED HOPE (bound):** a renamed responder WITHOUT the canned-table shape (inline conditionals, arrays, a service-importing file, split construction) is not statically decidable — symbol/name lists cannot catch renames. Durable closure is real-path acceptance with signature-phrase kills; the static layer is a tripwire, labeled PARTIAL here and in both gate files |
| MP-2 | web: same test (seed DATA flows — static imports, dynamic `import()`, and re-exports (FIX-1) — against a per-SITE exact baseline: file -> exact seed exports pulled (FIX-8); discovery registry: any seed/fixture/demo/mock-named or `__fixtures__`/`__mocks__` module must be registered (FIX-3); walks + resolver cover `.js/.jsx/.mts` and `index.*`; inline `"seed-*"` id literals are a gated per-file exact count (FIX-4 step 1)) + backend: same test (provenance writes + FIX-10a fragment ban + seed peer UUIDs confined to the two seed modules, gate intact; FIX-10b plan/participant changeset writers are an exact registry) | 19 web flow sites across 8 baseline files (named per-site in the test); 62 inline `"seed-*"` literal sites across 8 files; 0 backend violations. C2 shell: 0. **LABELED HOPE (bound): GAP MP-2-INLINE** — inline data copied with NON-`"seed-*"` ids is not statically decidable; closure is behavioral (seed-off rendered captures for people/places surfaces), not yet built |
| MP-3 | web: same test — protected set is the whole `c2/` directory minus a named adapter/host REGISTRY (exact set: shellData.ts, shellDataBridge.ts, projections.ts, C1ShellHosts.tsx, C2Shell.tsx); every other c2 file takes the reader/derivation bans, and a flat literal keyed by >=2 raw plan statuses with >=2 family values is a duplicate status->family map under ANY name (FIX-7); `FAMILY_BY_STATUS` exists exactly once, in shellData.ts | 0 in C2 scope. **LABELED HOPE (bound):** arithmetic/comparison derivation from props with no status-keyed literal remains behavioral-only. GAP MP-3b unchanged: legacy non-C2 surfaces not yet gated — derivation there is not mechanically countable yet |
| MP-4 | backend: same test (deleted `stub_transcript` signature banned from lib/) — PARTIAL | 0. GAP MP-4b: the general unkeyed-`{:ok, ...}` provider shape is not grep-decidable; BS honesty suite owns it. (Red-team B7's renamed signature rode in a module the MP-1 FIX-5 shape now catches; the MP-4 clause itself stays PARTIAL.) |
| MP-5 | NO machine check yet — GAP MP-5: no static fingerprint separates a dead control from a wired one; the dead-control rendered sweep owns the count until a tappable-inventory manifest exists to diff against | n/a — LABELED HOPE |
| MP-6 | backend: same test — direct `personal_relationship_memories` readers as per-file SITE COUNTS (FIX-8), facade/owner files counted with NO path exemption (FIX-9), patterns extended to bare-schema sources and wholesale `Repo.all/one/one!/aggregate/exists?` on the schema (FIX-2) | 24 sites: memory.ex 4 (facade), durable_preference_memory.ex 10 (owner), continuity.ex 1, follow_through.ex 7, memory_intelligence.ex 2. GAP MP-6b: indirect queries (`Repo.all(q)` built elsewhere) and raw SQL are not grep-decidable; isolation proofs remain the behavioral guard. **LABELED RESIDUAL MP-6c:** a query built from a variable holding the schema (`schema = RelationshipMemory; Repo.all(schema)`) is grep-invisible — same behavioral guard |
| MP-7 | NO machine check — owned by the device_test_build_gate skill (badge SHA / BEAM start), a prose process with no executable verifier | n/a (process) — **LABELED HOPE.** Red-team artifact M7 proved a false handover claim is uncatchable today. FIX-11 (served build-info payload + `scripts/verify_handover.mjs` diffing claim vs served payload) was NOT built in teeth-2: no served build-info payload exists to diff against in this wave. Every handover note carries this HOPE label until FIX-11 lands |
| MP-8 | NO machine check — GAP MP-8: reporting/process pattern; the whole-app rendered gate is the remedy, a code fingerprint does not exist | n/a (process) — LABELED HOPE |
| MP-9 | NO machine check — GAP MP-9: catch-all shapes are also legitimate (channels), so a grep count would be fiction; failure-path tests own it. A check becomes possible if failure paths get a named log/metric convention to assert against | n/a — LABELED HOPE |
| MP-10 | NO new check — owned by the existing PlanTransition gate + FR-17-03 / FR-08-01 regression cases. GAP MP-10b: no static registry of SharedPlan status writers exists to diff against the gate | n/a — LABELED HOPE (behavioral gate ownership is real; the structural claim is the hope) |
| MP-11 | web: same test (FIX-12, added teeth-2 — this row was MISSING at teeth-1, an unlabeled hope): canon indicator hexes are read from the single token source (`theme/planStateColors.ts` `PLAN_STATE_HEX`) and may appear in code only there or in the exact decorative-legacy allowlist in the test | 12 allowlisted files (brand/brand.ts, main.tsx, opalUi/GraphConvoyPanel.tsx, opalUi/GraphSocialHome.tsx, opalUi/OpalLivingCharacter.tsx, opalUi/callsContinuitySeed.ts, opalUi/founderChatsPlanPills.ts, opalUi/founderGraphSeed.ts, opalUi/graphConvoyEta.ts, opalUi/graphSurfaceInterop.ts, theme/signalGrammar.ts, theme/technicolorProduction.ts) — each is an MP-11 MIGRATION item (indicator hues in decorative/branding/seed use), inventoried at teeth-2, shrink-only. **Bound:** the past-white `#FFFFFF` is excluded (generic ink/background value, cannot be fingerprinted honestly); CSS files are not walked by this check |

Seed provenance (§4.2) status: provenance EXISTS at participant level
(`PlanParticipant.authority_source` = `founder_communication_seed` /
`founder_graph_commitment_seed`, writable only by the seed modules —
now enforced) and via stable seed peer UUIDs / message
`client_message_id` prefixes. TEETH-2: the forged-provenance route is
closed for contiguous fragments — the fragments `communication_seed` /
`graph_commitment_seed` may not appear in any string context outside
the seed modules (config-atom files keep an atom-only allowance), so
concatenation/interpolation can no longer mint the value (FIX-10a);
plan/participant changeset writers are an exact registry (FIX-10b).
**LABELED HOPE (bound):** a provenance value assembled from fragments
that never contain a contiguous fragment (e.g. `"communication" <>
"_seed"`), and synthetic-peer namespaces under a fresh UUID prefix
that never write a provenance fragment, remain statically invisible.
GAP MP-2-PROV: `shared_plans`, `messages`,
and `users` rows carry NO provenance field, so "production projections
exclude seed-provenance plans/messages/users" cannot be proven from
the rows themselves until an additive provenance marking (field or
namespaced id convention) lands — no migration was taken in the teeth
build. Quantified posture: `scripts/pattern_posture.mjs` — TEETH-2
re-based the count to SITES (the pre-teeth-2 TOTAL of 11 counted
files and is superseded, not comparable): at 1e92f2d3, TOTAL 117
countable sites = MP-2 81 (19 web flow sites + 62 inline `"seed-*"`
literals) + MP-6 24 + MP-11 12; MP-1/MP-3/MP-4 at 0. This build
changes enforcement, not migrations, so the counted product sites are
unchanged by design — what changed is that growth, laundering, and
trusted-file widening now move the number.
