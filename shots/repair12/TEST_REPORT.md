# TEST_REPORT — Repair #12 (R4: test, verify, evidence)

**Branch:** `muse/repair-12` · **Date:** 2026-10-16
**Provenance:** every number below comes from a test run on this worktree;
seed 0 unless noted. Full logs: `/tmp/tip_suite2.log` (backend),
`/tmp/web_opalui*.log` (web). Baselines: `/tmp/baseline_r11tip.log`
(Repair #11 tip, 4b31a52e), `/tmp/web_opalui_base.log`.

## 1. Full backend suite — zero regressions

| Run | Commit | Tests | Failures |
|---|---|---|---|
| Repair #11 tip (baseline) | 4b31a52e | 2330 | **26** (all pre-existing, enumerated below) |
| Repair #12 tip (R4, seed 0) | 45e9506d + R4 | **2456** | **26** — byte-identical list to baseline |

New tests added: 126 (R1: 38, R2: 35, R4: 53). 2330 + 126 = 2456. ✓

The 26 pre-existing failures (identical at both tips):
- Voice/Deepgram key-gated (7): `VoiceApiTest` speak/listen, `VoiceTest` listen,
  `EventDrivenTest` B4, `DeepgramEarsTest` x4 (stub transcript, audio ingestor,
  transcription_uncertain, speaker labels) — all `launchctl` :enoent on Linux.
- Relationships (4): RelationshipMatrix, RelationshipInference A8,
  RelationshipAccess A5/A6.
- MultiuserPressure/AttentionBudget/Coordinator (8): G1, E5, N3,
  ScenarioHarness 7, CoordinatorLearner C1–C4, AttentionBudget duplicate-person.
- Metrics (1): for_account/global aggregates.
- Other (6): VirtualPlan, FounderGraphCommitmentSeed, OpalIntent check_status,
  OpalConversations OC-3/OC-4, Pipeline 1.3.

**Zero failures in `social_flow`, `center`, `conversation_channel`,
`repair12_*`, or `two_user` areas. CAPABILITY_LOSS=0.**

Additional runs: R1+R2+R4 files together, seed 424242 → **126 tests, 0 failures**.

## 2. Multi-run proof table (founder: "prove it multiple times and multiple different ways")

File: `apps/opal_core/test/opal_core/repair12_r4_multirun_test.exs`

| Flow | Run | Varied input | Result |
|---|---|---|---|
| 1 create→NL change→cancel (chat NL) | 1 | "change it to 8 PM" | mutates, persists, calendar projected, cancel notifies participant ✓ |
| 1 | 2 | propose→accept→"actually let's do 8 PM" (interleaved) | 2 revisions, final label wins, cancel ✓ |
| 1 | 3 | "move it to 8pm"; non-lead cancel refused | refused honestly, lead cancel works ✓ |
| 2 direct handlers | 1 | change_plan_time → cancel | revision accepted, gyro action logged, cancelled ✓ |
| 2 | 2 | change_plan_date("Sunday") → change_plan_time("Sunday 6:00 PM") | both persist, date in alignment ✓ |
| 2 | 3 | non-lead NL → proposal → lead rejects | plan untouched ✓ |
| 3 venue search | 1 | "Find Nighthawk in Coronado" | resolves, attaches, address+coords on plan ✓ |
| 3 | 2 | "Find Nighthawk in Los Angeles" | multi-word locality ✓ |
| 3 | 3 | "Find The Henry in San Diego" (+day tail) | locality stays a place ✓ |
| 3 | 4 | 4 venue-question phrasings (do-you-know / where-is / address-of / where's) | all :named_venue, never sticky-who ✓ |
| 4 follow-up coherence | 1 | person mention → "where is The Henry in Coronado" | :named_venue ✓ |
| 4 | 2 | "where is Maya" → "do you know where Nighthawk is" | :chat then :named_venue ✓ |
| 4 | 3 | chit-chat interleaved → "what's the address of Nighthawk" | :named_venue ✓ |
| 5 change-time battery | 1–6 | "change plans with Chanelle to 8 PM", "actually let's do 8 PM", "move it to 8pm", "let's do 8:00 PM", "can we push it to 8 PM tonight", "8 PM works better" | all mutate + persist + accepted revision ✓ |
| 5 | 7 | "actually let's do 8" (meridiem-less) | **honest refusal** :no_time_found, no mutation (pinned R2 rule — no AM/PM invention) ✓ |
| 6 Center surface | 1 | list_plans_for_user | Center plan listed ✓ |
| 6 | 2 | cancel → default excludes / status:all includes | ✓ |
| 6 | 3 | stale (3-day) vs fresh plan_id | stale refused, fresh active ✓ |
| 6 | 4 | garbage label "asdf not a time @@@ | rejected, plan untouched ✓ |
| 7 location | 1–3 | San Diego / LA / NYC coords | validate, coarsen to 3dp, store, read back ✓ |
| 7 | 4 | garbage coords (8 variants) | all rejected, never stored ✓ |
| 7 | 5 | permission-denied (never granted) | :none, no crash ✓ |

## 3. N-account property tests

File: `apps/opal_core/test/opal_core/repair12_r4_naccount_test.exs`

3 fresh randomized accounts (seeded RNG: random display names, 2–4 peers,
random relationship types/edges, 1:1 + group conversations, random plan
topologies).

- **Property 1 — convergence:** shuffled op orderings (propose/accept,
  NL change by owner or peer, direct lead change) on 3 accounts. Every account
  converges: `active_plan_for_conversation` and `list_plans_for_user` agree
  with the DB row for both owner and peer. ✓
- **Property 2 — notifications:** `change_plan_time` emits `social_flow:plan`
  (schedule_change payload) + `social_flow:alignment_updated` on
  `social_flow:conversation:<id>`; `cancel_plan` emits `social_flow:plan`
  (cancelled:true) and its `notify_user_ids` equals exactly the participant
  set — on both 1:1 and group topologies. Conversation-less Center plans
  broadcast on `social_flow:user:<owner>` and notify the owner. No foreign
  topic received anything. ✓
- **Property 3 — account-agnostic:** same display name ("Chanelle") planted on
  two accounts resolves inside each account only, both directions; unknown
  names → nil (never a global stranger) — F12-56. PlanningContext and
  DeviceLocation strictly per-user keyed (F12-51/52 analogue). Venue extraction
  city-fixture-free on all accounts (F12-40). ✓

## 4. Adversarial / sinister suite

File: `apps/opal_core/test/opal_core/repair12_r4_adversarial_test.exs`

| Attack | Result |
|---|---|
| empty/whitespace/emoji/“…”/"???" NL inputs | honest error, no mutation, no revision row ✓ |
| SQL-ish / `<script>` / path-traversal labels | never mutates; stored labels are plain text ✓ |
| emoji-mixed times | handled or honestly refused ✓ |
| garbage venue extraction | nil, never invents ✓ |
| nil/non-map/wrong-type args | `{:error, :invalid}`, never raises (F12-61) ✓ |
| double NL submit (concurrent) | serializes; one row, one label, 2 accepted revisions ✓ |
| concurrent conflicting direct edits | FOR UPDATE serializes; append-only revision chain ✓ |
| double-accept (group, partial approvals) | second → `:already_decided`; plan untouched ✓ |
| stale plan_id (3 days) / cancelled plan's plan_id | not actionable ✓ |
| expired change_proposal (F12-58) | retired to history, status "expired", slot cleared ✓ |
| cancel-then-confirm | accept refused (`:forbidden`); plan stays cancelled (F12-62) ✓ |
| non-member change/propose/confirm/cancel | all refused ✓ |
| unknown plan_id | honest error, never crash ✓ |
| change on cancelled plan | refused, no resurrection ✓ |
| list_plans_for_user cross-user | never leaks ✓ |
| out-of-range/wrong-type/nil coords (8 variants) | all rejected ✓ |
| boundary coords (±90/±180) | accepted ✓ |
| haversine on garbage | nil, no crash ✓ |
| client precision | server coarsens to 3 decimals (never trusted) ✓ |

## 5. Web (vitest, R3-touched areas — src/opalUi, 97 files)

| Run | Files | Tests |
|---|---|---|
| Repair #11 tip baseline | 13 failed / 84 passed | 18 failed / 713 passed |
| Repair #12 tip (before R4 web fixes) | 16 failed / 81 passed | 22 failed / 709 passed |
| Repair #12 tip (after R4 web fixes) | 13 failed / 84 passed | 18 failed / 713 passed |

The 4 R3-caused test breaks were all brittle source-grep tests asserting
the OLD copy that R3 intentionally changed; each was updated to the new
honest contract (not weakened):
- `emptyStateQuality` — GraphsHome error testid (`graphs-home-error`) added
  alongside the empty testid (F12-12).
- `graphSocialHome` — Home return opens with a fragment wrapping the honest
  load-error state; GraphSocialHome still the shell (F12-12).
- `waveBFullLiveExact` FULL_LIVE_CURRENT_IDENTITY_COPY — fabricated
  "Sadeil + 3 are here" / "Maya is on the way · 8 min" defaults removed;
  test now asserts empty honest defaults (F12-12).
- `waveBGraphsExact` GRAPHS_CURRENT_AUTHORITY_618_674 — grammar fix
  "What's taking shape" (founder screenshot item, F12-10).

The remaining 18 failures are byte-identical to the repair-11 baseline
(pre-existing: exact-authority snapshot tests, spine em-dash in an old
comment, geometry locks, etc.).

## 6. Break-fix loop table (founder-ordered break-fix-break-fix)

| Loop | Tests run | Failures | What broke | What fixed it |
|---|---|---|---|---|
| 1 | compile | 1 warning | R1+R2+R3 merge duplicated `POST /opal/location` + `GET /opal/plans` route blocks (second GET unreachable) | removed duplicate block |
| 2 | full backend @ tip | 24 new (all in R4 files) | test-authoring: PlanParticipant needs response_state; attach returns `%{plan:}` map; NL stores parsed summary verbatim; date_label lives in alignment; group double-accept path | fixed tests; real finds → loops 3–5 |
| 3 | adversarial | 1 real | **F12-61:** nil plan_id crashed (Ecto ArgumentError) | guard clauses on cancel/change_time/change_date/respond_to_revision |
| 4 | adversarial | 1 real | **F12-62:** accept on cancelled plan resurrected it to "changed" | status check in respond_to_revision tx |
| 5 | multirun Flow 7 | 3 real | **F12-63:** put_for_user silently dropped coords (NL allowlist) | pass coords as merge extras |
| 6 | web vitest | 4 real | R3 copy changes broke brittle source-grep tests | updated tests to the new honest contracts |
| 7 | full backend @ tip | 0 new | — | 2456 tests, 26 pre-existing, byte-identical list |
| 8 | R1+R2+R4 seed 424242 | 0 | — | 126 tests green |

## 7. Non-claims (explicit)

- Phone pass: NOT_CLAIMED (founder-only; physical device required).
- Two-user channel sessions: the Repair #11 harness (11 tests) is green at
  this tip; R4's N-account tests are server-side (PubSub + API), not
  phone sessions.
- Production API 503, web host re-deploy + DNS, OAuth consent tap, Places
  enablement + billing, TestFlight: unchanged, founder-only (see BLOCKED.md).
- Geoapify provider calls: no live provider key in this environment; the
  discovery path is exercised as job-construction/dedupe, not live results.
- "Actually let's do 8" (meridiem-less): honest refusal by design (pinned R2
  rule — AM/PM is never invented). Flagged as an open design question, not a bug.
