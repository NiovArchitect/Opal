# Founder Polish Wave — Cluster G2: Place-Coordinates Writer (the BS-06 writer gap)

- **Branch:** `muse/r19-polish-placewriter` (base `b9323730`, integrated polish tip)
- **Commits:** `244dc500` (backend writer + pins), `04358b5e` (web payload types)
- **Worktree:** `~/workspace/opal-graph/wt-polish-placewriter`
- **FOUNDER_ACCEPTED = NO** — no merges, no pushes; `muse/repair-17` untouched.

## The gap

Flagged by the leave-by cluster (`polish-leaveby-report.md`, "Honest absences"): nothing in the repo wrote `shared_plans.place_lat` / `place_lon` outside the schema/changeset, so the shipped P10c leave-by derivation truthfully read `no_place_coordinates` for every real plan. This cluster wires the writer.

## Paths investigated (scope 1 + 3)

**Create paths** (all in `apps/opal_core/lib/opal_core/social_flow.ex`):
- `SocialFlow.create_tentative_plan_from_conversation/3` — behind `ConversationController.create_plan` (POST `/api/v1/product/conversations/:id/plans`) and `OpalConversationController.create_plan`'s conversation sibling; also the delegation target for mediation (`ProductSurface.create_plan_from_mediation/3`) and fold materialization (`ConversationAlignment.materialize_new_plans/2`), so both inherit the writer.
- `SocialFlow.create_tentative_plan_from_center/2` — behind POST `/api/v1/product/opal/plans` (Center "Go with this").
- `SocialFlow.create_plan_from_graph_create/2` — behind POST `/api/v1/product/opal/plans/graph-create`.

**What place data reaches the backend today:** name/address/place-id only. The gateway candidate shape (`Gateway` places results, consumed by `ProviderAction`) carries `name`, `address`, `provider_place_id`, **`lat`, `lon`** — coordinates exist, but only server-side, at the moment a candidate is resolved/attached.

**The server-side attach:** `ProviderAction.attach_selected_venue/4` (`apps/opal_core/lib/opal_core/center/provider_action.ex`) already received the gateway venue map and stamped `alignment["venue"]` with `lat`/`lon`/`provider_place_id` — but never the row columns. Its callers: Center option selection (`ActionOrchestrator`, line ~1654) and the exact-entity resolve paint path. The orchestrator's fallback candidate (`action_orchestrator.ex:1740`) is `%{"name" => name, "provider" => "geoapify", "search_geography" => dest}` — **no coordinates**.

**Web truth (scope 3 decision):** the web does **not** hold candidate coordinates anywhere.
- `apps/opal_web/src/opalUi/placeComposition.ts`: `PlaceCandidate = {id, name, area, quiet?, cuisine?, score?}`; `candidatesFromProviderProjection` maps provider candidates down to those fields, dropping lat/lon.
- The OpalApp place-sheet options are `{id, name, area}`; C2 CreateFlow, CenterLifeGraph and the socialAuthority GraphCreateFlow collect free-text location.
- Server-side resolution from a place id is not available: Geoapify's `get_place/1` is `{:error, :not_implemented}`.

