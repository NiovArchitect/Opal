# Repair #24 - Cluster F (backend features) report

Worktree: `~/workspace/opal-graph/wt-r24-backendfeat`, branch `muse/r24-backendfeat` only.
Base: c74adfe3 (muse/repair-23 tip). No merge, no deploy, no Pass 2, no user-data deletion.
Commits:

- e38ffd76 - R24 WS-5+WS-6: memory step-up elevation (phone-code re-auth, gated mutations, audit) + moment tense persistence
- 33ad72ce - R24: fix StepUpElevation grant clause conflict, unique step-up device labels in test helpers (rate-limit bucket key), mix format on touched files
- 369c8507 - R24: fix shellData feed tense typing (union cast) - tsc clean

Env notes: Postgres 16 at 127.0.0.1:5433, test DB `opal_test_r24feat` created for this cluster.
Web: `node_modules` was absent in this worktree; `npm install --no-audit --no-fund` was run in
`apps/opal_web` (150 packages) before the vitest runs - noted per instructions.
Test runs on this VM are heavily contended by sibling clusters; two early runs raced on the
shared build path and produced spurious compile/module-redefinition noise. All counts below are
read from the final clean runs' output.

---

## WS-5 - Memory step-up re-auth

DISPOSITION: PARTIAL + FOUNDER-DECISION - everything that is real without a password credential
is built and pinned (elevation token, gating, audit timestamps, re-verification via the account's
actual credential). The password step-up itself cannot exist yet: **no password credential exists
in the account model; adding one is a founder identity decision.**

### Investigation (file evidence)

- Account schema: `apps/opal_core/lib/opal_core/accounts/user.ex` - fields are handle,
  display_name, notification/preference flags, deleted_at. No password, no password_hash,
  no hashed_password field. A repo-wide search for password fields / bcrypt / argon on accounts
  returns nothing (the only "password" hits are Twilio TURN credentials, log redaction lists,
  and the graph-lock PBKDF2 below). No migration ever added a password column to users.
- The account's actual credential is the phone code: `OpalCore.SocialFlow.Onboarding`
  (VerificationChallenge, digest-checked in synthetic mode, provider-checked in production SMS
  mode, via `OpalCore.SocialFlow.PhoneVerification.Provider`) verifies control of the account's
  verified phone number (`VerifiedCommunicationIdentifier` -> `CommunicationIdentifier`
  lookup_digest; raw numbers are never stored), and only then registers a DeviceSession.
  Sessions are Phoenix.Token payloads over DeviceSession rows
  (`OpalCore.Auth.ProductSession`); `ProductAuth` assigns current_user_id + current_session.
- `OpalCore.SocialFlow.GraphLock` is NOT an account credential: its moduledoc states it is a
  viewing gate for Private graphs, "NOT account security", and it was not used as one here.
- Manual memory add/delete endpoints (the gated set): POST `/memory-wallet/capsules`
  (SoulMemoryController.create_capsule), DELETE `/memory-wallet/capsules/:id`
  (forget_capsule), DELETE `/memory/facts/:id` (MemoryController.delete_fact - the
  "What Opal remembers" forget in the same Memory room).
- The web Memory room already stated this honestly (shellData.ts protection note + the
  memoryAdd test pin): "no separate password check for memory yet... your account has no
  password to check against." That copy is updated to the new truth (below).

### What was built (all real)

Backend:

- `Onboarding.start_step_up_verification/2` + `complete_step_up_verification/2`
  (onboarding.ex): a FRESH phone-code challenge with purpose `sensitive_change` (an existing
  VerificationChallenge purpose), bound_account_id = the signed-in account. Start is refused
  with `:identifier_not_owned` unless the presented number's ACTIVE verified identifier
  already belongs to that account (no challenge is created for someone else's number).
  Complete mirrors complete_verification's discipline (pending only, expiry, attempt
  ceiling, the same provider/digest code check, ownership re-check) and marks the challenge
  used - it mints NO session and NO account. A `memory.step_up.verified` AuditEvent is written.
- `OpalCore.Auth.StepUpElevation` (new, auth/step_up_elevation.ex) + migration
  `20261030030500_create_step_up_elevations.exs`: the elevation row (user_id, session_id,
  purpose `memory_mutation`, credential_kind `phone_code`, verification_challenge_id,
  granted_at, expires_at, revoked_at) plus a signed Phoenix.Token naming the row. TTL 5
  minutes; `authorize/3` requires signature + row + same account + same session + unrevoked +
  unexpired - every other shape is the same `{:error, :step_up_required}`.
- HTTP: `MemoryStepUpController` - GET `/memory/step-up` (live elevation read-back),
  POST `/memory/step-up/challenges`, POST `/memory/step-up/verify` (returns the elevation
  token; synthetic development code exposed under exactly the same test/dev flag as the
  activation flow). Every response states `"credential": "phone_code"` and
  `"password_credential_exists": false` - no password is painted anywhere.
