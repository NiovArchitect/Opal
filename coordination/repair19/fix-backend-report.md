# Repair #19 — Wave W19-FIX-A (Backend) — Blind-Spot Fixes: Report

**Branch:** `muse/r19-fixa` (worktree `~/workspace/opal-graph/wt-r19-fixa`), off merged tip `66aa797f`.
**Not pushed.** Web untouched. Worktree left clean.

**Commits (small increments, one per item):**

| Commit | Item |
|---|---|
| `8a099923` | BS-01 migration renumber |
| `b4e080ae` | BS-03 private plan leak |
| `3b825aae` | BS-04 quiet hours, one truth |
| `32dffc4c` | BS-02 orbit gate verification + BS-09 orbit log bound (shared files) |

**Floors — both met:**

- Backend suite on the fresh-migrated DB: **`3214 tests, 0 failures`** (verbatim below). Baseline was 3,170 at R18 close; the merged R19 tip plus this wave's additions (+2 BS-03, +1 BS-02, +6 BS-04, +3 BS-09 = +12 new tests over the merged tip) account for the count.
- API regression (served contracts moved: one NEW endpoint, one additive response field): **`summary: 101/101 PASS`**.

Environment: Postgres 16 cluster on 127.0.0.1:5433 (data dir `~/workspace/pgdata-r19calls`, preserved across the wave), per-wave DBs `opal_test_r19fixa` / `opal_dev_r19fixa_fresh`.

---

## BS-01 — Duplicate migration version `20261030010001`

**Fix.** Two migrations shared version `20261030010001`: W14 orbits
(`..._add_scope_and_anchor_to_opal_conversations.exs`) and W7 graphs
(`..._r19_graphs_private_location_lock.exs`). The W7 graphs file was renumbered via
`git mv` to **`20261030010002_r19_graphs_private_location_lock.exs`**. Neither branch had
shipped anywhere, so renumbering is safe and additive. No other reference to the old
version existed in the tree.

**Proof — fresh database, end to end** (DB `opal_dev_r19fixa_fresh` created empty, then
`mix ecto.migrate`, exit 0; re-verified by direct query after a VM restart, see
Incidents):

```
 migration files on disk                 | 113
 opal_dev_r19fixa_fresh schema_migrations | count 113, distinct versions 113, max 20261030010002
 opal_test_r19fixa      schema_migrations | count 113, distinct versions 113, max 20261030010002
```

Both schema legs landed:

- **Graphs leg (20261030010002):** `shared_plans.is_private`, `shared_plans.place_lat`,
  `shared_plans.place_lon` present; tables `graph_locks` and `plan_location_shares` present.
- **Orbits leg (20261030010001):** `opal_conversations` columns present:
  `context_person_id`, `context_plan_id`, `context_conversation_id`, `anchor_type`,
  `anchor_id`, `anchor_label`, `orbit_private`, `pinned_at`, `user_archived_at`.

Full proof text: `coordination/repair19/fixa-scratch/fresh-db-proof.txt`.
(Note: two interim tool deliveries during the wave quoted "115 migrations"; that figure
did not survive direct re-query. **113** — files = rows = distinct versions — is the
verified number.)

## BS-03 — Private plan leak (`is_private` never checked on read)

**Fix at the chokepoint, plus the bypasses.** A plan with `is_private == true` is now
invisible to everyone but its creator on every direct read path:

- `SocialFlow.ensure_plan_access/2` — new first clause: private + non-creator →
  `{:error, :forbidden}`. This one guard covers plan detail, PlanHistory (rides it),
  food steps, location-share endpoints, edits/cancel/revisions, and
  `OpalConversations.plan_title_for`.
- `JourneyAuthority`'s own `ensure_plan_access/1` copy — same private clause first; and
  `ensure_plan_access_or_conversation_peer` now routes private plans through it, so
  conversation membership is **not** a shortcut around the flag.
- Bypasses that never called the chokepoint, closed directly:
  `PlanExecutionController.fetch_member_plan` (HTTP 403),
  `Artifacts.get_plan_for_user`'s local reader (`:not_found`),
  `Checkin.resolve_targets` plan-kind (participant organizer → `:not_a_member` — this is
  the check-in surface).

