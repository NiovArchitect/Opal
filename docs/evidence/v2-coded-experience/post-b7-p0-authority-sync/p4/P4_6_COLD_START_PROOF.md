# P4.6 Cold Start Proof

**Scenario:** Brand-new Solo user · zero friends · zero Graphs · zero Memory · **no founder fixture**.

## Path

1. Authenticated `POST /api/v1/product/decisions/resolve`  
2. `intent=nearby_now` · lat/lng present  
3. Controller forces connected OSM for request (restored after)  
4. `DecisionIntelligence.resolve` → High / Medium / Failure honestly  
5. Global Opal: Nearby now chip → same API (`opal_cold_start_demo=1&lat=&lng=` when geo denied)

## Result (prove script)

| Field | Value |
|-------|-------|
| COLD_START_REAL_EXTERNAL | true |
| live_osm_ok | true |
| candidate_source | openstreetmap_overpass |
| outcome | HIGH (sample) |
| founder_seed_required | **false** |

## Law

Day-1 Solo value from **real world discovery** without inventing relationships.  
Warm/group history must only **delete steps**, never invent group Memory.
