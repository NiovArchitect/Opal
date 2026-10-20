# Repair #19 — Wave W15: Override, Don't Patch (item 19) — The Deletion Sweep

- **Branch / worktree:** `muse/r19-override` in `wt-r19-override`, base `7fa7dc98` (merged `muse/repair-19` tip). One commit: `8a99772d`. Not pushed. (`git rm` pre-staged the stage-2 deletions, so stages 1+2 landed in the single commit `8a99772d`; the commit message records both stages.)
- **Headline outcome:** the `?shell=r17` side door is **retired and the R17 shell is unmounted from the served build**; two zero-reference corpses are **deleted**. Everything else on the sweep list was proven **load-bearing for the passing test suite** by import traces plus a live deletion trial (below), and is kept with that proof of life recorded — per the wave law, those are findings, not failures. No suite moved: web failing set is **exactly baseline 23 tests / 16 files, name-for-name**, typecheck **zero-delta vs pristine base (byte-identical output; see §5 for the corrected count statement)**, pattern posture **118 → 118 (no rise)**.

---

## 1. THE ?shell=r17 QUESTION (W13 seam S-1) — RETIRED, IN FULL

Coordinator recommendation executed. The code supported it cleanly at the mount/flag layer:

**Deleted:**
- `src/theme/c2Shell.ts`: both `?shell=r17` branches (the STEP-0 override that won over the served build flag AND cleared the device-local C2 marker, plus the duplicate branch in the query check). A `?shell=r17` query is now **inert**: it selects no shell and no longer clears `opal.c2.shell.v1`. Header rewritten: the flag now gates only the C2 pre-paint mode/icon setup in `main.tsx`; the R17 fallback is stated to live at branch level (`muse/repair-17`, untouched, plus its preview worktree).
- `src/App.tsx`: the `OpalApp` import, the `isC2ShellEnabled()` conditional, and the `return <OpalApp />` legacy mount path are gone. `App()` returns `<C2Shell />` unconditionally after the unchanged dev review routes (`?review=availability/c2/c2shell/c1` — W13 §5 item 6, founder's-call dev tooling, not in this wave's deletion list). This also closes W13 seam **S-2** for this build: a non-flagged serve can no longer render the R17 shell wholesale, because there is no mount left to render it.

**Absence proof (source scans, post-change):**
- `grep -rn 'shell=r17|"r17"' src/App.tsx src/main.tsx src/theme/c2Shell.ts` → no code branch remains (the string survives only in explanatory retirement comments in `c2Shell.ts` / `App.tsx` and one stale test-describe name, see below).
- `grep -n OpalApp src/App.tsx src/main.tsx` → zero. The served entry (`main.tsx` → `App`) has no path to `OpalApp`.
- `public/c2-boot.js` never had an r17 path (it only ever stamps the C2 path); nothing to remove there.

