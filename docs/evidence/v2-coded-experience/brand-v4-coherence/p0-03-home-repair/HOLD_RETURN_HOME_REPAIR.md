# P0-03 HOME REPAIR — HOLD RETURN

**Date:** 2026-08-25  
**Authority:** `618:44` · Wiring `618:3288`  
**First Run:** FOUNDER ACCEPTED · FROZEN  
**HOLD. DO NOT MERGE. permissionToStartLive = NO. Communication NOT STARTED.**

**Status:** `AUTOMATED_VISUAL_CANDIDATE` · **FOUNDER_REVIEW_REQUIRED**  
Not EXACT. Not FOUNDER_ACCEPTED. Not FROZEN.

---

## A. HOLD

Confirmed.

## B. Branch / HEAD / tree

| Field | Value |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| HEAD | `cb1bd43` |
| Tree | Dirty; First Run / Promise untouched |

## C. Runtime identity

| Field | Value |
|---|---|
| Vite PID | `42907` |
| cwd | `apps/opal_web` |
| Start | Tue Aug 25 23:25:44 2026 |
| Proof | Authenticated member Home on `:5173` |

## D. Exact root cause of 86-card / 62-clone defect

**Proven classes: E + D (+ signal flood)**

1. **`isFounderSeedEnabled()` defaulted to `true`**  
   Authenticated production Home stayed in `FOUNDER_FIXTURE` even with a real session.

2. **When seed on, `OpalApp` skipped `loadProductionHomeOwners`** and set `productionOwners = null`.

3. **`fixtureExtras` appended `consequenceCardsFromSignals(liveSignals)`** into the fixture stream.  
   Founder account has **~118 conversations**. Many with place/when → each became an identical-looking  
   `Conversation became a Graph` card (`id: consequence-{conversation_id}`).

4. Result: ~22 seed + ~60 signal consequences + durable memories ≈ **86** cards, **~62** consequence clones.  
   Mode attribute: `FOUNDER_FIXTURE` (audit).

**Not:** React StrictMode double-mount, pagination overlap, or server returning 62 identical Home objects.  
Server `/home/feed` returns memories; the clone wall was **client fixtureExtras + seed default**.

## E. Before / after feed composition

| Mode | Before | After |
|---|---|---|
| Authenticated default | FOUNDER_FIXTURE · **86** · consequence **62** | **PRODUCTION_HYDRATION** · **46** · consequence **≤6** · memory 40 |
| Explicit `?opal_founder_seed=1` | (same leak) | FOUNDER_FIXTURE · **26** · consequence **1** · memory 15 · graph 6 · discovery 2 · near 1 · live 1 |
| Duplicate React testids | present risk | **0** |

Evidence: `runtime/AFTER_COMPOSITION.json`

## F. Production / fixture firewall proof

| Check | Result |
|---|---|
| Seed default | **false** (opt-in only: env `true` or `?opal_founder_seed=1`) |
| Authenticated Home mode | `PRODUCTION_HYDRATION` / `production_owners` |
| Seed cards on production path | **0** (`seed-*` absent) |
| Bare signal floods into fixture | Rejected (tests + runtime) |
| `PRODUCTION_FIXTURE_LEAK` | **0** on default authenticated route |

## G. Ranking / hydration preservation

- `composeHomeFeed` retained  
- `rankEligibleFeed` retained (+ stronger consequence diversity penalties / consecutive-kind soft cap)  
- `diversifyConsequenceCards` added (max 6; prefer rich alignment projections)  
- No hardcoded “always 7 cards”  
- No Figma-array replacement of HomeFeed

## H. Header — `618:48`

| Item | Status |
|---|---|
| Profile · Search · Needs You | Present |
| No wordmark / no bell | Present |
| Markers | `data-figma-node="618:48"` |
| **AUTOMATED** | MINOR_DIFF → candidate |
| Founder | REVIEW_REQUIRED |

## I. Stories — `618:59`

| Item | Status |
|---|---|
| Your Story first cell + add badge | **Present** |
| Detached corner + | **Removed** |
| Visible STORIES label | **Removed** |
| One horizontal row | Present |
| **AUTOMATED** | MAJOR_DIFF repaired → candidate |
| Founder | REVIEW_REQUIRED |

## J. Conversation → Graph

Signature object preserved (turns, alignment, shared history, Open Graph).  
Production shows up to 6 diversified consequences from live signals (richer alignment steps).  
**AUTOMATED:** MINOR_DIFF candidate · **FOUNDER_REVIEW_REQUIRED**

