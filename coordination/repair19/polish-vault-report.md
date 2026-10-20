# Founder Polish Wave - Cluster C: VAULT (P3 + P4 + Amendment A1 + follow-ups: Novelty record, N1 as corrected, Reaffirmation, N3, N4)

Branch: `muse/r19-polish-vault` (base 95319bd7, Repair #19 final tip). Worktree: `~/workspace/opal-graph/wt-polish-vault`. FOUNDER_ACCEPTED=NO. No merge, no push.

## 1. The privacy model as found

- `shared_plans.is_private` was a single PLAN-GLOBAL boolean (R19 W7), settable only by the plan's creator (`SocialFlow.set_plan_private/3`).
- Its effect was global exclusion: once the creator marked a plan, EVERY other participant lost it everywhere - plan lists (`list_plans_for_user` filtered it out), direct reads (`ensure_plan_access` in SocialFlow and JourneyAuthority, plus local copies in Artifacts, Checkin, PlanExecutionController), and the aggregate projections (NextPlan pick, ConversationAlignment seal, HomeProjection card + seal, Reveal query). FIX-A/BS-03/JA-02 built this deliberately; the founder's owner-vault spec supersedes it.
- The passcode vault itself (`graph_locks`, GraphLock, one per account) was already per-user and is unchanged.
- Orbit privacy was a separate flag (`opal_conversations.orbit_private`, per user, per anchor): it hides the viewer's own Opal-chat contents for that anchor in Center behind the same GraphLock passcode. It never touched plans, graphs, or the person thread - but its UI copy ("Make this orbit private", "Jordan Ellis is private", locked groups subtitled "Private") read as the same thing as graph privacy. That was the naming collision the founder hit live.

## 2. The privacy model as built (per-viewer vault)

MULTI-PARTY RULE (founder's spec, also recorded in code at `PlanPrivacyMark` and `SocialFlow.set_plan_private/3`): hiding is PER-VIEWER. A vault mark governs the marking viewer's surfaces only; other parties to the same plan keep their own view, unchanged, and the marker/state never leaks to them - their contracts carry `is_private: false` for a plan someone else marked, because `is_private` is now computed per viewer.

- New additive table `plan_privacy_marks` (migration `20261030020001_create_plan_privacy_marks.exs`): one row = one viewer vaulted one plan. The same migration copies every legacy global-private plan into a mark for its creator, so existing vault contents are exactly preserved; other participants regain their own view per the new rule. The legacy `shared_plans.is_private` column is kept (additive-only, machinery preserved) but nothing writes it and no reader treats it as an exclusion; `SharedPlan.to_contract/1` now emits `is_private: false` in the bare contract and viewer-scoped builders stamp the viewer's own mark (`SocialFlow.plan_payload/2`).
- `SocialFlow.set_plan_private/3`: any user who actually has the plan in their world (creator, participant, or conversation member - the existing `ensure_plan_access` membership law) may vault/un-vault it FOR THEMSELVES; a stranger gets `:not_authorized` (endpoint 403, unchanged mapping). The PlanTransition gate and the single-projection discipline are untouched.
- Access gates: vault marks are surface state, never access law. The global-private clauses were removed from `SocialFlow.ensure_plan_access/2`, `JourneyAuthority.ensure_plan_access/2` (+ conversation-peer variant), `Artifacts.get_plan_for_user/2`, `Checkin` sweep sourcing, and `PlanExecutionController.fetch_member_plan/2`. Membership is the whole rule again - the marker opens the plan from inside their vault; everyone else is unaffected.
- Awareness projections (the one derivation each): `NextPlan.pick_next` now filters plans marked by THE VIEWER (drives chats list, thread strip, and the call log's per-peer plan link, which all read NextPlan); `ConversationAlignment.seal_private_for_viewer/3` seals the thread alignment payload when the VIEWER marked the plan; `HomeProjection.from_plan_row/4` returns nil and `sealed_private?/3` seals when the viewer marked it; `Reveal.plan_items` excludes the viewer's marked plans via a marks subquery; `list_plans_for_user/2` returns every party's plans and stamps `is_private` per viewer via `plan_payload/2`.

## 3. File-by-file changes

Backend (`apps/opal_core`):
- `priv/repo/migrations/20261030020001_create_plan_privacy_marks.exs` (new) - table + unique index + legacy copy step.
- `lib/opal_core/social_flow/plan_privacy_mark.ex` (new) - schema + `marked?/2`, `marked_plan_ids/1`, `set_mark/3`, with the per-viewer rule in the moduledoc.
- `lib/opal_core/social_flow.ex` - per-viewer `set_plan_private/3`; `plan_payload/2`; list includes all parties, stamps per-viewer flag; `ensure_plan_access` private gate removed.
- `lib/opal_core/social_flow/shared_plan.ex` - contract emits `is_private: false` bare (per-viewer stamping only).
- `lib/opal_core/social_flow/next_plan.ex`, `conversation_alignment.ex`, `home_projection.ex`, `reveal.ex` - viewer-mark predicates as above.
- `lib/opal_core/social_flow/journey_authority.ex`, `lib/opal_core/artifacts.ex`, `lib/opal_core/social_flow/checkin.ex`, `lib/opal_core_web/controllers/plan_execution_controller.ex` - global-private access denials removed.
- Tests rewritten to the new spec (old assertions encoded the superseded global model): `test/opal_core_web/r19_graphs_test.exs` (per-viewer list/endpoint cases, stranger refusal, direct reads unaffected both directions, conversation-plan membership case) and `test/opal_core_web/repair19_ja02_private_projections_test.exs` (marker seals own four projections; other party unchanged incl. post-mark fact updates and no marker leak; reverse direction after un-mark + other party marking).

Web (`apps/opal_web`):
- `src/c2/shell/C2Shell.tsx` - Search now receives only non-private plans (search results are outside the vault); the dock orb's ambient state no longer derives from private plans.
- `src/c2/shell/C1ShellHosts.tsx` - Center: orbit-sheet plan rows exclude viewer-vaulted plans; `plansById` and the anchor-candidate list exclude them too (no Center chip/candidate presence).
- `src/c2/shell/shellData.ts` / projections - already separated `is_private` at the one adapter (Graphs groups vs privateCards, Home feed filter); now correct per-viewer because the flag itself is per-viewer. Graphs area naming in `C2Graphs.tsx` - see the N1 correction in §7 (final title: "Private graphs").
- Naming collision (orbit side): `OrbitSheet.tsx` toggle is now "Hide these Opal chats behind my passcode" / "Stop hiding these Opal chats behind my passcode" with a note stating it never hides a plan or graph; Center's locked orbit subtitle "Private" -> "Opal chats hidden" (`C1Surfaces.tsx`); `OrbitUnlockPrompt.tsx` header "{label} - Opal chats hidden" and body references "Private graphs" (per the N1 correction). F6 semantics preserved (unknown state never asserts hidden; explicit flag locks; read-back drives the toggle) with updated copy in `f6OrbitPrivacy.test.tsx`, `fa02OrbitUnlockBreadth.test.tsx`, `opalChatDoorway.test.tsx`, `r19FixB.test.tsx`.

P4 - orbit sheet legibility (`OrbitSheet.tsx` + `OrbitSheet.css`):
- Plain-language purpose header (`orbit-sheet-purpose`): "Everything Opal keeps together about {name}: your plans with them, and your chats with Opal about them." (plan/place variants likewise).
- Clearly labeled blocks: PLANS with the note "Plans you share with {name}. Tap one to open it."; "YOUR CHATS WITH OPAL" (was "OPAL CONVERSATIONS") with the note "Chats between you and Opal about {name} - never messages to {name}." One quiet note style (`.orbit-sheet-section-note`), no new visual noise.

Amendment A1 - privacy via long-press (no always-visible make-private control anywhere):
- New reusable pattern `src/c2/CardContextMenu.tsx`: `useLongPress` (500 ms hold; movement cancels; the click after a hold is swallowed; context-menu event also opens), `LongPressRegion` wrapper, and `CardContextMenu` (token-styled sheet menu, Escape/backdrop close, focus to first item). Styles in `c2shell.css` (`.c2s-menu-*`, token-only - caught and fixed a raw-hex fallback the A1 static audit bans).
- Graphs list cards and vault cards: the visible "Move to My private graphs" / "Make visible" rows are GONE. Long-press (or right-click / context-menu key) opens the card menu: Open graph, Make private / Make public, Drop it when droppable.
- Graph detail: the make-private button row is GONE. Privacy lives in the detail's overflow - a "More actions" button (`c2-detail-overflow`) opening the same menu (item keeps testid `c2-detail-private-toggle`, labels Make private / Make public) - and long-pressing the detail's plan card opens it too. The private-state note now states the true per-viewer semantics.
- Orbit sheet: the private row is REMOVED entirely. The renamed orbit-hide lives behind the sheet's own "Orbit options" affordance (`orbit-sheet-options`); the toggle renders only after opening it.
- Pins updated: `r19Graphs.test.tsx` asserts no make-private control exists on cards or in the vault, opens the menu via the context-menu event, and toggles both directions through the real handler; `polishVault.test.tsx` pins the long-press timing, the detail overflow path both directions, and the orbit options gate.

Follow-ups (N1 as corrected / Reaffirmation / N3 / N4) - file-by-file:

- N1 + Reaffirmation (web copy only): `C2Graphs.tsx` - title "Private graphs", aria label "Private graphs passcode", "Open Private graphs", "Close Private graphs" (was "Lock My private graphs"), visibility-only gate/empty/detail copy (no "moves here", no lock framing); `OrbitSheet.tsx` + `OrbitUnlockPrompt.tsx` cross-references now say "Private graphs". Pins: `polishVault.test.tsx` N1 describe (resting-state zero-prompt scan incl. Past lens + gate; title present; no lock wording); backend round-trip pin in `r19_graphs_test.exs` (see §6).
- N3 (web): `RelationshipPicker.tsx` - Family depth renders inline inside the type radiogroup directly under the Family row (`React.Fragment` per option), `familyOpen` accordion state (tap Family toggles; opens expanded when Family is current), `aria-expanded` on the Family radio. Pins: `relationshipPicker.test.tsx` (new file, N3 + N4 describes); `r19Diffix.test.tsx` expectations updated for the N4 payload field.
- N4 (backend): `priv/repo/migrations/20261030020002_add_age_band_to_relationship_types.exs` (new, additive column); `relationships/relationship_type.ex` (field + cast + inclusion validation + `age_bands/0`); `relationships.ex` (`set_age_band/3`, `age_band_options/0`, `age_band` in contacts + both contracts); `relationship_controller.ex` (index serves `age_bands`; `apply_age_band/4` leg in the one PUT write). Pin: `relationship_api_test.exs` N4 case.
- N4 (web): `opalUi/relationshipTypes.ts` (`AgeBandValue`, `AGE_BAND_OPTIONS`, `ageBandLabel`, `ageBandIsMinor`); `api/productClient.ts` (`age_band` on relationship/contact contracts; `ageBand` statement in `setRelationshipType`); `c2/shell/RelationshipPicker.tsx` (band radiogroup in the Family accordion; band drives the minor flag); `c2/shell/projections.ts` (`PersonProfileProjection.ageBand`); `c2/shell/PersonProfile.tsx` (passes `currentAgeBand`); `c2/shell/C1ShellHosts.tsx` + `C2Shell.tsx` (rel-row `age_band` read-backs, profile adapter, save handler pass-through).

## 4. Surface-sweep case results

Surfaces proven absent for a viewer-private plan / present for a non-private plan, and restored after un-privating:

| Surface | Mechanism | Proof |
|---|---|---|
| Graphs list (groups + lens counts) | shellData adapter separation | web `polishVault.test.tsx` + `r19Graphs.test.tsx` adapter cases |
| Vault itself ("Private graphs") | privateCards behind GraphLock gate | `r19Graphs.test.tsx` gate cases (wrong code shut, right code opens, closing hides) |
| Graph detail entry points | list/opening/search carry no private card; detail opens only from vault | adapter cases + A1 detail cases |
| Center deck / opening | C2Shell opening filter over non-private plans | `polishVault.test.tsx` opening composition case |
| Search results | C2Shell passes non-private plans only to SearchDestination | code + composition (see gaps) |
| Chats list awareness | backend NextPlan per-viewer pick (Messages rows) | Elixir JA02 case (rows both accounts) |
| Thread strip / alignment | NextPlan + ConversationAlignment seal (viewer's mark only) | Elixir JA02 case (alignment endpoint both accounts) |
| Call log plan link | Calls rows read NextPlan.for_peer (same pick) | Elixir JA02 case (`for_peer` both directions) |
| Home | HomeProjection card/seal per-viewer + web Home feed filter | Elixir JA02 case + shellData filter |
| Orbit sheet plan rows | host excludes viewer-vaulted plans | code + C1ShellHosts filter (see gaps) |
| Reveal / Center deck items | Reveal per-viewer exclusion | Elixir JA02 case |

Two-account case (Elixir JA02 + r19_graphs): A marks -> A's surfaces seal; B's list, NextPlan, Reveal, HomeProjection, alignment and direct reads are unchanged, B's contract shows `is_private: false` (no marker leak); B can mark for themselves independently; un-marking restores the marker's surfaces.

Commands + counts (all run in this worktree):

- Backend compile: `mix compile` (env: `polish-scratch-vault/env.sh`, MIX_ENV=dev) - exit 0, warnings only (all pre-existing patterns).
- Migration: `MIX_ENV=test DATABASE_URL=ecto://postgres@127.0.0.1:5433/opal_test_polish_vault mix ecto.create && mix ecto.migrate` - all migrations applied incl. `20261030020001` (its INSERT-SELECT copy step logged, 0.2s). One earlier migrate attempt died on a DBConnection queue timeout while the VM was at load ~40 with every cluster running; the retry completed cleanly - transient contention, not a migration defect.
- Backend vault cases: `mix test test/opal_core_web/r19_graphs_test.exs test/opal_core_web/repair19_ja02_private_projections_test.exs` - **14 tests, 0 failures**.
- Backend regression (touched modules): HomeProjection + attendance + DIR-1 NextPlan + Repair18 revision/plan-edit files - **53 tests, 0 failures**; Artifacts + Calls + artifact API + two-user lifecycle + channel plan state + conversation-create-plan - **35 tests, 0 failures**.
- Web targeted: `polishVault.test.tsx` (5) + `r19Graphs.test.tsx` (11) + `f6OrbitPrivacy.test.tsx` (5) + `fa02OrbitUnlockBreadth` + `opalChatDoorway` + `r19FixB` + `c1.test` (57 across the second batch) + `c1ShellWiring` + `homeSocial` - all green.
- Web full suite: `npx vitest run` - final accounting **23 failed / 16 files**, exactly the stated base floor (1754+ passed in the full run). The one failure attributable to this cluster during the run (A1 static audit: a raw `#fff` fallback in the new menu CSS) was fixed; the audit file passes on re-run, and every remaining failure sits in legacy authority/source-scan files this cluster never touched (activation, availability, designTokens, firstRun, authorityRejectedStates, grammar, graphCalendaring, graphDetail, graphScroll, graphSpine, liveJourneyProof, pasteW4DeviceFixes, waveBChats/Graphs/HomeExact, technicolorProduction) - several verified pre-existing by their failure content (base-source scans of legacy files).
- Typecheck: `npm run typecheck` - **exactly 9 errors**, all pre-existing (OpalApp.tsx x3, productClient.ts duplicate identifiers x5, YouSettingsDestination.tsx x1); none in touched files.
- Format: `mix format --check-formatted` over every touched backend file - clean except `r19_graphs_test.exs`, which is unformatted at BASE too (verified against HEAD; the unformatted hunk predates this cluster). `mix precommit` as a whole cannot pass at base (compile --warnings-as-errors over a codebase that compiles with many pre-existing warnings), so the targeted equivalents above stand in for it.

Follow-up runs (N1 corrected / Reaffirmation / N3 / N4, after the service restart interrupted the first attempt; migration `20261030020002` verified applied):
- Backend: `mix test test/opal_core_web/relationship_api_test.exs test/opal_core_web/r19_graphs_test.exs test/opal_core_web/repair19_ja02_private_projections_test.exs` - **20 tests, 0 failures** (includes the N4 age-band case, the state-preservation round-trip pin, and all prior vault cases). Relationships regression: `relationships_test.exs` + `repair15_family_profile_test.exs` + `relationship_access_api_test.exs` + `relationship_access_test.exs` - **46 tests, 0 failures**.
- Web targeted: `r19Graphs` + `polishVault` + `relationshipPicker` (new) + `r19Diffix` + `f6OrbitPrivacy` + `c1ShellWiring` + `r19FixB` - **80 tests, 0 failures**; `homeSocial` - 19, 0 failures; `fa02OrbitUnlockBreadth` + `opalChatDoorway` - 40, 0 failures.
- Web full suite: `npx vitest run` - **23 failed / 16 files** (1761 passed), exactly the base floor, all in the same untouched legacy files.
- Typecheck: `npm run typecheck` - **exactly 9 errors**, unchanged.

Commits on `muse/r19-polish-vault`: `611f57b8` (backend), `b8719c7d` (web sweep/naming/P4 - includes the C2Graphs/OrbitSheet surface wiring the A1 pattern plugs into), `b7a3b20a` (A1 pattern + pins), `ce87381a` (N1 corrected naming + reaffirmation pins), `4ea255f7` (N3 accordion + N4 age bands). Not merged, not pushed.

## 5. Novelty record (founder standing mandate - alternatives genuinely considered per pattern)

### Pattern 1 - the vault's surface expression (Private graphs)
- **Floor (founder's semantics):** iPhone hidden album - a plainly titled space behind the passcode; items vanish from every other surface and reappear on un-hiding; the object itself is never touched.
- **Alternative considered - "unlit stones":** private graphs rest in the Graphs list as dimmed, title-less stones that only kindle (reveal title/content) after the passcode. Rejected: it leaks PRESENCE (count, position, timing) on the very surfaces the founder ordered empty ("appears NOWHERE outside the vault" - a stone is an indicator); it also fails the clarity bar (a first-time user cannot say what the stones are) and the quiet bar (a mysterious object invites poking, i.e. noise). The hidden-album floor is also the clearer senior pattern.
- **Alternative considered - passcode-free soft gate (Face-ID-style "hold to reveal" inline):** rejected as weaker than the founder's explicit passcode semantics and as a second gate pattern beside GraphLock (machinery preserved: one gate).
- **Pick:** the gated list exactly as built - plain title "Private graphs", passcode entry, cards inside only. It is the floor semantics with zero leakage and zero invention.

### Pattern 2 - the orbit sheet
- **Alternative considered - "constellation sheet":** render the person's plans and Opal chats as one radial mini-orbit around the person (novel, on-brand). Rejected: the sheet's job is scoping actions (open a plan, archive/remove a chat, hide chats) under time pressure; a radial layout buries the plan-vs-chat distinction P4 exists to make legible, and novelty that costs first-glance comprehension fails the identity bar ("functional novelty only").
- **Alternative considered - two-tab sheet (Plans | Opal chats):** rejected: tabs hide one block entirely (a first-time user cannot say what the sheet holds), and every action here is single-tap shallow - labeled stacked blocks show everything at a glance.
- **Pick:** the labeled stacked sheet as built (purpose header + PLANS + YOUR CHATS WITH OPAL + Orbit options). Quiet, informative, no noise; the novelty budget in this cluster is spent where it is functional - the long-press card menu (A1) and the inline Family accordion (N3) - not on re-dressing a scoping sheet.

## 6. Reaffirmation audit - private is a STATE, never a destruction

- **Copy audit** over the whole privacy surface family (Graphs list/vault/detail copy, orbit sheet + options, unlock prompt, Center locked-group subtitle): no string implies deletion, disappearance of the object, or loss. The vault copy now speaks only of visibility: "Private graphs show only here, and stay hidden from your other lists."; the empty-vault line states the object "stays fully intact, and everyone else on it keeps their own view"; the detail note likewise. Orbit copy says "hide these Opal chats" (visibility), never removal.
- **Behavior audit:** marking writes/deletes exactly one row in `plan_privacy_marks`; un-marking deletes that row. Nothing else in the plan, its participants, history, or projections is written by either direction (verified by reading `PlanPrivacyMark.set_mark/3` + the pin below).
- **Round-trip pin (backend, `r19_graphs_test.exs`):** "private is a STATE, never a destruction" - captures the plan and its full history payload before marking; while marked, asserts the marker still reads the identical plan (title/status) and identical history, and the other party still reads the plan; after un-marking, asserts title/status/time_label, history lines AND who-list are byte-identical to before, and the list row matches with only `is_private` flipped back to false.
- **Resting-prompt pin (web, `polishVault.test.tsx`, N1 section):** the rendered Graphs list in the All AND Past lenses plus the passcode gate contain zero make-private/make-public wording in resting state - the long-press menu (deliberate act) is the sole carrier of those words, and the detail's overflow menu is the keyboard path. Chat log / thread / call log absence stays proven by the JA02 cases (NextPlan rows, alignment seal, `for_peer`) in §4.

## 7. N1 as CORRECTED (2026-10-19 17:52 PDT) - naming

The 17:50 "no titling" phrasing is struck, per the correction. As built now:
- The space's plain title is **"Private graphs"** everywhere user-facing: the Graphs area heading, the passcode field's aria label ("Private graphs passcode"), the open button ("Open Private graphs"), the close button ("Close Private graphs" - the earlier "Lock My private graphs" wording is gone), the orbit sheet's cross-reference, the OrbitUnlockPrompt body ("the same passcode as Private graphs"), and the graph detail's private note.
- **Lock framing: zero occurrences** in the vault's user-facing copy (no "Locked private graphs", no lock-titled gate; the gate heading is the plain title + "Enter your passcode to open this area."). The passcode gate itself stands unchanged (GraphLock). Code identifiers (`graphLock`, `c2-private-lock` testid) are not user-facing copy and are unchanged.
- The A1 controls pin is unchanged: no always-visible make-private control on any card/sheet; the long-press menu's Make private / Make public action stands exactly as built.

### Vault USE-NOTE (recorded design, per N1)
The private space serves **intentions/goals a person is working toward, not only plans**. Assessment of today's shell: intentions and working goals DO exist in the shell (`IntentionContract` / `WorkingGoalContract`, served at `/api/v1/product/graph/intentions` and the goals endpoint, rendered in the Graphs adoption sections), but **neither contract carries any privacy/vault field and there is no mark state or write path for them** - so the vault cannot admit them under the per-viewer rule today. The use-note stands as the recorded design; the data gap is declared here, honestly: admitting intentions/goals needs an additive per-viewer mark for intention/goal ids (same `plan_privacy_marks` discipline, second table or a typed target column) plus the same projection honoring - a follow-up build, not built in this wave.

## 8. N3 - Family picker accordion (implemented + pinned)

`apps/opal_web/src/c2/shell/RelationshipPicker.tsx`: choosing Family now expands the depth **inline, directly under the Family row inside the type radiogroup** (subtype radiogroup + minor flag + age-band block), as a sibling in the list - not a block below the whole radiogroup, not a step/screen. Tapping Family again collapses it in place (selection and the sheet's one Save stay); it opens expanded when Family is the current type. Non-family taps still save-and-close in one tap. Pins in `relationshipPicker.test.tsx` (N3 describe): DOM order proves the expansion sits between the Family row and the next type row; subtype is selectable with no navigation; collapse keeps the subtype through to the Save payload; the existing round-trip cases in `r19Diffix.test.tsx` stay green (family payload gains the N4 `ageBand` statement - see §9).

## 9. N4 - Age bands (affordance + banding only; NO policy)

Exact data shape (what later policy binds to):
- **Storage:** additive column `relationship_types.age_band :string`, nullable (migration `20261030020002_add_age_band_to_relationship_types.exs`). One row = one viewer's relationship record toward one counterpart, so the band is the viewer's established fact about that person on that record - it is NOT tied to the family type and is NOT cleared by type changes (age does not change when the tie label does). `OpalCore.Relationships.set_age_band/3` establishes or clears (nil clears); unknown values return `{:error, :invalid_age_band}` and are never stored; the changeset also validates inclusion.
- **Values:** `"under_13"` (Under 13), `"age_13_17"` (13-17), `"adult"` (Adult, 18 or over); `null` = not established. Minor in the founder's terms is 17 and under - exactly the two non-adult bands.
- **Contracts:** `age_band` is emitted by `Relationships.to_contract/1` (relationship rows), by `to_contact_contract/1` (contacts), and in `contacts_with_types/1`; the relationships index also serves `age_bands: [%{slug, label}]` beside `family_subtypes`.
- **Write path (the one existing write):** `PUT /api/v1/product/relationships/:contact_user_id` with an optional `age_band` key - absent key = no statement (stored band untouched); present slug = establish; present null = clear. Unknown slug = 422. Web: `setRelationshipType(..., { ageBand })` sends the key only when a statement is made; the picker's family save always states the band as shown; non-family one-tap saves make no band statement.
- **Display:** in the picker, the age-band radiogroup sits directly under the minor flag inside the Family accordion ("{name}'s age band", with a line stating plainly that recording it changes nothing about what Opal does today), preselected from the record; choosing a minor band turns the minor flag on and Adult turns it off (one truth: minor = 17 and under); clearing leaves the manual flag as it stands. The band also reaches the person profile projection (`PersonProfileProjection.ageBand`) so the picker reopens on the stored fact. No other surface displays it yet - display follows the minor indicator's footprint, which today is the picker itself.
- **Policy:** NONE implemented, by instruction. Nothing reads `age_band` to restrict messaging, care surfaces, discovery, or anything else; the column, contracts, and picker establishment are the whole change. Backend pin: `relationship_api_test.exs` N4 case (round-trip under family, persistence across a type change with no statement, statement under a non-family type, explicit-null clear, unknown slug 422 with nothing stored). Web pins: `relationshipPicker.test.tsx` N4 describe.

## 10. Honest gaps
- The thread-orbit sheet in the chats host builds its single plan row from the thread's plan fact; when the viewer has vaulted that plan the backend thread payload is sealed (alignment) and NextPlan is nil for the viewer, so the fact is absent - asserted by mechanism, not by a dedicated render case.
- Search and the orbit-row exclusion are one-line filters over the viewer's own flagged list at the composition points; they are covered by adapter-level cases and source, not by a full C2Shell render (the shell render suite mocks the plans read empty).

## 11. FRAME LIST for the integrator (seeded app, both modes each)

No captures were taken by this cluster (per instructions). Reach instructions assume the seeded human world (viewer + Maya/Jordan plans) with a graph-lock passcode set (2468 in seed conventions - verify against the seed before shooting).

1. **Private graphs - gate** - Graphs tab, scroll to "Private graphs": plain title, passcode field + "Open Private graphs" button, count line only, no graph titles, no lock wording anywhere. Light + dark.
2. **Private graphs - open** - enter the passcode: the private graph card(s) visible inside the area only; "Close Private graphs" at the bottom. Light + dark.
3. **Absence proof - chats list** - with a plan the viewer has vaulted in the world: Chats list shows the conversation with NO plan strip/next-plan for it, while a non-private plan's strip shows on its conversation. Light + dark.
4. **Absence proof - Home** - Home feed with the vaulted plan in the world: no card for it; a non-private plan card present. Light + dark.
5. **Long-press menu on a graph card (A1)** - Graphs list, long-press a non-private graph card: menu sheet open with Open graph / Make private / Drop it (when droppable) / Cancel. Light + dark. (Integrator shoots this frame per A1.)
6. **Long-press menu in Private graphs (A1)** - inside open "Private graphs", long-press the private card: menu shows Make public. Light + dark.
7. **Graph detail overflow (A1 a11y path)** - open a graph detail, tap "More actions": menu open with Make private; no make-private row anywhere on the detail. Light + dark.
8. **Orbit sheet re-shot (P4)** - Center -> an orbit group (or person thread plan-awareness -> orbit) -> open the orbit sheet for a person (Jordan Ellis): purpose header, PLANS block with its note, YOUR CHATS WITH OPAL block with its note, "Orbit options" present and NO private row visible. Then tap "Orbit options": the "Hide these Opal chats behind my passcode" toggle + the not-a-graph note. Light + dark.
9. **Orbit hidden subtitle** - with Jordan's orbit hidden behind the passcode: Center orbit group header shows the name + "Opal chats hidden", no preview, no count. Light + dark.
10. **Relationship picker - Family accordion (N3) + age band (N4)** - open a person's profile -> "Who they are to you" -> tap Family: the subtype list, minor flag, and age-band options (Under 13 / 13-17 / Adult (18 or over)) expanded INLINE under the Family row; tap Family again to show the collapse. Light + dark.
