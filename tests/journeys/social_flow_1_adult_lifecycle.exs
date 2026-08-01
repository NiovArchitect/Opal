# Mix run script: SF-1 adult lifecycle against running test DB / Mix.
# Prefer: mix test test/opal_core/social_flow/lifecycle_test.exs
#
# This file documents the journey for operators; authoritative proof is ExUnit.

IO.puts("""
Social Flow 1 journey (Alex ↔ Jordan):
1. Dinner messages → social_flow_plan_extract
2. Proposal visible (not binding event)
3. Coordinate this → options
4. Both accept Thursday 7:00 → shared plan
5. Reservation commitment (private)
6. Private reminder (Jordan isolated)
7. Revision to 7:30 → Jordan accepts → lineage
8. Revoke consent → no new extract; plan intact
9. Taylor denied
See: apps/opal_core/test/opal_core/social_flow/lifecycle_test.exs
""")
