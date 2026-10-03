# Physical phone contradiction — recovery checkpoint

**Date:** 2026-10-02 / 2026-10-03 UTC  
**Status:** AUTOMATION GREEN — FOUNDER_WALK ready (ONE walk only)  
**MERGE:** NO · **LIVE:** NO · **A8:** HOLD · **TRACK_B:** RED

## Founder evidence that blocked handoff

| Surface | Evidence |
|---------|----------|
| Graphs | All / Action / Ready only — Past filter not visible |
| Graphs | Fort Oak first / not clearly Past |
| Chats | `shell-geo unread 1791002354775` on Walk A |
| Thread | Oversized cyan Find a time on historical Fort Oak |
| Graph Detail | Travel time unavailable + North Park for past event |

## Laws frozen

- `PAST_IS_ACCESSIBLE_NOT_PROMINENT`
- `RUNTIME_PROVENANCE_REQUIRED` / `FOUNDER_TESTS_UNKNOWN_RUNTIME=0`
- `FOUNDER_IDENTITIES_NOT_AUTOMATION_ACCOUNTS`
- `DESTINATION_IDENTITY_REQUIRED_BEFORE_JOURNEY`
- `USER_LOCATION_PRIVATE`
- `SCREEN_NOISE_BUDGET`
- Past Shared Reality ≠ attendance ≠ Durable Memory ≠ Published Memory (unchanged)

## Fixes applied (dirty atop `fc1572a`)

1. **Runtime provenance** — `GET /api/dev/runtime-authority` + `window.__opalRuntimeAuthority`
2. **Graphs Past** — Past chip + horizontal nowrap scroll; past ranks last in All
3. **Past Graph Detail** — no travel/leave-by/location essay; quiet View place
4. **Find a time** — suppressed for past strands
5. **PlaceIdentity** — Text Search / recorded Fort Oak → Mission Hills + 1011 Fort Stockton Dr + coords
6. **Fixture** — shell-geo deleted; shell proof deletes seed after run; FIXTURE_GENERATION_ID
7. **Chats** — past consequence muted as Earlier together

## Verification loops

See `PHYSICAL_CONTRADICTION_CONTRACT.json` and suite logs under `/tmp/opal_loop*.log`.

## Founder URL gate

`PHYSICAL_CONTRADICTION_CONTRACT.json` → **ok=true, failures=0** across 390×844 / 393×852 / 430×932.

Founder URL (after this checkpoint push + Vite serving this SHA):

`http://192.168.86.156:5173/?opal_native_host=1`

Walk B · `+12025550102` / `222222`

Hard-refresh once. Confirm served runtime via console `window.__opalRuntimeAuthority` or `GET /api/dev/runtime-authority`.
