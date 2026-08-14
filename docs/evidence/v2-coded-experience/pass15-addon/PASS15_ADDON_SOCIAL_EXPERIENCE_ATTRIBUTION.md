# PASS 15 ADD-ON — Social Experience Graph + Economic Attribution

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**Base SHA:** `76de7c1` (Pass 15 provider foundation)  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 15 provider **foundation** accepted and **not replaced**.

This add-on formalizes:

**Social Moment → Experience Graph → Shared Reality seed → ProviderVertical projection → Attribution Graph → (optional SIMULATION pool)**

| Claim | Status |
|-------|--------|
| Domain provider vertical | READY (Pass 15) |
| Live SPA provider-backed Curate | **PARTIAL / NOT CLOSED** |
| Live economic attribution / payouts | **NOT CLAIMED** |
| Haversine as traffic ETA | **FORBIDDEN** |
| recorded_fixture as live | **FORBIDDEN** |

---

## PASS 15 BASELINE (PRESERVED)

1. ProviderVertical + ExternalWorldTruth canonical  
2. CollectivePlaceFit owns social fit  
3. GOOGLE_PLACES_API_KEY may be unset → recorded_fixture  
4. Travel geometric / not traffic ETA  
5. BOOKABILITY=unknown · EXECUTION=none  
6. SPA Curate still largely fixture-facing  
7. Provider failure preserves WHO/WHAT/WHEN; reopens WHERE  

---

## ARCHITECTURE

```text
Social Moment (media-primary, no BOOK/EARN)
  → Do this with your people
  → independent Reality seed (existing SocialReality path)
  → ProviderVertical (not a new provider layer)
  → ExternalWorldTruth
  → CollectivePlaceFit
  → existing Curate projection (candidatesFromProviderProjection)
  → private select / explicit share
  → [future] real provider transaction
  → AttributionGraph (causal only)
  → [later] Payout Policy
```

---

## MODELS

| Module | Role |
|--------|------|
| `SocialMoment` | Lived object; place identity; commerce-suppressed surface |
| `ExperienceGraph` | inspired_by / experienced_as / captured_as edges |
| `AttributionGraph` | causal strength, multi-hop, abstention, SIMULATION pool |
| `MomentRealityBridge` | end-to-end domain path + laws flags |
| `socialExperience.ts` | client mirror |
| `candidatesFromProviderProjection` | feed existing Curate ranker |

---

## ATTRIBUTION LAWS (LOCKED)

1. **No transaction → no economic attribution**  
2. **No recruiting payouts**  
3. **Finite hop depth** (default 3)  
4. **One bounded pool** — lineage does not grow the pool  
5. **Attribution ≠ payout**  
6. **Views/likes alone = non_causal**  
7. **Social rank ignores commission**  
8. **Multiple sources** prefer seeded Reality over last-click  
9. **Opal-as-source** may have zero creator attribution  

---

## ECONOMIC SIMULATION

`simulate_pool_split` labels **SIMULATION** / `live_payout=false`.  
Illustrative only. No tax/compliance/legal closure.

---

## TESTS

- ExUnit `social_experience_attribution_test.exs`  
- ExUnit provider vertical regression  
- vitest socialExperience + placeComposition provider projection  
- Pass 13/14/15 suites not regressed  

---

## KNOWN GAPS

1. SPA Curate still largely fixture-facing in product shell  
2. No live Google Places in default env  
3. No booking / payments / native payouts  
4. Deep-link multi-user Social Moment media CDN not built  
5. Legal/compliance for creator payouts not started  
6. Attribution is structural — live economic events not wired  

---

## V2 MERGE VERDICT

**HOLD — DO NOT MERGE.**

The Moment stays human. Economics stay underneath.  
Providers remain senses and hands.  
Social experience becomes the network — without becoming an affiliate feed.
