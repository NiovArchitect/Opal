# GYROSCOPE — Repair #13 (W6: structural prevention)

**Branch:** `muse/repair-13-w6` · **Date:** 2026-10-16
**Purpose:** the founder's standing order — end the break-fix-break cycle. These
are structural mechanisms that make whole CLASSES of breakage impossible, not
individual patches. Coherence is enforced at the state layer so the system
self-stabilizes: the gyroscope.

**Status:** machine-proven, pending founder phone walk (as always).

---

## 1. The transition gate — `OpalCore.SocialFlow.PlanTransition`

One module owns every plan / proposal / revision STATUS transition in the
SocialFlow domain: `apps/opal_core/lib/opal_core/social_flow/plan_transition.ex`.

Two integration shapes:

- **`transition(entity, from, action)`** — pure predicate. `{:ok, to_status}`
  when the move is legal, `{:error, :illegal_transition}` otherwise.
- **`guard_changeset(changeset, entity, action)`** — wraps an Ecto changeset
  that intends a status write. The gate owns the target: the attempted status
  must EQUAL the table's answer for `(from, action)`; a writer naming any
  other target is a contradiction and the changeset is marked invalid, so
  `Repo.update/insert` returns `{:error, changeset}` and the row never
  commits. Non-status writes (title, venue, alignment) pass through untouched.

Illegal transitions — accept-on-cancelled, change-on-completed,
convert-on-dismissed, confirm-without-proposal, propose-on-terminal — are
refused by the GATE, not by a scattered guard at one call site. F12-62
("terminal plans are terminal") is the prototype this generalizes: `cancelled`
and `completed` plans have no outbound transitions in the table, so a stale
accept can never resurrect them — structurally, not by one more `if`.

### The transition table (complete — this is the whole table)

**Plans** (`tentative → agreed → changed`, terminals `cancelled`, `completed`):

| from | action | to | who |
|---|---|---|---|
| — (create) | `:create` | `tentative` | chat/center tentative creators, fold upsert |
| — (create) | `:create_agreed` | `agreed` | proposal conversion, Journey track birth |
| `tentative` | `:agree` | `agreed` | trip-leg unanimous accept |
| `tentative` | `:change` | `changed` | schedule edit on a tentative plan |
| `tentative` | `:cancel` | `cancelled` | lead cancel, dedupe |
| `agreed` | `:change` | `changed` | revision accept, lead schedule edit, Journey material change |
| `agreed` | `:cancel` | `cancelled` | lead cancel, cancel-revision accept |
| `agreed` | `:complete` | `completed` | reserved — declared, no current writer |
| `changed` | `:change` | `changed` | (idempotent) |
| `changed` | `:cancel` | `cancelled` | lead cancel, cancel-revision accept |
| `changed` | `:complete` | `completed` | reserved — declared, no current writer |
| `cancelled` | any | — | REFUSED (terminal) |
| `completed` | any | — | REFUSED (terminal) |

**Proposals** (`proposed/visible → approved_for_coordination → converted`,
terminals `dismissed/expired/superseded/converted`):

| from | action | to | who |
|---|---|---|---|
| — (create) | `:create` | `visible` | AI-extract insert |
| `proposed`/`visible` | `:approve` | `approved_for_coordination` | approve_coordination |
| `proposed`/`visible`/`approved_for_coordination` | `:dismiss` | `dismissed` | dismiss_proposal |
| `proposed`/`visible`/`approved_for_coordination` | `:convert` | `converted` | proposal → plan conversion |
| `proposed`/`visible` | `:supersede` | `superseded` | new proposal supersedes open ones |
| `proposed`/`visible`/`approved_for_coordination` | `:expire` | `expired` | lazy TTL enforcement |
| terminals | any | — | REFUSED |

**Revisions** (`proposed → accepted/rejected`, terminals
`accepted/rejected/expired/superseded`):

