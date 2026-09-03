# P3 Signal Grammar Implementation — Intent Lock

**Date:** 2026-09-03  
**Starting HEAD:** `704d445933367994b04d47bd8fd9e8f643e74460`  
**Branch:** `build/v2-coded-experience-closure`  
**Authorization:** Explicit founder GO for `POST_B7_P3_SIGNAL_GRAMMAR` only  

```
P3_AUTHORIZED = YES
P4_AUTHORIZED = NO
MERGE = NO
LIVE = NO
permissionToStartLive = NO
FOUNDER_ACCEPTED (whole product) = NO
P2_FROZEN = YES
P2_FOUNDER_ACCEPTED = YES
DO_NOT_REOPEN_WITHOUT_PROVEN_REGRESSION = YES
ACTIVITY_ICON_APPROVED = NO
ACTIVITY_ICON_FOUNDER_REVIEW_SOURCE = 1046:2
```

## Local phase lock (resolved before product edits)

| Phase | Local ID | Status |
|-------|----------|--------|
| **P2** | `POST_B7_P2_CALLS_CONTINUITY` | **FROZEN CURRENT** (founder accepted 2026-09-03) |
| **P3** | `POST_B7_P3_SIGNAL_GRAMMAR` | **AUTHORIZED** (this message) |
| **P4** | `POST_B7_P4_DECISION_INTELLIGENCE` | **HOLD** |

**Authority conflict?** **NO.** `SIGNAL_GRAMMAR_AUTHORITY = CURRENT` · Figma `965:2` · implement_authorized true. P2 freeze and Activity `1046:2` FOUNDER_REVIEW remain intact. P4 visuals CURRENT in Figma but runtime HOLD.

## Authority docs read

- `OPAL_CURRENT_AUTHORITY.yaml`
- `FOUNDER_P2_ACCEPTED_2026-09-03.md`
- `CALLS_COMMUNICATION_CONTINUITY.md`
- `OPAL_SIGNAL_GRAMMAR.md`
- `OPAL_PRODUCT_OPERATING_SYSTEM.md`
- `OPAL_AI_REWARD_ARCHITECTURE.md`
- `FIGMA_BRAND_V4_AUTHORITY.md`
- `STATE_COMPLETENESS_LAW.md`
- `OPAL_CONTINUITY_DOCTRINE.md`
- `OPAL_DECISION_INTELLIGENCE.md`
- `FOUNDER_REVIEW_PROPOSALS.yaml`
- P2 / P2.3 STOP reports

## Figma

- File `fy69K8cCug9prf5GLwQ7Hy` · root `618:2`
- Signal Grammar `965:2` CURRENT
- Calls `928:3` FROZEN
- Curation `979:*` / `988:*` — do not implement in P3

## Purpose

Make Opal’s behavioral language consistent, learnable, emotionally legible, low-noise, predictable, useful.  
Answer: WHAT CHANGED? · WHAT NEEDS ME? · WHAT CAN I DO NOW? · IS THIS REAL YET?  
**Not** a global recolor.

## Semantic color law (behavioral signal only)

| State name | Hex | Meaning |
|------------|-----|---------|
| `active` | CYAN `#00E5FF` | DO NOW |
| `changed` | AQUA `#00F0D1` | meaningful context/alignment changed |
| `confirmed` | GOLD `#FFC86B` | earned shared truth / ready / reserved / confirmed |
| `needs_attention` | CORAL `#FF6B9D` | needs user · scarce |
| `provisional` | VIOLET `#8B5CF6` | possibility / review / unconfirmed |
| `settled` | NEUTRAL `#94A1B8` | history · nothing required |

**Confidence ≠ confirmation.** Gold must be earned. Zero signal is valid. COLOR + PLAIN LANGUAGE (+ icon). Never dim the human.

## Brand / category / signal distinction (durable)

1. BRAND / ATMOSPHERE  
2. IDENTITY / RELATIONSHIP  
3. CATEGORY / DOMAIN (e.g. Section 06 accents — NOT behavioral)  
4. CONTENT / MEDIA  
5. INTERACTIVE ACTION  
6. BEHAVIORAL SIGNAL  

Same hex may appear in multiple roles; meaning depends on role.

## Lifecycle

`BORN → REVEALED → ACKNOWLEDGED → ACTED → RESOLVED → SETTLED`  
No perpetual pulse. Settled history is static.

## Interruption / motion / sound / haptic

Levels 0–4 per `OPAL_SIGNAL_GRAMMAR.md`. Motion = reality changing. Sound = attention boundary. Haptic = scarce meaningful tactile. Reduced motion must preserve meaning.

## Surfaces to audit (before edit)

Home · Calls · Chats · Direct · Group · Graphs · Graph Detail · Journey · Full Live · Global Opal · Activity · Search (state-bearing) · You/settings dynamic · Create (state-bearing)

## Non-goals

- Global palette replace / search-replace hex  
- Recolor Section 06 category accents as Signal Grammar  
- Redesign Calls (P2 frozen)  
- Implement Activity icon `1046:2`  
- Implement P4 Decision Intelligence visuals  
- Invent new signals / dopamine decoration  
- Merge / Live / whole-product FOUNDER_ACCEPTED  

## Shared-component risks

- `spectralTokens.css` `--color-aligned: gold` may conflate “aligned” with confirmed  
- Graphs status chips (`ready`/`aligned`/`forming`/`idea`)  
- Home card decorative color cycling  
- Any shared token change → re-prove P2 Calls family if rendering changes  

## Proof plan

1. Audit MD + taxonomy authority  
2. One semantic mapping owner (`signalGrammar` tokens + CSS vars by **state name**)  
3. Surgical fixes only for OBJECTIVE_SEMANTIC_CONFLICT / MISSING_BEHAVIOR  
4. Representative state proofs (zero / coral settle / violet→gold / aqua / cyan / history / reduced-motion)  
5. Cross-surface same-Reality consistency  
6. P2 regression if shared tokens touch Calls  
7. Commit · safe push · founder URL · STOP  

## Rollback boundary

If P3 cannot close objectively without global recolor or P2 breakage: leave honest FAIL; do not claim complete; do not start P4.

**AUDIT → INTENT LOCK (this file) → IMPLEMENT SURGICALLY → PROVE → COMMIT → PUSH → FOUNDER VERIFY → STOP.**