## K. Memory

SocialMoment path preserved; engagement owners unchanged.  
Production currently memory-heavy because `/home/feed` returns memories (server truth).  
**AUTOMATED:** MINOR_DIFF candidate

## L. Graph

Founder-seed path shows future-shape graphs.  
Production path awaits server Graph objects (not invented from fixture).  
**AUTOMATED:** CONDITIONAL on production · candidate on seed walk

## M. Discovery

Present on founder-seed walk; production depends on owners.  
**AUTOMATED:** CONDITIONAL on production · candidate on seed

## N. Carousel

| Item | Status |
|---|---|
| Root cause | No `mediaSrcs` on seed → never `is-carousel` |
| Fix | `seed-alex-carousel` with 3 mediaSrcs |
| Runtime (`?opal_founder_seed=1`) | **carousel: true** |
| **AUTOMATED** | CONDITIONAL → candidate on seed |

## O. Live

| Item | Status |
|---|---|
| Dual LIVE + VIDEO LIVE | **Removed** |
| Video broadcast | Single `● LIVE VIDEO` |
| Live domain | Not started (`permissionToStartLive=NO`) |
| **AUTOMATED** | MAJOR_DIFF repaired → candidate |

## P. Continuation / rhythm

Clone wall removed. Founder-seed stream shows dated diversity.  
Production still memory-dense (server feed composition) — not a fixture leak.  
**AUTOMATED:** MAJOR_DIFF improved · production rhythm still FOUNDER_REVIEW

## Q. Dock

Center Opal untouched. Present on member shell. Clearance not re-regressed in mobile overflow checks.  
**AUTOMATED:** MINOR_DIFF candidate

## R. Destination wiring (smoke, post-repair)

Prior audit destinations remain wired (Search, Needs You, Story create, Open Graph, Memory).  
Full 618:3288 matrix re-walk deferred to founder Home walk after visual acceptance.  
No intentional dead-tap introduction this pass.

## S. Image-density

Not byte-SHA proven for every Home media fill this pass. Material seed media use existing `/figma-v2/home-201/*-1728.png` where available.  
**OPEN** for founder sharpness review.

## T. Mobile matrix

| Viewport | Home | Overflow |
|---|---|---|
| 375 | yes | 0 |
| 390 | yes | 0 |
| 430 | yes | 0 |

## U. Compounding intelligence

| Target | Status |
|---|---|
| STATIC_PRODUCTION_HOME | Mitigated (firewall) |
| PRODUCTION_FIXTURE_LEAK | 0 |
| PARALLEL_HOME | NO |
| LOCAL_ONLY_ENGAGEMENT | Unchanged (server owners) |
| WHO/WHEN/WHERE restart | Soft interest path preserved |

## V. Security regression

No Story privacy / Journey / socket domain edits this pass.  
Visual/hydration client only. Full 6/6 not re-run (no shared server change).

## W. Console / network

Composition proof run: Home loaded; no composition crash.  
Detailed console harvest: see prior audit baseline + this runtime.

## X. Exact changed files

- `apps/opal_web/src/opalUi/founderGraphSeed.ts`
- `apps/opal_web/src/opalUi/homeHydration.ts`
- `apps/opal_web/src/opalUi/homeHydration.test.ts`
- `apps/opal_web/src/opalUi/homeFeedRanking.ts`
- `apps/opal_web/src/opalUi/GraphSocialHome.tsx`
- `apps/opal_web/src/OpalApp.tsx`
- `apps/opal_web/src/styles.css`
- `apps/opal_web/src/brand/brand.ts`
- `apps/opal_web/src/opalUi/graphSocialHome.test.ts`
- `apps/opal_web/src/brand/brandMark.test.ts`

## Y. Evidence directory

`docs/evidence/v2-coded-experience/brand-v4-coherence/p0-03-home-repair/`

## Z. Founder Home URLs

Production (firewall):

```
http://127.0.0.1:5173/
```

Dated grammar walk (explicit seed):

```
http://127.0.0.1:5173/?opal_founder_seed=1
```

## AA. STOP

**STOP.** Do not begin Communication.  
First Run remains FROZEN.  
Await founder Home walk.

---

### Note for founder

Default authenticated Home is now **production hydration** (memories + bounded consequences).  
To review the **618:44 visual grammar** (Conversation / Graph / Discovery / Carousel / Live), use:

`?opal_founder_seed=1`

That is an explicit opt-in, not a silent leak.
