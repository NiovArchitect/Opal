# Repair #14 — Test Report

Branch: `muse/repair-14` (from `muse/repair-13` @ `bfa854fd`).
Method: three parallel tracks (failures / hardcode / relationships), each in its own
worktree + branch, integrated by clean merges (zero conflicts), then a full-suite
verification run on the integrated tree.

## Headline result

| Run | Tests | Failures |
|---|---|---|
| Baseline (Repair #13 tip) | 2,618 | **11** |
| Integrated Repair #14 (`mix test --seed 0`) | **2,655** | **0** |

2,655 = 2,618 baseline + 13 (Track B extractor tests) + 24 (Track C relationship
journeys). Every one of the 11 baseline failures is repaired; nothing regressed.

## Per-failure verification (Track A)

| ID | Failure | Root cause | Fix | Now |
|---|---|---|---|---|
| D1 ×7 | voice/deepgram/event-driven crashes | unguarded macOS-only `launchctl` call raising `:enoent` on Linux | executable check + rescue, fall through to nil (also fixed the twin copy in `deepgram_grant.ex`) | PASS |
| D2 | "Any upcoming plans?" → `:plan_create` | plan noun outranked question form in intent chain | status questions defer plan_create unless an explicit creation verb is present | PASS |
| D3 | pipeline `nil =~ "Locked in"` | stale test asserting a claim Repair #11 deliberately removed as dishonest | test now asserts the lawful contract (action, body, no pre-emptive message) at equal strength | PASS |
| D4 | virtual plan persisted `in_person` | Center creation silently dropped `plan_type`/`meeting_link` params | params honored end-to-end (normalize, persist, reminder) | PASS |
| D5 | seed handle collision | stable IDs transposed (Nina held Alex's ID) | IDs un-transposed | PASS |

## Hardcode remediation tests (Track B)

- New `extractor_dynamic_test.exs` (13 tests): multi-word contact names resolve per-user;
  per-user isolation (user A never resolves user B's contacts); bare founder names with no
  contact/cue extract nobody; any named venue is captured as a candidate; a person is never
  labeled a place; "don't book Friday" yields no place.
- Pressure corpus: people precision **and** recall 1.0 (9/9, 0 FP / 0 FN); zero
  adversarial false commitments.
- New `GraphWhoPicker.test.tsx` (3 tests): a brand-new user sees zero fabricated people
  and an honest empty state.
- Track B branch suite: backend 2,631 tests / 11 failures (the pre-existing baseline set,
  byte-identical categories — Track A's fixes were not on that branch); web 1,081 tests /
  25 failures, failure list byte-identical to the base tree (stash comparison);
  `tsc --noEmit` error set identical to baseline; Python (`services/opal_ai`) 26 passed.

## Relationship-type proof (Track C)

24 tests in `repair14_relationship_journeys_test.exs`, 6 blocks:

| Block | Asserts | Result |
|---|---|---|
| T1 Behavior oracle | seeded profiles for all 7 types; nudge gating, lead times, proposal/invite/reminder/split copy per type | PASS |
| T2 Attention budget | casual nudges denied for business/acquaintance, granted for the other five; time-critical + own reminders break through | PASS |
| T3 Lifecycle invariance | create → confirm → change → cancel: same transitions, same notifications for EVERY type; mixed-type group (family + business + acquaintance) coordinates for all; non-lead cancel refused for every type | PASS |
| T4 Differences manifest | pre-call brief tone per type; person-card vibe_summary typed; wallet split card styled by payer's type; invite copy typed; per-recipient broadcast framing with no sibling leak; prompt depth differs by type, group mode strips intimate depth | PASS |
| T5 Edge types | `"relative"` rejected by schema, callers fail closed; unknown type fails closed, never 500; no cross-account type leakage; nil type degrades honestly (no vibe, no brief tone, no crash) | PASS |
| T6 Venue copy | `venue_lookup_copy` identical regardless of relationship type | PASS |

Types covered: spouse, partner, family, close_friend, friend, business, acquaintance
(the schema's exact 7; there is no "relative" — the schema rejects it, family covers it).
Accounts: fresh randomized, `relationship_type` explicitly set, distinct sessions.
Qualitative per-type assessment: `RELATIONSHIP_UX.md`.

## Notes

- `mix precommit` is not green at baseline (pre-existing warnings-as-errors in untouched
  `conversation_controller.ex` + pre-existing format drift); Repair #14 adds no new
  warnings and did not reformat untouched files.
- Test-run side-effect files (`shots/intelligence/EXTRACTION_VERIFY.json`,
  `shots/poc2/perf_ms.txt`) were dirtied by suite runs and reverted; not part of any commit.
- No merges to other branches, no production, no Pass 2, no user-data deletion, no
  destructive migrations.
