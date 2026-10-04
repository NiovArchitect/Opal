# Phase 4B — trip domain model (trips + legs)

Foundation only: `trips` + `trip_legs` + `OpalCore.Trips`.
Does not touch outing commitment authority or SharedPlan machinery.
No FE / booking / notifications.

## Verify

- `mix ecto.migrate` / `mix ecto.rollback` / migrate again — clean
- `mix test test/opal_core/trips_test.exs` — 8/8
- A8 surface projection — 13/13
