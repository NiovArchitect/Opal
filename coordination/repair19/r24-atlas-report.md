# REPAIR #24 - WS-3 PLACE-ATLAS DRIFT REPORT

Branch: muse/r24-atlas, base c74adfe3 (muse/repair-23 tip).
Commits: 932caa4e (fix + pin), 3dd15995 (re-pins), c55b2512
(format, pin test only), this report.
Gates held: no merge, no production, no Pass 2, plain hyphens,
no migration added (test DB migrated to the existing 120,
last 20261030030400), no seed files touched.

## 1) THE ATLAS AND THE SEEDED WORLD

The atlas is `OpalCore.SocialFlow.CandidateProvider` - the
curated place catalog (provenance string
"curated_catalog_no_live_travel_availability_or_trend"). It is
the catalog graph creation validates against, by two wires:

- the alignment candidate buttons the web renders
  (OpalApp.tsx, data-testid alignment-place-nominate, copy
  "Curated catalog") are `ConversationAlignment`'s `candidates`,
  which are `CandidateProvider.recommend(activity)` verbatim;
- tapping one calls `ConversationAlignment.nominate_place/3`,
  whose only recognition paths are (1) an offered candidate,
  (2) a name already in the plan's own place state, (3) a
  catalog match (`catalog_match/1`), which yields only
  :catalog_only. Anything else is `{:error, :unknown_place}`.
  The Repair #15 canonical-venue DB test's moduledoc names this
  exact gate ("the UI offered it; the endpoint refused it").

The seeded world (FounderGraphCommitmentSeed ->
FounderCommunicationSeed + HumanSeedWorld), enumerated from the
seeded rows on a fresh test DB at base: 9 plans, 8 of them
carrying a location, over **7 distinct places** (the market
appears in two plans), plus one location-less plan ("Talk
tonight about Saturday"). The handoff's "8 places" is the 8
location-bearing seeded plans; the "5 that cannot be created"
are exactly the 5 distinct places below that answered
:unknown_place.

## 2) PER-PLACE BEFORE / AFTER

Before = base c74adfe3, measured two ways: a probe test at base
(nominate in a fresh conversation, and catalog_match), and the
pin test at base (lib changes stashed). After = this branch.

| Seeded place (verbatim location string) | Before | After |
|---|---|---|
| Oceanside Farmers Market | :unknown_place - no catalog row, catalog_match nil | Atlas entry (something active, Oceanside, $); nominate of the seeded string succeeds, resolves to itself |
| The Brick Hotel, Oceanside | :unknown_place - no catalog row, catalog_match nil | Atlas entry "Brick Hotel" (drinks, Oceanside, $$$); nominate of the seeded string succeeds via refers_to?/2, resolves to "Brick Hotel" |
| Moonlight Beach, Encinitas | :unknown_place - no catalog row, catalog_match nil | Atlas entry "Moonlight Beach" (coffee, something active; Encinitas); nominate succeeds, resolves to "Moonlight Beach" |
| Tamarack Beach, Carlsbad | :unknown_place - no catalog row, catalog_match nil | Atlas entry "Tamarack Beach" (somewhere quiet, something active; Carlsbad); nominate succeeds |
| Oceanside Pier | :unknown_place - no catalog row, catalog_match nil | Atlas entry "Oceanside Pier" (something active, Oceanside); nominate succeeds |
| Herb & Wood, Little Italy | Recognized (catalog_match = "Herb & Wood") but nominate under its own dinner activity returned :activity_not_ready: the offered check was exact string equality against "Herb & Wood" | Nominate of the seeded string succeeds under dinner via refers_to?/2, resolves to "Herb & Wood" |
| Juniper & Ivy | The one clean pass: offered under dinner by exact name, nominate succeeds | Unchanged, still succeeds |

Control measurement at base: the durable graph-create itself
(`SocialFlow.create_plan_from_graph_create` with the place as
location) accepted all 7 places - it performs no catalog
validation. The failure lives entirely in the atlas-validated
nomination/candidate path by which a conversation becomes a
graph at a place; that is the path the finding names.

## 3) ROOT CAUSE (two mechanisms, both in the atlas)

1. **Missing atlas rows (the drift).** CandidateProvider's
   catalog is a hand-maintained 6-entry list from the Repair #15
   era (Juniper & Ivy, Herb & Wood, Fort Oak, Bird Rock Coffee,
   Torrey Pines, Meditation Gardens). The R19 human seed world
   was built around a different, real place set on the
   Oceanside / Carlsbad / Encinitas coast, and the atlas was
   never extended to it: two hand-maintained place lists, no
   shared source, and the catalog is the one the validation
   consults. Five seeded places are simply absent from it.
2. **The D-P1 display-string join.** Seeded location strings
   carry display suffixes (", Little Italy", ", Encinitas",
   ", Carlsbad", ", Oceanside") and one carries an article
   ("The Brick Hotel, Oceanside"). nomination_resolution joined
   the nominated string to offered candidates by exact downcased
   equality, so a suffixed string could not match its own
   offered entry and fell through to :catalog_only ->
   :activity_not_ready. Place identity being a display-string
   join (r22-place-energy-design.md D-P1) is exactly what made
   the suffix fatal.

## 4) THE FIX (932caa4e)

At the drifted source - the atlas and its join - not the seed
(no seed file was touched; nothing for cluster E to collide
with):

- **Catalog data**: the five missing seeded places are now
  CandidateProvider entries, with the areas their seeded
  strings carry and honest activities from the existing
  vocabulary (market / pier / beaches as something active,
  Moonlight Beach also coffee, Tamarack Beach also somewhere
  quiet, Brick Hotel as drinks). The catalog stays the one
  place list; the seeded world needed no second list and got
  none.
- **The join**: `CandidateProvider.refers_to?/2` owns the
  display-string join (exact, leading-article, and trailing
  ", Area" forms). nominate_place's offered check uses it and
  resolves to the catalog's canonical name, the same
  normalization partial mentions already got ("juniper" ->
  "Juniper & Ivy").
- **Collateral guard**: catalog_match's first-token shortcut
  now requires a DISTINCTIVE first token, as its own doc
  already stated. "oceanside" opens two entries after this fix;
  without the guard a mention of one Oceanside place would
  canonicalize to the other. Full-name and all-token rules are
  unchanged, and every pre-existing catalog_match pin holds.

The gate stays honest (pinned): a place in neither the atlas
nor the plan's state is still :unknown_place (the test uses
"Harbor Table"), and an atlas place under the wrong activity
is still :activity_not_ready.

