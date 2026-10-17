# Repair #16 — TEST REPORT

All gates below were run BY THE COORDINATOR on the merged `muse/repair-16`
tree (five worker branches merged with zero conflicts, plus one integration
fix, F16-19). Worker-reported numbers were treated as claims, not evidence —
mid-cycle the VM was replaced, /tmp filled, and Erlang/Postgres were lost
and restored; one worker's environment produced stale-beam results that hid
a real defect (F16-19). Base for every comparison: `0abf24a4` (Repair #15
tip).

## Regression gates (explicit)

### Backend — full suite
- Merged tree: **2,799 tests, 3 failures** (`mix test --seed 0`).
  Count accounting is exact: 2,713 base + 86 new R16 tests (W1 17, W3 18,
  W4 33, W5 18).
- The 3 failures are the pre-existing wall-clock trio, all quiet-hours
  sensitive (`AttentionBudget` converts to US Pacific and denies routine
  work 22:00–08:00; this run executed ~01:15 PDT and the failure output
  literally shows `{:denied, :quiet_hours}`):
  `ColdStartTest` "new maturity blocks routine_break; time_critical allowed",
  `Phase23FoundationTest` "2.2 Inbox fanout enqueues DeliverPushWorker",
  `CelebrationReminderWorkerTest` "7-day and 1-day milestones → urgent".
