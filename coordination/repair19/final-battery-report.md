# Repair #19 — FINAL verification battery on integration tip `3e230af0`

- **Tip:** `3e230af0e4c963ec75ea120ef4618e5fd17adb97` ("R19 merge: W20-FIX
  journey-audit fixes JA-01..JA-12"), branch `muse/repair-19`, worktree
  `~/workspace/opal-graph/wt-repair18`, tree clean at battery start.
  Local tree `0358454b517ce3b8647ed4903682860c8d53700a`.
- **Mirror push:** `muse/repair-19` created on GitHub at the R18 pushed
  tip `e2d4d48f`, then mirror-pushed via `mirror_push2.py` (established
  API method): new commit `043fe708530165042461ba430f699449d6976a2a`,
  new tree `0358454b` == local tree, final verification
  `VERIFIED: remote tree == local tree (7005 entries)`.
- **Env (all Elixir legs):** `PATH=~/workspace/elixir/bin:~/workspace/otp/OTP-27.3.4.2/bin:$PATH`,
  `ELIXIR_ERL_OPTIONS="+fnu"`, `MIX_DEPS_PATH=/tmp/opal_deps`,
  private `MIX_HOME` at `~/workspace/opal-graph/r19-scratch/mixhome`,
  Postgres 16 on `127.0.0.1:5433` (cluster `~/workspace/pgdata-r19calls`),
  DBs via `DATABASE_URL` (`ecto://postgres@127.0.0.1:5433/<db>`):
  fresh `opal_dev_r19final_fresh` (step zero), `opal_test_r19final`
  (backend legs), fresh `opal_dev_r19final` (API leg + pack stack).
- **Logs:** `~/workspace/opal-graph/w11-scratch/logs/` (`backend-unpinned.log`,
  `backend-pinned0200.log`, `backend-pinned1400.log`, `web-suite*.log`,
  `typecheck.log`, `web-build*.log`, `mobile-suite.log`, `posture.log`,
  `api-regression.log`, `dev-migrate.log`, `mirror-push.log`).
- **Serial discipline note:** an early pair of backend attempts was
  launched concurrently by mistake, shared one test DB/_build, and was
  killed (SIGTERM) and discarded in full. Every number below is from a
  strictly serial re-run whose log tail was verified on disk before the
  next leg started. The environment also reaped the whole VM stack
  once mid-pack (Postgres, Phoenix, `/tmp/opal_deps`); all services
  were restarted from preserved data and re-verified healthy — no
  battery leg was affected (all legs had completed before the reap).

## STEP ZERO — fresh-DB migration run, end to end (BS-01 closure on the final tip)

Fresh empty DB `opal_dev_r19final_fresh`, `MIX_ENV=dev mix ecto.migrate`,
exit 0 (last migration `20261030010002` in 0.1s). Direct re-query:

```
migration files on disk                  | 113
opal_dev_r19final_fresh schema_migrations | count 113, distinct versions 113, max 20261030010002
duplicate versions on disk               | none (uniq -d empty)
```

Both R19 schema legs present on the fresh DB:

- **Orbits leg (`20261030010001`):** `opal_conversations` columns
  `anchor_id, anchor_label, anchor_type, context_conversation_id,
  context_person_id, context_plan_id, orbit_private, pinned_at,
  user_archived_at` — all present.
- **Graphs leg (`20261030010002`):** `shared_plans.is_private`,
  `shared_plans.place_lat`, `shared_plans.place_lon` present;
  tables `graph_locks` and `plan_location_shares` present.

**BS-01 is closed on the final tip:** the duplicate version that could
silently drop one schema leg on a fresh DB does not exist; every
version lands.

## Leg (b) — Backend full suite (`mix test`, `opal_test_r19final`)

| Leg | Command env | Raw final lines | Result |
|---|---|---|---|
| Unpinned | — | `Finished in 132.8 seconds (70.1s async, 62.6s sync)` / `3220 tests, 0 failures` | **PASS** |
| Pinned 02:00 LA | `OPAL_CLOCK_OVERRIDE=2026-10-18T09:00:00Z` | `Finished in 145.3 seconds (76.8s async, 68.5s sync)` / `3220 tests, 0 failures` | **PASS** |
| Pinned 14:00 LA | `OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z` | `Finished in 144.5 seconds (75.7s async, 68.7s sync)` / `3220 tests, 0 failures` | **PASS** |

**FollowThrough forewarning — disposition:** the W2 verifier's warning
was carried into this battery: `FollowThroughTest` builds its quiet
window from real `DateTime.utc_now()` (`follow_through_test.exs:108-115`,
window = real hour +12h..+13h) and can collide with a pinned app clock.
**It did not fire in either pinned leg on this tip** — both pinned runs
are clean 3220/0 with no classification needed. The hazard itself
remains real and is recorded in the retrospective backlog (NC-5,
governed-clock test hygiene): the test's construction is unchanged, so
a future pinned run whose fixed clock falls inside the real-time-derived
window can still produce this artifact. Nothing was retried away; there
was nothing to retry.

Count check: 3,220 meets the brief's ≥3,220 expectation and matches the
W20-FIX merged-tip floor (backend 3,220/0) exactly — no test loss
through the merge.

## Leg (c) — API regression, fresh dev DB + human seed world

Stack: Phoenix from this tip (`mix phx.server`, port 4000,
`OPAL_PHONE_VERIFY_MODE=synthetic_development OPAL_SYNTHETIC_EXPOSE_CODE=1
OPAL_CLOCK_OVERRIDE=2026-10-18T21:00:00Z`) on fresh-migrated
`opal_dev_r19final` (113 migrations). Command:

```
OPAL_API_BASE=http://127.0.0.1:4000 OPAL_SESSION_PROVISION=synthetic OPAL_SEED_MODE=1 \
OPAL_PHONE_A=+12025550101 OPAL_PHONE_B=+12025550102 \
OPAL_RUN_TAG="with the Saturday crew at the pier" node shots/regression/run.mjs
```

Raw lines:

```
suite: api=http://127.0.0.1:4000 seed_mode=on run_tag=with the Saturday crew at the pier
founder seed: communication status=200 graph status=200
seed world machine-speak gate: clean (0 hits)
summary: 101/101 PASS, results -> .../shots/regression/results.json
```

**101/101 PASS; the seed gate reports clean** (the W1 permanent
machine-speak gate, run against the seeded world on the fresh DB).
`results.json` was restored after the run; the tree stayed clean.

## Leg (d) — Web suite, typecheck, build (`apps/opal_web`)

First web run read **17 failed files / 23 failed tests**: the 17th file
was `ja03ChatsRowBreadth.test.tsx` failing at load —
`Cannot find package 'playwright-core'` — because this worktree's
`node_modules` predated the tip (JA-08 added `playwright-core` to
`package.json`/lock; the JAFIX worktree, where the test's served-breadth
proof ran, had it installed). Provisioning was repaired with `npm ci`
(lockfile-exact; no code change) and the suite re-run in full:

```
Test Files  16 failed | 198 passed (214)
     Tests  23 failed | 1683 passed (1706)
```

**Failing set is EXACTLY the baseline 23 tests / 16 files** (activation,
designTokens, availability, firstRun, authorityRejectedStates, grammar,
graphCalendaring, graphDetail, graphScroll, graphSpine,
liveJourneyProof, pasteW4DeviceFixes, waveBChatsExact, waveBGraphsExact,
waveBHomeExact, technicolorProduction); the JA-03 suite passes in the
re-run (passed count 1,682 → 1,683). The first run is reported, not
hidden: it was an environment delta, root-caused above.

Typecheck (`npm run typecheck`, exit 2): **exactly the 9 pre-existing
distinct errors, zero delta** — 3× `OpalApp.tsx` TS2345 (`"opal"` vs
`SetStateAction<Tab>`), 5× `productClient.ts` duplicate-identifier
family (`plan_type`/`online`, TS2300/TS2717; line numbers shifted by
W20 edits, identities unchanged), 1× `YouSettingsDestination.tsx`
TS2339 (`handle` on `RelationshipContact`).

Build (`npm run build`): **green** — `✓ built in 3.09s` (and again
3.50s for the pack build), exit 0; bundle stamps git HEAD `3e230af`.

## Leg (e) — Mobile suite (`apps/opal_mobile`, unchanged scope)

```
Test Suites: 22 passed, 22 total
Tests:       105 passed, 105 total
```

**105/105 PASS**, run from this worktree's already-installed
`node_modules` (no `npm ci` — the pre-existing lockfile desync,
JA-13's `expo-location@18.1.6` missing from the lock file, is
untouched and remains a named exception; no mobile file changed in
R19: `git diff 09e587b2..3e230af0` touches zero `apps/opal_mobile`
paths, confirmed at audit and re-confirmed here).

## Leg (f) — Pattern posture (`node scripts/pattern_posture.mjs`)

| Pattern | Count |
|---|---|
| MP-1 scripted responder reachable | 0 |
| MP-2 fixture-painted surfaces | 81 (19 web seed-flow sites across 8 files + 62 inline `"seed-*"` literals; backend 0) |
| MP-3 per-surface re-derivation (C2) | 0 |
| MP-4 canned provider output | 0 |
| MP-6 unscoped personal-memory reads | 26 (`memory.ex` 4, `continuity.ex` 1, `durable_preference_memory.ex` 12, `follow_through.ex` 7, `memory_intelligence.ex` 2) |
| MP-11 indicator drift | 11 files |
| MP-5/7/8/9/10 | n/a (per their labeled bounds) |
| **TOTAL countable** | **118** |

**Exactly the expected posture** (MP-2 81, MP-6 26, MP-11 11;
MP-1/3/4 = 0), no rise through W19-FIX/W20-FIX.

## Scorecard

| Leg | Result |
|---|---|
| Step zero fresh-DB migrations | **113 files = 113 rows = 113 distinct, max 20261030010002; both R19 legs present — BS-01 closed** ✅ |
| Backend unpinned | **3,220 tests, 0 failures** ✅ |
| Backend pinned 02:00 LA | **3,220 tests, 0 failures** ✅ (FollowThrough artifact did not fire; hazard classified on record) |
| Backend pinned 14:00 LA | **3,220 tests, 0 failures** ✅ |
| API regression (fresh dev DB, human seed) | **101/101 PASS; seed gate clean (0 hits)** ✅ |
| Web | **23 failed / 16 files — exact baseline; 1,683 passed (1,706)** ✅ (first-run 17th file = stale `node_modules`, `npm ci` repair, re-run reported) |
| Typecheck | **exactly 9 distinct pre-existing errors, zero delta** ✅ |
| Build | **green** ✅ |
| Mobile | **105/105, 22/22 suites** ✅ |
| Posture | **118 explained, no rise** ✅ |
| Mirror push | **`muse/repair-19` → `043fe708`; tree `0358454b` == local; VERIFIED 7,005 entries** ✅ |

**FOUNDER_ACCEPTED stays NO.** Nothing merged to a protected branch,
no production deployment, no walk link issued — the founder reviews
Pack V2 first.

## Pack V2 — rendered inspection findings (named items, not fixes)

Pack: `~/workspace/opal-graph/shots/repair19/pack-v2/` — 136 stills +
2 motion files; manifest carries per-frame probe results, the W3
probe summary (haloGap/glass/glassPixel/glassPerf PASS both modes,
per-mode tints) and the splash summary (**motion fidelity PASS**:
CDP screencast + ffmpeg VFR, 46.8/48.6 avgFps, no recordVideo
fallback). The pack stack serves the pushed-tip code built with the
documented served-build flag `VITE_OPAL_SHELL=c2` (see F7) on a fresh
review account (+12025550103), run tag "with the whole crew by the
water". Every frame was inspected; the following are findings, per
the rendered-proof law — defect frames are annotated in the manifest,
not passed silently.

- **F1 (defect) — seeded real imagery unreachable at the rendered
  layer.** BS-05's seed uploads real photos and the plan contract
  projects `image_url` to the media endpoint, but that endpoint is
  bearer-gated (verified: 401 unauthenticated, 200 + 79,388 bytes
  with a session token) and the web plan card renders a plain
  `<img src>` that cannot carry the token — so every media well
  falls back to the JA-12 monogram treatment. Home probe: 0 `<img>`
  across 10 cards, both modes; story cells likewise monograms.
  JA-12's fallback works exactly as designed, which masks the wall.
  W5-02's imagery leg is DECLARED, not green.
- **F2 (defect) — dark-mode primary buttons illegible.** Primary
  buttons render near-white with white label text in dark mode:
  person-profile "Message", share-sheet "Copy details", and the
  unlabeled light-gray slab under Graphs' "Working toward". Light
  frames are clean — a dark token pairing defect.
- **F3 (defect) — call-log row clipping at 390px.** Plan-awareness
  pill text clips mid-word ("Happening F…", pill edge cut) and
  names/subtitles truncate against the status column ("Jordan El…",
  "No answe…") in both modes (calls-log-dark,
  calls-log-after-callback-light). The before/after state change
  itself works (Canceled → Call/Live after Call-back).
- **F4 (minor defect) — Center queue titles clip without ellipsis.**
  NEEDS YOU card titles stop mid-phrase single-line ("Church at
  Awaken With The", "Brunch at The Henry With The").
- **F5 (environment gap) — in-call frames owed.** The headless
  two-context call never reached an answerable state on B
  (incoming probe: overlay/surface/answer all false) — the same
  ceiling prior R18/R19 call evidence hit. The captured
  "ringing" frame is the calls log after Call-back attempts and is
  annotated as such in the manifest; in-call graphing-on/paused
  frames are owed to a device walk, not claimed here.
- **F6 (observation) — Orbits rail settle + sheet toggle.** The
  rail's first-settle frame labels every group subtitle "Private";
  the settled/expanded rail shows the true subtitles (Jordan Ellis
  Private/locked — header requests unlock and never expands;
  brunch/Maya with open questions + counts). The orbit sheet's
  Make-private click produced no visible state change in the
  after frame. JA-10's privacy proof rests on the locked group.
- **F7 (build-config hazard) — `VITE_OPAL_SHELL=c2` gates mode, not
  just shell.** A build produced without the documented flag
  serves the C2 shell (App.tsx renders it unconditionally since
  W15) but `main.tsx`'s mode setup is flag-gated, so the default
  path never stamps `data-mode`: always-light first paint
  regardless of stored/system preference (in-app Appearance still
  applies mode at runtime). W11's first pack build hit exactly
  this (probes: `data-mode` null in every context); the pack was
  rebuilt with the flag and modes verified distinct (dark ground
  #0d0b12, per-mode glass tints). Recommendation: a served-build
  verification that asserts `data-mode` on the plain entry path.
- **ABS-1 (honest absence) — orbit proposal chip.** No anchor
  proposal rendered in this seeded session (all seeded Opal
  sessions are already anchored); recorded in the manifest, not
  painted.

---

## W21-PACKFIX ADDENDUM (2026-10-19) — the pack's own findings, fixed

Wave W21 fixed the F-findings this battery's pack exposed, on branch
`muse/r19-packfix`, merged into `muse/repair-19` as tip
`9a0a1be4ca892cb66957cab94156d154994e8a39` (tree
`832a3604e10fd0803f5b30750a56d1c983869e15`), mirror-pushed via the API
method as commit `e1154696a583c46f84bc48b48a96984af598ce50` with tree
verification (remote tree == local tip tree, 7,014 entries).
FOUNDER_ACCEPTED remains NO; no walk link.

- **F1 FIXED — authenticated record imagery.** New `AuthedImage`
  component (`apps/opal_web/src/media/AuthedImage.tsx`): fetches the
  record URL with the session bearer (same-origin/API only; the
  token never appears in a URL and the endpoint is not made public),
  renders a blob object URL, revokes it on unmount/replace, and on
  any failure renders JA-12's designed fallback. Wired into the
  plan-card media wells + person faces (PlanCardC2) and the Home
  memory feed, story cells and story viewer (C2Home). Two
  follow-throughs found only at the rendered layer: the media
  endpoint serves JPEG bytes as `application/octet-stream` (PB-19's
  upload class), so blob types are sniffed from magic bytes; and the
  served CSP `img-src` lacked `blob:` (added in `index.html` +
  `public/_headers`, pinned). A third: the story viewer's flex-row
  well overflowed once a real photo loaded — media now fills the
  well (img rect == well rect, measured) and the caption overlays.
  **Rendered proof: Home probes 10 images / 10 loaded in BOTH modes
  (was 0/10); story viewer IMG blob, complete, naturalWidth 640.**
- **F2 FIXED — dark-mode primary buttons.** Root cause was cascade
  mechanics, not a token value: the unlayered global
  `button { font/color: inherit }` reset beats every `@layer c2`
  rule, so dark-mode `.c2-btn-primary` / `.c2s-btn-primary` labels
  inherited near-white onto the near-white dark `--primary-fill`.
  Fixed once at the shared-class level with unlayered pairing rules
  in `c2.css` / `c2shell.css`, and pinned by a standing guard
  (`primaryButtonLegibility.test.ts`, 7 tests) asserting the label
  colour is a var() pairing with the fill and computes ≥ 4.5:1 in
  BOTH modes for BOTH shared primary classes. Recaptured frames:
  person-profile Message and share-sheet Copy details render dark,
  legible labels on the light slab in dark mode.
- **F3 FIXED — calls-log clipping at 390px.** The PlanAwareness
  pill moved out of the starved name column to a full-width second
  line of the call card; text truncates only inside the pill with
  ellipsis. Pinned by a real-Chromium 390×844 measurement
  (long name + Happening pill: pill within the card, text clipped
  only inside the pill's own box).
- **F4 FIXED — Center queue titles.** `.reveal-title` is now
  single-line nowrap with ellipsis inside the card. The rendered
  probe settled the battery's open question: stored titles are NOT
  truncated — DOM text is the full "Saturday morning at Oceanside
  Farmers Market" (scrollWidth 361 > clientWidth 342, clipped with
  ellipsis). It was a CSS clip, now designed truncation.
- **F5 unchanged (environment, out of W21 scope).**
- **F6 FIXED — orbits rail truthfulness + sheet write.** (a) The
  rail's synthesized anchors could not know privacy, and unknown
  rendered as "Private" on every group; `OrbitGroup.privateKnown`
  is now a tri-state — "Private"/locked renders ONLY when an
  explicit privacy fact exists on the anchor contract; otherwise an
  ordinary truthful subtitle renders at every frame (proved: at
  first settle the rail shows Jordan Ellis "Private" and previews
  for the brunch + Maya groups). (b) The sheet re-opened with the
  stale caller anchor and discarded the toggle's read-back; the
  anchor is now merged with the sessions read-back and optimistically
  updated on toggle success — the before/after frames show
  "Make this orbit private" → "Make this orbit not private" stick.
- **F7 FIXED — flagless served build.** `main.tsx` mode setup
  (data-shell / data-mode stamping + preference listener) now runs
  unconditionally, and `public/c2-boot.js` stamps unconditionally.
  Disposition of `VITE_OPAL_SHELL`: the constant still gates legacy
  OpalApp splash branches, but OpalApp is unmounted on the served
  path (App.tsx renders C2Shell) — the flag is dead as a shell/mode
  gate and no longer decides anything on the served path. The
  battery's recommended pin landed (`f7ServedModePin.test.ts`):
  the boot script stamps data-shell + preference-correct data-mode
  flaglessly in jsdom for both modes, and capture verified the
  plain entry path (no params) stamps dark `rgb(13, 11, 18)` /
  light `rgb(255, 254, 251)` pre-paint, splash settling normally.
- **ABS-1 SEEDED — proposal chip.** The seed world now carries one
  Opal conversation ("A birthday gift for Maya", birth `:new`,
  unanchored) whose Opal reply is a real stored OpalMessage with
  the exact `context_snapshot.who` metadata the production
  extraction pipeline stamps, so the REAL proposal mechanism derives
  the chip. One more leg was needed at the rendered layer: the chip
  resolves the snapshot name against relationship contacts, and the
  seed world had none — the seed now records Maya's explicit
  relationship type (`Relationships.set_type`, the product's own
  upsert). The pack gains `orbit-proposal-chip-dark/light.png`:
  "About Maya Torres? Yes / Choose different" rendered over the
  seeded conversation. Nothing is painted; remove the seed reply and
  the chip honestly disappears.

**Floors on the final tip `9a0a1be4`:** web **23 failed / 16 files —
exactly the baseline set, 1,713 passed** (1,683 + 30 new W21 tests);
typecheck **exactly 9**; `npm run build` green; backend full suite
**3,220 tests, 0 failures** (run twice on the final code). Pack
frames replaced: 48 files (see `pack-v2/manifest.json` →
`w21_recapture`); settings/splash/in-call/dock frames not
recaptured (untouched by W21). The W11 `orbit-private-gate` capture
gap persists unchanged (pre-existing capture-path failure, already
on record in the W11 manifest; not an F6 regression).