**Boundary stopped at (per the wave's own stop rule):** `src/OpalApp.tsx` itself, `src/styles.css`, and the legacy-only components it mounts were **not** deleted — see §2 for the trial that proved them load-bearing for the suite. They are now **unreachable in the served build** (no importer in the entry path; sole remaining importer references are tests), which is the retirement the flag question asked for; file-level deletion is blocked by the test-suite proof of life, recorded as a finding for the coordinator/founder (the blocker is the legacy source-guard test corpus, not any live product path).

One stale comment corrected with the retirement: `r19ListenBreadth.test.tsx` described its legacy-component renders as "still reachable via ?shell=r17" — updated to state the components are rendered directly and the shell/override are retired. (Test comment only; no assertion changed.)

## 2. W13 DEAD-PATH LIST (§5 of legacy-report) — KEPT, WITH PROOF OF LIFE (deletion trial)

W13's mechanical claim still holds: every legacy surface's sole non-test production importer is `OpalApp.tsx` (re-verified this wave by import trace over all 454 src files — table in working notes; e.g. StoryViewer, StoryCreateFlow, LivesGoLivePanel, GraphLivePanel, GraphSocialHome, GraphDetailSheet, ContactProfileSheet, ForwardSharePicker, GraphProfilePage, YouSettingsDestination, SearchDestination, ActivityDestination, GroupInfoDestination, Memory*Sheet, Story*, Journey*, GraphCreateFlow, PlanComposer, ActiveCallOverlay, IncomingCallFallback, NewCallDestination, CallContinuityDestination, onboarding FirstRun* / PermissionBootstrapPage, `brand/OpalLogo.tsx`, `settingsWireClass.ts`).

**But file deletion was tried and failed the floor — that is the finding:**

Deletion trial (this wave, restored immediately after): `OpalApp.tsx` moved out of the tree, then
`npx vitest run src/opalUi/seedKillGuard.test.ts src/activation.test.ts src/opalUi/grammar.test.ts` — **all three test files failed**, with the production-source reads throwing on the missing file:

```
FAIL src/opalUi/grammar.test.ts > OpalApp uses resolvePrimaryOpalSurface - one surface + OpalInsightField
Error: ENOENT: no such file or directory, open '.../src/OpalApp.tsx'
 ❯ src/opalUi/grammar.test.ts:279:17  const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
Test Files  3 failed (3)      Tests  7 failed | 20 passed (27)   [trial, OpalApp absent]
```

(`seedKillGuard.test.ts` reads `../OpalApp.tsx` at module scope — line 36, `const app = readSrc("../OpalApp.tsx")` — so its whole file errors on collection when the file is absent; the grammar/activation failures above are the same read pattern.) Across the tree, **~60 passing test files read `OpalApp.tsx` source directly** (`readFileSync(resolve(..., "OpalApp.tsx"))` — activation, sendIdempotency, availability, brandMark, s0Shell, figmaAlignment, firstRun, holyShitFirstRun, preMemberShell, promisePresentation710, s1Adversarial, authorityRejectedStates, callAssist, callEntry, callsContinuity, chatsHome, dockUnreadDisplay, emptyStateQuality, founderCommunicationSeed, founderFixture, grammar, graphCreateFlow, graphCreateRepair16, graphDetail, graphParticipation, graphSocialHome, graphSpine, journeyAuthority, livesGoLive, mistakePatternEnforcement, opalCenterLifeGraph, opalChatSessions, p21CallsNewCall, p22SearchRouting, pass1hPreferReal, pasteW4DeviceFixes, pasteWProtectList, physicalCloseout, repair17UiIntegrity, repair18Layering, seedKillGuard, settingsWireClass, slice1TwoUserChat, socialAuthority, socialReality, soloOpal1075, storyPostRepair15, w4LayoutContract, waveB*Exact, …). Several are R19's own guards (seedKillGuard = the machine-speak/scripted-responder guard; mistakePatternEnforcement = the pattern gate's test half). Deleting `OpalApp.tsx` — and with it the legacy components those same tests import/render (ChatsHome in `dir1PlanAwareness` + `r19ChatsThread`, YouSettingsDestination in 7 section tests, TrustContractCard in holyShitFirstRun + pasteWProtectList, etc.) — cannot land green without also deleting/rewriting that guard corpus, which the wave floors forbid (failing set must stay exactly baseline) and which would destroy R19's own permanent guards. **Disposition: KEPT as files, DEAD as a served path.** Their absence from the product is now proven by §1's entry-path scan; their presence on disk is proven load-bearing for the suite by the trial above. Recommended follow-up (founder/coordinator call, not this wave): a dedicated legacy-test-corpus retirement wave that rewrites the source-guard tests onto the C2 surfaces first, after which the files can be deleted outright.

Specific sub-dispositions within this class:
- **`ChatsHome.tsx` — kept, partially load-bearing beyond tests:** its `ChatsHomeRow` type is imported by `chatsHydration.ts`, `founderChatsPlanPills.ts`, `graphSurfaceInterop.ts`; the component itself is rendered by the R19 DIR-1/W5 tests (`dir1PlanAwareness`, `r19ChatsThread`) as the legacy call-log/chats renderer under test. The C2 call log does **not** import it (C1ShellHosts adapts `callHistoryLine` from `callView.ts` directly — `callView` is live-imported by `C1ShellHosts.tsx`, kept).
- **`settingsWireClass.ts` — kept:** production-dead (only a comment mention in `shellData.ts`), but its dedicated test also asserts against `YouSettingsDestination` + `OpalApp` sources and passes; W13 dispositioned it "HONESTLY RETIRED" as a classification, superseded by `SettingsSectionProjection` — the file is test-bound, same corpus finding.
- **`main.tsx` CSS stack (W13 seam S-4) — kept:** `main.tsx` live-imports `styles.css`, `technicolorProduction.css`, `spectralTokens.css` today; passing tests read all three (incl. `repair18Layering`, `unifyDrift`, waveB*). Pruning the stack is part of the same corpus-blocked follow-up, not a safe standalone deletion.
- **Pre-orb public assets (W13 row 34) — kept:** passing tests assert their existence/content (`brandMark.test.ts` reads `public/brand/opal-logo.png`; `splashCanonLockup.test.ts` asserts `BRAND_ASSETS.opalLogo === "/brand/opal-logo.png"` and compares the file to the `shots/` canon). `brand/brand.ts` constants still reference them. Deleting them creates new failures; same finding.
- **Dev review routes (§5 item 6) — kept:** founder's-call evidence tooling per W13; not in this wave's execute list.

