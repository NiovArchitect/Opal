# B6 — PROOF INFRASTRUCTURE INVENTORY

**Square:** B6 PROOF INFRASTRUCTURE RECONCILIATION ONLY  
**Starting implementation SHA:** `110ca3c`  
**Starting evidence HEAD:** `110ca3c` (B5.5 closure proof stamped in same commit)  
**Tree at inventory:** CLEAN  
**Law:** PROOF FOLLOWS PRODUCT AUTHORITY. PRODUCT DOES NOT FOLLOW STALE PROOF.  
**Product redesign authorized:** NO  
**Activity icon:** FOUNDER_REVIEW (do not resolve)

Canonical Figma: `fy69K8cCug9prf5GLwQ7Hy` · Authority root `618:2` · Sections **00–08** (no top-level 09).

Shared formal runtime entry (Wave B proves):

```
http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1&runtime=<git_rev_parse_short_7_HEAD>
```

Viewport clip: **390×844**. Formal pixel threshold: **≤0.12** (do not lower).

---

## A. Canonical current Wave B executable proves

| SCRIPT / FILE | PURPOSE | CURRENT OWNER | CURRENT FIGMA NODE | LEGACY FIGMA NODE IF ANY | RUNTIME ENTRY PATH | CURRENT EXPECTED STATE | CURRENT STATUS | USES OLD MARKER? | USES STALE DOM SELECTOR? | USES HARDCODED OLD COPY? | USES WRONG FIXTURE? | GENERATES FIGMA CAPTURE? | GENERATES RUNTIME CAPTURE? | GENERATES OVERLAY? | GENERATES DIFF? | WRITES MACHINE-READABLE PROOF? | CURRENT / STALE / RETIRE / UPDATE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `apps/opal_web/scripts/prove_b1_full_live.mjs` | B1 Full Live formal parity | LiveViewer / Full Live | `863:2` (via Home Live `618:211`) | — | founder seed URL | GREEN / frozen | GREEN | NO | NO | NO | NO | NO (consumes `figma/`) | YES | YES | YES | YES (`B1_FULL_LIVE_PROOF.json`) | **CURRENT** |
| `apps/opal_web/scripts/prove_b2_communication.mjs` | B2 Direct/Group/Group Info | Communication core | `618:348`, `618:451`, `618:521` | — | founder seed URL | GREEN / frozen | GREEN | NO | NO | NO | NO | NO | YES | YES | YES | YES | **CURRENT** |
| `apps/opal_web/scripts/prove_b21_direct.mjs` | B2.1 Direct formal closure | Direct | `618:348` | — | founder seed URL | GREEN / frozen | GREEN | NO | NO | NO | NO | NO | YES | YES | YES | YES | **CURRENT** |
| `apps/opal_web/scripts/prove_b3_section06.mjs` | You hub + 12 Section 06 | You / Settings | `618:1344` + 12 settings nodes | — | founder seed URL | GREEN / frozen | GREEN | NO | NO | NO | NO | NO | YES | YES | YES | YES | **CURRENT** |
| `apps/opal_web/scripts/prove_b4_create.mjs` | Create Media + Add to Graph | GraphCreateFlow | `863:284`, `863:338` | lineage `149:31`/`145:216` | founder seed URL | GREEN; camera SYSTEM_DEPENDENCY | GREEN | NO (current nodes) | NO | NO | NO | NO | YES | YES | YES | YES | **CURRENT** |
| `apps/opal_web/scripts/prove_b51_reconcile.mjs` | B5.1 remaining PARTIALs + Calls incoming | multi | `618:44`, `271`, `2299`, `674`, `758`, `902`, `1257`, `581` | — | founder seed URL | historical B5.1 checkpoint | HISTORICAL_CHECKPOINT | NO | NO | NO | NO | NO | YES | YES | YES | YES | **CURRENT** (re-runnable; do not mutate old JSON) |
| `apps/opal_web/scripts/prove_b52_closure.mjs` | B5.2 Person/Calls/Opal | multi | `618:1257`, `581`, `599`, `620`, `642`, `902` | — | founder seed URL | historical; Opal later demoted MODE B | HISTORICAL_CHECKPOINT | NO | NO | NO | NO | NO | YES | YES | YES | YES | **UPDATE** — must refuse MODE B as GREEN integrity |
| `apps/opal_web/scripts/prove_b53_integrity.mjs` | Global Opal integrity + formal | OpalAmbient | `618:902` (+ Home) | MODE B raster path prohibited | founder seed URL | STRUCTURED_UI + ≤0.12 | GREEN (B5.5) | NO | NO | NO | NO | NO | YES | YES | YES | YES | **CURRENT** (canonical integrity guard seed) |
| `apps/opal_web/scripts/prove_b6_guards.mjs` | B6 guard harness (new) | proof infra | multi / meta | — | founder seed URL | guards GREEN; Activity FOUNDER_REVIEW | B6 | NO | NO | NO | NO | NO | optional | optional | NO | YES | **CURRENT** (created in B6) |

