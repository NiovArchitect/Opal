# PASS 3 — FRESH REALITY / RECOVERY

**Square:** A8 FINAL THREE-PASS COMPOUNDING CLOSURE  
**Status:** GREEN  
**Starting SHA:** `d79c300` (Pass 2 checkpoint)  
**A8_FROZEN_GREEN:** NO · **MERGE:** NO · **PUBLIC_LIVE:** NO · **Track B:** RED  

## Goal

Prove Opal survives time and system discontinuity: clean fixture, fresh login, reload, Vite rebuild / SHA match, new browser context, Attention/Home/Repeat/Center still coherent.

## Fixture generation

1. `node scripts/founder_fixture_reset.mjs`  
2. `node scripts/pass2_relationship_fixtures.mjs`  
3. Walk B activate `+12025550102`  

## Defects discovered

1. **SERVED FE SHA stale (`525129e` vs HEAD `d79c300`)** — long-lived Vite process from prior pass. Restart Vite → `RUNTIME_FE_SHA` PASS (`d79c300`/`d79c300`).  
2. **NEW_CONTEXT_HOME EMPTY race** — new Playwright context needed hydration wait; fixed locator poll until PRODUCTION_HYDRATION / ≥8 cards.  

## Fixes

| Defect | Fix |
|--------|-----|
| Stale Vite SHA | Restart Vite on Pass 3; require fe SHA match HEAD |
| New-context Home empty | Pass 3 proof waits up to 15s for hydration |

## Tests

| Proof | Result |
|-------|--------|
| `node scripts/a8_pass3_recovery_proof.mjs` | GREEN failures=0 |
| `node scripts/a61_attention_center_proof.mjs` | GREEN |
| `node scripts/a8_pass2_adversarial_proof.mjs` | GREEN |
| `node scripts/whole_product_closure_contract.mjs` | ok=true failures=0 |
| vitest activityCapabilities + graphDetail + nativeHost + layout | 47 PASS |
| mix activity_intent_capabilities_test | 5 PASS |

## Screenshots

`docs/evidence/v2-coded-experience/a8-three-pass/shots/pass3/`

## Blind-spot scanner (Pass 3)

| Question | Outcome |
|----------|---------|
| What if Vite not restarted after commit? | SERVED≠HEAD — caught; restart required before founder URL |
| What happens after reload? | Nav survives; Attention reachable; composer in-flow |
| What happens in a new session context? | Home densifies after hydration wait |
| Do recovery docs match code? | PRODUCT_INVARIANTS + Pass 1/2 docs + ACTION_GRAPH present |

## Scoreboard

```text
STATUS = GREEN
DEFECTS_FOUND = 2
DEFECTS_FIXED = 2
REGRESSIONS_ADDED = a8_pass3_recovery_proof.mjs

RUNTIME_FE_SHA_MATCH = GREEN
FIXTURE_RESET = GREEN
RELOAD = GREEN
NEW_CONTEXT = GREEN
REPEAT_AFTER_RECOVERY = GREEN
CENTER_COMPOSER = GREEN
ATTENTION = GREEN
```

## Ending SHA

`96f7c64` — pushed to origin.

## Founder handoff gate

All THREE passes GREEN → ONE phone URL for unscripted product-feel walk.  
`A8_FROZEN_GREEN = NO` until that walk.
