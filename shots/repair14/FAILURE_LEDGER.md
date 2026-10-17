# Repair #14 — Failure Ledger

Branch: `muse/repair-14` (from `muse/repair-13` tip `bfa854fd`).
Scope: the 11 remaining suite failures (F14-01..05), founder-specific hardcodes (F14-06..12),
the relationship-type coverage gap (F14-13), and items filed open with reasons (F14-14..18).

Final integrated result: **2655 tests, 0 failures** (baseline was 2618 tests, 11 failures).

---

## The 11 failures — 5 root causes, all repaired

### F14-01 (D1) — Voice path crashes on Linux: unguarded `launchctl` call [7 failures]
- **Symptom:** voice_test.exs:105, deepgram_ears_test.exs (4), voice_api_test.exs:74,
  event_driven_test.exs B4 — all raising `ErlangError :enoent`.
- **Root cause:** `OpalCore.Intelligence.DeepgramClient.launchctl_key/0`
  (deepgram_client.ex ~179) called `System.cmd("launchctl", ["getenv", ...])` unguarded.
  `launchctl` is macOS-only; on a Linux host every voice/listen/transcribe path CRASHED
  instead of honestly returning disabled. A real production crash, not a key-gating artifact.
- **Fix:** check `System.find_executable("launchctl")` first and `rescue ErlangError -> nil`;
  key resolution falls through to env/config. The identical copy in
  `lib/opal_core/calls/deepgram_grant.ex` (same crash waiting in `DeepgramGrant.issue/0`,
  previously untested) was fixed the same way. Commit `721cd105`.
- **Status:** FIXED. All 7 tests pass with no Deepgram key present (honest disabled behavior).

### F14-02 (D2) — "Any upcoming plans?" misrouted to plan_create
- **Symptom:** opal_intent_test.exs:279 — the question routed to `:plan_create` instead of `:check_status`.
- **Root cause:** in `opal_intent.ex` the `Enum.find_value` chain tried `try_plan_create`
  BEFORE `try_check_status`; the bare noun "plans" won over the question form.
- **Fix:** `try_plan_create` now defers when the turn is a status question
  (`status_question?/1`, mirroring the check_status triggers) AND carries no explicit
  creation verb (`@creation_verbs`). All existing plan_create positives still pass. Commit `487125ad`.
- **Status:** FIXED.

### F14-03 (D3) — Pipeline test crashed on nil text (`nil =~ "Locked in"`)
- **Symptom:** pipeline_test.exs:122 — `FunctionClauseError` in the reasoner path.
- **Root cause (diagnosed, test-side):** the assertion dated from the original Phase-1
  commit, when the reasoner emitted `payload["message"] = "Locked in!"`. Repair #11
  *deliberately* removed that free-floating claim: the executor routes `plan.confirm`
  through `confirm_pending_revision` and posts the truthful outcome
  (`repair11_executor_routing_test.exs` guards "Never a false Locked in!"). The reasoner
  is correct per product law; the test was stale. The fake claim was NOT restored.
- **Fix:** the assertion now checks the lawful contract at equal strength:
  `action == plan.confirm`, `payload["body"] == "yes"` (the executor's routing input),
  `payload["message"] == nil` (no pre-emptive claim). No production behavior changed. Commit `73ca34f2`.
- **Status:** RESOLVED (test-side). **Founder awareness:** restoring the old assertion
  would mean reversing Repair #11's honesty rule — founder's call, not taken unilaterally.

### F14-04 (D4) — Virtual plans persisted as `in_person`
- **Symptom:** virtual_plan_test.exs:143 — `plan.plan_type` was `"in_person"`, expected `"virtual"`.
- **Root cause (code-side):** `SocialFlow.create_tentative_plan_from_center` never read
  `plan_type`/`meeting_link` from params at all — OpalPlanConfirm passed them and they
  were silently dropped.
- **Fix:** mirrors `create_tentative_plan_from_conversation`: normalize plan_type,
  sanitize meeting_link, force "Online" location for virtual, record both in alignment
  (plus the locked Online place), persist both columns, schedule the virtual join
  reminder. Test assertion untouched. Commit `f09bd6cb`.
- **Status:** FIXED.

### F14-05 (D5) — Founder graph commitment seed: handle "has already been taken"
- **Symptom:** founder_graph_commitment_seed_test.exs:20 — `Ecto.InvalidChangesetError`.
- **Root cause (seed bug, not test isolation):** `FounderGraphCommitmentSeed` had stable
  IDs transposed — Nina held FounderCommunicationSeed's Alex ID (`…0005`, handle
  `founder-alex`), so Nina's upsert renamed Alex to "Nina", then Alex's insert at `…0006`
  collided on the unique handle.
- **Fix:** Alex reuses the communication seed's `…0005`; Nina takes the previously unused
  `…0006`. Both IDs were already in the frontend seed-peer set (`realChatPath.ts`), so no
  frontend change needed. Commit `6e38356d`.
