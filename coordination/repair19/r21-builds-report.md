# Repair #21 - Cluster W-5 report: show the declared

Branch: `muse/r21-builds`, based on `70584ad8` (muse/repair-20 tip + "Flows" label fix).
No merge performed. `muse/repair-17` untouched. One additive migration (W-5b). Plain hyphens only; no em dashes in user-facing copy.

## W-5a - The fork-answer surface

### What was wired

Backend: **no change needed, and none made.** `NonResponseEtiquette.viewer_projection/3` already carries every field the control consumes - `viewer_role`, `lifecycle_open`, `fork_available`, and `fork.state` - and the respond endpoint already existed: `POST /api/v1/product/opal/plans/:id/etiquette/respond` (`OpalConversationController.respond_etiquette`), with the web client `respondPlanEtiquette` already in `productClient.ts`. The surface is wired to that one endpoint and that one client function; there is no parallel path and the etiquette machinery remains the only decider.

Web (new): `apps/opal_web/src/opalUi/ForkAnswerControl.tsx` - a self-contained control whose exported gate `forkAnswerVisible()` renders it ONLY when the contract says `viewer_role === "recipient" && lifecycle_open === true && fork_available === true`. Copy: **"Let it go"** (the standing R20 V-5 decline word) and **"Ask for another time"**. A server refusal is rendered as the server's plain line, verbatim. On a successful answer the control hands the returned plan back to its host, so disappearance is driven by the fresh projection, not by local state.

Mounts (everywhere the fork presentation already lives):

- `apps/opal_web/src/c2/shell/C2Graphs.tsx` - Graphs plan cards, both the main group cards and the horizon cards (new optional `bearer` prop; a `forkAnswered` event is wired in `C2Shell.tsx` to the existing `refreshPlans` re-read).
- `C2GraphDetail` (plan detail) - under the card, re-read through the existing `onFoodChanged` path.
- `apps/opal_web/src/opalUi/PlanEditControls.tsx` - both branches, which is what covers `GraphDetailSheet`.
- `apps/opal_web/src/c2/shell/shellData.ts` - `cardFromPlan` stamps the plan's `etiquette` projection onto the card verbatim; `PlanCardC2Input` gains an optional `etiquette` field (type-only).

### Sharp declaration - the thread leg is NOT rendered

The fork presentation does not exist on the thread surface: thread reveals are a different system and a thread carries no plan etiquette projection. There was nowhere truthful to mount an answer control in the thread, so none was added. If a future wave puts the etiquette fork presentation on the thread, `ForkAnswerControl` mounts there unchanged - it needs only a plan id, the etiquette projection, and a bearer.

### Test evidence

- `apps/opal_core/test/opal_core_web/r21_fork_answer_api_test.exs` (4 tests, all green, re-run on seeds 1 and 999999 with the same result):
  - `fork_available` is the recipient's alone while the fork is live - the sender's projection carries `fork_available: false` with role `requester`, and a third participant who is neither party never carries it.
  - The sender cannot answer the recipient's fork through the endpoint: the attempt is refused (404 existence-hiding in practice; the pin accepts 403/404/422) and the fork stays live for its recipient.
  - The recipient's `ask_another_time` resolves the fork: afterwards no viewer's projection offers it (`fork_available: false`, fork state never `presented`).
  - On a two-person plan the same answer closes the lifecycle itself: no viewer's projection reports `lifecycle_open: true` afterwards.
- `apps/opal_web/src/c2/shell/r21ForkAnswer.test.tsx` (12 tests, all green): render-for-recipient, absence for sender / bystander / after resolution, click-through driving the `respondPlanEtiquette` client boundary, the server refusal line rendered verbatim, and presence/absence on the Graphs card and the plan detail.

### One test correction, declared

The first version of the API test asserted `lifecycle_open == false` for every viewer after one recipient answered **on a group plan**. That assertion was wrong against the machinery's own semantics, and the machinery was left unchanged: every pending participant carries their own follow-through loop (`SocialFlow.open_etiquette_requests` opens one per pending participant at plan creation), and `viewer_projection` judges the viewer's own loop first, then the requester's loops, then any open loop on the plan. While a second recipient is still unanswered, the creator's lifecycle is honestly still open (stage `awaiting`). The corrected test pins exactly that group truth on purpose, and pins lifecycle closure on the two-person shape where it is true. Fork disappearance - the W-5a contract - holds for every viewer in both shapes.

## W-5b - Group membership UI

