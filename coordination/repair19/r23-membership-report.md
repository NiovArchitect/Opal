# R23 CLUSTER REPORT - F-1 / W-5b MEMBERSHIP CANDIDATE FIX

Cluster: muse/r23-membership (base: muse/repair-23 at 5eda86fe,
the R22 close tip). Code commit: 345d0519. Gates honored: no
merge, no production, muse/repair-17 untouched, plain hyphens.

## Root cause (one paragraph)

The membership manage panel keyed candidate exclusion, candidate
identity, and the add call on the people projection's ASSEMBLED
IDENTITY key, while membership speaks the ACCOUNT user id - two
different key spaces that usually coincide and did not in the
rig world. Evidence: the panel's reload filtered people rows by
`p.id` and sent `p.id` to the add endpoint
(apps/opal_web/src/c2/shell/GroupMembership.tsx, reload at
:60-77 pre-fix); the people contract emits "id" == "person_id"
== identity_id (apps/opal_core/lib/opal_core/people.ex,
to_contract at :276 pre-fix), an identity assembled in
for_viewer from FOUR sources whose keys are not the membership
key by construction - conversation rows keyed by `u.id`
(people.ex ~:209), contact rows keyed by `c.contact_user_id`
(~:237), establishment rows keyed by the establishment's other
participant id (~:262), merged by resolve/1 (~:100) - while the
membership projection's `user_id` is `ConversationMember.user_id`
joined to `User.id` (apps/opal_core/lib/opal_core/messages.ex,
membership_projection, ~:860-880), with a unique index on
(conversation_id, user_id) (migration 20260731000001), so the
backend write path could never duplicate one account. In the
rig world a current member (Maya Torres) also had a people row
under a different identity key than her membership user_id, so
she passed the filter and was offered as a candidate (frame
membership-manage-dark.png: members You / Maya Torres / Jordan
Ellis / Marcus Lee, with Maya Torres CHECKED under "Add
people"); the rig's add then created her second listing (frame
membership-manage-light.png: Maya Torres twice in the members
list, one "Maya Torres joined the conversation" event), and the
group orbit header's parties line - composed verbatim from
orbit.parties / scope.party with no dedupe
(apps/opal_web/src/opalUi/c1/OrbitScreen.tsx ~:348-376 pre-fix) -
printed the duplicate name. Backend idempotency held throughout,
exactly as the audit said; the defect was candidate keying plus
zero dedupe at the members and header compositions.

## The fix (at the candidate-list layer, per the commission)

- Backend contract (people.ex): `to_contract` now emits
  "account_user_id" DISTINCTLY from the identity key;
  `for_viewer` stamps it from the accounts store (the identity
  verified against `User` rows; nil when the identity has no
  account row - never a fallback to the identity key).
  Client type `PeopleProjectionPerson` (productClient.ts:1957)
  gains `account_user_id: string | null`.
- Panel (GroupMembership.tsx): candidates key on
  `account_user_id` - current members excluded by that key
  (membership user_id IS the account user id, messages.ex
  above), candidates dedupe by that key, rows with no account
  behind them are not offered (they cannot be added to a
  conversation), and the add call sends that key. The members
  list dedupes by user_id at composition.
- Projections: `Messages.membership_projection` dedupes member
  rows by user_id; `OrbitProjection.for_conversation` uniqs the
  member id list before composing parties; `OrbitScreen`
  dedupes parties by user id at composition, so the header
  parties line and the ring lights name each person once.

## Failing-first reproduction

Test file: apps/opal_web/src/c2/shell/r23MembershipCandidates.test.tsx
(4 tests), fixtures mirroring the rig's identity shapes (a
current member keyed by a contact-source identity whose account
is her membership account; one account present under two
identity keys; an identity with no account; a duplicated member
row; a duplicated orbit party row).

- BEFORE the fix: 4 failed / 4. Candidate test: expected 1
  candidate, got 4 (the member offered under her other identity
  key, Dan offered twice, the account-less row offered). Add
  test: the add call sent the identity keys
  (["src-contact-maya", "u-dan"]). Members test: 4 rows rendered
  instead of 3. Orbit test: parties line carried the duplicate.
- AFTER the fix: 4 passed / 4. The add call sends ["u-dan"] -
  the account user id, once.

## Files changed (commit 345d0519)

- apps/opal_core/lib/opal_core/people.ex - account_user_id in
  resolve output (default nil), for_viewer accounts-store stamp,
  to_contract emission.
- apps/opal_core/lib/opal_core/messages.ex - membership
  projection uniq_by user_id.
- apps/opal_core/lib/opal_core/social_flow/orbit_projection.ex
  - member ids uniq before parties.
- apps/opal_core/test/opal_core/people_test.exs - new contract
  test (distinct emission, honest nil) + for_viewer stamp
  assertions on the existing three-source test.
- apps/opal_core/test/opal_core_web/people_projection_api_test.exs
  - account_user_id assertions for both same-name accounts in
  the F-6 test.
- apps/opal_web/src/api/productClient.ts - client type field.
- apps/opal_web/src/c2/shell/GroupMembership.tsx - candidate
  keying + members dedupe (see above).
- apps/opal_web/src/c2/shell/r23MembershipCandidates.test.tsx -
  the failing-first pin (new).
