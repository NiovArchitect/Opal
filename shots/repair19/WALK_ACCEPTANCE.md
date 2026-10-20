# Repair #19 — WALK ACCEPTANCE (machine-proven assembly, W11 close-out)

**FOUNDER_ACCEPTED = NO.** Everything below is machine-proven (or
honestly declared), pending the founder's review of Pack V2. No walk
link is issued with this record — the founder reviews the pack first.

- **Build traced:** integration tip `3e230af0e4c963ec75ea120ef4618e5fd17adb97`
  on `muse/repair-19` (tree `0358454b517ce3b8647ed4903682860c8d53700a`),
  mirror-pushed to GitHub as commit `043fe708530165042461ba430f699449d6976a2a`
  and verified entry-by-entry: **remote tree == local tree, 7,005
  entries** (see `coordination/repair19/final-battery-report.md`).
- **W21-PACKFIX (2026-10-19):** the pack's own findings F1–F4, F6,
  F7 + ABS-1 fixed on `muse/r19-packfix`, merged as new tip
  `9a0a1be4ca892cb66957cab94156d154994e8a39` (tree
  `832a3604e10fd0803f5b30750a56d1c983869e15`), mirror-pushed as
  `e1154696a583c46f84bc48b48a96984af598ce50`, tree-verified (7,014
  entries). Floors re-proven on the new tip: web 23/16 exact
  baseline (1,713 passed), typecheck exactly 9, build green,
  backend 3,220/0. Affected pack frames recaptured (48 files;
  manifest `w21_recapture`). Dispositions below updated per item;
  full text in the battery report's W21 addendum and
  `coordination/repair19/packfix-report.md`. FOUNDER_ACCEPTED
  remains NO.
- **Final battery (the battery every proof below rests on):**
  `coordination/repair19/final-battery-report.md` — step zero
  113 = 113 = 113 distinct migrations, both R19 legs present;
  backend **3,220/0 in all three legs** (unpinned + pinned 02:00 LA +
  pinned 14:00 LA; the forewarned FollowThrough pinned-clock artifact
  did not fire — hazard classified on record); API regression
  **101/101, seed gate clean**; web **23 failed / 16 files — exact
  baseline, 1,683 passed**; typecheck **exactly 9** pre-existing;
  build green; mobile **105/105**; posture **118 explained, no rise**.
- **Pack V2:** `shots/repair19/pack-v2/` — 136 stills + 2 motion
  files, dark + light, 390×844, fresh review account, human seed
  world; manifest carries per-frame probes, the W3 probe summary
  and splash summary. **Motion fidelity: PASS** (CDP screencast +
  ffmpeg VFR, 46.8/48.6 avgFps, no recordVideo fallback).
- **Companions (referenced, not duplicated):** the retrospective
  (`coordination/repair19/retrospective-report.md`) and the
  capability totality trace (`coordination/repair19/totality-trace.md`)
  ship with this delivery.

---

## 1. WALK-5 catalog — W5-01…W5-28

