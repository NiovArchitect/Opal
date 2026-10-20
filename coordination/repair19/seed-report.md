# Repair #19 — Wave W1: Human Seed World

- **Branch / worktree:** `muse/r19-seed` at `~/workspace/opal-graph/wt-r19-seed`, base `f2981dbf` (`muse/repair-19`). Not pushed, not merged, no other worktree touched.
- **Task:** rebuild the served review/seed world as a believable social graph after the founder rejected the regression/replay world's machine-speak ("Regression A", three people named "User A", "Race night dinner macreplay1", "R18REG macreplay1 order 0 / persistence one / persistence two", plans all in Forming).

## 1. Where the served review world was defined (investigation map)

Machine-speak reached rendered surfaces from FOUR distinct places, all found by searching `macreplay`, `R18REG`, `Regression A`, `User A`, and the `opal_founder_seed=1` path:

1. **The regression harness session provisioning** — `shots/regression/lib/harness.mjs`: synthetic sessions A/B were provisioned with display names `"Regression A"` / `"Regression B"` (env defaults `OPAL_NAME_A/B`). Those names are real backend `display_name`s, so they render in chats lists, graph detail ("RA — Regression A — Waiting to answer"), history lines, and call rows. `shots/regression/rendered/lib/browser.mjs` repeated the `"Regression A"` fallback for the browser profile.
2. **The run tag in every case-built string** — `loadConfig()` generated `runTag = r<base36><base36>` and cases append `ctx.tag` to plan titles, group labels, story captions, and person names (142 uses across 55 case files). The Mac replay ran with `OPAL_RUN_TAG=macreplay1`, producing the captured titles ("Dinner macreplay1", "Race night dinner macreplay1", "RevPlan macreplay1", "Expiry macreplay1" — all verbatim in `shots/repair18/full-pack/manifest.json`). `ctx.marker(label)` produced `"R18REG <tag> <label>"`, posted as real human/Center messages — the thread spam the founder quoted.
3. **Case-provisioned people named as scaffolding** — fresh synthetic users across the cases were named `"Regression Fifth"`, `"Regression Third"`, `"Regression Fourth"`, `"Regression Stranger"`, `"Regression Fresh"`, `"Regression NearMe"`, `"Regression Iso C/D"`, `"Regression Contact"`, `"Regression Perms"`, `"Regression Gaps"`, `"Regression Strip"`, `"Regression DIR1 …"`, `"Regression Revision …"`, and `"Member Cee/Dee/Ee/Eff/Aitch"` / `"Outsider Gee"`. One title was literally `` `Regression dinner ${ctx.tag}` `` (FR-18-01). `shots/regression/rendered/fullpack-topup.mjs` created a birthday celebration for `"Regression B"`, which derived the Someday-shelf starter "Plan something for Regression B".
4. **The founder seed itself (backend, `opal_founder_seed=1`)** — `apps/opal_core/lib/opal_core/social_flow/founder_communication_seed.ex` + `founder_graph_commitment_seed.ex` (the ONLY backend seed path; gated by `allow_founder_communication_seed` + explicit opt-in, served by `FounderSeedController`). This world was human-leaning but thin: single first names only (Chanelle/Maya/Jordan/Sabrina/Alex/Nina), a group plan titled "Meetup", a graph plan titled "Saturday opens like this", and both plans `agreed` — no forming/happening/past distribution at all. The rendered full-pack's all-Forming read came from layering (2)+(3) on top of it: the capture account had accumulated 107 case-built plans, almost all tentative.

Also mapped, NOT changed: `apps/opal_web/src/opalUi/founderGraphSeed.ts` — the client-side FOUNDER_FIXTURE (visual-QA only, seed-gated, not served from backend records; its people/titles are already human). Historical artifacts (`shots/repair18/**`, `shots/regression/browser/layout-results.json`) are evidence of the rejected world, left untouched.

## 2. The new cast and world spec

