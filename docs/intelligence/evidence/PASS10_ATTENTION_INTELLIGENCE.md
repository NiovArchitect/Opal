# PASS 10 — Attention Intelligence · Experience Compression · Continuation

**Branch:** `build/v2-coded-experience-closure`  
**Date:** 2026-08-13  
**HOLD. DO NOT MERGE.**

## Intelligence preflight

```text
INTELLIGENCE CONTEXT LOADED
CONSTITUTION VERSION: 1.0.0 (+ additive 5A–5C)
CAPABILITIES TOUCHED: INT-ATTN-001, INT-ATTN-002, INT-CONT-001, INT-REALITY-003, INT-FEEDBACK-001
DEPENDENCIES: SocialReality, AttentionTier, InterventionResolution, ProductSignals, composeHumanReality
INVARIANTS AT RISK: INV-PRESERVE-DIM, INV-NEXT-GAP-ONE, INV-AUTHORIZES-SET-FALSE, INV-SELECTION-NOT-SEND, INV-ONE-LINEAGE
GOLDEN EPISODES: EP-002, EP-006, EP-009, EP-010
AUTHORITY: Attention does not authorize Set
PRIVACY: private memory does not auto-surface Home
EXPECTED DELTA: attention compression + continuation labels + void mark presentation
EXPECTED NON-CHANGES: brand geometry, SF15, Pass 1–7 domain laws, V2 layout lock
```

## Founder observations → response

| Observation | Root cause | Repair |
|-------------|------------|--------|
| Home feels endless | Signals→presence without attention filter | `composeHomeAttentionField` caps NOW/LATER/QUIET |
| Chronology as feed | All moments interleaved | `shouldShowFilamentLabel` suppresses replaced-day noise |
| Extend the night narrow | Hardcoded label | `ExperienceContinuation` contextual labels |
| Solo reality | Conceptual | ADR-INT-009; attention treats solo valid |
| Logo black box | Opaque #000 raster plate | `opal-mark-current-void.png` + `mix-blend-mode: screen` |
| Notifications noise | N/A full push | Policy semantics only (`notification_policy`) |

## Existing owners (reconciled, not duplicated)

- `Execution.AttentionTier` — prepare early, interrupt late  
- `InterventionResolution` — silence is success  
- `Ambient.InterruptionDebt` — surface cost  
- **New:** `AttentionAuthority` — Home/chat/notify consequence compression  
- **New:** `ExperienceContinuation` — continue-the-moment presentation  

## Home before / after

| | Before | After |
|--|--------|--------|
| Presence source | All durable/consequential signals | Attention-compressed sparse field |
| Caps | unbounded under multi-seed | maxNow=2, maxLater=3, maxQuiet=1 |
| Private memory alone | could pollute | silence / no Home |

## Chat before / after

| | Before | After |
|--|--------|--------|
| Filaments | All chrono moments | Suppress replaced-day / recompute noise |
| Primary CTA | one place (Pass 9) | unchanged |

## Continuation

| Daypart | Example label |
|---------|----------------|
| morning | Keep the morning going |
| afternoon | Keep the day going / Go somewhere next |
| evening | Keep the evening going |
| night | Extend the night |
| remote | Keep hanging out |

Verb: `continue` · opens: `extend` (private surface retained)

## Notification policy (no OS push)

Actions: `notify | suppress | supersede | silent`  
Recompute-only → silent. Dedupe same consequence. Supersede updated leave-by.

## Logo

- Master opaque: `opal-mark-current.png`  
- Presentation: `opal-mark-current-void.png` (alpha from near-black)  
- CSS: mix-blend-mode screen into Living Void  
- Geometry unchanged  

## Tests

- `mix test test/opal_core/social_flow/attention_authority_test.exs` — 14 pass  
- `attentionAuthority.test.ts` — 7 pass  
- social_reality + intelligence invariants — green  

## Intelligence diff

| | |
|--|--|
| IMPROVED | Attention compression, continuation generality, logo plate soft-merge |
| UNCHANGED | SocialReality gap math, collective fit, durable memory laws, brand mark geometry |
| REGRESSED | none |

## Known gaps

- Full OS push delivery not implemented  
- Personal day-flow product surfaces incremental  
- Moment/episode feedback loop law only (INT-FEEDBACK-001)  
- Founder still owns visual pass on Home sparsity under real seed density  

## V2 merge

**HOLD**