Evidence OUT root for all of the above:

`docs/evidence/v2-coded-experience/p0-05-12-wave-b/{figma,runtime,overlay,diff,*.json}`

---

## B. Evidence-dir mirror / non-canonical runners

| SCRIPT / FILE | PURPOSE | CURRENT OWNER | CURRENT FIGMA NODE | LEGACY | RUNTIME ENTRY | EXPECTED | STATUS | OLD MARKER? | STALE DOM? | OLD COPY? | WRONG FIXTURE? | FIGMA CAP? | RUNTIME? | OVERLAY? | DIFF? | MACHINE JSON? | ACTION |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `docs/.../prove_b1_full_live.mjs` | mirror of apps B1 | Full Live | `863:2` | — | same | GREEN | DUPLICATE | NO | NO | NO | NO | NO | YES | YES | YES | YES | **UPDATE** → point to apps canonical; keep as lineage mirror |
| `docs/.../prove_b2_communication.mjs` | mirror of apps B2 | Comm | `618:348/451/521` | — | same | GREEN | DUPLICATE | NO | NO | NO | NO | NO | YES | YES | YES | YES | **UPDATE** → apps canonical |
| `docs/.../prove_b3_section06.mjs` | mirror of apps B3 | You | Section 06 | — | same | GREEN | DUPLICATE | NO | NO | NO | NO | NO | YES | YES | YES | YES | **UPDATE** → apps canonical |
| `docs/.../prove_b4_create.mjs` | mirror of apps B4 | Create | `863:284/338` | — | same | GREEN | DUPLICATE | NO | NO | NO | NO | NO | YES | YES | YES | YES | **UPDATE** → apps canonical |
| `docs/.../prove_12a_closure.mjs` | P0-05.12A pre-Wave-B | Journey/Live | `618:816`, `863:88/195/394`, `863:2` | hard-coded SHA default | founder URL (stale SHA fallback) | HISTORICAL | HISTORICAL | NO | PARTIAL | NO | YES (SHA) | NO | YES | NO | NO | YES | **RETIRE** from current executable set |
| `docs/.../prove_b7.mjs` | B7 harness (HOLD) | multi | many | old SHA `c9c5c92`; not 0.12 formal | founder URL | OUT_OF_SCOPE for B6 | HOLD / DO NOT RUN AS B6 | NO | PARTIAL | NO | YES (SHA) | NO | YES | YES | YES | YES | **RETIRE** from B6 current set — do not auto-start B7 |

---

## C. Legacy Create / 149:31 executable debt

