# Phase 9B REPORT — trip plan agreement → taste bridge

## Break closed

9A documented that `accept_going` on a trip-leg plan flipped `PlanParticipant` but left `SharedPlan.status` as `tentative`, so `PlanAgreementTasteBridge` never fired.

## Design (Thaddeus)

1. **When:** trip-leg plan becomes `agreed` only when ALL trip participants have accept-going'd (unanimous).
2. **Lawful attrs:**
   - `area` from `trip.destination_label` (always present).
   - `cuisine` / `vibe` / `price` only from `leg.place_ref` pack data.
   - Never infer from `place_label` (e.g. "Campfire").
   - Area-only is fine — 5A skips missing dimensions.

## Implementation

- `Trips.agree_trip_leg_plan_if_unanimous/1` — after participant flip, if unanimous + source trip_leg → `SharedPlan.changeset(status: "agreed")` + merge lawful alignment + `PlanAgreementTasteBridge.after_agreed` with `location: nil` (blocks catalog invent from place name).
- `JourneyAuthority.accept_going` → `maybe_agree_trip_leg_plan/1` (trip_leg only). Response includes `plan_status`.
- FE `GraphsTripsSection.onAddSuggestion` writes pack `place_ref` (`source`, `pack_entry_id`, `name`, optional `area_label` / `price_band` / `cuisine`).

## Proof

### Automated

- `TripsTasteBridgeTest`: one accept → tentative / no bridge; both → agreed + area; pack cuisine + area; manual Campfire → area only; conversation plan helper no-op + 5A still fires.
- `Phase9aIntegrationProofTest` J2 updated: full chain yields `agreed` + `taste:area:joshua tree`.
- 5A bridge suite unchanged green.
- A8 SurfaceProjection 13/13.
- FE GraphsTripsSection 13/13 (place_ref expectation).
- `no *_score` in touched product files.

### Live chain (dev BE)

```
trip → curate (Pappy and Harriet's) → add leg (place_ref with cuisine=american)
  → create-plan (tentative) → accept A (tentative) → accept B (agreed)
```

Plan alignment: `area=Joshua Tree`, `cuisine=american`, `price=$$`.
Taste candidates for owner A: `taste:area:joshua tree`, `taste:cuisine:american`, `taste:price:$$` (+ lawful `time_of_day` from plan clock via unchanged 5A extract).

## Out of scope

- No change to 5A extract.
- No auto-agree on create / first accept.
- No merge (push only).