**Cast (8 peers + the viewer).** Stable UUIDs/handles (binding keys) are unchanged; only display strings moved.

| Person | Where defined | Notes |
|---|---|---|
| Ethan Walker | regression harness session A default (`OPAL_NAME_A`) | the viewer account |
| Maya Torres | harness session B default (`OPAL_NAME_B`) **and** founder-seed peer (same name) | the second full account; her seed-cast identity matches her account name, so the two accounts' worlds interlock by identity as well as by shared rows |
| Chanelle Brooks | founder communication seed peer | |
| Jordan Ellis | founder communication seed peer | |
| Sabrina Nguyen | founder communication seed peer | |
| Alex Rivera | founder communication seed peer | |
| Nina Patel | founder graph seed peer | |
| Priya Shah | NEW — `HumanSeedWorld` (stable id `…0007`) | |
| Marcus Lee | NEW — `HumanSeedWorld` (stable id `…0008`) | |

Case-provisioned people were renamed the same way (Owen Parker, Clara Jensen, Ben Okafor, Paul Whitaker, Anna Lindqvist, David Kim, Sarah Kim, James Wright, Ray Thompson, Megan Hart, Laura Benson, Chris Palmer, Hannah Cole, Victor Hughes, Emma Sullivan, Aaron Blake, Bella Cruz, Caleb Ortiz, Dana Kim, Eli Ford, Rachel Moore, Daniel Reyes, Sofia Reyes, Celia/Derek/Elena/Felix/Henry Ruiz, Gavin Cole).

**Interlock.** The founder seeds already share real rows across viewers (group conversations found by label + membership; plans found by conversation + title). Proven by the new backend test: after seeding with the viewer account, the SAME plan rows ("Farmers market run", "Sunday brunch at Herb & Wood", ≥2 shared ids) are visible from Maya Torres's account through her own participant rows, and her conversations list carries the shared "Weekend Crew" thread — one row, two accounts, not copies. Harness accounts A/B additionally share every plan the cases build between them, as before. **Named limitation (pre-existing, not introduced here):** a full re-seed with a cast peer (e.g. Maya) as the seed viewer fails inside the communication seed — it directs the viewer to every peer, so a peer-viewer self-directs and `ensure_direct_conversation` refuses with `{:error, :self}`. The interlock is therefore proven at the row level, which is what surfaces render; making cast peers re-seedable as viewers is a founder-seed change for a later wave if review ever needs it.

**Messages.** All seed direct/group messages are real sentences (e.g. Chanelle: "I can do 7:30 — I booked it under my name."; Maya: "Farmers market Saturday morning? The flower stall alone is worth it."; Sabrina: "Sent — the cardamom bun is the one, trust me"). Marker text in the harness is now `${label} — ${tag}` where the tag is the run's human phrase ("persistence one — with the Saturday crew at the pier"): the label remains the discriminating text, and the tag rides in the body because cases read their sent messages back by filtering bodies on `ctx.tag` — a contract the old machine prefix satisfied and the first human marker draft broke (caught live by FR-11-01 in the first API run of this branch; fixed in commit after `e44ff9bc`, no case edited). The default run tag is now a human phrase (`humanRunTag()` picks a random human phrase per run); internal uses (device labels) slugify it.

## 3. State-distribution table (hard requirement)

The state family is derived by `NextPlan`/`Reveal` from the plan row + viewer participant row (live window → happening; viewer pending → action; agreed → ready; else forming; completed → past). The world seeds the ROWS that make each state true:

