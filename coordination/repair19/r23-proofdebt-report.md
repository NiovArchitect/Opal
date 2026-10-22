# REPAIR #23 - WS-23-6 PROOF DEBT REPORT

Worker: WS-23-6 cluster (proof debt arm), branch muse/r23-proofdebt,
base 79980a5f (muse/repair-23 at the membership merge; Wave 1
integrated). Gates held: no merge by this worker, no production,
muse/repair-17 untouched, r20Connect.test.tsx and the story-ring
glow rules untouched (IF-1 is the rail cluster's / founder-gated),
no WS-23-1..5 cluster files touched. Plain hyphens only.

Commits on muse/r23-proofdebt (oldest first):
- 4dc67dc9 typecheck: productClient duplicate declarations (5 errors)
- 0c5d8dd4 typecheck: OpalApp setTab("opal") x3 (3 errors)
- 90817726 typecheck: YouSettingsDestination p.handle (1 error)
- 9077064b burn-down: em-dash source fixes + 2 re-pins (7 names)
- 4703ac49 burn-down: ready-state semantic re-pin (2 names)
- 31e9d9da burn-down: brand/dock/menu-canon re-pins (4 names)
- 0f047b5b burn-down: grammar source fix + wiring re-pins (5 names)
- bb0b4ed7 burn-down: waveB exact-authority re-pins (5 names)
- 49d16c09 F-9: layer-aware dock rest-gap probe (rig fix)
- (this report)

---

## PART 1 - THE -44px DISCREPANCY (audit F-9): VERDICT

**Guilty instrument: THE METRIC. The glass was right.**

### The instruments
- Metric: the R21 close-out rig's leaf scan (r21close-scratch/
  cap-close-pad2.mjs audit(), same shape as cap-close-pad.mjs /
  padA / padB): after scrolling every scroller to its bottom,
  gap = dockTop - maxLeafBottom over the lowest visible text leaf
  in the whole document, from raw getBoundingClientRect values.
- Glass: the at-glass frame of plan detail at max scroll.

### Reproduction at this tip (served build, badge bb0b4ed7)
Stack: Phoenix :4036 (DB opal_dev_r23pd), static serve :5336,
dist built from this worktree; scripts + raw results in
~/workspace/opal-graph/r23pd-scratch/ (audit-44.mjs,
audit-44-results.json, probe-44-hittest.mjs, probe-44-results.json,
plan-detail-maxscroll-light.png, plan-detail-maxscroll-dark.png).

Both modes, identical numbers:
- Verbatim rig metric: gap **-44** (dockTop 772; winning leaf
  bottom 816). The -44 reproduces exactly, so this is the same
  discrepancy, not a moved surface.
- The winning leaf is the check-in button
  (data-testid checkin-circle-start, "Check in with everyone"),
  rect top 788 / bottom 816, inside the plan-detail scroller
  (data-testid c2-graph-detail, scrollTop 918 = max, atBottom
  true), scoped and unscoped scans agree.