- **Status:** FIXED.

---

## Hardcoded founder values — remediated (detail: HARDCODE_AUDIT.md / HARDCODE_REMEDIATION.md)

### F14-06 (H1) — Person extraction only knew the founder's circle
`extractor.ex` `extract_person/1` matched only Maya/Jordan/Chanelle/Alex. Now resolves
against the speaking user's actual contacts (`Relationships.contacts_with_types/1`) plus a
generic grammar-candidate extractor. Per-user isolation proven by test. FIXED.

### F14-07 (H2) — Place extraction only knew 7 venues
`extractor.ex` `extract_place/1` hardcoded Juniper/Pujol/Contramar/Quintonil/Rosetta/
Soumaya/Teotihuacan. Replaced by generic venue-candidate extraction; resolution stays in
the real pipeline (`Places.Gateway` / Geoapify via Center ProviderAction). FIXED.

### F14-08 (H3) — New users saw the founder's friends
`OpalApp.tsx` who-picker fallback fabricated 9 people with founder-circle avatars when the
fast path was empty. Now passes only real people; `GraphWhoPicker` renders an honest empty
state. FIXED.

### F14-09 (H4) — Founder-specific copy in the Mexico City trip template
`trips.ex` canvas notes ("Chanelle-energy…", "Alex photography track…", "Maya track…")
genericized. Real CDMX venue names kept (destination content). FIXED.

### F14-10 (H5) — `forbidden_creator_copy` named Jordan/Chanelle
`economic_qualification.ex:191` genericized to "Guest A booked with Guest B Thursday at 7."
The guard test now asserts the leak shape and refutes the founder names. FIXED.

### F14-11 (H6) — Attribution moduledoc example named Chanelle
`attribution_entitlement.ex` moduledoc genericized ("A creator's Moment…"). FIXED.

### F14-12 — Sweep fixes beyond the named items
- `action_orchestrator.ex` `recall_prior_copy/2`: removed the `\bmaya\b` trigger and
  `"Maya"` label fallback — birthday-plan recall now fires on the plan's own person + topic.
- `meaning.ex` + Python mirror `conversation_meaning.py`: "Jordan asked/said…" → "They…"
  (copy generated for arbitrary conversations).
- `journey_authority.ex`: dropped fabricated fallbacks `location || "Juniper & Ivy"` and
  `time_label || "Saturday · 7:30 PM"` from plan creation.
- `provider_vertical.ex`: `"who" || "Jordan"` → `"friend"`; `"jordan-1"` → `"conv-1"`;
  `leave_copy(…, "dinner with Jordan")` → `"dinner"`.
- `onboarding_copy.ex`: LLM instruction example "(Got Maya.)" genericized.
- `CallSurfaces.tsx`: `DEFAULT_GROUP_PARTICIPANTS` `["Sadeil","Chanelle","Maya","Jordan"]`
  → `["You","Guest 1","Guest 2","Guest 3"]`.
- OpalApp curate handler: removed inline `|| "Juniper & Ivy"` / `"Little Italy"` fallbacks.
All FIXED.

---

## Coverage gap

### F14-13 — Zero tests exercised `relationship_type`
Relationship types (spouse, partner, family, close_friend, friend, business, acquaintance)
drive attention budgets, call-intelligence profiles, vibe copy, prompt context, invites,
and business-vs-personal branching — and no repair-13 test set the field. Now covered by
24 journey tests (`repair14_relationship_journeys_test.exs`): coordination proven IDENTICAL
across all 7 types; intended per-type differences asserted (nudge gating, lead times,
tone copy, brief context, split-card styling); edge types fail closed. See
RELATIONSHIP_UX.md for the per-type assessment. FIXED (coverage).

---

## Filed open (honest, with reasons — not half-fixed)

### F14-14 — `conversation_alignment.ex` `canonical_from_text/1` recognizes only 3 venues
Juniper & Ivy / Herb & Wood / Fort Oak are hardcoded as canonical places in a load-bearing
recognizer at 6 call sites in the alignment state machine. Genericizing it means
redefining place-lock semantics and routing through the Places gateway — R15-scale work,
not a string edit. FILED.

### F14-15 — First-run illustration uses the founder's first name
`FirstRunExperience`/`firstRunCopy` illustrate the user persona as "Sadeil". Design-frozen
demo illustration surface; changing it is a design decision. FILED.

### F14-16 — `DatedConversationContent.tsx` is a dead component
No callers. Flagged for a dead-code pass. FILED.

### F14-17 — Seed-keyed literals inside founder-seed wiring
OpalApp call-continuity literals (~9431 "ready" label, ~11338 Chanelle-keyed seed graph
id) live inside the config-gated founder-seed path (off by default). FILED.

### F14-18 — Adversarial corpus note (observation, not a failure)
Pressure-corpus row a04 now yields a generic "Chanel" person candidate (unscored
dimension). False commitments remain zero; people precision/recall 1.0 on the scored set.
NOTED.
