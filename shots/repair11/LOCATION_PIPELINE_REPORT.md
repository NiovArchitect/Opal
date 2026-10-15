# LOCATION_PIPELINE_REPORT — Repair #11 (F07)

**Branch:** `muse/repair-11` · **Date:** 2026-10-15
**Method:** direct code reads at the repair tip (no inherited claims).

## Pipeline: permission → provider → ranking

| Stage | Mobile (native) | Web (opal_web) | Center chat path |
|---|---|---|---|
| OS permission | **NOT_WIRED** — zero `expo-location` imports; not in `package.json` | PARTIAL — `deviceLocation.ts` wraps `navigator.geolocation`; used by onboarding + Journey sheet only | — |
| Coords into the send payload | **NOT_WIRED** | **NOT_WIRED** — `sendText` pushes `{schema_version, client_message_id, conversation_id, body, trace_id}`; web `sendMessage` posts `{body, client_message_id}` only (`opalSocket.ts:62-68`) | **NO COORDS** — Center receives body text only |
| Request construction | — | — | `ProviderAction.start_places_search` builds from **destination text / venue name only** (`center/provider_action.ex:20+`) |
| Geocoding | — | — | Server-side geocode of the destination text |
| Provider query | — | — | Geoapify, **destination-anchored**: `filter=circle:<dest_lon>,<dest_lat>,<radius>` — "no home-location bias" by construction |
| Distance computation | — | — | **ABSENT** in the Center path. The only haversine in the repo is a dead demo module (`Places.Midpoint`, zero callers, fake venues, `mode: :demo`) |
| Origin indicator in UI | — | — | **NOT_WIRED** — Center renders only "Checking {search_geography}…"; no device-vs-manual distinction exists |
| "Near me" | — | — | **HONEST GAP** — intercepted pre-search (`action_orchestrator.ex:464-465`): *"I can look for nearby ideas once location access is available."* No search is launched, no results fabricated |

## The honest gap (stated plainly)

**Device coordinates are still unwired end-to-end.** The phone never sends them,
the chat payloads have no field for them, and the Center search path never asks
for them. "Near me" degrades to an explicit, honest message instead of a fake
search. This report does not claim otherwise, and no test asserts device-coord
behavior that doesn't exist.

## What IS true (verified, preserved)

- No fabrication anywhere in the location path: no invented coordinates, no fake
  distances, no synthetic "nearby" results. Reservation truth stays honest
  (`not_requested` / `synthetic_default: true`).
- The Geoapify construction that exists is sound for what it does
  (destination-anchored radius filter from a real server-side geocode).
- `STATE_AUTHORITY.md` declares the target: an explicit `origin_source`
  (`device` / `manual` / `named_destination`) carried through the request and
  surfaced unobtrusively in UI; no distances without real coordinates.

## Flagged (not fixed in this pass)

- `OpalApp.tsx` `LocationPermissionSheet.onContinue` persists a hardcoded
  `travel_minutes: 18` despite a comment claiming geometric computation.
  **SUSPECTED fabrication-adjacent** — must be replaced with a real computation
  or an honest "unknown", not shipped as-is.

## Remaining work (owner: future location pass, after repairs are pristine)

1. Wire `expo-location` (mobile) / `navigator.geolocation` (web) behind explicit
   permission, attach coords to the send payload as an explicit `origin_source:
   device` field.
2. Thread the origin through `start_places_search`; add haversine distance from
   the real origin; render a device-vs-manual indicator.
3. Replace the hardcoded `travel_minutes: 18` with a real computation or remove
   the claim.
