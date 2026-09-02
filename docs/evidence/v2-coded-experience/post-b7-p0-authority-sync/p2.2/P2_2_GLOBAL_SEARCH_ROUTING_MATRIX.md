# P2.2 Global Search Routing Matrix

**Authority:** `618:2299`  
**Date:** 2026-09-02  
**Starting HEAD:** `7833cc6`  
**Law:** Same human, different intent. Call intent ≠ Search intent. No invented destinations. No soft-hint substitutes for navigation. Chevron = navigate.

## Result classes audited

| result_type | visible instances | status summary |
|-------------|-------------------|----------------|
| people | Chanelle, Maya, Nina | GREEN → Person Profile `618:1257` |
| places | Juniper & Ivy | GREEN → Graph Reality `seed-chanelle-juniper` |
| experiences | Rooftop Jazz, Oceanside Farmers Market | GREEN → Graph Realities `seed-near-rooftop`, `seed-jordan-market` |
| graphs | FOUNDER_HOME_FEED `kind=graph` (up to 8) | GREEN → exact `graph_id` = opened card |

## Matrix rows

See companion `P2_2_GLOBAL_SEARCH_ROUTING_MATRIX.json` for machine-readable fields.

### People

- Tap → Person Profile `618:1257` with correct identity
- Back → restores Search with query + category preserved (`searchReturnPending`)
- Does **not** Call immediately (entry intent = explore)

### Places

- Juniper & Ivy → `seed-chanelle-juniper` Graph Detail (CURRENT Reality owner)
- No VenueDetail / PlaceProfile invented
- Soft gate note removed

### Experiences

- Distinct from Places (own section + pill)
- Rooftop Jazz → `seed-near-rooftop`
- Oceanside Farmers Market → `seed-jordan-market`

### Graphs

- Distinct list from Places (no longer reuses Places under Graphs pill)
- Tap selected Graph → exact Graph Detail; `selected_graph_id = opened_graph_id`

## Counts

| status | count |
|--------|-------|
| GREEN | all currently visible navigable results |
| MISSING_CURRENT_AUTHORITY | 0 (no orphaned active rows after routing) |
| DEAD_TAP | 0 |
| WRONG_DESTINATION | 0 |
| DEPENDENCY | 0 |

## Back / context preservation

| field | preserved |
|-------|-----------|
| query | YES (lifted to `OpalApp.searchQuery`) |
| category / pill | YES (`searchInitialMode`) |
| scroll | PARTIAL — Search remounts; architecture does not yet persist scroll offset |
| entity identity | YES on Profile / Graph open |

## Explicit non-goals

- Do not invent Place/Venue pages without CURRENT Figma authority
- Do not route Search People into Calls Continuity
- Do not route Calls `+` into Search