- apps/opal_web/src/c2/shell/r21GroupMembership.test.tsx -
  fixtures updated to the new contract field (2 rows); no test
  logic changed.
- apps/opal_web/src/opalUi/c1/OrbitScreen.tsx - parties dedupe
  by user id at composition.

## Test commands and counts (exact)

Web (from apps/opal_web, ./node_modules/.bin/vitest run):

- `vitest run src/c2/shell/r23MembershipCandidates.test.tsx`
  BEFORE fix: 4 failed. AFTER fix (run together with the r21
  suite): see next line.
- `vitest run src/c2/shell/r23MembershipCandidates.test.tsx src/c2/shell/r21GroupMembership.test.tsx`
  AFTER fix: 2 files passed, 12 tests passed (r23 4/4, r21 8/8 -
  the existing suite stays green).
- `vitest run src/c2/shell` (whole folder): 50 files, 473
  tests - 472 passed, 1 failed. The one failure is
  r20Connect.test.tsx:509 (the happening-glow CSS token pin) -
  the documented IF-1 exception (Section 11 of
  repair23-wiring-plans.md: WS-4's 8px glow token vs the R20
  F-10 pin's 14px; founder decision pending; neither side
  changed by R23). Verified NOT new: the same file run on the
  pristine R22 tip (wt-repair22) gives the identical result,
  1 failed / 13 passed. This cluster changed no CSS.
- Typecheck (`tsc -p tsconfig.json --noEmit`): 9 errors on this
  tree, 9 on the pristine R22 tip - the pre-existing baseline,
  unchanged, no new errors from the contract field.

Backend (fresh DB opal_test_r23mem on 127.0.0.1:5433, created
for this cluster; MIX_ENV=test,
MIX_BUILD_PATH=~/workspace/opal-graph/r23mem-scratch/build-test
seeded from r23int-scratch; 120 migrations ran clean):

- `mix test test/opal_core/people_test.exs test/opal_core_web/people_projection_api_test.exs test/opal_core/r21_group_membership_test.exs test/opal_core_web/r21_membership_api_test.exs`
  - 20 tests, 0 failures.
- `mix test test/opal_core/social_flow/repair20_orbit_projection_test.exs`
  - 9 tests, 0 failures.
- `mix credo lib/opal_core/people.ex lib/opal_core/social_flow/orbit_projection.ex`
  - no issues. (mix format --check-formatted: the changed files
  are clean except messages.ex, which is unformatted at the
  pristine R22 tip too - the flagged hunk is
  record_member_removed, unrelated to this change; it was NOT
  reformatted, to keep the diff to the defect.)

## CAPTURE SPEC (for the coordinator's rig; LIGHT first)

World: the served R23 build at its badge, in the rig world that
produced the original frames - a group conversation whose
members include a person (the rig's Maya Torres) whose
people-projection row is keyed by an identity from a different
source than her membership user_id (contact/establishment
source identity; the row's account_user_id is her membership
account).

1. Panel, LIGHT: open the group thread, open People (manage
   panel). PASS requires ALL of: the members list shows each
   person exactly once; the "Add people" list does NOT offer
   Maya Torres (nor any other current member); a genuine
   non-member with an account (e.g. Sabrina Nguyen) IS
   offered. Any current member appearing under "Add people"
   FAILS the cluster.
2. Orbit header, LIGHT: open the same conversation's orbit.
   PASS: the orbit-parties line names each person exactly
   once (no "Maya Torres - Maya Torres" in either separator
   form), and the composition's data-party-count equals the
   conversation's member count.
3. Panel, DARK: frame 1 repeated in dark; same PASS criteria.
4. Negative control, LIGHT: add the offered non-member from
   frame 1; after the write and re-read, the members list
   shows the added person exactly once and the "Add people"
   list no longer offers them.

## DECLARATIONS (not closed, named)

- PROVEN vs FRAMED: what code proves is the key-space mismatch
  (assembled identity key vs membership account user_id), the
  absence of dedupe at the members and header compositions,
  and the frames' before/after sequence. The rig database that
  produced the frames no longer exists, so WHICH concrete
  record carried the member's second key in that database (a
  non-account-source identity row vs a second account record)
  cannot be re-derived from code alone. This fix closes the
  key-mismatch species completely - exclusion, dedupe, and the
  add call all key on the account user id the backend now
  emits distinctly - and adds user-id dedupe at every
  composition the audit named.
- RESIDUAL, deliberately NOT patched: two genuinely distinct
  ACCOUNTS that share one display name remain two identities
  (the standing People law, pinned in people_test.exs test (b)
  and the F-6 API test); the panel will offer the non-member
  account, and adding it is a lawful add of a different
  account. Name-based candidate exclusion was NOT implemented:
  it would violate that law and would bar two distinct
  same-name people from ever sharing a group. If the founder
  wants the two-accounts-one-human case closed, the lawful
  seam is account linking (the Journey G account-link path),
  which is founder-gated and outside this cluster.
- account_user_id VALUES at this tip: every people row the
  current sources emit resolves to a User row, so the stamped
  value equals the identity key for today's rows. The contract
  change makes the key space explicit and sound for identities
  whose assembled key is not an account id (they now carry nil
  and are not offered as candidates), rather than changing
  today's values.
- No captures were taken by this cluster; the capture spec
  above is the rig's to run. FOUNDER_ACCEPTED remains NO.
  Nothing merged, nothing deployed.
