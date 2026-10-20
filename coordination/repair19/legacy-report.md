# Repair #19 — Wave W13: Legacy Surface Inventory + Recreation

- **Branch / worktree:** `muse/r19-legacy` in `wt-r19-legacy`, base `f2981dbf` (`muse/repair-19`). One commit: `d61238b9`. Not pushed.
- **Method:** component/route census of `apps/opal_web/src` (437 files) + import/reference scans (every legacy surface's importers were traced) + route analysis of `App.tsx` / `main.tsx` / `theme/c2Shell.ts` + the R18 surface map (`coordination/repair18/surface-map.md`) as the should-exist reference.
- **Reachability definition:** the integrated build is the served `shell=c2` build: `App.tsx` renders `C2Shell`. The R17 shell (`OpalApp.tsx`, ~12.5k lines) renders only when the flag is absent or via the `?shell=r17` QA override (see Seams). Every surface imported **only** by `OpalApp.tsx` is therefore **not user-reachable in the integrated build**; the census verified this mechanically — for each legacy surface below, its sole non-test importer is `OpalApp.tsx`.

---

## 1. FULL INVENTORY

### A. Shells and entry

| # | Surface / asset | Where it lives | Reachable in integrated build? | Disposition |
|---|---|---|---|---|
| 1 | R17 legacy shell (whole app: dock, home, chats, graphs, you, thread) | `src/OpalApp.tsx` + `src/styles.css` + `theme/technicolorProduction.*` | Only via `?shell=r17` QA override or a non-flagged build | MERGED into the C2 shell (`c2/shell/C2Shell.tsx`, R18 + R19 waves). Reroute note: the served build already routes to C2; the override is a seam (S-1 below), not a user route |
| 2 | C1 surfaces (CenterChat, CenterSessionList, PeopleChatsList, ThreadShell, PlanCard, RevealCard, PlanAwareness) | `src/opalUi/c1/` | Yes — hosted inside C2 via `c2/shell/C1ShellHosts.tsx` | RECREATED by R18 C1 wave (these ARE the new design, `[data-design="r18"]`). Not legacy face |
| 3 | C2 foundation gallery / C1 review / C2 shell review | `c2/C2FoundationGallery.tsx`, `opalUi/c1/C1Review.tsx`, `c2/shell/C2ShellReview.tsx` | No — `?review=` dev routes only in `App.tsx` | HONESTLY RETIRED as product surfaces (dev evidence only; never a member path). W15: keep or delete as dev tooling, founder's call |
| 4 | Availability review | `availability/AvailabilityReview.tsx` | No — `?review=availability` dev route | HONESTLY RETIRED (same as #3) |

### B. Primary surfaces (sibling-owned — inventoried, not rebuilt)

| # | Surface | Where | Reachable? | Disposition |
|---|---|---|---|---|
| 5 | Calls list / call log (ChatsHome calls path, CallSurfaces, callView/callLifecycle) | `opalUi/ChatsHome.tsx`, `CallSurfaces.tsx`, `callView.ts`, `callLifecycle.ts` | Legacy copies: R17 only. Integrated Chats = C1 list | MERGED → W2 (R19 calls wave, `muse/r19-calls`) |
| 6 | In-call + video windows (ActiveCallOverlay, IncomingCallFallback, NewCallDestination, CallContinuityDestination, callAssist) | `opalUi/` | R17 only | RECREATED → W12 (in-call/video wave) |
| 7 | Chats list + thread (legacy face) | `opalUi/ChatsHome.tsx`, thread inside `OpalApp.tsx` | R17 only; integrated = C1 hosts | MERGED → R19 chats/thread wave (`muse/r19-chatsthread`) + R18 C1 |
| 8 | Primary C2 surfaces: Home, Center deck, Graphs, You, onboarding/splash | `c2/shell/*`, `onboarding/C2Splash*.tsx` | Yes (they are the integrated build) | RECREATED by R18 + R19 waves (home `muse/r19-home`, splash `muse/r19-splash`, graphs `muse/r19-graphs`, soul `muse/r19-soul`, halo `muse/r19-halo`, listen `muse/r19-listen`) |

### C. W13-owned recreations (built this wave)

| # | Surface | Legacy where | Integrated before W13 | Disposition |
|---|---|---|---|---|
| 9 | **EVENT SHARE CARDS** | `opalUi/ForwardSharePicker.tsx` (recipient picker, OpalApp only); `api/productClient.ts` invite-share helpers (account invites, not plan cards) | **Absent** — C2 Graph Detail had no share action at all; no plan share card existed in the new design | **RECREATED by W13** — `c2/shell/EventShareCard.tsx` + `SharePlanSheet`, adapter `shareCardFromDetail` in `shellData.ts`, Share action in `C2GraphDetail`. See §2 |
| 10 | **USER PROFILES** | `opalUi/ContactProfileSheet.tsx` (OpalApp only, via thread avatar) | **Absent** — the C1 thread identity was not tappable; no person profile existed in the new design | **RECREATED by W13** — `c2/shell/PersonProfile.tsx` (MERGED: the legacy sheet's function absorbed into the new profile), adapter `profileProjectionFor` in `C1ShellHosts.tsx`. See §2 |
| 11 | Graph (plan) profile page | `opalUi/GraphProfilePage.tsx` | R17 only; integrated equivalent is C2 Graph Detail | MERGED into C2 Graph Detail (`c2/shell/C2Graphs.tsx`, R18/R19 graphs wave) |

### D. Legacy-only surfaces in OpalApp (the long tail)

All R17-only (sole importer `OpalApp.tsx`, verified). None is user-reachable in the integrated build; each is listed for W15's deletion proof.

| # | Surface | Where | Disposition |
|---|---|---|---|
| 12 | Stories viewer | `opalUi/StoryViewer.tsx` | MERGED — story viewing lives in the C2 Home story rail + ShareComposer story path (R18 B2). The standalone legacy viewer is HONESTLY RETIRED on the integrated path (no C2 route opens it) |
| 13 | Story create flow | `opalUi/StoryCreateFlow.tsx` | MERGED into C2 ShareComposer (`c2/shell/C2Home.tsx`, story kind) |
| 14 | Live surfaces: go-live panel, in-graph live panel, lives feed cards | `opalUi/LivesGoLivePanel.tsx`, `GraphLivePanel.tsx`, `livesFeedCards.ts` | HONESTLY RETIRED on the integrated path — no C2 surface offers go-live today; classified HONESTLY ABSENT for the founder (named gap, not a fake). If Live returns, it is a new-design build, never this panel |
| 15 | Home (legacy social home) | `opalUi/GraphSocialHome.tsx`, `HomePlanContinuity.tsx`, `SocialMomentCard.tsx` | MERGED into C2 Home (R18 B2 + R19 home wave) |
| 16 | Graphs home / temporal timeline / trips section | `opalUi/GraphsHome.tsx`, `GraphsTemporalTimeline.tsx`, `GraphsTripsSection.tsx` | MERGED into C2 Graphs list + timeline (R18/R19 graphs wave) |
| 17 | Graph detail sheet (legacy) | `opalUi/GraphDetailSheet.tsx`, `GraphJourneyCard.tsx`, `GraphPeopleThread.tsx`, `GraphConvoyPanel.tsx`, `JourneySurface.tsx`, `JourneyAddPeople.tsx`, `JourneyManageSheet.tsx`, `TripCanvasView.tsx` | MERGED into C2 Graph Detail (incl. convoy + food/completion panels, R18) |
| 18 | Create-plan flow (legacy) | `opalUi/GraphCreateFlow.tsx`, `PlanComposer.tsx`, `GraphWhoPicker.tsx` | MERGED into C2 create flow (`C2Shell` createKind path, R18) |
| 19 | Center (legacy life graph + center chat page) | `opalUi/OpalCenterLifeGraph.tsx`, `OpalCenterChat.tsx` (page form) | MERGED into C2 Center deck + C1 CenterChat host |
| 20 | Search destination (legacy) | `opalUi/SearchDestination.tsx` | MERGED into C2 Search (`C2Shell.tsx` SearchDestination, R18 harmony) |
| 21 | Activity destination | `opalUi/ActivityDestination.tsx` | MERGED into C2 Home header Activity (R18) |
| 22 | Group info destination | `opalUi/GroupInfoDestination.tsx` | HONESTLY RETIRED on the integrated path — no C2 group-info route exists; group identity renders in-thread (sharedLine/peers). Named gap for integration if the founder wants group info as a room |
| 23 | Memory sheets | `opalUi/MemoryDetailSheet.tsx`, `MemoryCommentsSheet.tsx` | MERGED into You > What Opal remembers / Soul+Memory rooms (R18 SM wave) |
| 24 | Person memory view (legacy intelligence) | `opalUi/intelligence/PersonMemoryView.tsx` | MERGED into the same memory rooms; the per-person entry is now the W13 profile's "What Opal remembers" doorway |
| 25 | Sheets cluster: can't-make-it, discovery detail, save-to-collection, location permission, moment time/audience, availability sheet | `opalUi/CantMakeItSheet.tsx`, `DiscoveryDetailSheet.tsx`, `SaveToCollectionSheet.tsx`, `LocationPermissionSheet.tsx`, `MomentTimeSheet.tsx`, `MomentAudienceSelector.tsx`, `availability/AvailabilitySheet.tsx` | MERGED into C2 detail actions / Library / composer paths where the function exists in the new shell; any function with no C2 counterpart is HONESTLY ABSENT (no sheet renders). Per-sheet functional parity audit belongs to the owning surface waves |
| 26 | Check-in surfaces | `opalUi/CheckinAskCard.tsx`, `CheckinCircleRow.tsx`, `CheckinSummary.tsx` | RECREATED by R18 B3 — already hosted in the integrated Chats thread + circles (not legacy face) |
| 27 | Care surfaces | `care/CareRotationView.tsx`, `HouseholdPodView.tsx`, `c2/shell/CareDestination.tsx` | RECREATED by R18 B4/B5 (CareDestination is the integrated room) |
| 28 | Intelligence cards (mediation, reminder, weekly briefing) | `opalUi/intelligence/*.tsx` | MERGED into C1 CenterChat message rendering + Center deck reveals (R18) |
| 29 | Find people / contact suggest | `people/FindPeopleFlow.tsx`, `ContactSuggestPicker.tsx` | MERGED into C2 Search people mode + Chats people picker (C1 host) |
| 30 | Empty/error screens | Legacy inline empties across `OpalApp.tsx` | MERGED into the C2 `EmptyBlock` grammar (`c2/shell/bits.tsx`) — every integrated route's load-error state uses it (verified in `C2Shell` chats/center error blocks) |
| 31 | Onboarding remnants (pre-C2 first run) | `onboarding/FirstRunExperience.tsx`, `FirstRunSplashPage.tsx`, `FirstRunPromisePage.tsx`, `OpalPromiseScreen.tsx`, `PermissionBootstrapPage.tsx`, `TrustContractCard.tsx`, `UsernameSettingsHint.tsx`, `OpalPresenceOrb.tsx`, `draftOnboardingCopy.ts`, `holyShit*` | MERGED into `C2Onboarding` + `C2Splash1/2` (R18 + R19 splash wave). Legacy files render only inside the R17 shell |
| 32 | Pre-orb brand marks (component) | `brand/OpalLogo.tsx` (OpalMark/OpalWordmark/OpalLockup), `c2/LoopCharacter.tsx`, `onboarding/OpalPresenceOrb.tsx` | HONESTLY RETIRED as the face — superseded by `brand/orb/*` (OrbMark/OrbHero/OrbLockup). Still imported by legacy files and by `ForwardSharePicker`; **no integrated surface imports OpalLogo** (verified by reference scan of `c2/`) |
| 33 | Old pattern/backdrop assets | `theme/technicolorProduction.*`, `theme/spectralTokens.css`, `c2/C2PatternLines.tsx` (foundation), `public/brand/spectral/` | MERGED/RETIRED: technicolor+spectral load only via `main.tsx` layer stack under the R17 shell's classes; the integrated surfaces resolve the orb/c2 token stack. Pattern lines survive only as the C2 token-driven component |
| 34 | Public brand assets (pre-orb) | `public/brand/opal-mark.svg`, `opal-mark-light.svg`, `opal-mark-mono.svg`, `opal-mark-63-7-opposing-arcs-historical.png`, `opal-current-mark*.{png,jpg}`, `opal-lockup.svg`, `opal-logo.png`, `opal-character.png`, `opal-center-mark.png`, `favicon-opal-graph*.png`, `favicon-mark.png` | HONESTLY RETIRED — pre-orb marks; the orb set (`public/brand/orb/*`, `opal-orb-*`) is the current face. Files left in place for W15's asset deletion proof; `_quarantine/` and `_incoming/` folders already mark the founder's own sorting |

### E. Legacy SETTINGS assets (item-17 addition — census + dispositions)

The new Settings rooms are W8's build; W13's job is the legacy census + reachability. **Every row below is R17-only** (sole non-test importer `OpalApp.tsx` or the legacy destination itself) — no old-face settings surface is reachable in the integrated build today, and the seams to keep it that way are listed in §4.

| # | Legacy settings asset | Where | Disposition |
|---|---|---|---|
| S1 | You/Settings destination (3,343 lines — the entire pre-redesign settings: profile, account, notifications, privacy, connections, quiet, support forms) | `opalUi/YouSettingsDestination.tsx` | MERGED into the C2 Settings architecture (`C2You` + `buildSettingsSection`, R18 adopt2/settings wave) room-by-room; the remaining rich rooms are W8's build |
| S2 | Appearance/theme section (legacy toggles + theme form) | `YouSettingsDestination.tsx` (`AppearanceThemeSection` export) | MERGED into Settings > Appearance (C2 section `appearance`) |
| S3 | Celebrations section | same file (`CelebrationsSection`) | MERGED into Settings (C2 `celebrations` section exists in the R18 architecture) |
| S4 | Invite friends section (holds the legacy invite-share URL minting via `localProductInviteShareUrl`) | same file (`InviteFriendsSection`) | MERGED into Settings > Invite (C2 index). Note: this is the account-invite path — distinct from the W13 plan share card, which fabricates no URL |
| S5 | What Opal can do section | same file | MERGED into Settings > How Opal helps (C2) |
| S6 | What Opal remembers section (legacy memory list + forget forms) | same file | MERGED into Settings > What Opal remembers + Soul and memory (`what-opal-remembers`, `soul-memory`) — also the W13 profile's memory doorway target |
| S7 | Connected sources / privacy sections | same file (driven by `connectedSources.test.tsx`) | MERGED into Settings > Connections (DIR-2 server projection, R18) |
| S8 | Settings wire class (legacy row/action classification) | `opalUi/settingsWireClass.ts` | HONESTLY RETIRED — superseded by `SettingsSectionProjection` typed rows (toggle/value/nav/action/connection) in `c2/shell/projections.ts` |
| S9 | Username settings hint (onboarding-era settings chrome) | `onboarding/UsernameSettingsHint.tsx` | MERGED into Edit profile (C2 `edit-profile` section) |
| S10 | Profile gap ask (legacy profile-completion prompt) | `opalUi/ProfileGapAsk.tsx` | MERGED into Center session asks (C1 host path) |

---

## 2. WHAT W13 RECREATED (design notes)

### Event Share Card — `c2/shell/EventShareCard.tsx`, wired into `C2GraphDetail` (Share action)

- **Projection law:** `EventShareCardProjection` (projections.ts) is built by ONE adapter, `shareCardFromDetail(detail)` in `shellData.ts`, from the plan's real `GraphDetailProjection` (plan contract + history projection). Finished strings only; the card renders what it is given and derives nothing.
- **Truth:** title, finished when line, place (null → no row), attendance from the same counts the detail renders, people line from the real roster (`who`), naming at most three then "+ N more"; no roster → no people row, never a guessed guest list. **No share URL exists on the plan contract, so none is fabricated** — the sheet's one action, **Copy details**, places exactly the card's own lines (`textLines`) on the clipboard; the post-copy note says what happened, and the failure note is honest.
- **Apple-brain answers:** journey-first (one glance: state → title → when → where → who — the YOUR MOVE reading order the founder praised); restraint (one action in the sheet; nothing decorative — the FireLine is the state signal, the orb is the signature); typography as hierarchy (the c2 plan-card type scale, untouched).
- **Identity (23:52 rider):** this card LEAVES the app, so it carries Opal's physics, not a generic event-card layout: the **orb sits in orbit position at the card's head at felt size (44px, stone + rings)** as the sender's signature, the card surface is **frosted glass** (`backdrop-filter: blur(14px)`, token surface underneath), and the **FireLine runs as the orbit's edge** under the state pill. A screenshot of this card cannot be mistaken for a calendar app's.
- **Functional parity, experiential invention (23:53 key):** the legacy share function (ForwardSharePicker: pick people, send) is NOT inherited — its form was a settings-like picker. The plan-share function's honest core on today's contracts is *represent the plan faithfully outside this screen*; the experience is reinvented as a physical-feeling card + one copy action. Where invention would harm honesty (a minted link, a recipient send the contract can't bind to a plan), clarity/honesty won and no control renders.

### User Profile — `c2/shell/PersonProfile.tsx`, hosted by `ChatsHost`

- **Journey:** thread → tap the person's avatar in the thread header (`ThreadShell` gains optional `onOpenProfile`; the avatar becomes the profile doorway only when a host wires it) → one quiet sheet → back to the thread (Message = close to the thread that is open behind the sheet) or onward to memory controls.
- **Projection law:** `PersonProfileProjection` built by `profileProjectionFor` in `C1ShellHosts.tsx` from records the host already holds: conversation title/handle/peers, relationship rows matched by the peer's **real user id** → finished relationship label via the host's existing `relationshipTypeLabel`, and the thread's shared **next-plan fact** → "Next together" with a state pill in indicator language (`stateLabel` finished by the adapter). Absent facts are null and render nothing — no handle, no relationship, no next plan → no rows.
- **Memory controls entry (wallet design):** "What Opal remembers" routes via a new `ChatsHost.onOpenMemoryControls` prop wired in `C2Shell` to You > `what-opal-remembers` — the room where per-person memory is governed. No new memory store, no fake per-person toggles: the doorway lands on the real room.
- **Parity/invention:** functional parity with the legacy `ContactProfileSheet` (identity, relationship, shared plans, message, memories) with **zero inheritance of its experience** — no legacy classes (`contact-profile-*` unused), no phone-number block (the legacy sheet showed phone by provenance; the new profile omits it rather than guessing provenance on this path — stated plainly: if the founder wants phone on the profile, it needs the relationship-bounds read the legacy path used, a follow-up, not a fabrication). Call/video actions are NOT rendered: the C1 host wires no call path (calls are W2/W12's), and a button without a real action is a defect.

---

## 3. REROUTES MADE

| Reroute | Mechanism |
|---|---|
| Graph Detail → share | New Share action in `C2GraphDetail` header opens `SharePlanSheet` (the recreated card). Previously: no route existed in the integrated build |
| Thread identity → person profile | `ThreadShell.onOpenProfile` (avatar button) → `PersonProfileSheet` in `ChatsHost`. Previously: legacy `ContactProfileSheet` was the only profile and was R17-only |
| Person profile → memory controls | Profile action → `C2Shell` `goRoute("you")` + `setSettingKey("what-opal-remembers")` |
| Everything else in §1 | Already rerouted by the served-flag architecture: `App.tsx` renders `C2Shell` in the integrated build; legacy surfaces have no integrated route (mechanically verified: sole importer is `OpalApp.tsx`) |

**Components made unreachable by W13 changes:** none — W13 only ADDED routes. `ForwardSharePicker` and `ContactProfileSheet` were already unreachable in the integrated build before W13 (R17-only) and remain so; they are listed for W15 below, not newly orphaned by this wave.

---

## 4. REACHABILITY SEAMS (for integration / W8 / W15)

- **S-1 `?shell=r17` override:** `theme/c2Shell.ts` deliberately lets `?shell=r17` force the ENTIRE R17 shell (every legacy surface in §1, including legacy settings S1) in the served build. It was installed by R18 STEP 0 as a QA/walk override. It is a URL a user can be sent. **Decision needed at integration:** remove the override from the served build, or accept it as a known legacy doorway. W13 does not remove it unilaterally (it is R18's walk tooling), but per the founder's law ("nothing legacy survives by neglect") it must not survive *undecided*.
- **S-2 Non-flagged builds:** any build served without `shell=c2` renders `OpalApp` wholesale. The flag is a serve choice (`public/c2-boot.js` + build env) — W15/integration must prove the production serve sets it.
- **S-3 W8 settings landing:** when W8's new Settings rooms land, the integrated entry is the existing C2 You/Settings architecture (index keys verified present: `edit-profile`, `appearance`, `soul-memory`, `what-opal-remembers`, connections). No route in the integrated build points at `YouSettingsDestination`; W8 must keep it that way — specifically, do not re-import any section export from `YouSettingsDestination.tsx` into a C2 room (its exports are individually importable, which is how a legacy form could quietly re-enter).
- **S-4 `main.tsx` CSS stack:** `main.tsx` imports legacy stylesheets (`styles.css`, `technicolorProduction.css`, `spectralTokens.css`, `c1.css`) globally. Integrated surfaces are token-scoped, but a legacy class collision remains possible until W15 prunes the stack for the C2-only build.

---

## 5. DEAD PATHS FOR W15 (deletion proof list)

Made/kept unreachable in the integrated build; W15 owns deletion:

1. `src/OpalApp.tsx` (entire R17 shell) + `src/styles.css` — pending S-1/S-2 decisions.
2. Legacy-only `opalUi/` surfaces in §1D (rows 12–29) incl. `ContactProfileSheet.tsx`, `ForwardSharePicker.tsx`, `GraphProfilePage.tsx`, `YouSettingsDestination.tsx`, `settingsWireClass.ts`.
3. Legacy onboarding files (row 31) once C2 onboarding is the only entry.
4. `brand/OpalLogo.tsx` pre-orb marks (row 32) — blocked only by legacy importers above.
5. Pre-orb public assets (row 34) + `theme/technicolorProduction.*`, `theme/spectralTokens.css`.
6. Dev review routes in `App.tsx` (`?review=c2/c1/c2shell/availability`) — founder's call (evidence tooling vs deletion).

**Found during the sweep (not W13's to fix):** `familyOfStatus` in `shellData.ts` does not map the governed plan statuses `tentative` / `agreed` / `changed` (they fall to `forming`). Fact-based surfaces are unaffected (NextPlanFact carries its own `state`), but plan-contract cards for governed statuses read "Forming" today. Named for the graphs/derivation owner — W13's tests use the derivation's real mapping and assert no behavior beyond it.

---

## 6. RESULTS (verbatim)

- New tests: `src/c2/shell/legacyRecreation.test.tsx` — **5 passed (5)**, 1 file. Covers: share card rendering from a real record shape incl. state language (`ready` pill + `data-plan-state`), people line "+ 1 more" capping, text-artifact line-for-line equality with the card, no-roster → no people row, **no URL anywhere in card or artifact**, share sheet + copy action; profile adapter truth (relationship matched by real peer id, finished state label), profile rendering with absent facts rendering nothing, Message + memory actions firing.
- Affected regression set (13 files): `legacyRecreation, c1ShellWiring, c2ShellSurfaces, deckfix, harmony2, settingsArchitecture, adopt1, adopt2Settings, adopt3, smSoulMemory, repair18Layering, repair18CenterWeb, c2Foundation` — **Test Files 13 passed (13), Tests 140 passed (140)**.
- Typecheck: **exactly 9 errors** (`grep -c "error TS"` = 9), identical locations to baseline (OpalApp ×3, productClient duplicate identifiers ×5, YouSettingsDestination ×1) — none in W13 files.
- Full web suite: **interrupted by a VM service restart** (the run's /tmp log was wiped). Before the interruption the run had recorded **352+ passing test files/checks and exactly 23 failures, every one in known baseline categories** (S1 copy guards, Wave B exact-authority, graph scroll, technicolor, em-dash guards — matching the baseline's 23 failed / 16 files), and **zero failures in any file W13 touched or created**. The targeted 13-file set above was re-run to completion after the restart and passes in full. The full-suite byte-exact baseline confirmation should be re-run once at integration.
- Commit: `d61238b9` on `muse/r19-legacy`. Not pushed.

## 7. PACK CAPTURE LIST (for the corrected pack — both modes, phone size)

1. `w13-share-sheet-dark` / `w13-share-sheet-light` — Graph Detail → Share: the share sheet with the event share card (orb orbit head, frosted card, FireLine, state pill, people line).
2. `w13-share-card-ready-dark` / `w13-share-card-ready-light` — the card alone for a ready plan with a full roster.
3. `w13-profile-dark` / `w13-profile-light` — Chats thread → tap avatar: person profile with relationship + Next together pill.
4. `w13-profile-minimal-dark` / `w13-profile-minimal-light` — profile for a person with no handle/relationship/next plan (absence renders nothing).
5. `w13-profile-memory-doorway-dark` / `w13-profile-memory-light` — profile → "What Opal remembers" landing in the You settings room.

FOUNDER_ACCEPTED remains the founder's phone walk; nothing above claims it.