- **Control proof:** the same three files run on a pristine `0abf24a4`
  worktree in the same window: **21 tests, 3 failures — the identical set.**
  Two workers (W1, W4) independently reproduced the same base identity in
  their own base worktrees. The same tests pass inside the Pacific daytime
  window (Repair #15's full-suite run over this code was 2,713/0).
  **Net regression count: 0.** No assertion was weakened, no clock shifted.

### Repair #11–#15 test files — explicit re-run
- 26 files (all `repair11`–`repair15` suites + journey guard + projection
  coherence + R15 story/post): **407 tests, 0 failures** on the merged tree.

### Web — full suite
- Merged tree: **1,163 tests, 1,138 passed, 25 failed.**
- Pristine base, same session: **1,116 tests, 1,091 passed, 25 failed.**
- **Failing test names are byte-identical** (`diff` of the two sorted name
  lists is empty). Delta +47 tests = the R16 web tests (W1 16, W2 +19 new
  −9 covering only deleted components, W3 14, W5 +9 −2 dated-only cases),
  all passing.

### Mobile — full suite
- Merged tree: **105 tests, 104 passed, 1 failed** — the single failure is
  the pre-existing baseline failure (`native host wiring › app.json declares
  expo-notifications plugin`), identical to base.

### TypeScript
- 7 pre-existing errors before and after (OpalApp / YouSettingsDestination,
  untouched areas); **zero errors in any file R16 touched** (web or mobile).

## New tests per track

| Track | New tests | Where |
|---|---|---|
| W1 graph-create | 17 backend + 16 web | `graph_create_repair16_test.exs`, `graph_create_repair16_api_test.exs`, `graphCreateRepair16.test.ts` |
| W2 onboarding | 19 web | `apps/opal_web/src/onboarding/repair16W2.test.tsx` |
| W3 profile-gap surface | 18 backend + 14 web | `profile_gap_api_test.exs`, `ProfileGapAsk.test.tsx`, `ProfileGapCenterWiring.test.tsx` |
| W4 proactivity | 33 backend | `repair16_proactivity_test.exs`, `repair16_chat_lock_drive_test.exs` |
| W5 story media | 18 backend + 9 web | `story_media_repair16_test.exs`, `storyMediaRepair16.test.ts` |

All participant-visible behavior uses fresh randomized accounts; assertions
are on real effects (DB rows, served bytes, persisted snapshots, feed
contents, callback counts).

## Multi-run & adversarial results (founder addendum — own section)

### W1 · Durable graph-create
- **Multi-way:** 10 relationship×entry combinations (family parent /
  sibling / cousin / co_parent, close_friend, business, acquaintance,
  friend, partner, none × graphs_plus / repeat / chat_plan / contact_plan) —
  each persists, reads back for both parties, hidden from an outsider; plus
  a 5-plan interleaved-ordering run across 3 accounts with exact visibility
  partitions.
- **Adversarial: 20+ probes, all repelled, 0 crashes, 0 duplicates, 0
  leaks.** Double-submit replay ×3 calls → exactly 1 object
  (`deduplicated: true`); outsider read/list/id-guessing probes (incl. junk
  id — previously a crash, F16-04); spoofed participant create; audience
  conflicts ×5 values; stolen/ghost/deleted/junk media ×4; junk participants
  ×4 shapes; repeat-of-another's-plan → `:forbidden`, and lawful repeat
  leaves the source row + participants byte-identical. Every rejected
  create asserts zero rows persisted (nothing half-persisted mid-draft).

### W2 · Onboarding
- **Multi-way:** permission matrix — none decided, one granted (in varying
  positions), subsets in reverse order, resume-with-prior-grant; routing
  verified from every rerouted post-verify path. 60-second scorecard
  recomputed: ≈48s typical (was ≈51s), strictly not worse.
- **Adversarial (19 tests):** resume-into-removed-step probes 3/3 land on
  fr06, never blank; skip-spam (3 rapid taps) → exactly 1 challenge + 1
  verify + 1 handoff; verify-spam (3 submits) → exactly 1 verify;
  interrupted onboarding (unmount mid-verify, remount) → clean fr06, zero
  verify calls, zero fake completion; deny-all-three in varied order →
  Continue still completes and **0 rows persist as allowed**.

### W3 · Progressive ask loop
- **Multi-way:** full loop in 3 orderings (answer-first, skip-first,
  fact-already-known with zero ledger rows); answer-first across **15**
  type/subtype combos (7 types + family with all 8 subtypes) and skip-first
  across the same 15; known-first across 6. Behavior identical everywhere;
  prompt copy byte-identical across all 15 after name normalization.
- **Adversarial:** nag attacks — double/triple assess → exactly 1 ask
  payload, 1 ledger row; committed 10-way concurrent burst → 1 ledger row,
  no re-ask; a 20-way probe (throwaway, deleted after measurement) → 1
  ask, 19 proceed_without; answer-then-reassess ×3 and skip-then-reassess
  ×3 → never a second ask; skip-spam ×3 idempotent. Conflicting answers:
  durable Celebrations fact keeps the FIRST date (one row); cross-owner
  probes — owner B gets only B's own ask/skip state, A's facts never leak;
  12 invalid payloads → all 422, nothing stored, later valid answer still
  lands; 7 empty/malformed payloads → 422, zero ledger writes.

### W4 · Proactivity P1–P5 (33 tests)
- **Multi-way:** chat locks via both endpoints (place confirm, exact-time)
  and from creator vs non-creator roles; groups spanning family subtypes /
  close_friend / business / acquaintance with identical projection
  correctness; recent-change sequences (change→cancel,
  accept→change→change).
- **Adversarial:** P2 hook replay/double-fire → drive effects exactly once
  (no duplicate loops, rows, or calendar writes); recent-change forgery
  probes — non-participants can neither cause nor read entries, and no
  "rescheduled" entry exists when only a cancel occurred; P1 consent
  attacks — opt-out toggled mid-window, consent-on-but-quiet-hours, daily
  cap exhaustion → zero initiation leaks; P4 refusal assertions
  (deadline-less commitment refused, pre-execution states skipped,
  ambiguous signals register nothing); P5 non-owner reads receive no
  preparation, and owner reads are zero-delta across attention feed, TFT
  loops, proactive logs, and shell items.

### W5 · Story media
- **Multi-way:** audience matrix incl. all 8 family subtypes across
  close_circle / friends / private; varied orderings (upload before/after
  create attempts, multiple stories per author, relationship changed after
  creation — authorization is evaluated live, so revocation stops byte
  serving immediately).
- **Adversarial:** byte-access probes — outsider, signed-out, blocked user,
  former friend, expired story: all denied. Media-id cross-referencing
  (another story's / another user's id) rejected at create; non-UUID ids
  are a clean `:not_found`, never a cast crash; legacy `data:`-ref stories
  still render while tampered refs serve nothing.

### Integration-level (coordinator)
- The F16-19 syntax defect was caught only because the merged tree was
  compiled and tested from scratch; after the fix, the profile-gap
  endpoint suite + R15 family/profile suite re-ran green (38/0) and the
  full merged suite above includes them.