| SCRIPT / FILE | PURPOSE | OWNER | CURRENT NODE | LEGACY NODE | RUNTIME ENTRY | EXPECTED | STATUS | OLD MARKER? | STALE DOM? | OLD COPY? | WRONG FIXTURE? | FIGMA? | RUNTIME? | OVERLAY? | DIFF? | MACHINE? | ACTION |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `scripts/ogx_chats_create_browser_proof.mjs` | Completeness Create+Chats slice | GraphCreateFlow | should be `863:284`/`863:338` | **`149:31`→`145:216` asserted as current** | login fixture URL | STALE vs product | STALE | **YES** | YES (`data-figma-create===149:31`) | YES (header) | NO | NO | YES | NO | NO | YES (historical JSON) | **RETIRE** as HISTORICAL; current Create = `prove_b4_create.mjs` |
| `scripts/ogx_home_social_closure_proof.mjs` | Home social closure incl Create assert | Home + Create | Create should be `863:284` | asserts `data-figma-create==="149:31"` | login fixture | STALE | STALE | **YES** | YES | NO | NO | NO | YES | NO | NO | YES | **RETIRE** Create assert path; Home social is lineage only |

Product correctly stamps:

- `data-figma-create` / `data-figma-node` = **863:284 / 863:338**
- `data-figma-create-lineage` = **149:31 / 145:216** (lineage only — retain)

---

## D. Authority / ledger / schema assets

| FILE | PURPOSE | OWNER | FIGMA | LEGACY | ENTRY | EXPECTED | STATUS | OLD? | STALE DOM? | OLD COPY? | WRONG FIX? | FIGMA CAP? | RUNTIME? | OVERLAY? | DIFF? | MACHINE? | ACTION |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `docs/authority/OPAL_CURRENT_AUTHORITY.yaml` | Canonical authority + product_state | governance | `618:2` | checkpoint lagged at B5.2 | — | B5_COMPLETE=YES; next=B6 then B7 | **STALE ledger vs B5.5 evidence** | NO | NO | YES (Home PARTIAL / b5_complete false) | NO | NO | NO | NO | NO | YES | **UPDATE** to B5.5/B6 truth |
| `docs/authority/FIGMA_RUNTIME_LEDGER.yaml` | node→react/css/tests map | governance | `618:2` | duplicate YAML keys | — | CURRENT surfaces | PARTIAL (dup keys) | NO | NO | NO | NO | NO | NO | NO | NO | YES | **UPDATE** notes; dedupe when safe |
| `docs/authority/ACTION_DESTINATION_LEDGER.yaml` | action→destination | governance | Activity `618:2384` | — | — | Activity FOUNDER_REVIEW preserved | CURRENT | NO | NO | NO | NO | NO | NO | NO | NO | YES | **CURRENT** (Activity note keep) |
| `docs/authority/ASSET_PROVENANCE.yaml` | asset provenance | assets | multi | — | — | DPR3 lineage | CURRENT | NO | NO | NO | NO | NO | NO | NO | NO | YES | **CURRENT** |
| `docs/authority/OPAL_PROOF_SCHEMA.yaml` | B6 multi-field proof schema (new) | proof infra | — | — | — | visual≠integrity | B6 | NO | NO | NO | NO | NO | NO | NO | NO | YES | **CURRENT** (created) |
| `scripts/opal-authority-check.mjs` | Authority guard | governance | Create `863:284` | — | — | exit 0 | CURRENT | NO | NO | NO | NO | NO | NO | NO | NO | console | **UPDATE** for B6 guards / FOUNDER_REVIEW status |

---

## E. Historical evidence packages (IMMUTABLE)

Do **not** edit to retroactively GREEN. Link lineage only.