## 3. SUPERSEDED-BY-R19 CORPSES (item 3)

| Corpse | Disposition | Evidence |
|---|---|---|
| `ListenButton` (pre-W6 name) | **Already gone — absence proven** | No file `ListenButton.*` exists; `grep ListenButton src` → only `r19ListenRail.test.tsx:283` asserting a source does **not** contain it. Replacement `opalUi/c1/ReadAloudButton.tsx` is live: imported by `C1Surfaces.tsx` (rendered in CenterChat) and `PlanCard.tsx`. Old Listen rail code: no separate rail file remains; the rail is the ReadAloud status-cache module inside `ReadAloudButton.tsx`. Nothing to delete. |
| `MomentAudienceSelector.tsx` (legacy §1D row 25 sheet cluster) | **DELETED** (`8a99772d`) | Zero-reference scan over all 454 src files: no importer, no test reference, not even a string mention outside its own file. The logic module `momentAudience.ts` is separate and kept (tested by `momentAudience.test.ts`). Post-deletion: typecheck zero-delta vs pristine base (see §5), full suite exactly baseline. |
| `OpalPromiseScreen.tsx` (legacy onboarding re-export shim) | **DELETED** (`8a99772d`) | Compatibility re-export of `FirstRunPromisePage` with **zero importers** anywhere (scan: no `from ".../OpalPromiseScreen"` in src). Its target `FirstRunPromisePage.tsx` is kept (imported by `OpalApp.tsx` and asserted by figma/promise tests — corpus finding, §2). |
| W5's superseded RevealListLine flat form | **Already gone — superseded in place** | Current `RevealCard.tsx:181 RevealListLine` IS the W5 mini-card form (`reveal-row-card`, own head/title/substance/actions lines), live-imported by `C1Surfaces.tsx` and pinned by `r19ChatsThread.test.tsx` ("mini-card, not a flattened line"). No flat variant file or second implementation exists (grep: one definition). |
| Old PlanAwareness row squeeze | **Already gone — superseded in place** | `PlanAwareness.tsx` row variant is the W5-06 mini-card (head/title/meta lines, in-code comment records the squeeze it replaced); strip/call variants keep the compact form **by design** (documented in the same comment + `dir1PlanAwareness` tests). Live in `C1Surfaces` + legacy-test renders. No dead variant remains. |
| Director-era / machine-speak seed writers | **Already gone — gate kept, as ordered** | `grep 'Regression A\|macreplay\|R18REG' apps/opal_core/lib apps/opal_web/src` (non-test) → only explanatory comments in `founder_communication_seed.ex` / `human_seed_world.ex` describing what W1 replaced. The seed writers that run are the human ones: `FounderCommunicationSeed` (live via `founder_seed_controller.ex`, opt-in gated) now writes human display strings, and `HumanSeedWorld` is called by `FounderGraphCommitmentSeed`. The permanent machine-speak **gate stays**: `human_seed_world_test.exs` (`@machine_speak` assertion over every display string) + web `seedKillGuard.test.ts`. Nothing deleted; backend untouched, so the backend suite floor was not triggered. |
| Pre-Orbits flat conversation list | **Already gone — superseded in place** | `C1Surfaces.tsx` Center log is `CenterSessionList` built on `buildOrbitLog` (W14 Orbits); `PeopleChatsList` is the current C1 list hosting the DIR-1 row + RevealListLine. No second/flat list implementation file exists (import trace: the only conversation-list components are these). |
| Combined soul-memory page renderer | **Already gone — alias kept, as ordered** | `shellData.ts` `case "soul": case "soul-memory":` — the legacy key is an alias landing in the Soul room only; Memory is the separate room below it; `C2You.tsx` renders the W8 Soul form ("the combined page are gone" in-code). No combined renderer file exists. `smSoulMemory.test.tsx` pins the alias behavior and passes. |
| C1-era / themed-legacy call-log renderer (F5) | **Kept — proof of life via R19 tests** | The C2 call log lives in `C1ShellHosts` + `C1Surfaces PeopleCallsList` + `CallLog.css` (pattern from `PlanAwareness PATTERN_BY_STATE`). The legacy renderer (`ChatsHome` calls path) is rendered by R19's own `dir1PlanAwareness` call-log tests and `r19CallLog` drift audits read the shared CSS/pattern sources. Same corpus finding as §2 — unreachable in the served build, test-bound on disk. |

## 4. STALE PATTERN SITES (item 4)

Pattern posture tooling: `scripts/pattern_posture.mjs`, run before and after all deletions.