- Hit-test probe (elementsFromPoint at y = 795, 802, 809 across
  the button, i.e. inside the band the metric calls occluded):
  the top element at every point is the button itself; the dock
  appears nowhere in the stack. The dock is NOT inside the top
  layer (dock chain: c2-dock <- c2s-column <- c2-shell; the
  button's chain runs through .opal-top-layer).
- At-glass frames (both modes): the button is fully painted at
  the bottom of the detail; no dock or pad is in frame at all.

### Why the metric lies - the named defect
The metric compares rects across a stacking-layer boundary. The
graph detail is a full-screen top layer (.opal-top-layer) that
paints OVER the C2 shell; the dock lives in the shell beneath
it. Two rects in different layers do not occlude each other no
matter how they overlap numerically. The detail scroller is
full-viewport (clientHeight 844) by design, so at max scroll
its last leaf legitimately ends at 816 - 28px above the screen
bottom - which is 44px past the (covered, unpainted) dock's top
edge at 772. In-shell surfaces read positive gaps under the
same metric because their scrollports end at the dock's plane;
the top-layer detail's scrollport ends at the screen's. The
R21 handoff's own frame ("the check-in action fully visible
above the pad with margin") was the true instrument; the -44
was an artifact of cross-layer rect comparison.

Corroboration from the R21 filings themselves: the padB and
pad2 runs on file never actually captured plan detail with the
leaf metric (their "plan-detail" rows show graphs scrollers /
"Nothing on the shelf yet." - the navigation fell back to the
graphs surface, gaps +10/+24), and the v1 run used a cruder
all-element metric (maxEl was an SVG, gap -73). The -44 in the
handoff came from an unfiled run of the same unscoped scan.

### The fix (guilty side = rig code)
probeDockRestGap() added to the in-tree rendered rig,
shots/regression/rendered/lib/geometry.mjs (commit 49d16c09):
it performs the same leaf scan and reports the historical rect
gap for continuity, AND the verdict that matters - the winning
leaf is sampled across its area and is `occluded` only if the
dock is the top element at a sampled point.
Verified live against the same served build
(r23pd-scratch/verify-44-fix.mjs, verify-44-results.json):
- plan detail, both modes: rect gap -36..-44 (leaf winner and
  settling vary by run) with **occluded = false** (9/9 samples).
- graphs (in-shell control), both modes: gap +24, occluded n/a
  (leaf above the dock top) - the R21 in-shell numbers stand.
F-9 is CLOSED: metric defect, named, fixed in the rig; no
product code changed for Part 1 because the glass never lied.

---

## PART 2 - THE BURN-DOWN

Inheritance (coordinator, Section 11a): 24 web failure names in
17 files (baseline-web-failed-names.txt minus the r20Connect
IF-1 name) + 9 typecheck errors. Dispositions: **24 FIXED,
0 re-justified, 0 deleted, 0 skipped/silenced.** Every fix is
either a source fix or an expectation update whose commit
message and test-site comment state what truth changed, when,
and which wave/change changed it.

### Web failures - per-item table

| # | Test name | Disposition | Reason (one line) |
|---|---|---|---|
| 1 | activation > CSP allows hosted API hosts (same-site + Render rollback) | FIXED (source) | Em dash in an index.html comment; replaced with plain hyphen, pin unchanged |
| 2 | activation > boot recovers session without requiring localStorage bearer | FIXED (expectation) | Boot restructured by cookie-session restore (747523fe, hardened 84550028): token-first, then bearer-less fetchSession(undefined); pin names the current call shapes, behavior unchanged |
| 3 | activation > has no em dashes in walkthrough or activation copy | FIXED (source) | Em dashes in comments in FirstRunExperience.tsx and designTokens.ts; plain hyphens |
| 4 | availability > maps availability_overlap to recognition, not completion | FIXED (expectation) | P3 Signal Grammar: ready is GOLD ("execution"), completion emerald reserved for "set"; only the ready expectation moved |
| 5 | r20CardMenu > the state accent uses the canon tokens with each state's own pattern | FIXED (expectation, instrument) | Menu section is clean; the pin's slice ran to EOF and swept in R21 W-2 CALM comment prose naming the canon hexes; slice bounded to the F-3 menu section, assertion strength unchanged in scope |
| 6 | designTokens > brand mark is ownable and premium void grammar | FIXED (expectation) | First Run Figma authority converged 217:2 -> 327:5 in 470f052d; S1 and brandMark pins already speak 327:5 |
| 7 | firstRun > forbids em dash, en dash, and ellipsis in S1 customer copy | FIXED (source) | Same FirstRunExperience.tsx comment em dashes as #3 |
| 8 | authorityRejectedStates > Center Opal 1114:2 wrapper geometry (86x64 @ 142,0) | FIXED (expectation) | D-03 Listening Core (afc346e2) deliberately moved wrapper top 0 -> 8px; 142/86/64 and anti-Trio negatives unchanged; test name updated to @ 142,8 |
| 9 | grammar > does not render journey Choose a place when chip already owns place gap | FIXED (source) | The ONE PRIMARY chip exclusion (primary.kind !== "chip") was lost in the structured-layout moves; no commit records a deliberate drop for place (unlike time, cf. 7a55b225). Restored at the gate with the law comment |
| 10 | graphCalendaring > GraphsHome and profile surfaces carry temporal context | FIXED (expectation) | liveGraphsToTimelineItems moved GraphsHome -> graphCalendaring.ts, reaching the surface via graphsHydration.composeGraphsList; pin follows the wiring |
| 11 | graphCalendaring > timeline UI wires range toggle and future actions | FIXED (source) | Em dashes in GraphsTemporalTimeline.tsx, one in rendered copy (the demo-mode seed note); plain hyphens |
| 12 | graphDetail > sends Next Together and Your Graphs to the same Graph Detail | FIXED (expectation) | Strip now enters with honest origin "chats" (coercion to "graphs" caused Back -> Graphs); same canonical detail, Graphs door unchanged |
| 13 | graphScroll > demotes past below live/seeds in All via STATUS_RANK sort of combined list | FIXED (expectation) | Combined-list sort moved to graphsHydration.sortGraphs([...live, ...createdExtras, ...seeds]) under STATUS_RANK; pin follows the wiring |
| 14 | graphScroll > keeps Past lens chip in source and horizontally reachable | FIXED (expectation) | STATUS_RANK table (past: 5) moved to graphsHydration.ts; the Past chip assertions on GraphsHome stand and pass |
| 15 | graphSpine > forbids em dashes in new spine customer files | FIXED (source) | Em dashes in comments in GraphPeopleThread.tsx and GraphJourneyCard.tsx; plain hyphens |
| 16 | liveJourneyProof > product uses continuous orbital mark path (not historical flat arcs only) | FIXED (expectation) | Current product mark is the W6A2 canonical lockup (markCurrent = /brand/opal-logo.png, rendered by OpalMark); the orbital raster is unreferenced. Pin names the live mark; historical-arcs retention assertion untouched |
| 17 | pasteW4DeviceFixes > Attention empty copy replaces not found | FIXED (expectation) | Pass 1I (8e592c5c) moved the copy to the PRODUCT_COPY authority ("Nothing needs your attention right now."); pin follows the authority, not-found assertions stand |
| 18 | pasteW4DeviceFixes > orb is idle/working never ready; proposal echoes state; filament stays plan_forming | FIXED (expectation) | createdPlanGraphOverlay is defined in graphSurfaceInterop.ts and consumed via graphsHydration; pin follows the wiring |
| 19 | waveBChatsExact > CHATS_CURRENT_AUTHORITY_618_271 | FIXED (expectation) | ChatsHome is dual-mode (Chats 618:271 / Calls 928:3); the authority attribute is a mode-conditional expression. CSS exact paints verified unchanged |
| 20 | waveBChatsExact > CHATS_NEW_ROUTES_SEARCH_PEOPLE_MODE | FIXED (expectation) | Wave B routing superseded by Slice #1: New opens the New Chat picker (message-by-phone, real peer addressability; rationale in the handler's own comment). Pin names the live routing; Search destination assertions stand |
| 21 | waveBChatsExact > GROUP_ADD_PEOPLE_ROUTES_SEARCH_PEOPLE_MODE | FIXED (expectation, instrument) | Routing never changed; the handler grew (comment + setter) past the test's 280-char slice (setSearchOpen(true) at ~329). Window widened to 420 |
| 22 | waveBGraphsExact > GRAPHS_FILTER_COLORS_PRESERVED | FIXED (expectation) | All-active fill #0A2429 -> rgba(0,229,255,0.13) in 438c5c2f (dock parity); lens hues (#00E5FF / #FF6B9D / #FFC86B) preserved |
| 23 | waveBHomeExact > HOME_TIMELINE_MULTICOLOR | FIXED (expectation) | R19 W27 AT-09 (d1e053b6): timeline accents retired from canon state hues to the non-canon ENTITY palette (identity channel, no state read); multicolor preserved |
| 24 | technicolorProduction > maps signals to semantic states with non-color-only labels available | FIXED (expectation) | Same P3 truth change as #4: ready -> "execution" (gold); all other signal pins stand |

### Typecheck - 9 errors, all FIXED in product code (0 remaining)

| Errors | File | Fix |
|---|---|---|
| 5 | src/api/productClient.ts | OpalPlanContract declared plan_type/online twice (string vs string\|null pair). Backend truth (SharedPlan.to_contract): plan_type always emitted as a string (default "in_person"), online always boolean. Single surviving declaration kept (the R18 block, with meeting_link); no any-casts |
| 3 | src/OpalApp.tsx | setTab("opal") x3: Tab is home\|chats\|graphs\|you; the Center is the opalAmbientOpen overlay. Open-from-Center now leaves the tab untouched; close/back with entry "opal" reopens the ambient overlay, matching the sites' restore-origin comments |
| 1 | src/opalUi/YouSettingsDestination.tsx | p.handle on RelationshipContact: the backend contact contract (Relationships.to_contact_contract) emits no handle, so the fallback was dead code (always undefined). Label is display_name \|\| "Person" - identical runtime behavior |

---

## FINAL COUNTS

- Web suite at this tip (full run, log at r23pd-scratch/
  final-web-run.log): 274 files, 2,261 tests - **1 failed /
  2,260 passed**. (Baseline at the R22 tip: 25 failed / 2,212
  passed of 2,237; the +24 total is the R23 Wave 1 merges in
  this branch's base.)
- Failed-name diff vs the Section 11a baseline list
  (r23int-scratch/baseline-web-failed-names.txt): exactly the
  24 inherited WS-23-6 names are CLOSED; the only remaining
  failure is the excluded 25th name - the r20Connect IF-1 PIN
  (founder-gated, rail cluster's, untouched per orders); ZERO
  new failure names. The diff shows ONLY this workstream's
  dispositions.
- Typecheck at this tip: 0 errors (was 9), re-run after the
  last source change.
- Files changed by this workstream: product code (OpalApp.tsx,
  productClient.ts, YouSettingsDestination.tsx, founder-visible
  copy in GraphsTemporalTimeline.tsx), test files (the 17-file
  set's expectations where recorded above), comment-only
  hyphenation (FirstRunExperience.tsx, designTokens.ts,
  index.html, GraphPeopleThread.tsx, GraphJourneyCard.tsx),
  and the rig library (geometry.mjs, additive probe only).

## DECLARATIONS

- The backend healthy-box battery leg of WS-23-6 (plan item 1:
  the 26 name-verifications + the 9 timeout-only tests) was NOT
  run by this worker: the coordinator's Section 11a addendum
  re-derived the full backend at the R22 tip as 3,380 tests /
  0 failures (all legs + watchlist), and this branch changes no
  backend code. The R23 close battery on the integrated tip
  remains the closing instrument, per Section 11a.
- Part 1's frames + probe outputs live in
  ~/workspace/opal-graph/r23pd-scratch/ (not committed; they are
  run evidence, and the durable rig fix is the committed
  probeDockRestGap). The stack (Phoenix :4036 / serve :5336 /
  DB opal_dev_r23pd) was left running from this worktree's dist
  at badge bb0b4ed7.
- One scope note for the coordinator: while this worker ran,
  muse/repair-23 advanced (r23-places merged, and an earlier
  cut of this branch was merged at b03d1e35). This branch's
  remaining commits stack cleanly on the 79980a5f base it was
  cut from.
- Nothing was re-justified: every inherited name either passes
  against current truth or the source was wrong and is fixed.
  Where an expectation moved, the replacement pin is at least
  as specific as the original (same values, new addresses;
  the two slice-window widenings are instrument repairs with
  the assertion set unchanged).
