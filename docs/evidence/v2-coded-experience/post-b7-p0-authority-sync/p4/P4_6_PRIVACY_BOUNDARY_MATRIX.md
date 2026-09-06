# P4.6 Privacy Boundary Matrix (DI)

| Data | Postgres | Python | Kafka payload | Phoenix/API shareable | Group UI | Provider query |
|------|----------|--------|---------------|----------------------|----------|----------------|
| Private budget amount | may store | must not dump | forbidden | **no** | **no blame** | no |
| Private vibe preference | may store | aggregate only | ids/state | abstract tradeoff only | no who-caused | no |
| Exact lat/lng | purpose-bound | minimize | prefer area/geohash | coarse only | not peer exact | min for search |
| Relationship history | authorized | not raw | no | no | no | no |
| Call transcript | separate | no unrestricted | no | no | no | no |
| Tradeoff axis labels | yes | n/a | axis id | shareable labels | yes (no blame) | n/a |

**Target:** `PRIVATE_CROSS_BOUNDARY_LEAKS = 0` on DI shareable path. OSM/Google queries: party_size + location only — no names.