```
BEFORE (base 7fa7dc98)                      AFTER (8a99772d)
MP-1  0                                     MP-1  0
MP-2  81                                    MP-2  81
MP-3  0                                     MP-3  0
MP-4  0                                     MP-4  0
MP-6  26                                    MP-6  26
MP-11 11                                    MP-11 11
TOTAL 118                                   TOTAL 118
```

Count **did not rise** (the floor). No drop either, and that is explained, not hidden: the two deleted files carried **zero** pattern sites (no `seed-*` literals, no seed-data imports, no canon indicator hexes — verified in their content before deletion), and every MP-2 site on the tool's list sits inside the §2 corpus-blocked files (`OpalApp.tsx`, `GraphDetailSheet.tsx`, `JourneyAddPeople.tsx`, `SearchDestination.tsx`, `TripCanvasView.tsx`, `graphsHydration.ts`, `homeHydration.ts`, `socialAuthority.ts` — all sole-importer-OpalApp files whose deletion the trial proved suite-breaking). The MP-2/MP-11 drops are therefore locked behind the same follow-up as §2: retire/rewrite the legacy source-guard corpus, then the pattern count falls with the files. MP-6 (26, backend) untouched — no backend code in this wave.

## 5. SUITE RESULTS (verbatim, final tree at `8a99772d`)

- **Full web suite** (final tree at `8a99772d`; failing **set** and totals verified from the JSON reporter's output file, parsed directly):
  ```
  Test Files  16 failed | 190 passed (206)
       Tests  23 failed | 1656 passed (1679)
  ```
  The 16 failing files / 23 failing tests are exactly the baseline set: activation (3), availability (1), designTokens (1), firstRun (1), authorityRejectedStates (1), grammar (1), graphCalendaring (2), graphDetail (1), graphScroll (2), graphSpine (1), liveJourneyProof (1), pasteW4DeviceFixes (2), waveBChatsExact (3), waveBGraphsExact (1), waveBHomeExact (1), technicolorProduction (1). Zero new failures, zero baseline failures fixed or hidden, and totals identical to baseline in every dimension (206 test files on disk in both base and final trees — file lists diffed identical; this wave deleted no test file). Note for the record: two interim console deliveries during this wave reported 204-file / 1653-test totals; the JSON artifact those runs wrote (206 suites: 190 passed / 16 failed) and the independent first full run both contradict them — the artifact numbers above are the verified ones.
- **Typecheck (corrected count statement):** `npx tsc -p tsconfig.json --noEmit` emits **11 error lines** on the final tree — and **exactly the same 11 lines, byte-identical output**, on a pristine archive of base `7fa7dc98` (pristine-archive comparison, run this wave: `diff` of base vs final tsc output = no differences). **Zero delta is the verified claim.** Line inventory: OpalApp ×3 (TS2345), productClient ×5 (duplicate `plan_type`/`online` identifiers), YouSettingsDestination ×1, and C1Surfaces ×2 — the `planStateFamily` duplicate import (lines 14 + 19, one distinct issue emitted twice) that entered with the merged waves before this tip. These 11 emitted lines are the tip's baseline that the program's convention counts as **9 distinct errors**; an earlier draft of this report (and the stage-1 commit message context) phrased this as "grep -c = 9", which is **not** what grep returns at this tip — grep returns 11 at both base and final. No error in any file this wave touched.
- **Backend suite:** not run — no backend code touched (`git show --stat 8a99772d`: 5 files, all `apps/opal_web`).
- **API 101/101:** not re-run — no API route, controller, or backend served path changed; the only served-path change is the web shell entry (`App.tsx`/`c2Shell.ts`), proven by the web suite + typecheck above. Flagging plainly rather than claiming a run that didn't happen.
- **Deletion trial (restored, not committed):** OpalApp-absent run quoted in §2 — the proof-of-life evidence for the kept class.

## 6. WHAT REMAINS AND WHY (one line each)

- `OpalApp.tsx` + legacy-only components + `styles.css`/technicolor/spectral stack + pre-orb public assets: **unreachable in the served build as of this wave** (no entry-path importer), kept on disk solely because ~60 passing source-guard test files — including R19's own seedKillGuard and mistakePatternEnforcement guards — read/import them; file deletion requires the corpus-retirement follow-up named in §2.
- `muse/repair-17`: untouched, as ordered — it is now the **only** place the R17 shell can be rendered from, which is exactly the branch-level fallback the retirement assumed.
- Machine-speak gate, HumanSeedWorld, ReadAloudButton, Orbits log, Soul/Memory separate rooms + `soul-memory` alias: all live, all kept, absences of their predecessors proven in §3.

FOUNDER_ACCEPTED remains the founder's phone walk; nothing above claims it.