**Decision (per the brief's own clause):** the create/attach path *already resolves the chosen place server-side* — at `attach_selected_venue` — so the coords are taken **from that resolution**. Web passthrough of coordinates the client never holds was ruled out; the create/edit payloads additionally accept the pair additively for any caller that does hold it.

**Edit path:** `SocialFlow.edit_plan_details/1` (PATCH `/api/v1/product/opal/plans/:id`; fields title/location/caption) — the location edit is where a plan's place changes. **Place-type conversion:** `SocialFlow.place_conversion_attrs/4`, shared by the direct conversion and the revision-accept apply — the `alignment["suspended_place"]` stash already round-trips location/venue/place.

**Contract:** `SharedPlan.to_contract` and the web `OpalPlanContract` already carried `place_lat`/`place_lon` (W7) — read side was ready; only the writer was missing.

## The wiring (scope 2)

- **One reader:** `SocialFlow.place_coordinates_from_params/1` → `{:ok, {lat, lon}}` | `:absent` | `{:error, :invalid_place_coordinates}`. Accepts payload keys (`place_lat`/`place_lon`) and gateway keys (`lat`/`lon`/`lng`). Never geocodes, never invents; a lone, non-numeric, or out-of-range pair is an error — never clamped, never half-written.
- **Creates:** all three create functions validate the pair up front (invalid → the create refuses, zero rows written) and stamp it via `put_place_coordinates/3`. Virtual plans never carry a physical place's pair. The dedupe merge (`merge_fragments_into/2`) fills a survivor's **empty** pair from a fragment carrying one; it never overwrites an existing pair.
- **Attach (the real candidate writer):** `attach_selected_venue/4` now writes the venue's pair onto the row columns in the same changeset that stamps the alignment venue map. A candidate **without** a valid pair **clears** the columns — the plan's place is now that candidate, and the old place's coordinates must not survive onto it.
- **Edit:** `place_lat`/`place_lon` join `@plan_edit_fields` as a pair. A location edit **with** a pair updates coords; a location edit **without** a pair **clears** them (the new place's coords are unknown — stale coords would route leave-by to the wrong place); a title/caption-only edit leaves them untouched; a lone coordinate refuses the **whole** edit atomically (`:invalid_place_coordinates`).
- **Conversion:** to-virtual clears the row pair and stashes it in `alignment["suspended_place"]` alongside the venue; convert-back restores the same pair (a half pair restores as no pair).
- **Changeset pair law:** `SharedPlan.changeset` now validates on the row itself — both present with lat −90..90 / lon −180..180, or both absent — so every present and future writer inherits it. (Decimal-aware: cast values arrive as `%Decimal{}`, normalized before the number checks.)
- **Controllers:** invalid pair → 422 `invalid_place_coordinates` on all three create routes (conversation controller + both OpalConversationController create actions); PATCH → 422 field error on `place_lat`.
- **Web (additive, no new endpoint):** `createConversationPlan`, `createCenterPlan`, `createGraphPlan` gain optional `place_lat`/`place_lon`; `patchOpalPlan` can send the pair; `opalPlanEditError` accepts the `place_lat` field. No current web caller passes them (no surface holds coords — see above); each site documents that.

## Pins (scope 4) — new tests, all green

- `apps/opal_core/test/opal_core/social_flow/place_coordinates_writer_test.exs` — **21 tests**: the reader (pair/absent/lone/out-of-range/non-numeric); changeset pair law; conversation create with candidate → row + `plan_payload` contract carry the pair; without → null; invalid → refused, zero rows; virtual create → null pair; Center + graph create stamp/refuse; Center dedupe merge fills-empty-never-overwrites; **attach stamps the gateway candidate's pair**; re-place with the name-only fallback candidate **clears**; edit follow/clear/preserve/atomic-refusal; conversion clear + stash/restore; **the chain**: conversation create *with* a candidate (start_at settled as test scaffolding for the clock only) + location share + route stubbed at the `:geoapify_http_fun` seam (leave_by_test pattern) → `LeaveBy.for_plan` state `ok`, 1500 s duration, route actually called; the same create *without* a candidate → `no_place_coordinates`, route never called.
- `apps/opal_core/test/opal_core_web/place_coordinates_writer_api_test.exs` — **3 tests** over real HTTP (activation-auth pattern from `graph_create_repair16_api_test.exs`): conversation create 201 → response contract + DB row + list read-back carry the pair; without → null; out-of-range → 422 `invalid_place_coordinates`, row count unchanged; Center + graph-create carry the pair; PATCH moves the pair with the place, clears it on a pair-less location move, and 422s a lone coordinate with `errors.place_lat` while the row stays untouched.

## Founder seed (scope 5) — noted, NOT hand-edited

`FounderCommunicationSeed.ensure_juniper_plan!` (`apps/opal_core/lib/opal_core/social_flow/founder_communication_seed.ex`, ~line 304) builds the "Dinner at Juniper & Ivy" `SharedPlan` **directly through `SharedPlan.changeset`** with title/location/alignment — it does not flow through any plan-creation path and no place candidate exists on that path; the `Place.Catalog` fixture carries no coordinates. Per the brief, the seed data was **not** hand-edited outside the writer pattern. The seeded plan therefore still carries null coords (valid under the new pair law), and the capture phase's documented precondition — manually stamping `place_lat=32.7231`, `place_lon=-117.1683` on the seeded row — remains the fallback.

## Floors — exact results actually observed

Environment note: the shared Postgres on :5433 (and its /tmp toolchain) had been wiped between waves; a fresh PG16 cluster was initialized for this run (same persistent binaries at `~/workspace/pg`, data in `/tmp/pgdata-g2`), `opal_core_test` created UTF8/template0 and migrated. `DATABASE_URL="ecto://postgres:postgres@127.0.0.1:5433/opal_core_test"`.

- **New pins:** writer suite 21/21, API suite 3/3 (also 26/26 combined with `center_plan_test.exs` after formatting).
- **Targeted floor set** (leave_by + leave_by_materiality + center_plan + virtual_place_b1 + graph_create_repair16): **57 tests, 1 failure** — the failure is `LeaveByTest` "ok: full derivation…" asserting `leave_by_at` string equality (`"2026-10-20T04:48:24.000000Z"` vs `"2026-10-20T04:48:24Z"`). **Verified pre-existing in this environment:** with all G2 changes stashed, unmodified base `b9323730` fails the identical assertion (`mix test test/opal_core/social_flow/leave_by_test.exs` → 15 tests, 1 failure). Cause: the fresh cluster's timestamp decode surfaces microsecond precision in the derived instant's ISO string. It is not a regression of this change; the G2 chain pin deliberately asserts state/duration, not that string.
- **Full backend suite:** **3306 tests, 1 failure** — the same single LeaveByTest assertion (`mix test --failed` confirms it is the only one). All graphs suites, Center/provider suites, edit/conversion suites, etiquette and seed suites are inside that run and green.
- **Web** (after `npm ci` in this worktree): **23 failed tests / 16 failed files** — exactly the standing baseline (raw vitest tail: "Test Files 16 failed | 226 passed (242); Tests 23 failed | 1880 passed (1903)"). Correction: an earlier truncated delivery of this run showed smaller passed totals (185 passed / 56 files); the full raw output above supersedes it — the floor figures (23 failed / 16 files) are identical in both. The web commit message (`04358b5e`) repeats the truncated passed counts in a parenthetical; the floor claim in it is exact. **Typecheck: exactly 9 errors** (OpalApp `Tab` ×3, `productClient.ts` duplicate `plan_type`/`online` identifiers ×5, `YouSettingsDestination` `handle` ×1) — all pre-existing, none in G2-edited regions.
- **Format:** files formatted at base (`social_flow.ex`, `shared_plan.ex`, `opal_conversation_controller.ex`, both new test files) were `mix format`-ed and re-verified `--check-formatted` clean; `provider_action.ex` and `conversation_controller.ex` are unformatted at base, so their G2 hunks were hand-formatted to match surrounding style instead of reformatting the files. `mix precommit`'s `compile --warnings-as-errors` step cannot pass on this codebase (extensive pre-existing warnings at base) and was not used as a gate; plain `mix compile` is clean of new warnings from G2 files (the one grouping warning near the edit region is pre-existing at base).

## Remaining absences / honest notes

- **No web surface can originate coordinates today** — the writer's coordinate supply is the server-side gateway resolution (attach) plus any API caller that holds a pair. If a future surface adopts gateway candidates client-side, `candidatesFromProviderProjection` must stop dropping `lat`/`lon`; that is a named follow-up, not silently assumed here.
- **Seed plan coords remain null** (see scope 5) — capture keeps its documented manual-stamp precondition.
- **Graph-create dedupe returns the survivor unchanged** (its pre-existing shape — unlike conversation/Center it never merged fragments), so a graph-create replay with coords does not fill a coord-less survivor; the survivor's own creation remains its coordinate source. Conversation and Center dedupe merges do fill.
- **Fold/mediation creations** delegate to the conversation create and inherit the writer, but the fold itself carries no candidate coordinates today, so those plans stay null until a place is attached/edited — truthful, not a silent gap.
- Internal create callers that build plans from planning context (`ProviderAction.ensure_plan`, `OpalPlanConfirm`) pass no coords; their plans get coordinates when the venue attach lands — which is the flow's own next step.