| State | Plan | Status / window | Viewer row |
|---|---|---|---|
| Happening | Farmers market run (Oceanside Farmers Market) | agreed, start −45m, end +105m | accepted |
| Action / Needs-you | Rooftop drinks at The Brick Hotel (The Brick Hotel, Oceanside) | tentative, +3d | **pending** (unresolved action) |
| Action / Needs-you | Saturday morning at Oceanside Farmers Market (graph seed) | agreed, +52h, commitment phase | **pending** |
| Ready | Dinner at Juniper & Ivy (Juniper & Ivy, Little Italy) | agreed, next Saturday 7:30 PM | accepted |
| Ready | Sunday brunch at Herb & Wood (Herb & Wood, Little Italy) | agreed, next Sunday 11 AM | accepted |
| Forming | Coffee and a coastal walk (Moonlight Beach, Encinitas) | tentative, no locked time | accepted; Priya Shah pending |
| Past | Sunset picnic at Tamarack Beach (Tamarack Beach, Carlsbad) | completed, −3d, `completed_at` set | accepted |
| Past | Saturday ride to Oceanside (Oceanside Pier) | completed, −8d, `completed_at` set | accepted; Maya Torres declined |

**Calls** (`CallSession` rows, keyed by `correlation_id`): missed — Maya Torres → viewer, −2h, with an unresolved `CallOutcome` (`open_question_created`, "Can we talk tonight about Saturday?") **and** a follow-up human message in the same direct thread; answered/ended — viewer ↔ Chanelle Brooks, −26h, with a `plan_time_kept` outcome ("Saturday · 7:30 PM"); cancelled outgoing — viewer → Jordan Ellis, −5h.

**Stories** (through the real owners — `SocialMomentPublishing.upload_media` with real PNG bytes, then `TemporaryStoryPublishing.create`): viewer's "Morning light at Tamarack — picnic weather if this holds" (friends) and Maya's "Flower stall haul at the market this morning" (friends). Peer-story reach still obeys relationship eligibility; nothing widens an audience.

## 4. What could NOT be seeded honestly (named, not faked)

- **Video call row — HONESTLY ABSENT.** `call_sessions` stores no call/media type; `call_type` exists only as a transient push payload in `Calls` (`call_type_from/1` at creation). A "video" call log row would be painting data the record does not hold. **Calls wave:** add a stored media/call-type field (additive migration) if the log must distinguish video.
- **Private-marked plan/graph — HONESTLY ABSENT.** `SharedPlan` and `PlanParticipant` have no visibility/privacy field (verified in both schemas). The founder's private-graphs requirement (2026-10-19 memory) needs a schema + projection change. **Graphs wave:** additive `visibility` on the plan row, gated in every projection. The seed payload names this as `"plan_privacy_flag" => "absent_no_field_on_shared_plan"` so no surface can mistake its absence for a seeded private plan. (Stories do have a real visibility vocabulary — `close_circle`/`friends` — and it is used as-is.)
- **Joiner location sharing ON/OFF — HONESTLY ABSENT for plans.** `PlanParticipant` has no sharing field. Location sharing exists only trip-scoped (`Trips.TripConvoyMember.sharing`), and seeding a trip to imitate plan-joiner sharing would be a false record. **Graphs wave:** the founder's "how far each joiner is from the meeting place, with permission" needs a plan-scoped share record + distance projection; the seed payload names it `"joiner_location_sharing" => "absent_no_field_on_plan_participant"`.
- **Venue/place imagery — HONESTLY ABSENT.** No venue/place record carries a photo: the place `Catalog` has no `photo_url`, `SharedPlan` has none, and no seed/fixture anywhere carries a real venue image URL (the web founder fixture uses local figma asset paths in a client-only fixture — not a record). Per the task rule, no client-side picture was hardcoded and no URL was invented. The only real imagery in the world is story media stored through the media owner. **Graphs/home wave:** additive photo field on the place record (or a place→media link) is the honest path; then this seed can attach the venue's own photo to the Juniper & Ivy / Herb & Wood / market plans.

## 5. Regression semantics: what assertions changed and why coverage is equal-or-stronger

