# Repair #19 — W18-FIX Integration Reconciliation Report

Worktree: `~/workspace/opal-graph/wt-r19-fix`, branch `muse/r19-fix`, off `486f20e1` (fully-merged R19 tip).
Three commits, one per item, in order. Not pushed.

| Commit | Item |
|---|---|
| `28d7ef01` | Item 1 — listen-rail fixture re-pinned to the separation law |
| `2f62ed08` | Item 2 — glass budget: raw count → sanctioned-sites registry |
| `fc0dc9ea` | Item 3 — familyOfStatus governed statuses |

---

## Item 1 — Listen-rail fixture re-pinned to the separation law

**Before:** `r19ListenRail.test.tsx` — "ThreadShell: Opal messages carry no rail; read aloud sits outside the bubble" FAILED (`expected null not to be null` at the read-aloud button assertion). The fixture fed an Opal-authored message to `ThreadShell` and expected a read-aloud control; since W14, `messagesForSurface("person-thread", …)` filters Opal-authored messages out of person threads entirely (separation law, founder item 18; pinned 39/39 by `opalChatDoorway.test.tsx`), so the control legitimately never renders.

**After:** the fixture was fixed, not the law. The ThreadShell leg is now **"ThreadShell: SEPARATION — an Opal-authored message renders nothing in a person thread"**, a separation regression pin:

- TTS is mocked **configured** (`tts_configured: true`), so the absence is the filter's doing, not an honestly-absent provider.
- The thread renders its own kind: a person message ("See you Saturday?") is asserted present.
- The filter's outcome is asserted explicitly for the Opal message: body text absent, `.c1-bubble-opal` null, `.c1-message-actions` null, `read-aloud-play` and `read-aloud-stop` both null, plus the unchanged `expectNoListenRail()` sweep.
- The file header's pin 3 now records the re-pin and why.

**Read-aloud coverage (task clause b):** the read-aloud-outside-the-bubble intent is already asserted where Opal messages legitimately live — the CenterChat leg "read aloud is re-homed OUTSIDE the bubble and speaks Opal's exact words end to end" checks `closest(".c1-bubble") === null`, `closest(".c1-message-actions") !== null`, the orb mark, exact-words TTS call, and play/stop end to end. **No duplicate assertions were added.** No assertion was weakened in substance: the ThreadShell leg's old "no rail" checks all remain, and its positive expectation was replaced by strictly stronger separation assertions.

**Result:** `r19ListenRail.test.tsx` — 7/7 green.

---

## Item 2 — Glass budget: from raw count to sanctioned sites

**Before:** `unifyDrift.test.ts` — "performance budget: glass backdrop lives on the C2 dock only in its sheet" FAILED: `expected [backdrop-filter: blur ×5] to have a length of 3`. W13's share card (`blur(14px)` ×2) and the pre-existing scrim had joined the dock in `c2shell.css`; the raw count could not tell a sanctioned site from a stray blur.

### CSS fixes (both sides)

