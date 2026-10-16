# REPAIR12_REPORT — final summary (R4: test, verify, evidence)

**Branch:** `muse/repair-12` · **Tip:** `eb1ca08374875f0aa6d5934f546067bbb0dff64b`
**Date:** 2026-10-16 · **Provenance:** machine-proven, pending founder phone walk

## What was broken (the founder's phone-pass gaps)

Repair #12 addressed the real gaps from the founder's first phone pass:
forming cards with no day/time, "Saturday after 10" with no AM/PM,
change-time confirms that didn't mutate the plan, venue answers with no
address, follow-up incoherence ("where is The Henry in Coronado" →
"tell me more"), Center surfaces rendering fixtures instead of real plans,
Center-created plans invisible in Graphs/Timeline/peer chat, internal states
leaking into UI, and date-night scheduling that never drove to completion —
plus the location pipeline wired end to end (device→socket→server→ranking)
and the every-asset-benefits audit across web surfaces.

R1 (backend plan coherence), R2 (venue intelligence + location pipeline),
R3 (web asset honesty + copy/time fixes) did the repairs; R4 (this pass)
proved them.

## What changed (R4's own diff)

1. **F12-61** — nil/non-binary `plan_id`/`revision_id` crashed with
   `Ecto.ArgumentError`; now honest `{:error, :invalid}` (cancel_plan,
   change_plan_time/date, respond_to_revision + catch-all).
2. **F12-62** — accepting a proposal on a cancelled plan resurrected it to
   "changed"; terminal plans are now terminal (refused `:forbidden`).
3. **F12-63** — `DeviceLocation.put_for_user` returned `:ok` but silently
   dropped coords through the NL-entity allowlist; the entire R2 location
   write path was a no-op. Now persists via merge extras.
4. **Merge artifact** — the R1+R2+R3 integration duplicated
   `POST /opal/location` and `GET /opal/plans` route blocks (compiler warned
   the second GET was unreachable); removed.
5. **Web test contracts** — 4 brittle source-grep tests updated to R3's
   intentional honest contracts (empty-state error testid, Home fragment
   wrapper, no fabricated presence defaults, "What's taking shape" grammar).
6. **53 new proof tests** across 3 files (multirun, N-account, adversarial).
7. **Evidence package** in `shots/repair12/`.

## Proof

- **Full backend suite:** 2456 tests, 26 failures — the failure list is
  byte-identical to the Repair #11 tip baseline (2330 tests, 26 failures).
  Zero regressions; 126 new tests all green. R1+R2+R4 re-run at seed 424242:
  126/126 green.
- **Multi-run:** 7 flows × 30 varied runs — create→confirm→change→cancel via
  chat NL, direct handlers, and Center surfaces; venue search in 4 phrasings;
  follow-up coherence in 3; a 6-paraphrase change-time battery; location
  pipeline across 3 cities + garbage + denied.
- **N-account:** 3 fresh randomized accounts, shuffled op orderings — all
  converge to one authoritative state; notifications participant-scoped;
  behavior account-agnostic (F12-56, F12-51/52, F12-40 regressions green).
- **Adversarial:** 24 attacks — all honest (no crash, no silent mutation,
  no fake success).
- **Web:** 97 files / 731 tests in R3-touched areas — 18 failures, identical
  to the repair-11 baseline (all pre-existing).
- **Break-fix loops:** 8 loops, all closed (loop table in TEST_REPORT.md).

## BLOCKED (founder-only, unchanged)

Physical phone pass on the right build · production API 503 restore · web
host re-deploy + DNS re-point · Google OAuth consent tap · Google Places
enablement + billing · TestFlight upload + install + device smoke · every
merge decision. Live Geoapify provider results untested (no key here).

## Explicit non-claims

Phone pass NOT_CLAIMED. Machine-proven is held as machine-proven, never as
acceptance. No actionable control is presented that cannot perform its
advertised operation. "Actually let's do 8" (meridiem-less) is an honest
refusal by design (pinned R2 rule — AM/PM never invented); flagged as an
open design question, not a bug.