| from | action | to | who |
|---|---|---|---|
| — (create) | `:propose` | `proposed` | propose_revision, propose_cancel_revision |
| — (create) | `:accept_direct` | `accepted` | lead direct edit (born accepted, self-approved) |
| `proposed` | `:accept` | `accepted` | respond_to_revision (all approvals in) |
| `proposed` | `:reject` | `rejected` | respond_to_revision (a reject vote) |
| terminals | any | — | REFUSED |

Honesty notes (deliberate, not gaps):

- `completed` (plan) and `expired`/`superseded` (revision) are DECLARED
  statuses with no current writers. They have no legal INBOUND transitions —
  a future writer adds a table entry AND a test first. Declaring the status
  without the transition is a bug the gate catches, by design.
- `update_all`-style writers that cannot pass a changeset through the gate
  (`supersede_open_proposals!`, `persist_expired_mark`) derive their filters
  from `PlanTransition.from_statuses/2` — the filter can never drift from the
  table.

### Call-site registry (every production writer wired)

| Entity | Writer | Action |
|---|---|---|
| plan | `SocialFlow.cancel_plan/1` | `:cancel` |
| plan | `SocialFlow.apply_locked_revision/6` | `:change` / `:cancel` (by revision kind) |
| plan | `SocialFlow.change_plan_schedule/1` | (no status write; revision is `:accept_direct`) |
| plan | `SocialFlow` tentative creators (conversation + Center) | `:create` |
| plan | `SocialFlow.maybe_create_shared_plan_from_option/1` | `:create_agreed` |
| plan | `ConversationAlignment.upsert_plan/2` | `:create` / `:create_agreed` (fold lock state) |
| plan | `ConversationAlignment.reconcile_conversation_plans/1` | `:cancel` |
| plan | `JourneyAuthority.material_change/3` | `:change` |
| plan | `JourneyAuthority.create_journey_plan/1` | `:create_agreed` |
| plan | `Trips.do_agree_trip_leg_plan/1` | `:agree` |
| plan | `Trips.do_create_plan_from_leg/3` | `:create` |
| proposal | `SocialFlow.insert_plan_proposal/1` | `:create` |
| proposal | `SocialFlow.approve_coordination/1` | `:approve` |
| proposal | `SocialFlow.dismiss_proposal/1` | `:dismiss` |
| proposal | `SocialFlow.maybe_create_shared_plan_from_option/1` | `:convert` |
| proposal | `SocialFlow.supersede_open_proposals!/1` | `:supersede` (via `from_statuses`) |
| proposal | `SocialFlow.persist_expired_mark/1` | `:expire` (via `from_statuses`) |
| revision | `SocialFlow.insert_revision_tx/6` | `:propose` |
| revision | `SocialFlow.respond_to_revision/1` | `:accept` / `:reject` |
| revision | `SocialFlow.change_plan_schedule/1` | `:accept_direct` |
| revision | `JourneyAuthority.material_change/3` | `:accept_direct` |

Out of scope (documented, not gated):

- `GroupSharedPlan` / `GroupPlanProposal` / `GroupPlanRevision`
  (`collective.ex`) and `FamilyPlanRevision` (`family.ex`) — separate group /
  family lifecycles with their own tables; a future gyroscope pass should
  give them the same treatment.
- `founder_graph_commitment_seed.ex` — demo seed fixtures, quarantined by
  design (STATE_AUTHORITY seed/demo quarantine); seeds are not production
  writers.
- `PlanMemory` (`intelligence/event_subscriber.ex`) — the intelligence
  layer's own plan-memory table, downstream of SharedPlan via events; its
  lifecycle is event-driven, not transition-driven.

### Behavior changes the gate introduced (all intentional, all tested)

1. **Propose-on-terminal refused at birth** — `propose_revision/1` and
   `propose_cancel_revision/1` on a `cancelled`/`completed` plan now return
   `{:error, :invalid_status}`. Previously the revision was created doomed
   (F12-62 made acceptance refuse it) — a dead proposal the UI could render
   as pending.
