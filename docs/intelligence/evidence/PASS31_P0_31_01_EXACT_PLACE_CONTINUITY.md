# Pass 31 — P0-31-01 Exact place continuity

**Product SHA:** (this commit)  
**Prior product:** `b8194a6`  
**Verdict:** **HOLD — DO NOT MERGE**  
**Scope:** P0-31-01 only (not 02/03/04, not local discovery, not Home redesign)

---

## Root cause

SPA Moment fork path:

1. `doWithPeople` invented **WHAT = "Dinner"** when caption was not coffee/jazz.
2. `realityFormingTitle` / filament hard-coded **Dinner**.
3. Forming always offered **“Where should dinner be?”** and `continueFromForming` always opened place sheet — even when Moment had **Juniper & Ivy** + `provider_place_id`.

`providerPlaceId` was retained on seed but **never treated as grounded WHERE truth**.

That is intelligence-loss: human action (Solo / With person) must reduce WHO uncertainty without reopening WHERE.

---

## Repair

| Change | Effect |
|--------|--------|
| `whatFromMoment` / `momentHasExactPlace` | No unsupported Dinner; place-named WHAT when exact place |
| `seedRealityFromMoment` | `exactPlaceGrounded`, `intentMode`, `nextGap: when` when exact |
| `shouldOpenPlaceAfterForming` | false when place grounded |
| `realityFormingPrimaryAction` | “When works?” not WHERE dinner |
| `continueFromForming` | opens **time** not place when exact |
| `presentationReopensGrounded` | test helper for INV-NO-REOPEN |

**THIS** (default when place id present) vs **LIKE THIS** (`intentMode: "like_this"`) — translation path still opens place.

---

## Proof (unit)

- Juniper Solo → place grounded, next_gap when, no place reopen, title contains Juniper not Dinner  
- Juniper + Jordan → WHO = Jordan, place remains Juniper  
- like_this → place not grounded  

---

## Unimplemented (explicit)

- P0-31-02 time tap consequence depth  
- P0-31-03 reservation → chat lineage  
- P0-31-04 group authorship chrome  
- Local discovery / continuous Home exploration architecture (reconciled only)  
- Budget composition  
- Figma social-home states  

---

## Founder corrections absorbed (not built)

- Continuous exploration may stay on Home — not forced separate product  
- Weak local graph ≠ weak Opal (local world discovery)  
- Density is signal; relevance decides  
- Ranking target = lived experience potential  
- Budget = private composition, not only financial_fit  

HOLD.
