# PASS 1 — FUNCTIONAL / STRUCTURAL

**Square:** A8 FINAL THREE-PASS COMPOUNDING CLOSURE  
**Status:** GREEN  
**A8_FROZEN_GREEN:** NO  
**MERGE:** NO  
**PUBLIC_LIVE:** NO  
**TRACK_B / PLAIN_CALL_PHYSICAL:** RED / UNRESOLVED  

## Starting SHA

`525129e4576e40c2cd19b776bd3ef7ec35ac52eb` (`525129e`) — prior whole-product closure commit; Pass 1 edits were dirty on top.

## Goal

Make every known Pass-1 surface work: Center composer geometry, thread history access (not permanent blocker), Home social body, Repeat open path, Attention/bell E2E, action inventory start.

## Fixture generation

- `scripts/founder_fixture_reset.mjs` — intentional social densify (16 INTENTIONAL_SOCIAL)
- a61 seeds real Fort Oak 8:00 PM proposal via ConversationAlignment (Walk A → Walk B)
- Repeat smoke uses Walk B native-host session against past Fort Oak

## Defects discovered

1. **CENTER composer floated over content/tabs** — absolute overlay geometry.
2. **EARLIER TOGETHER permanent thread blocker** — sticky past strip occupied prime conversation space.
3. **HOME stories-only / thin feed** — insufficient lived-in social body.
4. **a61 browser Attention “Could not connect to Opal services”** — `VITE_OPAL_API_URL` LAN host kept on loopback+native-host pages; CSP `connect-src` blocks private-LAN API from `127.0.0.1` pages.
5. **a61 Attention Loading race** — fixed 1s wait insufficient for Walk A Waiting section.
6. **Playwright `waitForFunction` under CSP** — `unsafe-eval` refused; locator polling required.

## Fixes

| Defect | Fix | Primary files |
|--------|-----|---------------|
| Composer overlay | Flex in-flow stack: scroll → lenses → composer → dock clearance; `position:relative` | `OpalCenterLifeGraph.tsx`, `styles.css` |
| Past thread blocker | Remove sticky past strip; “Earlier together” in header overflow → Graph Detail | `OpalApp.tsx`, `GraphPeopleThread.tsx` |
| Home density | 16 intentional SOCIAL + production hydration engagement lookup | `founder_fixture_reset.mjs`, `home_feed.ex`, `socialAuthority.ts`, `homeHydration.ts` |
| Repeat | `repeatCreateContextFromPast` + Detail CTA + `knownWhen=null` + Change who | `graphReality.ts`, `GraphDetailSheet.tsx`, `GraphCreateFlow.tsx`, `OpalApp.tsx` |
| Loopback CSP/API | Native-host loopback → same-origin Vite proxy; non-native loopback+LAN env → `http://127.0.0.1:4000`; resolver `v2` | `productClient.ts`, `nativeHostApiBase.test.ts` |
| Attention ready wait | CSP-safe locator poll until Loading ends | `a61_attention_center_proof.mjs` |

## Tests / proofs

| Proof | Result |
|-------|--------|
| `vitest` nativeHostApiBase + layout/graphDetail/socialAuthority/activityDestination | 11 + 47 PASS |
| `scripts/whole_product_closure_contract.mjs` | ok=true failures=0 |
| `scripts/a61_attention_center_proof.mjs` | GREEN failures=0 |
| Pass1 Repeat browser smoke (Fort Oak → Repeat → create, Change who, when blank) | `PASS1_REPEAT_SMOKE.json` all true / `REPEAT_MUTATES_OLD_GRAPH=0` |

## Screenshots

- Whole-product closure device matrix under `docs/evidence/v2-coded-experience/coherence-recovery/shots/whole-product-closure/`
- a61 Attention under `docs/evidence/v2-coded-experience/a61-attention-center/shots/`
- Repeat smoke under `docs/evidence/v2-coded-experience/coherence-recovery/shots/pass1-repeat/`

## New regression coverage

- Center composer in-flow / order / clearance asserts in `whole_product_closure_contract.mjs` + `iphoneLayoutSystem.test.ts`
- Thread past-blocker absent + Earlier together overflow
- Home intentional ≥8 / PRODUCTION_HYDRATION
- Native API resolver loopback+LAN CSP-safe cases
- a61 Attention ready wait (no unsafe-eval)

## Blind-spot scanner (Pass 1)

| Question | Answer → action |
|----------|-----------------|
| Assumption: native-host on loopback keeps configured API | False under LAN env + CSP → resolver v2 |
| Where else? | Any Playwright proof using `opal_native_host=1` on 127.0.0.1 |
| Missing data? | Relationship fact fixtures (ring/anniversary/movie/stay-home) deferred Pass 2 with existing model reuse |
| Repeat durability? | UI creates new create-flow context; BEAM SharedPlan lineage still Pass 2 |
| Dead social controls? | Production UUID path wired; non-durable id soft-fail residual → Pass 2 hide/disable |

## Pass 1 scoreboard

```text
STATUS = GREEN
DEFECTS_FOUND = 6
DEFECTS_FIXED = 6
REGRESSIONS_ADDED = nativeHostApiBase loopback cases + a61 ready wait + closure composer/history/home asserts + Repeat smoke

CENTER_COMPOSER_GEOMETRY = GREEN (in-flow, tabs clear, dock clear)
THREAD_INLINE_PAST_BLOCKER = 0
RELATIONSHIP_HISTORY_ACCESS = GREEN (overflow → detail)
REPEAT_SAME_PEOPLE_OPEN = GREEN (smoke)
HOME_SOCIAL_POST_COUNT = 16
ATTENTION_BELL_PIPELINE = GREEN (a61)
ACTION_GRAPH = scaffold expanded (DEAD_ACTION_COUNT target 0)
```

## Ending SHA

`6cffc72` — pushed to `origin/build/v2-coded-experience-closure` (REMOTE_MATCH=YES). Built on `525129e`.

## Next

PASS 2 — CROSS-STATE / ADVERSARIAL without founder interruption.  
A8 remains unfrozen until all three passes GREEN + founder feel walk.