2. **Schedule change on `completed` refused** — `change_plan_schedule/1`
   previously refused only `cancelled`; now any terminal plan. A completed
   plan's schedule is history.
3. **Journey material change on a terminal plan refused** — previously a
   lead's `material_change` on a cancelled plan would flip it back to
   `changed` (a second F12-62-class resurrection the gate kills).
4. **Trip-leg re-agreement is a no-op** — `agree_trip_leg_plan_if_unanimous/1`
   on a `changed` leg plan returns `:already_agreed` instead of flipping
   status backward to `agreed`.
5. **Double-convert structurally refused** — the proposal `:convert` gate
   means a raced second conversion hits an invalid changeset (transaction
   rollback) even if the lock check ever missed.

### Invariant list (the gyroscope's laws)

1. Terminal plans are terminal: no outbound transition from
   `cancelled`/`completed`, on any path, by any actor.
2. Terminal proposals/revisions are terminal: same for
   `dismissed`/`expired`/`superseded`/`converted` and
   `accepted`/`rejected`/`expired`/`superseded`.
3. Accept requires a proposal: `:accept` is legal only from `proposed`
   (confirm-without-proposal is unrepresentable).
4. No birth in a terminal state: creation actions yield only live states.
5. The gate owns the target: a writer naming a status that contradicts its
   action is refused (contradiction = invalid changeset).
6. One table, no drift: `update_all` filters derive from
   `from_statuses/2`; the table is tested exhaustively (every legal move
   resolves, every other combination refused).
7. One projection store: every read path reads the single store; derived
   caches name their invalidation choke point (§2).

---

## 2. Projection coherence — audit + enforcement

**Audit (2026-10-16):** every file in `apps/opal_core/lib` matching real
plan-table query patterns (`in SharedPlan|PlanRevision|Proposal` in Ecto
`from`, or `Repo.get/get!/get_by/one!` on those schemas) was read. **23
files** query plan tables; every one reads the single store directly — no
per-surface shadow copy exists. The registry lives in
`OpalCore.SocialFlow.PlanProjection.read_files/0`; the scan patterns in
`PlanProjection.scan_patterns/0` match only REAL reads (aliases, typespecs,
comments, and schema definitions do not match).

Notable readers and what they prove:

- `social_flow.ex` — `sync_for_user/2` (chat), `list_plans_for_user/2`
  (Center), `get_plan_for_user/2`, `plan_payload/1` — all from `shared_plans`.
- `conversation_alignment.ex` — the fold's `active_plan_for_conversation/1`
  and `latest_plan/1` (private) read the same rows `sync_for_user` renders
  first (F12-59 one-ordering rule).
- `center/provider_action.ex`, `center/action_orchestrator.ex`,
  `center/planning_context.ex` — venue attach / challenge handling mutate
  `title`/`location`/`alignment` on the same row (no status writes; the gate
  is a no-op for them by design).
- `trips.ex`, `journey_authority.ex` — the second authority system (W1) now
  shares the gate (§1); its reads are the same rows.
- `celebration_curation.ex`, `oracle.ex`, `messages.ex`, `opal_context.ex`,
  `artifacts.ex`, `attention_center.ex`, `follow_through.ex`, `meaning.ex`,
  `plan_agreement_taste_bridge.ex`, `plan_completion.ex`, `plan_execution.ex`,
  `temporal_habit_miner*.ex`, `intelligence/executor.ex`,
  `plan_execution_controller.ex` — read-only consumers of the single store.

**Derived projections (the one shadow that existed):**

- `OpalCore.SocialMemory.Cache` — ETS recall cache, 60s TTL, keyed
  `{account_id, conversation_id}`, caching recall built from `PlanMemory`.
  R11's runner-up: no invalidation on plan edits. **Fixed structurally:**
  `PlanProjection.invalidate_derived/2` is THE single choke point — called
  post-commit from `SocialFlow.broadcast_plan/4` (every committed chat-track
  mutation lands there per R11 task 5) and from
  `JourneyAuthority.material_change/3` (the journey track, which never
  broadcasts). Invalidation is idempotent; a miss recomputes from the
  single store.
