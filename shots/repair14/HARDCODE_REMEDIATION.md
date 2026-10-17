# Repair #14 — Track B: Hardcode Remediation

Branch: `muse/repair-14-hardcode` (from `muse/repair-14` @ `bfa854fd`).
Mission: remove founder-specific hardcoded values from PROD source so the
app works for every user. No merge, no production, no Pass 2.

## H-items

### H1 — extractor.ex `extract_person/1` (FIXED)
Was: matched only `[{"Maya",…},{"Jordan",…},{"Chanelle",…},{"Alex",…}]`.
Now: `classify_message/2` takes a context; `extract_message` threads the
event context (actor_id/account_id) into the rules fallback.
Authority order: (1) the speaking user's ACTUAL contacts — display names
from `OpalCore.Relationships.contacts_with_types/1` (connected peers +
typed contacts), or an explicit `contacts` list in context; (2) a generic
grammar-candidate extractor (cue/possessive/subject patterns + a
day/month stoplist) that works for any name.
Proof: `test/opal_core/intelligence/extractor_dynamic_test.exs` (13 tests):
multi-word contact names resolve per user_id/actor_id/account_id, per-user
isolation (user A's contacts never resolve for user B), event path threads
identity, bare founder names with no contact/cue extract nobody, days are
not people. Extraction pressure corpus: people precision AND recall 1.0
(9/9, 0 FP/FN), intents 1.0, times 1.0, zero adversarial false commitments.

### H2 — extractor.ex `extract_place/1` (FIXED)
Was: substring match against 7 hardcoded CDMX venues.
Now: generic venue-CANDIDATE extraction (leading mention + at/to/near/
inside/for/book/reserve cues), with day/month words filtered and the
extracted person excluded. The candidate is a string signal, as before;
resolution (address/existence/ranking) stays in the real venue pipeline —
`OpalCore.Places.Gateway` (Geoapify) via Center ProviderAction
exact-entity jobs and WorldEnrichment. The synchronous classifier
deliberately does NOT call the keyed/HTTP places API per message.
Proof: dynamic tests (any named venue incl. "Chez Nous"; "book Contramar
Friday" resolves; "don't book Friday" yields no place; person never
labeled as place); booking extraction tests unchanged-green.

### H3 — OpalApp.tsx who-picker fallback (FIXED)
Was: empty `whoFastPath` fell back to 9 fabricated people (Maya, Jordan,
Chanelle, Sam, Alex, Sabrina, Nina, Taylor, Riley) with Chanelle/Maya
avatar images.
Now: only real fast-path people render. `GraphWhoPicker` renders an honest
empty state (`gwho-empty`: "No people here yet. People you connect with
will show up here.") when the list is empty; Solo path and Continue
disable logic unchanged. Same empty state serves the Trips who-step.
Proof: `src/opalUi/GraphWhoPicker.test.tsx` (3 tests): empty state renders
with zero person cells and none of the old names; Continue disabled when
no solo offered; real people render with no empty state.

### H4 — trips.ex Mexico City canvas notes (FIXED)
"Chanelle-energy market morning." → "Big-energy market morning — go hungry."
"Alex photography track — meet the others later." → "Photography track — meet the others later."
"Maya track — regroup for lunch." (line ~1069, found in sweep) → "Second track — regroup for lunch."
(Venue names in the canvas are real CDMX venues = destination content, kept.)

### H5 — economic_qualification.ex `forbidden_creator_copy` (FIXED)
"Jordan booked with Chanelle Thursday at 7." → "Guest A booked with Guest B Thursday at 7."
The string is a *forbidden-example* invariant; the test was updated to
assert the leak shape ("booked with") and refute the founder names —
assertion purpose preserved, not weakened.

### H6 — attribution_entitlement.ex moduledoc (FIXED)
"Chanelle's Moment helped cause this." / "Chanelle may participate…" →
"A creator's Moment helped cause this." / "that creator may participate…".

### Sweep fixes beyond the named items (H7)
- `center/action_orchestrator.ex` `recall_prior_copy/2`: removed the
  `\bmaya\b` trigger and the `"Maya"` label fallback from the birthday-plan
  recall branch — it now fires only on the plan's own person + a birthday
  topic, for any user.
- `social_flow/meaning.ex` + `services/opal_ai/opal_ai/conversation_meaning.py`
  (Python mirror): insight copy "Jordan asked whether you are still
  coming." → "They asked…"; "Jordan said the message felt dismissive." →
  "They said…". These strings are generated for arbitrary conversations;
  the asker/speaker is not Jordan. (Tests assert the "still coming" /
  "felt dismissive" fragments — preserved.)
- `social_flow/journey_authority.ex` `create_journey_plan/1`: dropped the
  fabricated fallbacks `location || "Juniper & Ivy"` and
  `time_label || "Saturday · 7:30 PM"` — a controller-created plan no
  longer invents a venue/time (both columns are nullable; eligibility
  logic already handles nil).
- `social_flow/provider_vertical.ex` `leave_consequence/2`: defaults
  `"who" || "Jordan"` → `"friend"`, `"conversation_id" || "jordan-1"` →
  `"conv-1"`, `leave_copy(travel, "dinner with Jordan")` → `"dinner"`.
  (The real bridge caller passes who/conversation_id explicitly.)
- `intelligence/onboarding_copy.ex`: LLM instruction example "(Got Maya.)"
  → "(e.g. \"Got it — added them.\")" so the model is not primed with a
  specific person's name.
- `apps/opal_web/src/opalUi/CallSurfaces.tsx`: `DEFAULT_GROUP_PARTICIPANTS`
  `["Sadeil","Chanelle","Maya","Jordan"]` → `["You","Guest 1","Guest 2","Guest 3"]`
  (group call stage fallback tiles no longer show the founder + circle).
- `apps/opal_web/src/OpalApp.tsx` curate-accept handler: removed inline
  `|| "Juniper & Ivy"` / `area: "Little Italy"` fallbacks — when no real
  candidate names a venue, no place draft is fabricated.

## Sweep dispositions (reviewed, not changed)
- Deepgram "Juniper" stub (`intelligence/deepgram_client.ex:157`): TEST-ONLY
  per task instructions — left alone.
- Founder seed modules, all config/flag-gated: `social_flow/
  founder_communication_seed.ex`, `founder_graph_commitment_seed.ex`
  (`allow_founder_communication_seed`, default false); web
  `opalUi/founderGraphSeed.ts`, `founderChatsPlanPills.ts`,
  `seedThreadIntelligence.ts`, `mexicoCityCanvasSeed.ts`,
  `callsContinuitySeed.ts`, `liveJourneyProof.ts` (gated by
  `isFounderSeedEnabled()`; production hydration excludes seed items —
  see `opalUi/graphsHydration.ts`). Seed/demo scaffolding by design.
- Labeled fixture/catalog boundaries: `social_flow/real_world/place/
  catalog.ex` + `candidate_provider.ex` + `group_composition.ex` +
  `shared_reality_presentation.ex` (provenance `curated_catalog_…`);
  `places/venue_lookup.ex` (explicit demo-fixture path in
  `OpalCore.Places.search_or_demo/2`); web `opalUi/placeComposition.ts`
  `DEFAULT_FIXTURE` + `resolvePlaceCandidates` composition layer;
  `availability/AvailabilityReview.tsx` `Fixture[]` arrays ("Fixture
  honesty" header); `opalUi/GraphsTemporalTimeline.tsx`
  `SEED_TIMELINE_ITEMS` (`source: "seed"`, production-excluded by
  graphsHydration); `social_flow/product_shell.ex` `seed_journey_*`
  synthetic journey helpers (fictional personas incl. Marcus/Olivia).
- Test-only mocks/fixtures: `api/intelligenceClient.ts`
  `PERSON_MEMORY_MOCK`, `opalUi/intelligence/reminderLifecycle.ts`
  `REMINDER_MOCK_SEED` (used only by tests); all `*.test.*` files;
  `apps/opal_mobile/src/release/homeTorture.ts` (torture-test data);
  Python `tests/test_worker.py` sample text.
- Mobile synthetic shell: `apps/opal_mobile/src/shell/AppShell.tsx`
  defaults are explicitly `SYNTHETIC.*` / `DEMO_*` demo-shell values;
  `socialFlow/FindPeopleScreen.tsx` uses `createMockContactsBridge`
  (555-range fictional numbers) only when no real bridge is injected.
- Onboarding illustration surfaces: `onboarding/FirstRunExperience.tsx`,
  `onboarding/firstRunCopy.ts` — designed first-run illustration content
  (comment-marked "Demo-only selection — Chanelle pre-selected for FR02
  illustration"), including the founder's first name "Sadeil" as the
  illustrated user persona. Founder design surface (design freeze);
  flagged here, not redesigned.
- `apps/opal_web/src/data.ts` (PLANS + chat previews): legacy static demo
  data used as initial state, replaced by server hydration (R12/R13).
- `opalUi/DatedConversationContent.tsx`: NO callers — dead component;
  its internal "Chanelle"/"Juniper tonight?" fallbacks never render.
  Flagged for a future dead-code pass.
- Doc/comment/LLM-prompt examples using a sample name (Alice/Bob-style,
  no runtime effect): `celebration_curation.ex` moduledoc,
  `plan_context_patch.ex` comments, `feedback_loop.ex`, `reasoner.ex`,
  `opal_intent.ex` comments, `relationships/inference.ex` moduledoc,
  `social/life_events.ex`, `intelligence/llm_extract.ex` prompt examples,
  `onboarding/holyShitCopy.ts` username-normalization doc example.
- `social_flow/conversation_alignment.ex` `canonical_from_text/1`:
  recognizes only Juniper & Ivy / Herb & Wood / Fort Oak as canonical
  places (unknown venue → `:unknown_place`). Load-bearing recognizer in
  the alignment state machine (6 call sites); genericizing it means
  redefining place-lock semantics + routing through the Places gateway —
  R15-scale surgery, filed here rather than half-fixed.
- `apps/opal_web/src/OpalApp.tsx` remaining seed-era literals: line ~4663
  shared-graph line is `isFounderSeedEnabled()`-gated; call-continuity
  signal labels (~9431 "ready" → "Saturday · 7:30 PM · Juniper & Ivy";
  ~11338 Chanelle-name-keyed seed graph id) are founder-seed wiring in
  the call-continuity fixture machinery — filed with the composition
  layer above.
- Corpus note: adversarial row a04 ("dinner with Chanel Saturday?") now
  yields a generic person candidate "Chanel" (the old code extracted
  nobody only because "Chanel" was not on the founder list). Adversarial
  scoring checks false commitments only (still zero); with a real user
  context, contact resolution governs.

## Phones / addresses
No real phone numbers or addresses in prod source. Only `+1 202 555 01xx`
form placeholders (fictional range) and LAN-IP handling logic
(`public_base_url.ex`, CORS/public-host plugs) — generic.

## Test evidence
- Backend full suite (`mix test --seed 0`): **2631 tests, 11 failures** =
  baseline 2618 + 13 new, failures identical to the R13-documented
  pre-existing categories (voice/Deepgram key-gated ×7, virtual_plan,
  founder_graph_commitment_seed, opal_intent check_status, pipeline 1.3,
  event_driven B4). Zero new failures.
- Web full suite: 1081 tests, 25 failures — failure list byte-identical
  to the base tree (verified by stash comparison). `tsc --noEmit`: 7
  errors, identical set to baseline (line shifts only).
- Python (`services/opal_ai`): 26 passed.
- New tests: backend `extractor_dynamic_test.exs` (13), web
  `GraphWhoPicker.test.tsx` (3).
