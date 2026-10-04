# Phase 4C — trip HTTP API

Backend-only. Exposes Phase 4B trip domain over `/api/v1/product/trips*`.
Extended with `trip_participants` (PlanParticipant pattern) so create accepts
`user_ids[]` and list scopes to creator OR participant.

Did not touch JourneyAuthority, SharedPlan, or FE.
