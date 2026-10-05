# Phase 9B — trip plan agreement → taste bridge

Closes the Journey 2 seam from 9A (`shots/p9a/SEAM_TRIP_TASTE.md`).

## What shipped

- Trip-leg plans (`source: "trip_leg"`) transition to `agreed` only when **all** participants have accept-going'd (unanimous).
- On that transition, `PlanAgreementTasteBridge.after_agreed/1` fires with lawful attrs:
  - `area` ← `trip.destination_label`
  - `cuisine` / `vibe` / `price` ← `leg.place_ref` pack fields only
- FE `onAddSuggestion` persists pack fields in `place_ref` (never invents cuisine from name).
- 5A bridge extract logic unchanged. Regular conversation plan agreement unchanged.

## Evidence

| File | What |
|------|------|
| `mix_test.log` | trips_taste_bridge + phase9a J2 + 5A bridge — 19/19 |
| `fe_test.log` | GraphsTripsSection — 13/13 |
| `a8_surface_regression.log` | SurfaceProjection — 13/13 |
| `no_score.txt` | `no_score_ok` |
| `live_chain.json` | Live API: one accept tentative → both agreed |
| `db_taste.log` | Live plan alignment + taste candidates |
| `VERIFY.json` | SHA parity + check rollup |
| `REPORT.md` | Narrative |

## Laws held

- Unanimous accept required (no auto-agree on create / first accept).
- Never invent taste from `place_label` text.
- 5A "never invent" extract unchanged.
