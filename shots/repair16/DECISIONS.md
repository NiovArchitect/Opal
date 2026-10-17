# Repair #16 — DECISIONS

Every product call made under the founder's "fix everything you can except
video" order, with reasoning. Track docs: `W2_DECISIONS.md` (onboarding),
`W4_PROACTIVITY.md` (proactivity) in this directory.

## Coordinator decisions

- **D-C1 · fr08/fr09/fr10: remove, not restore.** They were unreachable on
  the production path; fr08 duplicates Meet Opal's name/handle ask; fr09 and
  fr10 duplicate each other and the Repair #13 settings gates (under the
  progressive law, agency asks belong at their moment of need, which
  settings already serve); restoring them adds ~3 screens to a ~51s first
  run and breaks the 60-second law; fr08's photo affordance promises a
  durable upload that does not exist (fake-success risk). Removal executed
  by W2 with a full live-path trace (see W2_DECISIONS D2).
- **D-C2 · fr06 Skip: gate to seed, do not fabricate an unverified session.**
  The brief's literal wording was "Skip must work." Investigation proved a
  session is created only by `verifyChallenge` (or restored from a verified
  one); no guest/deferred constructor exists. A Skip that "works" by
  entering the app unverified would be fake auth and would violate
  per-account isolation law. The product-law-consistent fix is the one R15
  recommended and W2 executed: the control is presented only where it can
  perform its operation (seed builds, real fixture verification), and the
  step itself states plainly why verification is required. Recorded here
  because it deviates from the brief's literal wording on evidence.
- **D-C3 · Integration re-verification over worker inheritance.** R16 ran
  through a VM replacement, /tmp exhaustion, and Erlang/Postgres loss;
  W3's corrupted environment masked a real syntax defect (F16-19). Every
  gate in TEST_REPORT.md was therefore re-run by the coordinator on the
  merged tree, including same-window pristine-base control runs, rather
  than trusting worker-reported numbers.
- **D-C4 · Clock-sensitive failures documented, never chased.** Three
  pre-existing tests fail only inside the Pacific quiet-hours window
  (22:00–08:00) because `AttentionBudget` correctly denies routine work
  then. Rather than weaken assertions, shift clocks, or hold the repair ~7
  hours, the gate proves failure-set identity against pristine base in the
  same window and cites the R15 daytime full-suite run (2,713/0) over the
  same tests.

## W1 — durable graph-create (field fates)

- **Home = SharedPlan via the Center authority** (`create_tentative_plan_from_center`
  building blocks), provenance in `alignment["origin"]="graph_create"`.
  No parallel store (gyroscope law).
- **caption** → `alignment["caption"]`, exposed on the plan contract (no
  first-class column exists; durable and read back, never silently dropped).
- **media (photo)** → uploaded to the media store; id in
  `alignment["media_id"]`, ownership-validated server-side (R15 E8 law).
  Non-uploadable refs refused honestly. **Video refused** with the same
  honest copy pattern as posts.
- **audience** → plan visibility is participant-scoped by construction, so
  only `close_circle` / `private` are lawful; `friends` / `custom` / junk →
  `:unsupported_audience` (422), zero rows persisted.
- **joinRequestsOn / exactSpotAfterJoin** → stored as alignment booleans,
  exposed on the contract. No self-join surface exists for plans today and
  plan location is participant-readable only, which is what the toggles
  describe; recorded as creator preference on the durable record. Flagged
  as a product decision: if a self-join surface is ever built, these flags
  are its contract.
- **who** → real user ids become pending PlanParticipants; unresolved names
  stay as `who_label` only — ids are never invented. Junk participant ids
  reject the whole create (`:invalid_participant`).
- **Repeat** → provenance only (`alignment["repeated_from_plan_id"]`);
  source read-checked, never written (`REPEAT_MUTATES_OLD_GRAPH = 0`);
  non-durable seed ids never sent.
- **Idempotency** → one key minted per flow opening; replay returns the
  existing plan with `deduplicated: true`.

## W2 — onboarding (full text in W2_DECISIONS.md)

- D1 no lawful deferred-verification path exists → seed-gate Skip (fake
  auth rejected). D2 fr08/09/10 removal per D-C1, with live-path rerouting.
  D3 fr01–fr05 left + noted (dead/unreachable but carrying founder demo
  copy and source-assertion tests). D4 ActivationFlow deleted (zero
  importers verified). D5 PermissionBootstrap: Continue from the start,
  undecided rows persist as `skipped`, grants only from real grant results.
  D6 native fallback copy plain-language only, including replacing the raw
  provider diagnostic line. D7 test dispositions (deletions covered only
  removed components; assertions moved to lawful seams, none weakened).

## W3 — progressive ask surface

- D-W3-1 **Assess is POST, not GET** — it writes the ledger row on first
  ask; a GET would lie about being side-effect-free.
- D-W3-2 **Center chat is the wired surface; CelebrationsSection is
  deliberately not wired** — its rows always carry a date, so assess there
  could only ever return `known`; wiring it would build a surface that can
  never fire. Its "Plan this" already routes into the wired flow.
- D-W3-3 **Name→person resolution fails closed** — unique contact match or
  no assess. Inventing an identity for an ambiguous name risks storing
  facts against the wrong person.
- D-W3-4 **Dismiss ≠ skip, enforced in the component** — dismiss makes no
  API call; the ledger's `asked` state already prevents any re-ask, and
  recording a dismiss as `skipped` would misrecord user intent.
- D-W3-5 **Conflicting answers: first answer wins for the durable record.**
  Measured behavior: the ask path never rewrites the durable Celebrations
  fact; the ledger's `answered_value` reflects the latest volunteered
  value. If the founder wants last-answer-wins durably, that is a ProfileGap
  mechanism change, not a surface change — flagged, not silently chosen.
- D-W3-6 **Invalid-answer contract** — shape validation in the controller,
  semantic validation in the mechanism; both yield the same 422 and write
  nothing.

## W4 — proactivity (full text in W4_PROACTIVITY.md)

- D-W4-1 **P1 consent:** no existing setting lawfully covers proactive
  thread initiation → additive opt-in defaulting OFF; `proactive_opt_out`
  dominates when both are set. (Includes the F16-16 `set_opt_out/2`
  silent-failure fix.)
- D-W4-2 **P3 hook placement:** the R13 `PlanTransition` gate is a pure
  predicate without actor/post-change context → hooks live in the mutation
  functions post-commit. Drive-time-only wiring was rejected: it would
  present an incomplete change history as complete.
- D-W4-3 **P2 hook placement:** controller lock endpoints, after the sync
  transaction commits — sync stays a pure read-model projection; side
  effects (provider jobs, calendar writes) belong outside it.
- D-W4-4 **Execution-loop truthfulness:** a cancelled/expired execution
  cancels its TFT loop even if it previously resolved confirmed.
- D-W4-5 **P5 boundary:** deterministic data only (lead-time bands +
  stored history); no generative content; push variant unimplemented
  pending the consent answer.

## W5 — sweep

- D-W5-1 **Story media authorization is evaluated live per request** (not
  snapshotted at create): a revoked relationship or an expired story stops
  serving bytes immediately. Legacy refs untouched so old rows keep
  rendering.
- D-W5-2 **Seed-keyed literals left in place** — gated dev-harness fixtures
  (see FAILURE_LEDGER "Assessed, deliberately not changed"); changing them
  risks the founder's walk harness for zero user-facing gain.
- D-W5-3 **Inert `.dated-*` CSS left** in the shared stylesheet after the
  component deletion (same risk disposition as W2's fr08–fr10 selectors).