- Gating: capsule create, capsule forget, and fact forget all require a live elevation
  (header `x-opal-step-up-elevation`, or `step_up_token` body field) and answer
  403 `step_up_required` without one. On each SUCCESSFUL gated mutation the controller writes
  the audit timestamp: an AuditEvent row `memory.mutation.capsule_created` /
  `memory.mutation.capsule_forgotten` / `memory.mutation.fact_forgotten` whose payload carries
  action, target_id, elevation_id, session_id, credential_kind, and an `audited_at` ISO
  timestamp (the codebase's existing audit pattern - `social_flow_audit_events`).
- Isolation: the elevation is account+session bound by construction (token payload, row, and
  authorize all pin uid+sid); A's elevation presented under B's session is rejected, and B
  can never start a step-up on A's number. Pinned in tests.

Web:

- productClient: `startMemoryStepUp` / `completeMemoryStepUp` / `getMemoryStepUp`;
  `createMemoryCapsule` / `forgetCapsule` / `forgetMemoryFact` accept the elevation token
  and send it as the `x-opal-step-up-elevation` header.
- Memory room (C2You): a real step-up panel in the Memory and What-Opal-remembers sections -
  phone number -> "Send me a code" (real challenge start) -> code -> "Confirm code" (real
  verify); a Confirmed line while the shell holds an elevation; honest error lines, including
  a specific step_up_required line on the add form. C2Shell YouRoute holds the token in
  memory only (state + ref, never persisted), passes it to capsule create and to both forget
  paths; a step_up_required refusal on forget keeps the confirmation armed and names the
  missing step. shellData's protection note now reads: adding/forgetting ask for a fresh code
  sent to the phone number on the account; there is no password check because the account has
  no password - the phone code is the check.

### Pins (backend, test/opal_core_web/r24_memory_step_up_test.exs - 6 tests)

- the account model has no password credential (schema-field assertion - the honesty baseline);
- capsule add without elevation -> 403 step_up_required; with elevation -> 201, and exactly
  one timestamped `memory.mutation.capsule_created` AuditEvent row;
- capsule forget and fact forget gated identically (403 without, success + audit rows with);
- wrong code -> 401 invalid_code, no elevation (GET step-up reads elevated:false), mutations
  still rejected;
- expired elevation (granted through the real grant path with a past expiry) -> 403;
- isolation: B starting a step-up on A's number -> 403 identifier_not_owned; A's elevation
  token under B's session -> 403; B's wallet holds none of A's memory.

Pre-existing suites that use the gated endpoints were updated to perform the real step-up
first (memory_api_test.exs, repair18_sm_isolation_test.exs, phase9a_integration_proof_test.exs)
- including the foreign-delete pins, which now step up as the foreign account first and still
prove the 404/no-leak answer behind the gate.

### Known consequence, stated plainly

Two other client callers ride the same capsule/fact endpoints and now receive
step_up_required until their surfaces gain the step-up panel: C2Trivia's explicit
confirm-a-fact save (client-side createMemoryCapsule) and the legacy opalUi
YouSettingsDestination fact forget. Both already surface honest error lines (no fake
success). The server-side trivia validation/correction enrichment writes through
CapsuleRead directly (not HTTP) and is unaffected - trivia_test.exs stays green.

### FOUNDER-DECISION (carried verbatim)

"no password credential exists in the account model; adding one is a founder identity decision"

Until accounts carry a password, the step-up checks the credential the account actually has:
a fresh phone code on its verified number.

---

## WS-6 - Moment tense persistence

DISPOSITION: FIXED + evidence

### Vocabulary (mirrored exactly, no second vocabulary invented)

The graph-create path's tense vocabulary is the creation walkthrough's `CreationTense`
(apps/opal_web/src/c2/shell/flows2.ts): `present` (Now) / `future` (Forecast) / `past`
(Memories). R22's declaration was that this tense "persists only on the graph-create path" -
server-side that path carries it as the plan's When words/time_label, and the moment record
had no tense field at all. The moment now stores the same three values:
`SocialMomentRecord.tenses() == ~w(present future past)`, default `"present"`.

### What was built

- Migration `20261030030600_add_tense_to_social_moments.exs` (additive only):
  `social_moments.tense`, string, NOT NULL, default "present" - existing rows take the honest
  default, which is exactly what the server always meant for them.
- Schema: `SocialMomentRecord` gains `tense` (cast + validate_inclusion against the mirrored
  vocabulary) and `public_contract` now carries `"tense"` on every contract - so detail,
  list, own-archive, and engagement-enriched payloads all read it back from the one shape.
- Create: `SocialMomentPublishing.publish/2` accepts `tense`; absent -> the server default
  "present" (never an error, never a client stamp); present-but-unknown -> `{:error,
  :invalid_tense}` (422 `invalid_tense`), never coerced.
- Feed: `HomeFeed.to_feed_card` carries `"tense"` from the moment record (older payloads
  without one read as "present", the server default).
- Web: productClient `publishSocialMoment` accepts `tense?: "present" | "future" | "past"`;
  C2Home's tense panel Photo/Text doors carry the panel's tense into ShareComposer, which
  sends it on post publish ONLY when the composer was opened under a tense (the key is
  absent otherwise - verified by pin); stories carry no tense. The feed adapter
  (shellData) reads the record's tense onto the FeedCardProjection memory card verbatim
  (only the three values are carried; anything else is treated as absent), and
  projections.ts types it. No new surfaces were built.
- The graph-create tense path is untouched: no plan code changed; a non-regression pin
  creates a plan through the real POST /opal/plans/graph-create endpoint and reads its
  time_label back from the SharedPlan row.

### Pins (backend, test/opal_core_web/r24_moment_tense_test.exs - 5 tests)

- vocabulary assertion against SocialMomentRecord.tenses()/default_tense();
- create under Forecast reads back "future" on the create response, the DB record, detail,
  list, own archive, and the home feed; create under Memories reads back "past" the same way;
- create with no tense reads back "present" (response + DB + detail);
- unknown tense "someday" -> 422 invalid_tense;
- graph-create non-regression (above).

### Pins (web, src/c2/shell/r24MomentTense.test.tsx - 4 tests)

- Forecast panel -> Text -> publish sends tense "future"; Memories -> "past";
- the plain (no-tense) text door sends NO tense key at all;
- the feed adapter lands a record's "future" on the card projection verbatim, and an unknown
  value ("someday") is carried as absent, never invented.

---

## Test evidence (exact commands + counts read from output)

Backend env: `source ~/workspace/opal-graph/w28-scratch/env.sh`, MIX_ENV=test,
MIX_BUILD_PATH=~/workspace/opal-graph/r24int-scratch/build-backendfeat,
DATABASE_URL=ecto://postgres:$PW@127.0.0.1:5433/opal_test_r24feat (PW from the r21 stack script).
`mix ecto.migrate` on that DB - output tail showed both new migrations running:
`== Running 20261030030600 OpalCore.Repo.Migrations.AddTenseToSocialMoments.change/0`
(alter table social_moments) and `== Running 20261030030500
OpalCore.Repo.Migrations.CreateStepUpElevations.change/0` (create table step_up_elevations
+ indexes), each `== Migrated ... in 0.0s`.

Backend, from apps/opal_core:

- `mix test test/opal_core_web/r24_memory_step_up_test.exs test/opal_core_web/r24_moment_tense_test.exs test/opal_core_web/memory_api_test.exs test/opal_core_web/repair18_sm_isolation_test.exs test/opal_core/phase9a_integration_proof_test.exs`
  -> **27 tests, 0 failures** (run twice: before and after `mix format` on touched files;
  per-file counts 6 + 5 + 4 + 6 + 6).
- `mix test test/opal_core_web/adopt3_api_test.exs test/opal_core_web/social_moment_engagement_api_test.exs test/opal_core_web/r23_audience_invisibility_test.exs test/opal_core/trivia_test.exs test/opal_core_web/graph_create_repair16_api_test.exs`
  -> **23 tests, 0 failures** (moment/feed/trivia/graph-create regression set).

One intermediate combined run showed a single order-dependent failure in the isolation test
(a step-up start answered 422): the step-up helpers used a constant device label, and
Onboarding's verification rate-limit bucket is keyed by phone digest + device - the helpers
now use a unique device label per step-up (the same pattern the activation helpers already
used per handle), and the final runs above are green with default seeds. `mix format` was run
on all touched Elixir files; it changed only the new code regions. A full `mix precommit`
(compile --warnings-as-errors + format + the entire suite) was not run - the repo carries
pre-existing warnings in unrelated files and the full suite is out of this cluster's targeted
scope; no warnings from the new modules appeared in the targeted compiles.

Web, from apps/opal_web (`npx vitest run ...`):

- `src/c2/shell/r24MomentTense.test.tsx src/c2/shell/memoryAdd.test.tsx src/c2/shell/r21Creation.test.tsx src/c2/shell/r23Audience.test.tsx`
  -> **4 files passed, 30 tests passed** (includes the updated memoryAdd protection-note pin
  and its 2 new step-up panel tests).
- Regression set: `adopt2Settings, c2ShellSurfaces, homeSocial, huntFixShellData,
  settingsArchitecture, smSoulMemory, r20Vault, storyPostRepair15, r21Flows2, r21Openings`
  -> **10 files passed, 130 tests passed**.
- `npx tsc -p tsconfig.json --noEmit` -> TSC_EXIT=0 with an empty log (verified on the
  un-piped command; an earlier piped run masked one typing error in the shellData tense
  ternary - widening of the Record value to `string` - fixed in 369c8507 with an explicit
  union cast, after which the r24MomentTense web suite re-ran green, 4 passed).

Laws held: no plan-table reads were added, so the gyroscope registry needed no new entry and
is untouched; no polling introduced; per-account isolation pinned for the elevation; no counts
added to any surface; migrations additive-only with distinct timestamps beyond 20261030030400
(20261030030500, 20261030030600); plain hyphens throughout.