## 5) FLAGGED, NOT FIXED (outside this cluster's ground)

The second place list, `RealWorld.Place.Catalog`
(@default_places, used by the composition / recommendation
engines, not by graph-create validation), drifted the same
way: of the seeded places only "Juniper & Ivy" exact-joins
there, and "Herb & Wood, Little Italy" fails the exact
display_name join in PlanAgreementTasteBridge.place_facts.
That is the D-P1 stable-place-id territory WS-8
(muse/r24-motionplaces) owns this wave; unifying or re-joining
that catalog here would collide with it. Named for the
coordinator's disposition table.

## 6) TESTS (commands + counts read from the run output)

Env: `MIX_ENV=test`, `MIX_BUILD_PATH=~/workspace/opal-graph/
r24int-scratch/build-atlas`, `DATABASE_URL=ecto://postgres:...
@127.0.0.1:5433/opal_test_r24atlas` (DB created for this run,
`mix ecto.migrate` to 120 migrations).

- **Pin** - `mix test test/opal_core/social_flow/
  r24_place_atlas_test.exs`:
  - at base (fix stashed, test present): **4 tests, 3 failures**
    (the seeded-world enumeration test, the shared-first-token
    test, and the refers_to? test fail; the honesty test passes
    at base and after, by design). The enumeration test is the
    failing-first pin the scope asked for: it enumerates the
    seeded places from the seeded rows and asserts graph
    creation at each.
  - after the fix: **4 tests, 0 failures**.
- Alignment batch (conversation_alignment,
  conversation_alignment_canonical_venue,
  repair15_canonical_venue_db, core_social_flow_contract, pin):
  **46 tests, 0 failures**.
- Affected batch (human_seed_world, both founder seed suites,
  graph_create_repair16, recommendation_intelligence,
  place_identity, provider_vertical, conversation_create_plan):
  **67 tests, 0 failures**.
- Wide run (the whole test/opal_core/social_flow/ directory +
  plan_projection_coherence + repair18_pattern_enforcement +
  graph_create_repair16_api + place_coordinates_writer_api +
  r23_place_signal): **1704 tests, 0 failures**. The coherence
  suite passing also proves the gyroscope law held: this fix
  adds no plan-table reads in lib, so no registry entry was
  needed.
- Catalog-adjacent batch (artifacts, calls assist/outcomes,
  celebration_curation, celebrations, consent_act_on_behalf,
  opal_context, opal_response, oracle,
  phase9a_integration_proof): **114 tests, 0 failures**.

Re-pins (3dd15995): three exact candidate-list assertions in
conversation_alignment_test.exs (coffee x2, something active
x1) now include the seeded places the atlas legitimately
offers; each site carries a comment naming this repair as the
superseding change, and exact-list strength is kept. The
dinner list is unchanged (no seeded place is a new dinner
entry).

No web files changed, so no vitest was run. Hygiene:
candidate_provider.ex and the new pin test are format-clean;
conversation_alignment.ex and conversation_alignment_test.exs
carry pre-existing format debt at base in hunks this fix does
not touch (verified against c74adfe3 copies - reformatting them
would balloon the diff). Credo on the two changed lib files:
5 findings, all pre-existing complexity in
conversation_alignment.ex (lines 2208-3826), none in changed
code. A test-run side effect on shots/poc2/perf_ms.txt was
reverted; the tree is clean apart from this report.

DISPOSITION: FIXED + evidence (per-place before/after in
section 2, root cause in section 3, pin failing-first at base
and green after, 1704-test wide run green).