| Item | Disposition at `3e230af0` | Evidence |
|---|---|---|
| W5-01 Human seed world | **GREEN** | Seed gate clean (0 hits) on the final battery's fresh DB; every pack frame shows named people, human titles, human messages; plans across forming/ready/happening/past. `final-battery-report.md` leg (c); pack-v2 frames |
| W5-02 Home feels social | **GREEN (W21)** — structure GREEN (states variety, story rail, Live present, ambient borders); imagery leg FIXED by F1: AuthedImage loads record media with the session bearer; recaptured home frames show real photography in the wells and story cells; manifest home probe **10 images / 10 loaded, both modes** (was 0/10) | Pack-v2 home + story-viewer frames (W21 recapture); battery W21 addendum F1 |
| W5-03 Calls fully in the design | **GREEN (F3 resolved in W21)** — C2 Calls surface real, per-viewer seeded (JA-04), state-colored rows, Call-back changes row state (before/after pair in pack); the awareness pill now sits on its own full-width line and truncates only inside the pill with ellipsis (real-Chromium 390px pin) | calls-log frames (W21 recapture) + manifest callback pair; battery W21 addendum F3 |
| W5-04 Nav pad halo geometry | **GREEN** | Pack probes: haloGap 3.78px both sides, both modes, PASS; dock close-ups in pack-v2/probes + pack root |
| W5-05 Splash animation v2 | **GREEN** | splash-capture on the pack build: true-gyro living frames (rotor −60°→0°, 15s), settled stills contained, motion fidelity PASS (CDP+VFR, no fallback) |
| W5-06 Chats list plan-awareness cards | **GREEN** (served breadth pinned by JA-03's fix) | chats-list frames: mini-cards full width (316px), state borders; ja03 breadth suite passes in the battery's web leg |
| W5-07 Thread strip solid/anchored | **GREEN** | thread frames + probe: strip background solid `rgb(24,20,28)` at rest and scrolled; YOUR MOVE untouched |
| W5-08 Listen rail killed | **GREEN** | W6 leg; zero Listen hits across pack frames; posture MP gates |
| W5-09 Graphs as futures + Private zone | **GREEN** | graphs frames: futures list (22 cards, state variety), Past view, Private zone locked → unlocked with the member code, honest empty state |
| W5-10 Graph detail = living plan | **GREEN within BS-06's exception** — joiners render permission-honest location states ("Not sharing location", never faked); **current-position + distance has no writer (BS-06, named exception)** | graph-detail frames; status-file exception register |
| W5-11 Soul + Memory rooms | **GREEN** | Pack Settings family: every control labeled with its reason, 12-hour words, real quiet-hours On/Off (JA-07), graphing form in Memory; doorway renamed "How Opal works for you" |
| W5-12 Settings family leads pack v2 | **GREEN** | Settings records lead the pack manifest per mode (21 rooms incl. Connections, Privacy, Appearance, delete-account armed-only) |
| W5-13 State variety + ambient sweep | **GREEN** | Home pills Ready ×4 / Forming ×6 on first 10 cards (Action/Happening deeper), chats cards across action/happening/ready/forming; ambient reasons on record in wave reports |
| W5-14 Journey audit | **GREEN** (W10 + W20 re-verification) | `journey-audit-report.md`; JA-01…JA-13 dispositions in §3 below |
| W5-15 In-call surfaces first-class | **DECLARED in part** — in-call design landed (W12); **connected-call frames are owed (F5)**: the headless two-context call never reaches an answerable state; F-16 stands (no simulated transcription/assist anywhere) | Pack F5; incall probe records in the manifest |
| W5-16 Graphing light + per-call pause | **GREEN at the machinery/settings layer; rendered in-call proof owed with F5** — graphing light + pause are real controls on the ingestion machinery; Settings standing permission renders in the Memory room (pack frame) | W12 report; settings-memory frames |
| W5-17 Legacy inventory + recreation | **GREEN** | W13 report; every pre-redesign surface dispositioned RECREATED / MERGED / HONESTLY RETIRED |
| W5-18 Opal-chat structure | **GREEN** | Thread doorway ("Talk to Opal about this plan", "Opal chats about Maya Torres" — thread frame); Opal conversations never render inside person threads |
| W5-19 Override, don't patch | **GREEN** | W15 sweep: `?shell=r17` retired from the served build, legacy app unmounted, corpses deleted; posture held 118 → 118 |
| W5-20 Blind-spot ownership | **GREEN** | W16 hunt → BS-01…BS-12 (§2), fixes landed in W19-FIX/W20-FIX or named exceptions |
| W5-21 Retrospective | **GREEN** | `retrospective-report.md` ships as a pack companion: 0/14 charged checks at full breadth, 36 widenings recorded as the gate-building backlog |
| W5-22 Person-scoped Opal chats, quick-draw | **GREEN** | Orbits build (W14/W20): thread ⇄ orbit sheet ⇄ conversation both directions; index lists multiple chats per person; clear-out is a real operation |
| W5-23 ORBITS | **GREEN** (name is founder-review-pending by design — one copy constant) | Pack: Continuing pinned, groups collapsed, Jordan Ellis orbit locked/private (header requests unlock, never expands), orbit sheet with plans + conversations + Make-private (W21/F6: rail subtitles truthful at first settle — "Private" only where a privacy fact exists; the sheet toggle now sticks via read-back, before/after frames in pack); **proposal chip SEEDED in W21 (ABS-1 resolved)** — the seed world carries an unanchored Opal conversation whose stored reply feeds the real proposal mechanism; `orbit-proposal-chip-dark/light.png` show "About Maya Torres? Yes / Choose different" |
| W5-24 Capability totality law | **GREEN** | `totality-trace.md`: 43 rows, 0 silently missing (24 present, 11 mixed, 3 pipeline, 1 founder-gated, 4 absent-with-reason) |
| W5-25 Conversation chrome | **GREEN** | Pack: overflow menu open frame (rename/pin/archive/share/delete real), navigator → rail expanded frames, both on the Opal conversation |
| W5-26 Wholeness gate | **GREEN** | W10 map-trace/wholeness certification: 18 identity surfaces, no FAILs; this acceptance assembles one application, one battery, one pack |
| W5-27 Frosted glass chrome | **GREEN** | Pack probes: glass `blur(18px) saturate(1.35)`, per-mode tints (dark 0.62 / light 0.68), glassPixel ratio 0.066/0.078 PASS, glassPerf 60 frames p95 16.7–16.8ms; readability surfaces stay solid (W5-07) |
| W5-28 Identity bar | **GREEN** (audit-judged) | W10 identity sweep: no surface reads as a competitor reskin; orb/orbit/frost physics are the application's own |

## 2. Blind-spot register — BS-01…BS-12 (W16 hunt; fixes in W19-FIX)

| Item | Disposition | Evidence |
|---|---|---|
| BS-01 Duplicate migration version (one R19 schema leg silently droppable) | **FIXED, closed on the final tip** — orbits leg renumbered `20261030010001`, graphs leg `20261030010002` | Battery step zero: 113 files = 113 rows = 113 distinct on a fresh DB, both legs' columns/tables verified present |
| BS-02 Orbit unlock seam | **FIXED in W20 as JA-01** — the seam was re-found by the journey audit joining the two green halves; closed with a joint contract test | `jafix-report.md`; JA-01 below |
| BS-03 Private-plan shadows in live projections | **FIXED**; aggregate projections sealed under JA-02 with two bounded exceptions (GraphPeople counts-only counters; the thread's own message record) | `jafix-report.md` JA-02 |
| BS-04 Quiet-hours logic duplicated | **FIXED** — single QuietHours helper | W19-FIX report |
| BS-05 Seed imagery synthetic (1×1 pixel) | **FIXED at the record layer AND the rendered layer (W21/F1)** — real photos uploaded through the product media owner now actually render in the wells via AuthedImage (10/10 loaded, both modes) | Seed source `human_seed_world.ex` BS-05 legs; pack-v2 home frames (W21 recapture) |
| BS-06 Distance writer absent | **NAMED EXCEPTION (carried)** — no current-position/distance writer exists; detail renders permission states honestly, never faked distances | Closing handoff exception list |
| BS-07 `?shell=r17` side door / legacy crash boundary | **FIXED in part** — flag retired by W15; crash boundary redesigned under JA-05 (residual `opal_reset_first_run` references remain in founder checkpoint tooling — flagged there) | W15 + JA-05 |
| BS-08 Escape/focus behavior | **FIXED** | r19FixB focus-return tests; W19-FIX report |
| BS-09 Orbit-log bound | **FIXED** | W19-FIX report |
| BS-10 Mobile scope | **NAMED EXCEPTION (carried)** — with JA-13's lockfile rider; mobile suite unchanged and green (105/105) | Battery leg (e) |
| BS-11 Share honesty | **FIXED** — conversation/plan share surfaces state the real mechanism (copy details, no fake OS share) | Pack share-card frames |
| BS-12 Brunch timezone | **FIXED** | W19-FIX report |

## 3. Journey-audit findings — JA-01…JA-13 (W10 audit; fixes in W20-FIX)

| Item | Disposition | Evidence |
|---|---|---|
| JA-01 Private-orbit unlock broken end to end (BS-02's unjoined seam) | **FIXED** — joint contract test + served proof; pack's locked Jordan Ellis group behaves (unlock requested, never expands) | `jafix-report.md`; pack orbits frames |
| JA-02 Private-plan shadows in live projections | **FIXED (ruled)** — four aggregate projections sealed; bounded exceptions on record (BS-03 row) | `jafix-report.md` |
| JA-03 Chats in-row cards squeezed at served breadth | **FIXED** — served-breadth pin; battery web leg runs the breadth suite green (after `npm ci` provisioning repair, reported in the battery) | Pack chats-list frames (316px cards) |
| JA-04 Seeded calls bound to first seeding viewer | **FIXED** — per-viewer seeded calls; pack's fresh account sees its own calls | Pack calls frames |
| JA-05 Legacy crash boundary + dead recovery path | **FIXED** (redesign); residual `opal_reset_first_run` references in founder checkpoint tooling flagged as a named item | `jafix-report.md`; closing handoff |
| JA-06 Dead Home action buttons | **FIXED** — no dead controls on Home; "+ New" and deck intents all wired | Pack home/chats frames |
| JA-07 No quiet-hours On/Off in Soul | **FIXED** — real toggle pair captured in the pack with before/after sentence text | Pack settings-soul-quiet-on / -toggled frames, both modes |
| JA-08 Canonical build fails at tip | **FIXED** — `npm run build` green twice in the battery (and again for the pack build) | Battery leg (d) |
| JA-09 Location-share copy ("next 4 hours" on a one-shot snapshot) | **FIXED** — snapshot-truth copy renders verbatim in graph detail | Pack graph-detail frames |
| JA-10 Walk world seeds no Opal conversations | **FIXED** — seeded Opal conversations populate the Orbits log in the pack world | Pack center-orbits frames |
| JA-11 Story rail shows viewer's own story twice | **FIXED** — self-dedupe; pack Home probe storyCells = 2 distinct (yours + Maya) | Pack home frames |
| JA-12 Media well collapses when image fails | **FIXED as designed** — wells keep height with the no-image treatment on genuine failures; **W21/F1 note resolved**: imagery itself now loads via the authenticated path, so the fallback renders only on real failures | Pack-v2 home frames (W21 recapture); battery W21 addendum F1 |
| JA-13 Mobile lockfile / expo-location | **NAMED EXCEPTION (carried)** — `expo-location@18.1.6` absent from the mobile lock file; suite still 105/105 from installed modules; no mobile path changed in R19 | Battery leg (e); closing handoff |

## 4. Pack V2 findings (from rendered inspection — full text in the battery report)

F1 imagery bearer wall (defect) · F2 dark-mode primary buttons illegible
(defect) · F3 call-log pill clipping (defect) · F4 Center queue title
clip (minor) · F5 in-call frames owed (environment) · F6 orbits rail
settle observation · F7 `VITE_OPAL_SHELL=c2` build-config hazard ·
ABS-1 proposal chip honestly absent. Defect frames are annotated in
`pack-v2/manifest.json`; no app code was changed in W11.

**W21 dispositions (2026-10-19, tip `9a0a1be4`):** F1 FIXED
(AuthedImage; home probes 10/10 loaded both modes) · F2 FIXED
(shared-class token pairing + standing legibility guard) · F3
FIXED (pill on its own line; Chromium 390px pin) · F4 FIXED
(ellipsis; stored titles proven untruncated) · F5 unchanged
(environment; out of scope) · F6 FIXED (privacy tri-state +
sheet read-back; before/after frames) · F7 FIXED (unconditional
mode setup + served-build pin; flag dead as a shell/mode gate) ·
ABS-1 SEEDED (real proposal state in the seed world; chip frames
in pack). Full text: battery report W21 addendum.

## 5. Suite scorecard at the traced tip

| Leg | Result |
|---|---|
| Step zero fresh-DB migrations | 113 = 113 = 113 distinct; both R19 legs present |
| Backend (unpinned / 02:00 LA / 14:00 LA) | 3,220/0 · 3,220/0 · 3,220/0 |
| API regression (fresh dev DB, human seed) | 101/101 PASS; seed gate clean |
| Web | 23 failed / 16 files — exact baseline; 1,683 passed |
| Typecheck | exactly 9 distinct pre-existing errors |
| Build | green |
| Mobile | 105/105, 22/22 suites |
| Posture | 118 explained (MP-2 81, MP-6 26, MP-11 11; MP-1/3/4 = 0) |
| Mirror push | `043fe708`; tree `0358454b` == local; VERIFIED 7,005 entries |
| W21-PACKFIX re-push | tip `9a0a1be4`; pushed `e1154696`; tree `832a3604` == local; VERIFIED 7,014 entries; web 23/16 exact baseline (1,713 passed); typecheck exactly 9; build green; backend 3,220/0 |

**FOUNDER_ACCEPTED stays NO.**

---

## 6. W28 CLOSING BLOCK (2026-10-19) - post-W11 waves W24 / W25 / W27, final tip `95319bd7`

**Build traced:** integration tip `95319bd734e8e487dd450650c66d7378b9dbf921`
on `muse/repair-19` (tree `62a6149a3f4a020a597e87e095d36257f6c6217f`),
mirror-pushed to GitHub as commit
`60d6f8b06486a9abe8f766c4d25cc2b50ebc20be` and verified entry-by-entry:
**remote tree == local tree, 7,022 entries** (script verification +
independent ref/commit read-back; see
`coordination/repair19/closing-report.md`).

**Final battery on `95319bd7` (W28, verbatim in the closing report):**
fresh dev DB migrated 113 = 113 = 113 distinct, max `20261030010002`;
backend **3,224 tests, 0 failures** unpinned and **3,224 / 0** pinned
14:00 LA (`2026-10-18T21:00:00Z`); API regression **101/101 PASS, seed
world machine-speak gate clean (0 hits)**; web **23 failed / 16 files -
exactly the baseline failing set** (1,750 passed / 1,773); typecheck
**exactly 9** pre-existing errors; build **green**; mobile **105/105,
22/22 suites**; posture **115 total** - MP-1/MP-3/MP-4 = 0, MP-2 81,
MP-6 26 unchanged, MP-11 **8, down from 11** because W27 AT-09 removed
three decorative-canon files. No line rose; the posture floor ("118
expected") is met as *no rise*, with the -3 explained by the fix wave
itself.

### DL-01..DL-14 (W23 differentiation audit; fixes W24-DIFF)

All fourteen are **FIXED per W24** (`coordination/repair19/diffix-report.md`),
with the four declared remainders named:

- DL-01 picker at the moments of need (profile / thread avatar /
  person-add), one write, server read-back - FIXED.
- DL-02 family subtype round-trips; a bad subtype is a 422, never a
  silent drop - FIXED.
- DL-03 ties render across profile, thread header, chats rows, graph
  roster, graph list cards, orbit header/sheet, both pickers, from one
  label truth - FIXED. (Recorded limit: Home plan cards carry no tie -
  the plan contract names no person id for the named person; matching
  by display name would be a guess.)
- DL-04 pickers read the one people universe; the dead end is gone -
  FIXED.
- DL-05 **FIXED with remainder DL-05 declared:** moments-of-need
  identification + rendering + seed landed; a deferrable
  post-Meet-Opal "Who's in your world?" step / people-first fresh
  landing is NOT built - founder call, next build, 60-second law.
- DL-06 roster ties + list who_label - FIXED.
- DL-07 Add people wired to the real participant-add path - FIXED.
- DL-08 one people universe, coherence-pinned - FIXED.
- DL-09 **read leg FIXED** (close-circle cue + picker toggle with real
  type semantics); **write leg remainder declared:** a
  type-independent close-circle membership record is NOT built - it
  needs a backend audience record first.
- DL-10 **remainder declared:** a standalone People hub is NOT built
  (named next build); people are legible on every surface that names
  them this cycle.
- DL-11 **remainder declared:** the inference suggestion has no served
  read (no route serves it), so no surface shows it; the picker accepts
  a suggestion prop and no host passes one - NOT faked. Needs one
  served inference read first.
- DL-12 one label map, singular for a person - FIXED.
- DL-13 seed typed mix through the real set_type path - FIXED; the
  family leg is deliberately unseeded (it breaks FR-B3-01's sweep
  world - recorded in `human_seed_world.ex`); family is set live
  through the picker in this pack.
- DL-14 thread sub-line carries the tie, not the repeated name -
  FIXED.

Pack proof (W28 recapture, final tip): `person-profile`,
`person-identify-picker` (type-list face), `person-identify-family`
(subtype face, both modes), `person-profile-family-dark` (Jordan
Ellis reading "Family - Sibling" + "In your close circle" after the
live set; the light counterpart is declared in the manifest, not
shipped unverified), `thread` (Chanelle header tie "Partner"),
`thread-family`, `chats-list` (tie cues + search field),
`chats-list-filtered`, `chats-new-picker`, `graph-detail` (roster
who-ties), `graphs-list` (who_label cards).

### FA-01 / FA-02 (W22 charges; fixes W25-FAFIX) - FIXED

- **FA-01 FIXED** (`7254caab`): the Chats search is wired and filters
  in place; the served-breadth input-exercise pin types into the real
  served list (filter, plan-text match, preview match, honest empty
  line, clear-restores); the sibling sweep found exactly one unwired
  input in the entire served tree - this one. Evidence:
  `coordination/repair19/fafix-report.md`; pack frames
  `chats-list-dark/light.png` (field visible) +
  `chats-list-filtered-dark/light.png` ("Jordan" narrows in place).
- **FA-02 FIXED** (`66c84ed4`): the orbit unlock prompt carries its own
  positioning; on the final tip the pack's gate frames
  (`orbit-private-gate-dark/light.png`) probe the prompt as a full
  fixed overlay (rect y=0, h=844) with input and submit both hittable
  in both modes. **Gate frames are present in the pack** - the frames
  W11 could not capture exist now, on the final build.

### AT dispositions (W26 ambient audit; fixes W27-ATFIX)

- **Fixed per W27:** AT-02 (token convergence + legibility follow),
  AT-03 (live repaint: backend channel wire + web subscription), AT-04
  (ignition event), AT-05 (dock echo tint), AT-06 (dock orb
  state-keyed rest/live), AT-08 (fire reserved for lit items), AT-09
  (canon hues out of decoration), AT-10 (Home lit coalescence),
  AT-12 (signature intent keys), AT-13 (graph card state edge), AT-14
  (StateStone pattern channel), AT-15 (ready vs happening pattern
  channel). Pack proof: `home-dark/light.png` (state borders canon,
  fire scarce, one lit card), `thread-ignition-dark.webm` (the lit
  reveal's mount ignition, 100 frames / 4.16s, CDP screencast),
  `graphs-list-dark/light.png` (state edges), `center-deck-dark/light.png`.
- **AT-11 declared legacy-unmounted:** the legacy shell's unmounted
  ambient loops are erasure-pass scope - declared, not fixed here.
- **AT-16 / AT-17 / AT-18 rulebook dispositions:** AT-16's constraint
  is kept and verified (red scarce, verb-paired, never looped); AT-17's
  ready-gold claim is downgraded in the rulebook (cultural, not
  experimental); AT-18's happening hue is reframed in the rulebook
  (open/live/approachable; urgency carried by pulse + words). AT-01 and
  AT-07 stand withdrawn on the auditor's own corrections.
- Declared capture limit (manifest): the orbit-sheet frames were not
  re-shot - six attempts could not reach the sheet through the Center
  conversation navigator on the contended capture stack; the W24 orbit
  tie is test-pinned, and the FA-02 gate frames above are the
  recaptured orbit evidence. A live remote-crossing motion capture was
  likewise not drivable in the one-account browser recipe and is
  declared in the manifest instead of staged.

**Gates unchanged: FOUNDER_ACCEPTED = NO - FREEZE = HOLD - PASS2 = NO -
FOUNDER_PHONE_PASS = NOT_CLAIMED.** No walk link - the founder reviews
the pack first.