### What was wired

Backend (`apps/opal_core/lib/opal_core/messages.ex`):

- `conversation_creator_id/1` - the conversation's creator, from the new `created_by_user_id` column; for conversations that predate the column, the earliest member on record (see the declaration below).
- `add_conversation_members/3` - multi-select add in ONE action; it reuses `add_conversation_member/3` per person, so recording and idempotency are identical and a repeat add changes nothing.
- `remove_conversation_member/3` - the admin rule: anyone may remove THEMSELVES (leave); removing someone else is creator-only and returns `:not_creator` otherwise.
- `membership_events/1` and `membership_projection/2` - the viewer-scoped projection: `can_remove` is decided server-side per member, never guessed by the surface.

Recording: every add/remove writes a Chronology `member_added` / `member_removed` moment (the orbit's durable record; the dedupe key is shared with `GroupMembership`'s existing path, so no event is double-recorded) plus AccountActivity entries for the actor and the target. `OrbitProjection` gains a `"membership_events"` field read from that record. `GroupMembership.remove_member/3` now delegates to the admin-ruled path; its old permissive removal is retired.

Migration (the wave's only one, additive): `apps/opal_core/priv/repo/migrations/20261030030200_add_created_by_to_conversations.exs` - nullable `conversations.created_by_user_id`, backfilled with the earliest member on record. The `Conversation` schema/changeset carries the field, and the creator is stamped at creation in `create_direct_conversation`, `create_group_conversation`, and onboarding `establish!`.

Endpoints (`conversation_controller.ex`, `router.ex`):

- `GET /conversations/:id/membership` - the membership projection.
- `POST /conversations/:id/members` - now accepts a `user_ids` array for the multi-select add; the existing single `user_id` shape is unchanged.
- `DELETE /conversations/:id/members/:user_id` - remove or leave; a non-creator removing someone else gets a 403 with a plain refusal line.

Web: `productClient.ts` gains `fetchConversationMembership`, `addConversationMembers`, `removeConversationMember`, `membershipWriteError`, and the membership types; the orbit contract type gains `membership_events`. New panel `apps/opal_web/src/c2/shell/GroupMembership.tsx` - member list, multi-select add with an "Add N people" action, remove/leave per the server's `can_remove`, the recorded came-and-went lines, and refusal lines verbatim. `ThreadShell` gains a quiet "People" header affordance; `ChatsHost` renders the sheet only for group threads (`selected.peers.length >= 2`) and closes the thread when the viewer leaves. `OrbitScreen` gains a quiet "WHO CAME AND WENT" card reading `membership_events`.

Orbit identity stability: a membership change never mints a new conversation or orbit id - the DataCase and API tests pin the conversation id unchanged across add, remove, and leave.

### Sharp declarations

- **There is no designated-admin model.** The model has exactly one admin: the conversation creator. No admin flag, role table, or delegation was invented; if the product later wants designated admins, that is a data-model decision for a later wave.
- **Creator truth for old conversations is a fallback, and it is honest about it:** conversations created before the migration carry the earliest member on record as creator. That is the best truth the record holds; the column is stamped directly from creation onwards.

### Test evidence

- `apps/opal_core/test/opal_core/r21_group_membership_test.exs` (DataCase): creator recorded at creation; earliest-member fallback; multi-add in one action with idempotency; the admin rule in all its cases (creator removes other, member cannot remove other, anyone leaves); events present in Chronology, AccountActivity, and the orbit projection; conversation id stable across changes; projection `can_remove` flags per viewer.
- `apps/opal_core/test/opal_core_web/r21_membership_api_test.exs` (HTTP): the membership projection over the wire, multi-add via `user_ids`, the 403 rule with its plain line, leave, remove, and `membership_events` present on the thread's orbit contract.
- `apps/opal_web/src/c2/shell/r21GroupMembership.test.tsx` (8 tests, all green): creator and member views of the panel, multi-add as one client call, remove, leave driving `onLeft`, the refusal line verbatim, the thread header affordance, and the orbit came-and-went lines.

## W-5d - In-call orbit doorway: investigated, NOT wired (deliberate)

Findings, all verified in the served tree:

- `CallSurface` (`apps/opal_web/src/opalUi/CallSurfaces.tsx`) already contains a real doorway button, correctly gated on `orbitConversationId && onOpenOrbit`.
- But the served C2 shell mounts **no in-call surface at all**: `ChatsHost.placeCall` only notes call status and re-reads the call log. There is no live call screen in the product a user can stand on.
- `CallSurface` renders only inside the legacy `OpalApp`, which `App.tsx` no longer mounts - and even there, the `callSurface` state drops `ProductCall.conversation_id`, so the doorway's gating id never arrives.

Wiring the doorway now would ship a control no user can reach - a dead button by another name - so it was not wired. The stale R20 GAP comment in `CallSurfaces.tsx` was replaced with this sharper blocker: **the C2 shell needs a real mounted in-call surface that carries the call's `conversation_id`; the moment one exists, the doorway is a one-line mount, because the button, its gate, and the scoped-orbit target all already exist.** R20's call-log-row doorway remains the reachable path in the meantime.

## Regression evidence

- Backend, R21 files: 12 tests, 0 failures (`r21_fork_answer_api_test.exs` 4, `r21_group_membership_test.exs` + `r21_membership_api_test.exs` 8).
- Backend, full touched-area batch (13 files: the R21 files plus `messages_test`, `messages_direct_conversation_test`, `non_response_etiquette_test`, `non_response_etiquette_wiring_test`, `etiquette_wiring_api_test`, `repair20_orbit_projection_test`, `orbit_sameness_test`, `orbit_self_mirror_test`, `repair20_group_orbit_scope_test`, `checkin_test`): **98 tests, 0 failures** on the final run.
- Web, affected suites: 60/60 green (`r21ForkAnswer`, `r21GroupMembership`, `etiquetteWiring`, `dropItWiring`, `c2ShellSurfaces`, `c1ShellWiring`) and 46/47 across `planEditControls`, `GraphDetailSheet.attendance`, `graphDetail`, `mistakePatternEnforcement`, `orbitVerifyContract`, `f6OrbitPrivacy`, `r19CallsHost`.
- Typecheck (`npx tsc --noEmit`): 9 errors, all pre-existing, none in W-5 code (see below).
- House rules (`apps/opal_core/AGENTS.md`): `mix format --check-formatted` passes on every Elixir file W-5 touched (one test file was reformatted by `mix format`; no semantic change). The precommit compile gate (`mix compile --warnings-as-errors`) fails at the BASE - the codebase carries many pre-existing warnings, including a double `@doc` in `conversation_controller.ex` and the multi-clause `unique_handle/2` in `onboarding.ex`, both verbatim in `70584ad8`. No warning is attributable to W-5 code; the two warnings located in files W-5 touched are the base's own, in hunks W-5 did not write.

### Pre-existing failures, proven against the base

- `OpalCore.MessagesTest` - "concurrent duplicate client_message_id remains single record" is load-sensitive on this VM: in two earlier runs (one of them the first full batch) it failed with a DBConnection sandbox checkout timeout, and in the final batch it passed. Proven not a W-5 regression either way: with all W-5 changes stashed, the unmodified base (`70584ad8`) fails the identical test with the identical error. This VM reaches Postgres through a `socat` bridge (5432 to 5433) under heavy load; the call path involved (`accept_message` / `ensure_not_blocked_in_conversation`) is untouched by W-5.
- `graphDetail.test.ts` - one navigation assertion fails. The test reads `OpalApp.tsx` and `GraphDetailSheet.tsx` as text; both files are byte-identical to the base in this branch, so the failure is the base's own.
- Typecheck: the 9 errors live in `OpalApp.tsx` (3, untouched), `YouSettingsDestination.tsx` (1, untouched), and `productClient.ts` (5 - a duplicate `plan_type`/`online` declaration inside `OpalPlanContract` that exists verbatim in the base at its lines 5454/5493). No error is in a file or line W-5 added.

## Environment notes

- The task brief's `MIX_DEPS_PATH=/tmp/opal_deps` does not exist on this VM; the runs used `MIX_DEPS_PATH=~/workspace/.opal_deps_r19` with Elixir at `~/workspace/elixir/bin` and OTP 27.3.4.2 at `~/workspace/otp/OTP-27.3.4.2/bin`.
- Postgres for the test runs: the cluster on port 5433 holding `opal_core_test`, reached through a `socat` forwarder on 5432 (the repo's test config expects localhost's default port). The forwarder is ephemeral and may need restarting (`socat TCP-LISTEN:5432,fork,reuseaddr TCP:127.0.0.1:5433`).
- Web `node_modules` in this worktree is a symlink into the sibling `wt-r21-orbit` worktree (gitignored; nothing of it is committed).
