# OPAL GRAPH — COMPLETE FOUNDER-LOCKED SOCIAL SPINE

**HOLD. DO NOT MERGE.**

Baseline product SHA: `3422b94`  
This tranche completes the approved `201:5–201:10` presentation set on preserved intelligence.

---

## What shipped

| Surface | Node | Implementation |
|---------|------|----------------|
| Home | `201:5` | `GraphSocialHome` (accepted) + soft-interest fix |
| WHO | `201:6` | `GraphWhoPicker` on WHO-FAST-PATH sheet |
| People | `201:7` | `GraphPeopleThreadHeader` on real conversations |
| Live | `201:8` | `GraphLivePanel` overlay + Home live cards |
| Journey | `201:9` | `GraphJourneyCard` on Plans tab |
| Profile | `201:10` | `GraphProfilePage` on You + person overlay |
| FR01–FR04 motion | `217:*` | Staged attention choreography + reduced-motion |
| I'd go | `155:2` | **Soft interest in-feed** (does not open WHO) |
| Home continuity | `145:46` | Seed feed includes Live card + live continuation |

---

## Critical behavioral correction

**I'd go / Interested** now toggles in-place soft interest (`You are interested`).  
It does **not** open WHO.  
Stronger paths (`I want to do this` / Plan / Want this moment) still open coordination.

---

## Action matrix (summary)

| Action | Expected | Actual | Owner |
|--------|----------|--------|-------|
| I'd go | Soft interest stay in feed | PASS | GraphSocialHome local state |
| Avatar tap | Profile 201:10 | PASS | profilePerson overlay |
| Memory Like | In-place like | PASS | likedMemoryIds |
| Memory want this | May open WHO/moment | PASS | onMomentDoWithPeople |
| Near Check it out | Plans / local | PASS | onOpenPlans |
| WHO select + Continue | Existing dyad/path | PASS | WHO-FAST-PATH handlers |
| Plan from People | No WHO; find time | PASS | setFindTimeOpen |
| I'm on my way | Participant state toggle | PASS | onMyWayActive (seed Live) |
| Call/Video | Not active | PASS | showCallVideo=false |
| Create dock | Deferred | PASS | CREATE_DOCK_EXPOSED=false |

---

## Intelligence preserved

Auth, OTP, profile PATCH, dyads, realtime, P31, ReservationExecution, S1.1 Level 5 protections, speaker identity, group safety.

---

## Deferred (honest)

- Full Graph detail `145:150` product page
- Durable profile photo
- Real GPS Live tracking (not faked)
- Production ranked pagination API (continuation uses real signals when present)
- Memory auto-publish after Journey
- Call/Video media

---

## Founder walk

1. First open → FR00–FR09 (watch FR01–FR04 motion)  
2. Land on `201:5`  
3. I'd go stays in feed (Interested)  
4. Avatar → Profile `201:10` → Message → People `201:7` → Plan  
5. Plans tab → Journey `201:9`  
6. Live overlay / Live chip → `201:8`  
7. WHO sheet looks like `201:6` circles  

---

## SHA / CI

- Product SHA: `cadb62b`
- Docs tip: `56d6424`
- Remote CI: `32083570148` SUCCESS
- Local Vitest: 310+ passed (spine tests included)
- S1.1 Level 5: PASS (0 PRODUCT_FAIL)