- **Share card tokenized:** `.r19-share-card` (c2shell.css) now consumes the one material — `backdrop-filter: blur(var(--chrome-glass-blur)); -webkit-backdrop-filter: blur(var(--chrome-glass-blur))`. It never hardcoded a tint (its surface is the plan card's own), so only the blur needed tokenizing. No `blur(14px)` remains in c2shell.css.
- **Scrims tokenized as their own material:** new token `--scrim-blur: 8px` in `theme/c2Tokens.css` (defined once, beside the chrome-glass family, with the divergence reasoned in the comment: a scrim's job is dimming + depth separation behind a solid sheet, not a readable frosted field). Consumed by `.c2s-scrim` (c2shell.css) and `.c1-sheet-scrim` (c1.css) — the two sheet scrims now share one scrim material instead of two identical literals.
- The stale "backdrop-filter lives on THIS chrome layer only" comment on `.c2s-dock` now points at the registry.

### Test rewrite — the sanctioned glass registry

The raw-count test is replaced by a **registry** in `unifyDrift.test.ts` (`GLASS_REGISTRY`): every backdrop-blur site in **every `.css` file under `src/`** (the test walks the tree recursively, so a brand-new sheet is covered too) is enumerated with sheet, exact normalized selector, exact declaration text, declaration count, and a one-line reason. The test fails:

- on any found site **not in the registry** (by sheet + selector name),
- on any registered site that is **missing**, or whose declaration text/count **drifted**,
- and pins the C2 sheet's glass to exactly its three sanctioned sites.

Strength verification (mutation): a stray `.stray-glass { backdrop-filter: blur(6px); }` appended to `src/brand/orb/orb.css` made the registry test fail on the unlisted site; the mutation was reverted and the suite re-verified green.

### The sanctioned glass registry (22 sites)

Materials: **CHROME** = `blur(var(--chrome-glass-blur))` (the one frosted material; c1 consumes it via its `--opal-glass-blur` alias). **SCRIM** = `blur(var(--scrim-blur))`. **LEGACY** = literal recorded in the pre-token legacy monolith `styles.css` (sheet not rewritten in this wave; drift fails the test; unify-layer supersessions noted).

| # | Sheet | Selector | Declaration (×count) | Reason |
|---|---|---|---|---|
| 1 | src/c2/shell/c2shell.css | `.c2s-dock` | `blur(var(--chrome-glass-blur)) saturate(1.35)` ×2 | C2 navigation pad — the chrome-glass presentation of the dock. |
| 2 | src/c2/shell/c2shell.css | `.c2s-scrim` | `blur(var(--scrim-blur))` ×1 | C2 sheet scrim — full-screen dim layer behind sheets (scrim material, not chrome). |
| 3 | src/c2/shell/c2shell.css | `.r19-share-card` | `blur(var(--chrome-glass-blur))` ×2 | W13 share card — the object that leaves the app; founder rider: frosted glass over the state field, one material. |
| 4 | src/opalUi/c1/c1.css | `[data-design="r18"] .c1-glass` | `blur(var(--opal-glass-blur)) saturate(1.35)` ×2 | C1 conversation chrome (overflow, navigator rail, nav buttons) via the `--opal-glass-blur` alias of the chrome token. |
| 5 | src/opalUi/c1/c1.css | `[data-design="r18"] .c1-sheet-scrim` | `blur(var(--scrim-blur))` ×1 | C1 sheet scrim — same dim-layer job as `.c2s-scrim`, same scrim token. |
| 6 | src/theme/unifyChats.css | `.tabbar-option-b .dock-bar, html.opal-native-host .tabbar-option-b .dock-bar` | `blur(var(--chrome-glass-blur)) saturate(1.35)` ×2 | Legacy navigation pad at the unify layer — same chrome-glass token (tint stays the legacy dark field fill by design). |
| 7 | src/styles.css | `.glass` | `blur(18px) saturate(1.2)` ×2 | Legacy generic glass utility (pre-token); its 18px literal equals the chrome-glass blur value. |
| 8 | src/styles.css | `.opal-moment.journey` | `blur(8px)` ×1 | Legacy journey banner over imagery. |
| 9 | src/styles.css | `.moment-people-sheet` | `blur(8px)` ×1 | Legacy people-picker sheet — full-screen dim layer (scrim role). |
| 10 | src/styles.css | `.tabbar-option-b .dock-bar` | `blur(9px)` ×2 | Legacy dock base rule — superseded by the unify-layer token rule (#6, later sheet wins). |
| 11 | src/styles.css | `.comm-mode-btn` | `blur(9px)` ×2 | Legacy communications mode chips. |
| 12 | src/styles.css | `.calls-filter-btn` | `blur(9px)` ×2 | Legacy calls filter chips. |
| 13 | src/styles.css | `.graphs-lens-chip` | `blur(9px)` ×2 | Legacy graphs lens chips. |
| 14 | src/styles.css | `html.opal-native-host .tabbar-option-b .dock-bar` | `blur(9px)` ×2 | Legacy native-host dock variant — superseded by the same unify-layer token rule. |
| 15 | src/styles.css | `html.opal-native-host .comm-sticky-chrome, html.opal-native-host .graphs-sticky-chrome` | `blur(9px)` ×2 | Legacy native-host sticky chrome bars (communications + graphs). |
| 16 | src/styles.css | `html.opal-native-host .gsh-header-hit` | `blur(8px)` ×2 | Legacy native-host home header hit layer. |
| 17 | src/styles.css | `html.opal-native-host .gsh-stories` | `blur(8px)` ×2 | Legacy native-host stories rail chrome. |
| 18 | src/styles.css | `html.opal-native-host .gsh-chrome-plane` | `blur(10px)` ×2 | Legacy native-host home chrome plane. |
| 19 | src/styles.css | `html.opal-native-host .search-chrome-plane` | `blur(8px)` ×2 | Legacy native-host search chrome plane. |
| 20 | src/styles.css | `html.opal-native-host .ogsn-graph-detail-head` | `blur(8px)` ×2 | Legacy native-host graph detail header. |
| 21 | src/styles.css | `.live-call-assist` | `blur(14px)` ×2 | Legacy in-call assist pane — frosted pane over the call field (the sheet's own comment states the glass intent). |
| 22 | src/styles.css | `.contact-profile-backdrop` | `blur(10px)` ×2 | Legacy contact-profile overlay backdrop (dim layer). |

Sweep notes: all 17 `.css` files under `src/` were scanned; the other 13 contain no backdrop-blur at all. No `backdrop-filter` exists in any `.ts`/`.tsx` (no inline-style glass). `styles.css` also carries one `filter: blur(8px)` (an **element** filter at the old `.moment` artwork, not a backdrop) — out of the glass registry's scope by definition, recorded here for completeness. `technicolorProduction.css` carries only `backdrop-filter: none` (a removal, not a glass site).

**Result:** `unifyDrift.test.ts` — 27/27 green (was 26 tests with 1 failure; the registry block adds the net-new pins).

---

## Item 3 — familyOfStatus governed statuses

### Evidence (the statuses DO reach the function, unmapped)

- Backend vocabulary: `SharedPlan` (`apps/opal_core/lib/opal_core/social_flow/shared_plan.ex`) — `@statuses ~w(tentative agreed changed cancelled completed expired)`.
- Reachability: `familyOfStatus(plan.status)` is fed by the plans contract (`cardFromPlan`, `planProjectionFromContract`, `graphListFromPlans`, Home ranking in `shellData.ts`). The list behind that contract, `SocialFlow.list_plans_for_user/2`, excludes **only** `cancelled`/`expired` by default (`where: p.status not in ^["cancelled", "expired"]`, or no status filter with `status: :all`) — so `tentative`, `agreed`, and `changed` rows reach the web adapter with their governed status strings intact. Real payloads confirm it: web fixtures/tests across the shell suites carry `status: "tentative"` and `status: "agreed"` plan contracts.
- The defect was live: `FAMILY_BY_STATUS` had **no** `tentative`/`agreed`/`changed` rows, so all three fell through to `"forming"`. An **agreed** plan — the backend's own "ready" — rendered with the forming family (forming violet instead of ready gold, label "Forming") on every card surface the adapter feeds.

### Ruling (from the backend's own code)

The backend has ONE indicator derivation, `OpalCore.SocialFlow.NextPlan.indicator_state/3`, whose documented legs are:

- live window open → `"happening"` (a **time** fact),
- viewer's own participant response pending → `"action"` (a **viewer** fact),
- `plan.status == "agreed"` → `"ready"`,
- everything else active → `"forming"` — its moduledoc states it verbatim: *"forming — everything else active (tentative / changed)"*.

`familyOfStatus` receives only the status string, so it owns exactly the status legs:

- **`agreed` → `ready`** (NextPlan's explicit leg; the brief's canon agrees).
- **`tentative` → `forming`**, now explicit instead of a fall-through accident.
- **`changed` → `forming`** — decided from the code, not preference: (1) NextPlan's fall-through leg names `changed` explicitly as forming; (2) `changed` means a material change was applied to an agreed/tentative plan (`PlanTransition`: `:change` from tentative/agreed → changed; `JourneyAuthority` stamps it on material journey changes) and participants may need to **reconfirm** — but that reconfirm need is *per-participant response state* (`JourneyAuthority.reconfirm_allowed?/2` reads `PlanParticipant.response_state`), which is exactly NextPlan's viewer-scoped action leg. A status-only function mapping `changed → action` would paint action on viewers who already reconfirmed; mapping it to `ready` would claim an agreement the change just unsettled. Forming — "terms changed, settling again" — is the only status-only truth, and it is the backend's own answer.
- Also added per the brief's canon vocabulary: `"needs-action"` / `needs_action` → `action` aliases (the pre-existing `action`/`pending` rows already carried that family).
- `cancelled` deliberately left unmapped: the default list excludes it, it is terminal-but-not-past (mapping it to `past` would falsify the Past view), and it was outside the W13 finding. It still falls through to forming **if** a `status: :all` payload ever feeds the adapter — flagged here as an observed residual, not silently "fixed" with a wrong family.

### Fix + pins

- `shellData.ts` `FAMILY_BY_STATUS` gained the rows above, with the evidence and the `changed` reasoning recorded in the comment at the map.
- New pin suite `src/c2/shell/familyOfStatus.test.ts` (8 tests): governed rows (`agreed→ready`, `tentative→forming`, `changed→forming`, `completed/expired→past`), case-insensitivity, card-level labels (agreed card = family `ready` + label "Ready"; tentative/changed = `forming`/"Forming"), the full pre-existing vocabulary as regression pins, and the unknown/null/undefined fall-through.
- **No backend change** was needed or made.

**Result:** `familyOfStatus.test.ts` 8/8 green; all adapter consumers re-run green (huntFixShellData, dropItWiring, r19Graphs, homeSocial, mistakePatternEnforcement — 71/71 across the targeted batch).

---

## Floors — verbatim

Full web suite, after all three fixes (command: `npx vitest run` in `apps/opal_web`):

```
 Test Files  16 failed | 187 passed (203)
      Tests  23 failed | 1990 passed (2013)
   Duration  642.41s
```

That is **exactly** the pre-fix baseline of **23 failed / 16 files** (pre-fix this branch measured 25 failed / 18 files, the two extras being Item 1 and Item 2 above). The summary above is from the confirmatory full run, read from its own output file in the same command that ran it (an earlier run delivered the identical failure floor — 23 failed / 16 files — with a one-test difference in the passed total, 1989/2012 vs 1990/2013, i.e. a baseline suite's generated test count varies by one between runs; the failure floor is exact in both). In the confirmatory run the three touched suites show green by name: `src/c2/shell/familyOfStatus.test.ts (8 tests)`, `src/opalUi/c1/r19ListenRail.test.tsx (7 tests)`, `src/theme/unifyDrift.test.ts (27 tests)`. The 16 failing files are the untouched baseline set — `activation`, `availability`, `designTokens`, `firstRun`, `grammar`, `graphCalendaring`, `graphDetail`, `graphScroll`, `graphSpine`, `liveJourneyProof`, `pasteW4DeviceFixes`, `technicolorProduction`, `authorityRejectedStates`, `waveBChatsExact`, `waveBGraphsExact`, `waveBHomeExact` — none of the three fixed suites is among them, and no new failure appeared.

Typecheck (command: `npx tsc -p tsconfig.json --noEmit` in `apps/opal_web`) — **counting note, stated plainly:** the brief's floor says "EXACTLY 9"; this environment's `tsc` (lockfile toolchain) reports **11 `error TS` lines**, and the identical command run against a pristine `git archive` extraction of the base tip `486f20e1` produces **byte-identical output** (`diff` clean) — so the delta attributable to this wave is **zero new, zero removed** type errors, and the 9-vs-11 gap is a counting difference between harnesses (the 11 lines include duplicate-identifier pairs at two locations each in `productClient.ts`/`C1Surfaces.tsx`), not a regression or a fix. The 11 lines verbatim:

```
src/OpalApp.tsx(3923,47): error TS2345: Argument of type '"opal"' is not assignable to parameter of type 'SetStateAction<Tab>'.
src/OpalApp.tsx(9899,22): error TS2345: Argument of type '"opal"' is not assignable to parameter of type 'SetStateAction<Tab>'.
src/OpalApp.tsx(9937,47): error TS2345: Argument of type '"opal"' is not assignable to parameter of type 'SetStateAction<Tab>'.
src/api/productClient.ts(5133,3): error TS2300: Duplicate identifier 'plan_type'.
src/api/productClient.ts(5134,3): error TS2300: Duplicate identifier 'online'.
src/api/productClient.ts(5160,3): error TS2300: Duplicate identifier 'plan_type'.
src/api/productClient.ts(5160,3): error TS2717: Subsequent property declarations must have the same type.  Property 'plan_type' must be of type 'string | undefined', but here has type 'string | null | undefined'.
src/api/productClient.ts(5162,3): error TS2300: Duplicate identifier 'online'.
src/opalUi/YouSettingsDestination.tsx(1352,49): error TS2339: Property 'handle' does not exist on type 'RelationshipContact'.
src/opalUi/c1/C1Surfaces.tsx(14,26): error TS2300: Duplicate identifier 'planStateFamily'.
src/opalUi/c1/C1Surfaces.tsx(19,10): error TS2300: Duplicate identifier 'planStateFamily'.
```

None of the 11 is in a file this wave touched.

## Scope discipline

- No backend files changed; no other worktrees touched; nothing pushed.
- `node_modules` was installed in this worktree only (`npm ci`, gitignored — `git status` clean apart from the three commits).
