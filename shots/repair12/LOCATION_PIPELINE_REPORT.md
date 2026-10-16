# LOCATION_PIPELINE_REPORT — Repair #12 (extends Repair #11 F07)

**Branch:** `muse/repair-12` · **Date:** 2026-10-16
**Method:** direct code reads at the repair tip + regression tests
(`repair12_r2_test.exs` F12-11, `repair12_r4_multirun_test.exs` Flow 7,
`repair12_r4_naccount_test.exs` property 3). This extends (not replaces)
`shots/repair11/LOCATION_PIPELINE_REPORT.md`.

## What changed: the pipeline is now WIRED end to end

| Stage | Repair #11 | Repair #12 (this pass) |
|---|---|---|
| OS permission | NOT_WIRED (mobile); partial (web) | **WIRED** — mobile `deviceLocation.ts` (expo-location ~18.1.6, SDK 53): explicit permission request surface, cached coarse fix, honest nulls on deny/failure (F12-11a). Web: geolocation callback POSTs coarse coords (F12-41). |
| Coords into the send payload | NOT_WIRED | **WIRED** — `message:send` accepts optional `coords`; server validates + coarsens + stores per user, best-effort (never fails the send). Invalid blobs ignored+logged (F12-11b). |
| Durable store | — | **WIRED** — `Center.DeviceLocation` on `PlanningContext` (per-user). R4 found and fixed F12-63: the write path silently no-op'd through the NL-entity allowlist; now persists verbatim via merge extras. |
| Origin concept | ABSENT | **WIRED** — single `origin_source` invariant: `device` / `manual` / `named_destination`, threaded through job request, action_state, message metadata (F12-11f). |
| "Near me" | honest gate only | **WIRED** — opens a real device-anchored nearby search when coords exist; honest gate when absent (F12-11d). |
| Distance computation | ABSENT | **WIRED** — `DeviceLocation.haversine_km/4` + `distance_label/4` ("0.8 mi away"); device-anchored discovery paints real distances; non-device origins never fabricate (F12-11e). |
| Origin indicator | NOT_WIRED | WIRED at the data layer (`origin_source` on job/action/message). UI surfacing of the indicator is thin — noted below. |
| travel_minutes: 18 fabrication | SUSPECTED | **REMOVED** — web callback no longer posts fabricated travel minutes; `activateJourney` called without the claim (F12-41). |

## Privacy law (hard, preserved and tested)

- This pipeline is NOT the travel pipeline. Precise travel sharing still
  requires a time-bounded session; `travel_controller.ex` keeps its deliberate
  422 on GPS keys. Coarse device coords (3-decimal, ~110 m, coarsened
  SERVER-side — client precision never trusted) are for venue ranking only.
- Coords are never persisted to the user profile, never shared, and go stale
  after 24h (`get_for_user` → `:none`).
- Permission-denied → honest `:none` / gate copy; no crash, no fake location.

## What was verified (tests)

- `validate_coords`: accepts real coords, coarsens to 3 decimals server-side,
  rejects 8 garbage variants (out-of-range, wrong-type, nil, bad origin_source);
  boundary ±90/±180 accepted.
- Round-trip: validate → coarsen → `put_for_user` → `get_for_user` returns the
  same coarse map for 3 cities (F12-63 regression).
- Per-user keying: account B sees none of account A's coords or planning
  context (F12-51/52 analogue).
- Stale: coords older than 24h read as `:none`.

## Honest gaps remaining (not fixed, not faked)

1. **Live provider results:** no Geoapify key in this environment, so the
   device-anchored search is verified at job-construction/dedupe level, not
   against live venue results. The ranking math (haversine) is unit-tested;
   the provider round-trip needs a keyed environment or the phone walk.
2. **UI origin indicator:** `origin_source` is threaded through data and
   metadata, but a visible device-vs-manual indicator on every venue card is
   thin — the every-asset-benefits audit should confirm each surface paints it.
3. **Physical permission flows:** the mobile permission sheet and web
   geolocation prompt are code-complete but unexercised on a real device —
   phone-pass territory (NOT_CLAIMED).
4. **Travel pipeline:** untouched by design (422 law stands).