- **Binding keys unchanged:** stable peer UUIDs, handles, `client_message_id`s, `correlation_id`s, plan `card_id` (`seed-jordan-market`), phone fixtures, and every case id. Only display strings changed.
- **Backend tests updated (display-string assertions only):** `founder_communication_seed_test.exs` now expects `"Chanelle Brooks"` and the full-name set (was `"Chanelle"` / first names). The graph-seed test's behavioural assertions (counts 2 going / 4 interested / total 6, lock-in phase, seed-restore gate) are untouched and still assert against the same plan, whose title changed to "Saturday morning at Oceanside Farmers Market".
- **Pattern-enforcement registration (visible, per FIX-10b law):** `repair18_pattern_enforcement_test.exs` — `HumanSeedWorld` is registered in the plan/participant changeset-writer registry and in the seed-peer-UUID holders list, each with a comment naming the gate it inherits (callable ONLY from the graph seed's gated `ensure!/2`; it defines no gate of its own and no other caller). No enforcement assertion was removed or loosened; two registries gained one visible entry each, exactly the sanctioned registration event.
- **Regression cases:** every case still constructs its strings from the same variables (`ctx.tag`, `ctx.marker(...)`, session names), so assertions that compare a created title/body against the variable hold identically. Display-string literals that were asserted or searched (`"Regression …"` names, the FR-18-01 title, FR-05's peer-name fallback, the top-up celebration person, harmony-capture's center title, fullpack-capture's search probe) were updated to the new human strings. No case was deleted, no check removed, no assertion weakened to a substring of itself.
- **NEW permanent check (the one that would have caught this finding):**
  1. `shots/regression/lib/harness.mjs` — `MACHINE_SPEAK_TOKENS` + `findMachineSpeak` + `scanSeedWorld`: scans the served API output a reviewer is shown (session, conversations incl. plan projections, human messages in every conversation, plans `?status=all`, center conversation) for `macreplay`, `R18REG`, `Regression A/B/Third/…`, `User A/B` as display strings.
  2. Wired as a **gate, not a case** (case count stays 101): `run.mjs` runs it after founder seeding and before any case, exit 2 (harness error — evidence invalid for review) on any hit; `rendered/lib/browser.mjs` `provisionRenderedSessions` runs the same gate before any capture can be taken.
  3. Backend half: `human_seed_world_test.exs` asserts every display string the seed world writes (names, titles, locations, message bodies, captions) is token-free, plus the state distribution, call states, interlock, and idempotency.
- **Web tests:** two fixture files updated to human strings (`deckfix.test.tsx`: "Regression A/B" → Ethan Walker / Maya Torres; `dir4Reveal.test.tsx`: "RevPlan macreplay1" / "Expiry macreplay1" → "Dinner at Campfire" / "Sunday brunch at Herb & Wood"). Their assertions are shape/count assertions over the same constructed cards — unchanged in strength.

## 6. Suite results (verbatim)

All runs on this branch's own stack (Postgres 16 @ 127.0.0.1:5433, own test/dev DBs) during a period of heavy sibling-wave contention (VM load 12–34, three service restarts); contention artifacts are called out explicitly and each was isolated to ground truth.

**Backend — targeted seed suites (final state of the branch):**

```
founder_communication_seed_test.exs + founder_graph_commitment_seed_test.exs
+ human_seed_world_test.exs + repair18_pattern_enforcement_test.exs:
  27 tests, 1 failure → the 1 failure (interlock-via-reseed) fixed;
  human_seed_world_test.exs + plan_truth_attendance_test.exs after fix:
  11 tests, 0 failures
plan_projection_coherence_test.exs + messages_test.exs
+ two_user_plan_lifecycle_test.exs (after the read_files registration):
  29 tests, 1 failure (messages concurrency, see below)
messages_test.exs isolated rerun:
  11 tests, 0 failures
```

**Backend — full suite (unpinned), `mix test` in apps/opal_core:**

```
Finished in 1916.0 seconds (350.8s async, 1565.1s sync)
3175 tests, 3 failures
```

3175 = baseline 3170 + the 5 new `human_seed_world_test.exs` tests. The 3 failures, each resolved to ground truth:

1. `PlanProjectionCoherenceTest` read-path registry — REAL, mine: `human_seed_world.ex` queried plan tables without being registered. Fixed by registering it in `PlanProjection.read_files/0` with an audit note (the sanctioned path; the founder seeds are registered the same way). Coherence suite green on rerun.
2. `MessagesTest` concurrent duplicate `client_message_id` — DBConnection sandbox checkout dropped after 203–205 ms at load ~30. Isolated rerun: **11 tests, 0 failures**. Environmental.
3. `TwoUserPlanLifecycleTest` double-accept race — same sandbox-queue timeout class. Green in the coherence batch rerun. Environmental.

**API regression suite — definitive run** (fresh dev DB `opal_dev_r19seed`, fresh server, `OPAL_SESSION_PROVISION=synthetic`, `OPAL_SEED_MODE=1`, port 4109):

```
suite: api=http://127.0.0.1:4109 seed_mode=on run_tag=with the Saturday crew on the coast
sessions: a=synthetic:133b463f b=synthetic:1b4945d7
founder seed: communication status=200 graph status=200
seed world machine-speak gate: clean (0 hits)
summary: 101/101 PASS
```

Two earlier attempts are recorded for honesty: the first was killed mid-run by a VM/service restart (gate clean, cases passing up to the kill); the second reached **92/101** with 6 late failures (FR-18-W4-01a/b/c, W4-04a/b/c) — all setup-level 429s and a stale setup read. Root cause proven, not assumed: synthetic provisioning resolves fixture numbers to EXISTING accounts, and that run reused a dev DB already carrying two prior runs' history for the same accounts, so honest rate-limit buckets (and the founder-seed endpoint itself, which then returned 429) were pre-spent. On a fresh DB with virgin accounts the identical code passes 101/101, including every one of the 6. One REAL defect was caught by the first of these runs and fixed in-branch: FR-11-01 reads sent messages back by filtering bodies on `ctx.tag`; the first human marker draft dropped the tag from bodies (see §2) — marker fixed, no case edited, FR-11-01 green in both subsequent runs.

**Web (apps/opal_web, vitest):**

```
Test Files  16 failed | 179 passed (195)
Tests  23 failed | 1497 passed (1520)
```

Identical failing set to the R18 tip's own record (23 failed / 16 files; 1,497 passed): activation, availability, designTokens, firstRun, authorityRejectedStates, grammar, graphCalendaring, graphDetail, graphScroll, graphSpine, liveJourneyProof, pasteW4DeviceFixes, waveBChatsExact, waveBGraphsExact, waveBHomeExact, technicolorProduction. No new failures. Affected files run individually: `deckfix.test.tsx` (11) + `dir4Reveal.test.tsx` (17) = **28 passed**.

**Typecheck** (`tsc -p tsconfig.json --noEmit`): exactly **9 errors**, all pre-existing (OpalApp.tsx ×3, productClient.ts ×5, YouSettingsDestination.tsx ×1). Baseline held exactly.

**Formatting:** `mix format` applied to all touched backend files (AGENTS.md precommit convention); format-only diff, seed suites re-run green after it.

## 7. Notes for later waves

- **Calls wave:** the missed-call row + its `open_question_created` outcome are real records to render against; the seed payload returns them under `world.calls` (with `unresolved_action: true` on the missed row). Video needs the schema gap in §4 closed first.
- **Graphs wave:** past view can read the two completed plans today; private graphs and joiner location/distance need the §4 schema work — the world payload already names both absences in-band so a surface can render them as honestly absent.
- **Home wave:** the reveal/Needs-you is fed by two real pending viewer rows (Brick Hotel + Farmers Market graph plan); the deck's happening slot is fed by the market run's open window. Review runs must use a FRESH account (or fresh DB) for captures — the gate proves the seed world is clean, but case runs on the same account will still accumulate case-built plans (now human-titled) on top of it.
- **Review-run hygiene:** set `OPAL_RUN_TAG` to a fresh human phrase per review run; the gate will fail a run whose tag is machine-speak if it reaches a surface.