- `StaleSuppression` (ambient ETS) — keyed by fingerprint of the inputs; a
  plan change alters the fingerprint, so it recomputes rather than serving
  stale state. Self-stabilizing; no action needed.
- `FreeBusyCache` (calendar) — already invalidated on writes
  (`calendar.ex:79`); untouched.

**Enforcement tests** (`test/opal_core/plan_projection_coherence_test.exs`):

1. **Registry test** — scans `lib/**/*.ex` with the precise patterns; FAILS
   on any unregistered reader (with instructions to register-or-remove).
   Also asserts every registered file still exists, and that no ETS insert
   anywhere caches plan-shaped values.
2. **Read coherence** — create → gate-mutate (change time) → gate-mutate
   (cancel); `sync_for_user`, `list_plans_for_user`,
   `list_plans_for_user(status: :all)`, `get_plan_for_user`,
   `active_plan_for_conversation`, `SharedPlan.to_contract/1` all agree at
   every step.
3. **Derived invalidation** — seed the recall cache for both members,
   mutate via the chat track AND the journey track, assert `:miss` for both;
   cancel, assert `:miss`; refused mutation on a cancelled plan commits
   nothing.
4. **Reader registry sanity** — every `{module, fun, arity}` in
   `PlanProjection.read_functions/0` is actually exported.

---

## 3. Journey-guard regression gate

`test/opal_core/journey_guard_test.exs` — permanent, runs on every change.
Fresh accounts per test, never fixtures. No weakened assertions.

- **JG-1** create → confirm → change → cancel → re-plan, three paraphrased
  runs (NL change phrasings differ; run 2 interleaves propose/accept first;
  run 3 proves non-lead cancel is refused).
- **JG-2** terminal ordering: cancel-then-confirm refused (F12-62),
  cancel-then-cancel → `:already_cancelled`, cancel-then-change refused,
  cancel-then-propose refused at birth (new §1 behavior), double-accept
  refused, reject-after-accept refused.
- **JG-3** venue attach journey: `extract_exact_venue` → `attach_selected_venue`
  → address + coords confirmed → the same plan read through Center's
  `list_plans_for_user` carries the venue (one projection store); peer
  visibility; plus the `:named_venue` paraphrase battery (never sticky-who).
- **JG-4** follow-up coherence: person mention → venue question stays
  `:named_venue`, including interleaved chit-chat (F12-04/05/06 class).
- **JG-5** cross-surface visibility: chat-created plan visible in Center
  list; cancel on the chat path hides it on the Center path; Center-created
  plan visible in chat sync; the canonical contract renders identically.
- **JG-6** change-time paraphrase battery (6 founder phrasings, F12-02) +
  the meridiem-less honest refusal (`{:error, :no_time_found}`, never an
  invented AM/PM).

---

## 4. Python-side evaluation — conclusion: Elixir is the right and sufficient home

