# Physical phone contradiction — recovery checkpoint

**Date:** 2026-10-03 UTC  
**Status:** AUTOMATION GREEN — FOUNDER_WALK ready (**ONE walk only**)  
**MERGE:** NO · **LIVE:** NO · **A8:** HOLD · **TRACK_B:** RED  
**Served HEAD (proven):** `c862f5f` (+ post-commit hygiene checkpoint)

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
- `HISTORY_ENRICHES_PRESENT` — history enriches the present; it does not occupy it
- `RUNTIME_PROVENANCE_REQUIRED` / `FOUNDER_TESTS_UNKNOWN_RUNTIME=0`
- `FOUNDER_IDENTITIES_NOT_AUTOMATION_ACCOUNTS`
- `DESTINATION_IDENTITY_REQUIRED_BEFORE_JOURNEY`
- `USER_LOCATION_PRIVATE`
- `SCREEN_NOISE_BUDGET`
- Past Shared Reality ≠ attendance ≠ Durable Memory ≠ Published Memory (unchanged)

## Fixes applied

1. **Runtime provenance** — `GET /api/dev/runtime-authority` + `window.__opalRuntimeAuthority` (Vite SHA must match backend)
2. **Graphs Past** — Past chip + demotion in All; Fort Oak under Past
3. **Past Graph Detail** — no travel/leave-by/location essay; quiet View place; Mission Hills
4. **Find a time** — suppressed for past strands
5. **PlaceIdentity** — Fort Oak → 1011 Fort Stockton Dr, Mission Hills + coords
6. **Fixture** — shell-geo deleted; Walk A/B detached from automation conversations (`FOUNDER_FIXTURE_RESET_DB=1`)
7. **Chats** — residue title/preview filter; past consequence muted

## Verification

- `physical_contradiction_contract.mjs` — **ok=true failures=0** across 390×844 / 393×852 / 430×932
- Loops: ≥5 consecutive GREEN after Vite restart stamped `c862f5f`
- Mix place/PSA/runtime: 32/0
- Vitest runtimeAuthority + realChatPath + graphDetail: green
- API residue (Multi speaker / Crew with / shell-geo): **0** for Walk A/B; Fort Oak retained

## Founder URL (one walk)

`http://192.168.86.156:5173/?opal_native_host=1`

Walk B · `+12025550102` / `222222`

Hard-refresh once. Confirm `window.__opalRuntimeAuthority` / `/api/dev/runtime-authority` match the stop-report SHA before judging product.
