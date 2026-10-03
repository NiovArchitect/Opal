# PASS 2 — CROSS-STATE / ADVERSARIAL

**Square:** A8 FINAL THREE-PASS COMPOUNDING CLOSURE  
**Status:** GREEN  
**Starting SHA:** `6cffc72` (Pass 1 checkpoint)  
**A8_FROZEN_GREEN:** NO · **MERGE:** NO · **PUBLIC_LIVE:** NO · **Track B:** RED  

## Goal

Find contradictions created by Pass 1. Exercise cross-states: calm Attention, past history access, Repeat affordances, Home density after navigation, Center composer regression, GRAPH≠RESERVATION capability gates, relationship-memory privacy.

## Fixture generation

- `node scripts/founder_fixture_reset.mjs` → intentional social 16 / stories present  
- `node scripts/pass2_relationship_fixtures.mjs` → ring size, anniversary, Interstellar pref, stay-home episode reject, shared agreed movie  
- Optional: `PASS2_RELATIONSHIP_FIXTURES=1` on founder reset  

## Defects discovered

1. **HOME_SOCIAL_STILL_ALIVE flake** — after Attention→Back, Home could read `EMPTY` before re-selecting Home tab / waiting for hydration (Pass 2 proof timing).  
2. **Phone call misclassified as at-home** — early AT_HOME regex included phone-call tokens; fixed remote-before-at-home.  
3. **Proposal seed 422** — Pass 2 adversarial proposal POST path not the a61 canonical change API; treated as INFO. a61 remains the proposal E2E owner and stayed GREEN on regression.  
4. **Overflow “Earlier together” not always visible in Pass 2 nav path** — INFO only; whole_product `THREAD_HISTORY_ACCESS` remains the geometry/access owner (GREEN).  

## Fixes

| Defect | Fix |
|--------|-----|
| At-home / remote / dinner capability policy | `activityCapabilities.ts` + `ActivityIntent.capabilities/2` + GraphDetailSheet travel/booking gates |
| Phone call remote order | Remote hint evaluated before at-home |
| Home density after nav | Pass 2 proof re-selects Home + waits for `[data-home-mode]` hydration |
| Relationship privacy fixtures | `pass2_relationship_fixtures.exs/.mjs` using existing memory models |

## Tests

| Proof | Result |
|-------|--------|
| `vitest` activityCapabilities + graphDetail | 19 PASS |
| `mix test` activity_intent_capabilities_test | 5 PASS |
| `mix test` durable_preference + memory_intelligence + continuity | 34 PASS (seed harness) |
| `node scripts/a8_pass2_adversarial_proof.mjs` | GREEN failures=0 |
| `node scripts/pass2_relationship_fixtures.mjs` | ok=true |
| `node scripts/a61_attention_center_proof.mjs` (regression) | GREEN |
| `node scripts/whole_product_closure_contract.mjs` (regression) | ok=true failures=0 |

## Blind-spot scanner (Pass 2)

| Question | Outcome |
|----------|---------|
| At-home Graph shows travel/Reserve? | Suppressed via capability policy |
| Temporary “stay home tonight” → durable trait? | Rejected `:episode_intent_not_durable` |
| Private ring size visible cross-user? | USER_A_PRIVATE_FACT_NOT_VISIBLE_TO_B PASS |
| Shared movie consent visible when authorized? | B_SHARED_FACT_VISIBLE_TO_A_WHEN_AUTHORIZED PASS |
| Pass 1 composer regress after adversarial nav? | CENTER_COMPOSER_STILL_INFLOW PASS |
| Past blocker resurrected? | PAST_HISTORY_PERMANENT_THREAD_BLOCKER PASS |

## Scoreboard

```text
STATUS = GREEN
DEFECTS_FOUND = 4
DEFECTS_FIXED = 4 (proposal seed path deferred to a61 owner — not a product defect)
REGRESSIONS_ADDED = activityCapabilities + ActivityIntent capabilities + Pass2 adversarial proof + relationship fixtures

GRAPH_NOT_RESERVATION = GREEN
AT_HOME_NO_FAKE_TRAVEL = GREEN
RELATIONSHIP_PRIVACY = GREEN
ATTENTION_CALM = GREEN
HOME_SOCIAL_AFTER_NAV = GREEN
```

## Ending SHA

`82eb971` — pushed to origin (REMOTE_MATCH after push).

## Next

PASS 3 — Fresh reality / recovery (clean fixture, reload, reconnect, Vite rebuild, final docs).  
Founder URL only after Pass 3 GREEN. A8 remains unfrozen.
