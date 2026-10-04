# Phase 7A — What Opal remembers

## Backend
- `GET /api/v1/product/memory/facts` — DurablePreferenceMemory.list_for_owners
- `DELETE /api/v1/product/memory/facts/:id` — forget + candidate cleanup
- Plain labels for known value_keys; raw value when unmapped

## FE
- You hub section below "What Opal can do for you"
- Forget button (destructive coral text); empty state copy
- No new nav; no edit; no confidence/evidence exposure

## Evidence
- API 4/4, FE 3/3, A8 13/13, browser populated+empty @390/430 GREEN