**Evaluated** `services/opal_ai` (the founder's "Python algorithm if necessary"):

- `plan_extract.py` (`extract_plan_candidate`) is a **pure deterministic
  text extractor**. It receives `context_items` — message bodies only
  (`ai.ex: build_request` → `recent_message_context`; no plan state is ever
  sent). It emits *candidates* (`plan_candidate`, `revision_candidate`,
  `commitment_candidate`) with explicit uncertainty markers: "Python never
  creates authoritative agreement", "Revision requires peer approval",
  "Commitment requires explicit user confirmation in Elixir".
- `worker.py` is stateless: "Deterministic AI workers — no external
  providers, no persistence." (ROOT_CAUSE_MAP: "no cross-thread leak
  possible there.")
- A Python-side transition check would require shipping authoritative plan
  state into the stateless worker — breaking its isolation contract — AND
  duplicating the transition table in Python, creating exactly the
  two-sources-of-truth the gyroscope exists to destroy. A response-coherence
  scorer in Python would score text against state it cannot see; the Elixir
  layer already refuses illegal moves before any text is emitted.

**Decision: no Python build.** The honest architecture, already in the
codebase's own words ("Python proposes candidates only. Elixir owns
plan/commitment/reminder/revision truth." — `social_flow.ex` moduledoc), is:
Python proposes, the Elixir gate disposes. The coherence check belongs at
the state layer that owns the state. Evidence above; no code added to
`services/opal_ai`.

---

## 5. Files changed

**New:**

- `apps/opal_core/lib/opal_core/social_flow/plan_transition.ex` — the gate
  (table, `transition/3`, `guard_changeset/3`, `terminal?/2`,
  `legal_actions/2`, `from_statuses/2`, `target_for/2`).
- `apps/opal_core/lib/opal_core/social_flow/plan_projection.ex` — the
  single-projection-store registry (read files, scan patterns, read
  functions, derived projections).
- `apps/opal_core/test/opal_core/social_flow/plan_transition_test.exs` —
  17 tests: full table round-trip, exhaustive illegal-move refusal,
  terminal/creation/contradiction semantics of `guard_changeset/3`.
- `apps/opal_core/test/opal_core/journey_guard_test.exs` — 22 tests: the
  permanent journey regression gate (JG-1..JG-6).
- `apps/opal_core/test/opal_core/plan_projection_coherence_test.exs` — 6
  tests: registry scan, ETS shadow scan, read coherence, recall-cache
  invalidation, reader sanity.

**Modified:**

- `apps/opal_core/lib/opal_core/social_flow.ex` — gate wired at 13 sites;
  propose-on-terminal refused at birth (`propose_revision/1`,
  `propose_cancel_revision/1`); `change_plan_schedule/1` refuses any
  terminal plan; `supersede_open_proposals!/1` +
  `persist_expired_mark/1` derive filters from `from_statuses/2`;
  `broadcast_plan/4` invalidates the recall cache post-commit.
- `apps/opal_core/lib/opal_core/social_flow/journey_authority.ex` —
  `material_change/3` plan `:change` + revision `:accept_direct`;
  `create_journey_plan/1` `:create_agreed`.
- `apps/opal_core/lib/opal_core/social_flow/conversation_alignment.ex` —
  `upsert_plan/2` `:create`/`:create_agreed`; reconcile dedupe `:cancel`.
- `apps/opal_core/lib/opal_core/trips.ex` — `do_agree_trip_leg_plan/1`
  `:agree` (+ `:already_agreed` no-op for `changed`); `do_create_plan_from_leg/3`
  `:create`.

## 6. Verification

- New suites: **46 tests, 0 failures**
  (17 gate + 22 journey-guard + 7 projection coherence).
- Full backend suite at `--seed 0` (the R12 baseline seed): **2502 tests,
  15 failures** — every failure is in the R12 baseline's 26 (voice/Deepgram
  key-gated, metrics, virtual plan, founder seed, intent, conversations,
  pipeline, cardinality N3). **Zero new failures.**
- The 11 baseline failures that did not reproduce (relationships x4,
  multiuser/attention/coordinator x7) were shown to be order-dependent, not
  fixed by this change: run in isolation at seed 0 on the unmodified base
  tip they pass (72 tests, 0 failures). They fail only inside the full-suite
  ordering at the base tip.
- New files are `mix format`-clean. (Pre-existing files carry format drift
  from the base tip — whole-file reformatting was deliberately avoided to
  keep the diff reviewable; `mix precommit`'s format step was already
  non-clean at the base.)
- Compile: no new warnings from touched files.

---

*Machine-proven, pending founder phone walk. No merge, no production, no
Pass 2, no user-data deletion, no destructive migrations — per standing
gates.*
