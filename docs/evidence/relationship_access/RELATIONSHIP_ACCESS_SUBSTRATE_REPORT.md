# Relationship Access Substrate — Evidence Report

**Date:** 2026-10-13  
**Branch:** `muse/packet-b-batch-2`  
**Authority:** `docs/authority/OPAL_RELATIONSHIP_ACCESS_MODEL.md` · `OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md` · Continuous Permission Law in `OPAL_PERMISSION_ARCHITECTURE.md`

## Hard boundaries

```text
PASS2_UNLOCKED = NO
UNDERSTANDING_CANDIDATES_ACTIVE = NO
RELATIONSHIP_INFERENCE_ACTIVE = NO
SCORING = NO
FAKE_SUCCESS = 0
```

Permission substrate is authorized. Intelligence activation is not.

## Person-agnostic clarification

Founder conversation names (Sadeil, Chanelle, …) are **examples only**.  
No hardcoded people in templates, schemas, or product defaults.  
Unit of intelligence remains **relationship + context**, not a flat person profile.

## IMPLEMENTED NOW

| Piece | Location |
|-------|----------|
| Authority: Relationship Access Model | `docs/authority/OPAL_RELATIONSHIP_ACCESS_MODEL.md` |
| Authority: Dynamic Relationship Clarification | `docs/authority/OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md` |
| Continuous Permission Law | `docs/authority/OPAL_PERMISSION_ARCHITECTURE.md` |
| Migration | `priv/repo/migrations/20261022010001_relationship_access_grants.exs` |
| Domain | `OpalCore.RelationshipAccess` (+ Grant, GraphingPolicy, Templates) |
| Product API | `/api/v1/product/relationship-access/*` |
| YOU wiring | `GraphingStandingPermissionSection` in Calls & Opal Assist |
| Center ceiling gate | `authorizeRelationshipAction` before durable `createCenterPlan` |
| use ≠ disclose | `may_use_privately?` / `may_disclose?` / authorize `disclose` flag |
| Type-change diff (no silent escalate) | `template_diff_on_type_change` / `templates/diff` |

## PROVEN NOW

| Proof | Result |
|-------|--------|
| Domain tests (10 required behaviors + name guard) | **11/11** in `relationship_access_test.exs` |
| API tests (graphing pause, use≠disclose, template diff) | **3/3** in `relationship_access_api_test.exs` |
| Total mix | **14/14 green** |
| Center FE vitest | `opalCenterLifeGraph.test.ts` **13/13** |

Required behaviors covered:

1. Standing grant persists  
2. Revocation immediate  
3. Per-relationship Graphing variance  
4. Group scope ≠ member private inherit  
5. Financial use without disclose  
6. Type change no silent escalate  
7. Global pause overrides  
8. Permission failure ≠ success  
9. Center-readable action ceiling  
10. Active?/expiry/revoke  

## ARCHITECTED FOR PASS 2

- Understanding Candidate activation path (category `understanding_candidates` reserved)  
- Signal extraction → candidate → confidence → graph object pipeline  
- Relationship season keys (`season_key` on grants)  
- Chat Graphing mode (schema + policy field; UI focuses Calls first)  
- In-call **Opal Graphing** indicator chrome (policy returns indicator contract; call UI mount deferred)  
- Other-party legal disclosure flows beyond the boolean flag  

## EXTERNAL BLOCKER

| Capability | Blocker |
|------------|---------|
| Real calendar mutation (PATCH event) | Google/Apple Calendar **provider API** + OAuth + Action ceiling `execute` + ConsentProof |
| Reservations confirm | OpenTable/Resy/SevenRooms **provider keys** + `bookings_reserve` ConsentProof + execute ceiling |
| Native call Graphing capture | OS mic/speech modules + **legal multi-party consent** UX + Track B isolation (transport untouched) |
| Live location coordination | Device OS location permission + session APIs |

## STILL MISSING

- Per-category YOU matrix UI beyond call Graphing (financial/health disclosure toggles per edge)  
- Call-session live indicator Pause/Resume chrome wired to `graphing/decide`  
- Chat Graphing YOU controls (policy field exists)  
- Progressive template-accept modal on RU-1 type change (diff API exists)  
- Runtime Playwright YOU Graphing walk (API + unit proven; browser walk optional follow-up)  

## X → GREEN matrix

| Future capability | Today | Remaining blocker (specific) |
|-------------------|-------|------------------------------|
| Call Graphing | **Permission substrate GREEN** (modes, pause, per-relationship, decide API, YOU) | Call UI indicator + OS/legal other-party consent + capture pipeline (not dump-to-memory) |
| Chat Graphing | Policy field GREEN; YOU Calls-first | YOU chat mode UI + ingest boundary |
| Calendar mutation | Access architecture exists elsewhere; Action ceiling ready | Provider API + execute grant + ConsentProof |
| Plan mutation from chat | Honest Prepare (no fake Done) | Explicit execute grant + Graph mutation path |
| Reservations | Booking foundation partial | Provider keys + execute + confirmation UX |
| Location coordination | Location & Travel Access partial | Live share APIs + relationship disclose grants |
| Spending-aware planning | Financial profile + use≠disclose | Pass 2 candidate activation (locked) + disclose controls |
| Relationship understanding | Authority + grant categories reserved | **Pass 2 unlock** + Understanding Candidates |

## Final metrics

```text
PASS2_UNLOCKED = NO
UNDERSTANDING_CANDIDATES_ACTIVE = NO
RELATIONSHIP_INFERENCE_ACTIVE = NO
SCORING = NO
FAKE_SUCCESS = 0
PERMISSION_SUBSTRATE = IMPLEMENTED
PERSON_AGNOSTIC = YES
```

## Commit hashes

- Substrate commit: `138a3638` (matches `origin/muse/packet-b-batch-2`)