| FILE | PURPOSE | STATUS | ACTION |
|---|---|---|---|
| `B1_FULL_LIVE_PROOF.json` | B1 formal | GREEN historical | PRESERVE |
| `B2_COMMUNICATION_PROOF.json` / `B2_1_DIRECT_PROOF.json` | B2 | GREEN | PRESERVE |
| `B3_SECTION06_PROOF.json` | B3 | GREEN | PRESERVE |
| `B4_CREATE_PROOF.json` | B4 Create current authority | GREEN | PRESERVE |
| `B5_1_*` … `B5_5_CLOSURE_PROOF.json` | B5 sequence | B5.5 final GREEN Home 0.1131 / Opal 0.1187 | PRESERVE |
| `B5_2_CLOSURE_PROOF.json` | Contains MODE B lesson | HISTORICAL (later demoted) | PRESERVE — do not rewrite |
| `B5_3_INTEGRITY_PROOF.json` | Integrity rebuild | HISTORICAL→basis for guard | PRESERVE |
| `B5_REMAINING_PARTIAL_*` | Pre-closure inventory | HISTORICAL PARTIAL | PRESERVE |
| `B7_PROOF.json` / `B7_PROOF_RUN.log` | Premature B7 harness output | HOLD / not founder walk | PRESERVE; do not treat as current GREEN |
| `docs/evidence/.../social-flow-final-convergence/BROWSER_PROOF_CHATS_CREATE_HOME.json` | Asserts figma149=`149:31` | HISTORICAL | PRESERVE |
| `DPR3_ASSET_TABLE.md` / `DPR3_ASSET_SHA.json` | Asset provenance | CURRENT reference | PRESERVE + reconcile in B6 |

---

## F. Related root scripts (lineage / smoke — not Wave B formal 0.12)

| SCRIPT | PURPOSE | ACTION |
|---|---|---|
| `scripts/founder_proof_fixture.mjs` | Founder seed activate | **CURRENT** contract dependency |
| `scripts/founder_smoke_run.mjs` / `founder_deep_smoke.mjs` | Smoke | LINEAGE / smoke — not formal parity |
| `scripts/dock_occlusion_proof.mjs` | Dock occlusion | LINEAGE (Home top-844 supersedes for formal) |
| `scripts/home_*_proof.mjs` | Pre-Wave-B home craft | RETIRE from current formal set |
| `scripts/journey_authority_proof.mjs` | Journey | LINEAGE; Journey already GREEN frozen |
| `scripts/p0_05_*` family | Authority/splash/Section06 smokes | LINEAGE |
| `scripts/p0_05_8a_visual_gate.mjs` | Early 0.12 gate | LINEAGE |
| `apps/opal_web/scripts/p0-04-1-reverify.mjs` | Pre-Wave-B | RETIRE from Wave B current |

---

## G. Missing prove scripts (documented debt)

| Gap | Notes | B6 action |
|---|---|---|
| No `prove_b54*.mjs` / `prove_b55*.mjs` | B5.4/B5.5 closed via committed JSON + ad-hoc capture | Encode Home top-844 + Opal integrity in `prove_b6_guards.mjs`; do not invent product changes |
| Authority YAML lagged B5.2 | Evidence already B5_COMPLETE=YES | Update ledger to match evidence — not product |

---

## H. Inventory summary counts

| Class | Count |
|---|---|
| Canonical current Wave B proves (apps) | 8 (+ B6 guards) |
| Duplicate evidence mirrors | 4 |
| Legacy 149:31 executable scripts | 2 |
| Historical evidence packages (preserve) | 20+ |
| Authority/ledger/schema files to reconcile | 5 |
| Premature B7 harness | 1 (HOLD) |

**LEGACY_CURRENT_PROOF_DEBT (pre-B6 executable):** 2 (`ogx_*` Create asserts) + authority ledger lag + duplicate runners + missing B5.4/B5.5 harness encoding ≈ **tracked in STOP**.

---

## I. Absolute inventory laws

1. Do not modify product to satisfy this inventory.  
2. Do not rewrite historical PARTIAL/GREEN packages.  
3. Activity remains **FOUNDER_REVIEW** — not RED, not GREEN, not ignored.  
4. Create current authority is **863:284 / 863:338** — never reintroduce **149:31** as current visual authority.  
5. Global Opal formal GREEN requires **STRUCTURED_UI_WITH_DECORATIVE_UNDERLAY** — never MODE B raster+hotspots alone.  
6. Home formal compares **top-844 of 390×3040** — never wrong crop / 692px clip law regression.  
7. Do not begin B7 from this inventory.