**Named, not closed** (recorded here rather than silently left): conversation-scoped
*aggregate* projections — ConversationAlignment / NextPlan / HomeProjection / Reveal —
are membership-gated thread surfaces with no per-viewer filter at the plan level, and
GraphPeople goal/holding projections run over previously-linked plans (the holding
projection is counts-only). A private plan can still cast a shadow in those aggregates
for users who were already parties to the thread/plan; it cannot be *read* anywhere.
Internal drivers (e.g. `PlanCompletion.drive`) were left alone — they are not read paths.
Closing the aggregate shadow is a product decision (does privateness retroactively
unhappen a shared thread's history?), not a chokepoint fix.

**Tests** (`r19_graphs_test.exs`, describe "private plan direct reads (BS-03)"):
participant denied once private on detail + history (module and HTTP 403), Journey,
food step, Artifacts (`:not_found`), check-in sweep, PlanExecution (HTTP 403),
location-share POST (403). Owner unaffected on every path; non-private participant
reads unaffected; un-privating restores reads. A second test covers a conversation plan:
conversation members who are not the creator lose reads when it goes private.

## BS-02 — Orbit gate verification (backend half)

**Fix, in the W7 pattern, one lock truth.** W14 shipped `orbit_private` + whole-orbit
write with no verification anywhere. Added:

- `OpalConversations.verify_orbit_unlock(user_id, anchor_type, anchor_id, code)` —
  validates the anchor type, requires the orbit to exist among the **caller's own**
  sessions (`user_id + anchor_type + anchor_id`, else `{:error, :not_found}`), then
  verifies the code with the ONE existing lock truth, `GraphLock.verify/2`. No second
  passcode store was built.
- Route `POST /opal/conversations/orbit-verify` (declared before the `:id` routes) +
  `OpalConversationController.verify_orbit_unlock`: **200** `%{"unlocked" => true,
  anchor_type, anchor_id}` / **403** wrong code / **404** not the caller's orbit /
  **422** invalid anchor — mirroring W7's `POST /opal/graph-lock/verify`.

**Tests** (`repair19_opalchat_scope_test.exs`, "FR-19-FIXA-BS02:…"): no lock set → 403;
wrong code → 403; correct graph-lock code (set through the W7 endpoint) → 200; another
user — even with their own passcode set — trying my orbit with either code → 404;
service-level agreement incl. `:invalid_anchor`.

## BS-04 — Quiet hours, one truth

**Fix.** New module `OpalCore.SocialFlow.QuietHours` — the single resolver. The Soul
record IS `AssistancePreference` (the Soul room reads/writes it; there is no parallel
store, and none was created). The contract, documented in the moduledoc:

- Window = stored `quiet_hours_start` / `quiet_hours_end` ("HH:MM"), judged at
  **minute precision** in the stored `timezone`, taken literally (a stored "UTC" is UTC).
  Overnight windows wrap midnight.
- **EDGE RULE: `start == end` = DISABLED — never quiet.** (One pre-existing consumer
  read the same value as "quiet all day"; that reading is retired everywhere.)
- No preference row / unparseable value → product default 22:00–08:00 in
  America/Los_Angeles. A timezone that cannot be loaded falls back to the fixed-offset
  approximation set the attention budget already carried.

**Consumers rewired to it:**

- `NotificationIntelligence` — its quiet-hours answer now comes from the resolver;
  `quiet_window/1` returns the stored window's hours for DigestWorker.
- `DigestWorker` — local hour via the resolver instead of a hardcoded LA shift.
- `FollowThrough.quiet_hours?/2` → `QuietHours.quiet_now?(pref, now)`; the old
  UTC comparison and its private `parse_hm` are deleted.
- `AttentionBudget.in_quiet_hours?/2` → `QuietHours.quiet_at_local?/2`, keeping its
  travel-aware local clock; its hour-only window parsing and `@quiet_start/@quiet_end`
  are deleted.
- `CheckinSuggestion`'s quiet gate — now takes the organizer and asks the resolver
  (was a hardcoded 8–22 window in America/Los_Angeles).

**Tests** (`quiet_hours_test.exs`, 6 tests): stored window/timezone read-back;
minute precision + overnight wrap in America/New_York (discriminating instants at both
edges); the edge rule agreeing across the resolver, record-in-hand, and local-clock
entries; no-pref default; push consuming a stored 21:30–07:30 window
(`quiet_window(user) == {21, 7}`); `in_window?` core cases.

**A real bug this wave's regression caught in my own new code:** the record-in-hand
clause of `quiet_now?/2` was defined *below* the catch-all clause, which shadowed it —
the pref entry always answered `false`. The pre-existing follow-through test
("quiet hours suppress even when force_due") failed on it; the clause is reordered,
with a comment pinning the order, and the quiet-hours tests now assert the **positive**
case through the record-in-hand entry (previously only a `refute` exercised it, which
the bug was invisible to). Consumer batch after the fix: **190 tests, 0 failures.**

**Grep proof — no hardcoded windows left** (full output in
`coordination/repair19/fixa-scratch/grep-proof.txt`):

- `@quiet_start` / `@quiet_end` remain **only** in
  `lib/opal_core/intelligence/proactive_conversation.ex` — the named divergence below.
- No `{22, 8}` window literal remains anywhere in `lib/`. Remaining `sleep_bias` hits
  (extractor / feedback_loop / llm_respond / reasoner) are vibe-profile plumbing for LLM
  hints, not quiet-hours windows.
- Remaining quiet-adjacent literals, each explained: the resolver's own defaults
  (22:00–08:00 / America/Los_Angeles — the one helper, by design); AttentionBudget's
  `:quiet_hours_defer_8am` (a denial-reason **atom** in the served contract, not a
  window) and its `@default_tz` / `fixed_offset_hours` (clock machinery for the
  travel-aware local clock, not a window); CheckinSuggestion's moduledoc line
  "quiet hours 08:00-22:00 organizer-local", which describes
  `ProactiveConversation.maybe_initiate/5`'s own gates — the divergence below.
- Resolver callers (the complete set): `attention_budget.ex`,
  `push/notification_intelligence.ex`, `push/workers/digest_worker.ex`,
  `social_flow/checkin_suggestion.ex`, `social_flow/follow_through.ex`, `quiet_hours.ex`.

**NAMED DIVERGENCE — not flattened: `ProactiveConversation`.** Its moduledoc records a
distinct, founder-tunable **sender-side initiation curfew** as product law ("never
before 8am or after 10pm owner timezone", `@quiet_start 8` / `@quiet_end 22`) — a
curfew on Opal *starting* a thread, deliberately independent of the window the user
sets for being *disturbed*. It does not consume the resolver, by design; the resolver's
moduledoc names the exception. Flattening it would also have broken pinned tests
(`repair16_proactivity_test.exs`, `checkin_suggestion_test.exs`) whose fixtures set an
artificial stored window for determinism — evidence the two laws are intentionally
separate.

**One correction to the finding's framing, for the record:** push did not carry a
literal hardcoded 22–8 constant. `NotificationIntelligence` *derived* its window from
the user's vibe-profile sleep bias (late → 0–9, early → 21–7, else 22–8). The effect
was the same class of divergence (a second, stored-window-independent truth), and it
is deleted; but the mechanism was sleep-bias-derived, not a literal constant.

## BS-09 — Orbit log query bound

**Fix.** `OpalConversations.list_sessions/2` (the query behind the Orbits log):

- Server-side bound: new `:limit` opt (default **200**, clamped at 500) and `:offset`,
  applied in SQL via `sessions_base_query/2` (also carries `:person_id` and the internal
  `:conversation_id` filter); new `count_sessions/2`.
- Previews no longer load full bodies: a `row_number()` window subquery picks one row
  per conversation, selecting `left(ltrim(body), 81)` in SQL; the existing
  `session_preview/1` shaping is unchanged (verified semantically equivalent:
  trim → >80 chars → 80 chars + "…").
- `session_summary/2` now fetches through the list path filtered by `conversation_id:`,
  so a summary stays correct for a session beyond the page bound.
- Controller parses `?limit=` / `?offset=`. Response shape unchanged (`"conversations"`
  = the page) plus **one additive field**, `"sessions_total"`. The web's
  `listOpalChatSessions` reads only `conversations` — contract safe, web untouched.

**Tests** (`opal_conversations_test.exs`, describe "BS-09 bounded sessions list"):
scale fixture of 205 sessions plus one conversation with 50 long bodies (~400 chars
each). Default page = 200; `count_sessions == 205`; pages tile the whole set with no
overlap; `limit: 99_999` clamps (205 rows returned, cap 500); preview is exactly the
last message, trimmed and truncated to 81 chars ending in "…"; `message_count == 50`;
the encoded default page is < 100,000 bytes (the corpus does not ship); `session_summary`
finds a session beyond the default page.

---

## Results, verbatim

Targeted wave tests (BS-01/02/03/04/09 files):

```
39 tests, 0 failures
```

Consumer regression batches (follow-through, attention budget, notification
intelligence, check-in suggestion, proactivity, journeys, plan execution, conversation
API, artifacts, center intelligence, projections, contract suites):

```
190 tests, 0 failures
47 tests, 0 failures
19 tests, 0 failures
40 tests, 0 failures
```

Full backend suite, fresh-migrated test DB `opal_test_r19fixa` (113 migrations,
max `20261030010002`):

```
Finished in 335.1 seconds (215.8s async, 119.3s sync)
3214 tests, 0 failures
```

API regression (server from this worktree on the migrated dev DB
`opal_dev_r19fixa_fresh`, synthetic session provision, R18 Leg-7 recipe):

```
summary: 101/101 PASS, results -> /home/hatch/workspace/opal-graph/wt-r19-fixa/shots/regression/results.json
```

(`results.json` and the two suite-regenerated shot files were restored via
`git checkout --` afterwards; the API server was stopped.)

## Incidents (environment, not product)

- **VM restart mid-wave** killed the Postgres cluster. It was restarted from its
  preserved data dir (crash recovery completed cleanly); afterwards both wave DBs were
  re-queried directly and the BS-01 proof re-verified (113 / 113 / 113, max
  `20261030010002`) before any test result was trusted.
- **First full-suite attempt** hit `no space left on device` — the VM's `/tmp` is a
  512M tmpfs and the suite's temp writes (plus the run's own log, also in `/tmp`)
  exhausted it; that attempt's only failure was the ENOSPC file write, in a voice-notes
  test unrelated to this wave. The suite was re-run with `TMPDIR` on the workspace disk;
  that is the green 3214/0 run reported above.

## Posture

FOUNDER_ACCEPTED remains a founder decision; this report is machine evidence only.
Nothing pushed, nothing merged, no other worktrees touched, web untouched.
